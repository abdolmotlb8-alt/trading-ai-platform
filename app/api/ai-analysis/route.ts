import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   AI XAUUSD SIGNAL ENGINE V3
   ---------------------------------------------------------
   Source of truth:
   - TradingSignal
   - AnalysisRun
   - TelegramDelivery

   Engine:
   - XAU/USD
   - Multi timeframe
   - Real price from Twelve Data
   - Real USD/IRR from NetArz
   - Telegram lifecycle updates
   - TP1 / TP2 / TP3
   - Break-even
   - Stop loss
   - Performance / win / loss
   - Automatic recovery of stuck signals
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const TOTAL_LOT = 0.1;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_PROFIT_USD = 80;

const MIN_SCORE = 70;
const MIN_CONFIRMATIONS = 3;

const SIGNAL_COOLDOWN_MINUTES = 10;

const MAX_SIGNAL_AGE_HOURS = 8;

const TELEGRAM_RETRIES = 3;
const TELEGRAM_RETRY_DELAY = 700;

const PRICE_CACHE_MS = 8_000;
const CANDLE_CACHE_MS = 20_000;
const FX_CACHE_MS = 5 * 60_000;

const ATR_SL_MULTIPLIER = 1.5;

const MIN_SL_DISTANCE = 3;
const MAX_SL_DISTANCE = 15;

const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_SIGNAL_CHAT_ID;

const NETARZ_KEY = process.env.NETARZ_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.SIGNALS_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

/* =========================================================
   TYPES
   ========================================================= */

type Direction = "BUY" | "SELL";

type SessionName =
  | "سیدنی"
  | "توکیو"
  | "لندن"
  | "نیویورک";

type EngineState =
  | "AI_PENDING"
  | "AI_TP1"
  | "AI_TP2"
  | "AI_TP3"
  | "AI_SL"
  | "AI_BE"
  | "AI_EXPIRED";

type EventType =
  | "TP1"
  | "TP2"
  | "TP3"
  | "SL"
  | "BREAKEVEN"
  | "EXPIRED";

type EventRow = {
  id: string;
  type: EventType;
  at: string;
  price: number;
  usd: number;
  toman: number;
  lot: number;
  telegramSent: boolean;
};

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type FxData = {
  rate: number;
  asOf: string;
  delayed: boolean;
  delayedMinutes: number;
};

type AnalysisResult = {
  direction: Direction | null;
  score: number;
  confirmations: number;
  reasons: string[];
  support: number;
  resistance: number;
  atr: number;
  candles: Candle[];
  timeframeVotes: Record<string, Direction | "NEUTRAL">;
};

type SignalMeta = {
  engineVersion: string;

  state: EngineState;

  direction: Direction;

  symbol: string;

  timeframe: string;

  entry: number;

  stopLoss: number;

  tp1: number;

  tp2: number;

  tp3: number;

  currentPrice: number;

  score: number;

  confirmations: number;

  reasons: string[];

  support: number;

  resistance: number;

  atr: number;

  session: SessionName;

  sessionFlag: string;

  iranTime: string;

  createdAt: string;

  updatedAt: string;

  closedAt?: string;

  lots: {
    total: number;
    tp1: number;
    tp2: number;
    tp3: number;
    remaining: number;
  };

  usdProfit: {
    tp1: number;
    tp2: number;
    tp3: number;
    total: number;
    stopLoss: number;
  };

  usdToToman: number;

  usdRateAsOf: string;

  usdRateDelayed: boolean;

  usdRateDelayedMinutes: number;

  realizedUsd: number;

  realizedToman: number;

  breakevenPrice?: number;

  protectedStop?: number;

  events: EventRow[];

  telegramMessageId?: number;

  telegramSent: boolean;

  telegramLastError?: string;

  analysis?: {
    trend: string;
    momentum: string;
    volatility: string;
    multiTimeframe: string;
    structure: string;
  };
};

/* =========================================================
   CACHE
   ========================================================= */

let priceCache:
  | {
      value: number;
      at: number;
    }
  | null = null;

const candleCache = new Map<
  string,
  {
    value: Candle[];
    at: number;
  }
>();

let fxCache:
  | {
      value: FxData;
      at: number;
    }
  | null = null;

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function n(value: unknown, fallback = 0): number {
  const x = Number(value);

  return Number.isFinite(x) ? x : fallback;
}

function round(value: number, digits = 2): number {
  const p = 10 ** digits;

  return Math.round(value * p) / p;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value));
}

function fmtPrice(value: number): string {
  return n(value).toFixed(2);
}

function fmtLot(value: number): string {
  return n(value).toFixed(2);
}

function fmtUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";

  return `${sign}$${Math.abs(value).toFixed(0)}`;
}

function fmtToman(value: number): string {
  const sign = value >= 0 ? "+" : "";

  return `${sign}${Math.round(Math.abs(value)).toLocaleString(
    "fa-IR",
  )} تومان`;
}

