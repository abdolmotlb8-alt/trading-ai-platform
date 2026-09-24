import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   XAUUSD AI ANALYSIS ENGINE
   =========================================================

   معامله پایه:
   Total lot: 0.10

   TP1:
   0.04 lot
   +$5 per 0.01 lot
   => +$20

   TP2:
   0.03 lot
   +$8 per 0.01 lot
   => +$24

   TP3:
   0.03 lot
   +$12 per 0.01 lot
   => +$36

   Full TP:
   $20 + $24 + $36 = $80

   بعد از TP1:
   0.06 lot باقی می‌ماند
   Stop Loss -> Entry
   ========================================================= */


/* =========================================================
   CONSTANTS
   ========================================================= */

const SYMBOL = "XAUUSD";
const TD_SYMBOL = "XAU/USD";
const TD_BASE = "https://api.twelvedata.com";
const NETARZ_BASE = "https://netarz.ir/api/fx/v1";

const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const REMAINING_AFTER_TP1 = 0.06;

const CONTRACT_SIZE = 100;

/*
 * TP values are PER 0.01 LOT.
 */
const TP1_PER_001_LOT_USD = 5;
const TP2_PER_001_LOT_USD = 8;
const TP3_PER_001_LOT_USD = 12;

/*
 * Therefore:
 *
 * TP1 = 5 * 4 = $20
 * TP2 = 8 * 3 = $24
 * TP3 = 12 * 3 = $36
 */
const TP1_TOTAL_USD = TP1_PER_001_LOT_USD * 4;
const TP2_TOTAL_USD = TP2_PER_001_LOT_USD * 3;
const TP3_TOTAL_USD = TP3_PER_001_LOT_USD * 3;

const FULL_TP_USD =
  TP1_TOTAL_USD +
  TP2_TOTAL_USD +
  TP3_TOTAL_USD;

/*
 * Initial SL remains $4 TOTAL for 0.10 lot.
 *
 * 0.10 lot = 10 oz
 * $4 / 10 = $0.40 price movement
 */
const INITIAL_SL_TOTAL_USD = 4;

const MIN_SCORE = 60;
const MIN_CONFIRMATIONS = 2;

const ACTIVE_STATUSES = [
  "WAITING",
  "ACTIVE",
  "TP1_HIT",
  "TP2_HIT",
];

const CLOSED_STATUSES = [
  "SL_HIT",
  "BREAKEVEN",
  "TP3_HIT",
  "CLOSED",
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
  | "OVERLAP"
  | "CLOSED";

type EventType =
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "BREAKEVEN_HIT";

type TelegramState = {
  status: "PENDING" | "SENT" | "FAILED";
  messageId?: number | null;
  sentAt?: string | null;
  error?: string | null;
  attempts?: number;
};

type EventRecord = {
  id: string;
  type: EventType;
  createdAt: string;

  price: number;

  pnlUsd: number;
  pnlToman: number | null;

  usdToToman: number | null;

  telegram: TelegramState;
};

type SignalState = {
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;

  slHit: boolean;
  breakevenHit: boolean;

  breakEvenArmed: boolean;

  closed: boolean;

  currentStopLoss: number;

  remainingLot: number;

  realizedPnlUsd: number;

  realizedPnlToman: number | null;

  events: EventRecord[];

  lastCheckedAt?: string;
};

type SignalMeta = {
  version: number;

  symbol: string;

  direction: Direction;

  timeframe: string;

  session: MarketSession;

  score: number;

  confirmations: number;

  reasons: string[];

  entry: number;

  stopLoss: number;

  tp1: number;

  tp2: number;

  tp3: number;

  initialStopLoss: number;

  currentStopLoss: number;

  totalLot: number;

  tp1Lot: number;

  tp2Lot: number;

  tp3Lot: number;

  remainingLot: number;

  tp1Per001LotUsd: number;
  tp2Per001LotUsd: number;
  tp3Per001LotUsd: number;

  tp1TotalUsd: number;
  tp2TotalUsd: number;
  tp3TotalUsd: number;

  fullTpUsd: number;

  usdToToman: number | null;
  usdToTomanAsOf: string | null;
  usdToTomanDelayed: boolean;
  usdToTomanDelayedMinutes: number | null;

  lastPrice: number;

  lastPriceSource?: string;

  state: SignalState;

  telegramInitial?: TelegramState;

  createdAt?: string;

  updatedAt?: string;
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

function round(value: number, digits = 2): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeSymbol(value: unknown): string {
  return String(value ?? "")
    .replace("/", "")
    .replace("-", "")
    .replace("_", "")
    .toUpperCase();
}

function normalizeTimeframe(value: unknown): string {
  const tf = String(value ?? "1min").toLowerCase();

  if (tf === "1m") return "1min";
  if (tf === "5m") return "5min";
  if (tf === "15m") return "15min";
  if (tf === "30m") return "30min";
  if (tf === "1h") return "1h";
  if (tf === "4h") return "4h";
  if (tf === "1d") return "1day";

  return tf;
}

function isoNow(): string {
  return new Date().toISOString();
}

function iranTime(): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
}


/* =========================================================
   MARKET SESSION
   IMPORTANT:
   This is NOT getSession().
   Auth getSession() comes from "@/lib/session".
   ========================================================= */

function getMarketSession(): MarketSession {
  const now = new Date();

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );

  /*
   * Approximate major forex/gold sessions in UTC.
   */

  const tokyo =
    hour >= 0 && hour < 8;

  const london =
    hour >= 7 && hour < 16;

  const newYork =
    hour >= 13 && hour < 22;

  const sydney =
    hour >= 21 || hour < 6;

  if (london && newYork) {
    return "OVERLAP";
  }

  if (newYork) {
    return "NEW_YORK";
  }

  if (london) {
    return "LONDON";
  }

  if (tokyo) {
    return "TOKYO";
  }

  if (sydney) {
    return "SYDNEY";
  }

  return "CLOSED";
}


/* =========================================================
   TWELVE DATA
   ========================================================= */

async function tdRequest(
  endpoint: string,
  params: Record<string, string>,
): Promise<any> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY is not configured",
    );
  }

  const url = new URL(`${TD_BASE}${endpoint}`);

  Object.entries({
    ...params,
    apikey: apiKey,
  }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `Twelve Data HTTP ${response.status}`,
    );
  }

  const data = await response.json();

  if (
    data?.status === "error" ||
    data?.code === 400 ||
    data?.message
  ) {
    throw new Error(
      String(
        data?.message ||
        data?.status ||
        "Twelve Data error",
      ),
    );
  }

  return data;
}


/* =========================================================
   LIVE PRICE
   ========================================================= */

async function getLivePrice(): Promise<{
  price: number;
  source: string;
  datetime: string | null;
}> {
  try {
    const data = await tdRequest("/price", {
      symbol: TD_SYMBOL,
      dp: "5",
    });

    const price = num(data?.price);

    if (price > 0) {
      return {
        price,
        source: "Twelve Data /price",
        datetime: null,
      };
    }
  } catch {
    /*
     * Fallback below.
     */
  }

  const fallback = await getCandles(
    TD_SYMBOL,
    "1min",
    2,
  );

  if (!fallback.length) {
    throw new Error(
      "Unable to obtain XAUUSD price",
    );
  }

  return {
    price: fallback[0].close,
    source: "Twelve Data /time_series fallback",
    datetime: fallback[0].datetime,
  };
}


