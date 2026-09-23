import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type SignalEventType =
  | "SIGNAL_CREATED"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "EXPIRED";

type SignalEvent = {
  type: SignalEventType;
  price: number;
  pnlUsd: number;
  pnlToman?: number | null;
  at: string;
};

type RiskConfig = {
  lotSize: number;
  stopLossDollars: number;
  tp1Dollars: number;
  tp2Dollars: number;
  tp3Dollars: number;
  contractSize: number;
  usdTomanRate: number;
};

type SignalMetadata = {
  risk: RiskConfig;

  levels: {
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
  };

  state: {
    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    slHit: boolean;
  };

  events: SignalEvent[];

  lastPrice?: number;
  lastPriceAt?: string;

  analysis?: {
    score?: number;
    confirmations?: number;
    mtfAgreement?: number;
    direction?: Direction;
  };
};

type ReactionLevel = {
  price: number;
  zoneLow: number;
  zoneHigh: number;
  touches: number;
  timeframeScore: number;
  strength: number;
};

type ReactionLevels = {
  symbol: string;
  currentPrice: number;
  supports: ReactionLevel[];
  resistances: ReactionLevel[];
  atr: number;
  generatedAt: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const TWELVE_DATA_URL =
  "https://api.twelvedata.com";

const DEFAULT_STOP_LOSS_USD = 4;
const DEFAULT_TP1_USD = 5;
const DEFAULT_TP2_USD = 10;
const DEFAULT_TP3_USD = 15;

const DEFAULT_SIGNAL_SCORE = 86;
const DEFAULT_MIN_CONFIRMATIONS = 6;
const DEFAULT_MIN_MTF_AGREEMENT = 3;

const DEFAULT_SIGNAL_GAP_MINUTES = 45;
const DEFAULT_MAX_SIGNALS_PER_SYMBOL_DAY = 3;

const LEVEL_REMINDER_MINUTES = 120;

const INTERVALS = [
  "1min",
  "5min",
  "15min",
  "30min",
  "45min",
  "1h",
  "2h",
  "4h",
  "8h",
  "1day",
] as const;

const MTF_CHAIN = [
  "4h",
  "1h",
  "15min",
  "5min",
  "1min",
] as const;

/* =========================================================
   BASIC HELPERS
========================================================= */

function num(
  value: unknown,
  fallback = 0
): number {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function average(
  values: number[]
): number {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function round(
  value: number,
  digits = 5
): number {
  const power =
    10 ** digits;

  return (
    Math.round(
      value * power
    ) / power
  );
}

function parseObject(
  value: unknown
): Record<string, any> {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {};
  }

  return value as Record<
    string,
    any
  >;
}

function escapeHtml(
  value: string
): string {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    );
}

function formatMoneyUsd(
  value: number
): string {
  const absolute =
    Math.abs(value);

  return value >= 0
    ? `+$${absolute.toFixed(2)}`
    : `-$${absolute.toFixed(2)}`;
}

function formatToman(
  value: number | null
): string {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "نرخ تومان در دسترس نیست";
  }

  return `${Math.round(
    value
  ).toLocaleString(
    "fa-IR"
  )} تومان`;
}

function formatPrice(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1000) {
    return value.toFixed(2);
  }

  if (value >= 100) {
    return value.toFixed(2);
  }

  if (value >= 10) {
    return value.toFixed(3);
  }

  return value.toFixed(5);
}

/* =========================================================
   SYMBOL
========================================================= */

function normalizeSymbol(
  symbol: string
): string {
  const clean =
    symbol
      .replace(/\s/g, "")
      .toUpperCase();

  const map: Record<
    string,
    string
  > = {
    XAUUSD: "XAU/USD",
    XAGUSD: "XAG/USD",

    EURUSD: "EUR/USD",
    GBPUSD: "GBP/USD",
    USDJPY: "USD/JPY",
    AUDUSD: "AUD/USD",
    USDCAD: "USD/CAD",
    USDCHF: "USD/CHF",
    NZDUSD: "NZD/USD",

    BTCUSDT: "BTC/USD",
    ETHUSDT: "ETH/USD",
  };

  if (map[clean]) {
    return map[clean];
  }

  if (clean.includes("/")) {
    return clean;
  }

  if (clean.length === 6) {
    return `${clean.slice(
      0,
      3
    )}/${clean.slice(3)}`;
  }

  return clean;
}

/* =========================================================
   TIMEFRAME
========================================================= */

function normalizeTimeframe(
  timeframe?: string | null
): string {
  const raw =
    String(
      timeframe ?? "15min"
    )
      .toLowerCase()
      .trim();

  const aliases: Record<
    string,
    string
  > = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "45m": "45min",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "8h": "8h",
    "1d": "1day",
    day: "1day",
    daily: "1day",
    "1day": "1day",
  };

  if (aliases[raw]) {
    return aliases[raw];
  }

  if (
    INTERVALS.includes(
      raw as (typeof INTERVALS)[number]
    )
  ) {
    return raw;
  }

  return "15min";
}

/* =========================================================
   TWELVE DATA
========================================================= */

async function twelveData(
  endpoint: string,
  params: Record<
    string,
    string | number | boolean
  >
) {
  const apiKey =
    process.env
      .TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد."
    );
  }

  const url = new URL(
    `${TWELVE_DATA_URL}${endpoint}`
  );

  Object.entries({
    ...params,
    apikey: apiKey,
  }).forEach(
    ([key, value]) => {
      url.searchParams.set(
        key,
        String(value)
      );
    }
  );

  const response =
    await fetch(url, {
      cache: "no-store",
    });

  const data =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !data ||
    data.status ===
      "error" ||
    data.code
  ) {
    throw new Error(
      String(
        data?.message ??
          `Twelve Data HTTP ${response.status}`
      )
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
  outputsize = 220
): Promise<Candle[]> {
  const data =
    await twelveData(
      "/time_series",
      {
        symbol:
          normalizeSymbol(
            symbol
          ),
        interval,
        outputsize,
        order: "asc",
        timezone: "UTC",
      }
    );

  if (
    !Array.isArray(
      data.values
    ) ||
    data.values.length < 60
  ) {
    throw new Error(
      `داده کافی برای ${symbol} در ${interval} دریافت نشد.`
    );
  }

  return data.values
    .map(
      (item: any) => ({
        datetime:
          String(
            item.datetime
          ),
        open: num(
          item.open
        ),
        high: num(
          item.high
        ),
        low: num(
          item.low
        ),
        close: num(
          item.close
        ),
        volume:
          item.volume ==
          null
            ? undefined
            : num(
                item.volume
              ),
      })
    )
    .filter(
      (item: Candle) =>
        item.open > 0 &&
        item.high > 0 &&
        item.low > 0 &&
        item.close > 0
    );
}

async function getLatestPrice(
  symbol: string
) {
  const data =
    await twelveData(
      "/time_series",
      {
        symbol:
          normalizeSymbol(
            symbol
          ),
        interval: "1min",
        outputsize: 2,
        order: "desc",
        timezone: "UTC",
      }
    );

  const candle =
    data.values?.[0];

  if (!candle) {
    throw new Error(
      `قیمت ${symbol} دریافت نشد.`
    );
  }

  return {
    price: num(
      candle.close
    ),
    high: num(
      candle.high
    ),
    low: num(
      candle.low
    ),
    datetime:
      String(
        candle.datetime
      ),
  };
}

/* =========================================================
   INDICATORS
========================================================= */

function ema(
  values: number[],
  period: number
): number {
  if (
    values.length <
    period
  ) {
    return 0;
  }

  let result =
    average(
      values.slice(
        0,
        period
      )
    );

  const multiplier =
    2 /
    (period + 1);

  for (
    let i = period;
    i <
    values.length;
    i++
  ) {
    result =
      values[i] *
        multiplier +
      result *
        (1 - multiplier);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14
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
    const diff =
      values[i] -
      values[i - 1];

    if (diff >= 0) {
      gain += diff;
    } else {
      loss -= diff;
    }
  }

  let avgGain =
    gain / period;

  let avgLoss =
    loss / period;

  for (
    let i =
      period + 1;
    i <
    values.length;
    i++
  ) {
    const diff =
      values[i] -
      values[i - 1];

    avgGain =
      ((avgGain *
        (period - 1)) +
        (diff > 0
          ? diff
          : 0)) /
      period;

    avgLoss =
      ((avgLoss *
        (period - 1)) +
        (diff < 0
          ? -diff
          : 0)) /
      period;
  }

  if (
    avgLoss === 0
  ) {
    return 100;
  }

  const rs =
    avgGain /
    avgLoss;

  return (
    100 -
    100 / (1 + rs)
  );
}

function atr(
  candles: Candle[],
  period = 14
): number {
  if (
    candles.length <=
    period
  ) {
    return 0;
  }

  const ranges: number[] =
    [];

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    ranges.push(
      Math.max(
        current.high -
          current.low,

        Math.abs(
          current.high -
            previous.close
        ),

        Math.abs(
          current.low -
            previous.close
        )
      )
    );
  }

  return average(
    ranges.slice(-period)
  );
}

