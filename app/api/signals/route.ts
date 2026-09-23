import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type SignalEvent = {
  type:
    | "SIGNAL_CREATED"
    | "TP1_HIT"
    | "TP2_HIT"
    | "TP3_HIT"
    | "SL_HIT"
    | "EXPIRED";
  price: number;
  pnlUsd: number;
  pnlIrr?: number | null;
  at: string;
};

type SignalMetadata = {
  risk: {
    lotSize: number;
    stopLossDollars: number;
    tp1Dollars: number;
    tp2Dollars: number;
    tp3Dollars: number;
    contractSize: number;
    usdIrrRate: number;
  };

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
};

const TWELVE_DATA_URL = "https://api.twelvedata.com";

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

function num(value: unknown, fallback = 0): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function round(value: number, digits = 5): number {
  const power = 10 ** digits;

  return Math.round(value * power) / power;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, any>;
}

/* =========================================================
   SYMBOL / TIMEFRAME
========================================================= */

function normalizeSymbol(symbol: string): string {
  const clean = symbol.replace(/\s/g, "").toUpperCase();

  const map: Record<string, string> = {
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
    return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  }

  return clean;
}

function normalizeTimeframe(
  timeframe?: string | null
): string {
  const value = (timeframe ?? "15min")
    .toLowerCase()
    .trim()
    .replace("m", "min");

  if (value === "1h") return "1h";
  if (value === "2h") return "2h";
  if (value === "4h") return "4h";
  if (value === "8h") return "8h";

  if (
    value === "1d" ||
    value === "day" ||
    value === "1day"
  ) {
    return "1day";
  }

  if (
    INTERVALS.includes(
      value as (typeof INTERVALS)[number]
    )
  ) {
    return value;
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
    process.env.TWELVE_DATA_API_KEY;

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
  }).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !data ||
    data.status === "error" ||
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

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 220
): Promise<Candle[]> {
  const data = await twelveData(
    "/time_series",
    {
      symbol: normalizeSymbol(symbol),
      interval,
      outputsize,
      order: "asc",
      timezone: "UTC",
    }
  );

  if (
    !Array.isArray(data.values) ||
    data.values.length < 60
  ) {
    throw new Error(
      `داده کافی برای ${symbol} در ${interval} دریافت نشد.`
    );
  }

  return data.values
    .map((item: any) => ({
      datetime: String(item.datetime),
      open: num(item.open),
      high: num(item.high),
      low: num(item.low),
      close: num(item.close),
      volume:
        item.volume == null
          ? undefined
          : num(item.volume),
    }))
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
  const data = await twelveData(
    "/time_series",
    {
      symbol: normalizeSymbol(symbol),
      interval: "1min",
      outputsize: 2,
      order: "desc",
      timezone: "UTC",
    }
  );

  const candle = data.values?.[0];

  if (!candle) {
    throw new Error(
      `قیمت لحظه‌ای ${symbol} دریافت نشد.`
    );
  }

  return {
    price: num(candle.close),
    high: num(candle.high),
    low: num(candle.low),
    datetime: String(candle.datetime),
  };
}

/* =========================================================
   TECHNICAL INDICATORS
========================================================= */

function ema(
  values: number[],
  period: number
): number {
  if (values.length < period) {
    return 0;
  }

  let result = average(
    values.slice(0, period)
  );

  const multiplier =
    2 / (period + 1);

  for (
    let i = period;
    i < values.length;
    i++
  ) {
    result =
      values[i] * multiplier +
      result * (1 - multiplier);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14
): number {
  if (values.length <= period) {
    return 50;
  }

  let gain = 0;
  let loss = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const difference =
      values[i] - values[i - 1];

    if (difference >= 0) {
      gain += difference;
    } else {
      loss -= difference;
    }
  }

  let averageGain =
    gain / period;

  let averageLoss =
    loss / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const difference =
      values[i] - values[i - 1];

    averageGain =
      ((averageGain * (period - 1)) +
        (difference > 0 ? difference : 0)) /
      period;

    averageLoss =
      ((averageLoss * (period - 1)) +
        (difference < 0 ? -difference : 0)) /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength =
    averageGain / averageLoss;

  return (
    100 -
    100 /
      (1 + relativeStrength)
  );
}

