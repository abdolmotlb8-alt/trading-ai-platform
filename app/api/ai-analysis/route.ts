import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TRADING AI PLATFORM
   XAUUSD AI ENGINE V3

   - Real Twelve Data market data
   - Multi-timeframe analysis
   - Real signal lifecycle
   - TP1 / TP2 / TP3
   - Break-even
   - Stop loss
   - Telegram events
   - TradingSignal record
   - Trade record
   - AnalysisRun monitoring
   - Performance / win / loss
   - USD/Toman snapshot
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

/* ---------------------------
   TRADE CONFIGURATION
   --------------------------- */

const TOTAL_LOT = 0.1;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_PROFIT_USD = 80;

/*
  With XAUUSD contract size 100:

  0.10 lot × $4 movement = -$40
  0.04 lot × $5 movement = +$20
  0.03 lot × $8 movement = +$24
  0.03 lot × $12 movement = +$36
*/

const STOP_DISTANCE = 4;
const TP1_DISTANCE = 5;
const TP2_DISTANCE = 8;
const TP3_DISTANCE = 12;

/* ---------------------------
   SIGNAL ENGINE
   --------------------------- */

const MIN_SCORE = 68;
const MIN_CONFIRMATIONS = 3;

const SIGNAL_COOLDOWN_MINUTES = 15;
const MAX_SIGNAL_AGE_HOURS = 36;

const PRICE_CACHE_MS = 8_000;
const CANDLE_CACHE_MS = 20_000;
const FX_CACHE_MS = 300_000;

const NEWS_BLOCK_MINUTES = 30;

const TELEGRAM_RETRIES = 3;
const TELEGRAM_RETRY_DELAY = 900;

const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_SIGNAL_CHAT_ID;

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
  | "SYDNEY"
  | "TOKYO"
  | "LONDON"
  | "NEW_YORK";

type TradeState =
  | "ACTIVE"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "BREAKEVEN"
  | "STOPPED"
  | "EXPIRED";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type AnalysisDetails = {
  trend: string;
  momentum: string;
  volatility: string;
  multiTimeframe: string;
  structure: string;
};

type MarketAnalysis = {
  direction: Direction | null;
  score: number;
  confirmations: number;
  reasons: string[];
  analysis: AnalysisDetails;
  support: number;
  resistance: number;
  atr: number;
  currentPrice: number;
  session: SessionName;
  timeframe: string;
  candles: Candle[];
};

type FXRate = {
  rate: number | null;
  asOf: string | null;
  delayed: boolean;
  delayedMinutes: number | null;
};

type TradeMeta = {
  version: string;

  signalId: string;
  tradeId: string;
  analysisRunId: string;

  symbol: string;
  direction: Direction;

  state: TradeState;

  entry: number;
  stopLoss: number;

  tp1: number;
  tp2: number;
  tp3: number;

  originalStopLoss: number;
  protectedStop: number | null;

  totalLot: number;
  remainingLot: number;

  tp1Lot: number;
  tp2Lot: number;
  tp3Lot: number;

  tp1Usd: number;
  tp2Usd: number;
  tp3Usd: number;

  stopUsd: number;
  totalPotentialUsd: number;

  score: number;
  confirmations: number;
  reasons: string[];

  analysis: AnalysisDetails;

  support: number;
  resistance: number;
  atr: number;

  session: SessionName;

  currentPrice: number;

  usdToToman: number | null;
  usdRateAsOf: string | null;

  createdAt: string;
  updatedAt: string;

  tp1HitAt: string | null;
  tp2HitAt: string | null;
  tp3HitAt: string | null;
  breakEvenAt: string | null;
  stopLossHitAt: string | null;
  closedAt: string | null;

  realizedProfitUsd: number;

  events: EventRecord[];

  telegramSent: boolean;
  telegramMessageId: string | null;
  telegramLastError: string | null;
};

type EventType =
  | "SIGNAL"
  | "TP1"
  | "TP2"
  | "TP3"
  | "BREAKEVEN"
  | "SL"
  | "EXPIRED";

type EventRecord = {
  id: string;
  type: EventType;
  at: string;

  price: number;

  profitUsd: number;
  profitToman: number | null;

  lotClosed: number;

  remainingLot: number;

  messageId: string | null;

  telegramDelivered: boolean;
};

/* =========================================================
   CACHE
   ========================================================= */

const priceCache: {
  value: number | null;
  at: number;
} = {
  value: null,
  at: 0,
};

const candleCache = new Map<
  string,
  {
    value: Candle[];
    at: number;
  }
>();

