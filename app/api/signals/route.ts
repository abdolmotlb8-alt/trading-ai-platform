import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   SIGNAL ENGINE
   XAUUSD / FOREX / CRYPTO
   Real market data -> Twelve Data
   ========================================================= */

const TWELVE_DATA_URL = "https://api.twelvedata.com";

const INTERVALS = [
  "1min",
  "5min",
  "15min",
  "30min",
  "1h",
  "2h",
  "4h",
  "8h",
  "1day",
] as const;

const ANALYSIS_CHAIN = [
  "4h",
  "1h",
  "15min",
  "5min",
  "1min",
] as const;

type Direction = "BUY" | "SELL";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type SignalEvent = {
  type: string;
  price: number;
  pnlUsd: number;
  pnlIrr?: number | null;
  at: string;
  note?: string;
};

type RiskConfig = {
  lotSize: number;
  stopLossDollars: number;
  tp1Dollars: number;
  tp2Dollars: number;
  tp3Dollars: number;
  contractSize: number;
  usdIrrRate: number;
};

type SignalLevels = {
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
};

type SignalState = {
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  slHit: boolean;
};

type SignalMeta = {
  risk: RiskConfig;
  levels: SignalLevels;
  events: SignalEvent[];
  state: SignalState;
  lastPrice?: number;
  lastPriceAt?: string;
  signalVersion?: string;
  analysisScore?: number;
  confirmations?: number;
};

type AnalysisResult = {
  direction: Direction;
  score: number;
  confirmations: number;
  entry: number;
  atr: number;
  resistance: number;
  support: number;

  trendOk: boolean;
  momentumOk: boolean;
  macdOk: boolean;
  pullbackOk: boolean;
  liquidityOk: boolean;
  candleOk: boolean;
  volumeOk: boolean;
  mtfOk: boolean;

  candleName: string;
  reasons: string[];

  timeframe: string;
};

type EngineEvent = {
  signalId: string;
  event?: string;
  telegram?: boolean;
  error?: string;
};

type TelegramResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

/*
 * برای جلوگیری از اجرای همزمان دو اسکن روی یک Instance
 * Render / Next.js
 */
let engineLock: Promise<unknown> | null = null;

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function num(value: unknown, fallback = 0): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