/* =========================================================
   CANDLES
   ========================================================= */

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 220,
): Promise<Candle[]> {
  const data = await tdRequest("/time_series", {
    symbol,
    interval: normalizeTimeframe(interval),
    outputsize: String(outputsize),
    order: "desc",
    timezone: "UTC",
  });

  if (!Array.isArray(data?.values)) {
    return [];
  }

  return data.values
    .map((item: any): Candle => ({
      datetime: String(item?.datetime ?? ""),
      open: num(item?.open),
      high: num(item?.high),
      low: num(item?.low),
      close: num(item?.close),
      volume:
        item?.volume == null
          ? undefined
          : num(item.volume),
    }))
    .filter(
      (candle: Candle) =>
        candle.close > 0 &&
        candle.high > 0 &&
        candle.low > 0,
    );
}


/* =========================================================
   INDICATORS
   ========================================================= */

function ema(
  values: number[],
  period: number,
): number[] {
  if (!values.length) return [];

  const multiplier = 2 / (period + 1);

  const result: number[] = [];

  let previous = values[0];

  result.push(previous);

  for (let i = 1; i < values.length; i++) {
    previous =
      (values[i] - previous) * multiplier +
      previous;

    result.push(previous);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14,
): number {
  if (values.length <= period) {
    return 50;
  }

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const change =
      values[i] - values[i - 1];

    if (change >= 0) {
      gain += change;
    } else {
      loss += Math.abs(change);
    }
  }

  gain /= period;
  loss /= period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] - values[i - 1];

    const currentGain =
      change > 0 ? change : 0;

    const currentLoss =
      change < 0 ? Math.abs(change) : 0;

    gain =
      (gain * (period - 1) +
        currentGain) /
      period;

    loss =
      (loss * (period - 1) +
        currentLoss) /
      period;
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

  return avg(trs.slice(-period));
}

function macd(
  values: number[],
): {
  macd: number;
  signal: number;
  histogram: number;
} {
  if (values.length < 30) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
    };
  }

  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);

  const line = values.map(
    (_, index) =>
      ema12[index] - ema26[index],
  );

  const signalLine = ema(line, 9);

  const m =
    line[line.length - 1] ?? 0;

  const s =
    signalLine[signalLine.length - 1] ?? 0;

  return {
    macd: m,
    signal: s,
    histogram: m - s,
  };
}

function averageVolume(
  candles: Candle[],
  period = 20,
): number {
  const values = candles
    .slice(-period)
    .map((candle) =>
      num(candle.volume),
    )
    .filter((value) => value > 0);

  return avg(values);
}

function candlePattern(
  candle: Candle,
): {
  bullish: boolean;
  bearish: boolean;
  name: string;
} {
  const body =
    candle.close - candle.open;

  const range =
    candle.high - candle.low;

  if (range <= 0) {
    return {
      bullish: false,
      bearish: false,
      name: "NONE",
    };
  }

  const bodyRatio =
    Math.abs(body) / range;

  const upper =
    candle.high -
    Math.max(
      candle.open,
      candle.close,
    );

  const lower =
    Math.min(
      candle.open,
      candle.close,
    ) - candle.low;

  if (
    body > 0 &&
    bodyRatio > 0.55
  ) {
    return {
      bullish: true,
      bearish: false,
      name: "BULLISH_BODY",
    };
  }

  if (
    body < 0 &&
    bodyRatio > 0.55
  ) {
    return {
      bullish: false,
      bearish: true,
      name: "BEARISH_BODY",
    };
  }

  if (
    lower > Math.abs(body) * 1.5 &&
    upper < range * 0.3
  ) {
    return {
      bullish: true,
      bearish: false,
      name: "BULLISH_REJECTION",
    };
  }

  if (
    upper > Math.abs(body) * 1.5 &&
    lower < range * 0.3
  ) {
    return {
      bullish: false,
      bearish: true,
      name: "BEARISH_REJECTION",
    };
  }

  return {
    bullish: false,
    bearish: false,
    name: "NEUTRAL",
  };
}

function recentHigh(
  candles: Candle[],
  count = 30,
): number {
  return Math.max(
    ...candles
      .slice(-count)
      .map((candle) => candle.high),
  );
}

function recentLow(
  candles: Candle[],
  count = 30,
): number {
  return Math.min(
    ...candles
      .slice(-count)
      .map((candle) => candle.low),
  );
}


