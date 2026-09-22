import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type SignalSide = "BUY" | "SELL" | "WAIT";

type MarketType = "FOREX" | "CRYPTO" | "COMMODITY";

type Instrument = {
  symbol: string;
  name: string;
  market: MarketType;
};

type Signal = {
  id: string;

  symbol: string;
  name: string;
  market: MarketType;
  interval: string;

  side: SignalSide;

  price: number;
  entry: number;

  stopLoss: number | null;

  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  riskReward: number | null;

  confidence: number;
  strength: number;

  trend: "BULLISH" | "BEARISH" | "NEUTRAL";

  rsi: number;

  ema20: number;
  ema50: number;

  macd: number;
  macdSignal: number;
  macdHistogram: number;

  atr: number;

  support1: number;
  support2: number;

  resistance1: number;
  resistance2: number;

  candleTime: string;
  generatedAt: string;

  expiresAt: string;

  reasons: string[];

  persisted: boolean;
  telegramSent: boolean;
  telegramMessageId: string | null;
};

type AnalysisResult = {
  signal: Signal;
  candlesAnalyzed: number;
};

type TelegramResult = {
  sent: boolean;
  messageId: string | null;
  error: string | null;
};

/* =========================================================
   INSTRUMENTS
========================================================= */

const INSTRUMENTS: Instrument[] = [
  {
    symbol: "XAU/USD",
    name: "Gold",
    market: "COMMODITY",
  },
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    market: "FOREX",
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    market: "FOREX",
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    market: "FOREX",
  },
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    market: "CRYPTO",
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    market: "CRYPTO",
  },
];

const ALLOWED_INTERVALS = new Set([
  "5min",
  "15min",
  "30min",
  "1h",
  "4h",
]);

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function round(
  value: number,
  decimals = 5
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = Math.pow(10, decimals);

  return (
    Math.round(value * multiplier) /
    multiplier
  );
}

function decimalsForSymbol(
  symbol: string
): number {
  if (symbol === "XAU/USD") {
    return 2;
  }

  if (symbol === "USD/JPY") {
    return 3;
  }

  if (
    symbol === "BTC/USD" ||
    symbol === "ETH/USD"
  ) {
    return 2;
  }

  return 5;
}

function intervalToMinutes(
  interval: string
): number {
  switch (interval) {
    case "5min":
      return 5;

    case "15min":
      return 15;

    case "30min":
      return 30;

    case "1h":
      return 60;

    case "4h":
      return 240;

    default:
      return 15;
  }
}

function signalExpiryMinutes(
  interval: string
): number {
  const minutes =
    intervalToMinutes(interval);

  return Math.max(
    minutes * 8,
    60
  );
}

function addMinutes(
  date: Date,
  minutes: number
): Date {
  return new Date(
    date.getTime() +
      minutes * 60 * 1000
  );
}

/* =========================================================
   EMA
========================================================= */

function calculateEMA(
  values: number[],
  period: number
): number[] {
  if (!values.length) {
    return [];
  }

  const result = new Array(
    values.length
  ).fill(0);

  const multiplier =
    2 / (period + 1);

  result[0] = values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result[i] =
      (values[i] - result[i - 1]) *
        multiplier +
      result[i - 1];
  }

  return result;
}

/* =========================================================
   RSI
========================================================= */

function calculateRSI(
  values: number[],
  period = 14
): number[] {
  const result = new Array(
    values.length
  ).fill(50);

  if (
    values.length <
    period + 1
  ) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain =
    gains / period;

  let averageLoss =
    losses / period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 -
        100 /
          (1 +
            averageGain /
              averageLoss);

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    const gain =
      change > 0
        ? change
        : 0;

    const loss =
      change < 0
        ? Math.abs(change)
        : 0;

    averageGain =
      (averageGain *
        (period - 1) +
        gain) /
      period;

    averageLoss =
      (averageLoss *
        (period - 1) +
        loss) /
      period;

    if (averageLoss === 0) {
      result[i] = 100;
    } else {
      const relativeStrength =
        averageGain /
        averageLoss;

      result[i] =
        100 -
        100 /
          (1 +
            relativeStrength);
    }
  }

  return result;
}

/* =========================================================
   ATR
========================================================= */