function round(
  value: number,
  digits = 5
): number {
  const power = 10 ** digits;

  return (
    Math.round(value * power) /
    power
  );
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseObject(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function normalizeTimeframe(
  value: string | null | undefined
): string {
  const raw = String(
    value ?? "15min"
  )
    .trim()
    .toLowerCase();

  if (raw === "1m") return "1min";
  if (raw === "5m") return "5min";
  if (raw === "15m") return "15min";
  if (raw === "30m") return "30min";
  if (raw === "1h") return "1h";
  if (raw === "2h") return "2h";
  if (raw === "4h") return "4h";
  if (raw === "8h") return "8h";
  if (
    raw === "1d" ||
    raw === "1day"
  ) {
    return "1day";
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
   SYMBOL
   ========================================================= */

function twelveDataSymbol(
  symbol: string
): string {
  const normalized = symbol
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

  if (map[normalized]) {
    return map[normalized];
  }

  if (normalized.includes("/")) {
    return normalized;
  }

  if (normalized.length === 6) {
    return `${normalized.slice(
      0,
      3
    )}/${normalized.slice(3)}`;
  }

  return normalized;
}

function isGold(
  symbol: string
): boolean {
  const s = symbol
    .replace(/\s/g, "")
    .toUpperCase();

  return (
    s === "XAUUSD" ||
    s === "XAU/USD"
  );
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(
  path: string,
  params: Record<
    string,
    string | number | boolean
  >
): Promise<Record<string, unknown>> {
  const apiKey =
    process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد."
    );
  }

  const url = new URL(
    `${TWELVE_DATA_URL}${path}`
  );

  const finalParams = {
    ...params,
    apikey: apiKey,
  };

  for (const [
    key,
    value,
  ] of Object.entries(finalParams)) {
    url.searchParams.set(
      key,
      String(value)
    );
  }

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const data: unknown =
    await response
      .json()
      .catch(() => null);

  const object =
    parseObject(data);

  if (
    !response.ok ||
    object.status === "error" ||
    object.code
  ) {
    throw new Error(
      String(
        object.message ??
          `Twelve Data HTTP ${response.status}`
      )
    );
  }

  return object;
}

/* =========================================================
   MARKET DATA
   ========================================================= */

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 180
): Promise<Candle[]> {
  const data =
    await twelveData(
      "/time_series",
      {
        symbol:
          twelveDataSymbol(symbol),
        interval,
        outputsize,
        order: "asc",
        timezone: "UTC",
      }
    );

  const rawValues =
    Array.isArray(data.values)
      ? data.values
      : [];

  const candles: Candle[] =
    rawValues
      .map(
        (item: unknown) => {
          const row =
            parseObject(item);

          return {
            datetime: String(
              row.datetime ?? ""
            ),
            open: num(row.open),
            high: num(row.high),
            low: num(row.low),
            close: num(row.close),
            volume:
              row.volume == null
                ? undefined
                : num(row.volume),
          };
        }
      )
      .filter(
        (candle: Candle) =>
          candle.datetime &&
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.close > 0
      );

  if (candles.length < 60) {
    throw new Error(
      `داده کافی برای ${symbol} در تایم‌فریم ${interval} دریافت نشد.`
    );
  }

  return candles;
}

async function getLatestBar(
  symbol: string
): Promise<Candle> {
  const data =
    await twelveData(
      "/time_series",
      {
        symbol:
          twelveDataSymbol(symbol),
        interval: "1min",
        outputsize: 2,
        order: "desc",
        timezone: "UTC",
      }
    );

  const values =
    Array.isArray(data.values)
      ? data.values
      : [];

  const raw =
    values[0];

  const row =
    parseObject(raw);

  const candle: Candle = {
    datetime: String(
      row.datetime ?? ""
    ),
    open: num(row.open),
    high: num(row.high),
    low: num(row.low),
    close: num(row.close),
    volume:
      row.volume == null
        ? undefined
        : num(row.volume),
  };

  if (
    !candle.datetime ||
    !candle.close
  ) {
    throw new Error(
      "قیمت لحظه‌ای بازار دریافت نشد."
    );
  }

  return candle;
}

/* =========================================================
   INDICATORS
   ========================================================= */

function ema(
  values: number[],
  period: number
): number {
  if (
    values.length < period
  ) {
    return 0;
  }

  let result = avg(
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
    values.length <= period
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
    const difference =
      values[i] -
      values[i - 1];

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
      values[i] -
      values[i - 1];

    averageGain =
      ((averageGain *
        (period - 1)) +
        (difference > 0
          ? difference
          : 0)) /
      period;

    averageLoss =
      ((averageLoss *
        (period - 1)) +
        (difference < 0
          ? -difference
          : 0)) /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength =
    averageGain /
    averageLoss;

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
  if (
    candles.length <= period
  ) {
    return 0;
  }

  const trueRanges: number[] =
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

    trueRanges.push(
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

  return avg(
    trueRanges.slice(-period)
  );
}

function macd(
  values: number[]
): {
  line: number;
  previous: number;
} {
  const fast =
    ema(values, 12);

  const slow =
    ema(values, 26);

  const previousValues =
    values.slice(0, -1);

  const previousFast =
    ema(
      previousValues,
      12
    );

  const previousSlow =
    ema(
      previousValues,
      26
    );

  return {
    line: fast - slow,
    previous:
      previousFast -
      previousSlow,
  };
}

function swings(
  candles: Candle[]
): {
  support: number;
  resistance: number;
  highs: number[];
  lows: number[];
} {
  const recent =
    candles.slice(-100);

  const highs: number[] =
    [];

  const lows: number[] =
    [];

  for (
    let i = 2;
    i < recent.length - 2;
    i++
  ) {
    const current =
      recent[i];

    if (
      current.high >
        recent[i - 1].high &&
      current.high >
        recent[i - 2].high &&
      current.high >
        recent[i + 1].high &&
      current.high >
        recent[i + 2].high
    ) {
      highs.push(
        current.high
      );
    }

    if (
      current.low <
        recent[i - 1].low &&
      current.low <
        recent[i - 2].low &&
      current.low <
        recent[i + 1].low &&
      current.low <
        recent[i + 2].low
    ) {
      lows.push(
        current.low
      );
    }
  }

  const recentHighs =
    highs.slice(-8);

  const recentLows =
    lows.slice(-8);

  const fallbackHigh =
    Math.max(
      ...recent.map(
        (candle) =>
          candle.high
      )
    );

  const fallbackLow =
    Math.min(
      ...recent.map(
        (candle) =>
          candle.low
      )
    );

  return {
    resistance:
      recentHighs.length
        ? Math.max(
            ...recentHighs
          )
        : fallbackHigh,

    support:
      recentLows.length
        ? Math.min(
            ...recentLows
          )
        : fallbackLow,

    highs,
    lows,
  };
}

function candlePattern(
  candles: Candle[],
  direction: Direction
): {
  ok: boolean;
  name: string;
} {
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

  const body =
    Math.abs(
      current.close -
        current.open
    );

  const range =
    Math.max(
      current.high -
        current.low,
      0.0000001
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
      Math.max(
        body,
        range * 0.1
      );

  const shootingStar =
    upperWick >
      body * 2 &&
    lowerWick <
      Math.max(
        body,
        range * 0.1
      );

  if (
    direction === "BUY" &&
    (bullishEngulfing ||
      hammer)
  ) {
    return {
      ok: true,
      name: bullishEngulfing
        ? "Bullish Engulfing"
        : "Hammer",
    };
  }

  if (
    direction === "SELL" &&
    (bearishEngulfing ||
      shootingStar)
  ) {
    return {
      ok: true,
      name: bearishEngulfing
        ? "Bearish Engulfing"
        : "Shooting Star",
    };
  }

  return {
    ok: false,
    name: "No confirmation",
  };
}

/* =========================================================
   ANALYSIS ENGINE
   ========================================================= */

async function analyze(
  symbol: string,
  requestedTf: string
): Promise<AnalysisResult> {
  const timeframe =
    normalizeTimeframe(
      requestedTf
    );

  const responses =
    await Promise.all(
      ANALYSIS_CHAIN.map(
        async (
          timeframeItem
        ) => {
          try {
            return await getCandles(
              symbol,
              timeframeItem,
              180
            );
          } catch {
            return null;
          }
        }
      )
    );

  const map: Record<
    string,
    Candle[]
  > = {};

  ANALYSIS_CHAIN.forEach(
    (
      timeframeItem,
      index
    ) => {
      const result =
        responses[index];

      if (result) {
        map[
          timeframeItem
        ] = result;
      }
    }
  );

  const main =
    map[timeframe] ??
    map["15min"] ??
    map["5min"] ??
    map["1min"] ??
    Object.values(map)[0];

  if (!main) {
    throw new Error(
      `داده تحلیلی ${symbol} دریافت نشد.`
    );
  }

  const closes =
    main.map(
      (candle) =>
        candle.close
    );

  const current =
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
    swings(main);

  const bullishTrend =
    current.close > ema20 &&
    ema20 > ema50 &&
    ema50 > ema200;

  const bearishTrend =
    current.close < ema20 &&
    ema20 < ema50 &&
    ema50 < ema200;

  const bullishMomentum =
    currentRsi >= 52 &&
    currentRsi <= 72;

  const bearishMomentum =
    currentRsi <= 48 &&
    currentRsi >= 28;

  const bullishMacd =
    currentMacd.line > 0 &&
    currentMacd.line >=
      currentMacd.previous;

  const bearishMacd =
    currentMacd.line < 0 &&
    currentMacd.line <=
      currentMacd.previous;

  const breakoutUp =
    current.close >
    structure.resistance;

  const breakoutDown =
    current.close <
    structure.support;

  const sweepLow =
    current.low <
      structure.support &&
    current.close >
      structure.support;

  const sweepHigh =
    current.high >
      structure.resistance &&
    current.close <
      structure.resistance;

  const bullishPullback =
    current.low <=
      ema20 +
        currentAtr * 0.35 &&
    current.close >
      ema20;

  const bearishPullback =
    current.high >=
      ema20 -
        currentAtr * 0.35 &&
    current.close <
      ema20;

  const volumeValues =
    main
      .map(
        (candle) =>
          candle.volume ?? 0
      )
      .slice(-21);

  const averageVolume =
    avg(
      volumeValues.slice(
        0,
        -1
      )
    );

  const volumeOk =
    averageVolume <= 0
      ? true
      : (current.volume ?? 0) >=
        averageVolume * 0.85;

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

  const mtfDirections =
    ANALYSIS_CHAIN
      .filter(
        (
          tf
        ) =>
          Boolean(map[tf])
      )
      .map(
        (
          tf
        ) => {
          const candlesForTf =
            map[tf];

          const last =
            candlesForTf[
              candlesForTf.length -
                1
            ];

          const closesForTf =
            candlesForTf.map(
              (
                candle
              ) =>
                candle.close
            );

          const e20 =
            ema(
              closesForTf,
              20
            );

          if (
            last.close >
            e20
          ) {
            return 1;
          }

          if (
            last.close <
            e20
          ) {
            return -1;
          }

          return 0;
        }
      );

  const mtfBullCount =
    mtfDirections.filter(
      (
        value
      ) => value > 0
    ).length;

  const mtfBearCount =
    mtfDirections.filter(
      (
        value
      ) => value < 0
    ).length;

  const bullishMtf =
    mtfBullCount >=
    Math.max(
      3,
      Math.ceil(
        mtfDirections.length *
          0.6
      )
    );

  const bearishMtf =
    mtfBearCount >=
    Math.max(
      3,
      Math.ceil(
        mtfDirections.length *
          0.6
      )
    );

  const buyConditions = [
    bullishTrend,
    bullishMomentum,
    bullishMacd,
    bullishPullback ||
      sweepLow ||
      breakoutUp,
    bullishCandle.ok,
    volumeOk,
    bullishMtf,
  ];

  const sellConditions = [
    bearishTrend,
    bearishMomentum,
    bearishMacd,
    bearishPullback ||
      sweepHigh ||
      breakoutDown,
    bearishCandle.ok,
    volumeOk,
    bearishMtf,
  ];

  const buyVotes =
    buyConditions.filter(
      Boolean
    ).length;

  const sellVotes =
    sellConditions.filter(
      Boolean
    ).length;

  let direction: Direction;

  if (
    buyVotes === sellVotes
  ) {
    direction =
      bullishTrend &&
      !bearishTrend
        ? "BUY"
        : "SELL";
  } else {
    direction =
      buyVotes >
      sellVotes
        ? "BUY"
        : "SELL";
  }

  const trendOk =
    direction === "BUY"
      ? bullishTrend
      : bearishTrend;

  const momentumOk =
    direction === "BUY"
      ? bullishMomentum
      : bearishMomentum;

  const macdOk =
    direction === "BUY"
      ? bullishMacd
      : bearishMacd;

  const pullbackOk =
    direction === "BUY"
      ? bullishPullback
      : bearishPullback;

  const liquidityOk =
    direction === "BUY"
      ? sweepLow
      : sweepHigh;

  const candleOk =
    direction === "BUY"
      ? bullishCandle.ok
      : bearishCandle.ok;

  const mtfOk =
    direction === "BUY"
      ? bullishMtf
      : bearishMtf;

  /*
   * امتیازدهی سختگیرانه
   */
  let score = 0;

  if (trendOk) {
    score += 22;
  }

  if (momentumOk) {
    score += 14;
  }

  if (macdOk) {
    score += 14;
  }

  if (
    pullbackOk ||
    liquidityOk ||
    (direction === "BUY"
      ? breakoutUp
      : breakoutDown)
  ) {
    score += 16;
  }

  if (candleOk) {
    score += 12;
  }

  if (volumeOk) {
    score += 7;
  }

  if (mtfOk) {
    score += 15;
  }

  /*
   * اگر بازار بیش از حد کشیده شده باشد،
   * امتیاز کم می‌شود تا ورود بد ایجاد نشود.
   */
  const distanceFromEma =
    Math.abs(
      current.close -
        ema20
    );

  if (
    currentAtr > 0 &&
    distanceFromEma >
      currentAtr * 2.2
  ) {
    score -= 12;
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

  const reasons: string[] =
    [];

  if (trendOk) {
    reasons.push(
      direction === "BUY"
        ? "روند صعودی EMA تأیید شد"
        : "روند نزولی EMA تأیید شد"
    );
  }

  if (momentumOk) {
    reasons.push(
      `RSI مناسب: ${round(
        currentRsi,
        1
      )}`
    );
  }

  if (macdOk) {
    reasons.push(
      "MACD هم‌جهت با معامله است"
    );
  }

  if (pullbackOk) {
    reasons.push(
      "Pullback معتبر"
    );
  }

  if (liquidityOk) {
    reasons.push(
      "Liquidity Sweep"
    );
  }

  if (
    direction === "BUY" &&
    breakoutUp
  ) {
    reasons.push(
      "Breakout صعودی"
    );
  }

  if (
    direction === "SELL" &&
    breakoutDown
  ) {
    reasons.push(
      "Breakout نزولی"
    );
  }

  if (candleOk) {
    reasons.push(
      `الگوی کندلی: ${
        direction === "BUY"
          ? bullishCandle.name
          : bearishCandle.name
      }`
    );
  }

  if (volumeOk) {
    reasons.push(
      "حجم قابل قبول"
    );
  }

  if (mtfOk) {
    reasons.push(
      "تأیید چندتایم‌فریمی"
    );
  }

  /*
   * برای اینکه previous واقعاً استفاده شود
   * و build هشدار ندهد.
   */
  void previous;

  return {
    direction,
    score,
    confirmations,
    entry: current.close,
    atr: currentAtr,
    resistance:
      structure.resistance,
    support:
      structure.support,

    trendOk,
    momentumOk,
    macdOk,
    pullbackOk,
    liquidityOk,
    candleOk,
    volumeOk,
    mtfOk,

    candleName:
      direction === "BUY"
        ? bullishCandle.name
        : bearishCandle.name,

    reasons,
    timeframe,
  };
}

/* =========================================================
   NEWS / SESSION
   ========================================================= */

function currenciesFor(
  symbol: string
): string[] {
  const normalized =
    symbol
      .toUpperCase()
      .replace(/\s/g, "");

  if (
    normalized.includes(
      "XAU"
    ) ||
    normalized.includes(
      "XAG"
    )
  ) {
    return ["USD"];
  }

  if (
    normalized.includes("/")
  ) {
    return normalized
      .split("/")
      .filter(Boolean);
  }

  if (
    normalized.length === 6
  ) {
    return [
      normalized.slice(
        0,
        3
      ),
      normalized.slice(3),
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
    currenciesFor(symbol);

  if (!currencies.length) {
    return false;
  }

  const now =
    new Date();

  const until =
    new Date(
      Date.now() +
        minutes * 60_000
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
            in: currencies,
          },
        },
      }
    );

  return count > 0;
}

function sessionAllowed(
  marketType:
    | string
    | null
    | undefined
): boolean {
  const type =
    String(
      marketType ?? ""
    ).toUpperCase();

  if (type === "CRYPTO") {
    return true;
  }

  /*
   * زمان کلی سشن‌های اصلی.
   * هدف این قسمت حذف ساعت‌های بسیار کم‌نقدشونده است.
   */
  const hour =
    new Date().getUTCHours();

  return (
    hour >= 6 &&
    hour < 21
  );
}

/* =========================================================
   RISK MANAGEMENT
   ========================================================= */

function riskConfig(
  bot: {
    lotSize?: unknown;
    stopLoss?: unknown;
    analysisConfig?: unknown;
    marketType?: string | null;
    symbol?: string | null;
  }
): RiskConfig {
  const config =
    parseObject(
      bot.analysisConfig
    );

  const configuredRisk =
    parseObject(
      config.risk
    );

  const gold =
    isGold(
      String(
        bot.symbol ?? ""
      )
    );

  /*
   * تنظیم استاندارد XAUUSD:
   *
   * 0.10 lot
   * SL = $40
   * TP1 = $24
   * TP2 = $30
   * TP3 = $42
   *
   * با contract=100:
   *
   * SL distance = 4$
   * TP1 distance = 6$
   * TP2 distance = 10$
   * TP3 distance = 14$
   *
   * TP1 = 1.5R
   * TP2 = 2.5R
   * TP3 = 3.5R
   */

  const defaultLot =
    gold ? 0.10 : 0.01;

  const defaultContract =
    gold
      ? 100
      : String(
            bot.marketType ??
              ""
          ).toUpperCase() ===
        "FOREX"
      ? 100_000
      : 1;

  const lot =
    Math.max(
      0.01,
      num(
        configuredRisk.lotSize,
        num(
          bot.lotSize,
          defaultLot
        )
      )
    );

  const contractSize =
    Math.max(
      0.000001,
      num(
        configuredRisk.contractSize,
        defaultContract
      )
    );

  let stopLossDollars =
    num(
      configuredRisk.stopLossDollars,
      gold
        ? 40
        : num(
            bot.stopLoss,
            10
          )
    );

  let tp1Dollars =
    num(
      configuredRisk.tp1Dollars,
      gold ? 24 : 15
    );

  let tp2Dollars =
    num(
      configuredRisk.tp2Dollars,
      gold ? 30 : 25
    );

  let tp3Dollars =
    num(
      configuredRisk.tp3Dollars,
      gold ? 42 : 35
    );

  stopLossDollars =
    Math.max(
      1,
      stopLossDollars
    );

  /*
   * برای XAU حداقل نسبت سود به ریسک
   * به صورت خودکار حفظ می‌شود.
   */
  if (gold) {
    tp1Dollars =
      Math.max(
        tp1Dollars,
        stopLossDollars *
          0.6
      );

    tp2Dollars =
      Math.max(
        tp2Dollars,
        stopLossDollars *
          0.75
      );

    tp3Dollars =
      Math.max(
        tp3Dollars,
        stopLossDollars *
          1.05
      );
  }

  tp2Dollars =
    Math.max(
      tp2Dollars,
      tp1Dollars
    );

  tp3Dollars =
    Math.max(
      tp3Dollars,
      tp2Dollars
    );

  const usdIrrRate =
    num(
      configuredRisk.usdIrrRate,
      num(
        process.env.USD_IRR_RATE,
        0
      )
    );

  return {
    lotSize:
      Math.round(
        lot * 100
      ) / 100,

    stopLossDollars:
      round(
        stopLossDollars,
        2
      ),

    tp1Dollars:
      round(
        tp1Dollars,
        2
      ),

    tp2Dollars:
      round(
        tp2Dollars,
        2
      ),

    tp3Dollars:
      round(
        tp3Dollars,
        2
      ),

    contractSize,

    usdIrrRate,
  };
}

function calculateLevels(
  entry: number,
  direction: Direction,
  risk: RiskConfig
): SignalLevels {
  const totalUnits =
    risk.lotSize *
    risk.contractSize;

  if (
    totalUnits <= 0
  ) {
    throw new Error(
      "حجم معامله یا contract size معتبر نیست."
    );
  }

  const stopDistance =
    risk.stopLossDollars /
    totalUnits;

  const tp1Distance =
    risk.tp1Dollars /
    (0.04 *
      risk.contractSize);

  const tp2Distance =
    risk.tp2Dollars /
    (0.03 *
      risk.contractSize);

  const tp3Distance =
    risk.tp3Dollars /
    (0.03 *
      risk.contractSize);

  /*
   * برای XAU، فاصله‌های استاندارد:
   * SL ≈ 4$
   * TP1 ≈ 6$
   * TP2 ≈ 10$
   * TP3 ≈ 14$
   */
  if (
    direction === "BUY"
  ) {
    return {
      sl: round(
        entry -
          stopDistance,
        3
      ),

      tp1: round(
        entry +
          tp1Distance,
        3
      ),

      tp2: round(
        entry +
          tp2Distance,
        3
      ),

      tp3: round(
        entry +
          tp3Distance,
        3
      ),
    };
  }

  return {
    sl: round(
      entry +
        stopDistance,
      3
    ),

    tp1: round(
      entry -
        tp1Distance,
      3
    ),

    tp2: round(
      entry -
        tp2Distance,
      3
    ),

    tp3: round(
      entry -
        tp3Distance,
      3
    ),
  };
}

/* =========================================================
   RR / TARGET ROOM
   ========================================================= */

function calculateRR(
  entry: number,
  levels: SignalLevels
): number {
  const riskDistance =
    Math.abs(
      entry - levels.sl
    );

  const rewardDistance =
    Math.abs(
      entry - levels.tp3
    );

  if (
    riskDistance <= 0
  ) {
    return 0;
  }

  return round(
    rewardDistance /
      riskDistance,
    2
  );
}

function targetRoomValid(
  analysis: AnalysisResult,
  levels: SignalLevels
): boolean {
  const entry =
    analysis.entry;

  const atr =
    analysis.atr;

  /*
   * بافر برای جلوگیری از سیگنال‌هایی
   * که بلافاصله جلوی مقاومت/حمایت
   * قرار می‌گیرند.
   */
  const buffer =
    Math.max(
      0.5,
      atr * 0.15
    );

  if (
    analysis.direction ===
    "BUY"
  ) {
    /*
     * برای BUY مقاومت باید بالاتر از TP1
     * فضای واقعی باقی بگذارد.
     */
    if (
      analysis.resistance >
        entry &&
      analysis.resistance <
        levels.tp1 + buffer
    ) {
      return false;
    }

    return (
      analysis.resistance ===
        0 ||
      analysis.resistance >=
        levels.tp1 + buffer ||
      levels.tp1 <
        entry
    );
  }

  /*
   * برای SELL حمایت باید پایین‌تر از TP1
   * باشد.
   */
  if (
    analysis.support <
      entry &&
    analysis.support >
      levels.tp1 - buffer
  ) {
    return false;
  }

  return (
    analysis.support ===
      0 ||
    analysis.support <=
      levels.tp1 - buffer ||
    levels.tp1 >
      entry
  );
}

/* =========================================================
   FX
   ========================================================= */

async function usdToIrr(
  fallback: number
): Promise<number> {
  try {
    const data =
      await twelveData(
        "/exchange_rate",
        {
          symbol: "USD/IRR",
        }
      );

    const rate =
      num(data.rate);

    if (rate > 0) {
      return rate;
    }
  } catch {
    /*
     * نرخ تومان نباید موتور معامله را متوقف کند.
     */
  }

  return fallback;
}

/* =========================================================
   TELEGRAM
   ========================================================= */

async function telegramMessage(
  text: string
): Promise<TelegramResult> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (
    !token ||
    !chatId
  ) {
    return {
      ok: false,
      error:
        "TELEGRAM_BOT_TOKEN یا TELEGRAM_SIGNAL_CHAT_ID وجود ندارد.",
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
          body: JSON.stringify(
            {
              chat_id: chatId,
              text,
              parse_mode: "HTML",
              disable_web_page_preview:
                true,
            }
          ),
        }
      );

    const data: unknown =
      await response
        .json()
        .catch(
          () => null
        );

    const object =
      parseObject(data);

    if (
      !response.ok ||
      object.ok !== true
    ) {
      return {
        ok: false,
        error: String(
          object.description ??
            `Telegram HTTP ${response.status}`
        ),
      };
    }

    const result =
      parseObject(
        object.result
      );

    return {
      ok: true,
      messageId: String(
        result.message_id ??
          ""
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "خطای Telegram",
    };
  }
}

/* =========================================================
   TELEGRAM SIGNAL MESSAGE
   ========================================================= */

function signalTelegramText(
  signal: {
    symbol: string;
    direction: Direction;
    timeframe: string;
    entry: number;
    score: number;
    confirmations: number;
  },
  levels: SignalLevels,
  risk: RiskConfig,
  rr: number
): string {
  const icon =
    signal.direction ===
    "BUY"
      ? "🟢"
      : "🔴";

  const direction =
    signal.direction ===
    "BUY"
      ? "BUY / خرید"
      : "SELL / فروش";

  return [
    `${icon} <b>NEW ${esc(
      direction
    )} SIGNAL</b>`,
    "",
    `💰 <b>${esc(
      signal.symbol
    )}</b> · ${esc(
      signal.timeframe
    )}`,
    "",
    `📍 Entry: <b>${round(
      signal.entry,
      3
    )}</b>`,
    `🛑 SL: <b>${round(
      levels.sl,
      3
    )}</b> · -$${risk.stopLossDollars}`,
    "",
    `🎯 TP1: <b>${round(
      levels.tp1,
      3
    )}</b> · +$${risk.tp1Dollars}`,
    `🎯 TP2: <b>${round(
      levels.tp2,
      3
    )}</b> · +$${risk.tp2Dollars}`,
    `🎯 TP3: <b>${round(
      levels.tp3,
      3
    )}</b> · +$${risk.tp3Dollars}`,
    "",
    `📊 Score: <b>${signal.score}/100</b>`,
    `✅ Confirmations: <b>${signal.confirmations}</b>`,
    `⚖️ RR: <b>1:${rr}</b>`,
    `📦 Total Lot: <b>${risk.lotSize.toFixed(
      2
    )}</b>`,
    "",
    `0.04 lot → TP1`,
    `0.03 lot → TP2`,
    `0.03 lot → TP3`,
    "",
    `⚠️ این سیگنال بر اساس داده واقعی بازار تولید شده و تضمین سود نیست.`,
  ].join("\n");
}

/* =========================================================
   SIGNAL META
   ========================================================= */

function getSignalMeta(
  value: unknown
): SignalMeta {
  const meta =
    parseObject(value);

  const riskObject =
    parseObject(
      meta.risk
    );

  const levelObject =
    parseObject(
      meta.levels
    );

  const stateObject =
    parseObject(
      meta.state
    );

  const rawEvents =
    Array.isArray(
      meta.events
    )
      ? meta.events
      : [];

  const events: SignalEvent[] =
    rawEvents
      .map(
        (item: unknown) => {
          const event =
            parseObject(item);

          return {
            type: String(
              event.type ??
                ""
            ),
            price: num(
              event.price
            ),
            pnlUsd: num(
              event.pnlUsd
            ),
            pnlIrr:
              event.pnlIrr ==
              null
                ? null
                : num(
                    event.pnlIrr
                  ),
            at: String(
              event.at ??
                new Date().toISOString()
            ),
            note:
              event.note == null
                ? undefined
                : String(
                    event.note
                  ),
          };
        }
      );

  return {
    risk: {
      lotSize: num(
        riskObject.lotSize,
        0.1
      ),
      stopLossDollars:
        num(
          riskObject.stopLossDollars,
          40
        ),
      tp1Dollars: num(
        riskObject.tp1Dollars,
        24
      ),
      tp2Dollars: num(
        riskObject.tp2Dollars,
        30
      ),
      tp3Dollars: num(
        riskObject.tp3Dollars,
        42
      ),
      contractSize: num(
        riskObject.contractSize,
        100
      ),
      usdIrrRate: num(
        riskObject.usdIrrRate,
        0
      ),
    },

    levels: {
      sl: num(
        levelObject.sl
      ),
      tp1: num(
        levelObject.tp1
      ),
      tp2: num(
        levelObject.tp2
      ),
      tp3: num(
        levelObject.tp3
      ),
    },

    events,

    state: {
      tp1Hit:
        Boolean(
          stateObject.tp1Hit
        ),
      tp2Hit:
        Boolean(
          stateObject.tp2Hit
        ),
      tp3Hit:
        Boolean(
          stateObject.tp3Hit
        ),
      slHit:
        Boolean(
          stateObject.slHit
        ),
    },

    lastPrice:
      meta.lastPrice == null
        ? undefined
        : num(
            meta.lastPrice
          ),

    lastPriceAt:
      meta.lastPriceAt == null
        ? undefined
        : String(
            meta.lastPriceAt
          ),

    signalVersion:
      meta.signalVersion == null
        ? undefined
        : String(
            meta.signalVersion
          ),

    analysisScore:
      meta.analysisScore == null
        ? undefined
        : num(
            meta.analysisScore
          ),

    confirmations:
      meta.confirmations == null
        ? undefined
        : num(
            meta.confirmations
          ),
  };
}

/* =========================================================
   EVENT DUPLICATION CHECK
   ========================================================= */

function hasEvent(
  meta: SignalMeta,
  type: string
): boolean {
  return meta.events.some(
    (
      event
    ) =>
      event.type === type
  );
}

/* =========================================================
   REGISTER EVENT
   ========================================================= */

async function registerEvent(
  signal: {
    id: string;
    symbol: string;
    direction: Direction;
  },
  meta: SignalMeta,
  eventType: string,
  hitPrice: number
): Promise<{
  meta: SignalMeta;
  telegram: TelegramResult;
}> {
  if (
    hasEvent(
      meta,
      eventType
    )
  ) {
    return {
      meta,
      telegram: {
        ok: true,
      },
    };
  }

  const risk =
    meta.risk;

  let pnlUsd = 0;

  if (
    eventType ===
    "SL_HIT"
  ) {
    pnlUsd =
      -risk.stopLossDollars;
  } else if (
    eventType ===
    "TP1_HIT"
  ) {
    pnlUsd =
      risk.tp1Dollars;
  } else if (
    eventType ===
    "TP2_HIT"
  ) {
    pnlUsd =
      risk.tp2Dollars;
  } else if (
    eventType ===
    "TP3_HIT"
  ) {
    pnlUsd =
      risk.tp3Dollars;
  }

  const irr =
    await usdToIrr(
      risk.usdIrrRate
    );

  const pnlIrr =
    irr > 0
      ? Math.round(
          pnlUsd * irr
        )
      : null;

  const now =
    new Date();

  const event: SignalEvent =
    {
      type: eventType,
      price: round(
        hitPrice,
        3
      ),
      pnlUsd:
        round(
          pnlUsd,
          2
        ),
      pnlIrr,
      at:
        now.toISOString(),
    };

  const nextMeta: SignalMeta =
    {
      ...meta,
      events: [
        ...meta.events,
        event,
      ],
      state: {
        ...meta.state,
        tp1Hit:
          eventType ===
            "TP1_HIT" ||
          meta.state.tp1Hit,

        tp2Hit:
          eventType ===
            "TP2_HIT" ||
          meta.state.tp2Hit,

        tp3Hit:
          eventType ===
            "TP3_HIT" ||
          meta.state.tp3Hit,

        slHit:
          eventType ===
            "SL_HIT" ||
          meta.state.slHit,
      },

      lastPrice:
        hitPrice,

      lastPriceAt:
        now.toISOString(),
    };

  const terminal =
    eventType ===
      "SL_HIT" ||
    eventType ===
      "TP3_HIT";

  await prisma.tradingSignal.update(
    {
      where: {
        id: signal.id,
      },

      data: {
        status: terminal
          ? "CLOSED"
          : eventType,

        closedAt: terminal
          ? now
          : undefined,

        metadata:
          nextMeta as never,
      },
    }
  );

  const icon =
    eventType ===
    "SL_HIT"
      ? "🔴"
      : "🟢";

  const label =
    eventType ===
    "SL_HIT"
      ? "STOP LOSS"
      : eventType.replace(
          "_HIT",
          ""
        );

  const tomanText =
    pnlIrr == null
      ? "نرخ تومان در دسترس نیست"
      : `<b>${pnlIrr.toLocaleString(
          "fa-IR"
        )} تومان</b>`;

  const telegram =
    await telegramMessage(
      [
        `${icon} <b>${label}</b>`,
        "",
        `<b>${esc(
          signal.symbol
        )}</b> · ${esc(
          signal.direction
        )}`,
        `💵 قیمت برخورد: <b>${round(
          hitPrice,
          3
        )}</b>`,
        `📈 P/L: <b>${
          pnlUsd >= 0
            ? "+"
            : ""
        }$${round(
          pnlUsd,
          2
        )}</b>`,
        `💰 معادل: ${tomanText}`,
        `🆔 Signal: <code>${esc(
          signal.id
        )}</code>`,
      ].join("\n")
    );

  /*
   * TelegramDelivery اگر مدل در Prisma وجود داشته باشد،
   * وضعیت ارسال دقیقاً ثبت می‌شود.
   */
  if (
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID
  ) {
    try {
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
                ? undefined
                : telegram.error,

            sentAt:
              telegram.ok
                ? new Date()
                : undefined,
          },
        }
      );
    } catch {
      /*
       * ثبت Delivery نباید معامله را خراب کند.
       */
    }
  }

  return {
    meta: nextMeta,
    telegram,
  };
}

/* =========================================================
   MONITOR ACTIVE SIGNALS
   ========================================================= */

async function monitor(
  userId: string
): Promise<EngineEvent[]> {
  const activeSignals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,

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

        take: 100,
      }
    );

  const events: EngineEvent[] =
    [];

  for (
    const signal of activeSignals
  ) {
    try {
      const current =
        await getLatestBar(
          signal.symbol
        );

      let meta =
        getSignalMeta(
          signal.metadata
        );

      meta.lastPrice =
        current.close;

      meta.lastPriceAt =
        new Date().toISOString();

      const levels =
        meta.levels;

      /*
       * اول SL بررسی می‌شود.
       * اگر یک کندل هم SL و هم TP را لمس کرده باشد،
       * به دلیل نداشتن ترتیب داخل OHLC، رفتار محافظه‌کارانه
       * انتخاب شده و SL اولویت دارد.
       */
      if (
        !meta.state.slHit &&
        levels.sl > 0
      ) {
        const stopTouched =
          signal.direction ===
          "BUY"
            ? current.low <=
              levels.sl
            : current.high >=
              levels.sl;

        if (stopTouched) {
          const result =
            await registerEvent(
              {
                id: signal.id,
                symbol:
                  signal.symbol,
                direction:
                  signal.direction as Direction,
              },
              meta,
              "SL_HIT",
              levels.sl
            );

          events.push({
            signalId:
              signal.id,
            event: "SL_HIT",
            telegram:
              result.telegram.ok,
          });

          /*
           * معامله بسته شد.
           * هیچ TP دیگری بعد از SL ثبت نمی‌شود.
           */
          continue;
        }
      }

      /*
       * TP1
       */
      if (
        !meta.state.tp1Hit &&
        levels.tp1 > 0
      ) {
        const touched =
          signal.direction ===
          "BUY"
            ? current.high >=
              levels.tp1
            : current.low <=
              levels.tp1;

        if (touched) {
          const result =
            await registerEvent(
              {
                id: signal.id,
                symbol:
                  signal.symbol,
                direction:
                  signal.direction as Direction,
              },
              meta,
              "TP1_HIT",
              levels.tp1
            );

          meta =
            result.meta;

          events.push({
            signalId:
              signal.id,
            event: "TP1_HIT",
            telegram:
              result.telegram.ok,
          });
        }
      }

      /*
       * بعد از TP1 ممکن است همان کندل TP2 را هم لمس کرده باشد.
       */
      if (
        meta.state.tp1Hit &&
        !meta.state.tp2Hit &&
        levels.tp2 > 0
      ) {
        const touched =
          signal.direction ===
          "BUY"
            ? current.high >=
              levels.tp2
            : current.low <=
              levels.tp2;

        if (touched) {
          const result =
            await registerEvent(
              {
                id: signal.id,
                symbol:
                  signal.symbol,
                direction:
                  signal.direction as Direction,
              },
              meta,
              "TP2_HIT",
              levels.tp2
            );

          meta =
            result.meta;

          events.push({
            signalId:
              signal.id,
            event: "TP2_HIT",
            telegram:
              result.telegram.ok,
          });
        }
      }

      /*
       * بعد از TP2 ممکن است همان کندل TP3 را هم لمس کرده باشد.
       */
      if (
        meta.state.tp2Hit &&
        !meta.state.tp3Hit &&
        levels.tp3 > 0
      ) {
        const touched =
          signal.direction ===
          "BUY"
            ? current.high >=
              levels.tp3
            : current.low <=
              levels.tp3;

        if (touched) {
          const result =
            await registerEvent(
              {
                id: signal.id,
                symbol:
                  signal.symbol,
                direction:
                  signal.direction as Direction,
              },
              meta,
              "TP3_HIT",
              levels.tp3
            );

          events.push({
            signalId:
              signal.id,
            event: "TP3_HIT",
            telegram:
              result.telegram.ok,
          });
        }
      }

      /*
       * اگر هیچ event جدیدی رخ نداده،
       * فقط آخرین قیمت را ذخیره می‌کنیم.
       */
      if (
        events.every(
          (item) =>
            item.signalId !==
            signal.id
        )
      ) {
        await prisma.tradingSignal.update(
          {
            where: {
              id: signal.id,
            },

            data: {
              metadata:
                meta as never,
            },
          }
        );
      }
    } catch (error) {
      events.push({
        signalId:
          signal.id,

        error:
          error instanceof Error
            ? error.message
            : "خطای مانیتورینگ سیگنال",
      });
    }
  }

  return events;
}