const fxCache: {
  value: FXRate | null;
  at: number;
} = {
  value: null,
  at: 0,
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function num(value: unknown, fallback = 0): number {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return n;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}

function formatPrice(value: number): string {
  return roundPrice(value).toFixed(2);
}

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}$${Math.abs(round2(value)).toFixed(2)}`;
}

function formatLot(value: number): string {
  return value.toFixed(2);
}

function formatToman(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "نامشخص";
  }

  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/* =========================================================
   TIME
   ========================================================= */

function localHour(
  timezone: string,
  date = new Date()
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour");

  return hour ? Number(hour.value) : 0;
}

function getSession(
  date = new Date()
): {
  name: SessionName;
  title: string;
  flag: string;
} {
  const newYork = localHour("America/New_York", date);
  const london = localHour("Europe/London", date);
  const tokyo = localHour("Asia/Tokyo", date);
  const sydney = localHour("Australia/Sydney", date);

  if (newYork >= 8 && newYork < 17) {
    return {
      name: "NEW_YORK",
      title: "نیویورک",
      flag: "🇺🇸",
    };
  }

  if (london >= 8 && london < 17) {
    return {
      name: "LONDON",
      title: "لندن",
      flag: "🇬🇧",
    };
  }

  if (tokyo >= 9 && tokyo < 18) {
    return {
      name: "TOKYO",
      title: "توکیو",
      flag: "🇯🇵",
    };
  }

  return {
    name: "SYDNEY",
    title: "سیدنی",
    flag: "🇦🇺",
  };
}

function iranDateTime(date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function iranTimeOnly(date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY is not configured."
    );
  }

  const url = new URL(
    `https://api.twelvedata.com/${endpoint}`
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("apikey", TD_KEY);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Twelve Data returned invalid JSON (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Twelve Data HTTP ${response.status}`
    );
  }

  if (
    data?.status === "error" ||
    data?.code ||
    data?.message?.toLowerCase?.().includes("error")
  ) {
    throw new Error(
      data?.message ||
        `Twelve Data error ${data?.code || ""}`
    );
  }

  return data;
}

async function getLivePrice(): Promise<number> {
  const now = Date.now();

  if (
    priceCache.value !== null &&
    now - priceCache.at < PRICE_CACHE_MS
  ) {
    return priceCache.value;
  }

  const data = await twelveData("price", {
    symbol: SYMBOL,
  });

  const price = num(data?.price);

  if (price <= 0) {
    throw new Error("Invalid XAUUSD price.");
  }

  priceCache.value = price;
  priceCache.at = now;

  return price;
}

async function getCandles(
  interval: string,
  outputsize = 180
): Promise<Candle[]> {
  const cached = candleCache.get(interval);
  const now = Date.now();

  if (
    cached &&
    now - cached.at < CANDLE_CACHE_MS
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

  if (!Array.isArray(data?.values)) {
    throw new Error(
      `No ${interval} candle data received.`
    );
  }

  const candles: Candle[] = data.values
    .map((row: any) => ({
      datetime: String(row.datetime),
      open: num(row.open),
      high: num(row.high),
      low: num(row.low),
      close: num(row.close),
      volume:
        row.volume !== undefined
          ? num(row.volume)
          : undefined,
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0
    );

  if (candles.length < 50) {
    throw new Error(
      `Not enough ${interval} candles.`
    );
  }

  candleCache.set(interval, {
    value: candles,
    at: now,
  });

  return candles;
}

/* =========================================================
   INDICATORS
   ========================================================= */

function sma(
  values: number[],
  period: number
): number {
  if (values.length < period) {
    return values[values.length - 1] || 0;
  }

  const slice = values.slice(-period);

  return (
    slice.reduce((sum, value) => sum + value, 0) /
    slice.length
  );
}

function ema(
  values: number[],
  period: number
): number {
  if (!values.length) {
    return 0;
  }

  if (values.length < period) {
    return sma(values, values.length);
  }

  const multiplier = 2 / (period + 1);

  let result = sma(
    values.slice(0, period),
    period
  );

  for (let i = period; i < values.length; i++) {
    result =
      (values[i] - result) * multiplier + result;
  }

  return result;
}

function rsi(
  values: number[],
  period = 14
): number {
  if (values.length < period + 1) {
    return 50;
  }

  const changes: number[] = [];

  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }

  const recent = changes.slice(-period);

  let gains = 0;
  let losses = 0;

  for (const change of recent) {
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;

  return 100 - 100 / (1 + rs);
}

function atr(
  candles: Candle[],
  period = 14
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
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trs.push(tr);
  }

  return sma(trs, period);
}

function macd(
  values: number[]
): {
  line: number;
  signal: number;
  histogram: number;
} {
  if (values.length < 35) {
    return {
      line: 0,
      signal: 0,
      histogram: 0,
    };
  }

  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const line = fast - slow;

  const approximateSignal =
    ema(
      values
        .slice(-35)
        .map((_, index, arr) => {
          const end = values.length - arr.length + index + 1;
          return (
            ema(values.slice(0, end), 12) -
            ema(values.slice(0, end), 26)
          );
        }),
      9
    );

  return {
    line,
    signal: approximateSignal,
    histogram: line - approximateSignal,
  };
}

function averageRange(
  candles: Candle[],
  period = 20
): number {
  if (!candles.length) {
    return 0;
  }

  const slice = candles.slice(-period);

  return (
    slice.reduce(
      (sum, candle) =>
        sum + (candle.high - candle.low),
      0
    ) / slice.length
  );
}

function candleDirection(
  candle: Candle
): Direction | null {
  if (candle.close > candle.open) {
    return "BUY";
  }

  if (candle.close < candle.open) {
    return "SELL";
  }

  return null;
}

/* =========================================================
   MARKET STRUCTURE
   ========================================================= */

function getSupportResistance(
  candles: Candle[]
): {
  support: number;
  resistance: number;
} {
  const recent = candles.slice(-80);

  const lows = recent.map((c) => c.low);
  const highs = recent.map((c) => c.high);

  const current =
    recent[recent.length - 1]?.close || 0;

  const lower = lows.filter((x) => x < current);
  const upper = highs.filter((x) => x > current);

  const support =
    lower.length > 0
      ? Math.max(...lower)
      : Math.min(...lows);

  const resistance =
    upper.length > 0
      ? Math.min(...upper)
      : Math.max(...highs);

  return {
    support: roundPrice(support),
    resistance: roundPrice(resistance),
  };
}

/* =========================================================
   TIMEFRAME ANALYSIS
   ========================================================= */

function timeframeDirection(
  candles: Candle[]
): {
  direction: Direction | null;
  trendText: string;
  momentumText: string;
} {
  const closes = candles.map((c) => c.close);

  const last = closes[closes.length - 1];

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  const rsiValue = rsi(closes, 14);

  const macdValue = macd(closes);

  let buy = 0;
  let sell = 0;

  if (last > ema20) buy += 1;
  if (last < ema20) sell += 1;

  if (ema20 > ema50) buy += 1;
  if (ema20 < ema50) sell += 1;

  if (rsiValue >= 52 && rsiValue <= 72) {
    buy += 1;
  }

  if (rsiValue <= 48 && rsiValue >= 28) {
    sell += 1;
  }

  if (macdValue.histogram > 0) {
    buy += 1;
  }

  if (macdValue.histogram < 0) {
    sell += 1;
  }

  let direction: Direction | null = null;

  if (buy > sell) {
    direction = "BUY";
  }

  if (sell > buy) {
    direction = "SELL";
  }

  const trendText =
    direction === "BUY"
      ? "روند صعودی"
      : direction === "SELL"
        ? "روند نزولی"
        : "روند خنثی";

  const momentumText =
    rsiValue > 55
      ? "مومنتوم خرید"
      : rsiValue < 45
        ? "مومنتوم فروش"
        : "مومنتوم متعادل";

  return {
    direction,
    trendText,
    momentumText,
  };
}

/* =========================================================
   NEWS FILTER
   ========================================================= */

async function getNewsRisk(): Promise<{
  blocked: boolean;
  events: string[];
}> {
  try {
    const now = new Date();

    const until = new Date(
      now.getTime() +
        NEWS_BLOCK_MINUTES * 60_000
    );

    const events =
      await prisma.economicEvent.findMany({
        where: {
          eventTime: {
            gte: now,
            lte: until,
          },
          importance: {
            gte: 3,
          },
        },
        orderBy: {
          eventTime: "asc",
        },
        take: 10,
      });

    if (!events.length) {
      return {
        blocked: false,
        events: [],
      };
    }

    return {
      blocked: true,
      events: events.map(
        (event) =>
          `${event.currency || ""} ${event.event}`
      ),
    };
  } catch {
    return {
      blocked: false,
      events: [],
    };
  }
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToToman(): Promise<FXRate> {
  const now = Date.now();

  if (
    fxCache.value &&
    now - fxCache.at < FX_CACHE_MS
  ) {
    return fxCache.value;
  }

  if (!NETARZ_KEY) {
    const empty: FXRate = {
      rate: null,
      asOf: null,
      delayed: true,
      delayedMinutes: null,
    };

    fxCache.value = empty;
    fxCache.at = now;

    return empty;
  }

  try {
    const response = await fetch(
      `https://netarz.ir/api/fx/v1/rates?codes=USD`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${NETARZ_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `NetArz HTTP ${response.status}`
      );
    }

    const data: any = await response.json();

    let rate = 0;

    if (Array.isArray(data?.data)) {
      const row =
        data.data.find(
          (item: any) =>
            String(
              item.code ||
                item.symbol ||
                item.currency ||
                ""
            ).toUpperCase() === "USD"
        ) || data.data[0];

      rate = num(
        row?.price ??
          row?.rate ??
          row?.sell ??
          row?.value
      );
    }

    if (!rate) {
      rate = num(data?.meta?.usd_irt);
    }

    if (!rate) {
      rate = num(data?.usd_irt);
    }

    const asOf =
      data?.meta?.asOf ||
      data?.meta?.updatedAt ||
      new Date().toISOString();

    const result: FXRate = {
      rate: rate > 0 ? rate : null,
      asOf,
      delayed: false,
      delayedMinutes: 0,
    };

    fxCache.value = result;
    fxCache.at = now;

    return result;
  } catch {
    const fallback: FXRate = {
      rate: null,
      asOf: null,
      delayed: true,
      delayedMinutes: null,
    };

    fxCache.value = fallback;
    fxCache.at = now;

    return fallback;
  }
}

