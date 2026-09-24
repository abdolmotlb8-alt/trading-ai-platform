import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   AI ANALYSIS ENGINE
   XAUUSD / GOLD
   ---------------------------------------------------------
   - Real Twelve Data market price
   - Real NetArz USD/IRT rate
   - Server-side monitoring
   - TP1 / TP2 / TP3
   - Partial close tracking
   - Break-even after TP1
   - SL event recording
   - Telegram event notifications
   - Performance statistics
   ========================================================= */

const TD_BASE = "https://api.twelvedata.com";
const NETARZ_BASE = "https://netarz.ir/api/fx/v1";

const SYMBOL = "XAUUSD";
const TD_SYMBOL = "XAU/USD";

/* -------------------------
   LOT PLAN
   ------------------------- */

const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const REMAINING_AFTER_TP1 = 0.06;
const REMAINING_AFTER_TP2 = 0.03;
const REMAINING_AFTER_TP3 = 0;

const STOP_USD = 4;
const TP1_USD = 5;
const TP2_USD = 8;
const TP3_USD = 12;

const MIN_SCORE = 70;
const MIN_CONFIRMATIONS = 2;

const ACTIVE_STATUSES = [
  "WAITING",
  "ACTIVE",
  "TP1_HIT",
  "TP2_HIT",
];

/* =========================================================
   TYPES
   ========================================================= */

type Direction = "BUY" | "SELL";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type MarketSession =
  | "TOKYO"
  | "LONDON"
  | "NEW_YORK"
  | "SYDNEY"
  | "CLOSED";

type EventType =
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "BREAKEVEN_HIT";

type TelegramEvent = {
  type: EventType;
  at: string;
  price: number;
  pnlUsd: number;
  pnlToman: number;
  lotClosed: number;
  remainingLot: number;
  usdToToman: number;
  telegramSent?: boolean;
  telegramMessageId?: number | null;
  telegramError?: string | null;
};

type SignalState = {
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  slHit: boolean;
  breakEvenArmed: boolean;
  breakEvenHit: boolean;
  closed: boolean;
  currentStop: number;
  remainingLot: number;
};

type SignalMeta = {
  version: number;

  symbol: string;
  direction: Direction;
  timeframe: string;

  score: number;
  confirmations: number;
  confirmationNames: string[];

  session: MarketSession;

  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;

  totalLot: number;
  tp1Lot: number;
  tp2Lot: number;
  tp3Lot: number;

  stopUsd: number;
  tp1Usd: number;
  tp2Usd: number;
  tp3Usd: number;

  tp1CloseUsd: number;
  tp2CloseUsd: number;
  tp3CloseUsd: number;

  remainingAfterTp1: number;
  remainingAfterTp2: number;
  remainingAfterTp3: number;

  lastPrice: number;
  lastPriceAt: string;

  usdToToman: number;
  usdToTomanAsOf?: string | null;
  usdToTomanDelayed?: boolean;
  usdToTomanDelayedMinutes?: number | null;

  state: SignalState;

  events: TelegramEvent[];

  telegramInitialSent?: boolean;
  telegramInitialError?: string | null;

  support?: number[];
  resistance?: number[];

  reasons?: string[];

  engineLastRun?: string;
  engineLastError?: string | null;
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseObject(value: unknown): Record<string, any> {
  if (!value) return {};

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeTf(value: unknown): string {
  const raw = String(value || "1min").toLowerCase();

  if (raw === "1m") return "1min";
  if (raw === "5m") return "5min";
  if (raw === "15m") return "15min";
  if (raw === "30m") return "30min";
  if (raw === "1h") return "1h";
  if (raw === "4h") return "4h";
  if (raw === "1d") return "1day";

  return raw;
}

function iranTime(date = new Date()): string {
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

/* =========================================================
   MARKET SESSION
   IMPORTANT:
   This is NOT getSession().
   getSession() belongs to authentication.
   ========================================================= */

function getMarketSession(date = new Date()): MarketSession {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );

  if (hour >= 0 && hour < 7) return "TOKYO";
  if (hour >= 7 && hour < 12) return "LONDON";
  if (hour >= 12 && hour < 21) return "NEW_YORK";
  if (hour >= 21 && hour < 24) return "SYDNEY";

  return "CLOSED";
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function td(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<any> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not configured");
  }

  const url = new URL(`${TD_BASE}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Twelve Data HTTP ${response.status}: ${
        data?.message || "Unknown error"
      }`,
    );
  }

  if (data?.status === "error") {
    throw new Error(data?.message || "Twelve Data error");
  }

  return data;
}

/* =========================================================
   REAL GOLD PRICE
   ========================================================= */

async function getLatestBar(
  symbol = TD_SYMBOL,
): Promise<Candle | null> {
  const data = await td("/time_series", {
    symbol,
    interval: "1min",
    outputsize: 2,
    order: "desc",
    timezone: "UTC",
  });

  const values = Array.isArray(data?.values) ? data.values : [];

  if (!values.length) {
    return null;
  }

  const row = values[0];

  return {
    datetime: String(row.datetime),
    open: num(row.open),
    high: num(row.high),
    low: num(row.low),
    close: num(row.close),
    volume: num(row.volume),
  };
}

async function getLivePrice(
  symbol = TD_SYMBOL,
): Promise<{
  price: number;
  source: string;
  asOf: string;
}> {
  try {
    const data = await td("/price", {
      symbol,
      dp: 5,
    });

    const price = num(data?.price);

    if (price > 0) {
      return {
        price,
        source: "Twelve Data /price",
        asOf: new Date().toISOString(),
      };
    }
  } catch {
    /* fallback below */
  }

  const bar = await getLatestBar(symbol);

  if (!bar || bar.close <= 0) {
    throw new Error("Unable to obtain XAUUSD price");
  }

  return {
    price: bar.close,
    source: "Twelve Data /time_series",
    asOf: bar.datetime,
  };
}

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 220,
): Promise<Candle[]> {
  const data = await td("/time_series", {
    symbol,
    interval,
    outputsize,
    order: "desc",
    timezone: "UTC",
  });

  const values = Array.isArray(data?.values) ? data.values : [];

  return values
    .map((row: any) => ({
      datetime: String(row.datetime),
      open: num(row.open),
      high: num(row.high),
      low: num(row.low),
      close: num(row.close),
      volume: num(row.volume),
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0,
    )
    .reverse();
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToman(): Promise<{
  rate: number;
  asOf: string | null;
  delayed: boolean;
  delayedMinutes: number | null;
  source: string;
  error: string | null;
}> {
  const apiKey = process.env.NETARZ_API_KEY;

  if (!apiKey) {
    return {
      rate: 0,
      asOf: null,
      delayed: false,
      delayedMinutes: null,
      source: "NetArz",
      error: "NETARZ_API_KEY is not configured",
    };
  }

  try {
    const response = await fetch(
      `${NETARZ_BASE}/rates/USD`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `NetArz HTTP ${response.status}: ${
          data?.message || "Unknown error"
        }`,
      );
    }

    const rate = num(
      data?.data?.mid ??
        data?.data?.sell ??
        data?.data?.buy ??
        data?.meta?.usd_irt,
    );

    if (rate <= 0) {
      throw new Error("NetArz returned an invalid USD/IRT rate");
    }

    return {
      rate,
      asOf: data?.meta?.as_of
        ? String(data.meta.as_of)
        : new Date().toISOString(),
      delayed: Boolean(data?.meta?.is_delayed),
      delayedMinutes:
        data?.meta?.delayed_minutes != null
          ? num(data.meta.delayed_minutes)
          : null,
      source: "NetArz /rates/USD",
      error: null,
    };
  } catch (error) {
    return {
      rate: 0,
      asOf: null,
      delayed: false,
      delayedMinutes: null,
      source: "NetArz /rates/USD",
      error:
        error instanceof Error
          ? error.message
          : "USD/IRT request failed",
    };
  }
}

/* =========================================================
   INDICATORS
   ========================================================= */

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  let previous = values[0];
  result.push(previous);

  for (let i = 1; i < values.length; i++) {
    const current =
      (values[i] - previous) * multiplier + previous;

    result.push(current);
    previous = current;
  }

  return result;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];

    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];

    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain =
      (avgGain * (period - 1) + gain) / period;

    avgLoss =
      (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;

  return 100 - 100 / (1 + rs);
}

