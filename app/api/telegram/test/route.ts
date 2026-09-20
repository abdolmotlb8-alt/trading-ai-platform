import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_SIGNAL_CHAT_ID;

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

    const message = [
      "🤖 Trading AI",
      "",
      "✅ اتصال Telegram با موفقیت تست شد.",
      "",
      "📡 Bot: Trading AI Signal",
      "📢 Channel: Zarinx@XAUUSD",
      "",
      "این پیام فقط یک پیام آزمایشی است.",
      "",
      "⚠️ هنوز هیچ سیگنال معاملاتی در این تست ارسال نشده است.",
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Telegram API error:", data);

      return NextResponse.json(
        {
          success: false,
          error:
            data?.description ||
            "ارسال پیام آزمایشی به Telegram ناموفق بود.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "پیام آزمایشی با موفقیت به Telegram ارسال شد.",
      telegramMessageId:
        data.result?.message_id ?? null,
      channel: chatId,
    });
  } catch (error) {
    console.error("Telegram test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "خطا هنگام اتصال به Telegram.",
      },
      { status: 500 }
    );
  }
}