/* =========================================================
   AI MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket(): Promise<{
  direction: Direction | null;
  score: number;
  confirmations: number;
  timeframe: string;
  reasons: string[];
}> {
  const [
    m1,
    m5,
    m15,
    h1,
    h4,
  ] = await Promise.all([
    getCandles(TD_SYMBOL, "1min", 220),
    getCandles(TD_SYMBOL, "5min", 220),
    getCandles(TD_SYMBOL, "15min", 220),
    getCandles(TD_SYMBOL, "1h", 220),
    getCandles(TD_SYMBOL, "4h", 220),
  ]);

  if (
    m1.length < 50 ||
    m5.length < 50 ||
    m15.length < 50 ||
    h1.length < 50
  ) {
    throw new Error(
      "Not enough market candles for analysis",
    );
  }

  const closes1 = m1.map(
    (c) => c.close,
  );

  const closes5 = m5.map(
    (c) => c.close,
  );

  const closes15 = m15.map(
    (c) => c.close,
  );

  const closes1h = h1.map(
    (c) => c.close,
  );

  const closes4h = h4.map(
    (c) => c.close,
  );

  const emaFast1 =
    ema(closes1, 20).at(-1) ?? 0;

  const emaSlow1 =
    ema(closes1, 50).at(-1) ?? 0;

  const emaFast5 =
    ema(closes5, 20).at(-1) ?? 0;

  const emaSlow5 =
    ema(closes5, 50).at(-1) ?? 0;

  const emaFast15 =
    ema(closes15, 20).at(-1) ?? 0;

  const emaSlow15 =
    ema(closes15, 50).at(-1) ?? 0;

  const emaFast1h =
    ema(closes1h, 20).at(-1) ?? 0;

  const emaSlow1h =
    ema(closes1h, 50).at(-1) ?? 0;

  const emaFast4h =
    ema(closes4h, 20).at(-1) ?? 0;

  const emaSlow4h =
    ema(closes4h, 50).at(-1) ?? 0;

  const rsi1 = rsi(closes1);
  const rsi5 = rsi(closes5);
  const rsi15 = rsi(closes15);

  const macd1 = macd(closes1);
  const macd5 = macd(closes5);

  const last1 =
    m1[m1.length - 1];

  const last5 =
    m5[m5.length - 1];

  const last15 =
    m15[m15.length - 1];

  const price =
    last1.close;

  let buyVotes = 0;
  let sellVotes = 0;

  const reasons: string[] = [];

  /*
   * 1. MTF trend
   */

  if (
    emaFast4h > emaSlow4h
  ) {
    buyVotes++;
    reasons.push(
      "روند H4 صعودی است",
    );
  } else if (
    emaFast4h < emaSlow4h
  ) {
    sellVotes++;
    reasons.push(
      "روند H4 نزولی است",
    );
  }

  if (
    emaFast1h > emaSlow1h
  ) {
    buyVotes++;
    reasons.push(
      "روند H1 صعودی است",
    );
  } else if (
    emaFast1h < emaSlow1h
  ) {
    sellVotes++;
    reasons.push(
      "روند H1 نزولی است",
    );
  }

  if (
    emaFast15 > emaSlow15
  ) {
    buyVotes++;
    reasons.push(
      "روند M15 صعودی است",
    );
  } else if (
    emaFast15 < emaSlow15
  ) {
    sellVotes++;
    reasons.push(
      "روند M15 نزولی است",
    );
  }

  /*
   * 2. M5 trend
   */

  if (
    emaFast5 > emaSlow5
  ) {
    buyVotes++;
  } else if (
    emaFast5 < emaSlow5
  ) {
    sellVotes++;
  }

  /*
   * 3. M1 momentum
   */

  if (
    emaFast1 > emaSlow1
  ) {
    buyVotes++;
  } else if (
    emaFast1 < emaSlow1
  ) {
    sellVotes++;
  }

  /*
   * 4. RSI
   */

  if (
    rsi5 >= 52 &&
    rsi5 <= 72
  ) {
    buyVotes++;
    reasons.push(
      `مومنتوم خرید M5 مناسب است RSI=${round(rsi5, 1)}`,
    );
  }

  if (
    rsi5 <= 48 &&
    rsi5 >= 28
  ) {
    sellVotes++;
    reasons.push(
      `مومنتوم فروش M5 مناسب است RSI=${round(rsi5, 1)}`,
    );
  }

  /*
   * 5. MACD
   */

  if (
    macd5.histogram > 0
  ) {
    buyVotes++;
    reasons.push(
      "MACD M5 مومنتوم مثبت دارد",
    );
  } else if (
    macd5.histogram < 0
  ) {
    sellVotes++;
    reasons.push(
      "MACD M5 مومنتوم منفی دارد",
    );
  }

  /*
   * 6. Candle confirmation
   */

  const pattern =
    candlePattern(last1);

  if (pattern.bullish) {
    buyVotes++;
    reasons.push(
      `کندل M1 صعودی: ${pattern.name}`,
    );
  }

  if (pattern.bearish) {
    sellVotes++;
    reasons.push(
      `کندل M1 نزولی: ${pattern.name}`,
    );
  }

  /*
   * 7. Breakout / liquidity
   */

  const resistance =
    recentHigh(m15, 30);

  const support =
    recentLow(m15, 30);

  if (
    price > resistance
  ) {
    buyVotes++;
    reasons.push(
      "قیمت مقاومت اخیر M15 را شکسته است",
    );
  }

  if (
    price < support
  ) {
    sellVotes++;
    reasons.push(
      "قیمت حمایت اخیر M15 را شکسته است",
    );
  }

  /*
   * 8. Volume
   */

  const avgVol =
    averageVolume(m1, 20);

  const currentVol =
    num(last1.volume);

  if (
    avgVol > 0 &&
    currentVol >= avgVol * 1.15
  ) {
    if (
      last1.close >
      last1.open
    ) {
      buyVotes++;
      reasons.push(
        "افزایش حجم همراه با حرکت صعودی",
      );
    } else if (
      last1.close <
      last1.open
    ) {
      sellVotes++;
      reasons.push(
        "افزایش حجم همراه با حرکت نزولی",
      );
    }
  }

  /*
   * Final direction
   */

  let direction: Direction | null =
    null;

  if (
    buyVotes > sellVotes &&
    buyVotes >= MIN_CONFIRMATIONS
  ) {
    direction = "BUY";
  }

  if (
    sellVotes > buyVotes &&
    sellVotes >= MIN_CONFIRMATIONS
  ) {
    direction = "SELL";
  }

  const confirmations =
    Math.max(
      buyVotes,
      sellVotes,
    );

  /*
   * Score intentionally not too strict.
   */

  const score = clamp(
    50 + confirmations * 6,
    0,
    100,
  );

  /*
   * Use M1 as execution timeframe.
   */

  return {
    direction,
    score,
    confirmations,
    timeframe: "1min",
    reasons: reasons.slice(-10),
  };
}


/* =========================================================
   PRICE LEVEL CALCULATIONS
   ========================================================= */

/*
 * XAUUSD:
 *
 * P/L = price movement × contract size × lot
 *
 * For 0.01 lot:
 * 1$ price movement = $1
 *
 * Therefore:
 *
 * TP1:
 * 5$ price movement
 *
 * TP2:
 * 8$ price movement
 *
 * TP3:
 * 12$ price movement
 */

function calculateLevels(
  entry: number,
  direction: Direction,
): {
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
} {
  const slDistance =
    INITIAL_SL_TOTAL_USD /
    (CONTRACT_SIZE * TOTAL_LOT);

  const tp1Distance =
    TP1_PER_001_LOT_USD /
    (CONTRACT_SIZE * 0.01);

  const tp2Distance =
    TP2_PER_001_LOT_USD /
    (CONTRACT_SIZE * 0.01);

  const tp3Distance =
    TP3_PER_001_LOT_USD /
    (CONTRACT_SIZE * 0.01);

  if (direction === "BUY") {
    return {
      stopLoss: round(
        entry - slDistance,
        2,
      ),

      tp1: round(
        entry + tp1Distance,
        2,
      ),

      tp2: round(
        entry + tp2Distance,
        2,
      ),

      tp3: round(
        entry + tp3Distance,
        2,
      ),
    };
  }

  return {
    stopLoss: round(
      entry + slDistance,
      2,
    ),

    tp1: round(
      entry - tp1Distance,
      2,
    ),

    tp2: round(
      entry - tp2Distance,
      2,
    ),

    tp3: round(
      entry - tp3Distance,
      2,
    ),
  };
}


/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToman(): Promise<{
  rate: number | null;
  asOf: string | null;
  delayed: boolean;
  delayedMinutes: number | null;
  error: string | null;
}> {
  const apiKey =
    process.env.NETARZ_API_KEY;

  if (!apiKey) {
    return {
      rate: null,
      asOf: null,
      delayed: false,
      delayedMinutes: null,
      error:
        "NETARZ_API_KEY is not configured",
    };
  }

  try {
    const response = await fetch(
      `${NETARZ_BASE}/rates/USD`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          Accept:
            "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `NetArz HTTP ${response.status}`,
      );
    }

    const json = await response.json();

    const rate =
      num(
        json?.data?.mid,
        num(json?.meta?.usd_irt),
      );

    if (!rate) {
      throw new Error(
        "NetArz returned no USD rate",
      );
    }

    const delayed =
      Boolean(
        json?.meta?.is_delayed,
      );

    const delayedMinutes =
      json?.meta?.delayed_minutes == null
        ? null
        : num(
            json.meta.delayed_minutes,
          );

    return {
      rate,
      asOf:
        json?.meta?.as_of
          ? String(json.meta.as_of)
          : null,
      delayed,
      delayedMinutes,
      error: null,
    };
  } catch (error) {
    return {
      rate: null,
      asOf: null,
      delayed: false,
      delayedMinutes: null,
      error:
        error instanceof Error
          ? error.message
          : "USD rate error",
    };
  }
}


/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  text: string,
): Promise<{
  ok: boolean;
  messageId?: number;
  error?: string;
}> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    return {
      ok: false,
      error:
        "Telegram environment variables are missing",
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.ok
    ) {
      return {
        ok: false,
        error:
          String(
            data?.description ||
            `Telegram HTTP ${response.status}`,
          ),
      };
    }

    return {
      ok: true,
      messageId:
        num(
          data?.result?.message_id,
        ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Telegram request failed",
    };
  }
}


/* =========================================================
   TELEGRAM INITIAL SIGNAL
   ========================================================= */

