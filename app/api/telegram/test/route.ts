import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramResponse = {
  ok: boolean;
  result?: {
    message_id?: number;
    chat?: {
      id?: number | string;
      title?: string;
      username?: string;
      type?: string;
    };
  };
  description?: string;
};

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_SIGNAL_CHAT_ID?.trim();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  if (!chatId) {
    throw new Error("TELEGRAM_SIGNAL_CHAT_ID is missing");
  }

  return {
    token,
    chatId,
  };
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<TelegramResponse> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    }
  );

  let data: TelegramResponse;

  try {
    data = (await response.json()) as TelegramResponse;
  } catch {
    throw new Error(
      `Telegram returned an invalid response. HTTP ${response.status}`
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description ||
        `Telegram API request failed. HTTP ${response.status}`
    );
  }

  return data;
}

export async function GET() {
  try {
    /*
     * فقط ادمین اجازه تست اتصال تلگرام را دارد.
     */
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "ابتدا وارد حساب کاربری شوید.",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          error: "ACCOUNT_BLOCKED",
        },
        { status: 403 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_ONLY",
          message: "فقط مدیر سایت می‌تواند اتصال تلگرام را تست کند.",
        },
        { status: 403 }
      );
    }

    const { token, chatId } = getTelegramConfig();

    const testMessage = [
      "━━━━━━━━━━━━━━━━━━━━",
      "🤖 Trading AI Platform",
      "📡 Telegram Connection Test",
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      "✅ اتصال سایت به Telegram با موفقیت برقرار شد.",
      "",
      `👤 مدیر: ${user.name}`,
      "🟢 Bot Status: Online",
      "🟢 API Status: Connected",
      "🟢 Channel Status: Connected",
      "",
      "📊 سیستم آماده ارسال سیگنال‌های Trading AI است.",
      "",
      `🕐 ${new Date().toLocaleString("fa-IR", {
        timeZone: "Europe/Berlin",
      })}`,
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      "Trading AI Platform",
      "━━━━━━━━━━━━━━━━━━━━",
    ].join("\n");

    const telegram = await sendTelegramMessage(
      token,
      chatId,
      testMessage
    );

    return NextResponse.json({
      success: true,
      message: "Telegram test message sent successfully.",
      telegram: {
        messageId: telegram.result?.message_id ?? null,
        chatId: telegram.result?.chat?.id ?? chatId,
        chatTitle: telegram.result?.chat?.title ?? null,
        chatUsername: telegram.result?.chat?.username ?? null,
        chatType: telegram.result?.chat?.type ?? null,
      },
    });
  } catch (error) {
    console.error("Telegram test error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Telegram connection test failed.",
      },
      { status: 500 }
    );
  }
}
