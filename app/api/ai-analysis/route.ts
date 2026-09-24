import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   XAUUSD AI ANALYSIS ENGINE
   =========================================================

   TOTAL POSITION
   ---------------
   0.10 LOT

   TP1
   0.04 LOT
   $5 per 0.01 LOT
   = +$20

   TP2
   0.03 LOT
   $8 per 0.01 LOT
   = +$24

   TP3
   0.03 LOT
   $12 per 0.01 LOT
   = +$36

   FULL TP
   -------
   +$80

   AFTER TP1
   ----------
   0.04 LOT CLOSED
   0.06 LOT REMAINS
   SL -> ENTRY

   INITIAL SL
   ----------
   -$4 TOTAL

   ========================================================= */


/* =========================================================
   CONSTANTS
   ========================================================= */

const SYMBOL = "XAUUSD";
const TD_SYMBOL = "XAU/USD";

const TWELVE_DATA_URL =
  "https://api.twelvedata.com";

const NETARZ_URL =
  "https://netarz.ir/api/fx/v1";

const TOTAL_LOT = 0.1;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const REMAINING_AFTER_TP1 = 0.06;

const CONTRACT_SIZE = 100;

/*
 * Profit target PER 0.01 LOT.
 */

const TP1_PER_001_USD = 5;
const TP2_PER_001_USD = 8;
const TP3_PER_001_USD = 12;

/*
 * Actual profit of each partial close.
 */

const TP1_TOTAL_USD =
  TP1_PER_001_USD * 4;

const TP2_TOTAL_USD =
  TP2_PER_001_USD * 3;

const TP3_TOTAL_USD =
  TP3_PER_001_USD * 3;

const FULL_TP_USD =
  TP1_TOTAL_USD +
  TP2_TOTAL_USD +
  TP3_TOTAL_USD;

/*
 * Initial total stop.
 */

const INITIAL_SL_USD = 4;

/*
 * Minimum signal requirements.
 */

const MIN_SCORE = 60;
const MIN_CONFIRMATIONS = 2;

/*
 * Active statuses.
 */

const ACTIVE_STATUSES = [
  "WAITING",
  "ACTIVE",
  "TP1_HIT",
  "TP2_HIT",
];


/* =========================================================
   TYPES
   ========================================================= */

type Direction =
  | "BUY"
  | "SELL";

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

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type TelegramState = {
  status:
    | "PENDING"
    | "SENT"
    | "FAILED";

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

  lastPriceSource: string | null;

  state: SignalState;

  telegramInitial: TelegramState | null;

  createdAt: string | null;

  updatedAt: string | null;
};


/* =========================================================
   HELPERS
   ========================================================= */

function num(
  value: unknown,
  fallback = 0,
): number {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function round(
  value: number,
  digits = 2,
): number {
  const factor =
    10 ** digits;

  return (
    Math.round(
      value * factor,
    ) / factor
  );
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

function avg(
  values: number[],
): number {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (a, b) => a + b,
      0,
    ) / values.length
  );
}

function esc(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isoNow(): string {
  return new Date().toISOString();
}

function normalizeSymbol(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(
      /[\/_-]/g,
      "",
    )
    .toUpperCase();
}

function normalizeTimeframe(
  value: unknown,
): string {
  const tf =
    String(value ?? "1min")
      .toLowerCase();

  const map: Record<
    string,
    string
  > = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "1d": "1day",
  };

  return map[tf] || tf;
}

function iranTime(): string {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone:
        "Asia/Tehran",
      dateStyle: "short",
      timeStyle: "medium",
    },
  ).format(new Date());
}


/* =========================================================
   MARKET SESSION
   ========================================================= */

function getMarketSession():
  MarketSession {
  const hour = Number(
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "UTC",
        hour: "2-digit",
        hour12: false,
      },
    ).format(new Date()),
  );

  const tokyo =
    hour >= 0 &&
    hour < 8;

  const london =
    hour >= 7 &&
    hour < 16;

  const newYork =
    hour >= 13 &&
    hour < 22;

  const sydney =
    hour >= 21 ||
    hour < 6;

  if (
    london &&
    newYork
  ) {
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
   TWELVE DATA REQUEST
   ========================================================= */

async function tdRequest(
  endpoint: string,
  params: Record<
    string,
    string
  >,
): Promise<any> {
  const apiKey =
    process.env
      .TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY is not configured",
    );
  }

  const url =
    new URL(
      `${TWELVE_DATA_URL}${endpoint}`,
    );

  const allParams = {
    ...params,
    apikey: apiKey,
  };

  for (
    const [
      key,
      value,
    ] of Object.entries(
      allParams,
    )
  ) {
    url.searchParams.set(
      key,
      value,
    );
  }

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            10000,
          ),
      },
    );

  if (!response.ok) {
    throw new Error(
      `Twelve Data HTTP ${response.status}`,
    );
  }

  const data =
    await response.json();

  if (
    data?.status ===
      "error" ||
    data?.code === 400
  ) {
    throw new Error(
      String(
        data?.message ||
          "Twelve Data error",
      ),
    );
  }

  return data;
}


/* =========================================================
   CANDLES
   ========================================================= */

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 220,
): Promise<Candle[]> {
  const data =
    await tdRequest(
      "/time_series",
      {
        symbol,
        interval:
          normalizeTimeframe(
            interval,
          ),
        outputsize:
          String(outputsize),
        order: "desc",
        timezone: "UTC",
      },
    );

  if (
    !Array.isArray(
      data?.values,
    )
  ) {
    return [];
  }

  return data.values
    .map(
      (item: any) => ({
        datetime:
          String(
            item?.datetime ||
              "",
          ),

        open:
          num(item?.open),

        high:
          num(item?.high),

        low:
          num(item?.low),

        close:
          num(item?.close),

        volume:
          item?.volume == null
            ? undefined
            : num(
                item.volume,
              ),
      }),
    )
    .filter(
      (c: Candle) =>
        c.close > 0 &&
        c.high > 0 &&
        c.low > 0,
    );
}