function makeInitialTelegramText(
  signalId: string,
  meta: SignalMeta,
): string {
  const directionIcon =
    meta.direction === "BUY"
      ? "🟢"
      : "🔴";

  const strength =
    meta.score >= 80 &&
    meta.confirmations >= 6
      ? "PROFESSIONAL"
      : meta.score >= 70 &&
          meta.confirmations >= 4
        ? "MEDIUM"
        : "WEAK";

  return `
<b>🤖 XAUUSD AI SIGNAL</b>

${directionIcon} <b>${meta.direction}</b>
<b>Strength:</b> ${strength}

<b>Entry:</b> ${meta.entry.toFixed(2)}
<b>SL:</b> ${meta.stopLoss.toFixed(2)}

<b>TP1:</b> ${meta.tp1.toFixed(2)}
<b>TP2:</b> ${meta.tp2.toFixed(2)}
<b>TP3:</b> ${meta.tp3.toFixed(2)}

<b>LOT:</b> 0.10

━━━━━━━━━━━━━━

<b>TP1 PLAN</b>
0.04 LOT → +$20

<b>TP2 PLAN</b>
0.03 LOT → +$24

<b>TP3 PLAN</b>
0.03 LOT → +$36

<b>MAX PROFIT:</b> +$80

━━━━━━━━━━━━━━

<b>After TP1:</b>
0.06 LOT remains
SL → ENTRY
Profit protection activated.

<b>Score:</b> ${meta.score}/100
<b>Confirmations:</b> ${meta.confirmations}
<b>Session:</b> ${esc(meta.session)}

<b>Iran Time:</b> ${esc(iranTime())}

━━━━━━━━━━━━━━

⚠️ <b>این تحلیل هوش مصنوعی است و تضمین سود ندارد.</b>

<b>ID:</b>
<code>${esc(signalId)}</code>
`.trim();
}


/* =========================================================
   EVENT TELEGRAM
   ========================================================= */

