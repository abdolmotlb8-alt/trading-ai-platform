
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id: number;
      type?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
};

type TelegramResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
};

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is missing");
  }

  return {
    secret,
    apiUrl: `https://api.telegram.org/bot${token}`,
  };
}

async function telegramRequest<T = unknown>(
  apiUrl: string,
  method: string,
  body: Record<string, unknown>
): Promise<TelegramResponse<T>> {
  const response = await fetch(`${apiUrl}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let data: TelegramResponse<T>;

  try {
    data = (await response.json()) as TelegramResponse<T>;
  } catch {
    throw new Error(
      `Invalid Telegram API response: ${response.status}`
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description ||
        `Telegram API error: ${response.status}`
    );
  }

  return data;
}

async function sendMessage(
  apiUrl: string,
  chatId: number,
  text: string
) {
  return telegramRequest(apiUrl, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "telegram-webhook",
    status: "online",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { secret, apiUrl } = getTelegramConfig();

    const receivedSecret = request.headers.get(
      "x-telegram-bot-api-secret-token"
    );

    if (!receivedSecret || receivedSecret !== secret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized webhook request",
        },
        { status: 401 }
      );
    }

    let update: TelegramUpdate;

    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    if (!text || typeof chatId !== "number") {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "No text message",
      });
    }

    const command = text
      .toLowerCase()
      .split(/\s+/)[0]
      .split("@")[0];

    let reply: string;

    switch (command) {
      case "/start":
        reply = [
          "🤖 Trading AI Platform",
          "",
          "سلام! 👋",
          "ربات با موفقیت فعال است.",
          "",
          "📊 برای مشاهده راهنما، /help را ارسال کنید.",
          "📡 وضعیت اتصال: فعال",
        ].join("\n");
        break;

      case "/help":
        reply = [
          "📚 راهنمای Trading AI",
          "",
          "/start - شروع ربات",
          "/help - راهنمای ربات",
          "/status - وضعیت اتصال",
          "",
          "برای استفاده از ربات، یکی از دستورات بالا را ارسال کنید.",
        ].join("\n");
        break;

      case "/status":
        reply = [
          "🟢 وضعیت ربات",
          "",
          "سرویس Webhook فعال است.",
          "اتصال به Telegram برقرار است.",
          "📡 وضعیت سرویس: آنلاین",
        ].join("\n");
        break;

      default:
        reply = [
          "✅ پیام شما دریافت شد.",
          "",
          "برای مشاهده راهنمای ربات، /help را ارسال کنید.",
        ].join("\n");
        break;
    }

    await sendMessage(apiUrl, chatId, reply);

    return NextResponse.json({
      success: true,
      processed: true,
      update_id: update.update_id ?? null,
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