function macd(
  values: number[]
) {
  const fast =
    ema(values, 12);

  const slow =
    ema(values, 26);

  const line =
    fast - slow;

  const previousValues =
    values.slice(0, -1);

  const previous =
    ema(
      previousValues,
      12
    ) -
    ema(
      previousValues,
      26
    );

  return {
    line,
    previous,
    bullish:
      line > 0 &&
      line >= previous,
    bearish:
      line < 0 &&
      line <= previous,
  };
}

/* =========================================================
   STRUCTURE
========================================================= */

function findStructure(
  candles: Candle[]
) {
  const recent =
    candles.slice(-120);

  const highs: number[] =
    [];

  const lows: number[] =
    [];

  for (
    let i = 2;
    i <
    recent.length - 2;
    i++
  ) {
    const c =
      recent[i];

    const swingHigh =
      c.high >
        recent[i - 1]
          .high &&
      c.high >
        recent[i - 2]
          .high &&
      c.high >
        recent[i + 1]
          .high &&
      c.high >
        recent[i + 2]
          .high;

    const swingLow =
      c.low <
        recent[i - 1]
          .low &&
      c.low <
        recent[i - 2]
          .low &&
      c.low <
        recent[i + 1]
          .low &&
      c.low <
        recent[i + 2]
          .low;

    if (swingHigh) {
      highs.push(
        c.high
      );
    }

    if (swingLow) {
      lows.push(
        c.low
      );
    }
  }

  const fallbackHigh =
    Math.max(
      ...recent.map(
        (c) => c.high
      )
    );

  const fallbackLow =
    Math.min(
      ...recent.map(
        (c) => c.low
      )
    );

  return {
    resistance:
      highs.length
        ? Math.max(
            ...highs.slice(
              -5
            )
          )
        : fallbackHigh,

    support:
      lows.length
        ? Math.min(
            ...lows.slice(
              -5
            )
          )
        : fallbackLow,

    highs,
    lows,
  };
}

/* =========================================================
   CANDLE PATTERN
========================================================= */

function candlePattern(
  candles: Candle[],
  direction: Direction
) {
  if (
    candles.length < 3
  ) {
    return {
      ok: false,
      name: "No confirmation",
    };
  }

  const previous =
    candles[
      candles.length - 2
    ];

  const current =
    candles[
      candles.length - 1
    ];

  const body =
    Math.abs(
      current.close -
        current.open
    );

  const range =
    Math.max(
      current.high -
        current.low,
      0.00000001
    );

  const upperWick =
    current.high -
    Math.max(
      current.open,
      current.close
    );

  const lowerWick =
    Math.min(
      current.open,
      current.close
    ) -
    current.low;

  const bullishEngulfing =
    current.close >
      current.open &&
    previous.close <
      previous.open &&
    current.close >
      previous.open &&
    current.open <
      previous.close;

  const bearishEngulfing =
    current.close <
      current.open &&
    previous.close >
      previous.open &&
    current.open >
      previous.close &&
    current.close <
      previous.open;

  const hammer =
    lowerWick >
      body * 2 &&
    upperWick <
      body;

  const shootingStar =
    upperWick >
      body * 2 &&
    lowerWick <
      body;

  const strongBull =
    current.close >
      current.open &&
    body / range >
      0.65;

  const strongBear =
    current.close <
      current.open &&
    body / range >
      0.65;

  if (
    direction ===
      "BUY" &&
    (
      bullishEngulfing ||
      hammer ||
      strongBull
    )
  ) {
    return {
      ok: true,
      name:
        bullishEngulfing
          ? "Bullish Engulfing"
          : hammer
          ? "Hammer"
          : "Strong Bullish Candle",
    };
  }

  if (
    direction ===
      "SELL" &&
    (
      bearishEngulfing ||
      shootingStar ||
      strongBear
    )
  ) {
    return {
      ok: true,
      name:
        bearishEngulfing
          ? "Bearish Engulfing"
          : shootingStar
          ? "Shooting Star"
          : "Strong Bearish Candle",
    };
  }

  return {
    ok: false,
    name: "No confirmation",
  };
}

/* =========================================================
   MTF
========================================================= */

function timeframeDirection(
  candles: Candle[]
): Direction | "NEUTRAL" {
  if (
    candles.length < 50
  ) {
    return "NEUTRAL";
  }

  const closes =
    candles.map(
      (c) => c.close
    );

  const close =
    closes[
      closes.length - 1
    ];

  const fast =
    ema(closes, 20);

  const slow =
    ema(closes, 50);

  if (
    close > fast &&
    fast > slow
  ) {
    return "BUY";
  }

  if (
    close < fast &&
    fast < slow
  ) {
    return "SELL";
  }

  return "NEUTRAL";
}

/* =========================================================
   MARKET ANALYSIS
========================================================= */