function calculateATR(
  candles: Candle[],
  period = 14
): number[] {
  if (!candles.length) {
    return [];
  }

  const trueRanges =
    new Array(
      candles.length
    ).fill(0);

  trueRanges[0] =
    candles[0].high -
    candles[0].low;

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const range1 =
      current.high -
      current.low;

    const range2 =
      Math.abs(
        current.high -
          previous.close
      );

    const range3 =
      Math.abs(
        current.low -
          previous.close
      );

    trueRanges[i] =
      Math.max(
        range1,
        range2,
        range3
      );
  }

  const result =
    new Array(
      candles.length
    ).fill(0);

  const firstPeriod =
    Math.min(
      period,
      candles.length
    );

  let initial = 0;

  for (
    let i = 0;
    i < firstPeriod;
    i++
  ) {
    initial +=
      trueRanges[i];
  }

  initial /=
    firstPeriod;

  for (
    let i = 0;
    i <
    Math.min(
      period,
      candles.length
    );
    i++
  ) {
    result[i] = initial;
  }

  for (
    let i = period;
    i < candles.length;
    i++
  ) {
    result[i] =
      (result[i - 1] *
        (period - 1) +
        trueRanges[i]) /
      period;
  }

  return result;
}

/* =========================================================
   MACD
========================================================= */

function calculateMACD(
  values: number[]
) {
  const ema12 =
    calculateEMA(
      values,
      12
    );

  const ema26 =
    calculateEMA(
      values,
      26
    );

  const macdLine =
    values.map(
      (_, index) =>
        ema12[index] -
        ema26[index]
    );

  const signalLine =
    calculateEMA(
      macdLine,
      9
    );

  const histogram =
    macdLine.map(
      (value, index) =>
        value -
        signalLine[index]
    );

  return {
    macdLine,
    signalLine,
    histogram,
  };
}

/* =========================================================
   MARKET DATA
========================================================= */

async function fetchMarketCandles(
  symbol: string,
  interval: string
): Promise<Candle[]> {
  const apiKey =
    process.env
      .TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد."
    );
  }

  const url =
    new URL(
      "https://api.twelvedata.com/time_series"
    );

  url.searchParams.set(
    "symbol",
    symbol
  );

  url.searchParams.set(
    "interval",
    interval
  );

  url.searchParams.set(
    "outputsize",
    "250"
  );

  url.searchParams.set(
    "timezone",
    "UTC"
  );

  url.searchParams.set(
    "order",
    "asc"
  );

  url.searchParams.set(
    "apikey",
    apiKey
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept:
            "application/json",
        },
      }
    );

  const text =
    await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `پاسخ Twelve Data معتبر نیست. HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Twelve Data HTTP ${response.status}`
    );
  }

  if (
    data?.status ===
    "error"
  ) {
    throw new Error(
      data?.message ||
        "خطای سرویس Twelve Data"
    );
  }

  if (
    !Array.isArray(
      data?.values
    )
  ) {
    throw new Error(
      `برای ${symbol} داده کندل دریافت نشد.`
    );
  }

  const candles =
    data.values
      .map(
        (item: any) => ({
          datetime:
            String(
              item.datetime
            ),

          open:
            toNumber(
              item.open
            ),

          high:
            toNumber(
              item.high
            ),

          low:
            toNumber(
              item.low
            ),

          close:
            toNumber(
              item.close
            ),

          volume:
            item.volume !==
            undefined
              ? toNumber(
                  item.volume
                )
              : undefined,
        })
      )
      .filter(
        (item: Candle) =>
          item.open > 0 &&
          item.high > 0 &&
          item.low > 0 &&
          item.close > 0
      );

  if (
    candles.length < 80
  ) {
    throw new Error(
      `داده کافی برای تحلیل ${symbol} وجود ندارد. تعداد کندل: ${candles.length}`
    );
  }

  return candles;
}

/* =========================================================
   SUPPORT / RESISTANCE
========================================================= */