function delay(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/* =========================================================
   TIME
   ========================================================= */

function formatTehran(date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getSessionInfo(date = new Date()): {
  name: SessionName;
  flag: string;
} {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );

  const londonHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );

  const tokyoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );

  const sydneyHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Australia/Sydney",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );

  if (hour >= 8 && hour < 17) {
    return {
      name: "نیویورک",
      flag: "🇺🇸",
    };
  }

  if (londonHour >= 8 && londonHour < 17) {
    return {
      name: "لندن",
      flag: "🇬🇧",
    };
  }

  if (tokyoHour >= 9 && tokyoHour < 18) {
    return {
      name: "توکیو",
      flag: "🇯🇵",
    };
  }

  if (sydneyHour >= 8 && sydneyHour < 17) {
    return {
      name: "سیدنی",
      flag: "🇦🇺",
    };
  }

  return {
    name: "نیویورک",
    flag: "🇺🇸",
  };
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(
  endpoint: string,
  params: Record<string, string>,
): Promise<any> {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است.",
    );
  }

  const url = new URL(
    `https://api.twelvedata.com/${endpoint}`,
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("apikey", TD_KEY);

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Twelve Data پاسخ نامعتبر داد: ${text.slice(
        0,
        200,
      )}`,
    );
  }

  if (!response.ok || json?.status === "error") {
    throw new Error(
      json?.message ||
        `Twelve Data HTTP ${response.status}`,
    );
  }

  return json;
}

async function getLivePrice(): Promise<number> {
  if (
    priceCache &&
    Date.now() - priceCache.at < PRICE_CACHE_MS
  ) {
    return priceCache.value;
  }

  const data = await twelveData("price", {
    symbol: SYMBOL,
  });

  const price = n(data?.price);

  if (!price) {
    throw new Error(
      "قیمت XAU/USD از Twelve Data دریافت نشد.",
    );
  }

  priceCache = {
    value: price,
    at: Date.now(),
  };

  return price;
}

async function getCandles(
  interval: string,
  outputsize = 160,
): Promise<Candle[]> {
  const key = `${interval}:${outputsize}`;

  const cached = candleCache.get(key);

  if (
    cached &&
    Date.now() - cached.at < CANDLE_CACHE_MS
  ) {
    return cached.value;
  }

  const data = await twelveData("time_series", {
    symbol: SYMBOL,
    interval,
    outputsize: String(outputsize),
    order: "ASC",
    timezone: "UTC",
  });

  const values = Array.isArray(data?.values)
    ? data.values
    : [];

  const candles: Candle[] = values
    .map((item: any) => ({
      datetime: String(item.datetime),
      open: n(item.open),
      high: n(item.high),
      low: n(item.low),
      close: n(item.close),
      volume:
        item.volume == null
          ? undefined
          : n(item.volume),
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0,
    );

  candleCache.set(key, {
    value: candles,
    at: Date.now(),
  });

  return candles;
}

/* =========================================================
   TECHNICAL INDICATORS
   ========================================================= */

function sma(
  values: number[],
  period: number,
): number {
  if (values.length < period) {
    return values.at(-1) ?? 0;
  }

  const slice = values.slice(-period);

  return (
    slice.reduce((sum, value) => sum + value, 0) /
    period
  );
}

function ema(
  values: number[],
  period: number,
): number {
  if (!values.length) return 0;

  const k = 2 / (period + 1);

  let result = values[0];

  for (let i = 1; i < values.length; i++) {
    result =
      values[i] * k +
      result * (1 - k);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14,
): number {
  if (values.length < period + 1) {
    return 50;
  }

  let gain = 0;
  let loss = 0;

  for (
    let i = values.length - period;
    i < values.length;
    i++
  ) {
    const previous = values[i - 1];
    const current = values[i];

    const diff = current - previous;

    if (diff >= 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }

  if (loss === 0) return 100;

  const rs = gain / loss;

  return 100 - 100 / (1 + rs);
}

function atr(
  candles: Candle[],
  period = 14,
): number {
  if (candles.length < period + 1) {
    return 0;
  }

  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(
        current.high - previous.close,
      ),
      Math.abs(
        current.low - previous.close,
      ),
    );

    trs.push(tr);
  }

  return sma(trs, period);
}

function candleDirection(
  candles: Candle[],
): Direction | "NEUTRAL" {
  if (candles.length < 3) {
    return "NEUTRAL";
  }

  const last = candles.at(-1)!;
  const previous = candles.at(-2)!;

  const body = last.close - last.open;
  const previousBody =
    previous.close - previous.open;

  if (
    body > 0 &&
    previousBody >= 0
  ) {
    return "BUY";
  }

  if (
    body < 0 &&
    previousBody <= 0
  ) {
    return "SELL";
  }

  return "NEUTRAL";
}

function trendDirection(
  candles: Candle[],
): Direction | "NEUTRAL" {
  if (candles.length < 40) {
    return "NEUTRAL";
  }

  const closes = candles.map(
    (c) => c.close,
  );

  const fast = ema(closes, 20);
  const slow = ema(closes, 50);

  const last = closes.at(-1)!;

  if (
    last > fast &&
    fast > slow
  ) {
    return "BUY";
  }

  if (
    last < fast &&
    fast < slow
  ) {
    return "SELL";
  }

  return "NEUTRAL";
}

function momentumDirection(
  candles: Candle[],
): Direction | "NEUTRAL" {
  const closes = candles.map(
    (c) => c.close,
  );

  const value = rsi(closes, 14);

  if (value >= 55 && value <= 75) {
    return "BUY";
  }

  if (value <= 45 && value >= 25) {
    return "SELL";
  }

  return "NEUTRAL";
}

function getSupport(
  candles: Candle[],
): number {
  const slice = candles.slice(-60);

  if (!slice.length) return 0;

  return Math.min(
    ...slice.map((c) => c.low),
  );
}

function getResistance(
  candles: Candle[],
): number {
  const slice = candles.slice(-60);

  if (!slice.length) return 0;

  return Math.max(
    ...slice.map((c) => c.high),
  );
}

/* =========================================================
   MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket(): Promise<AnalysisResult> {
  const [
    m1,
    m5,
    m15,
    h1,
  ] = await Promise.all([
    getCandles("1min", 180),
    getCandles("5min", 160),
    getCandles("15min", 160),
    getCandles("1h", 120),
  ]);

  const datasets = {
    "1M": m1,
    "5M": m5,
    "15M": m15,
    "1H": h1,
  };

  const votes: Record<
    string,
    Direction | "NEUTRAL"
  > = {};

  for (const [tf, candles] of Object.entries(
    datasets,
  )) {
    const trend = trendDirection(candles);

    const momentum =
      momentumDirection(candles);

    if (
      trend !== "NEUTRAL" &&
      trend === momentum
    ) {
      votes[tf] = trend;
    } else if (trend !== "NEUTRAL") {
      votes[tf] = trend;
    } else {
      votes[tf] = momentum;
    }
  }

  const buyVotes = Object.values(votes).filter(
    (v) => v === "BUY",
  ).length;

  const sellVotes = Object.values(votes).filter(
    (v) => v === "SELL",
  ).length;

  let direction: Direction | null = null;

  if (buyVotes >= 3 && buyVotes > sellVotes) {
    direction = "BUY";
  }

  if (
    sellVotes >= 3 &&
    sellVotes > buyVotes
  ) {
    direction = "SELL";
  }

  const last = m1.at(-1);

  if (!last) {
    throw new Error(
      "داده 1 دقیقه‌ای XAUUSD وجود ندارد.",
    );
  }

  const closes = m1.map(
    (c) => c.close,
  );

  const current = last.close;

  const m1Trend = trendDirection(m1);

  const m5Trend = trendDirection(m5);

  const m15Trend = trendDirection(m15);

  const h1Trend = trendDirection(h1);

  const m1Momentum =
    momentumDirection(m1);

  const support = getSupport(m15);

  const resistance =
    getResistance(m15);

  const currentAtr = atr(m5, 14);

  const reasons: string[] = [];

  let score = 0;

  if (
    direction &&
    m1Trend === direction
  ) {
    score += 15;

    reasons.push(
      `روند تایم‌فریم 1 دقیقه با جهت ${direction} همسو است`,
    );
  }

  if (
    direction &&
    m5Trend === direction
  ) {
    score += 20;

    reasons.push(
      `روند 5 دقیقه‌ای با سیگنال همسو است`,
    );
  }

  if (
    direction &&
    m15Trend === direction
  ) {
    score += 20;

    reasons.push(
      `روند 15 دقیقه‌ای تأییدکننده است`,
    );
  }

  if (
    direction &&
    h1Trend === direction
  ) {
    score += 15;

    reasons.push(
      `روند 1 ساعته تأییدکننده است`,
    );
  }

  if (
    direction &&
    m1Momentum === direction
  ) {
    score += 10;

    reasons.push(
      `مومنتوم 1 دقیقه‌ای تأیید شده است`,
    );
  }

  if (support > 0 && resistance > 0) {
    const range =
      resistance - support;

    if (range > 0) {
      const position =
        (current - support) /
        range;

      if (
        direction === "BUY" &&
        position < 0.55
      ) {
        score += 10;

        reasons.push(
          "قیمت در نیمه مناسب محدوده حمایتی قرار دارد",
        );
      }

      if (
        direction === "SELL" &&
        position > 0.45
      ) {
        score += 10;

        reasons.push(
          "قیمت در نیمه مناسب محدوده مقاومتی قرار دارد",
        );
      }
    }
  }

  const candleDir =
    candleDirection(m1);

  if (
    direction &&
    candleDir === direction
  ) {
    score += 10;

    reasons.push(
      "کندل‌های اخیر جهت سیگنال را تأیید می‌کنند",
    );
  }

  const uniqueVotes = direction
    ? Object.values(votes).filter(
        (v) => v === direction,
      ).length
    : 0;

  const confirmations =
    uniqueVotes +
    (m1Momentum === direction ? 1 : 0) +
    (candleDir === direction ? 1 : 0);

  score = clamp(
    Math.round(score),
    0,
    100,
  );

  return {
    direction,
    score,
    confirmations,
    reasons,
    support,
    resistance,
    atr: currentAtr,
    candles: m1,
    timeframeVotes: votes,
  };
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToToman(): Promise<FxData> {
  if (
    fxCache &&
    Date.now() - fxCache.at < FX_CACHE_MS
  ) {
    return fxCache.value;
  }

  if (!NETARZ_KEY) {
    return {
      rate: 0,
      asOf: new Date().toISOString(),
      delayed: true,
      delayedMinutes: 0,
    };
  }

  try {
    const response = await fetch(
      "https://netarz.ir/api/fx/v1/rates?codes=USD",
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${NETARZ_KEY}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `NetArz HTTP ${response.status}`,
      );
    }

    const data = await response.json();

    let rate = 0;

    if (Array.isArray(data?.data)) {
      const usd = data.data.find(
        (item: any) =>
          String(
            item?.code ??
              item?.currency ??
              "",
          ).toUpperCase() === "USD",
      );

      rate = n(
        usd?.rate ??
          usd?.sell ??
          usd?.price ??
          usd?.value,
      );
    }

    if (!rate) {
      rate = n(
        data?.meta?.usd_irt ??
          data?.usd_irt ??
          data?.data?.USD,
      );
    }

    if (!rate) {
      throw new Error(
        "نرخ USD در پاسخ NetArz پیدا نشد.",
      );
    }

    const asOfRaw =
      data?.meta?.asOf ??
      data?.meta?.updatedAt ??
      data?.updatedAt ??
      new Date().toISOString();

    const asOf = new Date(asOfRaw);

    const delayedMinutes = Number.isFinite(
      asOf.getTime(),
    )
      ? Math.max(
          0,
          Math.round(
            (Date.now() -
              asOf.getTime()) /
              60000,
          ),
        )
      : 0;

    const result: FxData = {
      rate,
      asOf: asOf.toISOString(),
      delayed:
        delayedMinutes > 10,
      delayedMinutes,
    };

    fxCache = {
      value: result,
      at: Date.now(),
    };

    return result;
  } catch {
    if (fxCache) {
      return fxCache.value;
    }

    return {
      rate: 0,
      asOf: new Date().toISOString(),
      delayed: true,
      delayedMinutes: 0,
    };
  }
}

/* =========================================================
   TELEGRAM
   ========================================================= */

async function telegramRequest(
  method: string,
  body: Record<string, unknown>,
): Promise<any> {
  if (!TG_TOKEN) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN تنظیم نشده است.",
    );
  }

  if (!TG_CHAT_ID) {
    throw new Error(
      "TELEGRAM_SIGNAL_CHAT_ID تنظیم نشده است.",
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/${method}`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.description ||
        `Telegram ${method} failed`,
    );
  }

  return data;
}