/* =========================================================
   LIVE XAUUSD PRICE
   ========================================================= */

async function getLivePrice(): Promise<{
  price: number;
  source: string;
  datetime: string | null;
}> {
  try {
    const data =
      await tdRequest(
        "/price",
        {
          symbol:
            TD_SYMBOL,
          dp: "5",
        },
      );

    const price =
      num(data?.price);

    if (price > 0) {
      return {
        price,
        source:
          "Twelve Data /price",
        datetime: null,
      };
    }
  } catch {
    /* fallback */
  }

  const candles =
    await getCandles(
      TD_SYMBOL,
      "1min",
      2,
    );

  if (!candles.length) {
    throw new Error(
      "XAUUSD price unavailable",
    );
  }

  return {
    price:
      candles[0].close,

    source:
      "Twelve Data /time_series",

    datetime:
      candles[0].datetime,
  };
}


/* =========================================================
   INDICATORS
   ========================================================= */

function ema(
  values: number[],
  period: number,
): number[] {
  if (!values.length) {
    return [];
  }

  const multiplier =
    2 / (period + 1);

  const result: number[] = [];

  let previous =
    values[0];

  result.push(previous);

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    previous =
      (
        values[i] -
        previous
      ) *
        multiplier +
      previous;

    result.push(
      previous,
    );
  }

  return result;
}

function rsi(
  values: number[],
  period = 14,
): number {
  if (
    values.length <=
    period
  ) {
    return 50;
  }

  let gain = 0;
  let loss = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    if (change >= 0) {
      gain += change;
    } else {
      loss +=
        Math.abs(
          change,
        );
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
      values[i] -
      values[i - 1];

    const currentGain =
      change > 0
        ? change
        : 0;

    const currentLoss =
      change < 0
        ? Math.abs(
            change,
          )
        : 0;

    gain =
      (
        gain *
          (period - 1) +
        currentGain
      ) / period;

    loss =
      (
        loss *
          (period - 1) +
        currentLoss
      ) / period;
  }

  if (loss === 0) {
    return 100;
  }

  const rs =
    gain / loss;

  return (
    100 -
    100 / (1 + rs)
  );
}

function macd(
  values: number[],
) {
  if (
    values.length < 30
  ) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
    };
  }

  const ema12 =
    ema(values, 12);

  const ema26 =
    ema(values, 26);

  const line =
    values.map(
      (_, index) =>
        ema12[index] -
        ema26[index],
    );

  const signal =
    ema(line, 9);

  const m =
    line.at(-1) || 0;

  const s =
    signal.at(-1) || 0;

  return {
    macd: m,
    signal: s,
    histogram:
      m - s,
  };
}

function averageVolume(
  candles: Candle[],
  period = 20,
): number {
  const values =
    candles
      .slice(-period)
      .map((c) =>
        num(c.volume),
      )
      .filter(
        (v) => v > 0,
      );

  return avg(values);
}