/* =========================================================
   SCAN
   ========================================================= */

async function scan(
  userId: string,
  requestedTf?: string
): Promise<{
  bots: number;
  made: unknown[];
  errors: Array<{
    botId: string;
    symbol: string;
    error: string;
  }>;
}> {
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

  const made: unknown[] =
    [];

  const errors: Array<{
    botId: string;
    symbol: string;
    error: string;
  }> = [];

  /*
   * یک بار در کل اسکن:
   * اگر کاربر برای نماد موردنظر سیگنال فعال داشته باشد،
   * اصلاً سیگنال جدید ساخته نمی‌شود.
   */
  const activeSymbols =
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,

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
          symbol: true,
        },
      }
    );

  const activeSymbolSet =
    new Set(
      activeSymbols.map(
        (
          item: {
            symbol: string;
          }
        ) =>
          item.symbol
            .replace(
              /\s/g,
              ""
            )
            .toUpperCase()
      )
    );

  for (
    const bot of bots
  ) {
    if (!bot.symbol) {
      continue;
    }

    const symbol =
      String(
        bot.symbol
      );

    const normalizedSymbol =
      symbol
        .replace(
          /\s/g,
          ""
        )
        .toUpperCase();

    /*
     * قانون اصلی:
     * تا وقتی سیگنال قبلی باز است،
     * سیگنال جدید برای همان نماد ممنوع.
     */
    if (
      activeSymbolSet.has(
        normalizedSymbol
      )
    ) {
      continue;
    }

    try {
      const timeframe =
        normalizeTimeframe(
          requestedTf ??
            bot.timeframe ??
            "15min"
        );

      if (
        bot.sessionFilter &&
        !sessionAllowed(
          bot.marketType
        )
      ) {
        continue;
      }

      const newsMinutes =
        Math.max(
          0,
          num(
            bot.stopBeforeNewsMinutes,
            30
          )
        );

      if (
        bot.newsFilter &&
        (await newsBlocked(
          symbol,
          newsMinutes
        ))
      ) {
        continue;
      }

      /*
       * cooldown فقط بعد از بسته شدن معامله است.
       * در معامله فعال هرگز signal جدید ایجاد نمی‌شود.
       */
      const cooldown =
        Math.max(
          1,
          num(
            bot.cooldownMinutes,
            5
          )
        );

      const recentlyClosed =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,
              botId: bot.id,
              symbol,

              status:
                "CLOSED",

              closedAt: {
                gte: new Date(
                  Date.now() -
                    cooldown *
                      60_000
                ),
              },
            },

            select: {
              id: true,
            },

            orderBy: {
              closedAt: "desc",
            },
          }
        );

      if (
        recentlyClosed
      ) {
        continue;
      }

      const analysis =
        await analyze(
          symbol,
          timeframe
        );

      /*
       * موتور عمداً سختگیر است.
       */
      const configuredThreshold =
        clamp(
          num(
            bot.signalThreshold,
            80
          ),
          1,
          100
        );

      const minimumScore =
        Math.max(
          85,
          configuredThreshold
        );

      const minimumConfirmations =
        Math.max(
          5,
          num(
            bot.minConfirmations,
            5
          )
        );

      if (
        analysis.score <
        minimumScore
      ) {
        continue;
      }

      if (
        analysis.confirmations <
        minimumConfirmations
      ) {
        continue;
      }

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

      /*
       * بدون روند + MTF سیگنال ممنوع.
       */
      if (
        !analysis.trendOk ||
        !analysis.mtfOk
      ) {
        continue;
      }

      /*
       * بدون momentum یا MACD هم سیگنال ممنوع.
       */
      if (
        !analysis.momentumOk ||
        !analysis.macdOk
      ) {
        continue;
      }

      const risk =
        riskConfig(
          {
            lotSize:
              bot.lotSize,
            stopLoss:
              bot.stopLoss,
            analysisConfig:
              bot.analysisConfig,
            marketType:
              bot.marketType,
            symbol,
          }
        );

      const levels =
        calculateLevels(
          analysis.entry,
          analysis.direction,
          risk
        );

      const rr =
        calculateRR(
          analysis.entry,
          levels
        );

      /*
       * TP1 باید حداقل 1.5R باشد.
       */
      const stopDistance =
        Math.abs(
          analysis.entry -
            levels.sl
        );

      const tp1Distance =
        Math.abs(
          levels.tp1 -
            analysis.entry
        );

      const tp2Distance =
        Math.abs(
          levels.tp2 -
            analysis.entry
        );

      const tp3Distance =
        Math.abs(
          levels.tp3 -
            analysis.entry
        );

      const tp1RR =
        stopDistance > 0
          ? tp1Distance /
            stopDistance
          : 0;

      const tp2RR =
        stopDistance > 0
          ? tp2Distance /
            stopDistance
          : 0;

      const tp3RR =
        stopDistance > 0
          ? tp3Distance /
            stopDistance
          : 0;

      if (
        tp1RR < 1.5 ||
        tp2RR < 2.0 ||
        tp3RR < 3.0
      ) {
        continue;
      }

      /*
       * اگر جلوی TP1 حمایت/مقاومت مهم باشد،
       * معامله رد می‌شود.
       */
      if (
        !targetRoomValid(
          analysis,
          levels
        )
      ) {
        continue;
      }

      /*
       * ATR باید واقعی باشد.
       */
      if (
        analysis.atr <= 0
      ) {
        continue;
      }

      /*
       * Stop نباید نسبت به ATR خیلی بزرگ یا خیلی کوچک باشد.
       */
      if (
        isGold(symbol)
      ) {
        const slDistance =
          Math.abs(
            analysis.entry -
              levels.sl
          );

        if (
          slDistance <
            analysis.atr *
              0.35 ||
          slDistance >
            analysis.atr *
              2.5
        ) {
          continue;
        }
      }

      const meta: SignalMeta =
        {
          risk,

          levels,

          events: [],

          state: {
            tp1Hit: false,
            tp2Hit: false,
            tp3Hit: false,
            slHit: false,
          },

          lastPrice:
            analysis.entry,

          lastPriceAt:
            new Date().toISOString(),

          signalVersion:
            "SIGNAL_ENGINE_V3",

          analysisScore:
            analysis.score,

          confirmations:
            analysis.confirmations,
        };

      /*
       * برای جلوگیری از سیگنال‌های بی‌نهایت طولانی،
       * expiresAt صرفاً یک سقف زمانی است.
       * مانیتور همچنان باید TP/SL را دنبال کند.
       */
      const expirationMinutes =
        timeframe === "1min"
          ? 180
          : timeframe === "5min"
          ? 360
          : timeframe === "15min"
          ? 720
          : timeframe === "30min"
          ? 1440
          : 2880;

      const expiresAt =
        new Date(
          Date.now() +
            expirationMinutes *
              60_000
        );

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

              /*
               * RR واقعی هندسی TP3
               */
              riskReward:
                rr,

              score:
                analysis.score,

              confidence:
                analysis.score,

              status:
                "ACTIVE",

              source:
                "TWELVE_DATA_SIGNAL_ENGINE_V3",

              marketStructure:
                analysis.direction ===
                "BUY"
                  ? "Bullish structure"
                  : "Bearish structure",

              supportResistance:
                `S ${round(
                  analysis.support,
                  3
                )} / R ${round(
                  analysis.resistance,
                  3
                )}`,

              liquidity:
                analysis.liquidityOk
                  ? "Liquidity sweep confirmed"
                  : "Liquidity check passed",

              pullback:
                analysis.pullbackOk
                  ? "Pullback confirmed"
                  : "Pullback structure passed",

              candlePattern:
                analysis.candleName,

              volumeConfirmation:
                analysis.volumeOk
                  ? "Volume confirmed"
                  : "Volume acceptable",

              multiTimeframeConfirmation:
                analysis.mtfOk
                  ? "MTF aligned"
                  : "MTF checked",

              sessionConfirmation:
                "Session filter passed",

              volatilityConfirmation:
                `ATR ${round(
                  analysis.atr,
                  3
                )}`,

              newsConfirmation:
                bot.newsFilter
                  ? "News filter passed"
                  : "News filter disabled",

              confirmations:
                {
                  trend:
                    analysis.trendOk,

                  momentum:
                    analysis.momentumOk,

                  macd:
                    analysis.macdOk,

                  pullback:
                    analysis.pullbackOk,

                  liquidity:
                    analysis.liquidityOk,

                  candle:
                    analysis.candleOk,

                  volume:
                    analysis.volumeOk,

                  mtf:
                    analysis.mtfOk,
                } as never,

              reasons:
                analysis.reasons as never,

              metadata:
                meta as never,

              expiresAt,
            },
          }
        );

      /*
       * بعد از ثبت موفق در DB،
       * Telegram ارسال می‌شود.
       */
      const telegramText =
        signalTelegramText(
          {
            symbol,
            direction:
              analysis.direction,
            timeframe,
            entry:
              analysis.entry,
            score:
              analysis.score,
            confirmations:
              analysis.confirmations,
          },
          levels,
          risk,
          rr
        );

      const telegram =
        await telegramMessage(
          telegramText
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
          try {
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
          } catch {
            /*
             * ثبت delivery نباید signal را خراب کند.
             */
          }
        }
      } else {
        if (
          process.env
            .TELEGRAM_SIGNAL_CHAT_ID
        ) {
          try {
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
          } catch {
            /*
             * Telegram failure نباید معامله را حذف کند.
             */
          }
        }
      }

      made.push(
        {
          ...signal,
          telegramOk:
            telegram.ok,
          tp1RR,
          tp2RR,
          tp3RR,
        }
      );

      /*
       * این نماد در همین cycle قفل می‌شود.
       */
      activeSymbolSet.add(
        normalizedSymbol
      );
    } catch (error) {
      errors.push({
        botId:
          bot.id,

        symbol,

        error:
          error instanceof Error
            ? error.message
            : "خطای ساخت سیگنال",
      });
    }
  }

  return {
    bots:
      bots.length,

    made,

    errors,
  };
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function performance(
  signals: Array<{
    metadata: unknown;
  }>,
  from: Date
) {
  let total = 0;
  let wins = 0;
  let losses = 0;
  let pnl = 0;

  for (
    const signal of signals
  ) {
    const meta =
      getSignalMeta(
        signal.metadata
      );

    const events =
      meta.events.filter(
        (
          event
        ) =>
          new Date(
            event.at
          ).getTime() >=
          from.getTime()
      );

    let finalEvent:
      | SignalEvent
      | null = null;

    for (
      const event of events
    ) {
      if (
        event.type ===
          "TP3_HIT" ||
        event.type ===
          "SL_HIT"
      ) {
        if (
          !finalEvent ||
          new Date(
            event.at
          ).getTime() >
            new Date(
              finalEvent.at
            ).getTime()
        ) {
          finalEvent =
            event;
        }
      }
    }

    if (!finalEvent) {
      continue;
    }

    total += 1;

    if (
      finalEvent.type ===
      "TP3_HIT"
    ) {
      wins += 1;
    }

    if (
      finalEvent.type ===
      "SL_HIT"
    ) {
      losses += 1;
    }

    pnl += num(
      finalEvent.pnlUsd
    );
  }

  return {
    signals: total,
    wins,
    losses,
    winRate:
      total > 0
        ? round(
            (wins / total) *
              100,
            2
          )
        : 0,
    pnlUsd:
      round(pnl, 2),
  };
}