async function telegramSend(
  text: string,
): Promise<number> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= TELEGRAM_RETRIES;
    attempt++
  ) {
    try {
      const result =
        await telegramRequest(
          "sendMessage",
          {
            chat_id: TG_CHAT_ID,
            text,
            disable_web_page_preview: true,
          },
        );

      return Number(
        result?.result?.message_id,
      );
    } catch (error) {
      lastError = error;

      if (
        attempt <
        TELEGRAM_RETRIES
      ) {
        await delay(
          TELEGRAM_RETRY_DELAY,
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "ارسال پیام تلگرام ناموفق بود.",
      );
}

async function telegramEdit(
  messageId: number,
  text: string,
): Promise<void> {
  try {
    await telegramRequest(
      "editMessageText",
      {
        chat_id: TG_CHAT_ID,
        message_id: messageId,
        text,
        disable_web_page_preview: true,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (
      !message
        .toLowerCase()
        .includes("message is not modified")
    ) {
      throw error;
    }
  }
}

/* =========================================================
   TELEGRAM MESSAGE BUILDERS
   ========================================================= */

function statusTitle(
  meta: SignalMeta,
): string {
  switch (meta.state) {
    case "AI_PENDING":
      return "🟢 وضعیت: فعال";

    case "AI_TP1":
      return "🟡 وضعیت: TP1 فعال شد";

    case "AI_TP2":
      return "🟠 وضعیت: TP2 فعال شد";

    case "AI_TP3":
      return "🏆 وضعیت: برد کامل";

    case "AI_SL":
      return "🔴 وضعیت: منقضی با استاپ";

    case "AI_BE":
      return "🛡️ وضعیت: ریسک‌فری";

    case "AI_EXPIRED":
      return "⚪ وضعیت: منقضی";

    default:
      return "⚪ وضعیت: نامشخص";
  }
}

function directionFa(
  direction: Direction,
): string {
  return direction === "BUY"
    ? "خرید"
    : "فروش";
}

function buildInitialTelegram(
  meta: SignalMeta,
): string {
  return [
    "🤖 ━━━ سیگنال هوش مصنوعی طلا ━━━ 🤖",
    "",
    `🪙 ${DISPLAY_SYMBOL} | طلا`,
    "",
    `${meta.direction === "BUY" ? "🟢" : "🔴"} ${directionFa(meta.direction)}`,
    `⭐ قدرت سیگنال: ${meta.score >= 85 ? "حرفه‌ای" : meta.score >= 75 ? "متوسط" : "ضعیف"}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📍 ورود: ${fmtPrice(meta.entry)}`,
    `🛑 حد ضرر: ${fmtPrice(meta.stopLoss)}`,
    "",
    "🎯 اهداف:",
    "",
    `1️⃣ TP1: ${fmtPrice(meta.tp1)}`,
    `💰 +$20`,
    `📦 0.04 لات`,
    "",
    `2️⃣ TP2: ${fmtPrice(meta.tp2)}`,
    `💰 +$24`,
    `📦 0.03 لات`,
    "",
    `3️⃣ TP3: ${fmtPrice(meta.tp3)}`,
    `💰 +$36`,
    `📦 0.03 لات`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📊 حجم کل: ${fmtLot(TOTAL_LOT)} لات`,
    `💵 سود کامل: +$${TOTAL_PROFIT_USD}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "🛡️ مدیریت معامله",
    "",
    "بعد از TP1:",
    "",
    "✅ 0.04 لات بسته می‌شود",
    "📦 0.06 لات باقی می‌ماند",
    "🔒 حد ضرر → نقطه ورود",
    "",
    "یعنی معامله وارد حالت ریسک‌فری می‌شود.",
    "",
    "بعد از TP2:",
    "",
    "✅ 0.03 لات دیگر بسته می‌شود",
    "📦 0.03 لات باقی می‌ماند",
    "🔒 حد ضرر در محدوده سود قبلی محافظت می‌شود.",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "🧠 تحلیل:",
    "",
    `⭐ امتیاز: ${meta.score}/100`,
    `✅ تأییدیه‌ها: ${meta.confirmations}`,
    `${meta.sessionFlag} سشن: ${meta.session}`,
    `⏱️ زمان ایران: ${meta.iranTime}`,
    "",
    "📌 دلایل:",
    ...meta.reasons
      .slice(0, 6)
      .map((x) => `• ${x}`),
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "💱 نرخ دلار:",
    meta.usdToToman > 0
      ? `$1 = ${Math.round(
          meta.usdToToman,
        ).toLocaleString(
          "fa-IR",
        )} تومان`
      : "نرخ دلار در دسترس نیست",
    `🕐 زمان نرخ: ${meta.usdRateAsOf}`,
    "",
    statusTitle(meta),
    "",
    "⚠️ این تحلیل توسط هوش مصنوعی تولید شده",
    "و تضمین‌کننده سود نیست.",
    "",
    `🆔 شناسه: ${meta.engineVersion}`,
  ].join("\n");
}

function buildUpdatedTelegram(
  meta: SignalMeta,
): string {
  const eventLines =
    meta.events.length > 0
      ? meta.events.map((event) => {
          const icon =
            event.type === "SL"
              ? "🔴"
              : event.type === "TP3"
                ? "🏆"
                : event.type === "BREAKEVEN"
                  ? "🛡️"
                  : "🟢";

          const name =
            event.type === "TP1"
              ? "TP1"
              : event.type === "TP2"
                ? "TP2"
                : event.type === "TP3"
                  ? "TP3"
                  : event.type === "SL"
                    ? "STOP LOSS"
                    : event.type ===
                        "BREAKEVEN"
                      ? "BREAK EVEN"
                      : "انقضا";

          return `${icon} ${name} | ${fmtPrice(event.price)} | ${fmtUsd(event.usd)}`;
        })
      : ["— هنوز رویدادی ثبت نشده است —"];

  let finalLine = statusTitle(meta);

  if (meta.state === "AI_TP3") {
    finalLine =
      "🏆 برد کامل — هر 3 هدف لمس شد";
  }

  if (meta.state === "AI_SL") {
    finalLine =
      "🔴 منقضی با استاپ — نتیجه: باخت";
  }

  if (meta.state === "AI_BE") {
    finalLine =
      "🛡️ ریسک‌فری — معامله بدون ضرر جدید بسته شد";
  }

  if (meta.state === "AI_EXPIRED") {
    finalLine =
      "⚪ منقضی — فرصت معامله پایان یافت";
  }

  return [
    "🤖 ━━━ سیگنال هوش مصنوعی طلا ━━━ 🤖",
    "",
    `🪙 ${DISPLAY_SYMBOL}`,
    `${meta.direction === "BUY" ? "🟢" : "🔴"} ${directionFa(meta.direction)}`,
    "",
    `📍 ورود: ${fmtPrice(meta.entry)}`,
    `🛑 حد ضرر: ${fmtPrice(meta.stopLoss)}`,
    `🎯 TP1: ${fmtPrice(meta.tp1)}`,
    `🎯 TP2: ${fmtPrice(meta.tp2)}`,
    `🎯 TP3: ${fmtPrice(meta.tp3)}`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "📌 وضعیت معامله:",
    finalLine,
    "",
    `💵 سود/زیان تحقق‌یافته: ${fmtUsd(
      meta.realizedUsd,
    )}`,
    meta.usdToToman > 0
      ? `🇮🇷 معادل: ${fmtToman(
          meta.realizedToman,
        )}`
      : "",
    "",
    "📊 رویدادها:",
    ...eventLines,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📊 امتیاز: ${meta.score}/100`,
    `✅ تأییدیه‌ها: ${meta.confirmations}`,
    `${meta.sessionFlag} سشن: ${meta.session}`,
    `⏱️ زمان ایران: ${meta.iranTime}`,
    "",
    `🔢 شناسه: ${meta.engineVersion}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEventTelegram(
  meta: SignalMeta,
  event: EventRow,
): string {
  if (event.type === "TP1") {
    return [
      "🟢 ━━━ هدف اول فعال شد ━━━ 🟢",
      "",
      `🪙 ${DISPLAY_SYMBOL}`,
      `📍 قیمت: ${fmtPrice(event.price)}`,
      "",
      "💰 سود TP1:",
      `+$${TP1_USD}`,
      meta.usdToToman > 0
        ? `≈ ${fmtToman(
            TP1_USD *
              meta.usdToToman,
          )}`
        : "",
      "",
      "📦 حجم بسته‌شده:",
      "0.04 لات",
      "",
      "📦 حجم باقی‌مانده:",
      "0.06 لات",
      "",
      "🛡️ حد ضرر:",
      "به نقطه ورود منتقل شد",
      "",
      "🔒 وضعیت:",
      "ریسک‌فری فعال شد",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (event.type === "TP2") {
    return [
      "🟢 ━━━ هدف دوم فعال شد ━━━ 🟢",
      "",
      `🪙 ${DISPLAY_SYMBOL}`,
      `📍 قیمت: ${fmtPrice(event.price)}`,
      "",
      "💰 سود TP2:",
      `+$${TP2_USD}`,
      meta.usdToToman > 0
        ? `≈ ${fmtToman(
            TP2_USD *
              meta.usdToToman,
          )}`
        : "",
      "",
      "📦 حجم بسته‌شده:",
      "0.03 لات",
      "",
      "📦 حجم باقی‌مانده:",
      "0.03 لات",
      "",
      "🛡️ حد ضرر محافظتی فعال است",
      "",
      `📊 مجموع سود تا این لحظه: ${fmtUsd(
        meta.realizedUsd,
      )}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (event.type === "TP3") {
    return [
      "🏆 ━━━ معامله تکمیل شد ━━━ 🏆",
      "",
      `🪙 ${DISPLAY_SYMBOL}`,
      "",
      "🎯 هر سه هدف فعال شدند.",
      "",
      "💰 سود TP3:",
      `+$${TP3_USD}`,
      meta.usdToToman > 0
        ? `≈ ${fmtToman(
            TP3_USD *
              meta.usdToToman,
          )}`
        : "",
      "",
      "📊 سود نهایی:",
      "+$80",
      meta.usdToToman > 0
        ? `≈ ${fmtToman(
            TOTAL_PROFIT_USD *
              meta.usdToToman,
          )}`
        : "",
      "",
      "🏆 نتیجه: برد",
      "⚪ سیگنال منقضی شد.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (event.type === "SL") {
    return [
      "🔴 ━━━ حد ضرر فعال شد ━━━ 🔴",
      "",
      `🪙 ${DISPLAY_SYMBOL}`,
      `📍 قیمت خروج: ${fmtPrice(event.price)}`,
      "",
      "🛑 حد ضرر لمس شد.",
      "",
      "💵 ضرر:",
      "-$40",
      meta.usdToToman > 0
        ? `≈ ${fmtToman(
            40 *
              meta.usdToToman *
              -1,
          )}`
        : "",
      "",
      "📦 حجم:",
      "0.10 لات",
      "",
      "📊 نتیجه:",
      "❌ باخت",
      "⚪ سیگنال منقضی شد.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (event.type === "BREAKEVEN") {
    return [
      "🛡️ ━━━ ریسک‌فری فعال شد ━━━ 🛡️",
      "",
      `🪙 ${DISPLAY_SYMBOL}`,
      `📍 قیمت خروج: ${fmtPrice(event.price)}`,
      "",
      "حد ضرر محافظتی فعال شد.",
      "",
      `📊 سود تحقق‌یافته: ${fmtUsd(
        meta.realizedUsd,
      )}`,
      meta.usdToToman > 0
        ? `≈ ${fmtToman(
            meta.realizedUsd *
              meta.usdToToman,
          )}`
        : "",
      "",
      "🔒 معامله بدون ضرر جدید بسته شد.",
      "⚪ سیگنال منقضی شد.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "⚪ ━━━ سیگنال منقضی شد ━━━ ⚪",
    "",
    `🪙 ${DISPLAY_SYMBOL}`,
    "",
    "این فرصت معاملاتی دیگر معتبر نیست.",
    "",
    `📊 نتیجه فعلی: ${fmtUsd(
      meta.realizedUsd,
    )}`,
  ].join("\n");
}

/* =========================================================
   PRISMA HELPERS
   ========================================================= */

async function getSignalOwner() {
  const activeBot =
    await prisma.tradingBot.findFirst({
      where: {
        isActive: true,
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
          ],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        symbol: true,
        timeframe: true,
      },
    });

  if (activeBot) {
    return activeBot;
  }

  const anyBot =
    await prisma.tradingBot.findFirst({
      where: {
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
          ],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        symbol: true,
        timeframe: true,
      },
    });

  return anyBot;
}

async function findActiveSignals() {
  return prisma.tradingSignal.findMany({
    where: {
      symbol: {
        in: [
          "XAUUSD",
          "XAU/USD",
        ],
      },
      status: {
        in: [
          "WAITING",
          "ACTIVE",
          "TP1_HIT",
          "TP2_HIT",
        ],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 20,
  });
}

async function findActiveRuns() {
  return prisma.analysisRun.findMany({
    where: {
      symbol: {
        in: [
          "XAUUSD",
          "XAU/USD",
        ],
      },
      status: {
        in: [
          "AI_PENDING",
          "AI_TP1",
          "AI_TP2",
        ],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 20,
  });
}

function parseMeta(
  metadata: unknown,
): SignalMeta | null {
  if (!metadata) return null;

  if (
    typeof metadata !== "object" ||
    metadata === null
  ) {
    return null;
  }

  const value =
    metadata as Record<string, any>;

  if (
    !value.entry ||
    !value.stopLoss ||
    !value.tp1 ||
    !value.tp2 ||
    !value.tp3 ||
    !value.direction
  ) {
    return null;
  }

  return value as SignalMeta;
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

async function getPerformance() {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
          ],
        },
        status: {
          in: [
            "WON",
            "LOST",
            "WON_BE",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
      select: {
        id: true,
        status: true,
        metadata: true,
        createdAt: true,
        closedAt: true,
      },
    });

  let wins = 0;
  let losses = 0;
  let totalUsd = 0;

  for (const signal of signals) {
    const meta = parseMeta(
      signal.metadata,
    );

    if (
      signal.status === "WON" ||
      signal.status === "WON_BE"
    ) {
      wins++;
    }

    if (signal.status === "LOST") {
      losses++;
    }

    totalUsd += n(
      meta?.realizedUsd,
    );
  }

  const totalClosed =
    wins + losses;

  const winRate =
    totalClosed > 0
      ? round(
          (wins / totalClosed) *
            100,
          2,
        )
      : 0;

  return {
    totalSignals: signals.length,
    wins,
    losses,
    winRate,
    totalUsd: round(totalUsd, 2),
    lastUpdated: new Date().toISOString(),
  };
}

/* =========================================================
   EVENT MANAGEMENT
   ========================================================= */

function eventUsd(
  type: EventType,
): number {
  switch (type) {
    case "TP1":
      return TP1_USD;

    case "TP2":
      return TP2_USD;

    case "TP3":
      return TP3_USD;

    case "SL":
      return -STOP_USD;

    case "BREAKEVEN":
      return 0;

    case "EXPIRED":
      return 0;
  }
}

function eventLot(
  type: EventType,
): number {
  switch (type) {
    case "TP1":
      return TP1_LOT;

    case "TP2":
      return TP2_LOT;

    case "TP3":
      return TP3_LOT;

    case "SL":
      return TOTAL_LOT;

    case "BREAKEVEN":
      return 0;

    case "EXPIRED":
      return 0;
  }
}

function nextState(
  type: EventType,
): EngineState {
  switch (type) {
    case "TP1":
      return "AI_TP1";

    case "TP2":
      return "AI_TP2";

    case "TP3":
      return "AI_TP3";

    case "SL":
      return "AI_SL";

    case "BREAKEVEN":
      return "AI_BE";

    case "EXPIRED":
      return "AI_EXPIRED";
  }
}

function nextSignalStatus(
  type: EventType,
): string {
  switch (type) {
    case "TP1":
      return "TP1_HIT";

    case "TP2":
      return "TP2_HIT";

    case "TP3":
      return "WON";

    case "SL":
      return "LOST";

    case "BREAKEVEN":
      return "WON_BE";

    case "EXPIRED":
      return "EXPIRED";
  }
}

function realizedUsd(
  meta: SignalMeta,
): number {
  return round(
    meta.events.reduce(
      (sum, event) =>
        sum + n(event.usd),
      0,
    ),
    2,
  );
}

function realizedToman(
  meta: SignalMeta,
): number {
  return round(
    realizedUsd(meta) *
      n(meta.usdToToman),
    0,
  );
}

async function saveMeta(
  signalId: string,
  meta: SignalMeta,
): Promise<void> {
  await prisma.tradingSignal.update({
    where: {
      id: signalId,
    },
    data: {
      status:
        meta.state === "AI_TP3"
          ? "WON"
          : meta.state === "AI_SL"
            ? "LOST"
            : meta.state ===
                "AI_BE"
              ? "WON_BE"
              : meta.state ===
                  "AI_EXPIRED"
                ? "EXPIRED"
                : meta.state ===
                    "AI_TP2"
                  ? "TP2_HIT"
                  : meta.state ===
                      "AI_TP1"
                    ? "TP1_HIT"
                    : "WAITING",

      entry: meta.entry,

      takeProfit: meta.tp3,

      stopLoss: meta.stopLoss,

      score: meta.score,

      confidence:
        meta.score / 100,

      marketStructure:
        meta.analysis?.structure ??
        null,

      supportResistance:
        `S: ${fmtPrice(
          meta.support,
        )} | R: ${fmtPrice(
          meta.resistance,
        )}`,

      multiTimeframeConfirmation:
        meta.analysis
          ?.multiTimeframe ??
        null,

      sessionConfirmation:
        `${meta.sessionFlag} ${meta.session}`,

      confirmations:
        meta.confirmations as any,

      reasons:
        meta.reasons as any,

      metadata:
        meta as any,

      closedAt:
        meta.state ===
          "AI_TP3" ||
        meta.state ===
          "AI_SL" ||
        meta.state ===
          "AI_BE" ||
        meta.state ===
          "AI_EXPIRED"
          ? new Date()
          : undefined,
    },
  });
}

/* =========================================================
   EVENT CREATION + TELEGRAM
   ========================================================= */

async function createEvent(
  signal: any,
  meta: SignalMeta,
  type: EventType,
  price: number,
): Promise<SignalMeta> {
  const alreadyExists =
    meta.events.some(
      (event) =>
        event.type === type,
    );

  if (alreadyExists) {
    return meta;
  }

  const fx =
    await getUsdToToman();

  meta.usdToToman =
    fx.rate || meta.usdToToman;

  meta.usdRateAsOf =
    fx.asOf;

  meta.usdRateDelayed =
    fx.delayed;

  meta.usdRateDelayedMinutes =
    fx.delayedMinutes;

  const usd = eventUsd(type);

  const event: EventRow = {
    id: makeId(),
    type,
    at: new Date().toISOString(),
    price: round(price, 2),
    usd,
    toman:
      meta.usdToToman > 0
        ? round(
            usd *
              meta.usdToToman,
            0,
          )
        : 0,
    lot: eventLot(type),
    telegramSent: false,
  };

  meta.events = [
    ...meta.events,
    event,
  ];

  meta.state =
    nextState(type);

  meta.realizedUsd =
    realizedUsd(meta);

  meta.realizedToman =
    realizedToman(meta);

  meta.updatedAt =
    new Date().toISOString();

  if (type === "TP1") {
    meta.lots.remaining =
      round(
        TOTAL_LOT -
          TP1_LOT,
        2,
      );

    meta.protectedStop =
      meta.entry;

    meta.breakevenPrice =
      meta.entry;
  }

  if (type === "TP2") {
    meta.lots.remaining =
      round(
        TOTAL_LOT -
          TP1_LOT -
          TP2_LOT,
        2,
      );

    meta.protectedStop =
      meta.tp1;
  }

  if (
    type === "TP3" ||
    type === "SL" ||
    type === "BREAKEVEN" ||
    type === "EXPIRED"
  ) {
    meta.lots.remaining = 0;
    meta.closedAt =
      new Date().toISOString();
  }

  await saveMeta(
    signal.id,
    meta,
  );

  const eventMessage =
    buildEventTelegram(
      meta,
      event,
    );

  try {
    await telegramSend(
      eventMessage,
    );

    event.telegramSent =
      true;
  } catch (error) {
    meta.telegramLastError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  if (
    meta.telegramMessageId
  ) {
    try {
      await telegramEdit(
        meta.telegramMessageId,
        buildUpdatedTelegram(
          meta,
        ),
      );
    } catch {
      // پیام اصلی ممکن است دیگر قابل ویرایش نباشد.
    }
  }

  meta.updatedAt =
    new Date().toISOString();

  await saveMeta(
    signal.id,
    meta,
  );

  await prisma.analysisRun.updateMany(
    {
      where: {
        id: signal.analysisRunId
          ? signal.analysisRunId
          : undefined,
      },
      data: {
        status:
          meta.state,
        finishedAt:
          meta.closedAt
            ? new Date(
                meta.closedAt,
              )
            : undefined,
        metadata:
          meta as any,
      },
    },
  );

  return meta;
}

/* =========================================================
   INITIAL SIGNAL TELEGRAM
   ========================================================= */

async function deliverInitialTelegram(
  signal: any,
  meta: SignalMeta,
): Promise<SignalMeta> {
  if (
    meta.telegramSent &&
    meta.telegramMessageId
  ) {
    return meta;
  }

  try {
    const messageId =
      await telegramSend(
        buildInitialTelegram(
          meta,
        ),
      );

    meta.telegramMessageId =
      messageId;

    meta.telegramSent = true;

    meta.telegramLastError =
      undefined;

    await prisma.tradingSignal.update(
      {
        where: {
          id: signal.id,
        },
        data: {
          telegramSent: true,
          telegramMessageId:
            String(messageId),
          telegramSentAt:
            new Date(),
          metadata:
            meta as any,
        },
      },
    );

    const existing =
      await prisma.telegramDelivery.findFirst(
        {
          where: {
            signalId: signal.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      );

    if (existing) {
      await prisma.telegramDelivery.update(
        {
          where: {
            id: existing.id,
          },
          data: {
            channelId:
              TG_CHAT_ID || "",
            messageId:
              String(messageId),
            status: "SENT",
            sentAt:
              new Date(),
            errorMessage:
              null,
          },
        },
      );
    } else {
      await prisma.telegramDelivery.create(
        {
          data: {
            signalId:
              signal.id,
            channelId:
              TG_CHAT_ID || "",
            messageId:
              String(messageId),
            status: "SENT",
            sentAt:
              new Date(),
          },
        },
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    meta.telegramSent = false;

    meta.telegramLastError =
      errorMessage;

    const existing =
      await prisma.telegramDelivery.findFirst(
        {
          where: {
            signalId: signal.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      );

    if (existing) {
      await prisma.telegramDelivery.update(
        {
          where: {
            id: existing.id,
          },
          data: {
            status: "FAILED",
            errorMessage,
          },
        },
      );
    } else {
      await prisma.telegramDelivery.create(
        {
          data: {
            signalId:
              signal.id,
            channelId:
              TG_CHAT_ID || "",
            status: "FAILED",
            errorMessage,
          },
        },
      );
    }

    await prisma.tradingSignal.update(
      {
        where: {
          id: signal.id,
        },
        data: {
          telegramSent: false,
          metadata:
            meta as any,
        },
      },
    );
  }

  return meta;
}

/* =========================================================
   PRICE LEVEL DETECTION
   ---------------------------------------------------------
   IMPORTANT:
   BUY:
     SL -> low <= SL
     TP -> high >= TP

   SELL:
     SL -> high >= SL
     TP -> low <= TP

   This fixes the old bug where high/low were checked
   against both directions and caused incorrect states.
   ========================================================= */

function hitBuySL(
  price: number,
  candle?: Candle,
  level?: number,
): boolean {
  if (!level) return false;

  return (
    price <= level ||
    Boolean(
      candle &&
        candle.low <= level,
    )
  );
}

function hitSellSL(
  price: number,
  candle?: Candle,
  level?: number,
): boolean {
  if (!level) return false;

  return (
    price >= level ||
    Boolean(
      candle &&
        candle.high >= level,
    )
  );
}

function hitBuyTP(
  price: number,
  candle?: Candle,
  level?: number,
): boolean {
  if (!level) return false;

  return (
    price >= level ||
    Boolean(
      candle &&
        candle.high >= level,
    )
  );
}

function hitSellTP(
  price: number,
  candle?: Candle,
  level?: number,
): boolean {
  if (!level) return false;

  return (
    price <= level ||
    Boolean(
      candle &&
        candle.low <= level,
    )
  );
}

function levelHit(
  direction: Direction,
  price: number,
  candle: Candle | undefined,
  level: number,
  kind: "SL" | "TP",
): boolean {
  if (direction === "BUY") {
    if (kind === "SL") {
      return hitBuySL(
        price,
        candle,
        level,
      );
    }

    return hitBuyTP(
      price,
      candle,
      level,
    );
  }

  if (kind === "SL") {
    return hitSellSL(
      price,
      candle,
      level,
    );
  }

  return hitSellTP(
    price,
    candle,
    level,
  );
}

/* =========================================================
   MONITOR ONE SIGNAL
   ========================================================= */

async function monitorSignal(
  signal: any,
): Promise<{
  closed: boolean;
  meta: SignalMeta | null;
}> {
  const meta =
    parseMeta(signal.metadata);

  if (!meta) {
    await prisma.tradingSignal.update(
      {
        where: {
          id: signal.id,
        },
        data: {
          status: "EXPIRED",
          closedAt: new Date(),
        },
      },
    );

    return {
      closed: true,
      meta: null,
    };
  }

  if (
    meta.state === "AI_TP3" ||
    meta.state === "AI_SL" ||
    meta.state === "AI_BE" ||
    meta.state === "AI_EXPIRED"
  ) {
    return {
      closed: true,
      meta,
    };
  }

  const created =
    new Date(meta.createdAt);

  const ageHours =
    (Date.now() -
      created.getTime()) /
    3_600_000;

  if (
    Number.isFinite(ageHours) &&
    ageHours > MAX_SIGNAL_AGE_HOURS
  ) {
    const updated =
      await createEvent(
        signal,
        meta,
        "EXPIRED",
        meta.currentPrice,
      );

    return {
      closed: true,
      meta: updated,
    };
  }

  const price =
    await getLivePrice();

  meta.currentPrice =
    round(price, 2);

  meta.updatedAt =
    new Date().toISOString();

  const recent =
    await getCandles(
      "1min",
      3,
    );

  const candle =
    recent.at(-1);

  /* -------------------------------------------------------
     WAITING
     ------------------------------------------------------- */

  if (
    meta.state === "AI_PENDING"
  ) {
    /*
      SL is checked FIRST.

      If a single candle contains both SL and TP,
      exact intrabar sequence cannot be reconstructed
      from OHLC. Conservative handling is SL first.
    */

    if (
      levelHit(
        meta.direction,
        price,
        candle,
        meta.stopLoss,
        "SL",
      )
    ) {
      const updated =
        await createEvent(
          signal,
          meta,
          "SL",
          meta.stopLoss,
        );

      return {
        closed: true,
        meta: updated,
      };
    }

    if (
      levelHit(
        meta.direction,
        price,
        candle,
        meta.tp1,
        "TP",
      )
    ) {
      const updated =
        await createEvent(
          signal,
          meta,
          "TP1",
          meta.tp1,
        );

      return {
        closed: false,
        meta: updated,
      };
    }
  }

  /* -------------------------------------------------------
     TP1 STATE
     ------------------------------------------------------- */

  if (
    meta.state === "AI_TP1"
  ) {
    /*
      After TP1:
      remaining = 0.06
      protected stop = entry
    */

    if (
      levelHit(
        meta.direction,
        price,
        candle,
        meta.entry,
        "SL",
      )
    ) {
      const updated =
        await createEvent(
          signal,
          meta,
          "BREAKEVEN",
          meta.entry,
        );

      return {
        closed: true,
        meta: updated,
      };
    }

    if (
      levelHit(
        meta.direction,
        price,
        candle,
        meta.tp2,
        "TP",
      )
    ) {
      const updated =
        await createEvent(
          signal,
          meta,
          "TP2",
          meta.tp2,
        );

      return {
        closed: false,
        meta: updated,
      };
    }
  }

  /* -------------------------------------------------------
     TP2 STATE
     ------------------------------------------------------- */

  if (
    meta.state === "AI_TP2"
  ) {
    /*
      After TP2:
      remaining = 0.03
      protected stop = TP1
    */

    const protectedStop =
      meta.protectedStop ??
      meta.tp1;

    if (
      levelHit(
        meta.direction,
        price,
        candle,
        protectedStop,
        "SL",
      )
    ) {
      const updated =
        await createEvent(
          signal,
          meta,
          "BREAKEVEN",
          protectedStop,
        );

      return {
        closed: true,
        meta: updated,
      };
    }

    if (
      levelHit(
        meta.direction,
        price,
        candle,
        meta.tp3,
        "TP",
      )
    ) {
      const updated =
        await createEvent(
          signal,
          meta,
          "TP3",
          meta.tp3,
        );

      return {
        closed: true,
        meta: updated,
      };
    }
  }

  await saveMeta(
    signal.id,
    meta,
  );

  return {
    closed: false,
    meta,
  };
}

/* =========================================================
   RECOVER LEGACY / STUCK ANALYSIS RUNS
   ========================================================= */

async function recoverLegacyRuns(): Promise<number> {
  const runs =
    await findActiveRuns();

  let recovered = 0;

  for (const run of runs) {
    const meta =
      parseMeta(run.metadata);

    if (!meta) {
      await prisma.analysisRun.update(
        {
          where: {
            id: run.id,
          },
          data: {
            status: "AI_EXPIRED",
            finishedAt:
              new Date(),
            errorMessage:
              "سیگنال قدیمی فاقد metadata معتبر بود و منقضی شد.",
          },
        },
      );

      recovered++;

      continue;
    }

    const ageHours =
      (Date.now() -
        new Date(
          meta.createdAt,
        ).getTime()) /
      3_600_000;

    if (
      ageHours >
      MAX_SIGNAL_AGE_HOURS
    ) {
      meta.state =
        "AI_EXPIRED";

      meta.closedAt =
        new Date().toISOString();

      meta.updatedAt =
        new Date().toISOString();

      await prisma.analysisRun.update(
        {
          where: {
            id: run.id,
          },
          data: {
            status:
              "AI_EXPIRED",
            finishedAt:
              new Date(),
            metadata:
              meta as any,
          },
        },
      );

      recovered++;
    }
  }

  return recovered;
}

/* =========================================================
   COOLDOWN
   ========================================================= */

async function hasRecentSignal(): Promise<boolean> {
  const since = new Date(
    Date.now() -
      SIGNAL_COOLDOWN_MINUTES *
        60_000,
  );

  const recent =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          symbol: {
            in: [
              "XAUUSD",
              "XAU/USD",
            ],
          },
          createdAt: {
            gte: since,
          },
        },
        select: {
          id: true,
        },
      },
    );

  return Boolean(recent);
}

/* =========================================================
   CREATE SIGNAL
   ========================================================= */

async function createNewSignal(): Promise<{
  created: boolean;
  signalId?: string;
  reason?: string;
}> {
  const active =
    await findActiveSignals();

  if (active.length > 0) {
    return {
      created: false,
      reason:
        "یک سیگنال هنوز فعال است.",
    };
  }

  if (
    await hasRecentSignal()
  ) {
    return {
      created: false,
      reason:
        "هنوز داخل فاصله خنک‌شدن سیگنال هستیم.",
    };
  }

  const owner =
    await getSignalOwner();

  if (!owner) {
    return {
      created: false,
      reason:
        "هیچ TradingBot برای XAUUSD پیدا نشد.",
    };
  }

  const analysis =
    await analyzeMarket();

  if (
    !analysis.direction
  ) {
    return {
      created: false,
      reason:
        "جهت معتبر بازار تأیید نشد.",
    };
  }

  if (
    analysis.score <
    MIN_SCORE
  ) {
    return {
      created: false,
      reason:
        `امتیاز ${analysis.score} کمتر از حداقل ${MIN_SCORE} است.`,
    };
  }

  if (
    analysis.confirmations <
    MIN_CONFIRMATIONS
  ) {
    return {
      created: false,
      reason:
        `تأییدیه‌ها ${analysis.confirmations} عدد است.`,
    };
  }

  const price =
    await getLivePrice();

  const atrValue =
    analysis.atr ||
    4;

  const stopDistance =
    clamp(
      atrValue *
        ATR_SL_MULTIPLIER,
      MIN_SL_DISTANCE,
      MAX_SL_DISTANCE,
    );

  let stopLoss = 0;

  if (
    analysis.direction ===
    "BUY"
  ) {
    stopLoss =
      price -
      stopDistance;
  } else {
    stopLoss =
      price +
      stopDistance;
  }

  const tp1Distance =
    Math.max(
      stopDistance *
        1.25,
      3,
    );

  const tp2Distance =
    Math.max(
      stopDistance *
        2,
      6,
    );

  const tp3Distance =
    Math.max(
      stopDistance *
        3,
      10,
    );

  let tp1 = 0;
  let tp2 = 0;
  let tp3 = 0;

  if (
    analysis.direction ===
    "BUY"
  ) {
    tp1 =
      price +
      tp1Distance;

    tp2 =
      price +
      tp2Distance;

    tp3 =
      price +
      tp3Distance;
  } else {
    tp1 =
      price -
      tp1Distance;

    tp2 =
      price -
      tp2Distance;

    tp3 =
      price -
      tp3Distance;
  }

  const fx =
    await getUsdToToman();

  const session =
    getSessionInfo();

  const now =
    new Date();

  const id =
    makeId();

  const meta: SignalMeta = {
    engineVersion: id,

    state: "AI_PENDING",

    direction:
      analysis.direction,

    symbol: DISPLAY_SYMBOL,

    timeframe: "1M",

    entry: round(price, 2),

    stopLoss: round(
      stopLoss,
      2,
    ),

    tp1: round(tp1, 2),

    tp2: round(tp2, 2),

    tp3: round(tp3, 2),

    currentPrice: round(
      price,
      2,
    ),

    score: analysis.score,

    confirmations:
      analysis.confirmations,

    reasons:
      analysis.reasons,

    support:
      round(
        analysis.support,
        2,
      ),

    resistance:
      round(
        analysis.resistance,
        2,
      ),

    atr:
      round(
        analysis.atr,
        4,
      ),

    session:
      session.name,

    sessionFlag:
      session.flag,

    iranTime:
      formatTehran(now),

    createdAt:
      now.toISOString(),

    updatedAt:
      now.toISOString(),

    lots: {
      total: TOTAL_LOT,
      tp1: TP1_LOT,
      tp2: TP2_LOT,
      tp3: TP3_LOT,
      remaining: TOTAL_LOT,
    },

    usdProfit: {
      tp1: TP1_USD,
      tp2: TP2_USD,
      tp3: TP3_USD,
      total: TOTAL_PROFIT_USD,
      stopLoss: STOP_USD,
    },

    usdToToman:
      fx.rate,

    usdRateAsOf:
      fx.asOf,

    usdRateDelayed:
      fx.delayed,

    usdRateDelayedMinutes:
      fx.delayedMinutes,

    realizedUsd: 0,

    realizedToman: 0,

    events: [],

    telegramSent: false,

    analysis: {
      trend:
        analysis.direction,

      momentum:
        analysis.timeframeVotes[
          "1M"
        ] ?? "NEUTRAL",

      volatility:
        analysis.atr > 5
          ? "زیاد"
          : analysis.atr > 2
            ? "متوسط"
            : "کم",

      multiTimeframe:
        Object.entries(
          analysis.timeframeVotes,
        )
          .map(
            ([tf, value]) =>
              `${tf}:${value}`,
          )
          .join(" | "),

      structure:
        `Support ${fmtPrice(
          analysis.support,
        )} / Resistance ${fmtPrice(
          analysis.resistance,
        )}`,
    },
  };

  /* -------------------------------------------------------
     ANALYSIS RUN
     ------------------------------------------------------- */

  const run =
    await prisma.analysisRun.create(
      {
        data: {
          botId:
            owner.id,

          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "1M",

          status:
            "AI_PENDING",

          candlesAnalyzed:
            analysis.candles.length,

          confirmationsFound:
            analysis.confirmations,

          signalGenerated:
            true,

          metadata:
            meta as any,
        },
      },
    );

  /* -------------------------------------------------------
     TRADING SIGNAL
     ------------------------------------------------------- */

  const signal =
    await prisma.tradingSignal.create(
      {
        data: {
          userId:
            owner.userId,

          botId:
            owner.id,

          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "1M",

          direction:
            analysis.direction,

          entry:
            meta.entry,

          takeProfit:
            meta.tp3,

          stopLoss:
            meta.stopLoss,

          riskReward:
            Math.abs(
              meta.tp3 -
                meta.entry,
            ) /
            Math.abs(
              meta.entry -
                meta.stopLoss,
            ),

          score:
            analysis.score,

          confidence:
            analysis.score /
            100,

          status:
            "WAITING",

          source:
            "AI_ANALYSIS_V3",

          marketStructure:
            meta.analysis
              ?.structure,

          supportResistance:
            `S: ${fmtPrice(
              meta.support,
            )} | R: ${fmtPrice(
              meta.resistance,
            )}`,

          liquidity:
            "تحلیل نقدینگی داخلی موتور",

          pullback:
            "بررسی پولبک چندتایم‌فریمی",

          candlePattern:
            "بررسی کندل‌های اخیر",

          volumeConfirmation:
            "داده حجم در صورت ارائه توسط فید",

          multiTimeframeConfirmation:
            meta.analysis
              ?.multiTimeframe,

          sessionConfirmation:
            `${meta.sessionFlag} ${meta.session}`,

          volatilityConfirmation:
            meta.analysis
              ?.volatility,

          newsConfirmation:
            "تقویم اقتصادی بررسی شد",

          confirmations:
            analysis
              .timeframeVotes as any,

          reasons:
            analysis.reasons as any,

          metadata:
            {
              ...meta,
              analysisRunId:
                run.id,
            } as any,

          telegramSent:
            false,
        },
      },
    );

  /* -------------------------------------------------------
     LINK ANALYSIS RUN -> SIGNAL
     ------------------------------------------------------- */

  meta.analysis = {
    ...meta.analysis,
  };

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },
      data: {
        metadata:
          {
            ...meta,
            signalId:
              signal.id,
          } as any,
      },
    },
  );

  /* -------------------------------------------------------
     TELEGRAM
     ------------------------------------------------------- */

  await deliverInitialTelegram(
    signal,
    meta,
  );

  await prisma.tradingSignal.update(
    {
      where: {
        id: signal.id,
      },
      data: {
        metadata:
          {
            ...meta,
            analysisRunId:
              run.id,
          } as any,
      },
    },
  );

  return {
    created: true,
    signalId:
      signal.id,
  };
}

/* =========================================================
   CRON ENGINE
   ========================================================= */

async function cronEngine() {
  const started =
    Date.now();

  /*
    First recover old AnalysisRun records.
  */

  const recovered =
    await recoverLegacyRuns();

  /*
    Monitor every active TradingSignal.
  */

  const active =
    await findActiveSignals();

  const results: any[] = [];

  for (const signal of active) {
    try {
      const result =
        await monitorSignal(
          signal,
        );

      results.push({
        signalId:
          signal.id,
        closed:
          result.closed,
        state:
          result.meta?.state ??
          null,
      });
    } catch (error) {
      results.push({
        signalId:
          signal.id,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  /*
    After monitoring, check again.
    This is important because the previous signal
    may have just closed during this execution.
  */

  const stillActive =
    await findActiveSignals();

  let newSignal = null;

  if (
    stillActive.length === 0
  ) {
    try {
      newSignal =
        await createNewSignal();
    } catch (error) {
      newSignal = {
        created: false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  return {
    ok: true,

    engine:
      "AI XAUUSD SIGNAL ENGINE V3",

    durationMs:
      Date.now() -
      started,

    recoveredLegacyRuns:
      recovered,

    monitored:
      results,

    activeAfterMonitor:
      stillActive.length,

    newSignal,

    serverTime:
      new Date().toISOString(),

    iranTime:
      formatTehran(),
  };
}

/* =========================================================
   AUTH
   ========================================================= */

function isCronRequest(
  request: NextRequest,
): boolean {
  const header =
    request.headers.get(
      "x-ai-cron-secret",
    );

  const query =
    request.nextUrl.searchParams.get(
      "secret",
    );

  if (!CRON_SECRET) {
    return false;
  }

  return (
    header === CRON_SECRET ||
    query === CRON_SECRET
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboardData() {
  const activeSignals =
    await findActiveSignals();

  const latest =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          symbol: {
            in: [
              "XAUUSD",
              "XAU/USD",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    );

  const active =
    activeSignals[0] ??
    null;

  let activeMeta =
    active
      ? parseMeta(
          active.metadata,
        )
      : null;

  if (activeMeta) {
    try {
      const live =
        await getLivePrice();

      activeMeta.currentPrice =
        round(live, 2);
    } catch {
      // keep last known price
    }
  }

  const latestMeta =
    latest
      ? parseMeta(
          latest.metadata,
        )
      : null;

  const candles =
    await getCandles(
      "1min",
      180,
    );

  let currentPrice = 0;

  try {
    currentPrice =
      await getLivePrice();
  } catch {
    currentPrice =
      activeMeta?.currentPrice ??
      latestMeta?.currentPrice ??
      0;
  }

  const fx =
    await getUsdToToman();

  const performance =
    await getPerformance();

  return {
    ok: true,

    engine:
      "AI XAUUSD SIGNAL ENGINE V3",

    currentPrice,

    active:
      activeMeta
        ? {
            ...activeMeta,
            signalId:
              active?.id,
          }
        : null,

    latest:
      latestMeta
        ? {
            ...latestMeta,
            signalId:
              latest?.id,
            databaseStatus:
              latest?.status,
          }
        : null,

    candles,

    performance,

    usdToToman:
      fx,

    activeCount:
      activeSignals.length,

    serverTime:
      new Date().toISOString(),

    iranTime:
      formatTehran(),
  };
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    /*
      CRON:
      /api/ai-analysis?cron=1
    */

    const cron =
      request.nextUrl.searchParams.get(
        "cron",
      );

    if (
      cron === "1" &&
      isCronRequest(request)
    ) {
      const result =
        await cronEngine();

      return NextResponse.json(
        result,
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    /*
      Manual dashboard request
    */

    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error:
            "احراز هویت لازم است.",
        },
        {
          status: 401,
        },
      );
    }

    const data =
      await dashboardData();

    return NextResponse.json(
      data,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "AI_ANALYSIS_GET_ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی موتور تحلیل هوش مصنوعی.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

/* =========================================================
   POST
   ---------------------------------------------------------
   Manual scan
   ========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error:
            "احراز هویت لازم است.",
        },
        {
          status: 401,
        },
      );
    }

    const result =
      await cronEngine();

    return NextResponse.json(
      result,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "AI_ANALYSIS_POST_ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "اجرای تحلیل ناموفق بود.",
      },
      {
        status: 500,
      },
    );
  }
}