/* =========================================================
   MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket(): Promise<MarketAnalysis> {
  const [
    candles1m,
    candles5m,
    candles15m,
    candles1h,
    candles4h,
  ] = await Promise.all([
    getCandles("1min", 180),
    getCandles("5min", 180),
    getCandles("15min", 180),
    getCandles("1h", 180),
    getCandles("4h", 180),
  ]);

  const analyses = [
    timeframeDirection(candles1m),
    timeframeDirection(candles5m),
    timeframeDirection(candles15m),
    timeframeDirection(candles1h),
    timeframeDirection(candles4h),
  ];

  let buyVotes = 0;
  let sellVotes = 0;

  for (const item of analyses) {
    if (item.direction === "BUY") {
      buyVotes++;
    }

    if (item.direction === "SELL") {
      sellVotes++;
    }
  }

  let direction: Direction | null = null;

  if (buyVotes >= 3) {
    direction = "BUY";
  }

  if (sellVotes >= 3) {
    direction = "SELL";
  }

  const closes1m = candles1m.map(
    (c) => c.close
  );

  const currentPrice =
    await getLivePrice();

  const ema9 = ema(closes1m, 9);
  const ema20 = ema(closes1m, 20);
  const ema50 = ema(closes1m, 50);

  const rsiValue = rsi(closes1m, 14);
  const macdValue = macd(closes1m);

  const atrValue = atr(candles1m, 14);

  const sr =
    getSupportResistance(candles15m);

  const last = candles1m[candles1m.length - 1];

  const previous =
    candles1m[candles1m.length - 2];

  const recentAverageRange =
    averageRange(candles1m, 20);

  const reasons: string[] = [];

  let score = 0;
  let confirmations = 0;

  /* TREND */

  const trendBuy =
    ema9 > ema20 && ema20 > ema50;

  const trendSell =
    ema9 < ema20 && ema20 < ema50;

  if (direction === "BUY" && trendBuy) {
    score += 18;
    confirmations++;
    reasons.push(
      "روند کوتاه‌مدت و میان‌مدت صعودی است"
    );
  }

  if (direction === "SELL" && trendSell) {
    score += 18;
    confirmations++;
    reasons.push(
      "روند کوتاه‌مدت و میان‌مدت نزولی است"
    );
  }

  /* MTF */

  if (
    direction === "BUY" &&
    buyVotes >= 4
  ) {
    score += 16;
    confirmations++;
    reasons.push(
      "تأیید چند تایم‌فریمی برای خرید"
    );
  }

  if (
    direction === "SELL" &&
    sellVotes >= 4
  ) {
    score += 16;
    confirmations++;
    reasons.push(
      "تأیید چند تایم‌فریمی برای فروش"
    );
  }

  if (
    direction === "BUY" &&
    buyVotes === 3
  ) {
    score += 10;
    confirmations++;
    reasons.push(
      "اکثریت تایم‌فریم‌ها صعودی هستند"
    );
  }

  if (
    direction === "SELL" &&
    sellVotes === 3
  ) {
    score += 10;
    confirmations++;
    reasons.push(
      "اکثریت تایم‌فریم‌ها نزولی هستند"
    );
  }

  /* RSI */

  if (
    direction === "BUY" &&
    rsiValue >= 52 &&
    rsiValue <= 70
  ) {
    score += 10;
    confirmations++;
    reasons.push(
      `RSI خرید مناسب است (${rsiValue.toFixed(1)})`
    );
  }

  if (
    direction === "SELL" &&
    rsiValue <= 48 &&
    rsiValue >= 30
  ) {
    score += 10;
    confirmations++;
    reasons.push(
      `RSI فروش مناسب است (${rsiValue.toFixed(1)})`
    );
  }

  /* MACD */

  if (
    direction === "BUY" &&
    macdValue.histogram > 0
  ) {
    score += 10;
    confirmations++;
    reasons.push("MACD مومنتوم خرید را تأیید می‌کند");
  }

  if (
    direction === "SELL" &&
    macdValue.histogram < 0
  ) {
    score += 10;
    confirmations++;
    reasons.push("MACD مومنتوم فروش را تأیید می‌کند");
  }

  /* PULLBACK */

  const distanceFromEma20 =
    Math.abs(currentPrice - ema20);

  if (
    direction &&
    distanceFromEma20 <=
      Math.max(atrValue * 1.2, 1)
  ) {
    score += 8;
    confirmations++;
    reasons.push(
      "قیمت در محدوده مناسب پولبک قرار دارد"
    );
  }

  /* STRUCTURE */

  if (
    direction === "BUY" &&
    currentPrice > sr.support &&
    currentPrice < sr.resistance
  ) {
    score += 8;
    confirmations++;
    reasons.push(
      "ساختار قیمت داخل ناحیه معتبر حمایتی/مقاومتی است"
    );
  }

  if (
    direction === "SELL" &&
    currentPrice > sr.support &&
    currentPrice < sr.resistance
  ) {
    score += 8;
    confirmations++;
    reasons.push(
      "ساختار قیمت داخل ناحیه معتبر حمایتی/مقاومتی است"
    );
  }

  /* CANDLE */

  const lastDirection =
    candleDirection(last);

  if (
    direction &&
    lastDirection === direction
  ) {
    score += 5;
    confirmations++;
    reasons.push(
      "کندل اخیر جهت تحلیل را تأیید می‌کند"
    );
  }

  /* VOLATILITY */

  const volatilityOk =
    atrValue >= 0.25 &&
    atrValue <= 4.5;

  if (volatilityOk) {
    score += 5;
    confirmations++;
    reasons.push(
      "نوسان بازار برای مدیریت حدضرر مناسب است"
    );
  }

  /* SESSION */

  const session = getSession();

  if (
    session.name === "LONDON" ||
    session.name === "NEW_YORK"
  ) {
    score += 5;
    confirmations++;
    reasons.push(
      `سشن فعال: ${session.flag} ${session.title}`
    );
  }

  /* SCORE NORMALIZATION */

  score = clamp(score, 0, 100);

  let momentumText = "متعادل";

  if (
    direction === "BUY" &&
    rsiValue > 55
  ) {
    momentumText = "صعودی";
  }

  if (
    direction === "SELL" &&
    rsiValue < 45
  ) {
    momentumText = "نزولی";
  }

  let volatilityText = "متعادل";

  if (atrValue > 3.5) {
    volatilityText = "زیاد";
  } else if (atrValue < 1) {
    volatilityText = "کم";
  }

  const multiTimeframeText =
    `${buyVotes} خرید / ${sellVotes} فروش`;

  const trendText =
    direction === "BUY"
      ? "صعودی"
      : direction === "SELL"
        ? "نزولی"
        : "خنثی";

  const structureText =
    currentPrice >= sr.resistance
      ? "بالای مقاومت"
      : currentPrice <= sr.support
        ? "زیر حمایت"
        : "داخل محدوده";

  return {
    direction,
    score,
    confirmations,
    reasons: reasons.slice(0, 10),
    analysis: {
      trend: trendText,
      momentum: momentumText,
      volatility: volatilityText,
      multiTimeframe: multiTimeframeText,
      structure: structureText,
    },
    support: sr.support,
    resistance: sr.resistance,
    atr: roundPrice(atrValue),
    currentPrice: roundPrice(currentPrice),
    session: session.name,
    timeframe: "1m",
    candles: candles1m.slice(-120),
  };
}

/* =========================================================
   LEVELS
   ========================================================= */