function atr(
  candles: Candle[],
  period = 14
): number {
  if (candles.length <= period) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current = candles[i];
    const previous = candles[i - 1];

    trueRanges.push(
      Math.max(
        current.high - current.low,
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
    trueRanges.slice(-period)
  );
}

function macd(values: number[]) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);

  const line = fast - slow;

  const previousValues =
    values.slice(0, -1);

  const previous =
    ema(previousValues, 12) -
    ema(previousValues, 26);

  return {
    line,
    previous,
    bullish: line > 0,
    bearish: line < 0,
  };
}

/* =========================================================
   SUPPORT / RESISTANCE
========================================================= */

function findStructure(
  candles: Candle[]
) {
  const recent =
    candles.slice(-100);

  const highs: number[] = [];
  const lows: number[] = [];

  for (
    let i = 2;
    i < recent.length - 2;
    i++
  ) {
    const current = recent[i];

    const isSwingHigh =
      current.high >
        recent[i - 1].high &&
      current.high >
        recent[i - 2].high &&
      current.high >
        recent[i + 1].high &&
      current.high >
        recent[i + 2].high;

    const isSwingLow =
      current.low <
        recent[i - 1].low &&
      current.low <
        recent[i - 2].low &&
      current.low <
        recent[i + 1].low &&
      current.low <
        recent[i + 2].low;

    if (isSwingHigh) {
      highs.push(current.high);
    }

    if (isSwingLow) {
      lows.push(current.low);
    }
  }

  const fallbackHigh =
    Math.max(
      ...recent.map(
        (candle) => candle.high
      )
    );

  const fallbackLow =
    Math.min(
      ...recent.map(
        (candle) => candle.low
      )
    );

  return {
    resistance:
      highs.length
        ? Math.max(
            ...highs.slice(-5)
          )
        : fallbackHigh,

    support:
      lows.length
        ? Math.min(
            ...lows.slice(-5)
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
  direction: "BUY" | "SELL"
) {
  if (candles.length < 3) {
    return {
      ok: false,
      name: "No confirmation",
    };
  }

  const previous =
    candles[candles.length - 2];

  const current =
    candles[candles.length - 1];

  const body = Math.abs(
    current.close - current.open
  );

  const range = Math.max(
    current.high - current.low,
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
    ) - current.low;

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
    lowerWick > body * 2 &&
    upperWick < body;

  const shootingStar =
    upperWick > body * 2 &&
    lowerWick < body;

  const strongBull =
    current.close >
      current.open &&
    body / range > 0.65;

  const strongBear =
    current.close <
      current.open &&
    body / range > 0.65;

  if (
    direction === "BUY" &&
    (
      bullishEngulfing ||
      hammer ||
      strongBull
    )
  ) {
    return {
      ok: true,
      name: bullishEngulfing
        ? "Bullish Engulfing"
        : hammer
        ? "Hammer"
        : "Strong Bullish Candle",
    };
  }

  if (
    direction === "SELL" &&
    (
      bearishEngulfing ||
      shootingStar ||
      strongBear
    )
  ) {
    return {
      ok: true,
      name: bearishEngulfing
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
   MULTI TIMEFRAME ANALYSIS
========================================================= */

function timeframeDirection(
  candles: Candle[]
): "BUY" | "SELL" | "NEUTRAL" {
  if (candles.length < 50) {
    return "NEUTRAL";
  }

  const close =
    candles[candles.length - 1].close;

  const closes =
    candles.map(
      (candle) => candle.close
    );

  const fast = ema(closes, 20);
  const slow = ema(closes, 50);

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
   MAIN ANALYZER
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
          ).catch(() => null)
      )
    );

  const datasets: Record<
    string,
    Candle[]
  > = {};

  MTF_CHAIN.forEach(
    (timeframe, index) => {
      if (results[index]) {
        datasets[timeframe] =
          results[index]!;
      }
    }
  );

  const main =
    datasets[selected] ??
    datasets["15min"] ??
    Object.values(datasets)[0];

  if (!main) {
    throw new Error(
      `هیچ داده معتبری برای ${symbol} دریافت نشد.`
    );
  }

  const closes =
    main.map(
      (candle) => candle.close
    );

  const last =
    main[main.length - 1];

  const previous =
    main[main.length - 2];

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
    last.close > ema20 &&
    ema20 > ema50;

  const bearishTrend =
    last.close < ema20 &&
    ema20 < ema50;

  const strongBullTrend =
    bullishTrend &&
    (
      ema200 === 0 ||
      last.close > ema200
    );

  const strongBearTrend =
    bearishTrend &&
    (
      ema200 === 0 ||
      last.close < ema200
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
    last.low <=
      ema20 +
        currentAtr * 0.35 &&
    last.close > ema20;

  const pullbackSell =
    last.high >=
      ema20 -
        currentAtr * 0.35 &&
    last.close < ema20;

  const volumes =
    main
      .map(
        (candle) =>
          candle.volume ?? 0
      )
      .slice(-21);

  const averageVolume =
    average(
      volumes.slice(0, -1)
    );

  const currentVolume =
    volumes[volumes.length - 1] ?? 0;

  const volumeConfirmation =
    averageVolume > 0
      ? currentVolume >=
        averageVolume * 0.9
      : true;

  const bullishCandle =
    candlePattern(main, "BUY");

  const bearishCandle =
    candlePattern(main, "SELL");

  const mtf = MTF_CHAIN
    .filter(
      (timeframe) =>
        timeframe !== "1min"
    )
    .map(
      (timeframe) => ({
        timeframe,
        direction:
          timeframeDirection(
            datasets[timeframe] ??
              []
          ),
      })
    );

  const bullishMtfCount =
    mtf.filter(
      (item) =>
        item.direction === "BUY"
    ).length;

  const bearishMtfCount =
    mtf.filter(
      (item) =>
        item.direction === "SELL"
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
    bullishMtfCount >= 2,
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
    bearishMtfCount >= 2,
  ];

  const buyVotes =
    buyFactors.filter(Boolean)
      .length;

  const sellVotes =
    sellFactors.filter(Boolean)
      .length;

  let direction:
    | "BUY"
    | "SELL";

  if (buyVotes === sellVotes) {
    if (
      bullishTrend &&
      currentMacd.bullish
    ) {
      direction = "BUY";
    } else if (
      bearishTrend &&
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

  if (volumeConfirmation) {
    score += 8;
  }

  if (
    direction === "BUY" &&
    bullishMtfCount >= 2
  ) {
    score += 12;
  }

  if (
    direction === "SELL" &&
    bearishMtfCount >= 2
  ) {
    score += 12;
  }

  score = clamp(
    Math.round(score),
    0,
    100
  );

  const confirmations =
    direction === "BUY"
      ? buyVotes
      : sellVotes;

  const reasons: string[] = [];

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
      ? "MACD مثبت است"
      : "MACD منفی است"
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

  if (
    (
      direction === "BUY"
        ? bullishCandle
        : bearishCandle
    ).ok
  ) {
    reasons.push(
      `الگوی کندلی: ${
        (
          direction === "BUY"
            ? bullishCandle
            : bearishCandle
        ).name
      }`
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

    entry: last.close,

    atr: currentAtr,

    support:
      structure.support,

    resistance:
      structure.resistance,

    rsi: currentRsi,

    macd:
      currentMacd.line,

    signals: {
      trend:
        direction === "BUY"
          ? strongBullTrend
          : strongBearTrend,

      rsi:
        direction === "BUY"
          ? currentRsi > 50
          : currentRsi < 50,

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
        direction === "BUY"
          ? bullishCandle
          : bearishCandle,

      volume:
        volumeConfirmation,

      mtf,
    },

    reasons,

    timeframe: selected,
  };
}

/* =========================================================
   NEWS FILTER
========================================================= */

function getCurrencies(
  symbol: string
): string[] {
  const clean =
    symbol
      .toUpperCase()
      .replace(/\s/g, "");

  if (
    clean.includes("XAU") ||
    clean.includes("XAG")
  ) {
    return ["USD"];
  }

  if (clean.includes("/")) {
    return clean.split("/");
  }

  if (clean.length === 6) {
    return [
      clean.slice(0, 3),
      clean.slice(3),
    ];
  }

  return [];
}

async function newsBlocked(
  symbol: string,
  minutes: number
): Promise<boolean> {
  if (minutes <= 0) {
    return false;
  }

  const currencies =
    getCurrencies(symbol);

  if (!currencies.length) {
    return false;
  }

  const now = new Date();

  const until = new Date(
    now.getTime() +
      minutes * 60 * 1000
  );

  const count =
    await prisma.economicEvent.count({
      where: {
        importance: {
          gte: 2,
        },

        eventTime: {
          gte: now,
          lte: until,
        },

        currency: {
          in: currencies,
        },
      },
    });

  return count > 0;
}

/* =========================================================
   SESSION FILTER
========================================================= */

function sessionAllowed(
  marketType?: string | null
): boolean {
  if (
    (marketType ?? "")
      .toUpperCase() === "CRYPTO"
  ) {
    return true;
  }

  const hour =
    new Date().getUTCHours();

  return hour >= 6 && hour < 21;
}

/* =========================================================
   RISK MANAGEMENT
========================================================= */

function getRiskConfig(
  bot: any
) {
  const config =
    parseObject(
      bot.analysisConfig
    );

  const risk =
    parseObject(config.risk);

  const lotSize =
    Math.max(
      0.01,
      num(
        risk.lotSize,
        bot.lotSize ?? 0.01
      )
    );

  const stopLossDollars =
    Math.max(
      0.01,
      num(
        risk.stopLossDollars,
        bot.stopLoss ?? 4
      )
    );

  const tp1Dollars =
    Math.max(
      0.01,
      num(
        risk.tp1Dollars,
        5
      )
    );

  const tp2Dollars =
    Math.max(
      tp1Dollars,
      num(
        risk.tp2Dollars,
        8
      )
    );

  const tp3Dollars =
    Math.max(
      tp2Dollars,
      num(
        risk.tp3Dollars,
        12
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
      symbol.includes("XAU") ||
      symbol.includes("XAG")
    ) {
      contractSize = 100;
    } else if (
      String(
        bot.marketType ?? ""
      ).toUpperCase() === "FOREX"
    ) {
      contractSize = 100000;
    } else {
      contractSize = 1;
    }
  }

  const usdIrrRate =
    num(
      risk.usdIrrRate,
      num(
        process.env.USD_IRR_RATE,
        0
      )
    );

  return {
    lotSize,

    stopLossDollars,

    tp1Dollars,

    tp2Dollars,

    tp3Dollars,

    contractSize,

    usdIrrRate,
  };
}

function calculateLevels(
  entry: number,
  direction: "BUY" | "SELL",
  risk: ReturnType<
    typeof getRiskConfig
  >
) {
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

  if (direction === "BUY") {
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
   USD → IRR
========================================================= */

async function getUsdIrrRate(): Promise<number> {
  try {
    const data =
      await twelveData(
        "/exchange_rate",
        {
          symbol: "USD/IRR",
        }
      );

    const rate =
      num(data?.rate);

    if (rate > 0) {
      return rate;
    }
  } catch {
    // fallback below
  }

  return num(
    process.env.USD_IRR_RATE,
    0
  );
}

/* =========================================================
   TELEGRAM
========================================================= */

async function sendTelegram(
  html: string
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
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

        body: JSON.stringify({
          chat_id: chatId,
          text: html,
          parse_mode: "HTML",
          disable_web_page_preview:
            true,
        }),
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

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
        data.result.message_id
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

  return {
    risk:
      metadata.risk ?? {
        lotSize: 0.01,
        stopLossDollars: 4,
        tp1Dollars: 5,
        tp2Dollars: 8,
        tp3Dollars: 12,
        contractSize: 100,
        usdIrrRate: 0,
      },

    levels:
      metadata.levels ?? {
        sl: 0,
        tp1: 0,
        tp2: 0,
        tp3: 0,
      },

    state:
      metadata.state ?? {
        tp1Hit: false,
        tp2Hit: false,
        tp3Hit: false,
        slHit: false,
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
  };
}

/* =========================================================
   PERFORMANCE
========================================================= */

function calculatePerformance(
  signals: any[],
  from: Date
) {
  let totalClosed = 0;

  let wins = 0;

  let losses = 0;

  let pnlUsd = 0;

  let pnlIrr = 0;

  let hasIrr = false;

  for (const signal of signals) {
    const metadata =
      getSignalMetadata(
        signal.metadata
      );

    const events =
      metadata.events.filter(
        (event) =>
          new Date(event.at) >=
          from
      );

    if (!events.length) {
      continue;
    }

    const closingEvent =
      events
        .filter(
          (event) =>
            event.type ===
              "SL_HIT" ||
            event.type ===
              "TP3_HIT" ||
            event.type ===
              "EXPIRED"
        )
        .sort(
          (a, b) =>
            new Date(a.at).getTime() -
            new Date(b.at).getTime()
        )
        .at(-1);

    if (!closingEvent) {
      continue;
    }

    totalClosed++;

    const totalSignalPnl =
      events.reduce(
        (sum, event) =>
          sum +
          num(
            event.pnlUsd
          ),
        0
      );

    pnlUsd +=
      totalSignalPnl;

    for (const event of events) {
      if (
        event.pnlIrr != null
      ) {
        pnlIrr += num(
          event.pnlIrr
        );

        hasIrr = true;
      }
    }

    if (
      totalSignalPnl > 0
    ) {
      wins++;
    } else if (
      totalSignalPnl < 0
    ) {
      losses++;
    }
  }

  return {
    closedSignals:
      totalClosed,

    wins,

    losses,

    winRate:
      totalClosed > 0
        ? round(
            (wins /
              totalClosed) *
              100,
            2
          )
        : 0,

    pnlUsd:
      round(pnlUsd, 2),

    pnlIrr:
      hasIrr
        ? Math.round(
            pnlIrr
          )
        : null,
  };
}

/* =========================================================
   MONITOR ACTIVE SIGNALS
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

  const results: any[] = [];

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
        | SignalEvent["type"]
        | null = null;

      let hitPrice =
        latest.price;

      /* =========================
         STOP LOSS FIRST
      ========================= */

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

        if (stopHit) {
          hit = "SL_HIT";

          hitPrice =
            levels.sl;
        }
      }

      /* =========================
         TP1
      ========================= */

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

        if (tp1Hit) {
          hit = "TP1_HIT";

          hitPrice =
            levels.tp1;
        }
      }

      /* =========================
         TP2
      ========================= */

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

        if (tp2Hit) {
          hit = "TP2_HIT";

          hitPrice =
            levels.tp2;
        }
      }

      /* =========================
         TP3
      ========================= */

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

        if (tp3Hit) {
          hit = "TP3_HIT";

          hitPrice =
            levels.tp3;
        }
      }

      /* =========================
         EXPIRY
      ========================= */

      if (
        !hit &&
        signal.expiresAt &&
        new Date(
          signal.expiresAt
        ).getTime() <=
          Date.now()
      ) {
        hit = "EXPIRED";

        hitPrice =
          latest.price;
      }

      if (!hit) {
        await prisma.tradingSignal.update(
          {
            where: {
              id: signal.id,
            },

            data: {
              metadata:
                metadata as any,
            },
          }
        );

        continue;
      }

      /* =========================
         P/L
      ========================= */

      let pnlUsd = 0;

      if (
        hit === "SL_HIT"
      ) {
        pnlUsd =
          -Math.abs(
            metadata.risk
              .stopLossDollars
          );
      }

      if (
        hit === "TP1_HIT"
      ) {
        pnlUsd =
          Math.abs(
            metadata.risk
              .tp1Dollars
          );
      }

      if (
        hit === "TP2_HIT"
      ) {
        pnlUsd =
          Math.abs(
            metadata.risk
              .tp2Dollars
          );
      }

      if (
        hit === "TP3_HIT"
      ) {
        pnlUsd =
          Math.abs(
            metadata.risk
              .tp3Dollars
          );
      }

      if (
        hit === "EXPIRED"
      ) {
        pnlUsd = 0;
      }

      const usdIrrRate =
        await getUsdIrrRate();

      const pnlIrr =
        usdIrrRate > 0
          ? Math.round(
              pnlUsd *
                usdIrrRate
            )
          : null;

      const event: SignalEvent = {
        type: hit,

        price:
          hitPrice,

        pnlUsd:
          round(pnlUsd, 2),

        pnlIrr,

        at:
          new Date().toISOString(),
      };

      metadata.events.push(
        event
      );

      if (
        hit === "SL_HIT"
      ) {
        metadata.state.slHit =
          true;
      }

      if (
        hit === "TP1_HIT"
      ) {
        metadata.state.tp1Hit =
          true;
      }

      if (
        hit === "TP2_HIT"
      ) {
        metadata.state.tp2Hit =
          true;
      }

      if (
        hit === "TP3_HIT"
      ) {
        metadata.state.tp3Hit =
          true;
      }

      const closed =
        hit === "SL_HIT" ||
        hit === "TP3_HIT" ||
        hit === "EXPIRED";

      const newStatus =
        closed
          ? "CLOSED"
          : hit;

      await prisma.tradingSignal.update(
        {
          where: {
            id: signal.id,
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

      /* =========================
         TELEGRAM EVENT
      ========================= */

      const isLoss =
        hit === "SL_HIT";

      const icon =
        isLoss
          ? "🔴"
          : hit === "EXPIRED"
          ? "⚪"
          : "🟢";

      const title =
        hit === "TP1_HIT"
          ? "TP1 HIT"
          : hit === "TP2_HIT"
          ? "TP2 HIT"
          : hit === "TP3_HIT"
          ? "TP3 HIT"
          : hit === "SL_HIT"
          ? "STOP LOSS HIT"
          : "SIGNAL EXPIRED";

      const dollar =
        pnlUsd >= 0
          ? `+$${round(
              pnlUsd,
              2
            )}`
          : `-$${round(
              Math.abs(
                pnlUsd
              ),
              2
            )}`;

      const toman =
        pnlIrr != null
          ? `${pnlIrr.toLocaleString(
              "fa-IR"
            )} تومان`
          : "نرخ دلار/تومان در دسترس نیست";

      const telegramMessage = `
${icon} <b>${title}</b>

<b>${escapeHtml(
        signal.symbol
      )}</b> · ${escapeHtml(
        signal.direction
      )}

قیمت برخورد:
<b>${round(
        hitPrice,
        5
      )}</b>

P/L:
<b>${dollar}</b>

معادل تومان:
<b>${toman}</b>

Lot:
<b>${metadata.risk.lotSize}</b>

Signal:
<code>${signal.id}</code>
      `.trim();

      const telegram =
        await sendTelegram(
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

      results.push({
        signalId:
          signal.id,

        event: hit,

        price:
          hitPrice,

        pnlUsd,

        pnlIrr,

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
   SCAN / CREATE SIGNAL
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
          updatedAt: "desc",
        },

        take: 50,
      }
    );

  const created: any[] = [];

  const errors: any[] = [];

  for (
    const bot of bots
  ) {
    if (!bot.symbol) {
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
      /* =========================
         ACTIVE SIGNAL GUARD
      ========================= */

      const activeSignal =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              botId: bot.id,

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

      if (activeSignal) {
        continue;
      }

      /* =========================
         COOLDOWN
      ========================= */

      const cooldown =
        Math.max(
          1,
          bot.cooldownMinutes ??
            5
        );

      const recentSignal =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              botId: bot.id,

              symbol,

              createdAt: {
                gte: new Date(
                  Date.now() -
                    cooldown *
                      60 *
                      1000
                ),
              },
            },

            select: {
              id: true,
            },
          }
        );

      if (recentSignal) {
        continue;
      }

      /* =========================
         SESSION FILTER
      ========================= */

      if (
        bot.sessionFilter &&
        !sessionAllowed(
          bot.marketType
        )
      ) {
        continue;
      }

      /* =========================
         NEWS FILTER
      ========================= */

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

        if (blocked) {
          continue;
        }
      }

      /* =========================
         REAL MARKET ANALYSIS
      ========================= */

      const analysis =
        await analyzeMarket(
          symbol,
          timeframe
        );

      const threshold =
        clamp(
          num(
            bot.signalThreshold,
            80
          ),
          1,
          100
        );

      const minimumConfirmations =
        Math.max(
          1,
          num(
            bot.minConfirmations,
            5
          )
        );

      if (
        analysis.score <
        threshold
      ) {
        continue;
      }

      if (
        analysis.confirmations <
        minimumConfirmations
      ) {
        continue;
      }

      /* =========================
         BUY / SELL FILTER
      ========================= */

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

      /* =========================
         RISK
      ========================= */

      const risk =
        getRiskConfig(bot);

      const levels =
        calculateLevels(
          analysis.entry,
          analysis.direction,
          risk
        );

      /* =========================
         EXPIRY
      ========================= */

      const expiryMinutes =
        timeframe === "1min"
          ? 30
          : timeframe === "5min"
          ? 90
          : timeframe ===
            "15min"
          ? 240
          : timeframe ===
            "30min"
          ? 360
          : 480;

      const expiresAt =
        new Date(
          Date.now() +
            expiryMinutes *
              60 *
              1000
        );

      const metadata: SignalMetadata =
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

              at:
                new Date().toISOString(),
            },
          ],

          lastPrice:
            analysis.entry,

          lastPriceAt:
            new Date().toISOString(),
        };

      /* =========================
         DATABASE CREATE
      ========================= */

      const signal =
        await prisma.tradingSignal.create(
          {
            data: {
              userId,

              botId:
                bot.id,

              symbol,

              timeframe,

              direction:
                analysis.direction,

              entry:
                analysis.entry,

              stopLoss:
                levels.sl,

              takeProfit:
                levels.tp3,

              riskReward:
                risk.stopLossDollars >
                0
                  ? round(
                      risk.tp3Dollars /
                        risk.stopLossDollars,
                      2
                    )
                  : null,

              score:
                analysis.score,

              confidence:
                analysis.score,

              status:
                "ACTIVE",

              source:
                "TWELVE_DATA_ENGINE",

              marketStructure:
                analysis.direction ===
                "BUY"
                  ? "Bullish"
                  : "Bearish",

              supportResistance:
                `Support ${round(
                  analysis.support,
                  5
                )} / Resistance ${round(
                  analysis.resistance,
                  5
                )}`,

              liquidity:
                analysis.signals
                  .liquiditySweep
                  ? "Liquidity Sweep confirmed"
                  : "No liquidity sweep",

              pullback:
                analysis.signals
                  .pullback
                  ? "Pullback confirmed"
                  : "No pullback",

              candlePattern:
                analysis.signals.candle
                  .name,

              volumeConfirmation:
                analysis.signals
                  .volume
                  ? "Confirmed"
                  : "Weak",

              multiTimeframeConfirmation:
                JSON.stringify(
                  analysis.signals
                    .mtf
                ),

              sessionConfirmation:
                bot.sessionFilter
                  ? "Session filter passed"
                  : "Session filter disabled",

              volatilityConfirmation:
                analysis.atr > 0
                  ? `ATR ${round(
                      analysis.atr,
                      5
                    )}`
                  : "ATR unavailable",

              newsConfirmation:
                bot.newsFilter
                  ? "News filter passed"
                  : "News filter disabled",

              confirmations:
                analysis.signals as any,

              reasons:
                analysis.reasons as any,

              metadata:
                metadata as any,

              expiresAt,
            },
          }
        );

      /* =========================
         TELEGRAM NEW SIGNAL
      ========================= */

      const telegramMessage = `
🟡 <b>NEW ${analysis.direction} SIGNAL</b>

<b>${escapeHtml(
        symbol
      )}</b> · <b>${escapeHtml(
        timeframe
      )}</b>

━━━━━━━━━━━━━━

🎯 Entry:
<b>${round(
        analysis.entry,
        5
      )}</b>

🔴 Stop Loss:
<b>${round(
        levels.sl,
        5
      )}</b>
−$${risk.stopLossDollars}

🟢 TP1:
<b>${round(
        levels.tp1,
        5
      )}</b>
+$${risk.tp1Dollars}

🟢 TP2:
<b>${round(
        levels.tp2,
        5
      )}</b>
+$${risk.tp2Dollars}

🟢 TP3:
<b>${round(
        levels.tp3,
        5
      )}</b>
+$${risk.tp3Dollars}

━━━━━━━━━━━━━━

📊 Score:
<b>${analysis.score}/100</b>

✅ Confirmations:
<b>${analysis.confirmations}</b>

📦 Lot:
<b>${risk.lotSize}</b>

📈 RSI:
<b>${round(
        analysis.rsi,
        2
      )}</b>

📉 MACD:
<b>${round(
        analysis.macd,
        5
      )}</b>

━━━━━━━━━━━━━━

<b>Analysis</b>

${analysis.reasons
  .map(
    (reason) =>
      `• ${escapeHtml(
        reason
      )}`
  )
  .join("\n")}

━━━━━━━━━━━━━━

🆔 Signal:
<code>${signal.id}</code>
      `.trim();

      const telegram =
        await sendTelegram(
          telegramMessage
        );

      if (
        telegram.ok
      ) {
        await prisma.tradingSignal.update(
          {
            where: {
              id: signal.id,
            },

            data: {
              telegramSent:
                true,

              telegramMessageId:
                telegram.messageId,

              telegramSentAt:
                new Date(),
            },
          }
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
                  "SENT",

                sentAt:
                  new Date(),
              },
            }
          );
        }
      } else if (
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

              status:
                "FAILED",

              errorMessage:
                telegram.error,
            },
          }
        );
      }

      created.push({
        id: signal.id,

        symbol:
          signal.symbol,

        direction:
          signal.direction,

        entry:
          signal.entry,

        stopLoss:
          signal.stopLoss,

        tp1:
          levels.tp1,

        tp2:
          levels.tp2,

        tp3:
          levels.tp3,

        score:
          analysis.score,

        telegram:
          telegram.ok,
      });
    } catch (error) {
      errors.push({
        botId: bot.id,

        symbol,

        error:
          error instanceof Error
            ? error.message
            : "خطای تحلیل سیگنال",
      });
    }
  }

  return {
    bots: bots.length,

    created,

    errors,
  };
}