async function analyzeMarket(
  symbol: string,
  requestedTimeframe: string
) {
  const selected =
    normalizeTimeframe(
      requestedTimeframe
    );

  const results =
    await Promise.all(
      MTF_CHAIN.map(
        (timeframe) =>
          getCandles(
            symbol,
            timeframe,
            220
          ).catch(
            () => null
          )
      )
    );

  const datasets: Record<
    string,
    Candle[]
  > = {};

  MTF_CHAIN.forEach(
    (
      timeframe,
      index
    ) => {
      if (
        results[index]
      ) {
        datasets[
          timeframe
        ] =
          results[index]!;
      }
    }
  );

  const main =
    datasets[selected] ??
    datasets["15min"] ??
    datasets["5min"] ??
    Object.values(
      datasets
    )[0];

  if (!main) {
    throw new Error(
      `هیچ داده معتبری برای ${symbol} دریافت نشد.`
    );
  }

  const closes =
    main.map(
      (c) => c.close
    );

  const last =
    main[
      main.length - 1
    ];

  const previous =
    main[
      main.length - 2
    ];

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const ema200 =
    ema(closes, 200);

  const currentRsi =
    rsi(closes, 14);

  const currentMacd =
    macd(closes);

  const currentAtr =
    atr(main, 14);

  const structure =
    findStructure(main);

  const bullishTrend =
    last.close >
      ema20 &&
    ema20 > ema50;

  const bearishTrend =
    last.close <
      ema20 &&
    ema20 < ema50;

  const strongBullTrend =
    bullishTrend &&
    (
      ema200 === 0 ||
      last.close >
        ema200
    );

  const strongBearTrend =
    bearishTrend &&
    (
      ema200 === 0 ||
      last.close <
        ema200
    );

  const breakoutUp =
    previous.close <=
      structure.resistance &&
    last.close >
      structure.resistance;

  const breakoutDown =
    previous.close >=
      structure.support &&
    last.close <
      structure.support;

  const liquiditySweepLow =
    last.low <
      structure.support &&
    last.close >
      structure.support;

  const liquiditySweepHigh =
    last.high >
      structure.resistance &&
    last.close <
      structure.resistance;

  const pullbackBuy =
    currentAtr > 0 &&
    last.low <=
      ema20 +
        currentAtr *
          0.35 &&
    last.close > ema20;

  const pullbackSell =
    currentAtr > 0 &&
    last.high >=
      ema20 -
        currentAtr *
          0.35 &&
    last.close < ema20;

  const volumes =
    main
      .map(
        (c) =>
          c.volume ?? 0
      )
      .slice(-21);

  const averageVolume =
    average(
      volumes.slice(0, -1)
    );

  const currentVolume =
    volumes[
      volumes.length - 1
    ] ?? 0;

  const volumeConfirmation =
    averageVolume > 0
      ? currentVolume >=
        averageVolume *
          0.9
      : true;

  const bullishCandle =
    candlePattern(
      main,
      "BUY"
    );

  const bearishCandle =
    candlePattern(
      main,
      "SELL"
    );

  const mtf =
    MTF_CHAIN
      .filter(
        (t) =>
          t !== "1min"
      )
      .map(
        (timeframe) => ({
          timeframe,
          direction:
            timeframeDirection(
              datasets[
                timeframe
              ] ?? []
            ),
        })
      );

  const bullishMtfCount =
    mtf.filter(
      (x) =>
        x.direction ===
        "BUY"
    ).length;

  const bearishMtfCount =
    mtf.filter(
      (x) =>
        x.direction ===
        "SELL"
    ).length;

  const buyFactors = [
    strongBullTrend,
    currentRsi > 50 &&
      currentRsi < 72,
    currentMacd.bullish,
    breakoutUp ||
      liquiditySweepLow,
    pullbackBuy,
    bullishCandle.ok,
    volumeConfirmation,
    bullishMtfCount >=
      DEFAULT_MIN_MTF_AGREEMENT,
  ];

  const sellFactors = [
    strongBearTrend,
    currentRsi < 50 &&
      currentRsi > 28,
    currentMacd.bearish,
    breakoutDown ||
      liquiditySweepHigh,
    pullbackSell,
    bearishCandle.ok,
    volumeConfirmation,
    bearishMtfCount >=
      DEFAULT_MIN_MTF_AGREEMENT,
  ];

  const buyVotes =
    buyFactors.filter(
      Boolean
    ).length;

  const sellVotes =
    sellFactors.filter(
      Boolean
    ).length;

  let direction: Direction;

  if (
    buyVotes ===
    sellVotes
  ) {
    if (
      strongBullTrend &&
      currentMacd.bullish
    ) {
      direction = "BUY";
    } else if (
      strongBearTrend &&
      currentMacd.bearish
    ) {
      direction = "SELL";
    } else {
      direction =
        currentRsi >= 50
          ? "BUY"
          : "SELL";
    }
  } else {
    direction =
      buyVotes > sellVotes
        ? "BUY"
        : "SELL";
  }

  let score = 0;

  if (
    direction === "BUY" &&
    strongBullTrend
  ) {
    score += 18;
  }

  if (
    direction === "SELL" &&
    strongBearTrend
  ) {
    score += 18;
  }

  if (
    direction === "BUY" &&
    currentRsi > 50 &&
    currentRsi < 72
  ) {
    score += 12;
  }

  if (
    direction === "SELL" &&
    currentRsi < 50 &&
    currentRsi > 28
  ) {
    score += 12;
  }

  if (
    direction === "BUY" &&
    currentMacd.bullish
  ) {
    score += 12;
  }

  if (
    direction === "SELL" &&
    currentMacd.bearish
  ) {
    score += 12;
  }

  if (
    direction === "BUY" &&
    (
      breakoutUp ||
      liquiditySweepLow
    )
  ) {
    score += 16;
  }

  if (
    direction === "SELL" &&
    (
      breakoutDown ||
      liquiditySweepHigh
    )
  ) {
    score += 16;
  }

  if (
    direction === "BUY" &&
    pullbackBuy
  ) {
    score += 10;
  }

  if (
    direction === "SELL" &&
    pullbackSell
  ) {
    score += 10;
  }

  if (
    direction === "BUY" &&
    bullishCandle.ok
  ) {
    score += 12;
  }

  if (
    direction === "SELL" &&
    bearishCandle.ok
  ) {
    score += 12;
  }

  if (
    volumeConfirmation
  ) {
    score += 8;
  }

  if (
    direction === "BUY" &&
    bullishMtfCount >= 3
  ) {
    score += 12;
  }

  if (
    direction === "SELL" &&
    bearishMtfCount >= 3
  ) {
    score += 12;
  }

  score = clamp(
    Math.round(score),
    0,
    100
  );

  const confirmations =
    direction ===
    "BUY"
      ? buyVotes
      : sellVotes;

  const mtfAgreement =
    direction ===
    "BUY"
      ? bullishMtfCount
      : bearishMtfCount;

  const reasons: string[] =
    [];

  if (
    direction === "BUY" &&
    strongBullTrend
  ) {
    reasons.push(
      "روند صعودی EMA تأیید شد"
    );
  }

  if (
    direction === "SELL" &&
    strongBearTrend
  ) {
    reasons.push(
      "روند نزولی EMA تأیید شد"
    );
  }

  reasons.push(
    `RSI: ${round(
      currentRsi,
      2
    )}`
  );

  reasons.push(
    currentMacd.bullish
      ? "MACD صعودی است"
      : "MACD نزولی است"
  );

  if (
    breakoutUp ||
    breakoutDown
  ) {
    reasons.push(
      "Breakout ساختاری مشاهده شد"
    );
  }

  if (
    liquiditySweepLow ||
    liquiditySweepHigh
  ) {
    reasons.push(
      "Liquidity Sweep مشاهده شد"
    );
  }

  if (
    pullbackBuy ||
    pullbackSell
  ) {
    reasons.push(
      "Pullback تأیید شد"
    );
  }

  const selectedCandle =
    direction === "BUY"
      ? bullishCandle
      : bearishCandle;

  if (
    selectedCandle.ok
  ) {
    reasons.push(
      `الگوی کندلی: ${selectedCandle.name}`
    );
  }

  reasons.push(
    volumeConfirmation
      ? "Volume تأیید شد"
      : "Volume ضعیف است"
  );

  reasons.push(
    `MTF: ${bullishMtfCount} BUY / ${bearishMtfCount} SELL`
  );

  return {
    direction,
    score,
    confirmations,
    mtfAgreement,

    entry:
      last.close,

    atr:
      currentAtr,

    support:
      structure.support,

    resistance:
      structure.resistance,

    rsi:
      currentRsi,

    macd:
      currentMacd.line,

    ema20,
    ema50,
    ema200,

    signals: {
      trend:
        direction === "BUY"
          ? strongBullTrend
          : strongBearTrend,

      rsi:
        direction === "BUY"
          ? currentRsi > 50 &&
            currentRsi < 72
          : currentRsi < 50 &&
            currentRsi > 28,

      macd:
        direction === "BUY"
          ? currentMacd.bullish
          : currentMacd.bearish,

      breakout:
        direction === "BUY"
          ? breakoutUp
          : breakoutDown,

      liquiditySweep:
        direction === "BUY"
          ? liquiditySweepLow
          : liquiditySweepHigh,

      pullback:
        direction === "BUY"
          ? pullbackBuy
          : pullbackSell,

      candle:
        selectedCandle,

      volume:
        volumeConfirmation,

      mtf,
    },

    reasons,

    timeframe:
      selected,
  };
}