function candlePattern(
  candle: Candle,
) {
  const body =
    candle.close -
    candle.open;

  const range =
    candle.high -
    candle.low;

  if (range <= 0) {
    return {
      bullish: false,
      bearish: false,
      name: "NONE",
    };
  }

  const bodyRatio =
    Math.abs(body) /
    range;

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
    ) -
    candle.low;

  if (
    body > 0 &&
    bodyRatio >= 0.55
  ) {
    return {
      bullish: true,
      bearish: false,
      name:
        "BULLISH_BODY",
    };
  }

  if (
    body < 0 &&
    bodyRatio >= 0.55
  ) {
    return {
      bullish: false,
      bearish: true,
      name:
        "BEARISH_BODY",
    };
  }

  if (
    lower >
      Math.abs(body) * 1.5 &&
    upper <
      range * 0.3
  ) {
    return {
      bullish: true,
      bearish: false,
      name:
        "BULLISH_REJECTION",
    };
  }

  if (
    upper >
      Math.abs(body) * 1.5 &&
    lower <
      range * 0.3
  ) {
    return {
      bullish: false,
      bearish: true,
      name:
        "BEARISH_REJECTION",
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
  const values =
    candles
      .slice(-count)
      .map(
        (c) => c.high,
      );

  return values.length
    ? Math.max(...values)
    : 0;
}

function recentLow(
  candles: Candle[],
  count = 30,
): number {
  const values =
    candles
      .slice(-count)
      .map(
        (c) => c.low,
      );

  return values.length
    ? Math.min(...values)
    : 0;
}


/* =========================================================
   AI MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket() {
  const [
    m1,
    m5,
    m15,
    h1,
    h4,
  ] = await Promise.all([
    getCandles(
      TD_SYMBOL,
      "1min",
      220,
    ),

    getCandles(
      TD_SYMBOL,
      "5min",
      220,
    ),

    getCandles(
      TD_SYMBOL,
      "15min",
      220,
    ),

    getCandles(
      TD_SYMBOL,
      "1h",
      220,
    ),

    getCandles(
      TD_SYMBOL,
      "4h",
      220,
    ),
  ]);

  if (
    m1.length < 50 ||
    m5.length < 50 ||
    m15.length < 50 ||
    h1.length < 50
  ) {
    throw new Error(
      "Not enough market data",
    );
  }

  const c1 =
    m1.map(
      (c) => c.close,
    );

  const c5 =
    m5.map(
      (c) => c.close,
    );

  const c15 =
    m15.map(
      (c) => c.close,
    );

  const c1h =
    h1.map(
      (c) => c.close,
    );

  const c4h =
    h4.map(
      (c) => c.close,
    );

  const e1Fast =
    ema(c1, 20).at(-1) || 0;

  const e1Slow =
    ema(c1, 50).at(-1) || 0;

  const e5Fast =
    ema(c5, 20).at(-1) || 0;

  const e5Slow =
    ema(c5, 50).at(-1) || 0;

  const e15Fast =
    ema(c15, 20).at(-1) || 0;

  const e15Slow =
    ema(c15, 50).at(-1) || 0;

  const e1hFast =
    ema(c1h, 20).at(-1) || 0;

  const e1hSlow =
    ema(c1h, 50).at(-1) || 0;

  const e4hFast =
    ema(c4h, 20).at(-1) || 0;

  const e4hSlow =
    ema(c4h, 50).at(-1) || 0;

  const rsi5 =
    rsi(c5);

  const macd5 =
    macd(c5);

  const last1 =
    m1[0];

  const price =
    last1?.close || 0;

  let buyVotes = 0;
  let sellVotes = 0;

  const reasons: string[] = [];

  /*
   * H4
   */

  if (
    e4hFast >
    e4hSlow
  ) {
    buyVotes++;

    reasons.push(
      "H4 trend bullish",
    );
  } else if (
    e4hFast <
    e4hSlow
  ) {
    sellVotes++;

    reasons.push(
      "H4 trend bearish",
    );
  }

  /*
   * H1
   */

  if (
    e1hFast >
    e1hSlow
  ) {
    buyVotes++;

    reasons.push(
      "H1 trend bullish",
    );
  } else if (
    e1hFast <
    e1hSlow
  ) {
    sellVotes++;

    reasons.push(
      "H1 trend bearish",
    );
  }

  /*
   * M15
   */

  if (
    e15Fast >
    e15Slow
  ) {
    buyVotes++;

    reasons.push(
      "M15 trend bullish",
    );
  } else if (
    e15Fast <
    e15Slow
  ) {
    sellVotes++;

    reasons.push(
      "M15 trend bearish",
    );
  }

  /*
   * M5
   */

  if (
    e5Fast >
    e5Slow
  ) {
    buyVotes++;
  } else if (
    e5Fast <
    e5Slow
  ) {
    sellVotes++;
  }

  /*
   * M1
   */

  if (
    e1Fast >
    e1Slow
  ) {
    buyVotes++;
  } else if (
    e1Fast <
    e1Slow
  ) {
    sellVotes++;
  }

  /*
   * RSI
   */

  if (
    rsi5 >= 52 &&
    rsi5 <= 72
  ) {
    buyVotes++;

    reasons.push(
      `M5 RSI bullish ${round(
        rsi5,
        1,
      )}`,
    );
  }

  if (
    rsi5 <= 48 &&
    rsi5 >= 28
  ) {
    sellVotes++;

    reasons.push(
      `M5 RSI bearish ${round(
        rsi5,
        1,
      )}`,
    );
  }

  /*
   * MACD
   */

  if (
    macd5.histogram > 0
  ) {
    buyVotes++;

    reasons.push(
      "M5 MACD positive",
    );
  }

  if (
    macd5.histogram < 0
  ) {
    sellVotes++;

    reasons.push(
      "M5 MACD negative",
    );
  }

  /*
   * Candle
   */

  const pattern =
    candlePattern(
      last1,
    );

  if (pattern.bullish) {
    buyVotes++;

    reasons.push(
      pattern.name,
    );
  }

  if (pattern.bearish) {
    sellVotes++;

    reasons.push(
      pattern.name,
    );
  }

  /*
   * Support / Resistance
   */

  const resistance =
    recentHigh(
      m15,
      30,
    );

  const support =
    recentLow(
      m15,
      30,
    );

  if (
    price >
    resistance
  ) {
    buyVotes++;

    reasons.push(
      "M15 resistance breakout",
    );
  }

  if (
    price <
    support
  ) {
    sellVotes++;

    reasons.push(
      "M15 support breakdown",
    );
  }

  /*
   * Volume
   */

  const avgVol =
    averageVolume(
      m1,
      20,
    );

  const currentVol =
    num(
      last1?.volume,
    );

  if (
    avgVol > 0 &&
    currentVol >=
      avgVol * 1.15
  ) {
    if (
      last1.close >
      last1.open
    ) {
      buyVotes++;

      reasons.push(
        "Volume confirms BUY",
      );
    }

    if (
      last1.close <
      last1.open
    ) {
      sellVotes++;

      reasons.push(
        "Volume confirms SELL",
      );
    }
  }

  let direction:
    | Direction
    | null = null;

  if (
    buyVotes >
      sellVotes &&
    buyVotes >=
      MIN_CONFIRMATIONS
  ) {
    direction = "BUY";
  }

  if (
    sellVotes >
      buyVotes &&
    sellVotes >=
      MIN_CONFIRMATIONS
  ) {
    direction = "SELL";
  }

  const confirmations =
    Math.max(
      buyVotes,
      sellVotes,
    );

  const score =
    clamp(
      50 +
        confirmations * 6,
      0,
      100,
    );

  return {
    direction,

    score,

    confirmations,

    timeframe:
      "1min",

    reasons:
      reasons.slice(
        -10,
      ),
  };
}


/* =========================================================
   LEVEL CALCULATION
   ========================================================= */