function atr(
  candles: Candle[],
  period = 14,
): number {
  if (candles.length < period + 1) return 0;

  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    trs.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    );
  }

  return avg(trs.slice(-period));
}

function macd(values: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  if (values.length < 35) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
    };
  }

  const fast = ema(values, 12);
  const slow = ema(values, 26);

  const line = values.map(
    (_, index) => fast[index] - slow[index],
  );

  const signalSeries = ema(line, 9);

  const last = line[line.length - 1] || 0;
  const signal =
    signalSeries[signalSeries.length - 1] || 0;

  return {
    macd: last,
    signal,
    histogram: last - signal,
  };
}

function swingLevels(
  candles: Candle[],
): {
  support: number[];
  resistance: number[];
} {
  if (candles.length < 20) {
    return {
      support: [],
      resistance: [],
    };
  }

  const recent = candles.slice(-80);

  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];

    if (
      c.low <= recent[i - 1].low &&
      c.low <= recent[i - 2].low &&
      c.low <= recent[i + 1].low &&
      c.low <= recent[i + 2].low
    ) {
      supports.push(c.low);
    }

    if (
      c.high >= recent[i - 1].high &&
      c.high >= recent[i - 2].high &&
      c.high >= recent[i + 1].high &&
      c.high >= recent[i + 2].high
    ) {
      resistances.push(c.high);
    }
  }

  return {
    support: supports.slice(-5).map((x) => round(x, 2)),
    resistance: resistances
      .slice(-5)
      .map((x) => round(x, 2)),
  };
}

function candlePattern(
  candles: Candle[],
): {
  bullish: boolean;
  bearish: boolean;
  name: string;
} {
  if (candles.length < 2) {
    return {
      bullish: false,
      bearish: false,
      name: "NONE",
    };
  }

  const a = candles[candles.length - 2];
  const b = candles[candles.length - 1];

  const body = Math.abs(b.close - b.open);
  const range = b.high - b.low;

  if (range <= 0) {
    return {
      bullish: false,
      bearish: false,
      name: "NONE",
    };
  }

  const bullish =
    b.close > b.open &&
    body / range > 0.45 &&
    b.close > a.high;

  const bearish =
    b.close < b.open &&
    body / range > 0.45 &&
    b.close < a.low;

  if (bullish) {
    return {
      bullish: true,
      bearish: false,
      name: "BULLISH_BREAK",
    };
  }

  if (bearish) {
    return {
      bullish: false,
      bearish: true,
      name: "BEARISH_BREAK",
    };
  }

  return {
    bullish: false,
    bearish: false,
    name: "NEUTRAL",
  };
}

/* =========================================================
   AI MARKET ANALYSIS
   ========================================================= */

async function analyze(
  symbol = TD_SYMBOL,
  timeframe = "1min",
): Promise<{
  direction: Direction | null;
  score: number;
  confirmations: number;
  confirmationNames: string[];
  reasons: string[];
  entry: number;
  session: MarketSession;
  support: number[];
  resistance: number[];
}> {
  const [
    m1,
    m5,
    m15,
    h1,
    h4,
  ] = await Promise.all([
    getCandles(symbol, "1min", 220),
    getCandles(symbol, "5min", 180),
    getCandles(symbol, "15min", 180),
    getCandles(symbol, "1h", 150),
    getCandles(symbol, "4h", 120),
  ]);

  if (!m1.length) {
    throw new Error("No XAUUSD market candles available");
  }

  const current = m1[m1.length - 1].close;

  const c5 = m5[m5.length - 1]?.close || current;
  const c15 = m15[m15.length - 1]?.close || current;
  const c1h = h1[h1.length - 1]?.close || current;
  const c4h = h4[h4.length - 1]?.close || current;

  const e20 = ema(
    m1.map((x) => x.close),
    20,
  );

  const e50 = ema(
    m1.map((x) => x.close),
    50,
  );

  const ema20 = e20[e20.length - 1] || current;
  const ema50 = e50[e50.length - 1] || current;

  const rsiValue = rsi(
    m1.map((x) => x.close),
    14,
  );

  const macdValue = macd(
    m1.map((x) => x.close),
  );

  const candle = candlePattern(m1);

  const levels = swingLevels(m15);

  let buyVotes = 0;
  let sellVotes = 0;

  const reasons: string[] = [];
  const confirmationNames: string[] = [];

  /* Trend */
  if (current > ema20 && ema20 > ema50) {
    buyVotes++;
    confirmationNames.push("Trend");
    reasons.push("روند کوتاه‌مدت صعودی است.");
  }

  if (current < ema20 && ema20 < ema50) {
    sellVotes++;
    confirmationNames.push("Trend");
    reasons.push("روند کوتاه‌مدت نزولی است.");
  }

  /* Multi timeframe */
  const higherBull =
    c5 > c15 &&
    c15 > c1h &&
    c1h >= c4h;

  const higherBear =
    c5 < c15 &&
    c15 < c1h &&
    c1h <= c4h;

  if (higherBull) {
    buyVotes++;
    confirmationNames.push("MTF");
    reasons.push("تایید چند تایم‌فریمی صعودی است.");
  }

  if (higherBear) {
    sellVotes++;
    confirmationNames.push("MTF");
    reasons.push("تایید چند تایم‌فریمی نزولی است.");
  }

  /* RSI */
  if (rsiValue >= 52 && rsiValue <= 72) {
    buyVotes++;
    confirmationNames.push("Momentum");
    reasons.push(
      `مومنتوم خرید مناسب است؛ RSI=${round(rsiValue, 1)}.`,
    );
  }

  if (rsiValue <= 48 && rsiValue >= 28) {
    sellVotes++;
    confirmationNames.push("Momentum");
    reasons.push(
      `مومنتوم فروش مناسب است؛ RSI=${round(rsiValue, 1)}.`,
    );
  }

  /* MACD */
  if (macdValue.histogram > 0) {
    buyVotes++;
    confirmationNames.push("MACD");
  }

  if (macdValue.histogram < 0) {
    sellVotes++;
    confirmationNames.push("MACD");
  }

  /* Candle */
  if (candle.bullish) {
    buyVotes++;
    confirmationNames.push("Candle");
    reasons.push("الگوی کندلی صعودی تایید شده است.");
  }

  if (candle.bearish) {
    sellVotes++;
    confirmationNames.push("Candle");
    reasons.push("الگوی کندلی نزولی تایید شده است.");
  }

  /* Structure */
  if (
    levels.resistance.length &&
    current > levels.resistance[levels.resistance.length - 1]
  ) {
    buyVotes++;
    confirmationNames.push("Structure");
    reasons.push("شکست ساختار مقاومتی مشاهده شد.");
  }

  if (
    levels.support.length &&
    current < levels.support[levels.support.length - 1]
  ) {
    sellVotes++;
    confirmationNames.push("Structure");
    reasons.push("شکست ساختار حمایتی مشاهده شد.");
  }

  const direction =
    buyVotes > sellVotes
      ? "BUY"
      : sellVotes > buyVotes
        ? "SELL"
        : null;

  const votes = Math.max(buyVotes, sellVotes);

  const score = clamp(
    50 + votes * 7,
    0,
    100,
  );

  return {
    direction,
    score: round(score, 0),
    confirmations: votes,
    confirmationNames: [
      ...new Set(confirmationNames),
    ],
    reasons,
    entry: current,
    session: getMarketSession(),
    support: levels.support,
    resistance: levels.resistance,
  };
}