/* =========================================================
   RISK CONFIG
========================================================= */

function getRiskConfig(
  bot: any
): RiskConfig {
  const config =
    parseObject(
      bot.analysisConfig
    );

  const risk =
    parseObject(
      config.risk
    );

  const lotSize =
    Math.max(
      0.01,
      num(
        risk.lotSize,
        bot.lotSize ??
          0.01
      )
    );

  /*
   IMPORTANT:
   Do NOT use bot.stopLoss as fallback here.
   Older bot records may contain the old $1 value.
  */

  const stopLossDollars =
    Math.max(
      0.01,
      num(
        risk.stopLossDollars,
        DEFAULT_STOP_LOSS_USD
      )
    );

  const tp1Dollars =
    Math.max(
      0.01,
      num(
        risk.tp1Dollars,
        DEFAULT_TP1_USD
      )
    );

  const tp2Dollars =
    Math.max(
      tp1Dollars,
      num(
        risk.tp2Dollars,
        DEFAULT_TP2_USD
      )
    );

  const tp3Dollars =
    Math.max(
      tp2Dollars,
      num(
        risk.tp3Dollars,
        DEFAULT_TP3_USD
      )
    );

  let contractSize =
    num(
      risk.contractSize,
      0
    );

  if (
    contractSize <= 0
  ) {
    const symbol =
      String(
        bot.symbol ?? ""
      ).toUpperCase();

    if (
      symbol.includes(
        "XAU"
      ) ||
      symbol.includes(
        "XAG"
      )
    ) {
      contractSize = 100;
    } else if (
      String(
        bot.marketType ?? ""
      ).toUpperCase() ===
      "FOREX"
    ) {
      contractSize = 100000;
    } else {
      contractSize = 1;
    }
  }

  let usdTomanRate =
    num(
      risk.usdTomanRate,
      0
    );

  if (
    usdTomanRate <= 0
  ) {
    usdTomanRate =
      num(
        process.env
          .USD_TOMAN_RATE,
        0
      );
  }

  /*
   USD_IRR_RATE is Rial.
   Toman = Rial / 10
  */
  if (
    usdTomanRate <= 0
  ) {
    const usdIrrRate =
      num(
        process.env
          .USD_IRR_RATE,
        0
      );

    if (
      usdIrrRate > 0
    ) {
      usdTomanRate =
        usdIrrRate / 10;
    }
  }

  return {
    lotSize,
    stopLossDollars,
    tp1Dollars,
    tp2Dollars,
    tp3Dollars,
    contractSize,
    usdTomanRate,
  };
}

/* =========================================================
   PRICE LEVEL CALCULATION
========================================================= */

function calculateLevels(
  entry: number,
  direction: Direction,
  risk: RiskConfig
) {
  /*
   Dollar risk is converted into price distance
   using lot × contract size.

   Example:
   XAUUSD:
   lot 0.01 × contract 100 = 1
   $4 risk = 4.00 price distance.
  */

  const exposure =
    risk.lotSize *
    risk.contractSize;

  const safeExposure =
    exposure > 0
      ? exposure
      : 1;

  const stopDistance =
    risk.stopLossDollars /
    safeExposure;

  const tp1Distance =
    risk.tp1Dollars /
    safeExposure;

  const tp2Distance =
    risk.tp2Dollars /
    safeExposure;

  const tp3Distance =
    risk.tp3Dollars /
    safeExposure;

  if (
    direction === "BUY"
  ) {
    return {
      sl:
        entry -
        stopDistance,

      tp1:
        entry +
        tp1Distance,

      tp2:
        entry +
        tp2Distance,

      tp3:
        entry +
        tp3Distance,
    };
  }

  return {
    sl:
      entry +
      stopDistance,

    tp1:
      entry -
      tp1Distance,

    tp2:
      entry -
      tp2Distance,

    tp3:
      entry -
      tp3Distance,
  };
}

/* =========================================================
   SIGNAL CONTROL
========================================================= */

function getSignalControl(
  bot: any
) {
  const config =
    parseObject(
      bot.analysisConfig
    );

  const control =
    parseObject(
      config.signalControl
    );

  return {
    minScore: clamp(
      num(
        control.minScore,
        DEFAULT_SIGNAL_SCORE
      ),
      50,
      100
    ),

    minConfirmations:
      Math.max(
        1,
        num(
          control.minConfirmations,
          DEFAULT_MIN_CONFIRMATIONS
        )
      ),

    minMtfAgreement:
      clamp(
        num(
          control.minMtfAgreement,
          DEFAULT_MIN_MTF_AGREEMENT
        ),
        1,
        4
      ),

    minMinutesBetweenSignals:
      Math.max(
        5,
        num(
          control.minMinutesBetweenSignals,
          DEFAULT_SIGNAL_GAP_MINUTES
        )
      ),

    maxSignalsPerSymbolDay:
      Math.max(
        1,
        num(
          control.maxSignalsPerSymbolDay,
          DEFAULT_MAX_SIGNALS_PER_SYMBOL_DAY
        )
      ),
  };
}

/* =========================================================
   USD / TOMAN
========================================================= */

async function getUsdTomanRate(
  fallback = 0
): Promise<number> {
  const configured =
    num(
      process.env
        .USD_TOMAN_RATE,
      fallback
    );

  if (
    configured > 0
  ) {
    return configured;
  }

  /*
   Try Twelve Data USD/IRR.
   Twelve Data returns the quote in IRR.
   We convert Rial -> Toman.
  */

  try {
    const data =
      await twelveData(
        "/exchange_rate",
        {
          symbol:
            "USD/IRR",
        }
      );

    const rate =
      num(data?.rate);

    if (
      rate > 0
    ) {
      return rate / 10;
    }
  } catch {
    // fallback
  }

  const oldIrr =
    num(
      process.env
        .USD_IRR_RATE,
      0
    );

  if (
    oldIrr > 0
  ) {
    return oldIrr / 10;
  }

  return fallback;
}

/* =========================================================
   TELEGRAM
========================================================= */

async function sendTelegramMessage(
  html: string
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
        "متغیرهای Telegram کامل نیستند.",
    };
  }

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

            text: html,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              true,
          }),
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok ||
    !data?.ok
  ) {
    return {
      ok: false,
      error: String(
        data?.description ??
          `Telegram HTTP ${response.status}`
      ),
    };
  }

  return {
    ok: true,

    messageId:
      String(
        data.result
          .message_id
      ),
  };
}

/*
 Optional real image support.

 If you later put these in Render:
 TELEGRAM_DOLLAR_IMAGE_URL
 TELEGRAM_TOMAN_IMAGE_URL

 the bot can send actual images.
 Without them, the text uses 💵 / 💰.
*/

async function sendTelegramPhoto(
  photoUrl: string,
  caption: string
) {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (
    !token ||
    !chatId ||
    !photoUrl
  ) {
    return {
      ok: false,
      error:
        "Photo configuration is incomplete.",
    };
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
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

            photo:
              photoUrl,

            caption,

            parse_mode:
              "HTML",
          }),
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok ||
    !data?.ok
  ) {
    return {
      ok: false,
      error: String(
        data?.description ??
          `Telegram HTTP ${response.status}`
      ),
    };
  }

  return {
    ok: true,

    messageId:
      String(
        data.result
          .message_id
      ),
  };
}

/* =========================================================
   METADATA
========================================================= */