function buildLevels(
  direction: Direction,
  entry: number
) {
  if (direction === "BUY") {
    return {
      stopLoss: roundPrice(
        entry - STOP_DISTANCE
      ),
      tp1: roundPrice(
        entry + TP1_DISTANCE
      ),
      tp2: roundPrice(
        entry + TP2_DISTANCE
      ),
      tp3: roundPrice(
        entry + TP3_DISTANCE
      ),
    };
  }

  return {
    stopLoss: roundPrice(
      entry + STOP_DISTANCE
    ),
    tp1: roundPrice(
      entry - TP1_DISTANCE
    ),
    tp2: roundPrice(
      entry - TP2_DISTANCE
    ),
    tp3: roundPrice(
      entry - TP3_DISTANCE
    ),
  };
}

/* =========================================================
   PRICE LEVEL TESTS

   IMPORTANT:
   We intentionally use current live price for lifecycle
   decisions. We do NOT use candle high/low to guess
   which event happened first.
   ========================================================= */

function reached(
  direction: Direction,
  price: number,
  level: number
): boolean {
  if (direction === "BUY") {
    return price >= level;
  }

  return price <= level;
}

function stopped(
  direction: Direction,
  price: number,
  stop: number
): boolean {
  if (direction === "BUY") {
    return price <= stop;
  }

  return price >= stop;
}

/* =========================================================
   TELEGRAM
   ========================================================= */

async function telegramRequest(
  method: string,
  body: Record<string, unknown>
): Promise<any> {
  if (!TELEGRAM_TOKEN) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured."
    );
  }

  if (!TELEGRAM_CHAT_ID) {
    throw new Error(
      "TELEGRAM_SIGNAL_CHAT_ID is not configured."
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  const data: any = await response.json();

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.description ||
        `Telegram HTTP ${response.status}`
    );
  }

  return data;
}