/* =========================================================
   FIXED MONEY PLAN
   ========================================================= */

function calculateLevels(
  direction: Direction,
  entry: number,
): {
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
} {
  /*
    The requested money targets are stored independently.

    TP1:
      0.04 lot is closed.

    TP2:
      another 0.03 lot is closed.

    TP3:
      final 0.03 lot is closed.

    The exact price distance is calculated from the
    standard XAUUSD 100 oz contract model.

    0.01 lot = 1 oz
    0.04 lot = 4 oz
  */

  const tp1Distance =
    TP1_USD / (TP1_LOT * CONTRACT_SIZE);

  const tp2Distance =
    TP2_USD / (TP2_LOT * CONTRACT_SIZE);

  const tp3Distance =
    TP3_USD / (TP3_LOT * CONTRACT_SIZE);

  const slDistance =
    STOP_USD / (TOTAL_LOT * CONTRACT_SIZE);

  if (direction === "BUY") {
    return {
      stopLoss: entry - slDistance,
      tp1: entry + tp1Distance,
      tp2: entry + tp2Distance,
      tp3: entry + tp3Distance,
    };
  }

  return {
    stopLoss: entry + slDistance,
    tp1: entry - tp1Distance,
    tp2: entry - tp2Distance,
    tp3: entry - tp3Distance,
  };
}

const CONTRACT_SIZE = 100;