function calculateLevels(
  entry: number,
  direction: Direction,
) {
  /*
   * XAUUSD standard contract:
   *
   * 1.00 lot = 100 oz
   * 0.10 lot = 10 oz
   * 0.01 lot = 1 oz
   *
   * Therefore:
   *
   * TP1:
   * $5 / 1 oz = $5 price movement
   *
   * TP2:
   * $8 / 1 oz = $8 movement
   *
   * TP3:
   * $12 / 1 oz = $12 movement
   *
   * Initial SL:
   * $4 / 10 oz = $0.40
   */

  const slDistance =
    INITIAL_SL_USD /
    (
      CONTRACT_SIZE *
      TOTAL_LOT
    );

  const tp1Distance =
    TP1_PER_001_USD /
    (
      CONTRACT_SIZE *
      0.01
    );

  const tp2Distance =
    TP2_PER_001_USD /
    (
      CONTRACT_SIZE *
      0.01
    );

  const tp3Distance =
    TP3_PER_001_USD /
    (
      CONTRACT_SIZE *
      0.01
    );

  if (
    direction === "BUY"
  ) {
    return {
      stopLoss:
        round(
          entry -
            slDistance,
          2,
        ),

      tp1:
        round(
          entry +
            tp1Distance,
          2,
        ),

      tp2:
        round(
          entry +
            tp2Distance,
          2,
        ),

      tp3:
        round(
          entry +
            tp3Distance,
          2,
        ),
    };
  }

  return {
    stopLoss:
      round(
        entry +
          slDistance,
        2,
      ),

    tp1:
      round(
        entry -
          tp1Distance,
        2,
      ),

    tp2:
      round(
        entry -
          tp2Distance,
        2,
      ),

    tp3:
      round(
        entry -
          tp3Distance,
        2,
      ),
  };
}


/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToman() {
  const apiKey =
    process.env
      .NETARZ_API_KEY;

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
    const response =
      await fetch(
        `${NETARZ_URL}/rates/USD`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            Accept:
              "application/json",
          },

          signal:
            AbortSignal.timeout(
              8000,
            ),
        },
      );

    if (!response.ok) {
      throw new Error(
        `NetArz HTTP ${response.status}`,
      );
    }

    const json =
      await response.json();

    const rate =
      num(
        json?.data?.mid,
        num(
          json?.meta?.usd_irt,
        ),
      );

    if (!rate) {
      throw new Error(
        "USD rate unavailable",
      );
    }

    return {
      rate,

      asOf:
        json?.meta?.as_of
          ? String(
              json.meta.as_of,
            )
          : null,

      delayed:
        Boolean(
          json?.meta
            ?.is_delayed,
        ),

      delayedMinutes:
        json?.meta
          ?.delayed_minutes ==
        null
          ? null
          : num(
              json.meta
                .delayed_minutes,
            ),

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
) {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (
    !token ||
    !chatId
  ) {
    return {
      ok: false,
      error:
        "Telegram environment variables missing",
    };
  }

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              chat_id:
                chatId,

              text,

              parse_mode:
                "HTML",

              disable_web_page_preview:
                true,
            }),

          signal:
            AbortSignal.timeout(
              10000,
            ),
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
          data?.result
            ?.message_id,
        ),
    };
  } catch (error) {
    return {
      ok: false,

      error:
        error instanceof Error
          ? error.message
          : "Telegram failed",
    };
  }
}


/* =========================================================
   DEFAULT STATE
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

    currentStopLoss:
      stopLoss,

    remainingLot:
      TOTAL_LOT,

    realizedPnlUsd: 0,

    realizedPnlToman:
      null,

    events: [],
  };
}


/* =========================================================
   SAFE JSON
   ========================================================= */

function safeJson(
  value: unknown,
): any {
  /*
   * Converts undefined values away.
   *
   * This prevents Prisma JSON
   * InputJsonValue problems.
   */

  return JSON.parse(
    JSON.stringify(
      value,
    ),
  );
}


/* =========================================================
   NORMALIZE META
   ========================================================= */

function normalizeMeta(
  raw: unknown,
  signal?: any,
): SignalMeta | null {
  if (
    !raw ||
    typeof raw !==
      "object"
  ) {
    return null;
  }

  const value =
    raw as Record<
      string,
      any
    >;

  const direction:
    Direction =
    value.direction ===
    "SELL"
      ? "SELL"
      : "BUY";

  const entry =
    num(
      value.entry,
      num(
        signal?.entry,
      ),
    );

  if (!entry) {
    return null;
  }

  let stopLoss =
    num(
      value.stopLoss,
      num(
        signal?.stopLoss,
      ),
    );

  let tp1 =
    num(value.tp1);

  let tp2 =
    num(value.tp2);

  let tp3 =
    num(value.tp3);

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
      stopLoss ||
      levels.stopLoss;

    tp1 =
      tp1 ||
      levels.tp1;

    tp2 =
      tp2 ||
      levels.tp2;

    tp3 =
      tp3 ||
      levels.tp3;
  }

  const rawState =
    value.state &&
    typeof value.state ===
      "object"
      ? value.state
      : null;

  const defaultState =
    createDefaultState(
      stopLoss,
    );

  const state:
    SignalState = {
    tp1Hit:
      Boolean(
        rawState?.tp1Hit,
      ),

    tp2Hit:
      Boolean(
        rawState?.tp2Hit,
      ),

    tp3Hit:
      Boolean(
        rawState?.tp3Hit,
      ),

    slHit:
      Boolean(
        rawState?.slHit,
      ),

    breakevenHit:
      Boolean(
        rawState?.breakevenHit,
      ),

    breakEvenArmed:
      Boolean(
        rawState?.breakEvenArmed,
      ),

    closed:
      Boolean(
        rawState?.closed,
      ),

    currentStopLoss:
      num(
        rawState?.currentStopLoss,
        defaultState.currentStopLoss,
      ),

    remainingLot:
      num(
        rawState?.remainingLot,
        TOTAL_LOT,
      ),

    realizedPnlUsd:
      num(
        rawState?.realizedPnlUsd,
      ),

    realizedPnlToman:
      rawState?.realizedPnlToman ==
      null
        ? null
        : num(
            rawState.realizedPnlToman,
          ),

    events:
      Array.isArray(
        rawState?.events,
      )
        ? rawState.events
        : [],

    lastCheckedAt:
      rawState?.lastCheckedAt
        ? String(
            rawState.lastCheckedAt,
          )
        : undefined,
  };

  return {
    version:
      num(
        value.version,
        2,
      ),

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
      num(
        value.score,
      ),

    confirmations:
      num(
        value.confirmations,
      ),

    reasons:
      Array.isArray(
        value.reasons,
      )
        ? value.reasons.map(
            String,
          )
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
        state.currentStopLoss,
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
        state.remainingLot,
      ),

    tp1Per001LotUsd:
      TP1_PER_001_USD,

    tp2Per001LotUsd:
      TP2_PER_001_USD,

    tp3Per001LotUsd:
      TP3_PER_001_USD,

    tp1TotalUsd:
      TP1_TOTAL_USD,

    tp2TotalUsd:
      TP2_TOTAL_USD,

    tp3TotalUsd:
      TP3_TOTAL_USD,

    fullTpUsd:
      FULL_TP_USD,

    usdToToman:
      value.usdToToman ==
      null
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
        : null,

    state,

    telegramInitial:
      value.telegramInitial &&
      typeof value.telegramInitial ===
        "object"
        ? value.telegramInitial
        : null,

    createdAt:
      value.createdAt
        ? String(
            value.createdAt,
          )
        : null,

    updatedAt:
      value.updatedAt
        ? String(
            value.updatedAt,
          )
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
  return meta.state.events.some(
    (event) =>
      event.type ===
      type,
  );
}