function makeEventTelegramText(
  signalId: string,
  meta: SignalMeta,
  event: EventRecord,
): string {
  const toman =
    event.pnlToman == null
      ? "نامشخص"
      : `${round(
          event.pnlToman,
          0,
        ).toLocaleString("en-US")} تومان`;

  if (event.type === "TP1_HIT") {
    return `
<b>🎯 TP1 HIT</b>

🟢 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b> ${event.price.toFixed(2)}

<b>Closed:</b> 0.04 LOT
<b>Profit:</b> +$20
<b>تومان:</b> ${toman}

━━━━━━━━━━━━━━

🛡️ <b>RISK FREE ACTIVATED</b>

Remaining:
<b>0.06 LOT</b>

Stop Loss:
<b>ENTRY ${meta.entry.toFixed(2)}</b>

اگر قیمت به Entry برگردد،
سود TP1 حفظ می‌شود.

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (event.type === "BREAKEVEN_HIT") {
    return `
<b>🛡️ BREAK EVEN</b>

<b>XAUUSD ${meta.direction}</b>

<b>Price:</b> ${event.price.toFixed(2)}

TP1 قبلاً فعال شده بود.

<b>Protected Profit:</b>
+$20

Remaining:
<b>0.06 LOT</b>

Position at Entry closed.

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (event.type === "TP2_HIT") {
    return `
<b>🎯 TP2 HIT</b>

🟢 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b> ${event.price.toFixed(2)}

<b>Closed:</b> 0.03 LOT

<b>TP2 Profit:</b>
+$24

<b>Total realized:</b>
+$44

Remaining:
<b>0.03 LOT</b>

TP3 هنوز فعال است.

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (event.type === "TP3_HIT") {
    return `
<b>🏆 TP3 HIT — TRADE COMPLETED</b>

🟢 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b> ${event.price.toFixed(2)}

<b>Closed:</b> 0.03 LOT

<b>TP3 Profit:</b>
+$36

━━━━━━━━━━━━━━

<b>FULL TP:</b>
+$80

<b>0.10 LOT → CLOSED</b>

<b>Trade completed successfully.</b>

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (event.type === "SL_HIT") {
    return `
<b>🛑 STOP LOSS HIT</b>

🔴 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b> ${event.price.toFixed(2)}

<b>Closed Remaining:</b>
${meta.remainingLot.toFixed(2)} LOT

<b>Loss:</b>
-$4

━━━━━━━━━━━━━━

این پیام به معنی فعال شدن واقعی
حد ضرر ثبت‌شده برای سیگنال است.

<b>Iran Time:</b>
${esc(iranTime())}

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  return `
<b>📊 XAUUSD EVENT</b>

${event.type}

Price:
${event.price.toFixed(2)}
`.trim();
}


/* =========================================================
   META NORMALIZATION
   ========================================================= */

function createDefaultState(
  stopLoss: number,
): SignalState {
  return {
    tp1Hit: false,
    tp2Hit: false,
    tp3Hit: false,

    slHit: false,
    breakevenHit: false,

    breakEvenArmed: false,

    closed: false,

    currentStopLoss: stopLoss,

    remainingLot: TOTAL_LOT,

    realizedPnlUsd: 0,

    realizedPnlToman: null,

    events: [],
  };
}

function normalizeMeta(
  raw: unknown,
  signal?: any,
): SignalMeta | null {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return null;
  }

  const value =
    raw as Record<string, any>;

  const direction =
    value.direction === "SELL"
      ? "SELL"
      : "BUY";

  const entry =
    num(
      value.entry,
      num(signal?.entry),
    );

  if (!entry) {
    return null;
  }

  let stopLoss =
    num(
      value.stopLoss,
      num(signal?.stopLoss),
    );

  let tp1 =
    num(value.tp1);

  let tp2 =
    num(value.tp2);

  let tp3 =
    num(value.tp3);

  /*
   * Recovery for old signals whose metadata
   * was incomplete.
   */

  if (
    !stopLoss ||
    !tp1 ||
    !tp2 ||
    !tp3
  ) {
    const levels =
      calculateLevels(
        entry,
        direction,
      );

    stopLoss =
      stopLoss || levels.stopLoss;

    tp1 =
      tp1 || levels.tp1;

    tp2 =
      tp2 || levels.tp2;

    tp3 =
      tp3 || levels.tp3;
  }

  const state =
    value.state &&
    typeof value.state === "object"
      ? value.state
      : createDefaultState(
          stopLoss,
        );

  const events =
    Array.isArray(state.events)
      ? state.events
      : [];

  return {
    version:
      num(value.version, 2),

    symbol:
      String(
        value.symbol ||
        SYMBOL,
      ),

    direction,

    timeframe:
      String(
        value.timeframe ||
        "1min",
      ),

    session:
      value.session ||
      getMarketSession(),

    score:
      num(value.score),

    confirmations:
      num(value.confirmations),

    reasons:
      Array.isArray(value.reasons)
        ? value.reasons.map(String)
        : [],

    entry,

    stopLoss,

    tp1,

    tp2,

    tp3,

    initialStopLoss:
      num(
        value.initialStopLoss,
        stopLoss,
      ),

    currentStopLoss:
      num(
        value.currentStopLoss,
        state.currentStopLoss ||
          stopLoss,
      ),

    totalLot:
      num(
        value.totalLot,
        TOTAL_LOT,
      ),

    tp1Lot:
      num(
        value.tp1Lot,
        TP1_LOT,
      ),

    tp2Lot:
      num(
        value.tp2Lot,
        TP2_LOT,
      ),

    tp3Lot:
      num(
        value.tp3Lot,
        TP3_LOT,
      ),

    remainingLot:
      num(
        value.remainingLot,
        state.remainingLot ||
          TOTAL_LOT,
      ),

    tp1Per001LotUsd:
      TP1_PER_001_LOT_USD,

    tp2Per001LotUsd:
      TP2_PER_001_LOT_USD,

    tp3Per001LotUsd:
      TP3_PER_001_LOT_USD,

    tp1TotalUsd:
      TP1_TOTAL_USD,

    tp2TotalUsd:
      TP2_TOTAL_USD,

    tp3TotalUsd:
      TP3_TOTAL_USD,

    fullTpUsd:
      FULL_TP_USD,

    usdToToman:
      value.usdToToman == null
        ? null
        : num(
            value.usdToToman,
          ),

    usdToTomanAsOf:
      value.usdToTomanAsOf
        ? String(
            value.usdToTomanAsOf,
          )
        : null,

    usdToTomanDelayed:
      Boolean(
        value.usdToTomanDelayed,
      ),

    usdToTomanDelayedMinutes:
      value.usdToTomanDelayedMinutes ==
      null
        ? null
        : num(
            value.usdToTomanDelayedMinutes,
          ),

    lastPrice:
      num(
        value.lastPrice,
        entry,
      ),

    lastPriceSource:
      value.lastPriceSource
        ? String(
            value.lastPriceSource,
          )
        : undefined,

    state: {
      tp1Hit:
        Boolean(state.tp1Hit),

      tp2Hit:
        Boolean(state.tp2Hit),

      tp3Hit:
        Boolean(state.tp3Hit),

      slHit:
        Boolean(state.slHit),

      breakevenHit:
        Boolean(state.breakevenHit),

      breakEvenArmed:
        Boolean(
          state.breakEvenArmed,
        ),

      closed:
        Boolean(state.closed),

      currentStopLoss:
        num(
          state.currentStopLoss,
          stopLoss,
        ),

      remainingLot:
        num(
          state.remainingLot,
          TOTAL_LOT,
        ),

      realizedPnlUsd:
        num(
          state.realizedPnlUsd,
        ),

      realizedPnlToman:
        state.realizedPnlToman ==
        null
          ? null
          : num(
              state.realizedPnlToman,
            ),

      events:
        events as EventRecord[],

      lastCheckedAt:
        state.lastCheckedAt,
    },

    telegramInitial:
      value.telegramInitial,

    createdAt:
      value.createdAt,

    updatedAt:
      value.updatedAt,
  };
}


/* =========================================================
   EVENT HELPERS
   ========================================================= */

function eventExists(
  meta: SignalMeta,
  type: EventType,
): boolean {
  return meta.state.events.some(
    (event) =>
      event.type === type,
  );
}

function eventId(
  signalId: string,
  type: EventType,
): string {
  return `${signalId}:${type}`;
}

function calculateEventToman(
  usd: number,
  rate: number | null,
): number | null {
  if (
    rate == null ||
    !Number.isFinite(rate)
  ) {
    return null;
  }

  return round(
    usd * rate,
    0,
  );
}


/* =========================================================
   EVENT CREATION
   ========================================================= */

function createEvent(
  signalId: string,
  type: EventType,
  price: number,
  pnlUsd: number,
  rate: number | null,
): EventRecord {
  return {
    id: eventId(
      signalId,
      type,
    ),

    type,

    createdAt:
      isoNow(),

    price:
      round(price, 2),

    pnlUsd:
      round(pnlUsd, 2),

    pnlToman:
      calculateEventToman(
        pnlUsd,
        rate,
      ),

    usdToToman:
      rate,

    telegram: {
      status: "PENDING",
      messageId: null,
      sentAt: null,
      error: null,
      attempts: 0,
    },
  };
}


/* =========================================================
   PERSIST SIGNAL
   ========================================================= */

async function saveSignalMeta(
  signalId: string,
  meta: SignalMeta,
  status?: string,
): Promise<void> {
  const payload: any = {
    metadata: meta,
  };

  if (status) {
    payload.status = status;
  }

  await prisma.tradingSignal.update({
    where: {
      id: signalId,
    },
    data: payload,
  });
}


/* =========================================================
   DELIVER EVENT
   ========================================================= */

async function deliverEvent(
  signal: any,
  meta: SignalMeta,
  event: EventRecord,
): Promise<SignalMeta> {
  if (
    event.telegram.status === "SENT"
  ) {
    return meta;
  }

  const text =
    makeEventTelegramText(
      signal.id,
      meta,
      event,
    );

  const result =
    await sendTelegram(text);

  event.telegram.attempts =
    num(
      event.telegram.attempts,
    ) + 1;

  if (result.ok) {
    event.telegram.status =
      "SENT";

    event.telegram.messageId =
      result.messageId ?? null;

    event.telegram.sentAt =
      isoNow();

    event.telegram.error =
      null;
  } else {
    event.telegram.status =
      "FAILED";

    event.telegram.error =
      result.error ||
      "Telegram failed";
  }

  return meta;
}


/* =========================================================
   MONITOR ONE SIGNAL
   ========================================================= */

async function monitorSignal(
  signal: any,
): Promise<void> {
  let meta =
    normalizeMeta(
      signal.metadata,
      signal,
    );

  if (!meta) {
    return;
  }

  if (
    meta.state.closed
  ) {
    return;
  }

  const [
    live,
    fx,
    candles,
  ] = await Promise.all([
    getLivePrice(),
    getUsdToman(),
    getCandles(
      TD_SYMBOL,
      "1min",
      5,
    ),
  ]);

  const price =
    live.price;

  meta.lastPrice =
    price;

  meta.lastPriceSource =
    live.source;

  meta.session =
    getMarketSession();

  meta.usdToToman =
    fx.rate;

  meta.usdToTomanAsOf =
    fx.asOf;

  meta.usdToTomanDelayed =
    fx.delayed;

  meta.usdToTomanDelayedMinutes =
    fx.delayedMinutes;

  meta.state.lastCheckedAt =
    isoNow();

  /*
   * We use only candles that were created
   * after the signal itself.
   *
   * This prevents an old candle's high/low
   * from falsely triggering a brand-new signal.
   */

  const signalCreatedAt =
    signal.createdAt
      ? new Date(
          signal.createdAt,
        ).getTime()
      : 0;

  const usableCandles =
    candles.filter(
      (candle) => {
        const candleTime =
          new Date(
            candle.datetime,
          ).getTime();

        if (!signalCreatedAt) {
          return true;
        }

        return (
          candleTime >=
          signalCreatedAt -
            60_000
        );
      },
    );

  const candleHigh =
    usableCandles.length
      ? Math.max(
          ...usableCandles.map(
            (c) => c.high,
          ),
        )
      : price;

  const candleLow =
    usableCandles.length
      ? Math.min(
          ...usableCandles.map(
            (c) => c.low,
          ),
        )
      : price;

  const hitHigh =
    (level: number) =>
      price >= level ||
      candleHigh >= level;

  const hitLow =
    (level: number) =>
      price <= level ||
      candleLow <= level;

  const isBuy =
    meta.direction === "BUY";

  /*
   * =======================================================
   * CURRENT STOP
   * =======================================================
   */

  const currentStop =
    meta.state.breakEvenArmed
      ? meta.entry
      : meta.initialStopLoss;

  meta.currentStopLoss =
    currentStop;

  meta.state.currentStopLoss =
    currentStop;

  /*
   * =======================================================
   * STOP LOSS
   *
   * After TP1:
   * SL = Entry
   *
   * Before TP1:
   * SL = Initial SL
   * =======================================================
   */

  const stopHit =
    isBuy
      ? hitLow(currentStop)
      : hitHigh(currentStop);

  /*
   * IMPORTANT:
   *
   * If TP1 is hit during this scan,
   * we activate BE.
   *
   * If price is also already back at Entry,
   * the next monitor cycle will register BE.
   *
   * This prevents double-processing one event.
   */

  if (
    stopHit &&
    !meta.state.tp3Hit
  ) {
    /*
     * If TP1 has already happened,
     * this is BREAK EVEN.
     */

    if (
      meta.state.breakEvenArmed &&
      !meta.state.breakevenHit
    ) {
      if (
        !eventExists(
          meta,
          "BREAKEVEN_HIT",
        )
      ) {
        const event =
          createEvent(
            signal.id,
            "BREAKEVEN_HIT",
            price,
            0,
            fx.rate,
          );

        meta.state.events.push(
          event,
        );

        meta.state.breakevenHit =
          true;

        meta.state.closed =
          true;

        meta.state.remainingLot =
          0;

        meta.state.currentStopLoss =
          meta.entry;

        meta.currentStopLoss =
          meta.entry;

        meta.state.realizedPnlToman =
          calculateEventToman(
            meta.state
              .realizedPnlUsd,
            fx.rate,
          );

        await saveSignalMeta(
          signal.id,
          meta,
          "BREAKEVEN",
        );

        const updated =
          await deliverEvent(
            signal,
            meta,
            event,
          );

        await saveSignalMeta(
          signal.id,
          updated,
          "BREAKEVEN",
        );
      }

      return;
    }

    /*
     * Initial SL.
     */

    if (
      !meta.state.slHit
    ) {
      if (
        !eventExists(
          meta,
          "SL_HIT",
        )
      ) {
        const event =
          createEvent(
            signal.id,
            "SL_HIT",
            price,
            -INITIAL_SL_TOTAL_USD,
            fx.rate,
          );

        meta.state.events.push(
          event,
        );

        meta.state.slHit =
          true;

        meta.state.closed =
          true;

        meta.state.remainingLot =
          0;

        meta.state.currentStopLoss =
          meta.initialStopLoss;

        meta.currentStopLoss =
          meta.initialStopLoss;

        meta.state.realizedPnlUsd =
          round(
            meta.state
              .realizedPnlUsd -
              INITIAL_SL_TOTAL_USD,
            2,
          );

        meta.state.realizedPnlToman =
          calculateEventToman(
            meta.state
              .realizedPnlUsd,
            fx.rate,
          );

        await saveSignalMeta(
          signal.id,
          meta,
          "SL_HIT",
        );

        const updated =
          await deliverEvent(
            signal,
            meta,
            event,
          );

        await saveSignalMeta(
          signal.id,
          updated,
          "SL_HIT",
        );
      }

      return;
    }
  }


  /* =======================================================
     TP1
     ======================================================= */

  if (
    !meta.state.tp1Hit &&
    (
      isBuy
        ? hitHigh(meta.tp1)
        : hitLow(meta.tp1)
    )
  ) {
    if (
      !eventExists(
        meta,
        "TP1_HIT",
      )
    ) {
      const event =
        createEvent(
          signal.id,
          "TP1_HIT",
          price,
          TP1_TOTAL_USD,
          fx.rate,
        );

      meta.state.events.push(
        event,
      );

      meta.state.tp1Hit =
        true;

      /*
       * 0.04 lot is closed.
       */

      meta.state.remainingLot =
        round(
          TOTAL_LOT -
            TP1_LOT,
          2,
        );

      /*
       * VERY IMPORTANT:
       *
       * Remaining = 0.06 lot
       *
       * Stop -> Entry
       */

      meta.state.breakEvenArmed =
        true;

      meta.state.currentStopLoss =
        meta.entry;

      meta.currentStopLoss =
        meta.entry;

      meta.state.realizedPnlUsd =
        round(
          meta.state
            .realizedPnlUsd +
            TP1_TOTAL_USD,
          2,
        );

      meta.state.realizedPnlToman =
        calculateEventToman(
          meta.state
            .realizedPnlUsd,
          fx.rate,
        );

      /*
       * Status changes to TP1_HIT.
       */

      await saveSignalMeta(
        signal.id,
        meta,
        "TP1_HIT",
      );

      const updated =
        await deliverEvent(
          signal,
          meta,
          event,
        );

      await saveSignalMeta(
        signal.id,
        updated,
        "TP1_HIT",
      );
    }

    return;
  }


  /* =======================================================
     TP2
     ======================================================= */

  if (
    meta.state.tp1Hit &&
    !meta.state.tp2Hit &&
    (
      isBuy
        ? hitHigh(meta.tp2)
        : hitLow(meta.tp2)
    )
  ) {
    if (
      !eventExists(
        meta,
        "TP2_HIT",
      )
    ) {
      const event =
        createEvent(
          signal.id,
          "TP2_HIT",
          price,
          TP2_TOTAL_USD,
          fx.rate,
        );

      meta.state.events.push(
        event,
      );

      meta.state.tp2Hit =
        true;

      /*
       * 0.03 lot closes.
       *
       * 0.03 lot remains.
       */

      meta.state.remainingLot =
        TP3_LOT;

      meta.state.realizedPnlUsd =
        round(
          meta.state
            .realizedPnlUsd +
            TP2_TOTAL_USD,
          2,
        );

      meta.state.realizedPnlToman =
        calculateEventToman(
          meta.state
            .realizedPnlUsd,
          fx.rate,
        );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP2_HIT",
      );

      const updated =
        await deliverEvent(
          signal,
          meta,
          event,
        );

      await saveSignalMeta(
        signal.id,
        updated,
        "TP2_HIT",
      );
    }

    return;
  }


  /* =======================================================
     TP3
     ======================================================= */

  if (
    meta.state.tp1Hit &&
    meta.state.tp2Hit &&
    !meta.state.tp3Hit &&
    (
      isBuy
        ? hitHigh(meta.tp3)
        : hitLow(meta.tp3)
    )
  ) {
    if (
      !eventExists(
        meta,
        "TP3_HIT",
      )
    ) {
      const event =
        createEvent(
          signal.id,
          "TP3_HIT",
          price,
          TP3_TOTAL_USD,
          fx.rate,
        );

      meta.state.events.push(
        event,
      );

      meta.state.tp3Hit =
        true;

      meta.state.remainingLot =
        0;

      meta.state.closed =
        true;

      meta.state.realizedPnlUsd =
        round(
          meta.state
            .realizedPnlUsd +
            TP3_TOTAL_USD,
          2,
        );

      meta.state.realizedPnlToman =
        calculateEventToman(
          meta.state
            .realizedPnlUsd,
          fx.rate,
        );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP3_HIT",
      );

      const updated =
        await deliverEvent(
          signal,
          meta,
          event,
        );

      await saveSignalMeta(
        signal.id,
        updated,
        "TP3_HIT",
      );
    }
  }
}


/* =========================================================
   RETRY FAILED TELEGRAM EVENTS
   ========================================================= */

async function retryFailedEvents():
  Promise<void> {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      take: 100,
    });

  for (
    const signal of signals
  ) {
    const meta =
      normalizeMeta(
        signal.metadata,
        signal,
      );

    if (!meta) continue;

    let changed = false;

    for (
      const event of meta.state.events
    ) {
      if (
        event.telegram.status ===
        "FAILED"
      ) {
        const attempts =
          num(
            event.telegram.attempts,
          );

        /*
         * Avoid endless hammering.
         * Five attempts is enough for one cycle.
         */

        if (attempts >= 5) {
          continue;
        }

        const updated =
          await deliverEvent(
            signal,
            meta,
            event,
          );

        meta.state.events =
          updated.state.events;

        changed = true;
      }
    }

    if (changed) {
      await saveSignalMeta(
        signal.id,
        meta,
        signal.status,
      );
    }
  }
}


/* =========================================================
   SCAN ONE USER
   ========================================================= */

async function scanUser(
  userId: string,
): Promise<any> {
  const bots =
    await prisma.tradingBot.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

  const goldBots =
    bots.filter(
      (bot: any) =>
        normalizeSymbol(
          bot.symbol,
        ) === SYMBOL ||
        normalizeSymbol(
          bot.symbol,
        ) === "GOLD",
    );

  if (!goldBots.length) {
    return {
      created: false,
      reason:
        "No active XAUUSD bot",
    };
  }

  /*
   * Do not create another signal while
   * an existing one is active.
   */

  const existing =
    await prisma.tradingSignal.findFirst({
      where: {
        userId,
        symbol: SYMBOL,
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (existing) {
    return {
      created: false,
      reason:
        "Active XAUUSD signal already exists",
      signalId:
        existing.id,
    };
  }

  /*
   * Analysis
   */

  const analysis =
    await analyzeMarket();

  if (
    !analysis.direction
  ) {
    return {
      created: false,
      reason:
        "No clear direction",
      score:
        analysis.score,
      confirmations:
        analysis.confirmations,
    };
  }

  if (
    analysis.score <
      MIN_SCORE ||
    analysis.confirmations <
      MIN_CONFIRMATIONS
  ) {
    return {
      created: false,
      reason:
        "Minimum confirmation not reached",
      score:
        analysis.score,
      confirmations:
        analysis.confirmations,
    };
  }

  const bot =
    goldBots[0] as any;

  /*
   * Respect bot direction settings
   * when those fields exist.
   */

  if (
    analysis.direction === "BUY" &&
    bot.buyEnabled === false
  ) {
    return {
      created: false,
      reason:
        "BUY disabled by bot",
    };
  }

  if (
    analysis.direction === "SELL" &&
    bot.sellEnabled === false
  ) {
    return {
      created: false,
      reason:
        "SELL disabled by bot",
    };
  }

  const live =
    await getLivePrice();

  const fx =
    await getUsdToman();

  const entry =
    round(
      live.price,
      2,
    );

  const levels =
    calculateLevels(
      entry,
      analysis.direction,
    );

  const session =
    getMarketSession();

  const state =
    createDefaultState(
      levels.stopLoss,
    );

  const meta: SignalMeta = {
    version: 2,

    symbol: SYMBOL,

    direction:
      analysis.direction,

    timeframe:
      analysis.timeframe,

    session,

    score:
      analysis.score,

    confirmations:
      analysis.confirmations,

    reasons:
      analysis.reasons,

    entry,

    stopLoss:
      levels.stopLoss,

    tp1:
      levels.tp1,

    tp2:
      levels.tp2,

    tp3:
      levels.tp3,

    initialStopLoss:
      levels.stopLoss,

    currentStopLoss:
      levels.stopLoss,

    totalLot:
      TOTAL_LOT,

    tp1Lot:
      TP1_LOT,

    tp2Lot:
      TP2_LOT,

    tp3Lot:
      TP3_LOT,

    remainingLot:
      TOTAL_LOT,

    tp1Per001LotUsd:
      TP1_PER_001_LOT_USD,

    tp2Per001LotUsd:
      TP2_PER_001_LOT_USD,

    tp3Per001LotUsd:
      TP3_PER_001_LOT_USD,

    tp1TotalUsd:
      TP1_TOTAL_USD,

    tp2TotalUsd:
      TP2_TOTAL_USD,

    tp3TotalUsd:
      TP3_TOTAL_USD,

    fullTpUsd:
      FULL_TP_USD,

    usdToToman:
      fx.rate,

    usdToTomanAsOf:
      fx.asOf,

    usdToTomanDelayed:
      fx.delayed,

    usdToTomanDelayedMinutes:
      fx.delayedMinutes,

    lastPrice:
      live.price,

    lastPriceSource:
      live.source,

    state,

    createdAt:
      isoNow(),

    updatedAt:
      isoNow(),
  };

  /*
   * =======================================================
   * CREATE DATABASE SIGNAL
   *
   * metadata is ALWAYS an object.
   *
   * NEVER use:
   * metadata: { not: null }
   *
   * because Prisma JSON filter rejects that form.
   * =======================================================
   */

  const tradingSignal =
    await (prisma.tradingSignal as any).create({
      data: {
        userId,

        botId:
          bot.id,

        symbol:
          SYMBOL,

        direction:
          analysis.direction,

        timeframe:
          analysis.timeframe,

        entry,

        stopLoss:
          levels.stopLoss,

        takeProfit:
          levels.tp3,

        status:
          "ACTIVE",

        metadata:
          meta,

        telegramSent:
          false,
      },
    });

  /*
   * Telegram initial signal
   */

  const telegramText =
    makeInitialTelegramText(
      tradingSignal.id,
      meta,
    );

  const telegramResult =
    await sendTelegram(
      telegramText,
    );

  meta.telegramInitial = {
    status:
      telegramResult.ok
        ? "SENT"
        : "FAILED",

    messageId:
      telegramResult.messageId ??
      null,

    sentAt:
      telegramResult.ok
        ? isoNow()
        : null,

    error:
      telegramResult.error ??
      null,

    attempts: 1,
  };

  await (prisma.tradingSignal as any).update({
    where: {
      id:
        tradingSignal.id,
    },

    data: {
      metadata:
        meta,

      telegramSent:
        telegramResult.ok,

      telegramMessageId:
        telegramResult.messageId ??
        null,

      telegramSentAt:
        telegramResult.ok
          ? new Date()
          : null,
    },
  });

  return {
    created: true,

    signalId:
      tradingSignal.id,

    direction:
      analysis.direction,

    entry,

    stopLoss:
      levels.stopLoss,

    tp1:
      levels.tp1,

    tp2:
      levels.tp2,

    tp3:
      levels.tp3,

    score:
      analysis.score,

    confirmations:
      analysis.confirmations,

    telegram:
      telegramResult.ok,

    telegramError:
      telegramResult.error ??
      null,
  };
}


/* =========================================================
   MONITOR ALL ACTIVE SIGNALS
   ========================================================= */

async function monitorAllSignals():
  Promise<{
    checked: number;
    errors: number;
  }> {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
    });

  let checked = 0;
  let errors = 0;

  for (
    const signal of signals
  ) {
    try {
      await monitorSignal(
        signal,
      );

      checked++;
    } catch {
      errors++;
    }
  }

  return {
    checked,
    errors,
  };
}


/* =========================================================
   SCAN ALL USERS
   ========================================================= */

async function scanAllUsers():
  Promise<any[]> {
  const bots =
    await prisma.tradingBot.findMany({
      where: {
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

  const userIds =
    Array.from(
      new Set(
        bots
          .map(
            (bot: any) =>
              bot.userId,
          )
          .filter(Boolean),
      ),
    );

  const results: any[] = [];

  for (
    const userId of userIds
  ) {
    try {
      const result =
        await scanUser(
          String(userId),
        );

      results.push({
        userId,
        ...result,
      });
    } catch (error) {
      results.push({
        userId,
        created: false,
        error:
          error instanceof Error
            ? error.message
            : "Scan failed",
      });
    }
  }

  return results;
}


/* =========================================================
   CRON AUTH
   ========================================================= */

function validCronRequest(
  request: NextRequest,
): boolean {
  const cron =
    request.nextUrl.searchParams.get(
      "cron",
    );

  if (cron === "1") {
    return true;
  }

  const expected =
    process.env.SIGNALS_CRON_SECRET ||
    process.env.AI_CRON_SECRET ||
    process.env.NEWS_CRON_SECRET;

  if (!expected) {
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

  return Boolean(
    received &&
    received === expected,
  );
}


/* =========================================================
   SERVER ENGINE
   ========================================================= */

async function runServerEngine() {
  const startedAt =
    Date.now();

  let monitor:
    | {
        checked: number;
        errors: number;
      }
    | null = null;

  let scan: any[] = [];

  let retryError:
    | string
    | null = null;

  /*
   * First retry old failed Telegram events.
   */

  try {
    await retryFailedEvents();
  } catch (error) {
    retryError =
      error instanceof Error
        ? error.message
        : "Retry failed";
  }

  /*
   * Then monitor current positions.
   */

  try {
    monitor =
      await monitorAllSignals();
  } catch {
    monitor = {
      checked: 0,
      errors: 1,
    };
  }

  /*
   * Then scan for new opportunities.
   */

  try {
    scan =
      await scanAllUsers();
  } catch {
    scan = [];
  }

  /*
   * Current market data.
   */

  let live:
    | {
        price: number;
        source: string;
        datetime: string | null;
      }
    | null = null;

  let fx:
    | {
        rate: number | null;
        asOf: string | null;
        delayed: boolean;
        delayedMinutes: number | null;
        error: string | null;
      }
    | null = null;

  try {
    live =
      await getLivePrice();
  } catch {
    live = null;
  }

  try {
    fx =
      await getUsdToman();
  } catch {
    fx = null;
  }

  return {
    ok: true,

    engine:
      "XAUUSD_AI_ANALYSIS_ENGINE",

    elapsedMs:
      Date.now() -
      startedAt,

    monitor,

    scan,

    retryError,

    market: {
      symbol:
        SYMBOL,

      price:
        live?.price ??
        null,

      priceSource:
        live?.source ??
        null,

      priceDatetime:
        live?.datetime ??
        null,

      session:
        getMarketSession(),

      usdToToman:
        fx?.rate ??
        null,

      usdToTomanAsOf:
        fx?.asOf ??
        null,

      usdToTomanDelayed:
        fx?.delayed ??
        false,

      usdToTomanDelayedMinutes:
        fx?.delayedMinutes ??
        null,

      usdToTomanError:
        fx?.error ??
        null,
    },

    plan: {
      totalLot:
        TOTAL_LOT,

      tp1Lot:
        TP1_LOT,

      tp2Lot:
        TP2_LOT,

      tp3Lot:
        TP3_LOT,

      tp1Per001LotUsd:
        TP1_PER_001_LOT_USD,

      tp2Per001LotUsd:
        TP2_PER_001_LOT_USD,

      tp3Per001LotUsd:
        TP3_PER_001_LOT_USD,

      tp1TotalUsd:
        TP1_TOTAL_USD,

      tp2TotalUsd:
        TP2_TOTAL_USD,

      tp3TotalUsd:
        TP3_TOTAL_USD,

      fullTpUsd:
        FULL_TP_USD,

      initialSlUsd:
        INITIAL_SL_TOTAL_USD,

      afterTp1RemainingLot:
        REMAINING_AFTER_TP1,

      afterTp1Stop:
        "ENTRY",
    },
  };
}


/* =========================================================
   PERFORMANCE
   ========================================================= */

async function calculatePerformance(
  userId: string,
) {
  const signals =
    await prisma.tradingSignal.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

  let totalTrades = 0;
  let wins = 0;
  let losses = 0;

  let realizedUsd = 0;

  for (
    const signal of signals
  ) {
    totalTrades++;

    const meta =
      normalizeMeta(
        signal.metadata,
        signal,
      );

    if (!meta) continue;

    realizedUsd +=
      num(
        meta.state
          .realizedPnlUsd,
      );

    if (
      meta.state.tp3Hit ||
      meta.state.tp2Hit ||
      meta.state.tp1Hit
    ) {
      wins++;
    } else if (
      meta.state.slHit
    ) {
      losses++;
    }
  }

  const completed =
    wins + losses;

  const winRate =
    completed > 0
      ? round(
          (wins / completed) *
            100,
          1,
        )
      : 0;

  return {
    totalTrades,

    completed,

    wins,

    losses,

    winRate,

    realizedUsd:
      round(
        realizedUsd,
        2,
      ),
  };
}


/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: NextRequest,
) {
  /*
   * Server engine / GitHub Actions.
   */

  if (
    validCronRequest(
      request,
    )
  ) {
    try {
      const result =
        await runServerEngine();

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
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "AI engine failed",
        },
        {
          status: 500,
        },
      );
    }
  }

  /*
   * Normal authenticated dashboard request.
   */

  const session =
    await getSession();

  if (!session?.user) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const url =
      request.nextUrl;

    const shouldScan =
      url.searchParams.get(
        "scan",
      ) === "1";

    let scanResult:
      | any
      | null = null;

    if (shouldScan) {
      scanResult =
        await scanUser(
          session.user.id,
        );
    }

    /*
     * Always monitor active signals
     * when dashboard is requested too.
     */

    try {
      await monitorAllSignals();
    } catch {
      /*
       * Dashboard should still load
       * even if monitoring has an
       * external API problem.
       */
    }

    const signals =
      await prisma.tradingSignal.findMany({
        where: {
          userId:
            session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });

    const live =
      await getLivePrice();

    const fx =
      await getUsdToman();

    const performance =
      await calculatePerformance(
        session.user.id,
      );

    const formattedSignals =
      signals.map(
        (signal: any) => {
          const meta =
            normalizeMeta(
              signal.metadata,
              signal,
            );

          return {
            id:
              signal.id,

            symbol:
              signal.symbol,

            direction:
              signal.direction,

            timeframe:
              signal.timeframe,

            status:
              signal.status,

            entry:
              num(
                signal.entry,
              ),

            stopLoss:
              num(
                signal.stopLoss,
              ),

            takeProfit:
              num(
                signal.takeProfit,
              ),

            telegramSent:
              Boolean(
                signal.telegramSent,
              ),

            telegramMessageId:
              signal.telegramMessageId ??
              null,

            createdAt:
              signal.createdAt,

            metadata:
              meta,
          };
        },
      );

    return NextResponse.json(
      {
        ok: true,

        symbol:
          SYMBOL,

        market: {
          price:
            live.price,

          source:
            live.source,

          datetime:
            live.datetime,

          session:
            getMarketSession(),

          usdToToman:
            fx.rate,

          usdToTomanAsOf:
            fx.asOf,

          usdToTomanDelayed:
            fx.delayed,

          usdToTomanDelayedMinutes:
            fx.delayedMinutes,

          usdToTomanError:
            fx.error,
        },

        plan: {
          totalLot:
            TOTAL_LOT,

          tp1Lot:
            TP1_LOT,

          tp2Lot:
            TP2_LOT,

          tp3Lot:
            TP3_LOT,

          tp1Per001LotUsd:
            TP1_PER_001_LOT_USD,

          tp2Per001LotUsd:
            TP2_PER_001_LOT_USD,

          tp3Per001LotUsd:
            TP3_PER_001_LOT_USD,

          tp1TotalUsd:
            TP1_TOTAL_USD,

          tp2TotalUsd:
            TP2_TOTAL_USD,

          tp3TotalUsd:
            TP3_TOTAL_USD,

          fullTpUsd:
            FULL_TP_USD,

          initialSlUsd:
            INITIAL_SL_TOTAL_USD,

          remainingAfterTp1:
            REMAINING_AFTER_TP1,

          stopAfterTp1:
            "ENTRY",
        },

        signals:
          formattedSignals,

        performance,

        scan:
          scanResult,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "AI analysis request failed",
      },
      {
        status: 500,
      },
    );
  }
}