function calculateLevels(
  candles: Candle[],
  price: number
) {
  const recent =
    candles.slice(-50);

  const highs =
    recent.map(
      (c) => c.high
    );

  const lows =
    recent.map(
      (c) => c.low
    );

  const resistance1 =
    Math.max(...highs);

  const support1 =
    Math.min(...lows);

  const previous =
    candles.slice(-100, -50);

  const resistance2 =
    previous.length
      ? Math.max(
          ...previous.map(
            (c) => c.high
          )
        )
      : resistance1;

  const support2 =
    previous.length
      ? Math.min(
          ...previous.map(
            (c) => c.low
          )
        )
      : support1;

  return {
    resistance1:
      round(
        resistance1
      ),

    resistance2:
      round(
        Math.max(
          resistance2,
          price
        )
      ),

    support1:
      round(
        support1
      ),

    support2:
      round(
        Math.min(
          support2,
          price
        )
      ),
  };
}

/* =========================================================
   ANALYSIS
========================================================= */

function analyze(
  instrument: Instrument,
  candles: Candle[],
  interval: string
): AnalysisResult {
  const decimals =
    decimalsForSymbol(
      instrument.symbol
    );

  const closes =
    candles.map(
      (c) => c.close
    );

  const ema20 =
    calculateEMA(
      closes,
      20
    );

  const ema50 =
    calculateEMA(
      closes,
      50
    );

  const rsi =
    calculateRSI(
      closes,
      14
    );

  const atr =
    calculateATR(
      candles,
      14
    );

  const macd =
    calculateMACD(
      closes
    );

  const lastIndex =
    candles.length - 1;

  const previousIndex =
    candles.length - 2;

  const current =
    candles[lastIndex];

  const previous =
    candles[previousIndex];

  const price =
    current.close;

  const currentEMA20 =
    ema20[lastIndex];

  const currentEMA50 =
    ema50[lastIndex];

  const previousEMA20 =
    ema20[previousIndex];

  const currentRSI =
    rsi[lastIndex];

  const currentATR =
    atr[lastIndex];

  const currentMACD =
    macd.macdLine[
      lastIndex
    ];

  const currentSignal =
    macd.signalLine[
      lastIndex
    ];

  const previousMACD =
    macd.macdLine[
      previousIndex
    ];

  const previousSignal =
    macd.signalLine[
      previousIndex
    ];

  const histogram =
    macd.histogram[
      lastIndex
    ];

  let buyScore = 0;
  let sellScore = 0;

  const buyReasons: string[] =
    [];

  const sellReasons: string[] =
    [];

  /* =====================================================
     TREND
  ===================================================== */

  if (
    price >
    currentEMA20
  ) {
    buyScore += 12;

    buyReasons.push(
      "قیمت بالای EMA20 قرار دارد."
    );
  }

  if (
    price <
    currentEMA20
  ) {
    sellScore += 12;

    sellReasons.push(
      "قیمت زیر EMA20 قرار دارد."
    );
  }

  if (
    currentEMA20 >
    currentEMA50
  ) {
    buyScore += 18;

    buyReasons.push(
      "EMA20 بالاتر از EMA50 است."
    );
  }

  if (
    currentEMA20 <
    currentEMA50
  ) {
    sellScore += 18;

    sellReasons.push(
      "EMA20 پایین‌تر از EMA50 است."
    );
  }

  /* =====================================================
     EMA MOMENTUM
  ===================================================== */

  if (
    currentEMA20 >
      previousEMA20
  ) {
    buyScore += 7;

    buyReasons.push(
      "شیب EMA20 صعودی است."
    );
  }

  if (
    currentEMA20 <
      previousEMA20
  ) {
    sellScore += 7;

    sellReasons.push(
      "شیب EMA20 نزولی است."
    );
  }

  /* =====================================================
     RSI
  ===================================================== */

  if (
    currentRSI >= 52 &&
    currentRSI <= 70
  ) {
    buyScore += 15;

    buyReasons.push(
      `RSI روی ${round(
        currentRSI,
        2
      )} است و مومنتوم صعودی را تأیید می‌کند.`
    );
  }

  if (
    currentRSI <= 48 &&
    currentRSI >= 30
  ) {
    sellScore += 15;

    sellReasons.push(
      `RSI روی ${round(
        currentRSI,
        2
      )} است و مومنتوم نزولی را تأیید می‌کند.`
    );
  }

  /* =====================================================
     MACD
  ===================================================== */

  if (
    currentMACD >
    currentSignal
  ) {
    buyScore += 10;

    buyReasons.push(
      "MACD بالاتر از خط سیگنال است."
    );
  }

  if (
    currentMACD <
    currentSignal
  ) {
    sellScore += 10;

    sellReasons.push(
      "MACD پایین‌تر از خط سیگنال است."
    );
  }

  const bullishCross =
    currentMACD >
      currentSignal &&
    previousMACD <=
      previousSignal;

  const bearishCross =
    currentMACD <
      currentSignal &&
    previousMACD >=
      previousSignal;

  if (bullishCross) {
    buyScore += 8;

    buyReasons.push(
      "کراس صعودی MACD تأیید شده است."
    );
  }

  if (bearishCross) {
    sellScore += 8;

    sellReasons.push(
      "کراس نزولی MACD تأیید شده است."
    );
  }

  /* =====================================================
     MACD HISTOGRAM
  ===================================================== */

  if (
    histogram > 0 &&
    currentMACD >
      previousMACD
  ) {
    buyScore += 8;

    buyReasons.push(
      "هیستوگرام MACD مومنتوم صعودی را تأیید می‌کند."
    );
  }

  if (
    histogram < 0 &&
    currentMACD <
      previousMACD
  ) {
    sellScore += 8;

    sellReasons.push(
      "هیستوگرام MACD مومنتوم نزولی را تأیید می‌کند."
    );
  }

  /* =====================================================
     CANDLE MOMENTUM
  ===================================================== */

  const candleRange =
    current.high -
    current.low;

  const candleBody =
    Math.abs(
      current.close -
        current.open
    );

  if (
    candleRange > 0
  ) {
    const bodyRatio =
      candleBody /
      candleRange;

    if (
      current.close >
        current.open &&
      bodyRatio >= 0.45
    ) {
      buyScore += 7;

      buyReasons.push(
        "آخرین کندل مومنتوم صعودی مناسبی دارد."
      );
    }

    if (
      current.close <
        current.open &&
      bodyRatio >= 0.45
    ) {
      sellScore += 7;

      sellReasons.push(
        "آخرین کندل مومنتوم نزولی مناسبی دارد."
      );
    }
  }

  /* =====================================================
     MARKET STRUCTURE
  ===================================================== */

  const structure =
    candles.slice(-20);

  const recentHigh =
    Math.max(
      ...structure.map(
        (c) => c.high
      )
    );

  const recentLow =
    Math.min(
      ...structure.map(
        (c) => c.low
      )
    );

  const range =
    recentHigh -
    recentLow;

  if (range > 0) {
    const position =
      (price -
        recentLow) /
      range;

    if (
      position >= 0.65
    ) {
      buyScore += 10;

      buyReasons.push(
        "قیمت در بخش بالایی ساختار کوتاه‌مدت قرار دارد."
      );
    }

    if (
      position <= 0.35
    ) {
      sellScore += 10;

      sellReasons.push(
        "قیمت در بخش پایینی ساختار کوتاه‌مدت قرار دارد."
      );
    }
  }

  /* =====================================================
     FINAL DECISION

     حداقل 65 امتیاز + اختلاف حداقل 8
     تا BUY/SELL صادر شود.
  ===================================================== */

  let side: SignalSide =
    "WAIT";

  if (
    buyScore >= 65 &&
    buyScore >=
      sellScore + 8
  ) {
    side = "BUY";
  } else if (
    sellScore >= 65 &&
    sellScore >=
      buyScore + 8
  ) {
    side = "SELL";
  }

  const strength =
    Math.min(
      99,
      Math.max(
        buyScore,
        sellScore
      )
    );

  const confidence =
    side === "WAIT"
      ? Math.min(
          68,
          strength
        )
      : Math.min(
          95,
          strength
        );

  /* =====================================================
     RISK / TARGETS
  ===================================================== */

  let entry = price;

  let stopLoss:
    | number
    | null = null;

  let takeProfit1:
    | number
    | null = null;

  let takeProfit2:
    | number
    | null = null;

  let takeProfit3:
    | number
    | null = null;

  let riskReward:
    | number
    | null = null;

  if (
    side !== "WAIT" &&
    currentATR > 0
  ) {
    const risk =
      currentATR * 1.5;

    entry = price;

    if (side === "BUY") {
      stopLoss =
        entry - risk;

      takeProfit1 =
        entry + risk;

      takeProfit2 =
        entry + risk * 2;

      takeProfit3 =
        entry + risk * 3;

      riskReward = 3;
    }

    if (side === "SELL") {
      stopLoss =
        entry + risk;

      takeProfit1 =
        entry - risk;

      takeProfit2 =
        entry - risk * 2;

      takeProfit3 =
        entry - risk * 3;

      riskReward = 3;
    }
  }

  /* =====================================================
     SUPPORT / RESISTANCE
  ===================================================== */

  const levels =
    calculateLevels(
      candles,
      price
    );

  /* =====================================================
     TREND
  ===================================================== */

  const trend =
    currentEMA20 >
    currentEMA50
      ? "BULLISH"
      : currentEMA20 <
        currentEMA50
      ? "BEARISH"
      : "NEUTRAL";

  /* =====================================================
     REASONS
  ===================================================== */

  const reasons =
    side === "BUY"
      ? buyReasons
      : side === "SELL"
      ? sellReasons
      : [
          "شرایط ورود معتبر هنوز کامل نشده است.",
          "سیستم منتظر تأیید بیشتر روند و مومنتوم است.",
          `امتیاز BUY: ${buyScore}`,
          `امتیاز SELL: ${sellScore}`,
        ];

  const generatedAt =
    new Date();

  const expiresAt =
    addMinutes(
      generatedAt,
      signalExpiryMinutes(
        interval
      )
    );

  const signal: Signal = {
    id: `${instrument.symbol}-${interval}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    symbol:
      instrument.symbol,

    name:
      instrument.name,

    market:
      instrument.market,

    interval,

    side,

    price: round(
      price,
      decimals
    ),

    entry: round(
      entry,
      decimals
    ),

    stopLoss:
      stopLoss !== null
        ? round(
            stopLoss,
            decimals
          )
        : null,

    takeProfit1:
      takeProfit1 !== null
        ? round(
            takeProfit1,
            decimals
          )
        : null,

    takeProfit2:
      takeProfit2 !== null
        ? round(
            takeProfit2,
            decimals
          )
        : null,

    takeProfit3:
      takeProfit3 !== null
        ? round(
            takeProfit3,
            decimals
          )
        : null,

    riskReward,

    confidence: Math.round(
      confidence
    ),

    strength: Math.round(
      strength
    ),

    trend,

    rsi: round(
      currentRSI,
      2
    ),

    ema20: round(
      currentEMA20,
      decimals
    ),

    ema50: round(
      currentEMA50,
      decimals
    ),

    macd: round(
      currentMACD,
      decimals
    ),

    macdSignal: round(
      currentSignal,
      decimals
    ),

    macdHistogram:
      round(
        histogram,
        decimals
      ),

    atr: round(
      currentATR,
      decimals
    ),

    support1:
      round(
        levels.support1,
        decimals
      ),

    support2:
      round(
        levels.support2,
        decimals
      ),

    resistance1:
      round(
        levels.resistance1,
        decimals
      ),

    resistance2:
      round(
        levels.resistance2,
        decimals
      ),

    candleTime:
      current.datetime,

    generatedAt:
      generatedAt.toISOString(),

    expiresAt:
      expiresAt.toISOString(),

    reasons,

    persisted: false,

    telegramSent: false,

    telegramMessageId:
      null,
  };

  return {
    signal,
    candlesAnalyzed:
      candles.length,
  };
}

/* =========================================================
   TELEGRAM
========================================================= */

async function sendTelegramSignal(
  signal: Signal
): Promise<TelegramResult> {
  if (
    signal.side ===
    "WAIT"
  ) {
    return {
      sent: false,
      messageId: null,
      error: null,
    };
  }

  const botToken =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID ||
    process.env
      .TELEGRAM_CHAT_ID;

  if (!botToken) {
    return {
      sent: false,
      messageId: null,
      error:
        "TELEGRAM_BOT_TOKEN تنظیم نشده است.",
    };
  }

  if (!chatId) {
    return {
      sent: false,
      messageId: null,
      error:
        "TELEGRAM_SIGNAL_CHAT_ID یا TELEGRAM_CHAT_ID تنظیم نشده است.",
    };
  }

  const direction =
    signal.side ===
    "BUY"
      ? "🟢 BUY"
      : "🔴 SELL";

  const trend =
    signal.trend ===
    "BULLISH"
      ? "صعودی"
      : signal.trend ===
        "BEARISH"
      ? "نزولی"
      : "خنثی";

  const message = [
    "━━━━━━━━━━━━━━━━━━",
    "🤖 TRADING AI",
    "📡 REAL MARKET SIGNAL",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `${direction}  |  ${signal.symbol}`,
    `📊 تایم‌فریم: ${signal.interval}`,
    `📈 روند: ${trend}`,
    `💪 قدرت: ${signal.strength}%`,
    `🎯 اطمینان: ${signal.confidence}%`,
    "",
    `💠 ENTRY: ${signal.entry}`,
    `🛑 STOP LOSS: ${signal.stopLoss ?? "—"}`,
    "",
    `🎯 TP1: ${signal.takeProfit1 ?? "—"}`,
    `🎯 TP2: ${signal.takeProfit2 ?? "—"}`,
    `🎯 TP3: ${signal.takeProfit3 ?? "—"}`,
    "",
    `⚖️ R:R = ${
      signal.riskReward
        ? `1:${signal.riskReward}`
        : "—"
    }`,
    "",
    `💰 قیمت فعلی: ${signal.price}`,
    "",
    "📌 دلایل:",
    ...signal.reasons
      .slice(0, 5)
      .map(
        (reason) =>
          `• ${reason}`
      ),
    "",
    `⏱ اعتبار سیگنال تا: ${new Date(
      signal.expiresAt
    ).toLocaleString(
      "fa-IR"
    )}`,
    "",
    "⚠️ این پیام سیگنال الگوریتمی بر اساس داده بازار است و تضمین سود نیست.",
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");

  try {
    const url =
      `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response =
      await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),

          cache: "no-store",
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.ok
    ) {
      return {
        sent: false,
        messageId: null,
        error:
          data?.description ||
          `Telegram HTTP ${response.status}`,
      };
    }

    return {
      sent: true,

      messageId:
        data?.result?.message_id
          ? String(
              data.result
                .message_id
            )
          : null,

      error: null,
    };
  } catch (error) {
    return {
      sent: false,
      messageId: null,

      error:
        error instanceof Error
          ? error.message
          : "خطای اتصال به Telegram",
    };
  }
}