function createEvent(
  signalId: string,
  type: EventType,
  price: number,
  pnlUsd: number,
  rate: number | null,
): EventRecord {
  return {
    id:
      `${signalId}:${type}`,

    type,

    createdAt:
      isoNow(),

    price:
      round(
        price,
        2,
      ),

    pnlUsd:
      round(
        pnlUsd,
        2,
      ),

    pnlToman:
      rate == null
        ? null
        : round(
            pnlUsd *
              rate,
            0,
          ),

    usdToToman:
      rate,

    telegram: {
      status:
        "PENDING",

      messageId:
        null,

      sentAt:
        null,

      error:
        null,

      attempts:
        0,
    },
  };
}


/* =========================================================
   TELEGRAM INITIAL MESSAGE
   ========================================================= */

function makeInitialTelegramText(
  signalId: string,
  meta: SignalMeta,
): string {
  const icon =
    meta.direction ===
    "BUY"
      ? "🟢"
      : "🔴";

  let strength =
    "WEAK";

  if (
    meta.score >= 80 &&
    meta.confirmations >=
      6
  ) {
    strength =
      "PROFESSIONAL";
  } else if (
    meta.score >= 70 &&
    meta.confirmations >=
      4
  ) {
    strength =
      "MEDIUM";
  }

  return `
<b>🤖 XAUUSD AI SIGNAL</b>

${icon} <b>${meta.direction}</b>
<b>Strength:</b> ${strength}

<b>Entry:</b> ${meta.entry.toFixed(2)}
<b>SL:</b> ${meta.stopLoss.toFixed(2)}

<b>TP1:</b> ${meta.tp1.toFixed(2)}
<b>TP2:</b> ${meta.tp2.toFixed(2)}
<b>TP3:</b> ${meta.tp3.toFixed(2)}

━━━━━━━━━━━━━━

<b>LOT:</b> 0.10

<b>TP1</b>
0.04 LOT → <b>+$20</b>

<b>TP2</b>
0.03 LOT → <b>+$24</b>

<b>TP3</b>
0.03 LOT → <b>+$36</b>

<b>FULL TP:</b> +$80

━━━━━━━━━━━━━━

<b>After TP1:</b>

0.04 LOT CLOSED
0.06 LOT REMAINING

🛡️ SL → ENTRY

یعنی سود TP1 محافظت می‌شود.

<b>Score:</b>
${meta.score}/100

<b>Confirmations:</b>
${meta.confirmations}

<b>Session:</b>
${esc(meta.session)}

<b>Iran Time:</b>
${esc(iranTime())}

━━━━━━━━━━━━━━

⚠️ <b>این تحلیل هوش مصنوعی است و تضمین سود ندارد.</b>

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
}


/* =========================================================
   TELEGRAM EVENT MESSAGE
   ========================================================= */

function makeEventTelegramText(
  signalId: string,
  meta: SignalMeta,
  event: EventRecord,
): string {
  if (
    event.type ===
    "TP1_HIT"
  ) {
    return `
<b>🎯 TP1 HIT</b>

🟢 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b>
${event.price.toFixed(2)}

<b>Closed:</b>
0.04 LOT

<b>TP1 PROFIT:</b>
+$20

━━━━━━━━━━━━━━

🛡️ <b>RISK FREE ACTIVATED</b>

<b>Remaining:</b>
0.06 LOT

<b>SL MOVED TO ENTRY:</b>
${meta.entry.toFixed(2)}

اگر قیمت به Entry برگردد،
سود +$20 حفظ می‌شود.

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (
    event.type ===
    "BREAKEVEN_HIT"
  ) {
    return `
<b>🛡️ BREAK EVEN HIT</b>

<b>XAUUSD ${meta.direction}</b>

<b>Price:</b>
${event.price.toFixed(2)}

<b>TP1 PROFIT PROTECTED:</b>
+$20

<b>Remaining position:</b>
0.06 LOT

<b>Status:</b>
POSITION CLOSED AT ENTRY

━━━━━━━━━━━━━━

سود TP1 همچنان ثبت شده است.

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (
    event.type ===
    "TP2_HIT"
  ) {
    return `
<b>🎯 TP2 HIT</b>

🟢 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b>
${event.price.toFixed(2)}

<b>Closed:</b>
0.03 LOT

<b>TP2 PROFIT:</b>
+$24

<b>Total Realized:</b>
+$44

<b>Remaining:</b>
0.03 LOT

━━━━━━━━━━━━━━

🎯 TP3 هنوز فعال است.

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  if (
    event.type ===
    "TP3_HIT"
  ) {
    return `
<b>🏆 TP3 HIT</b>

<b>XAUUSD ${meta.direction}</b>

<b>Price:</b>
${event.price.toFixed(2)}

<b>Closed:</b>
0.03 LOT

<b>TP3 PROFIT:</b>
+$36

━━━━━━━━━━━━━━

<b>FULL TP:</b>
+$80

<b>0.10 LOT CLOSED</b>

🏆 <b>TRADE COMPLETED</b>

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
  }

  return `
<b>🛑 STOP LOSS HIT</b>

🔴 <b>XAUUSD ${meta.direction}</b>

<b>Price:</b>
${event.price.toFixed(2)}

<b>Loss:</b>
-$4

<b>Remaining:</b>
${meta.remainingLot.toFixed(2)} LOT

━━━━━━━━━━━━━━

<b>Initial SL was activated.</b>

<b>Iran Time:</b>
${esc(iranTime())}

<b>Signal ID:</b>
<code>${esc(signalId)}</code>
`.trim();
}


/* =========================================================
   SAVE META
   ========================================================= */

async function saveSignalMeta(
  signalId: string,
  meta: SignalMeta,
  status?: string,
) {
  /*
   * IMPORTANT:
   *
   * JSON.parse(JSON.stringify(...))
   * removes undefined values and gives
   * Prisma a clean JSON object.
   */

  const cleanMetadata =
    safeJson(meta);

  const data: any = {
    metadata:
      cleanMetadata,
  };

  if (status) {
    data.status =
      status;
  }

  await prisma.tradingSignal.update(
    {
      where: {
        id: signalId,
      },

      data,
    },
  );
}


/* =========================================================
   SEND EVENT
   ========================================================= */

async function deliverEvent(
  signal: any,
  meta: SignalMeta,
  event: EventRecord,
) {
  if (
    event.telegram.status ===
    "SENT"
  ) {
    return;
  }

  const text =
    makeEventTelegramText(
      signal.id,
      meta,
      event,
    );

  const result =
    await sendTelegram(
      text,
    );

  event.telegram.attempts =
    num(
      event.telegram.attempts,
    ) + 1;

  if (result.ok) {
    event.telegram.status =
      "SENT";

    event.telegram.messageId =
      result.messageId ??
      null;

    event.telegram.sentAt =
      isoNow();

    event.telegram.error =
      null;
  } else {
    event.telegram.status =
      "FAILED";

    event.telegram.error =
      result.error ??
      "Telegram failed";
  }
}


/* =========================================================
   MONITOR SIGNAL
   ========================================================= */

async function monitorSignal(
  signal: any,
) {
  const meta =
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
   * Filter candles so old candles
   * don't trigger a new signal.
   */

  const createdAt =
    signal.createdAt
      ? new Date(
          signal.createdAt,
        ).getTime()
      : 0;

  const usable =
    candles.filter(
      (c) => {
        if (!createdAt) {
          return true;
        }

        const t =
          new Date(
            c.datetime,
          ).getTime();

        return (
          t >=
          createdAt - 60000
        );
      },
    );

  const candleHigh =
    usable.length
      ? Math.max(
          ...usable.map(
            (c) => c.high,
          ),
        )
      : price;

  const candleLow =
    usable.length
      ? Math.min(
          ...usable.map(
            (c) => c.low,
          ),
        )
      : price;

  const isBuy =
    meta.direction ===
    "BUY";

  const hitHigh =
    (
      level: number,
    ) =>
      price >= level ||
      candleHigh >= level;

  const hitLow =
    (
      level: number,
    ) =>
      price <= level ||
      candleLow <= level;


  /* =======================================================
     CURRENT STOP
     ======================================================= */

  const currentStop =
    meta.state
      .breakEvenArmed
      ? meta.entry
      : meta.initialStopLoss;

  meta.currentStopLoss =
    currentStop;

  meta.state.currentStopLoss =
    currentStop;


  /* =======================================================
     STOP / BREAK EVEN
     ======================================================= */

  const stopHit =
    isBuy
      ? hitLow(
          currentStop,
        )
      : hitHigh(
          currentStop,
        );

  if (stopHit) {
    /*
     * BREAK EVEN
     */

    if (
      meta.state
        .breakEvenArmed &&
      !meta.state
        .breakevenHit
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

        meta.state
          .breakevenHit =
          true;

        meta.state.closed =
          true;

        meta.state
          .remainingLot =
          0;

        meta.state
          .currentStopLoss =
          meta.entry;

        meta.currentStopLoss =
          meta.entry;

        meta.state
          .realizedPnlToman =
          fx.rate == null
            ? null
            : round(
                meta.state
                  .realizedPnlUsd *
                  fx.rate,
                0,
              );

        await saveSignalMeta(
          signal.id,
          meta,
          "BREAKEVEN",
        );

        await deliverEvent(
          signal,
          meta,
          event,
        );

        await saveSignalMeta(
          signal.id,
          meta,
          "BREAKEVEN",
        );
      }

      return;
    }

    /*
     * INITIAL STOP LOSS
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
            -INITIAL_SL_USD,
            fx.rate,
          );

        meta.state.events.push(
          event,
        );

        meta.state.slHit =
          true;

        meta.state.closed =
          true;

        meta.state
          .remainingLot =
          0;

        meta.state
          .currentStopLoss =
          meta.initialStopLoss;

        meta.currentStopLoss =
          meta.initialStopLoss;

        meta.state
          .realizedPnlUsd =
          round(
            meta.state
              .realizedPnlUsd -
              INITIAL_SL_USD,
            2,
          );

        meta.state
          .realizedPnlToman =
          fx.rate == null
            ? null
            : round(
                meta.state
                  .realizedPnlUsd *
                  fx.rate,
                0,
              );

        await saveSignalMeta(
          signal.id,
          meta,
          "SL_HIT",
        );

        await deliverEvent(
          signal,
          meta,
          event,
        );

        await saveSignalMeta(
          signal.id,
          meta,
          "SL_HIT",
        );
      }

      return;
    }
  }


  /* =======================================================
     TP1
     ======================================================= */

  const tp1Hit =
    isBuy
      ? hitHigh(meta.tp1)
      : hitLow(meta.tp1);

  if (
    !meta.state.tp1Hit &&
    tp1Hit
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

      /*
       * Close 0.04
       */

      meta.state.tp1Hit =
        true;

      meta.state.remainingLot =
        REMAINING_AFTER_TP1;

      /*
       * PROFIT PROTECTION
       *
       * 0.06 LOT remains.
       * Stop -> Entry.
       */

      meta.state
        .breakEvenArmed =
        true;

      meta.state
        .currentStopLoss =
        meta.entry;

      meta.currentStopLoss =
        meta.entry;

      meta.state
        .realizedPnlUsd =
        round(
          meta.state
            .realizedPnlUsd +
            TP1_TOTAL_USD,
          2,
        );

      meta.state
        .realizedPnlToman =
        fx.rate == null
          ? null
          : round(
              meta.state
                .realizedPnlUsd *
                fx.rate,
              0,
            );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP1_HIT",
      );

      await deliverEvent(
        signal,
        meta,
        event,
      );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP1_HIT",
      );
    }

    return;
  }


  /* =======================================================
     TP2
     ======================================================= */

  const tp2Hit =
    isBuy
      ? hitHigh(meta.tp2)
      : hitLow(meta.tp2);

  if (
    meta.state.tp1Hit &&
    !meta.state.tp2Hit &&
    tp2Hit
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
       * 0.03 closed
       * 0.03 remains
       */

      meta.state.remainingLot =
        TP3_LOT;

      meta.state
        .realizedPnlUsd =
        round(
          meta.state
            .realizedPnlUsd +
            TP2_TOTAL_USD,
          2,
        );

      meta.state
        .realizedPnlToman =
        fx.rate == null
          ? null
          : round(
              meta.state
                .realizedPnlUsd *
                fx.rate,
              0,
            );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP2_HIT",
      );

      await deliverEvent(
        signal,
        meta,
        event,
      );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP2_HIT",
      );
    }

    return;
  }


  /* =======================================================
     TP3
     ======================================================= */

  const tp3Hit =
    isBuy
      ? hitHigh(meta.tp3)
      : hitLow(meta.tp3);

  if (
    meta.state.tp1Hit &&
    meta.state.tp2Hit &&
    !meta.state.tp3Hit &&
    tp3Hit
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

      meta.state
        .realizedPnlUsd =
        round(
          meta.state
            .realizedPnlUsd +
            TP3_TOTAL_USD,
          2,
        );

      meta.state
        .realizedPnlToman =
        fx.rate == null
          ? null
          : round(
              meta.state
                .realizedPnlUsd *
                fx.rate,
              0,
            );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP3_HIT",
      );

      await deliverEvent(
        signal,
        meta,
        event,
      );

      await saveSignalMeta(
        signal.id,
        meta,
        "TP3_HIT",
      );
    }
  }
}


/* =========================================================
   RETRY FAILED EVENTS
   ========================================================= */

async function retryFailedEvents() {
  const signals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          status: {
            in:
              ACTIVE_STATUSES,
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },

        take: 100,
      },
    );

  for (
    const signal of signals
  ) {
    const meta =
      normalizeMeta(
        signal.metadata,
        signal,
      );

    if (!meta) {
      continue;
    }

    let changed =
      false;

    for (
      const event of
        meta.state.events
    ) {
      if (
        event.telegram
          .status !==
        "FAILED"
      ) {
        continue;
      }

      const attempts =
        num(
          event.telegram
            .attempts,
        );

      if (
        attempts >= 5
      ) {
        continue;
      }

      await deliverEvent(
        signal,
        meta,
        event,
      );

      changed = true;
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
   SCAN USER
   ========================================================= */

async function scanUser(
  userId: string,
) {
  const bots =
    await prisma.tradingBot.findMany(
      {
        where: {
          userId,
          isActive: true,
        },
      },
    );

  const goldBots =
    bots.filter(
      (bot: any) => {
        const symbol =
          normalizeSymbol(
            bot.symbol,
          );

        return (
          symbol ===
            SYMBOL ||
          symbol ===
            "GOLD"
        );
      },
    );

  if (!goldBots.length) {
    return {
      created: false,

      reason:
        "No active XAUUSD bot",
    };
  }

  /*
   * Only one active signal
   * at a time.
   */

  const existing =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          userId,

          symbol:
            SYMBOL,

          status: {
            in:
              ACTIVE_STATUSES,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      },
    );

  if (existing) {
    return {
      created: false,

      reason:
        "Active XAUUSD signal already exists",

      signalId:
        existing.id,
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

  if (
    analysis.direction ===
      "BUY" &&
    bot.buyEnabled ===
      false
  ) {
    return {
      created: false,

      reason:
        "BUY disabled",
    };
  }

  if (
    analysis.direction ===
      "SELL" &&
    bot.sellEnabled ===
      false
  ) {
    return {
      created: false,

      reason:
        "SELL disabled",
    };
  }

  const [
    live,
    fx,
  ] = await Promise.all([
    getLivePrice(),
    getUsdToman(),
  ]);

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

  const meta: SignalMeta =
    {
      version: 3,

      symbol:
        SYMBOL,

      direction:
        analysis.direction,

      timeframe:
        analysis.timeframe,

      session:
        getMarketSession(),

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
        TP1_PER_001_USD,

      tp2Per001LotUsd:
        TP2_PER_001_USD,

      tp3Per001LotUsd:
        TP3_PER_001_USD,

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

      state:
        createDefaultState(
          levels.stopLoss,
        ),

      telegramInitial:
        null,

      createdAt:
        isoNow(),

      updatedAt:
        isoNow(),
    };

  /*
   * VERY IMPORTANT:
   *
   * safeJson(meta)
   *
   * guarantees Prisma receives
   * valid JSON.
   */

  const tradingSignal =
    await (
      prisma.tradingSignal as any
    ).create(
      {
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
            safeJson(meta),

          telegramSent:
            false,
        },
      },
    );

  const telegramText =
    makeInitialTelegramText(
      tradingSignal.id,
      meta,
    );

  const telegram =
    await sendTelegram(
      telegramText,
    );

  meta.telegramInitial =
    {
      status:
        telegram.ok
          ? "SENT"
          : "FAILED",

      messageId:
        telegram.messageId ??
        null,

      sentAt:
        telegram.ok
          ? isoNow()
          : null,

      error:
        telegram.error ??
        null,

      attempts: 1,
    };

  await (
    prisma.tradingSignal as any
  ).update(
    {
      where: {
        id:
          tradingSignal.id,
      },

      data: {
        metadata:
          safeJson(meta),

        telegramSent:
          telegram.ok,

        telegramMessageId:
          telegram.messageId ??
          null,

        telegramSentAt:
          telegram.ok
            ? new Date()
            : null,
      },
    },
  );

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
      telegram.ok,

    telegramError:
      telegram.error ??
      null,
  };
}


/* =========================================================
   MONITOR ALL
   ========================================================= */

async function monitorAllSignals() {
  const signals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          status: {
            in:
              ACTIVE_STATUSES,
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },

        take: 100,
      },
    );

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

async function scanAllUsers() {
  const bots =
    await prisma.tradingBot.findMany(
      {
        where: {
          isActive: true,
        },

        select: {
          userId: true,
        },
      },
    );

  const userIds =
    Array.from(
      new Set(
        bots
          .map(
            (bot) =>
              bot.userId,
          )
          .filter(Boolean),
      ),
    );

  const results: any[] =
    [];

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
          error instanceof
          Error
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

  /*
   * GitHub Actions currently calls:
   *
   * /api/ai-analysis?cron=1
   */

  if (
    cron === "1"
  ) {
    return true;
  }

  const expected =
    process.env
      .SIGNALS_CRON_SECRET ||
    process.env
      .AI_CRON_SECRET ||
    process.env
      .NEWS_CRON_SECRET;

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
      received ===
        expected,
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

  let scan: any[] =
    [];

  let retryError:
    | string
    | null = null;

  try {
    await retryFailedEvents();
  } catch (error) {
    retryError =
      error instanceof
      Error
        ? error.message
        : "Retry failed";
  }

  try {
    monitor =
      await monitorAllSignals();
  } catch {
    monitor = {
      checked: 0,
      errors: 1,
    };
  }

  try {
    scan =
      await scanAllUsers();
  } catch {
    scan = [];
  }

  let live:
    | Awaited<
        ReturnType<
          typeof getLivePrice
        >
      >
    | null = null;

  let fx:
    | Awaited<
        ReturnType<
          typeof getUsdToman
        >
      >
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
        TP1_PER_001_USD,

      tp2Per001LotUsd:
        TP2_PER_001_USD,

      tp3Per001LotUsd:
        TP3_PER_001_USD,

      tp1TotalUsd:
        TP1_TOTAL_USD,

      tp2TotalUsd:
        TP2_TOTAL_USD,

      tp3TotalUsd:
        TP3_TOTAL_USD,

      fullTpUsd:
        FULL_TP_USD,

      initialSlUsd:
        INITIAL_SL_USD,

      remainingAfterTp1:
        REMAINING_AFTER_TP1,

      stopAfterTp1:
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
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 500,
      },
    );

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

    if (!meta) {
      continue;
    }

    realizedUsd +=
      num(
        meta.state
          .realizedPnlUsd,
      );

    if (
      meta.state.tp1Hit ||
      meta.state.tp2Hit ||
      meta.state.tp3Hit
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
          (
            wins /
            completed
          ) * 100,
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
   * ===============================================
   * CRON / SERVER ENGINE
   * ===============================================
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
            error instanceof
            Error
              ? error.message
              : "AI engine failed",
        },
        {
          status: 500,
        },
      );
    }
  }


  /* =====================================================
     AUTHENTICATION
     ===================================================== */

  const session =
    await getSession();

  /*
   * IMPORTANT:
   *
   * Your project's getSession()
   * returns:
   *
   * {
   *   id: string,
   *   userId: string
   * }
   *
   * NOT:
   *
   * session.user.id
   */

  if (
    !session?.userId
  ) {
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

  const userId =
    session.userId;


  /* =====================================================
     DASHBOARD REQUEST
     ===================================================== */

  try {
    const shouldScan =
      request.nextUrl
        .searchParams.get(
          "scan",
        ) === "1";

    let scanResult:
      | any
      | null = null;

    if (shouldScan) {
      scanResult =
        await scanUser(
          userId,
        );
    }

    /*
     * Monitor active signals
     * during dashboard request.
     */

    try {
      await monitorAllSignals();
    } catch {
      /*
       * Don't break dashboard
       * if monitoring fails.
       */
    }

    const signals =
      await prisma.tradingSignal.findMany(
        {
          where: {
            userId,
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 100,
        },
      );

    const [
      live,
      fx,
      performance,
    ] = await Promise.all([
      getLivePrice(),

      getUsdToman(),

      calculatePerformance(
        userId,
      ),
    ]);

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
            TP1_PER_001_USD,

          tp2Per001LotUsd:
            TP2_PER_001_USD,

          tp3Per001LotUsd:
            TP3_PER_001_USD,

          tp1TotalUsd:
            TP1_TOTAL_USD,

          tp2TotalUsd:
            TP2_TOTAL_USD,

          tp3TotalUsd:
            TP3_TOTAL_USD,

          fullTpUsd:
            FULL_TP_USD,

          initialSlUsd:
            INITIAL_SL_USD,

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
          error instanceof
          Error
            ? error.message
            : "AI analysis request failed",
      },
      {
        status: 500,
      },
    );
  }
}
