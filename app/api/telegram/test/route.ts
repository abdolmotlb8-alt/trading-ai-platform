import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TelegramResponse = {
  ok: boolean;
  description?: string;
  result?: {
    message_id?: number;
    username?: string;
    first_name?: string;
  };
};

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

    // 3. دریافت تنظیمات Environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_SIGNAL_CHAT_ID;

    if (!botToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "متغیر TELEGRAM_BOT_TOKEN در Environment تنظیم نشده است.",
        },
        { status: 500 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "متغیر TELEGRAM_SIGNAL_CHAT_ID در Environment تنظیم نشده است.",
        },
        { status: 500 }
      );
    }

    // 4. بررسی اتصال ربات به Telegram
    const botResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const botInfo =
      (await botResponse.json()) as TelegramResponse;

    if (!botResponse.ok || !botInfo.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            botInfo.description ||
            "توکن ربات تلگرام معتبر نیست.",
        },
        { status: 502 }
      );
    }

    // 5. آماده‌سازی پیام آزمایشی
    const botUsername =
      botInfo.result?.username || "Unknown";

    const message = [
      "🤖 Trading AI Platform",
      "",
      "✅ اتصال تلگرام با موفقیت آزمایش شد.",
      "",
      `📡 Bot: @${botUsername}`,
      "📢 نوع پیام: آزمایشی",
      "",
      "🔐 وضعیت امنیت: تأیید اولیه انجام شد.",
      "📊 وضعیت سرویس: فعال",
      "",
      "⚠️ این پیام فقط برای آزمایش اتصال است.",
    ].join("\n");

    // 6. ارسال پیام به کانال یا چت مشخص‌شده
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
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

    const telegramData =
      (await telegramResponse.json()) as TelegramResponse;

    // 7. بررسی نتیجه ارسال
    if (!telegramResponse.ok || !telegramData.ok) {
      console.error(
        "Telegram sendMessage error:",
        telegramData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            telegramData.description ||
            "ارسال پیام به تلگرام ناموفق بود.",
        },
        { status: 502 }
      );
    }

    // 8. پاسخ موفقیت
    return NextResponse.json({
      success: true,
      message: "پیام آزمایشی با موفقیت ارسال شد.",
      bot: botUsername,
      chatId: chatId,
      telegramMessageId:
        telegramData.result?.message_id || null,
    });
  } catch (error) {
    console.error("Telegram connection error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "خطای داخلی سرور هنگام اتصال به تلگرام رخ داد.",
      },
      { status: 500 }
    );
  }
}
