import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: {
      id: number;
      type?: string;
      first_name?: string;
      username?: string;
    };
    from?: {
      id: number;
      first_name?: string;
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
    token,
    secret,
    apiUrl: `https://api.telegram.org/bot${token}`,
  };
}

async function telegramRequest<T>(
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

  const data =
    (await response.json()) as TelegramResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description || `Telegram API error: ${response.status}`
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
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, secret, apiUrl } = getTelegramConfig();

    // جلوگیری از درخواست‌های جعلی
    const receivedSecret = request.headers.get(
      "x-telegram-bot-api-secret-token"
    );

    if (receivedSecret !== secret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized webhook request",
        },
        { status: 401 }
      );
    }

    const update =
      (await request.json()) as TelegramUpdate;

    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    // اگر پیام قابل پردازش نبود
    if (!text || !chatId) {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const command = text.toLowerCase().split(" ")[0];

    if (command === "/start") {
      await sendMessage(
        apiUrl,
        chatId,
        [
          "🤖 Trading AI Platform",
          "",
          "سلام! ربات با موفقیت فعال است.",
          "",
          "📊 برای مشاهده راهنما، /help را ارسال کنید.",
          "📡 وضعیت اتصال: فعال",
        ].join("\n")
      );
    } else if (command === "/help") {
      await sendMessage(
        apiUrl,
        chatId,
        [
          "📚 راهنمای Trading AI",
          "",
          "/start - شروع ربات",
          "/help - راهنمای ربات",
          "/status - وضعیت اتصال",
        ].join("\n")
      );
    } else if (command === "/status") {
      await sendMessage(
        apiUrl,
        chatId,
        [
          "🟢 وضعیت ربات",
          "",
          "سرویس Webhook فعال است.",
          "اتصال به Telegram برقرار است.",
        ].join("\n")
      );
    } else {
      await sendMessage(
        apiUrl,
        chatId,
        "پیام شما دریافت شد. برای راهنما /help را ارسال کنید."
      );
    }

    return NextResponse.json({
      success: true,
      processed: true,
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