/* =========================================================
   ENGINE LOCK
   ========================================================= */

async function runLocked<T>(
  task: () => Promise<T>
): Promise<T> {
  if (engineLock) {
    await engineLock.catch(
      () => undefined
    );
  }

  const current =
    task();

  engineLock =
    current as Promise<unknown>;

  try {
    return await current;
  } finally {
    if (
      engineLock ===
      current
    ) {
      engineLock = null;
    }
  }
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: Request
) {
  const session =
    await getSession();

  if (
    !session?.userId
  ) {
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

  const url =
    new URL(
      request.url
    );

  const requestedInterval =
    url.searchParams.get(
      "interval"
    ) ?? undefined;

  try {
    const result =
      await runLocked(
        async () => {
          /*
           * 1. اول signalهای فعال مانیتور می‌شوند.
           */
          const monitored =
            await monitor(
              session.userId
            );

          /*
           * 2. بعد از مانیتور،
           * اگر نماد آزاد بود اسکن می‌شود.
           */
          const scanned =
            await scan(
              session.userId,
              requestedInterval
            );

          return {
            monitored,
            scanned,
          };
        }
      );

    /*
     * اطلاعات تازه دیتابیس بعد از engine
     */
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
            createdAt:
              "desc",
          },

          take: 50,
        }
      );

    const now =
      new Date();

    const day =
      new Date(now);

    day.setHours(
      0,
      0,
      0,
      0
    );

    const week =
      new Date(now);

    week.setDate(
      week.getDate() - 6
    );

    const month =
      new Date(now);

    month.setDate(
      month.getDate() - 29
    );

    const active =
      signals.filter(
        (signal) =>
          [
            "WAITING",
            "ACTIVE",
            "TP1_HIT",
            "TP2_HIT",
          ].includes(
            String(
              signal.status
            )
          )
      );

    return NextResponse.json(
      {
        ok: true,

        engine: {
          source:
            "Twelve Data",
          version:
            "SIGNAL_ENGINE_V3",

          monitored:
            result.monitored,

          scanned:
            result.scanned,

          activeCount:
            active.length,
        },

        /*
         * active جدا از history
         * تا صفحه اشتباهاً آخرین signal بسته‌شده
         * را به عنوان signal فعال نشان ندهد.
         */
        activeSignals:
          active,

        signals,

        performance: {
          daily:
            performance(
              signals,
              day
            ),

          weekly:
            performance(
              signals,
              week
            ),

          monthly:
            performance(
              signals,
              month
            ),
        },

        telegram: {
          enabled:
            Boolean(
              process.env
                .TELEGRAM_BOT_TOKEN &&
                process.env
                  .TELEGRAM_SIGNAL_CHAT_ID
            ),
        },

        marketData: {
          provider:
            "Twelve Data",

          live: true,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای موتور سیگنال",

        engine: {
          source:
            "Twelve Data",
          version:
            "SIGNAL_ENGINE_V3",
        },
      },
      {
        status: 500,
      }
    );
  }
}