function getSignalMetadata(
  value: unknown
): SignalMetadata {
  const metadata =
    parseObject(value);

  const risk =
    parseObject(
      metadata.risk
    );

  const levels =
    parseObject(
      metadata.levels
    );

  const state =
    parseObject(
      metadata.state
    );

  return {
    risk: {
      lotSize:
        num(
          risk.lotSize,
          0.01
        ),

      stopLossDollars:
        num(
          risk.stopLossDollars,
          DEFAULT_STOP_LOSS_USD
        ),

      tp1Dollars:
        num(
          risk.tp1Dollars,
          DEFAULT_TP1_USD
        ),

      tp2Dollars:
        num(
          risk.tp2Dollars,
          DEFAULT_TP2_USD
        ),

      tp3Dollars:
        num(
          risk.tp3Dollars,
          DEFAULT_TP3_USD
        ),

      contractSize:
        num(
          risk.contractSize,
          100
        ),

      usdTomanRate:
        num(
          risk.usdTomanRate,
          0
        ),
    },

    levels: {
      sl:
        num(
          levels.sl,
          0
        ),

      tp1:
        num(
          levels.tp1,
          0
        ),

      tp2:
        num(
          levels.tp2,
          0
        ),

      tp3:
        num(
          levels.tp3,
          0
        ),
    },

    state: {
      tp1Hit:
        Boolean(
          state.tp1Hit
        ),

      tp2Hit:
        Boolean(
          state.tp2Hit
        ),

      tp3Hit:
        Boolean(
          state.tp3Hit
        ),

      slHit:
        Boolean(
          state.slHit
        ),
    },

    events:
      Array.isArray(
        metadata.events
      )
        ? metadata.events
        : [],

    lastPrice:
      num(
        metadata.lastPrice,
        0
      ),

    lastPriceAt:
      metadata.lastPriceAt,

    analysis:
      metadata.analysis,
  };
}

/* =========================================================
   NEWS
========================================================= */

function getCurrencies(
  symbol: string
): string[] {
  const clean =
    symbol
      .toUpperCase()
      .replace(
        /\s/g,
        ""
      );

  if (
    clean.includes(
      "XAU"
    ) ||
    clean.includes(
      "XAG"
    )
  ) {
    return ["USD"];
  }

  if (
    clean.includes("/")
  ) {
    return clean.split(
      "/"
    );
  }

  if (
    clean.length === 6
  ) {
    return [
      clean.slice(
        0,
        3
      ),
      clean.slice(3),
    ];
  }

  return [];
}

async function newsBlocked(
  symbol: string,
  minutes: number
) {
  if (
    minutes <= 0
  ) {
    return false;
  }

  const currencies =
    getCurrencies(
      symbol
    );

  if (
    !currencies.length
  ) {
    return false;
  }

  const now =
    new Date();

  const until =
    new Date(
      now.getTime() +
        minutes *
          60 *
          1000
    );

  const count =
    await prisma.economicEvent.count(
      {
        where: {
          importance: {
            gte: 2,
          },

          eventTime: {
            gte: now,
            lte: until,
          },

          currency: {
            in:
              currencies,
          },
        },
      }
    );

  return count > 0;
}

/* =========================================================
   SESSION
========================================================= */

function sessionAllowed(
  marketType?: string | null
) {
  if (
    String(
      marketType ?? ""
    ).toUpperCase() ===
    "CRYPTO"
  ) {
    return true;
  }

  const hour =
    new Date().getUTCHours();

  return (
    hour >= 6 &&
    hour < 21
  );
}

/* =========================================================
   REACTION SUPPORT / RESISTANCE
========================================================= */

function collectPivotLevels(
  candles: Candle[],
  timeframe: string
) {
  if (
    candles.length < 20
  ) {
    return {
      highs: [],
      lows: [],
    };
  }

  const recent =
    candles.slice(-180);

  const highs: number[] =
    [];

  const lows: number[] =
    [];

  for (
    let i = 2;
    i <
    recent.length - 2;
    i++
  ) {
    const c =
      recent[i];

    const swingHigh =
      c.high >
        recent[i - 1]
          .high &&
      c.high >
        recent[i - 2]
          .high &&
      c.high >
        recent[i + 1]
          .high &&
      c.high >
        recent[i + 2]
          .high;

    const swingLow =
      c.low <
        recent[i - 1]
          .low &&
      c.low <
        recent[i - 2]
          .low &&
      c.low <
        recent[i + 1]
          .low &&
      c.low <
        recent[i + 2]
          .low;

    if (swingHigh) {
      highs.push(
        c.high
      );
    }

    if (swingLow) {
      lows.push(
        c.low
      );
    }
  }

  /*
   Weight higher timeframes more heavily.
  */
  const weight =
    timeframe === "4h"
      ? 4
      : timeframe === "1h"
      ? 3
      : timeframe === "15min"
      ? 2
      : 1;

  return {
    highs:
      highs.map(
        (price) => ({
          price,
          weight,
        })
      ),

    lows:
      lows.map(
        (price) => ({
          price,
          weight,
        })
      ),
  };
}

function clusterLevels(
  rawLevels: {
    price: number;
    weight: number;
  }[],
  currentPrice: number,
  atrValue: number,
  direction: "SUPPORT" | "RESISTANCE"
): ReactionLevel[] {
  if (
    !rawLevels.length
  ) {
    return [];
  }

  const tolerance =
    Math.max(
      atrValue * 0.25,
      currentPrice *
        0.00025
    );

  const sorted =
    [...rawLevels].sort(
      (a, b) =>
        a.price -
        b.price
    );

  const clusters: {
    prices: number[];
    weight: number;
  }[] = [];

  for (
    const level of sorted
  ) {
    let cluster =
      clusters.find(
        (item) =>
          Math.abs(
            average(
              item.prices
            ) -
              level.price
          ) <= tolerance
      );

    if (!cluster) {
      cluster = {
        prices: [],
        weight: 0,
      };

      clusters.push(
        cluster
      );
    }

    cluster.prices.push(
      level.price
    );

    cluster.weight +=
      level.weight;
  }

  return clusters
    .map(
      (cluster) => {
        const price =
          average(
            cluster.prices
          );

        const zoneLow =
          price -
          tolerance * 0.45;

        const zoneHigh =
          price +
          tolerance * 0.45;

        const touches =
          cluster.prices
            .length;

        const strength =
          clamp(
            Math.round(
              cluster.weight *
                12 +
                touches *
                  8
            ),
            0,
            100
          );

        return {
          price,
          zoneLow,
          zoneHigh,
          touches,
          timeframeScore:
            cluster.weight,
          strength,
        };
      }
    )
    .filter(
      (level) =>
        direction ===
        "SUPPORT"
          ? level.price <
            currentPrice
          : level.price >
            currentPrice
    )
    .sort(
      (a, b) => {
        const da =
          Math.abs(
            a.price -
              currentPrice
          );

        const db =
          Math.abs(
            b.price -
              currentPrice
          );

        return (
          da - db
        );
      }
    )
    .slice(0, 4);
}

