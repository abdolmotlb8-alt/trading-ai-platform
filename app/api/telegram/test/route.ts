
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TelegramResponse = {
  ok?: boolean;
  description?: string;
  result?: {
    message_id?: number;
    chat?: {
      id?: number | string;
      title?: string;
      username?: string;
      type?: string;
    };
  };
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

async function telegramRequest(
  token: string,
  method: string,
  body?: Record<string, unknown>
): Promise<{
  response: Response;
  data: TelegramResponse;
}> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const data = (await response.json()) as TelegramResponse;

    return {
      response,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    // 1. بررسی ورود کاربر
    const session = await getSession();

    if (!session?.userId) {
      return errorResponse(
        "ابتدا وارد حساب کاربری شوید.",
        401
      );
    }

    // 2. بررسی سطح دسترسی
    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return errorResponse(
        "کاربر پیدا نشد.",
        404
      );
    }

    if (user.role !== "ADMIN") {
      return errorResponse(
        "فقط مدیر سیستم اجازه آزمایش اتصال تلگرام را دارد.",
        403
      );
    }

    // 3. دریافت تنظیمات امن از Environment
    const botToken =
      process.env.TELEGRAM_BOT_TOKEN?.trim();

    const chatId =
      process.env.TELEGRAM_SIGNAL_CHAT_ID?.trim();

    if (!botToken) {
      return errorResponse(
        "TELEGRAM_BOT_TOKEN در Environment تنظیم نشده است.",
        500
      );
    }

    if (!chatId) {
      return errorResponse(
        "TELEGRAM_SIGNAL_CHAT_ID در Environment تنظیم نشده است.",
        500
      );
    }

    // 4. بررسی اعتبار ربات
    let botInfo: TelegramResponse;

    try {
      const result = await telegramRequest(
        botToken,
        "getMe"
      );

      botInfo = result.data;

      if (!result.response.ok || !botInfo.ok) {
        return errorResponse(
          botInfo.description ||
            "توکن ربات تلگرام معتبر نیست.",
          502
        );
      }
    } catch (error) {
      console.error("Telegram getMe error:", error);

      return errorResponse(
        "ارتباط با سرور تلگرام برقرار نشد.",
        502
      );
    }

    // 5. ساخت پیام آزمایشی
    const message = [
      "🤖 Trading AI Platform",
      "",
      "✅ اتصال تلگرام با موفقیت آزمایش شد.",
      "",
      `📡 Bot: @${botInfo.result?.username || "Unknown"}`,
      "📊 وضعیت سرویس: فعال",
      "🔐 وضعیت امنیت: تأیید شد",
      "",
      "این پیام توسط سیستم آزمایشی ارسال شده است.",
    ].join("\n");

    // 6. ارسال پیام به کانال یا چت
    try {
      const result = await telegramRequest(
        botToken,
        "sendMessage",
        {
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }
      );

      if (!result.response.ok || !result.data.ok) {
        console.error("Telegram sendMessage error:", {
          status: result.response.status,
          description: result.data.description,
        });

        return errorResponse(
          result.data.description ||
            "ارسال پیام تلگرام ناموفق بود.",
          502
        );
      }

      return NextResponse.json({
        success: true,
        message: "اتصال و ارسال پیام با موفقیت انجام شد.",
        bot: {
          username: botInfo.result?.username || null,
          firstName: botInfo.result?.first_name || null,
        },
        telegram: {
          messageId:
            result.data.result?.message_id || null,
          chatIdConfigured: true,
        },
      });
    } catch (error) {
      console.error("Telegram send error:", error);

      return errorResponse(
        "خطا هنگام ارسال پیام به تلگرام.",
        502
      );
    }
  } catch (error) {
    console.error("Telegram route error:", error);

    return errorResponse(
      "خطای داخلی سرور هنگام آزمایش تلگرام.",
      500
    );
  }
}
