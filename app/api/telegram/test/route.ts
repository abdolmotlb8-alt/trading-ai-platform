
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TelegramApiResponse<T> = {
  ok: boolean;
  description?: string;
  result?: T;
};

type TelegramBot = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  chat?: {
    id: number;
    title?: string;
    username?: string;
    type?: string;
  };
};

function telegramError(
  description?: string
): string {
  return description || "خطای نامشخص از طرف Telegram.";
}

export async function GET() {
  try {
    // 1. بررسی ورود کاربر
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "ابتدا وارد حساب کاربری شوید.",
        },
        { status: 401 }
      );
    }

    // 2. بررسی دسترسی مدیر
    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        role: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "دسترسی فقط برای مدیر سیستم مجاز است.",
        },
        { status: 403 }
      );
    }

    // 3. دریافت Environment
    const botToken =
      process.env.TELEGRAM_BOT_TOKEN?.trim();

    const chatId =
      process.env.TELEGRAM_SIGNAL_CHAT_ID?.trim();

    if (!botToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "TELEGRAM_BOT_TOKEN در Environment تنظیم نشده است.",
        },
        { status: 500 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "TELEGRAM_SIGNAL_CHAT_ID در Environment تنظیم نشده است.",
        },
        { status: 500 }
      );
    }

    const telegramUrl =
      `https://api.telegram.org/bot${botToken}`;

    // 4. بررسی اعتبار ربات
    const botResponse = await fetch(
      `${telegramUrl}/getMe`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const botInfo =
      (await botResponse.json()) as TelegramApiResponse<TelegramBot>;

    if (!botResponse.ok || !botInfo.ok || !botInfo.result) {
      return NextResponse.json(
        {
          success: false,
          error: telegramError(botInfo.description),
        },
        { status: 502 }
      );
    }

    const bot = botInfo.result;

    const botUsername = bot.username
      ? `@${bot.username}`
      : bot.first_name;

    // 5. ساخت پیام آزمایشی
    const message = [
      "🤖 Trading AI Platform",
      "",
      "✅ اتصال تلگرام با موفقیت آزمایش شد.",
      "",
      `📡 ربات: ${botUsername}`,
      "📢 نوع پیام: آزمایشی",
      "📊 وضعیت سرویس: فعال",
      "",
      "🔐 بررسی امنیت اولیه انجام شد.",
      "",
      "⚠️ این پیام فقط برای آزمایش اتصال است.",
    ].join("\n");

    // 6. ارسال پیام به کانال
    const sendResponse = await fetch(
      `${telegramUrl}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }),
        cache: "no-store",
      }
    );

    const sendData =
      (await sendResponse.json()) as TelegramApiResponse<TelegramMessage>;

    // 7. بررسی نتیجه ارسال
    if (
      !sendResponse.ok ||
      !sendData.ok ||
      !sendData.result
    ) {
      console.error(
        "Telegram sendMessage error:",
        sendData
      );

      return NextResponse.json(
        {
          success: false,
          error: telegramError(sendData.description),
        },
        { status: 502 }
      );
    }

    // 8. پاسخ موفقیت
    return NextResponse.json({
      success: true,
      message: "پیام آزمایشی با موفقیت به تلگرام ارسال شد.",
      bot: botUsername,
      telegramMessageId: sendData.result.message_id,
    });
  } catch (error) {
    console.error(
      "Telegram connection error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "ارتباط با Telegram برقرار نشد. لاگ‌های Render را بررسی کنید.",
      },
      { status: 500 }
    );
  }
}