async function calculateReactionLevels(
  symbol: string
): Promise<ReactionLevels> {
  const timeframes = [
    "4h",
    "1h",
    "15min",
  ];

  const results =
    await Promise.all(
      timeframes.map(
        (timeframe) =>
          getCandles(
            symbol,
            timeframe,
            240
          ).catch(
            () => null
          )
      )
    );

  const datasets: Record<
    string,
    Candle[]
  > = {};

  timeframes.forEach(
    (
      timeframe,
      index
    ) => {
      if (
        results[index]
      ) {
        datasets[
          timeframe
        ] =
          results[index]!;
      }
    }
  );

  const main =
    datasets["1h"] ??
    datasets["15min"] ??
    datasets["4h"];

  if (!main) {
    throw new Error(
      `برای محدوده‌های ${symbol} داده کافی وجود ندارد.`
    );
  }

  const currentPrice =
    main[
      main.length - 1
    ].close;

  const atrValue =
    atr(main, 14);

  const rawHighs: {
    price: number;
    weight: number;
  }[] = [];

  const rawLows: {
    price: number;
    weight: number;
  }[] = [];

  for (
    const timeframe of timeframes
  ) {
    const candles =
      datasets[
        timeframe
      ];

    if (!candles) {
      continue;
    }

    const pivots =
      collectPivotLevels(
        candles,
        timeframe
      );

    rawHighs.push(
      ...pivots.highs
    );

    rawLows.push(
      ...pivots.lows
    );
  }

  /*
   Previous daily high/low are useful reaction zones.
  */
  try {
    const daily =
      await getCandles(
        symbol,
        "1day",
        30
      );

    if (
      daily.length >= 2
    ) {
      const previousDay =
        daily[
          daily.length - 2
        ];

      rawHighs.push({
        price:
          previousDay.high,
        weight: 5,
      });

      rawLows.push({
        price:
          previousDay.low,
        weight: 5,
      });
    }
  } catch {
    // daily data optional
  }

  const supports =
    clusterLevels(
      rawLows,
      currentPrice,
      atrValue,
      "SUPPORT"
    );

  const resistances =
    clusterLevels(
      rawHighs,
      currentPrice,
      atrValue,
      "RESISTANCE"
    );

  return {
    symbol,
    currentPrice,
    supports,
    resistances,
    atr: atrValue,
    generatedAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   LEVEL REMINDER STATE
========================================================= */

function shouldSendLevelReminder(
  bot: any
) {
  const config =
    parseObject(
      bot.analysisConfig
    );

  const reminder =
    parseObject(
      config.telegramLevelReminder
    );

  const lastSent =
    reminder.lastSentAt
      ? new Date(
          reminder.lastSentAt
        ).getTime()
      : 0;

  if (
    !lastSent
  ) {
    return true;
  }

  return (
    Date.now() -
      lastSent >=
    LEVEL_REMINDER_MINUTES *
      60 *
      1000
  );
}

async function saveLevelReminderState(
  bot: any,
  levels: ReactionLevels
) {
  const config =
    parseObject(
      bot.analysisConfig
    );

  config.telegramLevelReminder =
    {
      lastSentAt:
        new Date().toISOString(),

      lastLevels:
        levels,

      reminderEveryMinutes:
        LEVEL_REMINDER_MINUTES,
    };

  await prisma.tradingBot.update(
    {
      where: {
        id: bot.id,
      },

      data: {
        analysisConfig:
          config as any,
      },
    }
  );
}

/* =========================================================
   TELEGRAM LEVEL MESSAGE
========================================================= */

function buildLevelReminderMessage(
  levels: ReactionLevels
) {
  const supports =
    levels.supports
      .slice(0, 3)
      .map(
        (
          level,
          index
        ) =>
          `🟢 <b>حمایت ${
            index + 1
          }</b>\n` +
          `محدوده: <b>${formatPrice(
            level.zoneLow
          )} – ${formatPrice(
            level.zoneHigh
          )}</b>\n` +
          `سطح: <b>${formatPrice(
            level.price
          )}</b>\n` +
          `قدرت: <b>${level.strength}/100</b>`
      )
      .join(
        "\n\n"
      );

  const resistances =
    levels.resistances
      .slice(0, 3)
      .map(
        (
          level,
          index
        ) =>
          `🔴 <b>مقاومت ${
            index + 1
          }</b>\n` +
          `محدوده: <b>${formatPrice(
            level.zoneLow
          )} – ${formatPrice(
            level.zoneHigh
          )}</b>\n` +
          `سطح: <b>${formatPrice(
            level.price
          )}</b>\n` +
          `قدرت: <b>${level.strength}/100</b>`
      )
      .join(
        "\n\n"
      );

  return `
📊 <b>محدوده‌های مهم بازار</b>

<b>${escapeHtml(
    levels.symbol
  )}</b>

━━━━━━━━━━━━━━━━

💠 قیمت فعلی:
<b>${formatPrice(
    levels.currentPrice
  )}</b>

━━━━━━━━━━━━━━━━

🟢 <b>حمایت‌های مهم</b>

${
  supports ||
  "محدوده حمایتی معتبر پیدا نشد."
}

━━━━━━━━━━━━━━━━

🔴 <b>مقاومت‌های مهم</b>

${
  resistances ||
  "محدوده مقاومتی معتبر پیدا نشد."
}

━━━━━━━━━━━━━━━━

⚠️ <b>توجه مهم</b>

این پیام <b>سیگنال BUY یا SELL نیست.</b>

این‌ها فقط محدوده‌های مهم و واکنش‌ساز احتمالی بازار هستند.

وقتی قیمت به این محدوده‌ها برسد، <b>ممکن است</b> واکنش نشان دهد؛ اما جهت معامله فقط بعد از تأییدهای کامل موتور سیگنال مشخص می‌شود.

━━━━━━━━━━━━━━━━

🔄 یادآوری بعدی:
حداقل هر <b>۲ ساعت</b>

🕒 ${new Date().toLocaleString(
    "fa-IR"
  )}
  `.trim();
}

/* =========================================================
   SEND LEVEL REMINDERS
========================================================= */

async function sendLevelReminders(
  bots: any[]
) {
  const sent: any[] = [];

  for (
    const bot of bots
  ) {
    try {
      if (
        !bot.symbol ||
        !bot.telegramEnabled
      ) {
        continue;
      }

      if (
        !shouldSendLevelReminder(
          bot
        )
      ) {
        continue;
      }

      const levels =
        await calculateReactionLevels(
          bot.symbol
        );

      const message =
        buildLevelReminderMessage(
          levels
        );

      const telegram =
        await sendTelegramMessage(
          message
        );

      if (
        telegram.ok
      ) {
        await saveLevelReminderState(
          bot,
          levels
        );

        sent.push({
          botId:
            bot.id,

          symbol:
            bot.symbol,

          messageId:
            telegram.messageId,

          supports:
            levels.supports
              .slice(0, 3),

          resistances:
            levels.resistances
              .slice(0, 3),
        });
      }
    } catch (error) {
      console.error(
        "LEVEL_REMINDER_ERROR",
        bot.id,
        error
      );
    }
  }

  return sent;
}

/* =========================================================
   ACTIVE SIGNAL MONITOR
========================================================= */

async function monitorSignals(
  userId: string
) {
  const activeSignals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,

          status: {
            in: [
              "ACTIVE",
              "TP1_HIT",
              "TP2_HIT",
            ],
          },
        },

        include: {
          bot: true,
        },

        orderBy: {
          createdAt: "asc",
        },

        take: 100,
      }
    );

  const results: any[] =
    [];

  for (
    const signal of activeSignals
  ) {
    try {
      const latest =
        await getLatestPrice(
          signal.symbol
        );

      const metadata =
        getSignalMetadata(
          signal.metadata
        );

      metadata.lastPrice =
        latest.price;

      metadata.lastPriceAt =
        new Date().toISOString();

      const levels =
        metadata.levels;

      let hit:
        | SignalEventType
        | null = null;

      let hitPrice =
        latest.price;

      /* =====================================================
         SL FIRST
      ===================================================== */

      if (
        !metadata.state
          .slHit &&
        levels.sl > 0
      ) {
        const stopHit =
          signal.direction ===
          "BUY"
            ? latest.low <=
              levels.sl
            : latest.high >=
              levels.sl;

        if (
          stopHit
        ) {
          hit =
            "SL_HIT";

          hitPrice =
            levels.sl;
        }
      }

      /* =====================================================
         TP1
      ===================================================== */

      if (
        !hit &&
        !metadata.state
          .tp1Hit &&
        levels.tp1 > 0
      ) {
        const tp1Hit =
          signal.direction ===
          "BUY"
            ? latest.high >=
              levels.tp1
            : latest.low <=
              levels.tp1;

        if (
          tp1Hit
        ) {
          hit =
            "TP1_HIT";

          hitPrice =
            levels.tp1;
        }
      }

      /* =====================================================
         TP2
      ===================================================== */

      if (
        !hit &&
        metadata.state
          .tp1Hit &&
        !metadata.state
          .tp2Hit &&
        levels.tp2 > 0
      ) {
        const tp2Hit =
          signal.direction ===
          "BUY"
            ? latest.high >=
              levels.tp2
            : latest.low <=
              levels.tp2;

        if (
          tp2Hit
        ) {
          hit =
            "TP2_HIT";

          hitPrice =
            levels.tp2;
        }
      }

      /* =====================================================
         TP3
      ===================================================== */

      if (
        !hit &&
        metadata.state
          .tp2Hit &&
        !metadata.state
          .tp3Hit &&
        levels.tp3 > 0
      ) {
        const tp3Hit =
          signal.direction ===
          "BUY"
            ? latest.high >=
              levels.tp3
            : latest.low <=
              levels.tp3;

        if (
          tp3Hit
        ) {
          hit =
            "TP3_HIT";

          hitPrice =
            levels.tp3;
        }
      }

      /* =====================================================
         EXPIRY
      ===================================================== */

      if (
        !hit &&
        signal.expiresAt &&
        new Date(
          signal.expiresAt
        ).getTime() <=
          Date.now()
      ) {
        hit =
          "EXPIRED";

        hitPrice =
          latest.price;
      }

      if (!hit) {
        await prisma.tradingSignal.update(
          {
            where: {
              id:
                signal.id,
            },

            data: {
              metadata:
                metadata as any,
            },
          }
        );

        continue;
      }

      /* =====================================================
         P/L
      ===================================================== */

      let pnlUsd = 0;

      if (
        hit ===
        "SL_HIT"
      ) {
        pnlUsd =
          -Math.abs(
            metadata.risk
              .stopLossDollars
          );
      }

      if (
        hit ===
        "TP1_HIT"
      ) {
        pnlUsd =
          Math.abs(
            metadata.risk
              .tp1Dollars
          );
      }

      if (
        hit ===
        "TP2_HIT"
      ) {
        pnlUsd =
          Math.abs(
            metadata.risk
              .tp2Dollars
          );
      }

      if (
        hit ===
        "TP3_HIT"
      ) {
        pnlUsd =
          Math.abs(
            metadata.risk
              .tp3Dollars
          );
      }

      if (
        hit ===
        "EXPIRED"
      ) {
        pnlUsd = 0;
      }

      const usdTomanRate =
        await getUsdTomanRate(
          metadata.risk
            .usdTomanRate
        );

      const pnlToman =
        usdTomanRate > 0
          ? Math.round(
              pnlUsd *
                usdTomanRate
            )
          : null;

      const event:
        SignalEvent = {
        type: hit,

        price:
          hitPrice,

        pnlUsd:
          round(
            pnlUsd,
            2
          ),

        pnlToman,

        at:
          new Date().toISOString(),
      };

      metadata.events.push(
        event
      );

      if (
        hit ===
        "SL_HIT"
      ) {
        metadata.state.slHit =
          true;
      }

      if (
        hit ===
        "TP1_HIT"
      ) {
        metadata.state.tp1Hit =
          true;
      }

      if (
        hit ===
        "TP2_HIT"
      ) {
        metadata.state.tp2Hit =
          true;
      }

      if (
        hit ===
        "TP3_HIT"
      ) {
        metadata.state.tp3Hit =
          true;
      }

      const closed =
        hit ===
          "SL_HIT" ||
        hit ===
          "TP3_HIT" ||
        hit ===
          "EXPIRED";

      const newStatus =
        closed
          ? "CLOSED"
          : hit;

      await prisma.tradingSignal.update(
        {
          where: {
            id:
              signal.id,
          },

          data: {
            status:
              newStatus,

            closedAt:
              closed
                ? new Date()
                : undefined,

            metadata:
              metadata as any,
          },
        }
      );

      /* =====================================================
         TELEGRAM EVENT
      ===================================================== */

      const isLoss =
        hit ===
        "SL_HIT";

      const isProfit =
        hit ===
          "TP1_HIT" ||
        hit ===
          "TP2_HIT" ||
        hit ===
          "TP3_HIT";

      const icon =
        isLoss
          ? "🔴"
          : isProfit
          ? "🟢"
          : "⚪";

      const title =
        hit ===
        "TP1_HIT"
          ? "TP1 خورد"
          : hit ===
            "TP2_HIT"
          ? "TP2 خورد"
          : hit ===
            "TP3_HIT"
          ? "TP3 خورد"
          : hit ===
            "SL_HIT"
          ? "حد ضرر خورد"
          : "سیگنال منقضی شد";

      const stageText =
        hit ===
        "TP1_HIT"
          ? `TP1 = +$${metadata.risk.tp1Dollars}`
          : hit ===
            "TP2_HIT"
          ? `TP2 = +$${metadata.risk.tp2Dollars}`
          : hit ===
            "TP3_HIT"
          ? `TP3 = +$${metadata.risk.tp3Dollars}`
          : hit ===
            "SL_HIT"
          ? `SL = -$${metadata.risk.stopLossDollars}`
          : "بدون سود/ضرر";

      const telegramMessage =
        `
${icon} <b>${escapeHtml(
          title
        )}</b>

<b>${escapeHtml(
          signal.symbol
        )}</b> · ${escapeHtml(
          signal.direction
        )}

━━━━━━━━━━━━

🎯 قیمت برخورد:
<b>${formatPrice(
          hitPrice
        )}</b>

💵 نتیجه مرحله:
<b>${formatMoneyUsd(
          pnlUsd
        )}</b>

💰 معادل تومان:
<b>${escapeHtml(
          formatToman(
            pnlToman
          )
        )}</b>

📌 ${escapeHtml(
          stageText
        )}

🕒 ساعت:
<b>${new Date().toLocaleString(
          "fa-IR"
        )}</b>

━━━━━━━━━━━━

${
  hit ===
  "TP1_HIT"
    ? "🔒 مرحله اول سود ثبت شد. این رویداد به معنی بسته‌شدن واقعی بخشی از معامله توسط بروکر نیست؛ تا اتصال بروکر، سیستم فقط برخورد قیمت و سود مرحله‌ای سیگنال را ثبت می‌کند."
    : hit ===
      "TP2_HIT"
    ? "🔒 مرحله دوم سود ثبت شد. وضعیت مرحله‌ای سیگنال بروزرسانی شد."
    : hit ===
      "TP3_HIT"
    ? "🏁 هدف نهایی سیگنال ثبت شد و سیگنال بسته شد."
    : hit ===
      "SL_HIT"
    ? "🛑 حد ضرر سیگنال ثبت شد و سیگنال بسته شد."
    : "⌛ اعتبار زمانی سیگنال به پایان رسید."
}
        `.trim();

      const telegram =
        await sendTelegramMessage(
          telegramMessage
        );

      if (
        process.env
          .TELEGRAM_SIGNAL_CHAT_ID
      ) {
        await prisma.telegramDelivery.create(
          {
            data: {
              signalId:
                signal.id,

              channelId:
                process.env
                  .TELEGRAM_SIGNAL_CHAT_ID,

              messageId:
                telegram.messageId,

              status:
                telegram.ok
                  ? "SENT"
                  : "FAILED",

              errorMessage:
                telegram.ok
                  ? null
                  : telegram.error,

              sentAt:
                telegram.ok
                  ? new Date()
                  : null,
            },
          }
        );
      }

      /*
       Optional money images.
      */
      if (
        telegram.ok &&
        hit !== "EXPIRED"
      ) {
        const dollarImage =
          process.env
            .TELEGRAM_DOLLAR_IMAGE_URL;

        const tomanImage =
          process.env
            .TELEGRAM_TOMAN_IMAGE_URL;

        if (
          dollarImage
        ) {
          await sendTelegramPhoto(
            dollarImage,
            `💵 ${escapeHtml(
              formatMoneyUsd(
                pnlUsd
              )
            )}`
          );
        }

        if (
          tomanImage &&
          pnlToman != null
        ) {
          await sendTelegramPhoto(
            tomanImage,
            `💰 ${escapeHtml(
              formatToman(
                pnlToman
              )
            )}`
          );
        }
      }

      results.push({
        signalId:
          signal.id,

        event:
          hit,

        price:
          hitPrice,

        pnlUsd,

        pnlToman,

        telegram:
          telegram.ok,
      });
    } catch (error) {
      results.push({
        signalId:
          signal.id,

        error:
          error instanceof Error
            ? error.message
            : "monitor error",
      });
    }
  }

  return results;
}

