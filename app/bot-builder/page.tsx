import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function getBotData(body: any) {
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "ربات جدید";

  const type =
    typeof body.type === "string" && body.type.trim()
      ? body.type.trim()
      : "TRADING";

  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : "TRADING";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : null;

  const symbol =
    typeof body.symbol === "string" && body.symbol.trim()
      ? body.symbol.trim()
      : "XAUUSD";

  const timeframe =
    typeof body.timeframe === "string" && body.timeframe.trim()
      ? body.timeframe.trim()
      : "15m";

  const marketType =
    typeof body.marketType === "string" && body.marketType.trim()
      ? body.marketType.trim()
      : "FOREX";

  const lotMode =
    body.lotMode === "RISK_PERCENT"
      ? "RISK_PERCENT"
      : "FIXED";

  const lotSize =
    typeof body.lotSize === "number" && body.lotSize > 0
      ? body.lotSize
      : 0.01;

  const riskPercent =
    typeof body.riskPercent === "number" && body.riskPercent >= 0
      ? body.riskPercent
      : 1;

  const takeProfit = numberOrNull(body.takeProfit);
  const stopLoss = numberOrNull(body.stopLoss);
  const riskReward = numberOrNull(body.riskReward);

  const trailingStop =
    typeof body.trailingStop === "boolean"
      ? body.trailingStop
      : false;

  const trailingStopDistance = numberOrNull(
    body.trailingStopDistance
  );

  const breakEven =
    typeof body.breakEven === "boolean"
      ? body.breakEven
      : false;

  const breakEvenTrigger = numberOrNull(body.breakEvenTrigger);

  const dailyProfitStop =
    typeof body.dailyProfitStop === "number" &&
    body.dailyProfitStop >= 0
      ? body.dailyProfitStop
      : 20;

  const dailyLossLimit =
    typeof body.dailyLossLimit === "number" &&
    body.dailyLossLimit >= 0
      ? body.dailyLossLimit
      : 12;

  const maxDailyStopLosses =
    typeof body.maxDailyStopLosses === "number" &&
    body.maxDailyStopLosses >= 0
      ? Math.floor(body.maxDailyStopLosses)
      : 3;

  const maxOpenTrades =
    typeof body.maxOpenTrades === "number" &&
    body.maxOpenTrades >= 1
      ? Math.floor(body.maxOpenTrades)
      : 1;

  const buyEnabled =
    typeof body.buyEnabled === "boolean"
      ? body.buyEnabled
      : true;

  const sellEnabled =
    typeof body.sellEnabled === "boolean"
      ? body.sellEnabled
      : true;

  const maxSpread = numberOrNull(body.maxSpread);

  const cooldownMinutes =
    typeof body.cooldownMinutes === "number" &&
    body.cooldownMinutes >= 0
      ? Math.floor(body.cooldownMinutes)
      : 5;

  const sessionFilter =
    typeof body.sessionFilter === "boolean"
      ? body.sessionFilter
      : true;

  const newsFilter =
    typeof body.newsFilter === "boolean"
      ? body.newsFilter
      : true;

  const signalThreshold =
    typeof body.signalThreshold === "number" &&
    body.signalThreshold >= 0
      ? Math.min(Math.floor(body.signalThreshold), 100)
      : 80;

  const minConfirmations =
    typeof body.minConfirmations === "number" &&
    body.minConfirmations >= 0
      ? Math.floor(body.minConfirmations)
      : 5;

  const telegramEnabled =
    typeof body.telegramEnabled === "boolean"
      ? body.telegramEnabled
      : false;

  const isActive =
    typeof body.isActive === "boolean"
      ? body.isActive
      : false;

  const analysisConfig =
    body.analysisConfig !== undefined
      ? body.analysisConfig
      : null;

  return {
    name,
    type,
    category,
    description,
    symbol,
    timeframe,
    marketType,
    isActive,
    lotMode,
    lotSize,
    riskPercent,
    takeProfit,
    stopLoss,
    riskReward,
    trailingStop,
    trailingStopDistance,
    breakEven,
    breakEvenTrigger,
    dailyProfitStop,
    dailyLossLimit,
    maxDailyStopLosses,
    maxOpenTrades,
    buyEnabled,
    sellEnabled,
    maxSpread,
    cooldownMinutes,
    sessionFilter,
    newsFilter,
    signalThreshold,
    minConfirmations,
    telegramEnabled,
    analysisConfig,
  };
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const bots = await prisma.tradingBot.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      bots,
    });
  } catch (error) {
    console.error("GET /api/bots error:", error);

    return NextResponse.json(
      { error: "خطا در دریافت ربات‌ها." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = getBotData(body);

    const bot = await prisma.tradingBot.create({
      data: {
        userId: session.userId,
        ...data,
      },
    });

    return NextResponse.json(
      {
        success: true,
        bot,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bots error:", error);

    return NextResponse.json(
      {
        error: "خطا در ساخت ربات. تنظیمات دیتابیس را بررسی کنید.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.id !== "string" ||
      !body.id.trim()
    ) {
      return NextResponse.json(
        { error: "شناسه ربات ارسال نشده است." },
        { status: 400 }
      );
    }

    const existingBot = await prisma.tradingBot.findFirst({
      where: {
        id: body.id,
        userId: session.userId,
      },
    });

    if (!existingBot) {
      return NextResponse.json(
        { error: "ربات پیدا نشد یا دسترسی ندارید." },
        { status: 404 }
      );
    }

    const data = getBotData(body);

    const bot = await prisma.tradingBot.update({
      where: {
        id: existingBot.id,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      bot,
    });
  } catch (error) {
    console.error("PUT /api/bots error:", error);

    return NextResponse.json(
      {
        error: "خطا در ذخیره تنظیمات ربات.",
      },
      { status: 500 }
    );
  }
}