/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  text: string,
): Promise<{
  ok: boolean;
  messageId: number | null;
  error: string | null;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    return {
      ok: false,
      messageId: null,
      error:
        "TELEGRAM_BOT_TOKEN or TELEGRAM_SIGNAL_CHAT_ID is missing",
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        messageId: null,
        error:
          data?.description ||
          `Telegram HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      messageId:
        num(data?.result?.message_id) || null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      error:
        error instanceof Error
          ? error.message
          : "Telegram request failed",
    };
  }
}

/* =========================================================
   META
   ========================================================= */

function defaultState(
  entry: number,
  stopLoss: number,
): SignalState {
  return {
    tp1Hit: false,
    tp2Hit: false,
    tp3Hit: false,
    slHit: false,
    breakEvenArmed: false,
    breakEvenHit: false,
    closed: false,
    currentStop: stopLoss,
    remainingLot: TOTAL_LOT,
  };
}

function readMeta(
  raw: unknown,
  signal?: any,
): SignalMeta {
  const m = parseObject(raw);

  const direction: Direction =
    m.direction === "SELL" ? "SELL" : "BUY";

  const entry = num(
    m.entry ?? signal?.entry,
  );

  const calculated =
    entry > 0
      ? calculateLevels(direction, entry)
      : {
          stopLoss: num(signal?.stopLoss),
          tp1: 0,
          tp2: 0,
          tp3: 0,
        };

  const stateRaw = parseObject(m.state);

  return {
    version: num(m.version, 4),

    symbol: String(
      m.symbol || signal?.symbol || SYMBOL,
    ),

    direction,

    timeframe: normalizeTf(
      m.timeframe ||
        signal?.timeframe ||
        "1min",
    ),

    score: num(
      m.score ??
        signal?.confidence ??
        0,
    ),

    confirmations: num(
      m.confirmations ?? 0,
    ),

    confirmationNames:
      Array.isArray(m.confirmationNames)
        ? m.confirmationNames.map(String)
        : [],

    session:
      m.session ||
      getMarketSession(),

    entry,

    stopLoss:
      num(m.stopLoss) ||
      calculated.stopLoss,

    tp1:
      num(m.tp1) ||
      calculated.tp1,

    tp2:
      num(m.tp2) ||
      calculated.tp2,

    tp3:
      num(m.tp3) ||
      calculated.tp3,

    totalLot: TOTAL_LOT,
    tp1Lot: TP1_LOT,
    tp2Lot: TP2_LOT,
    tp3Lot: TP3_LOT,

    stopUsd: STOP_USD,
    tp1Usd: TP1_USD,
    tp2Usd: TP2_USD,
    tp3Usd: TP3_USD,

    /*
      Requested actual partial-close USD amounts.
      These are NOT the same as the signal distance.
    */

    tp1CloseUsd:
      num(m.tp1CloseUsd) ||
      TP1_USD * 4,

    tp2CloseUsd:
      num(m.tp2CloseUsd) ||
      TP2_USD * 3,

    tp3CloseUsd:
      num(m.tp3CloseUsd) ||
      TP3_USD * 3,

    remainingAfterTp1:
      REMAINING_AFTER_TP1,

    remainingAfterTp2:
      REMAINING_AFTER_TP2,

    remainingAfterTp3:
      REMAINING_AFTER_TP3,

    lastPrice: num(m.lastPrice),

    lastPriceAt:
      String(
        m.lastPriceAt ||
          new Date().toISOString(),
      ),

    usdToToman: num(m.usdToToman),

    usdToTomanAsOf:
      m.usdToTomanAsOf
        ? String(m.usdToTomanAsOf)
        : null,

    usdToTomanDelayed:
      Boolean(m.usdToTomanDelayed),

    usdToTomanDelayedMinutes:
      m.usdToTomanDelayedMinutes != null
        ? num(m.usdToTomanDelayedMinutes)
        : null,

    state: {
      ...defaultState(
        entry,
        num(m.stopLoss) ||
          calculated.stopLoss,
      ),
      ...stateRaw,
      remainingLot:
        num(
          stateRaw.remainingLot,
          TOTAL_LOT,
        ),
      currentStop:
        num(
          stateRaw.currentStop,
          num(m.stopLoss) ||
            calculated.stopLoss,
        ),
    },

    events: Array.isArray(m.events)
      ? m.events
      : [],

    telegramInitialSent:
      Boolean(m.telegramInitialSent),

    telegramInitialError:
      m.telegramInitialError
        ? String(m.telegramInitialError)
        : null,

    support: Array.isArray(m.support)
      ? m.support.map(num).filter((x) => x > 0)
      : [],

    resistance: Array.isArray(m.resistance)
      ? m.resistance
          .map(num)
          .filter((x) => x > 0)
      : [],

    reasons: Array.isArray(m.reasons)
      ? m.reasons.map(String)
      : [],

    engineLastRun:
      m.engineLastRun
        ? String(m.engineLastRun)
        : undefined,

    engineLastError:
      m.engineLastError
        ? String(m.engineLastError)
        : null,
  };
}

/* =========================================================
   EVENT HELPERS
   ========================================================= */

function eventExists(
  meta: SignalMeta,
  type: EventType,
): boolean {
  return meta.events.some(
    (event) => event.type === type,
  );
}

function eventPnl(
  type: EventType,
): {
  usd: number;
  lot: number;
} {
  switch (type) {
    case "TP1_HIT":
      return {
        usd: TP1_USD * 4,
        lot: TP1_LOT,
      };

    case "TP2_HIT":
      return {
        usd: TP2_USD * 3,
        lot: TP2_LOT,
      };

    case "TP3_HIT":
      return {
        usd: TP3_USD * 3,
        lot: TP3_LOT,
      };

    case "SL_HIT":
      return {
        usd: -STOP_USD,
        lot: TOTAL_LOT,
      };

    case "BREAKEVEN_HIT":
      return {
        usd: 0,
        lot: 0,
      };
  }
}

function makeEventText(
  signal: any,
  meta: SignalMeta,
  event: TelegramEvent,
): string {
  const typeNames: Record<EventType, string> = {
    TP1_HIT: "🎯 TP1 فعال شد",
    TP2_HIT: "🎯 TP2 فعال شد",
    TP3_HIT: "🏆 TP3 فعال شد",
    SL_HIT: "🛑 STOP LOSS فعال شد",
    BREAKEVEN_HIT: "🛡️ BREAK EVEN فعال شد",
  };

  const pnlSign =
    event.pnlUsd > 0 ? "+" : "";

  let extra = "";

  if (event.type === "TP1_HIT") {
    extra = `
🛡️ <b>حد ضرر باقی‌مانده‌ها به Entry منتقل شد</b>
📦 حجم باقی‌مانده: <b>0.06 LOT</b>
🔒 ریسک معامله: <b>Risk Free</b>`;
  }

  if (event.type === "TP2_HIT") {
    extra = `
📦 حجم باقی‌مانده: <b>0.03 LOT</b>`;
  }

  if (event.type === "TP3_HIT") {
    extra = `
🏁 معامله به طور کامل بسته شد
📦 حجم باقی‌مانده: <b>0.00 LOT</b>`;
  }

  if (event.type === "SL_HIT") {
    extra = `
⚠️ <b>معامله در حد ضرر بسته شد</b>
📊 این استاپ باید در کارنامه ثبت شود.`;
  }

  if (event.type === "BREAKEVEN_HIT") {
    extra = `
🛡️ قیمت پس از TP1 به Entry برگشت.
💰 سود TP1 حفظ شد و باقی حجم بدون ریسک بسته شد.`;
  }

  return `
<b>${typeNames[event.type]}</b>

🪙 نماد: <b>XAUUSD</b>
📈 جهت: <b>${meta.direction}</b>

💵 قیمت رویداد:
<b>${round(event.price, 2)}</b>

💰 سود/زیان این مرحله:
<b>${pnlSign}${round(event.pnlUsd, 2)} USD</b>

🇮🇷 تومان:
<b>${pnlSign}${round(event.pnlToman, 0)} تومان</b>

📦 حجم بسته‌شده:
<b>${event.lotClosed.toFixed(2)} LOT</b>

📦 حجم باقی‌مانده:
<b>${event.remainingLot.toFixed(2)} LOT</b>

💱 نرخ دلار:
<b>${round(event.usdToToman, 0)} تومان</b>

🕐 زمان ایران:
<b>${iranTime()}</b>

📊 Session:
<b>${esc(meta.session)}</b>

🆔 Signal:
<code>${esc(signal.id)}</code>
${extra}
`;
}

/* =========================================================
   TELEGRAM DELIVERY
   ========================================================= */

async function deliverEvent(
  signal: any,
  meta: SignalMeta,
  event: TelegramEvent,
): Promise<void> {
  const text = makeEventText(
    signal,
    meta,
    event,
  );

  const result = await sendTelegram(text);

  event.telegramSent = result.ok;
  event.telegramMessageId =
    result.messageId;

  event.telegramError =
    result.error;

  /*
    If the Prisma model has telegramDelivery,
    keep delivery history.
  */

  try {
    if ((prisma as any).telegramDelivery) {
      await (prisma as any).telegramDelivery.create(
        {
          data: {
            signalId: signal.id,
            eventType: event.type,
            status: result.ok
              ? "SENT"
              : "FAILED",
            messageId:
              result.messageId
                ? String(result.messageId)
                : null,
            message: text,
            error: result.error,
          },
        },
      );
    }
  } catch {
    /*
      Delivery logging must never break
      the actual trading signal engine.
    */
  }
}

/* =========================================================
   PERSIST SIGNAL
   ========================================================= */

async function saveSignal(
  signal: any,
  meta: SignalMeta,
  status?: string,
): Promise<void> {
  const data: any = {
    metadata: meta as any,
  };

  if (status) {
    data.status = status;
  }

  /*
    Important:
    Some Prisma schemas use Json metadata.
    The cast keeps this route compatible
    with the existing TradingSignal model.
  */

  await prisma.tradingSignal.update({
    where: {
      id: signal.id,
    },
    data,
  });
}

/* =========================================================
   MONITOR ONE SIGNAL
   ========================================================= */

async function monitorSignal(
  signal: any,
  fxRate: Awaited<
    ReturnType<typeof getUsdToman>
  >,
): Promise<{
  changed: boolean;
  event?: EventType;
}> {
  const meta = readMeta(
    signal.metadata,
    signal,
  );

  try {
    const market =
      await getLivePrice(TD_SYMBOL);

    const price = market.price;

    meta.lastPrice = price;
    meta.lastPriceAt = market.asOf;

    meta.session =
      getMarketSession();

    meta.usdToToman =
      fxRate.rate;

    meta.usdToTomanAsOf =
      fxRate.asOf;

    meta.usdToTomanDelayed =
      fxRate.delayed;

    meta.usdToTomanDelayedMinutes =
      fxRate.delayedMinutes;

    meta.engineLastRun =
      new Date().toISOString();

    /*
      Recover levels for old signals that were
      created before the new metadata structure.
    */

    if (
      meta.entry > 0 &&
      (
        meta.stopLoss <= 0 ||
        meta.tp1 <= 0 ||
        meta.tp2 <= 0 ||
        meta.tp3 <= 0
      )
    ) {
      const levels =
        calculateLevels(
          meta.direction,
          meta.entry,
        );

      meta.stopLoss =
        meta.stopLoss > 0
          ? meta.stopLoss
          : levels.stopLoss;

      meta.tp1 =
        meta.tp1 > 0
          ? meta.tp1
          : levels.tp1;

      meta.tp2 =
        meta.tp2 > 0
          ? meta.tp2
          : levels.tp2;

      meta.tp3 =
        meta.tp3 > 0
          ? meta.tp3
          : levels.tp3;
    }

    /*
      CURRENT STOP

      Before TP1:
        initial SL

      After TP1:
        Entry

      This is the important Risk-Free mechanism.
    */

    const currentStop =
      meta.state.breakEvenArmed
        ? meta.entry
        : meta.stopLoss;

    meta.state.currentStop =
      currentStop;

    /*
      BUY / SELL event detection
    */

    const isBuy =
      meta.direction === "BUY";

    /*
      STOP LOSS HAS PRIORITY.

      We do not invent an intrabar sequence.
      If current real price reaches SL,
      it is registered immediately.
    */

    const stopHit =
      isBuy
        ? price <= currentStop
        : price >= currentStop;

    if (
      stopHit &&
      !meta.state.closed
    ) {
      const isBreakEven =
        meta.state.breakEvenArmed &&
        !meta.state.slHit;

      if (
        isBreakEven &&
        !meta.state.breakEvenHit
      ) {
        const event: TelegramEvent = {
          type: "BREAKEVEN_HIT",
          at: new Date().toISOString(),
          price,
          pnlUsd: 0,
          pnlToman: 0,
          lotClosed: 0,
          remainingLot:
            meta.state.remainingLot,
          usdToToman: fxRate.rate,
          telegramSent: false,
          telegramMessageId: null,
          telegramError: null,
        };

        meta.events.push(event);

        meta.state.breakEvenHit = true;
        meta.state.closed = true;

        await saveSignal(
          signal,
          meta,
          "CLOSED",
        );

        await deliverEvent(
          signal,
          meta,
          event,
        );

        await saveSignal(
          signal,
          meta,
          "CLOSED",
        );

        return {
          changed: true,
          event: "BREAKEVEN_HIT",
        };
      }

      if (!meta.state.slHit) {
        const pnl =
          eventPnl("SL_HIT");

        const pnlToman =
          fxRate.rate > 0
            ? pnl.usd * fxRate.rate
            : 0;

        const event: TelegramEvent = {
          type: "SL_HIT",
          at: new Date().toISOString(),
          price,
          pnlUsd: -Math.abs(pnl.usd),
          pnlToman:
            -Math.abs(pnlToman),
          lotClosed:
            meta.state.remainingLot,
          remainingLot: 0,
          usdToToman:
            fxRate.rate,
          telegramSent: false,
          telegramMessageId: null,
          telegramError: null,
        };

        meta.events.push(event);

        meta.state.slHit = true;
        meta.state.closed = true;
        meta.state.remainingLot = 0;
        meta.state.currentStop =
          meta.stopLoss;

        await saveSignal(
          signal,
          meta,
          "CLOSED",
        );

        await deliverEvent(
          signal,
          meta,
          event,
        );

        await saveSignal(
          signal,
          meta,
          "CLOSED",
        );

        return {
          changed: true,
          event: "SL_HIT",
        };
      }
    }

    /*
      TP1
    */

    const tp1Hit =
      isBuy
        ? price >= meta.tp1
        : price <= meta.tp1;

    if (
      tp1Hit &&
      !meta.state.tp1Hit &&
      !meta.state.closed
    ) {
      const pnl =
        eventPnl("TP1_HIT");

      const pnlToman =
        fxRate.rate > 0
          ? pnl.usd * fxRate.rate
          : 0;

      const event: TelegramEvent = {
        type: "TP1_HIT",
        at: new Date().toISOString(),
        price,
        pnlUsd: pnl.usd,
        pnlToman,
        lotClosed: TP1_LOT,
        remainingLot:
          REMAINING_AFTER_TP1,
        usdToToman:
          fxRate.rate,
        telegramSent: false,
        telegramMessageId: null,
        telegramError: null,
      };

      meta.events.push(event);

      meta.state.tp1Hit = true;

      /*
        IMMEDIATELY ARM BREAK EVEN
      */

      meta.state.breakEvenArmed = true;
      meta.state.currentStop =
        meta.entry;

      meta.state.remainingLot =
        REMAINING_AFTER_TP1;

      await saveSignal(
        signal,
        meta,
        "TP1_HIT",
      );

      await deliverEvent(
        signal,
        meta,
        event,
      );

      await saveSignal(
        signal,
        meta,
        "TP1_HIT",
      );

      return {
        changed: true,
        event: "TP1_HIT",
      };
    }

    /*
      TP2
    */

    const tp2Hit =
      isBuy
        ? price >= meta.tp2
        : price <= meta.tp2;

    if (
      tp2Hit &&
      meta.state.tp1Hit &&
      !meta.state.tp2Hit &&
      !meta.state.closed
    ) {
      const pnl =
        eventPnl("TP2_HIT");

      const pnlToman =
        fxRate.rate > 0
          ? pnl.usd * fxRate.rate
          : 0;

      const event: TelegramEvent = {
        type: "TP2_HIT",
        at: new Date().toISOString(),
        price,
        pnlUsd: pnl.usd,
        pnlToman,
        lotClosed: TP2_LOT,
        remainingLot:
          REMAINING_AFTER_TP2,
        usdToToman:
          fxRate.rate,
        telegramSent: false,
        telegramMessageId: null,
        telegramError: null,
      };

      meta.events.push(event);

      meta.state.tp2Hit = true;

      meta.state.remainingLot =
        REMAINING_AFTER_TP2;

      await saveSignal(
        signal,
        meta,
        "TP2_HIT",
      );

      await deliverEvent(
        signal,
        meta,
        event,
      );

      await saveSignal(
        signal,
        meta,
        "TP2_HIT",
      );

      return {
        changed: true,
        event: "TP2_HIT",
      };
    }

    /*
      TP3
    */

    const tp3Hit =
      isBuy
        ? price >= meta.tp3
        : price <= meta.tp3;

    if (
      tp3Hit &&
      meta.state.tp2Hit &&
      !meta.state.tp3Hit &&
      !meta.state.closed
    ) {
      const pnl =
        eventPnl("TP3_HIT");

      const pnlToman =
        fxRate.rate > 0
          ? pnl.usd * fxRate.rate
          : 0;

      const event: TelegramEvent = {
        type: "TP3_HIT",
        at: new Date().toISOString(),
        price,
        pnlUsd: pnl.usd,
        pnlToman,
        lotClosed: TP3_LOT,
        remainingLot: 0,
        usdToToman:
          fxRate.rate,
        telegramSent: false,
        telegramMessageId: null,
        telegramError: null,
      };

      meta.events.push(event);

      meta.state.tp3Hit = true;
      meta.state.remainingLot = 0;
      meta.state.closed = true;

      await saveSignal(
        signal,
        meta,
        "CLOSED",
      );

      await deliverEvent(
        signal,
        meta,
        event,
      );

      await saveSignal(
        signal,
        meta,
        "CLOSED",
      );

      return {
        changed: true,
        event: "TP3_HIT",
      };
    }

    /*
      Persist current price even when no event occurred.
      This is what keeps the dashboard alive.
    */

    await saveSignal(
      signal,
      meta,
    );

    return {
      changed: false,
    };
  } catch (error) {
    meta.engineLastError =
      error instanceof Error
        ? error.message
        : "Monitor failed";

    try {
      await saveSignal(
        signal,
        meta,
      );
    } catch {
      /* ignore secondary persistence error */
    }

    return {
      changed: false,
    };
  }
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function calculatePerformance(
  signals: any[],
): {
  trades: number;
  wins: number;
  losses: number;
  stops: number;
  tp1: number;
  tp2: number;
  tp3: number;
  breakevens: number;
  grossUsd: number;
  grossToman: number;
  winRate: number;
} {
  let trades = 0;
  let wins = 0;
  let losses = 0;
  let stops = 0;
  let tp1 = 0;
  let tp2 = 0;
  let tp3 = 0;
  let breakevens = 0;

  let grossUsd = 0;
  let grossToman = 0;

  for (const signal of signals) {
    const meta = readMeta(
      signal.metadata,
      signal,
    );

    const events =
      Array.isArray(meta.events)
        ? meta.events
        : [];

    if (!events.length) continue;

    trades++;

    let tradeProfit = 0;
    let hasTp = false;
    let hasSl = false;

    for (const event of events) {
      tradeProfit += num(
        event.pnlUsd,
      );

      grossToman += num(
        event.pnlToman,
      );

      if (event.type === "TP1_HIT") {
        tp1++;
        hasTp = true;
      }

      if (event.type === "TP2_HIT") {
        tp2++;
        hasTp = true;
      }

      if (event.type === "TP3_HIT") {
        tp3++;
        hasTp = true;
      }

      if (event.type === "SL_HIT") {
        stops++;
        hasSl = true;
      }

      if (
        event.type === "BREAKEVEN_HIT"
      ) {
        breakevens++;
      }
    }

    grossUsd += tradeProfit;

    /*
      A trade is considered successful
      when at least one TP has actually
      been registered.
    */

    if (hasTp) {
      wins++;
    } else if (hasSl) {
      losses++;
    }
  }

  return {
    trades,
    wins,
    losses,
    stops,
    tp1,
    tp2,
    tp3,
    breakevens,
    grossUsd: round(grossUsd, 2),
    grossToman: round(grossToman, 0),
    winRate:
      trades > 0
        ? round(
            (wins / trades) * 100,
            1,
          )
        : 0,
  };
}

/* =========================================================
   TELEGRAM INITIAL SIGNAL
   ========================================================= */

async function sendInitialSignal(
  signal: any,
  meta: SignalMeta,
  fxRate: Awaited<
    ReturnType<typeof getUsdToman>
  >,
): Promise<void> {
  const telegramText = `
<b>🤖 AI GOLD SIGNAL</b>

⚠️ <b>این تحلیل توسط هوش مصنوعی تولید شده است.</b>

🪙 نماد:
<b>XAUUSD</b>

📈 جهت:
<b>${meta.direction}</b>

🎯 Entry:
<b>${round(meta.entry, 2)}</b>

🛑 Stop Loss:
<b>${round(meta.stopLoss, 2)}</b>

🎯 TP1:
<b>${round(meta.tp1, 2)}</b>
📦 بستن:
<b>0.04 LOT</b>

🎯 TP2:
<b>${round(meta.tp2, 2)}</b>
📦 بستن:
<b>0.03 LOT</b>

🏆 TP3:
<b>${round(meta.tp3, 2)}</b>
📦 بستن:
<b>0.03 LOT</b>

📦 حجم کل:
<b>0.10 LOT</b>

💰 برنامه سود:
TP1: <b>+${
    meta.tp1CloseUsd
  } USD</b>

TP2: <b>+${
    meta.tp2CloseUsd
  } USD</b>

TP3: <b>+${
    meta.tp3CloseUsd
  } USD</b>

🛡️ بعد از TP1:
<b>حد ضرر باقی‌مانده‌ها روی Entry قرار می‌گیرد.</b>

📊 Score:
<b>${meta.score}/100</b>

🧠 Confirmations:
<b>${meta.confirmations}</b>

🌐 Session:
<b>${esc(meta.session)}</b>

💱 USD/IRT:
<b>${
    fxRate.rate > 0
      ? `${round(fxRate.rate, 0)} تومان`
      : "در دسترس نیست"
  }</b>

🕐 زمان:
<b>${iranTime()}</b>

🔐 Signal ID:
<code>${esc(signal.id)}</code>
`;

  const result =
    await sendTelegram(
      telegramText,
    );

  meta.telegramInitialSent =
    result.ok;

  meta.telegramInitialError =
    result.error;

  if (result.ok) {
    try {
      if (
        (prisma as any)
          .telegramDelivery
      ) {
        await (
          prisma as any
        ).telegramDelivery.create({
          data: {
            signalId: signal.id,
            eventType: "SIGNAL",
            status: "SENT",
            messageId:
              result.messageId
                ? String(
                    result.messageId,
                  )
                : null,
            message: telegramText,
            error: null,
          },
        });
      }
    } catch {
      /* ignore */
    }
  }
}

/* =========================================================
   SCAN USER
   ========================================================= */

async function scanUser(
  userId: string,
  fxRate: Awaited<
    ReturnType<typeof getUsdToman>
  >,
): Promise<any | null> {
  const bots =
    await prisma.tradingBot.findMany({
      where: {
        userId,
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
            "GOLD",
          ],
        },
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!bots.length) {
    return null;
  }

  /*
    Do not create duplicate active signals.
  */

  const existing =
    await prisma.tradingSignal.findFirst({
      where: {
        userId,
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
            "GOLD",
          ],
        },
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (existing) {
    return null;
  }

  const analysis =
    await analyze(
      TD_SYMBOL,
      "1min",
    );

  if (!analysis.direction) {
    return null;
  }

  if (
    analysis.score < MIN_SCORE ||
    analysis.confirmations <
      MIN_CONFIRMATIONS
  ) {
    return null;
  }

  const bot = bots[0];

  if (
    analysis.direction === "BUY" &&
    bot.buyEnabled === false
  ) {
    return null;
  }

  if (
    analysis.direction === "SELL" &&
    bot.sellEnabled === false
  ) {
    return null;
  }

  const entry =
    analysis.entry;

  const levels =
    calculateLevels(
      analysis.direction,
      entry,
    );

  const meta: SignalMeta = {
    version: 4,

    symbol: SYMBOL,
    direction:
      analysis.direction,

    timeframe: "1min",

    score: analysis.score,

    confirmations:
      analysis.confirmations,

    confirmationNames:
      analysis.confirmationNames,

    session:
      analysis.session,

    entry,

    stopLoss:
      levels.stopLoss,

    tp1:
      levels.tp1,

    tp2:
      levels.tp2,

    tp3:
      levels.tp3,

    totalLot: TOTAL_LOT,

    tp1Lot: TP1_LOT,
    tp2Lot: TP2_LOT,
    tp3Lot: TP3_LOT,

    stopUsd: STOP_USD,
    tp1Usd: TP1_USD,
    tp2Usd: TP2_USD,
    tp3Usd: TP3_USD,

    /*
      User requested:
      0.04 => 4 x $5 = $20
      0.03 => 3 x $8 = $24
      0.03 => 3 x $12 = $36
    */

    tp1CloseUsd:
      TP1_USD * 4,

    tp2CloseUsd:
      TP2_USD * 3,

    tp3CloseUsd:
      TP3_USD * 3,

    remainingAfterTp1:
      REMAINING_AFTER_TP1,

    remainingAfterTp2:
      REMAINING_AFTER_TP2,

    remainingAfterTp3:
      REMAINING_AFTER_TP3,

    lastPrice:
      entry,

    lastPriceAt:
      new Date().toISOString(),

    usdToToman:
      fxRate.rate,

    usdToTomanAsOf:
      fxRate.asOf,

    usdToTomanDelayed:
      fxRate.delayed,

    usdToTomanDelayedMinutes:
      fxRate.delayedMinutes,

    state:
      defaultState(
        entry,
        levels.stopLoss,
      ),

    events: [],

    telegramInitialSent:
      false,

    telegramInitialError:
      null,

    support:
      analysis.support,

    resistance:
      analysis.resistance,

    reasons:
      analysis.reasons,

    engineLastRun:
      new Date().toISOString(),

    engineLastError:
      null,
  };

  const signal =
    await prisma.tradingSignal.create({
      data: {
        userId,
        symbol: SYMBOL,
        direction:
          analysis.direction,
        timeframe: "1min",
        entry,
        stopLoss:
          levels.stopLoss,
        takeProfit:
          levels.tp3,
        confidence:
          analysis.score,
        status: "ACTIVE",
        metadata: meta as any,
        telegramSent: false,
      } as any,
    });

  await sendInitialSignal(
    signal,
    meta,
    fxRate,
  );

  const updateData: any = {
    metadata: meta as any,
    telegramSent:
      meta.telegramInitialSent,
  };

  if (
    meta.telegramInitialSent &&
    (prisma.tradingSignal as any)
  ) {
    /*
      telegramMessageId is optional in
      some schemas. Do not make the
      entire signal creation fail if
      it doesn't exist.
    */
  }

  await prisma.tradingSignal.update({
    where: {
      id: signal.id,
    },
    data: updateData,
  });

  return {
    ...signal,
    metadata: meta,
  };
}

/* =========================================================
   MONITOR ALL
   ========================================================= */

async function monitorAllSignals(
  fxRate: Awaited<
    ReturnType<typeof getUsdToman>
  >,
): Promise<{
  monitored: number;
  events: string[];
}> {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
            "GOLD",
          ],
        },
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 200,
    });

  let monitored = 0;
  const events: string[] = [];

  for (const signal of signals) {
    monitored++;

    const result =
      await monitorSignal(
        signal,
        fxRate,
      );

    if (result.event) {
      events.push(result.event);
    }
  }

  return {
    monitored,
    events,
  };
}

/* =========================================================
   RETRY UNSENT EVENTS
   ========================================================= */

async function retryUnsentEvents(
  fxRate: Awaited<
    ReturnType<typeof getUsdToman>
  >,
): Promise<number> {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
            "GOLD",
          ],
        },
        status: {
          in: [
            ...ACTIVE_STATUSES,
            "CLOSED",
          ],
        },
      },
      take: 200,
    });

  let retried = 0;

  for (const signal of signals) {
    const meta =
      readMeta(
        signal.metadata,
        signal,
      );

    for (const event of meta.events) {
      if (
        event.telegramSent !== true
      ) {
        event.usdToToman =
          fxRate.rate;

        event.pnlToman =
          event.pnlUsd *
          fxRate.rate;

        await deliverEvent(
          signal,
          meta,
          event,
        );

        retried++;
      }
    }

    await saveSignal(
      signal,
      meta,
    );
  }

  return retried;
}

/* =========================================================
   SERVER ENGINE
   ========================================================= */

async function runServerEngine() {
  const started =
    Date.now();

  const fxRate =
    await getUsdToman();

  /*
    First retry messages that failed
    previously.
  */

  const retried =
    await retryUnsentEvents(
      fxRate,
    );

  /*
    Then monitor active signals.
  */

  const monitor =
    await monitorAllSignals(
      fxRate,
    );

  /*
    Then look for new opportunities.
  */

  const users =
    await prisma.tradingBot.findMany({
      where: {
        isActive: true,
        symbol: {
          in: [
            "XAUUSD",
            "XAU/USD",
            "GOLD",
          ],
        },
      },
      select: {
        userId: true,
      },
      distinct: [
        "userId",
      ],
    });

  let created = 0;

  for (const user of users) {
    try {
      const signal =
        await scanUser(
          user.userId,
          fxRate,
        );

      if (signal) {
        created++;
      }
    } catch {
      /*
        One user's analysis failure
        must not stop all users.
      */
    }
  }

  const duration =
    Date.now() - started;

  return {
    ok: true,
    created,
    monitored:
      monitor.monitored,
    events:
      monitor.events,
    retried,
    usdToToman:
      fxRate.rate,
    usdToTomanAsOf:
      fxRate.asOf,
    usdToTomanDelayed:
      fxRate.delayed,
    usdToTomanDelayedMinutes:
      fxRate.delayedMinutes,
    usdToTomanError:
      fxRate.error,
    durationMs:
      duration,
    at:
      new Date().toISOString(),
  };
}

/* =========================================================
   CRON SECURITY
   ========================================================= */

function validCronRequest(
  request: NextRequest,
): boolean {
  const url =
    new URL(request.url);

  if (
    url.searchParams.get("cron") ===
    "1"
  ) {
    return true;
  }

  const configured =
    process.env.SIGNALS_CRON_SECRET ||
    process.env.AI_CRON_SECRET ||
    process.env.NEWS_CRON_SECRET;

  if (!configured) {
    return false;
  }

  const received =
    request.headers.get(
      "x-signals-cron-secret",
    ) ||
    request.headers.get(
      "x-ai-cron-secret",
    ) ||
    request.headers.get(
      "x-cron-secret",
    );

  return (
    Boolean(received) &&
    received === configured
  );
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    /*
      SERVER / CRON ENGINE

      This path does NOT require a user session.
    */

    if (
      validCronRequest(request)
    ) {
      const engine =
        await runServerEngine();

      return NextResponse.json(
        engine,
        {
          status: 200,
          headers: {
            "cache-control":
              "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    /*
      USER AUTH

      IMPORTANT:
      getSession() in this project
      returns { id, userId }.

      It does NOT return:
        session.user

      Therefore:
        session?.userId
      is used here.
    */

    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "UNAUTHORIZED",
        },
        {
          status: 401,
        },
      );
    }

    /*
      Run monitoring during normal
      dashboard/API requests too.

      This gives an extra safety layer
      even if a scheduler is delayed.
    */

    const fxRate =
      await getUsdToman();

    const url =
      new URL(request.url);

    const scan =
      url.searchParams.get(
        "scan",
      ) === "1";

    const monitor =
      await prisma.tradingSignal.findMany(
        {
          where: {
            userId:
              session.userId,
            symbol: {
              in: [
                "XAUUSD",
                "XAU/USD",
                "GOLD",
              ],
            },
            status: {
              in: ACTIVE_STATUSES,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 50,
        },
      );

    const monitorEvents: string[] =
      [];

    for (const signal of monitor) {
      const result =
        await monitorSignal(
          signal,
          fxRate,
        );

      if (result.event) {
        monitorEvents.push(
          result.event,
        );
      }
    }

    /*
      Manual scan.
    */

    let createdSignal = null;

    if (scan) {
      try {
        createdSignal =
          await scanUser(
            session.userId,
            fxRate,
          );
      } catch {
        createdSignal = null;
      }
    }

    /*
      Get latest signals.
    */

    const signals =
      await prisma.tradingSignal.findMany(
        {
          where: {
            userId:
              session.userId,
            symbol: {
              in: [
                "XAUUSD",
                "XAU/USD",
                "GOLD",
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },
      );

    let livePrice = 0;
    let livePriceSource = "";
    let livePriceAt = "";

    try {
      const market =
        await getLivePrice(
          TD_SYMBOL,
        );

      livePrice =
        market.price;

      livePriceSource =
        market.source;

      livePriceAt =
        market.asOf;
    } catch {
      livePrice = 0;
    }

    const performance =
      calculatePerformance(
        signals,
      );

    /*
      Current active signal.
    */

    const active =
      signals.find(
        (signal) =>
          ACTIVE_STATUSES.includes(
            String(signal.status),
          ),
      ) || null;

    const latest =
      signals[0] || null;

    const activeMeta =
      active
        ? readMeta(
            active.metadata,
            active,
          )
        : null;

    const latestMeta =
      latest
        ? readMeta(
            latest.metadata,
            latest,
          )
        : null;

    /*
      Overall response.
    */

    return NextResponse.json(
      {
        ok: true,

        symbol: SYMBOL,

        market: {
          symbol: SYMBOL,
          price: livePrice,
          priceSource:
            livePriceSource,
          priceAt:
            livePriceAt,
          session:
            getMarketSession(),
        },

        usdToToman: {
          rate:
            fxRate.rate,
          asOf:
            fxRate.asOf,
          delayed:
            fxRate.delayed,
          delayedMinutes:
            fxRate.delayedMinutes,
          source:
            fxRate.source,
          error:
            fxRate.error,
        },

        plan: {
          totalLot:
            TOTAL_LOT,

          stopLossUsd:
            STOP_USD,

          tp1: {
            lot: TP1_LOT,
            baseUsd:
              TP1_USD,
            closeUsd:
              TP1_USD * 4,
            remainingLot:
              REMAINING_AFTER_TP1,
          },

          tp2: {
            lot: TP2_LOT,
            baseUsd:
              TP2_USD,
            closeUsd:
              TP2_USD * 3,
            remainingLot:
              REMAINING_AFTER_TP2,
          },

          tp3: {
            lot: TP3_LOT,
            baseUsd:
              TP3_USD,
            closeUsd:
              TP3_USD * 3,
            remainingLot:
              REMAINING_AFTER_TP3,
          },

          breakEvenAfterTp1:
            true,
        },

        active:
          active
            ? {
                ...active,
                metadata:
                  activeMeta,
              }
            : null,

        latest:
          latest
            ? {
                ...latest,
                metadata:
                  latestMeta,
              }
            : null,

        signals,

        performance: {
          ...performance,
          stopLosses:
            performance.stops,
        },

        engine: {
          monitorEvents,
          monitored:
            monitor.length,
          lastRun:
            new Date().toISOString(),
        },

        createdSignal:
          createdSignal
            ? {
                ...createdSignal,
                metadata:
                  parseObject(
                    createdSignal.metadata,
                  ),
              }
            : null,
      },
      {
        status: 200,
        headers: {
          "cache-control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "[AI_ANALYSIS_ERROR]",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI analysis engine failed",
      },
      {
        status: 500,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }
}