/* =========================================================
   SIGNAL DAILY CONTROL
========================================================= */

async function canCreateSignal(
  userId: string,
  bot: any,
  symbol: string,
  control: ReturnType<
    typeof getSignalControl
  >
) {
  const dayStart =
    new Date();

  dayStart.setHours(
    0,
    0,
    0,
    0
  );

  const todayCount =
    await prisma.tradingSignal.count(
      {
        where: {
          userId,

          botId:
            bot.id,

          symbol,

          createdAt: {
            gte:
              dayStart,
          },
        },
      }
    );

  if (
    todayCount >=
    control.maxSignalsPerSymbolDay
  ) {
    return {
      allowed: false,
      reason:
        "حداکثر تعداد سیگنال روزانه این نماد ثبت شده است.",
    };
  }

  const recent =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          userId,

          symbol,

          createdAt: {
            gte:
              new Date(
                Date.now() -
                  control.minMinutesBetweenSignals *
                    60 *
                    1000
              ),
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id: true,
          botId: true,
          createdAt:
            true,
        },
      }
    );

  if (
    recent
  ) {
    return {
      allowed: false,
      reason:
        "برای این نماد هنوز فاصله زمانی لازم از سیگنال قبلی نگذشته است.",
    };
  }

  return {
    allowed: true,
    reason: "",
  };
}