/* =========================================================
   DATABASE
========================================================= */

async function persistSignal(
  signal: Signal
): Promise<{
  persisted: boolean;
  telegramSent: boolean;
  telegramMessageId: string | null;
  telegramError: string | null;
}> {
  const session =
    await getSession();

  if (!session?.userId) {
    return {
      persisted: false,
      telegramSent: false,
      telegramMessageId: null,
      telegramError:
        "کاربر وارد نشده است؛ سیگنال فقط برای نمایش تولید شد.",
    };
  }

  if (
    signal.side ===
    "WAIT"
  ) {
    return {
      persisted: false,
      telegramSent: false,
      telegramMessageId: null,
      telegramError: null,
    };
  }

  /*
   * پیدا کردن ربات فعال کاربر
   * که با نماد و تایم‌فریم هماهنگ باشد.
   */

  const bot =
    await prisma.tradingBot.findFirst(
      {
        where: {
          userId:
            session.userId,

          isActive: true,

          OR: [
            {
              symbol:
                signal.symbol,
            },

            {
              symbol: null,
            },
          ],

          AND: [
            {
              OR: [
                {
                  timeframe:
                    signal.interval,
                },

                {
                  timeframe:
                    null,
                },
              ],
            },
          ],
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      }
    );

  if (!bot) {
    /*
     * بدون Bot نمی‌توان TradingSignal را
     * با schema فعلی به دیتابیس متصل کرد.
     */
    return {
      persisted: false,
      telegramSent: false,
      telegramMessageId: null,
      telegramError:
        "هیچ ربات فعال سازگار با این نماد پیدا نشد؛ ابتدا ربات تحلیل را فعال کنید.",
    };
  }

  /*
   * جلوگیری از ثبت چندباره سیگنال
   * در فاصله کوتاه.
   */

  const duplicateSince =
    new Date(
      Date.now() -
        10 * 60 * 1000
    );

  const duplicate =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          userId:
            session.userId,

          botId: bot.id,

          symbol:
            signal.symbol,

          timeframe:
            signal.interval,

          direction:
            signal.side,

          createdAt: {
            gte:
              duplicateSince,
          },

          status: {
            in: [
              "WAITING",
              "ACTIVE",
              "OPEN",
            ],
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    );

  if (duplicate) {
    const metadata =
      duplicate.metadata &&
      typeof duplicate.metadata ===
        "object" &&
      !Array.isArray(
        duplicate.metadata
      )
        ? (duplicate.metadata as Record<
            string,
            unknown
          >)
        : {};

    const existingTelegramId =
      duplicate.telegramMessageId ||
      null;

    return {
      persisted: true,
      telegramSent:
        duplicate.telegramSent,
      telegramMessageId:
        existingTelegramId,
      telegramError:
        typeof metadata[
          "telegramError"
        ] === "string"
          ? String(
              metadata[
                "telegramError"
              ]
            )
          : null,
    };
  }

  /*
   * Telegram
   */

  let telegramResult:
    TelegramResult = {
      sent: false,
      messageId: null,
      error: null,
    };

  /*
   * فقط اگر تنظیم ربات اجازه دهد
   * یا متغیر عمومی فعال باشد.
   */

  const telegramEnabled =
    bot.telegramEnabled ||
    process.env
      .TELEGRAM_SIGNALS_ENABLED ===
      "true";

  if (
    telegramEnabled
  ) {
    telegramResult =
      await sendTelegramSignal(
        signal
      );
  }

  /*
   * TP1 / TP2 / TP3 را فعلاً در metadata
   * ذخیره می‌کنیم تا با schema فعلی سازگار باشد.
   */

  const metadata = {
    engineVersion:
      "TRADING_AI_SIGNAL_ENGINE_V2",

    currentPrice:
      signal.price,

    entry:
      signal.entry,

    stopLoss:
      signal.stopLoss,

    takeProfit1:
      signal.takeProfit1,

    takeProfit2:
      signal.takeProfit2,

    takeProfit3:
      signal.takeProfit3,

    riskReward:
      signal.riskReward,

    strength:
      signal.strength,

    confidence:
      signal.confidence,

    trend:
      signal.trend,

    rsi:
      signal.rsi,

    ema20:
      signal.ema20,

    ema50:
      signal.ema50,

    macd:
      signal.macd,

    macdSignal:
      signal.macdSignal,

    macdHistogram:
      signal.macdHistogram,

    atr:
      signal.atr,

    support1:
      signal.support1,

    support2:
      signal.support2,

    resistance1:
      signal.resistance1,

    resistance2:
      signal.resistance2,

    candleTime:
      signal.candleTime,

    expiresAt:
      signal.expiresAt,

    reasons:
      signal.reasons,

    telegramError:
      telegramResult.error,
  };

  const created =
    await prisma.tradingSignal.create(
      {
        data: {
          userId:
            session.userId,

          botId:
            bot.id,

          symbol:
            signal.symbol,

          timeframe:
            signal.interval,

          direction:
            signal.side,

          entry:
            signal.entry,

          /*
           * takeProfit اصلی را TP3 قرار می‌دهیم
           * و TP1/TP2/TP3 در metadata نیز هستند.
           */
          takeProfit:
            signal.takeProfit3,

          stopLoss:
            signal.stopLoss,

          riskReward:
            signal.riskReward,

          score:
            signal.strength,

          confidence:
            signal.confidence,

          status:
            "ACTIVE",

          source:
            "REAL_MARKET_ANALYSIS",

          marketStructure:
            signal.trend,

          supportResistance:
            JSON.stringify({
              support1:
                signal.support1,
              support2:
                signal.support2,
              resistance1:
                signal.resistance1,
              resistance2:
                signal.resistance2,
            }),

          volatilityConfirmation:
            `ATR=${signal.atr}`,

          confirmations:
            signal.reasons,

          reasons:
            signal.reasons,

          metadata,

          telegramSent:
            telegramResult.sent,

          telegramMessageId:
            telegramResult.messageId,

          telegramSentAt:
            telegramResult.sent
              ? new Date()
              : null,

          expiresAt:
            new Date(
              signal.expiresAt
            ),
        },
      }
    );

  /*
   * TelegramDelivery
   */

  if (
    telegramEnabled
  ) {
    try {
      await prisma.telegramDelivery.create(
        {
          data: {
            signalId:
              created.id,

            channelId:
              process.env
                .TELEGRAM_SIGNAL_CHAT_ID ||
              process.env
                .TELEGRAM_CHAT_ID ||
              "UNKNOWN",

            messageId:
              telegramResult.messageId,

            status:
              telegramResult.sent
                ? "SENT"
                : "FAILED",

            errorMessage:
              telegramResult.error,

            sentAt:
              telegramResult.sent
                ? new Date()
                : null,
          },
        }
      );
    } catch (deliveryError) {
      console.error(
        "TELEGRAM_DELIVERY_DB_ERROR:",
        deliveryError
      );
    }
  }

  return {
    persisted: true,

    telegramSent:
      telegramResult.sent,

    telegramMessageId:
      telegramResult.messageId,

    telegramError:
      telegramResult.error,
  };
}

/* =========================================================
   GET API
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const requestedInterval =
      request.nextUrl.searchParams.get(
        "interval"
      ) || "15min";

    const interval =
      ALLOWED_INTERVALS.has(
        requestedInterval
      )
        ? requestedInterval
        : "15min";

    const requestedSymbol =
      request.nextUrl.searchParams.get(
        "symbol"
      );

    let instruments =
      INSTRUMENTS;

    if (requestedSymbol) {
      instruments =
        INSTRUMENTS.filter(
          (instrument) =>
            instrument.symbol ===
            requestedSymbol
        );

      if (!instruments.length) {
        return NextResponse.json(
          {
            success: false,

            error:
              "نماد مورد نظر پشتیبانی نمی‌شود.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * تحلیل موازی بازارها
     */

    const results =
      await Promise.allSettled(
        instruments.map(
          async (
            instrument
          ) => {
            const candles =
              await fetchMarketCandles(
                instrument.symbol,
                interval
              );

            return analyze(
              instrument,
              candles,
              interval
            );
          }
        )
      );

    const signals: Signal[] =
      [];

    const errors: Array<{
      symbol: string;
      error: string;
    }> = [];

    /*
     * ذخیره / Telegram را بعد از تحلیل انجام می‌دهیم.
     */

    for (
      let index = 0;
      index <
      results.length;
      index++
    ) {
      const result =
        results[index];

      const instrument =
        instruments[index];

      if (
        result.status ===
        "fulfilled"
      ) {
        const signal =
          result.value
            .signal;

        try {
          const persisted =
            await persistSignal(
              signal
            );

          signal.persisted =
            persisted.persisted;

          signal.telegramSent =
            persisted.telegramSent;

          signal.telegramMessageId =
            persisted.telegramMessageId;
        } catch (persistError) {
          console.error(
            "SIGNAL_PERSIST_ERROR:",
            persistError
          );

          errors.push({
            symbol:
              instrument.symbol,

            error:
              persistError instanceof
              Error
                ? persistError.message
                : "خطا در ثبت سیگنال",
          });
        }

        signals.push(
          signal
        );
      } else {
        errors.push({
          symbol:
            instrument.symbol,

          error:
            result.reason instanceof
            Error
              ? result.reason.message
              : "خطای ناشناخته در دریافت بازار",
        });
      }
    }

    /*
     * قوی‌ترین سیگنال‌ها ابتدا
     */

    signals.sort(
      (a, b) =>
        b.strength -
        a.strength
    );

    const buy =
      signals.filter(
        (item) =>
          item.side ===
          "BUY"
      );

    const sell =
      signals.filter(
        (item) =>
          item.side ===
          "SELL"
      );

    const wait =
      signals.filter(
        (item) =>
          item.side ===
          "WAIT"
      );

    return NextResponse.json(
      {
        success: true,

        source:
          "Twelve Data",

        generatedAt:
          new Date().toISOString(),

        interval,

        signals,

        errors,

        summary: {
          total:
            signals.length,

          buy:
            buy.length,

          sell:
            sell.length,

          wait:
            wait.length,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "SIGNALS_API_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی موتور سیگنال",

        signals: [],
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