async function sendTelegram(
  text: string
): Promise<{
  ok: boolean;
  messageId: string | null;
  error: string | null;
}> {
  let lastError = "";

  for (
    let attempt = 1;
    attempt <= TELEGRAM_RETRIES;
    attempt++
  ) {
    try {
      const result = await telegramRequest(
        "sendMessage",
        {
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }
      );

      return {
        ok: true,
        messageId:
          result?.result?.message_id
            ? String(result.result.message_id)
            : null,
        error: null,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : String(error);

      if (attempt < TELEGRAM_RETRIES) {
        await sleep(
          TELEGRAM_RETRY_DELAY * attempt
        );
      }
    }
  }

  return {
    ok: false,
    messageId: null,
    error: lastError,
  };
}

/* =========================================================
   TELEGRAM TEXT
   ========================================================= */

function signalTelegramText(
  meta: TradeMeta,
  fx: FXRate
): string {
  const session = getSession();

  const strength =
    meta.score >= 82
      ? "حرفه‌ای"
      : meta.score >= 74
        ? "متوسط"
        : "ضعیف";

  return `
<b>🤖 ━━━ سیگنال هوش مصنوعی طلا ━━━ 🤖</b>

🪙 <b>${DISPLAY_SYMBOL} | طلا</b>

${
  meta.direction === "BUY"
    ? "🟢 خرید"
    : "🔴 فروش"
}

⭐ <b>قدرت سیگنال:</b> ${strength}

━━━━━━━━━━━━━━━━━━

📍 <b>ورود:</b> ${formatPrice(meta.entry)}

🛑 <b>حد ضرر:</b> ${formatPrice(
    meta.stopLoss
  )}

🎯 <b>اهداف:</b>

1️⃣ TP1: ${formatPrice(meta.tp1)}
💰 ${formatUsd(meta.tp1Usd)}
📦 ${formatLot(meta.tp1Lot)} لات

2️⃣ TP2: ${formatPrice(meta.tp2)}
💰 ${formatUsd(meta.tp2Usd)}
📦 ${formatLot(meta.tp2Lot)} لات

3️⃣ TP3: ${formatPrice(meta.tp3)}
💰 ${formatUsd(meta.tp3Usd)}
📦 ${formatLot(meta.tp3Lot)} لات

━━━━━━━━━━━━━━━━━━

📦 <b>حجم کل:</b> ${formatLot(
    meta.totalLot
  )} لات

💵 <b>سود کامل:</b> +$${meta.totalPotentialUsd}

🛑 <b>ریسک استاپ:</b> -$${meta.stopUsd}

━━━━━━━━━━━━━━━━━━

🛡️ <b>مدیریت معامله</b>

بعد از TP1:

✅ ${formatLot(meta.tp1Lot)} لات بسته می‌شود
📦 ${formatLot(
    meta.totalLot - meta.tp1Lot
  )} لات باقی می‌ماند

🔒 حد ضرر → نقطه ورود

بعد از TP2:

✅ ${formatLot(meta.tp2Lot)} لات دیگر بسته می‌شود

🔒 حدضرر باقی‌مانده → TP1

━━━━━━━━━━━━━━━━━━

🧠 <b>تحلیل</b>

⭐ امتیاز: ${meta.score}/100
✅ تأییدیه‌ها: ${meta.confirmations}

📈 روند: ${meta.analysis.trend}
⚡ مومنتوم: ${meta.analysis.momentum}
🌊 نوسان: ${meta.analysis.volatility}
🧭 ساختار: ${meta.analysis.structure}

━━━━━━━━━━━━━━━━━━

📊 <b>حمایت:</b> ${formatPrice(
    meta.support
  )}

📊 <b>مقاومت:</b> ${formatPrice(
    meta.resistance
  )}

${session.flag} <b>سشن:</b> ${session.title}

🕐 <b>زمان ایران:</b> ${iranDateTime()}

━━━━━━━━━━━━━━━━━━

💱 <b>دلار:</b> ${
    fx.rate
      ? formatToman(fx.rate)
      : "دریافت نشد"
  }

🟢 <b>وضعیت:</b> سیگنال فعال است

🆔 <b>شناسه:</b> ${meta.signalId}

━━━━━━━━━━━━━━━━━━

⚠️ این تحلیل توسط سیستم هوش مصنوعی تولید شده
و تضمین‌کننده سود نیست.
`;
}

function tp1TelegramText(
  meta: TradeMeta,
  fx: FXRate
): string {
  return `
🟢 <b>هدف اول فعال شد</b>

🪙 ${DISPLAY_SYMBOL}

🎯 <b>TP1:</b> ${formatPrice(meta.tp1)}

💰 <b>سود TP1:</b> ${formatUsd(
    meta.tp1Usd
  )}

${
  fx.rate
    ? `≈ ${formatToman(
        meta.tp1Usd * fx.rate
      )}`
    : ""
}

📦 <b>حجم بسته‌شده:</b> ${formatLot(
    meta.tp1Lot
  )} لات

📦 <b>حجم باقی‌مانده:</b> ${formatLot(
    meta.remainingLot
  )} لات

━━━━━━━━━━━━━━━━━━

🛡️ <b>ریسک‌فری فعال شد</b>

🔒 حد ضرر → نقطه ورود
📍 ورود: ${formatPrice(meta.entry)}

یعنی از این لحظه،
اصل ریسک معامله محافظت شده است.

🟢 <b>وضعیت:</b> معامله هنوز فعال است

🆔 ${meta.signalId}
`;
}

function tp2TelegramText(
  meta: TradeMeta,
  fx: FXRate
): string {
  return `
🟢 <b>هدف دوم فعال شد</b>

🪙 ${DISPLAY_SYMBOL}

🎯 <b>TP2:</b> ${formatPrice(meta.tp2)}

💰 <b>سود TP2:</b> ${formatUsd(
    meta.tp2Usd
  )}

${
  fx.rate
    ? `≈ ${formatToman(
        meta.tp2Usd * fx.rate
      )}`
    : ""
}

📦 <b>حجم بسته‌شده:</b> ${formatLot(
    meta.tp2Lot
  )} لات

📦 <b>حجم باقی‌مانده:</b> ${formatLot(
    meta.remainingLot
  )} لات

━━━━━━━━━━━━━━━━━━

🔒 حد ضرر محافظتی:
TP1 → ${formatPrice(meta.tp1)}

📊 <b>سود جمع‌شده:</b> ${formatUsd(
    meta.realizedProfitUsd
  )}

🟢 <b>وضعیت:</b> هنوز فعال است

🆔 ${meta.signalId}
`;
}

function tp3TelegramText(
  meta: TradeMeta,
  fx: FXRate
): string {
  return `
🏆 <b>FULL TARGET</b>

🟢 <b>معامله با موفقیت تکمیل شد</b>

🪙 ${DISPLAY_SYMBOL}

🎯 <b>TP3:</b> ${formatPrice(meta.tp3)}

💰 <b>سود TP3:</b> ${formatUsd(
    meta.tp3Usd
  )}

${
  fx.rate
    ? `≈ ${formatToman(
        meta.tp3Usd * fx.rate
      )}`
    : ""
}

━━━━━━━━━━━━━━━━━━

💵 <b>سود نهایی:</b> +$${TOTAL_PROFIT_USD}

${
  fx.rate
    ? `💴 ارزش تقریبی:
${formatToman(
  TOTAL_PROFIT_USD * fx.rate
)}`
    : ""
}

📦 حجم نهایی بسته‌شده:
${formatLot(meta.tp3Lot)} لات

━━━━━━━━━━━━━━━━━━

🏆 <b>نتیجه:</b> برد

🟢 <b>وضعیت:</b> منقضی شد / تکمیل شد

📊 سیگنال وارد کارنامه شد.

🆔 ${meta.signalId}
`;
}

function breakEvenTelegramText(
  meta: TradeMeta,
  fx: FXRate
): string {
  return `
🛡️ <b>ریسک‌فری فعال شد</b>

🪙 ${DISPLAY_SYMBOL}

📍 قیمت ورود:
${formatPrice(meta.entry)}

📦 حجم باقی‌مانده:
${formatLot(meta.remainingLot)} لات

━━━━━━━━━━━━━━━━━━

قیمت به نقطه ورود برگشت.

🔒 معامله بدون ریسک بسته شد.

💰 سود ثبت‌شده تا این لحظه:
${formatUsd(meta.realizedProfitUsd)}

${
  fx.rate
    ? `≈ ${formatToman(
        meta.realizedProfitUsd *
          fx.rate
      )}`
    : ""
}

━━━━━━━━━━━━━━━━━━

📊 <b>نتیجه:</b> سر‌به‌سر / محافظت‌شده

🆔 ${meta.signalId}
`;
}

function stopTelegramText(
  meta: TradeMeta,
  fx: FXRate
): string {
  return `
🔴 <b>حد ضرر فعال شد</b>

🪙 ${DISPLAY_SYMBOL}

🛑 <b>حد ضرر:</b>
${formatPrice(meta.originalStopLoss)}

💵 <b>ضرر معامله:</b>
-$${STOP_USD}

${
  fx.rate
    ? `💴 معادل تقریبی:
${formatToman(
  STOP_USD * fx.rate
)}`
    : ""
}

📦 <b>حجم:</b>
${formatLot(meta.totalLot)} لات

━━━━━━━━━━━━━━━━━━

❌ <b>نتیجه:</b> باخت

🔴 <b>وضعیت:</b> منقضی شد

📊 معامله در کارنامه ثبت شد.

🆔 ${meta.signalId}
`;
}

function expiredTelegramText(
  meta: TradeMeta
): string {
  return `
⏰ <b>سیگنال منقضی شد</b>

🪙 ${DISPLAY_SYMBOL}

🆔 ${meta.signalId}

این سیگنال دیگر معتبر نیست
و از چرخه معاملات فعال خارج شد.

📊 وضعیت در کارنامه ثبت شد.
`;
}

/* =========================================================
   DATABASE HELPERS
   ========================================================= */

async function findSignalBot() {
  const bot =
    await prisma.tradingBot.findFirst({
      where: {
        isActive: true,
        OR: [
          {
            symbol: {
              contains: "XAU",
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: "gold",
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: "طلا",
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  if (bot) {
    return bot;
  }

  return prisma.tradingBot.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function saveMetadata(
  runId: string,
  meta: TradeMeta
): Promise<void> {
  await prisma.analysisRun.update({
    where: {
      id: runId,
    },
    data: {
      metadata: meta as any,
    },
  });
}

async function updateSignal(
  signalId: string,
  meta: TradeMeta,
  status: string
): Promise<void> {
  await prisma.tradingSignal.update({
    where: {
      id: signalId,
    },
    data: {
      status,
      currentPrice: meta.currentPrice,
      stopLoss:
        meta.protectedStop ??
        meta.stopLoss,
      telegramSent: meta.telegramSent,
      telegramMessageId:
        meta.telegramMessageId,
      telegramSentAt:
        meta.telegramSent
          ? new Date()
          : undefined,
      metadata: meta as any,
      expiresAt:
        meta.closedAt
          ? new Date(meta.closedAt)
          : undefined,
      closedAt:
        meta.closedAt
          ? new Date(meta.closedAt)
          : undefined,
    },
  });
}

async function updateTrade(
  tradeId: string,
  meta: TradeMeta,
  status: string
): Promise<void> {
  await prisma.trade.update({
    where: {
      id: tradeId,
    },
    data: {
      exitPrice:
        meta.closedAt
          ? meta.currentPrice
          : undefined,
      stopLoss:
        meta.protectedStop ??
        meta.stopLoss,
      profitLoss:
        meta.realizedProfitUsd,
      status,
      closedAt:
        meta.closedAt
          ? new Date(meta.closedAt)
          : undefined,
    },
  });
}

/* =========================================================
   TELEGRAM DELIVERY RECORD
   ========================================================= */

async function recordTelegramDelivery(
  signalId: string,
  messageId: string | null,
  ok: boolean,
  error: string | null
): Promise<void> {
  try {
    await prisma.telegramDelivery.create({
      data: {
        signalId,
        channelId:
          TELEGRAM_CHAT_ID || "UNKNOWN",
        messageId:
          messageId || undefined,
        status: ok
          ? "SENT"
          : "FAILED",
        errorMessage:
          error || undefined,
        sentAt: ok
          ? new Date()
          : undefined,
      },
    });
  } catch {
    /*
      Delivery logging must never kill the trading engine.
    */
  }
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

async function getPerformance() {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        symbol: {
          in: [SYMBOL, DISPLAY_SYMBOL],
        },
        status: {
          in: [
            "WON",
            "LOST",
            "BREAKEVEN",
            "EXPIRED",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

  let wins = 0;
  let losses = 0;
  let breakeven = 0;

  let realizedUsd = 0;

  for (const signal of signals) {
    if (signal.status === "WON") {
      wins++;
    }

    if (signal.status === "LOST") {
      losses++;
    }

    if (signal.status === "BREAKEVEN") {
      breakeven++;
    }

    const metadata =
      signal.metadata as any;

    realizedUsd += num(
      metadata?.realizedProfitUsd
    );
  }

  const closed =
    wins + losses + breakeven;

  const winRate =
    closed > 0
      ? (wins / closed) * 100
      : 0;

  return {
    total: signals.length,
    wins,
    losses,
    breakeven,
    winRate: round2(winRate),
    realizedUsd: round2(realizedUsd),
  };
}

/* =========================================================
   ACTIVE SIGNAL
   ========================================================= */

async function findActiveRuns() {
  return prisma.analysisRun.findMany({
    where: {
      symbol: SYMBOL,
      status: {
        in: [
          "AI_ACTIVE",
          "AI_TP1",
          "AI_TP2",
        ],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

/* =========================================================
   COOLDOWN
   ========================================================= */

async function hasRecentSignal(): Promise<boolean> {
  const since = new Date(
    Date.now() -
      SIGNAL_COOLDOWN_MINUTES *
        60_000
  );

  const recent =
    await prisma.tradingSignal.findFirst({
      where: {
        symbol: {
          in: [SYMBOL, DISPLAY_SYMBOL],
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return Boolean(recent);
}

/* =========================================================
   EVENT PROFIT
   ========================================================= */

function eventProfit(
  type: EventType
): {
  usd: number;
  lot: number;
} {
  switch (type) {
    case "TP1":
      return {
        usd: TP1_USD,
        lot: TP1_LOT,
      };

    case "TP2":
      return {
        usd: TP2_USD,
        lot: TP2_LOT,
      };

    case "TP3":
      return {
        usd: TP3_USD,
        lot: TP3_LOT,
      };

    case "SL":
      return {
        usd: -STOP_USD,
        lot: TOTAL_LOT,
      };

    default:
      return {
        usd: 0,
        lot: 0,
      };
  }
}

/* =========================================================
   CREATE EVENT
   ========================================================= */

async function createTradeEvent(
  meta: TradeMeta,
  type: EventType,
  price: number
): Promise<TradeMeta> {
  const now = new Date();

  const fx = await getUsdToToman();

  const profit =
    eventProfit(type);

  const profitToman =
    fx.rate !== null
      ? profit.usd * fx.rate
      : null;

  const event: EventRecord = {
    id: id("evt"),
    type,
    at: now.toISOString(),
    price: roundPrice(price),
    profitUsd: profit.usd,
    profitToman:
      profitToman !== null
        ? round2(profitToman)
        : null,
    lotClosed: profit.lot,
    remainingLot:
      Math.max(
        0,
        round2(
          meta.remainingLot -
            (type === "SL"
              ? meta.remainingLot
              : profit.lot)
        )
      ),
    messageId: null,
    telegramDelivered: false,
  };

  meta.events = [
    ...meta.events,
    event,
  ];

  meta.realizedProfitUsd = round2(
    meta.realizedProfitUsd +
      profit.usd
  );

  meta.currentPrice = roundPrice(price);
  meta.updatedAt = now.toISOString();

  if (type === "TP1") {
    meta.state = "TP1_HIT";
    meta.tp1HitAt =
      now.toISOString();

    meta.remainingLot = round2(
      TOTAL_LOT - TP1_LOT
    );

    meta.protectedStop =
      meta.entry;
  }

  if (type === "TP2") {
    meta.state = "TP2_HIT";
    meta.tp2HitAt =
      now.toISOString();

    meta.remainingLot = round2(
      TOTAL_LOT -
        TP1_LOT -
        TP2_LOT
    );

    meta.protectedStop =
      meta.tp1;
  }

  if (type === "TP3") {
    meta.state = "TP3_HIT";
    meta.tp3HitAt =
      now.toISOString();

    meta.remainingLot = 0;
    meta.closedAt =
      now.toISOString();
  }

  if (type === "SL") {
    meta.state = "STOPPED";
    meta.remainingLot = 0;
    meta.stopLossHitAt =
      now.toISOString();
    meta.closedAt =
      now.toISOString();
  }

  if (type === "BREAKEVEN") {
    meta.state = "BREAKEVEN";
    meta.remainingLot = 0;
    meta.breakEvenAt =
      now.toISOString();
    meta.closedAt =
      now.toISOString();
  }

  if (type === "EXPIRED") {
    meta.state = "EXPIRED";
    meta.remainingLot = 0;
    meta.closedAt =
      now.toISOString();
  }

  let message = "";

  if (type === "TP1") {
    message =
      tp1TelegramText(meta, fx);
  }

  if (type === "TP2") {
    message =
      tp2TelegramText(meta, fx);
  }

  if (type === "TP3") {
    message =
      tp3TelegramText(meta, fx);
  }

  if (type === "SL") {
    message =
      stopTelegramText(meta, fx);
  }

  if (type === "BREAKEVEN") {
    message =
      breakEvenTelegramText(
        meta,
        fx
      );
  }

  if (type === "EXPIRED") {
    message =
      expiredTelegramText(meta);
  }

  if (message) {
    const telegram =
      await sendTelegram(message);

    event.messageId =
      telegram.messageId;

    event.telegramDelivered =
      telegram.ok;

    if (!telegram.ok) {
      meta.telegramLastError =
        telegram.error;
    } else {
      meta.telegramLastError =
        null;
    }

    await recordTelegramDelivery(
      meta.signalId,
      telegram.messageId,
      telegram.ok,
      telegram.error
    );
  }

  /*
    Persist BEFORE returning.
    This makes the event durable even if the next cron
    invocation happens immediately.
  */

  await saveMetadata(
    meta.analysisRunId,
    meta
  );

  let signalStatus = "ACTIVE";
  let tradeStatus = "OPEN";

  if (type === "TP1") {
    signalStatus = "TP1_HIT";
  }

  if (type === "TP2") {
    signalStatus = "TP2_HIT";
  }

  if (type === "TP3") {
    signalStatus = "WON";
    tradeStatus = "CLOSED";
  }

  if (type === "SL") {
    signalStatus = "LOST";
    tradeStatus = "CLOSED";
  }

  if (type === "BREAKEVEN") {
    signalStatus = "BREAKEVEN";
    tradeStatus = "CLOSED";
  }

  if (type === "EXPIRED") {
    signalStatus = "EXPIRED";
    tradeStatus = "CLOSED";
  }

  await updateSignal(
    meta.signalId,
    meta,
    signalStatus
  );

  await updateTrade(
    meta.tradeId,
    meta,
    tradeStatus
  );

  if (type === "TP3") {
    await prisma.analysisRun.update({
      where: {
        id: meta.analysisRunId,
      },
      data: {
        status: "AI_FINISHED",
        finishedAt: new Date(),
        metadata: meta as any,
      },
    });
  }

  if (
    type === "SL" ||
    type === "BREAKEVEN" ||
    type === "EXPIRED"
  ) {
    await prisma.analysisRun.update({
      where: {
        id: meta.analysisRunId,
      },
      data: {
        status: "AI_FINISHED",
        finishedAt: new Date(),
        metadata: meta as any,
      },
    });
  }

  return meta;
}

/* =========================================================
   MONITOR ACTIVE RUN
   ========================================================= */

async function monitorRun(
  run: any
): Promise<TradeMeta | null> {
  const metadata =
    run.metadata as any;

  if (!metadata) {
    return null;
  }

  const meta =
    metadata as TradeMeta;

  if (!meta.signalId) {
    return null;
  }

  if (
    meta.state === "TP3_HIT" ||
    meta.state === "STOPPED" ||
    meta.state === "BREAKEVEN" ||
    meta.state === "EXPIRED"
  ) {
    return meta;
  }

  const age =
    Date.now() -
    new Date(meta.createdAt).getTime();

  if (
    age >
    MAX_SIGNAL_AGE_HOURS *
      60 *
      60 *
      1000
  ) {
    await createTradeEvent(
      meta,
      "EXPIRED",
      meta.currentPrice
    );

    return meta;
  }

  const price =
    await getLivePrice();

  meta.currentPrice =
    roundPrice(price);

  /*
    ---------------------------------------------------------
    ACTIVE / WAITING
    ---------------------------------------------------------
  */

  if (meta.state === "ACTIVE") {
    /*
      Stop has priority if current live price has already
      crossed it.

      This is intentionally based on the live price rather
      than candle high/low.
    */

    if (
      stopped(
        meta.direction,
        price,
        meta.originalStopLoss
      )
    ) {
      return createTradeEvent(
        meta,
        "SL",
        price
      );
    }

    /*
      If a fast move crossed several targets between cron
      checks, process them in order.
    */

    if (
      reached(
        meta.direction,
        price,
        meta.tp3
      )
    ) {
      await createTradeEvent(
        meta,
        "TP1",
        meta.tp1
      );

      await createTradeEvent(
        meta,
        "TP2",
        meta.tp2
      );

      return createTradeEvent(
        meta,
        "TP3",
        meta.tp3
      );
    }

    if (
      reached(
        meta.direction,
        price,
        meta.tp2
      )
    ) {
      await createTradeEvent(
        meta,
        "TP1",
        meta.tp1
      );

      return createTradeEvent(
        meta,
        "TP2",
        meta.tp2
      );
    }

    if (
      reached(
        meta.direction,
        price,
        meta.tp1
      )
    ) {
      return createTradeEvent(
        meta,
        "TP1",
        price
      );
    }
  }

  /*
    ---------------------------------------------------------
    AFTER TP1
    ---------------------------------------------------------
  */

  if (meta.state === "TP1_HIT") {
    const protectedStop =
      meta.protectedStop ??
      meta.entry;

    /*
      If price comes back to entry after TP1,
      close remaining position as protected BE.
    */

    if (
      stopped(
        meta.direction,
        price,
        protectedStop
      )
    ) {
      return createTradeEvent(
        meta,
        "BREAKEVEN",
        price
      );
    }

    if (
      reached(
        meta.direction,
        price,
        meta.tp3
      )
    ) {
      await createTradeEvent(
        meta,
        "TP2",
        meta.tp2
      );

      return createTradeEvent(
        meta,
        "TP3",
        meta.tp3
      );
    }

    if (
      reached(
        meta.direction,
        price,
        meta.tp2
      )
    ) {
      return createTradeEvent(
        meta,
        "TP2",
        price
      );
    }
  }

  /*
    ---------------------------------------------------------
    AFTER TP2
    ---------------------------------------------------------
  */

  if (meta.state === "TP2_HIT") {
    const protectedStop =
      meta.protectedStop ??
      meta.tp1;

    /*
      Remaining position is protected at TP1.
    */

    if (
      stopped(
        meta.direction,
        price,
        protectedStop
      )
    ) {
      return createTradeEvent(
        meta,
        "BREAKEVEN",
        price
      );
    }

    if (
      reached(
        meta.direction,
        price,
        meta.tp3
      )
    ) {
      return createTradeEvent(
        meta,
        "TP3",
        price
      );
    }
  }

  meta.updatedAt =
    new Date().toISOString();

  await saveMetadata(
    meta.analysisRunId,
    meta
  );

  await updateSignal(
    meta.signalId,
    meta,
    meta.state === "TP1_HIT"
      ? "TP1_HIT"
      : meta.state === "TP2_HIT"
        ? "TP2_HIT"
        : "ACTIVE"
  );

  return meta;
}

/* =========================================================
   CREATE SIGNAL
   ========================================================= */

async function createSignal(): Promise<TradeMeta> {
  const active =
    await findActiveRuns();

  if (active.length > 0) {
    throw new Error(
      "An active XAUUSD signal already exists."
    );
  }

  if (await hasRecentSignal()) {
    throw new Error(
      "Signal cooldown is active."
    );
  }

  const news =
    await getNewsRisk();

  if (news.blocked) {
    throw new Error(
      `High-impact news window: ${news.events.join(
        " | "
      )}`
    );
  }

  const analysis =
    await analyzeMarket();

  if (!analysis.direction) {
    throw new Error(
      "No clear market direction."
    );
  }

  if (
    analysis.score < MIN_SCORE ||
    analysis.confirmations <
      MIN_CONFIRMATIONS
  ) {
    throw new Error(
      `Setup rejected. Score ${analysis.score}/100, confirmations ${analysis.confirmations}.`
    );
  }

  /*
    Fixed-risk levels are intentionally used because the
    user's requested money management is fixed:
    SL -$40 and total TP +$80.
  */

  const entry =
    roundPrice(
      analysis.currentPrice
    );

  const levels =
    buildLevels(
      analysis.direction,
      entry
    );

  /*
    Volatility protection.
    The fixed $40 stop should not be used during extreme
    1-minute volatility.
  */

  if (analysis.atr > 4.5) {
    throw new Error(
      "Market volatility is too high for the fixed-risk setup."
    );
  }

  const bot =
    await findSignalBot();

  if (!bot) {
    throw new Error(
      "No active TradingBot exists. Create/activate an XAUUSD bot first."
    );
  }

  const fx =
    await getUsdToToman();

  const now =
    new Date();

  const signalId =
    id("signal");

  const tradeId =
    id("trade");

  const runId =
    id("run");

  const meta: TradeMeta = {
    version: "AI-XAUUSD-V3",

    signalId,
    tradeId,
    analysisRunId: runId,

    symbol: DISPLAY_SYMBOL,
    direction:
      analysis.direction,

    state: "ACTIVE",

    entry,

    stopLoss:
      levels.stopLoss,

    tp1:
      levels.tp1,

    tp2:
      levels.tp2,

    tp3:
      levels.tp3,

    originalStopLoss:
      levels.stopLoss,

    protectedStop: null,

    totalLot: TOTAL_LOT,

    remainingLot:
      TOTAL_LOT,

    tp1Lot: TP1_LOT,
    tp2Lot: TP2_LOT,
    tp3Lot: TP3_LOT,

    tp1Usd: TP1_USD,
    tp2Usd: TP2_USD,
    tp3Usd: TP3_USD,

    stopUsd: STOP_USD,

    totalPotentialUsd:
      TOTAL_PROFIT_USD,

    score:
      analysis.score,

    confirmations:
      analysis.confirmations,

    reasons:
      analysis.reasons,

    analysis:
      analysis.analysis,

    support:
      analysis.support,

    resistance:
      analysis.resistance,

    atr:
      analysis.atr,

    session:
      analysis.session,

    currentPrice:
      entry,

    usdToToman:
      fx.rate,

    usdRateAsOf:
      fx.asOf,

    createdAt:
      now.toISOString(),

    updatedAt:
      now.toISOString(),

    tp1HitAt: null,
    tp2HitAt: null,
    tp3HitAt: null,
    breakEvenAt: null,
    stopLossHitAt: null,
    closedAt: null,

    realizedProfitUsd: 0,

    events: [],

    telegramSent: false,
    telegramMessageId: null,
    telegramLastError: null,
  };

  /*
    1. Create AnalysisRun
  */

  await prisma.analysisRun.create({
    data: {
      id: runId,
      botId: bot.id,
      symbol: SYMBOL,
      timeframe: "1min",
      status: "AI_ACTIVE",
      startedAt: now,
      candlesAnalyzed:
        analysis.candles.length,
      confirmationsFound:
        analysis.confirmations,
      signalGenerated: true,
      metadata: meta as any,
    },
  });

  /*
    2. Create TradingSignal
  */

  await prisma.tradingSignal.create({
    data: {
      id: signalId,

      userId: bot.userId,
      botId: bot.id,

      symbol: DISPLAY_SYMBOL,
      timeframe: "1m",

      direction:
        analysis.direction,

      entry,

      takeProfit:
        levels.tp3,

      stopLoss:
        levels.stopLoss,

      riskReward: 2,

      score:
        analysis.score,

      confidence:
        analysis.score,

      status: "ACTIVE",

      source: "AI_ANALYSIS",

      marketStructure:
        analysis.analysis.structure,

      supportResistance:
        `Support ${formatPrice(
          analysis.support
        )} / Resistance ${formatPrice(
          analysis.resistance
        )}`,

      liquidity:
        "بررسی شد",

      pullback:
        "بررسی شد",

      candlePattern:
        "تأیید شد",

      volumeConfirmation:
        "در تحلیل استفاده شد",

      multiTimeframeConfirmation:
        analysis.analysis
          .multiTimeframe,

      sessionConfirmation:
        analysis.session,

      volatilityConfirmation:
        analysis.analysis
          .volatility,

      newsConfirmation:
        "High impact blocked",

      confirmations:
        analysis.confirmations as any,

      reasons:
        analysis.reasons as any,

      metadata:
        meta as any,

      telegramSent: false,
    },
  });

  /*
    3. Create Trade
  */

  await prisma.trade.create({
    data: {
      id: tradeId,

      userId: bot.userId,
      botId: bot.id,

      symbol: DISPLAY_SYMBOL,

      direction:
        analysis.direction,

      entryPrice: entry,

      exitPrice: undefined,

      takeProfit:
        levels.tp3,

      stopLoss:
        levels.stopLoss,

      quantity: TOTAL_LOT,

      profitLoss: 0,

      status: "OPEN",

      source: "AI_SIGNAL",

      openedAt: now,
    },
  });

  /*
    4. Send initial Telegram
  */

  const telegram =
    await sendTelegram(
      signalTelegramText(
        meta,
        fx
      )
    );

  meta.telegramSent =
    telegram.ok;

  meta.telegramMessageId =
    telegram.messageId;

  meta.telegramLastError =
    telegram.error;

  const firstEvent: EventRecord = {
    id: id("evt"),
    type: "SIGNAL",
    at: now.toISOString(),
    price: entry,
    profitUsd: 0,
    profitToman: 0,
    lotClosed: 0,
    remainingLot: TOTAL_LOT,
    messageId:
      telegram.messageId,
    telegramDelivered:
      telegram.ok,
  };

  meta.events = [
    firstEvent,
  ];

  await recordTelegramDelivery(
    signalId,
    telegram.messageId,
    telegram.ok,
    telegram.error
  );

  /*
    5. Persist final initial state
  */

  await saveMetadata(
    runId,
    meta
  );

  await updateSignal(
    signalId,
    meta,
    "ACTIVE"
  );

  return meta;
}

/* =========================================================
   CRON ENGINE
   ========================================================= */

async function runCronEngine() {
  const startedAt =
    Date.now();

  const results: any[] = [];

  /*
    First: repair/monitor every active signal.
  */

  const active =
    await findActiveRuns();

  for (const run of active) {
    try {
      const result =
        await monitorRun(run);

      results.push({
        runId: run.id,
        ok: true,
        state:
          result?.state ||
          null,
      });
    } catch (error) {
      results.push({
        runId: run.id,
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  /*
    IMPORTANT:
    Only create a new signal after all active runs have
    been monitored.
  */

  const stillActive =
    await findActiveRuns();

  if (stillActive.length === 0) {
    try {
      const newSignal =
        await createSignal();

      results.push({
        created: true,
        signalId:
          newSignal.signalId,
        state:
          newSignal.state,
        direction:
          newSignal.direction,
        entry:
          newSignal.entry,
        score:
          newSignal.score,
      });
    } catch (error) {
      results.push({
        created: false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  return {
    ok: true,

    durationMs:
      Date.now() - startedAt,

    activeBefore:
      active.length,

    activeAfter:
      stillActive.length,

    results,

    checkedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   AUTH
   ========================================================= */

function cronAuthorized(
  request: NextRequest
): boolean {
  if (!CRON_SECRET) {
    return false;
  }

  const headerSecret =
    request.headers.get(
      "x-ai-cron-secret"
    );

  const urlSecret =
    new URL(request.url).searchParams.get(
      "secret"
    );

  return (
    headerSecret === CRON_SECRET ||
    urlSecret === CRON_SECRET
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboardData() {
  const activeRuns =
    await findActiveRuns();

  let active: TradeMeta | null =
    null;

  if (activeRuns.length) {
    active =
      (activeRuns[0].metadata as any) ||
      null;
  }

  const latestRun =
    await prisma.analysisRun.findFirst({
      where: {
        symbol: SYMBOL,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const latest =
    latestRun?.metadata
      ? (latestRun.metadata as any)
      : null;

  let candles: Candle[] = [];

  try {
    candles =
      await getCandles(
        "1min",
        180
      );
  } catch {
    candles = [];
  }

  let currentPrice =
    active?.currentPrice ||
    0;

  try {
    currentPrice =
      await getLivePrice();
  } catch {
    /*
      Keep last known price.
    */
  }

  const fx =
    await getUsdToToman();

  const performance =
    await getPerformance();

  return {
    symbol: DISPLAY_SYMBOL,

    currentPrice:
      roundPrice(currentPrice),

    active,

    latest,

    candles,

    performance,

    usdToToman:
      fx.rate,

    usdRateAsOf:
      fx.asOf,

    updatedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      new URL(request.url);

    const isCron =
      url.searchParams.get(
        "cron"
      ) === "1";

    /*
      CRON
    */

    if (isCron) {
      if (!cronAuthorized(request)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Unauthorized cron request.",
          },
          {
            status: 401,
          }
        );
      }

      const result =
        await runCronEngine();

      return NextResponse.json(
        result,
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
      NORMAL DASHBOARD REQUEST
    */

    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const data =
      await dashboardData();

    return NextResponse.json(
      {
        ok: true,
        ...data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI_ANALYSIS_ROUTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI analysis error",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json().catch(
        () => ({})
      );

    const action =
      body?.action || "scan";

    if (action === "monitor") {
      const active =
        await findActiveRuns();

      const results = [];

      for (const run of active) {
        try {
          const result =
            await monitorRun(run);

          results.push({
            ok: true,
            runId: run.id,
            state:
              result?.state ||
              null,
          });
        } catch (error) {
          results.push({
            ok: false,
            runId: run.id,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          });
        }
      }

      return NextResponse.json({
        ok: true,
        results,
      });
    }

    /*
      Manual scan.
      If there is an active signal, return it instead of
      creating another one.
    */

    const active =
      await findActiveRuns();

    if (active.length) {
      return NextResponse.json({
        ok: true,
        created: false,
        message:
          "یک سیگنال فعال وجود دارد.",
        active:
          active[0].metadata ||
          null,
      });
    }

    const signal =
      await createSignal();

    return NextResponse.json({
      ok: true,
      created: true,
      signal,
    });
  } catch (error) {
    console.error(
      "AI_ANALYSIS_POST_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI analysis error",
      },
      {
        status: 500,
      }
    );
  }
}
