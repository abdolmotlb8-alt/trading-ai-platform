import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL =
  process.env.RENDER_EXTERNAL_URL?.replace(/\/+$/, "") ||
  "https://trading-ai-platform-81i5.onrender.com";

export async function GET() {
  try {
    // فقط ادمین اجازه تنظیم Webhook را دارد
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
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
        role: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "TELEGRAM_BOT_TOKEN is missing",
        },
        { status: 500 }
      );
    }

    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error: "TELEGRAM_WEBHOOK_SECRET is missing",
        },
        { status: 500 }
      );
    }

    const webhookUrl = `${APP_URL}/api/telegram/webhook`;

    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message", "channel_post"],
          drop_pending_updates: false,
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.description ||
            "Telegram setWebhook failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Telegram webhook configured successfully",
      webhook: webhookUrl,
      telegram: data,
    });
  } catch (error) {
    console.error("Telegram setup error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Telegram webhook setup failed",
      },
      { status: 500 }
    );
  }
}