/* =========================================================
   SCAN BOTS
========================================================= */

async function scanBots(
  userId: string,
  requestedTimeframe?: string
) {
  const bots =
    await prisma.tradingBot.findMany(
      {
        where: {
          userId,

          isActive: true,

          botStatus: {
            in: [
              "RUNNING",
              "ACTIVE",
              "STARTED",
            ],
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },

        take: 50,
      }
    );

  const created: any[] =
    [];

  const errors: any[] =
    [];

  const skipped: any[] =
    [];

  for (
    const bot of bots
  ) {
    if (
      !bot.symbol
    ) {
      continue;
    }

    const symbol =
      bot.symbol;

    const timeframe =
      normalizeTimeframe(
        requestedTimeframe ??
          bot.timeframe ??
          "15min"
      );

    try {
      const control =
        getSignalControl(
          bot
        );

      /* =====================================================
         ACTIVE GUARD
      ===================================================== */

      const activeSignal =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              botId:
                bot.id,

              symbol,

              status: {
                in: [
                  "WAITING",
                  "ACTIVE",
                  "TP1_HIT",
                  "TP2_HIT",
                ],
              },
            },

            select: {
              id: true,
            },
          }
        );

      if (
        activeSignal
      ) {
        skipped.push({
          botId:
            bot.id,

          symbol,

          reason:
            "برای این نماد یک سیگنال فعال وجود دارد.",
        });

        continue;
      }

      /* =====================================================
         COOLDOWN / DAILY LIMIT
      ===================================================== */

      const permission =
        await canCreateSignal(
          userId,
          bot,
          symbol,
          control
        );

      if (
        !permission.allowed
      ) {
        skipped.push({
          botId:
            bot.id,

          symbol,

          reason:
            permission.reason,
        });

        continue;
      }

      /* =====================================================
         SESSION
      ===================================================== */

      if (
        bot.sessionFilter &&
        !sessionAllowed(
          bot.marketType
        )
      ) {
        skipped.push({
          botId:
            bot.id,

          symbol,

          reason:
            "خارج از سشن مجاز بازار.",
        });

        continue;
      }

      /* =====================================================
         NEWS
      ===================================================== */

      if (
        bot.newsFilter &&
        bot.stopBeforeNewsMinutes >
          0
      ) {
        const blocked =
          await newsBlocked(
            symbol,
            bot.stopBeforeNewsMinutes
          );

        if (
          blocked
        ) {
          skipped.push({
            botId:
              bot.id,

            symbol,

            reason:
              "به دلیل خبر مهم، صدور سیگنال متوقف شد.",
          });

          continue;
        }
      }

      /* =====================================================
         ANALYSIS
      ===================================================== */

      const analysis =
        await analyzeMarket(
          symbol,
          timeframe
        );

      if (
        analysis.score <
        control.minScore
      ) {
        skipped.push({
          botId:
            bot.id,

          symbol,

          reason:
            `امتیاز ${analysis.score} کمتر از حد لازم ${control.minScore} است.`,
        });

        continue;
      }

      if (
        analysis.confirmations <
        control.minConfirmations
      ) {
        skipped.push({
          botId:
            bot.id,

          symbol,

          reason:
            `تأییدها ${analysis.confirmations} است و حداقل ${control.minConfirmations} لازم است.`,
        });

        continue;
      }

      if (
        analysis.mtfAgreement <
        control.minMtfAgreement
      ) {
        skipped.push({
          botId:
            bot.id,

          symbol,

          reason:
            `هم‌جهتی MTF کافی نیست: ${analysis.mtfAgreement}/${control.minMtfAgreement}`,
        });

        continue;
      }

      /* =====================================================
         BUY / SELL
      ===================================================== */

      if (
        analysis.direction ===
          "BUY" &&
        !bot.buyEnabled
      ) {
        continue;
      }

      if (
        analysis.direction ===
          "SELL" &&
        !bot.sellEnabled
      ) {
        continue;
      }

      /* =====================================================
         RISK
      ===================================================== */

      const risk =
        getRiskConfig(
          bot
        );

      const levels =
        calculateLevels(
          analysis.entry,
          analysis.direction,
          risk
        );

      /* =====================================================
         EXPIRY
      ===================================================== */

      const expiryMinutes =
        timeframe ===
        "1min"
          ? 30
          : timeframe ===
            "5min"
          ? 90
          : timeframe ===
            "15min"
          ? 240
          : timeframe ===
            "30min"
          ? 360
          : timeframe ===
            "1h"
          ? 480
          : timeframe ===
            "2h"
          ? 720
          : 960;

      const expiresAt =
        new Date(
          Date.now() +
            expiryMinutes *
              60 *
              1000
        );

      const metadata:
        SignalMetadata =
        {
          risk,

          levels,

          state: {
            tp1Hit: false,
            tp2Hit: false,
            tp3Hit: false,
            slHit: false,
          },

          events: [
            {
              type:
                "SIGNAL_CREATED",

              price:
                analysis.entry,

              pnlUsd: 0,

              pnlToman:
                0,

              at:
                new Date().toISOString(),
            },
          ],

          lastPrice:
            analysis.entry,

          lastPriceAt:
            new Date