/* =========================================================
   GET API
========================================================= */

export async function GET(
  request: Request
) {
  const session =
    await getSession();

  if (!session?.userId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "احراز هویت لازم است.",
      },
      {
        status: 401,
      }
    );
  }

  if (
    !process.env
      .TWELVE_DATA_API_KEY
  ) {
    return NextResponse.json(
      {
        ok: false,

        error:
          "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const url =
      new URL(
        request.url
      );

    const requestedInterval =
      url.searchParams.get(
        "interval"
      ) ?? undefined;

    /* ==================================
       FIRST: MONITOR ACTIVE SIGNALS
    ================================== */

    const monitored =
      await monitorSignals(
        session.userId
      );

    /* ==================================
       SECOND: FIND NEW SIGNALS
    ================================== */

    const scanned =
      await scanBots(
        session.userId,
        requestedInterval
      );

    /* ==================================
       FETCH SIGNALS
    ================================== */

    const signals =
      await prisma.tradingSignal.findMany(
        {
          where: {
            userId:
              session.userId,
          },

          include: {
            bot: {
              select: {
                name: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 100,
        }
      );

    /* ==================================
       PERFORMANCE PERIODS
    ================================== */

    const now =
      new Date();

    const daily =
      new Date(now);

    daily.setHours(
      0,
      0,
      0,
      0
    );

    const weekly =
      new Date(now);

    weekly.setDate(
      weekly.getDate() -
        6
    );

    const monthly =
      new Date(now);

    monthly.setDate(
      monthly.getDate() -
        29
    );

    return NextResponse.json(
      {
        ok: true,

        engine: {
          source:
            "Twelve Data",

          monitored,

          scanned,
        },

        signals,

        performance: {
          daily:
            calculatePerformance(
              signals,
              daily
            ),

          weekly:
            calculatePerformance(
              signals,
              weekly
            ),

          monthly:
            calculatePerformance(
              signals,
              monthly
            ),
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "SIGNAL_ENGINE_ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای موتور سیگنال",
      },
      {
        status: 500,
      }
    );
  }
}
