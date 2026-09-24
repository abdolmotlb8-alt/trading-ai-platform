import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   CONFIG
========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const TWELVE_DATA_URL =
  "https://api.twelvedata.com";

const NETARZ_URL =
  "https://netarz.ir/api/fx/v1/rates/USD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.1;
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const RISK_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;
const TOTAL_POTENTIAL_USD = 80;

const STOP_DISTANCE = 4;
const TP1_DISTANCE = 5;
const TP2_DISTANCE = 8;
const TP3_DISTANCE = 12;

const ENTRY_TOLERANCE = 1;

const SCORE_TO_SIGNAL = Number(
  process.env.AI_SCORE_TO_SIGNAL || "78"
);

const MIN_CONFIRMATIONS = 5;

const NEWS_BLOCK_MINUTES = Number(
  process.env.AI_NEWS_BLOCK_MINUTES || "30"
);

const NEWS_BLOCK_IMPORTANCE = Number(
  process.env.AI_NEWS_BLOCK_IMPORTANCE || "3"
);

/*
 * GET dashboard هیچ درخواست Twelve Data نمی‌زند.
 * قیمت و نمودار توسط scan/monitor داخل DB ذخیره می‌شوند.
 */
const PRICE_CACHE_MS = 120000;

/*
 * تعداد کندل‌هایی که برای نمودار به frontend داده می‌شود.
 * این داده‌ها از همان درخواست‌های تحلیل گرفته می‌شوند.
 */
const CHART_CANDLE_LIMIT = 120;

/* =========================================================
   TYPES
========================================================= */

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ChartCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type ChartData = {
  updatedAt: string;

  timeframe: string;

  candles: ChartCandle[];

  timeframes: Record<
    string,
    ChartCandle[]
  >;
};

type Direction = "BUY" | "SELL";

type TradeEvent = {
  type: string;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
};

type RunMeta = {
  kind?: string;
  symbol?: string;

  direction?: Direction;

  entry?: number;
  entryMin?: number;
  entryMax?: number;

  stopLoss?: number;

  tp1?: number;
  tp2?: number;
  tp3?: number;

  totalLot?: number;
  tp1Lot?: number;
  tp2Lot?: number;
  tp3Lot?: number;

  riskUsd?: number;
  tp1Usd?: number;
  tp2Usd?: number;
  tp3Usd?: number;
  totalPotentialUsd?: number;

  usdToToman?: number;

  riskToman?: number;
  tp1Toman?: number;
  tp2Toman?: number;
  tp3Toman?: number;
  totalPotentialToman?: number;

  session?: string;

  score?: number;
  confirmations?: number;

  timeframe?: string;

  state?: string;

  breakeven?: boolean;

  entryActivated?: boolean;

  currentPrice?: number;

  support?: number;
  resistance?: number;

  reason?: string;

  events?: TradeEvent[];

  analysis?: Record<string, unknown>;

  chart?: ChartData;

  [key: string]: unknown;
};

type MarketAnalysis = {
  direction: Direction | null;

  score: number;

  confirmations: number;

  support: number;

  resistance: number;

  atr: number;

  trend: string;

  candleBias: string;

  momentum: string;

  volumeOk: boolean;

  emaOk: boolean;

  structureOk: boolean;

  nearLevel: boolean;

  mtfOk: boolean;

  pullbackOk: boolean;

  analysis: Record<string, unknown>;
};

/* =========================================================
   MEMORY PRICE CACHE
========================================================= */

let priceCache:
  | {
      price: number;
      fetchedAt: number;
    }
  | null = null;

/* =========================================================
   HELPERS
========================================================= */

function env(name: string): string {
  return String(
    process.env[name] || ""
  ).trim();
}

function num(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

function round(
  value: number,
  digits = 2
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;

  return (
    Math.round(value * factor) /
    factor
  );
}

function money(
  value: number
): string {
  return `$${round(
    value,
    2
  ).toFixed(2)}`;
}

function priceText(
  value: number
): string {
  return round(
    value,
    2
  ).toFixed(2);
}

function tomanText(
  value: number
): string {
  return `${Math.round(
    value
  ).toLocaleString(
    "fa-IR"
  )} تومان`;
}

function sessionName(
  date = new Date()
): string {
  const hour =
    date.getUTCHours();

  if (
    hour >= 22 ||
    hour < 6
  ) {
    return "Sydney";
  }

  if (
    hour >= 6 &&
    hour < 9
  ) {
    return "Tokyo";
  }

  if (
    hour >= 7 &&
    hour < 16
  ) {
    return "London";
  }

  if (
    hour >= 13 &&
    hour < 22
  ) {
    return "New York";
  }

  return "Tokyo";
}

/* =========================================================
   CHART HELPERS
========================================================= */

/*
 * تبدیل Candle داخلی موتور به Candle قابل استفاده
 * در frontend.
 */
function toChartCandle(
  candle: Candle
): ChartCandle {
  return {
    time: String(
      candle.datetime
    ),

    open:
      round(
        candle.open,
        2
      ),

    high:
      round(
        candle.high,
        2
      ),

    low:
      round(
        candle.low,
        2
      ),

    close:
      round(
        candle.close,
        2
      ),
  };
}

/*
 * داده‌ها را برای نمودار مرتب و محدود می‌کنیم.
 */
function normalizeChartCandles(
  candles: Candle[],
  limit = CHART_CANDLE_LIMIT
): ChartCandle[] {
  return candles
    .filter(
      (candle) =>
        candle &&
        candle.open > 0 &&
        candle.high > 0 &&
        candle.low > 0 &&
        candle.close > 0
    )
    .slice(-limit)
    .map(
      toChartCandle
    );
}

/*
 * ساخت تایم‌فریم بالاتر از روی کندل‌های واقعی.
 *
 * مثال:
 * 5m -> 30m
 * 1h -> 4h
 *
 * هیچ قیمت ساختگی تولید نمی‌شود.
 * فقط OHLC کندل‌های واقعی تجمیع می‌شوند.
 */
function aggregateCandles(
  candles: Candle[],
  minutes: number,
  limit = CHART_CANDLE_LIMIT
): ChartCandle[] {
  if (
    !candles.length ||
    minutes <= 0
  ) {
    return [];
  }

  const buckets =
    new Map<
      number,
      Candle
    >();

  for (
    const candle of candles
  ) {
    const timestamp =
      new Date(
        candle.datetime
      ).getTime();

    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      continue;
    }

    const bucketSize =
      minutes *
      60 *
      1000;

    const bucket =
      Math.floor(
        timestamp /
          bucketSize
      ) *
      bucketSize;

    const existing =
      buckets.get(
        bucket
      );

    if (!existing) {
      buckets.set(
        bucket,
        {
          datetime:
            new Date(
              bucket
            ).toISOString(),

          open:
            candle.open,

          high:
            candle.high,

          low:
            candle.low,

          close:
            candle.close,

          volume:
            candle.volume,
        }
      );

      continue;
    }

    existing.high =
      Math.max(
        existing.high,
        candle.high
      );

    existing.low =
      Math.min(
        existing.low,
        candle.low
      );

    existing.close =
      candle.close;

    existing.volume +=
      candle.volume;
  }

  return Array.from(
    buckets.values()
  )
    .sort(
      (a, b) =>
        new Date(
          a.datetime
        ).getTime() -
        new Date(
          b.datetime
        ).getTime()
    )
    .slice(-limit)
    .map(
      toChartCandle
    );
}

/*
 * ساخت کامل داده نمودار از همان کندل‌هایی که
 * موتور تحلیل قبلاً دریافت کرده است.
 */
function buildChartData(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[]
): ChartData {
  const oneMinute =
    normalizeChartCandles(
      m1
    );

  const fiveMinute =
    normalizeChartCandles(
      m5
    );

  const fifteenMinute =
    normalizeChartCandles(
      m15
    );

  /*
   * 30 دقیقه از 5 دقیقه ساخته می‌شود.
   * نیازی به درخواست API جدید نیست.
   */
  const thirtyMinute =
    aggregateCandles(
      m5,
      30,
      CHART_CANDLE_LIMIT
    );

  const oneHour =
    normalizeChartCandles(
      h1
    );

  /*
   * 4 ساعت از 1 ساعت ساخته می‌شود.
   * نیازی به درخواست API جدید نیست.
   */
  const fourHour =
    aggregateCandles(
      h1,
      240,
      CHART_CANDLE_LIMIT
    );

  return {
    updatedAt:
      new Date().toISOString(),

    timeframe:
      "1m",

    candles:
      oneMinute,

    timeframes: {
      "1m":
        oneMinute,

      "5m":
        fiveMinute,

      "15m":
        fifteenMinute,

      "30m":
        thirtyMinute,

      "1h":
        oneHour,

      "4h":
        fourHour,
    },
  };
}

/* =========================================================
   TELEGRAM
========================================================= */

async function sendTelegram(
  text: string
) {
  const token =
    env("TELEGRAM_BOT_TOKEN");

  const chatId =
    env(
      "TELEGRAM_SIGNAL_CHAT_ID"
    );

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN تنظیم نشده است."
    );
  }

  if (!chatId) {
    throw new Error(
      "TELEGRAM_SIGNAL_CHAT_ID تنظیم نشده است."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview:
            true,
        }),

        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data?.ok !== true
  ) {
    throw new Error(
      `Telegram error: ${JSON.stringify(
        data
      )}`
    );
  }

  return data;
}

/* =========================================================
   TWELVE DATA
========================================================= */

function getTwelveDataKey(): string {
  const key =
    env(
      "TWELVE_DATA_API_KEY"
    );

  if (!key) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است."
    );
  }

  return key;
}

async function twelveData(
  endpoint: string,
  params: Record<string, string>
) {
  const url =
    new URL(
      `${TWELVE_DATA_URL}/${endpoint}`
    );

  url.searchParams.set(
    "apikey",
    getTwelveDataKey()
  );

  for (
    const [key, value] of Object.entries(
      params
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      `Twelve Data HTTP ${response.status}: ${JSON.stringify(
        data
      )}`
    );
  }

  if (
    data?.status === "error" ||
    data?.code
  ) {
    throw new Error(
      `Twelve Data: ${
        data?.message ||
        JSON.stringify(data)
      }`
    );
  }

  return data;
}

async function getCandles(
  interval: string,
  outputsize = 160
): Promise<Candle[]> {
  const data =
    await twelveData(
      "time_series",
      {
        symbol: SYMBOL,
        interval,
        outputsize:
          String(outputsize),
      }
    );

  if (
    !Array.isArray(
      data?.values
    )
  ) {
    throw new Error(
      `کندل ${interval} دریافت نشد.`
    );
  }

  return data.values
    .map(
      (item: any) => ({
        datetime:
          String(
            item.datetime
          ),

        open:
          num(item.open),

        high:
          num(item.high),

        low:
          num(item.low),

        close:
          num(item.close),

        volume:
          num(item.volume),
      })
    )
    .filter(
      (c: Candle) =>
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0
    )
    .reverse();
}

async function getLivePrice(): Promise<number> {
  const data =
    await twelveData(
      "price",
      {
        symbol: SYMBOL,
      }
    );

  const price =
    num(data?.price);

  if (price <= 0) {
    throw new Error(
      "قیمت XAU/USD دریافت نشد."
    );
  }

  return price;
}

async function getCachedPrice(): Promise<number> {
  const now =
    Date.now();

  if (
    priceCache &&
    now -
      priceCache.fetchedAt <
      PRICE_CACHE_MS
  ) {
    return priceCache.price;
  }

  const price =
    await getLivePrice();

  priceCache = {
    price,
    fetchedAt: now,
  };

  return price;
}

/* =========================================================
   INDICATORS
========================================================= */

function sma(
  values: number[],
  period: number
): number {
  if (!values.length) {
    return 0;
  }

  const slice =
    values.length >= period
      ? values.slice(-period)
      : values;

  return (
    slice.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
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

  const multiplier =
    2 / (period + 1);

  let result =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result =
      (values[i] -
        result) *
        multiplier +
      result;
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
    const change =
      values[i] -
      values[i - 1];

    if (change >= 0) {
      gain += change;
    } else {
      loss += Math.abs(
        change
      );
    }
  }

  let avgGain =
    gain / period;

  let avgLoss =
    loss / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    const currentGain =
      Math.max(
        change,
        0
      );

    const currentLoss =
      Math.max(
        -change,
        0
      );

    avgGain =
      (avgGain *
        (period - 1) +
        currentGain) /
      period;

    avgLoss =
      (avgLoss *
        (period - 1) +
        currentLoss) /
      period;
  }

  if (avgLoss === 0) {
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
  data: Candle[],
  period = 14
): number {
  if (
    data.length < 2
  ) {
    return 0;
  }

  const trs: number[] =
    [];

  for (
    let i = 1;
    i < data.length;
    i++
  ) {
    const current =
      data[i];

    const previous =
      data[i - 1];

    const trueRange =
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
      );

    trs.push(
      trueRange
    );
  }

  return sma(
    trs,
    period
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

  return {
    line,

    bullish:
      line > 0,

    bearish:
      line < 0,
  };
}

function candleBias(
  data: Candle[]
): string {
  if (
    data.length < 3
  ) {
    return "NEUTRAL";
  }

  const current =
    data[data.length - 1];

  const previous =
    data[data.length - 2];

  const body =
    current.close -
    current.open;

  const previousBody =
    previous.close -
    previous.open;

  if (
    body > 0 &&
    previousBody > 0
  ) {
    return "BULLISH";
  }

  if (
    body < 0 &&
    previousBody < 0
  ) {
    return "BEARISH";
  }

  if (
    body > 0 &&
    current.close >
      previous.high
  ) {
    return "BULLISH_BREAK";
  }

  if (
    body < 0 &&
    current.close <
      previous.low
  ) {
    return "BEARISH_BREAK";
  }

  return "NEUTRAL";
}

function getLevels(
  data: Candle[]
) {
  const recent =
    data.slice(-60);

  if (!recent.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  return {
    support:
      Math.min(
        ...recent.map(
          (c) => c.low
        )
      ),

    resistance:
      Math.max(
        ...recent.map(
          (c) => c.high
        )
      ),
  };
}

function trend(
  data: Candle[]
) {
  const closes =
    data.map(
      (c) => c.close
    );

  const price =
    closes.at(-1) || 0;

  const ema20 =
    ema(
      closes,
      20
    );

  const ema50 =
    ema(
      closes,
      50
    );

  const currentRsi =
    rsi(closes);

  const currentMacd =
    macd(closes);

  let direction:
    | Direction
    | null = null;

  if (
    price > ema20 &&
    ema20 > ema50 &&
    currentRsi >= 52 &&
    currentMacd.bullish
  ) {
    direction = "BUY";
  } else if (
    price < ema20 &&
    ema20 < ema50 &&
    currentRsi <= 48 &&
    currentMacd.bearish
  ) {
    direction = "SELL";
  } else if (
    price > ema20 &&
    currentRsi >= 50
  ) {
    direction = "BUY";
  } else if (
    price < ema20 &&
    currentRsi <= 50
  ) {
    direction = "SELL";
  }

  return {
    direction,
    price,
    ema20,
    ema50,
    rsi: currentRsi,
    macd:
      currentMacd.line,
  };
}

/* =========================================================
   MARKET ANALYSIS
========================================================= */

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[],
  currentPrice: number
): MarketAnalysis {
  const t1 =
    trend(m1);

  const t5 =
    trend(m5);

  const t15 =
    trend(m15);

  const t1h =
    trend(h1);

  const buyCount =
    [
      t5.direction,
      t15.direction,
      t1h.direction,
    ].filter(
      (value) =>
        value === "BUY"
    ).length;

  const sellCount =
    [
      t5.direction,
      t15.direction,
      t1h.direction,
    ].filter(
      (value) =>
        value === "SELL"
    ).length;

  let direction:
    | Direction
    | null = null;

  if (
    buyCount >= 2
  ) {
    direction = "BUY";
  }

  if (
    sellCount >= 2
  ) {
    direction = "SELL";
  }

  const levels =
    getLevels(m5);

  const support =
    levels.support;

  const resistance =
    levels.resistance;

  const atrValue =
    atr(m5);

  const bias =
    candleBias(m5);

  const nearDistance =
    Math.max(
      atrValue * 1.75,
      4
    );

  const nearSupport =
    support > 0 &&
    currentPrice >=
      support &&
    currentPrice -
      support <=
      nearDistance;

  const nearResistance =
    resistance > 0 &&
    currentPrice <=
      resistance &&
    resistance -
      currentPrice <=
      nearDistance;

  const nearLevel =
    direction === "BUY"
      ? nearSupport
      : direction === "SELL"
        ? nearResistance
        : false;

  const volumes =
    m5
      .slice(-30)
      .map(
        (c) =>
          c.volume
      );

  const averageVolume =
    sma(
      volumes,
      20
    );

  const lastVolume =
    m5.at(-1)?.volume ||
    0;

  const volumeOk =
    averageVolume > 0 &&
    lastVolume >=
      averageVolume *
        0.9;

  const momentumOk =
    direction === "BUY"
      ? t5.rsi >= 52
      : direction === "SELL"
        ? t5.rsi <= 48
        : false;

  const emaOk =
    direction === "BUY"
      ? currentPrice >
        t5.ema20
      : direction === "SELL"
        ? currentPrice <
          t5.ema20
        : false;

  const candleOk =
    direction === "BUY"
      ? bias ===
          "BULLISH" ||
        bias ===
          "BULLISH_BREAK"
      : direction === "SELL"
        ? bias ===
            "BEARISH" ||
          bias ===
            "BEARISH_BREAK"
        : false;

  const mtfOk =
    direction === "BUY"
      ? buyCount >= 2
      : direction === "SELL"
        ? sellCount >= 2
        : false;

  const m1Ok =
    t1.direction ===
    direction;

  const strongMtf =
    t15.direction ===
      direction &&
    t1h.direction ===
      direction;

  const structureOk =
    support > 0 &&
    resistance > 0 &&
    resistance >
      support;

  const pullbackOk =
    direction === "BUY"
      ? currentPrice >=
          t5.ema20 ||
        nearSupport
      : direction === "SELL"
        ? currentPrice <=
            t5.ema20 ||
          nearResistance
        : false;

  /*
   * حداکثر واقعی این سیستم 95 است.
   */
  let score = 0;

  if (direction) {
    if (mtfOk) {
      score += 25;
    }

    if (m1Ok) {
      score += 10;
    }

    if (strongMtf) {
      score += 10;
    }

    if (nearLevel) {
      score += 10;
    }

    if (candleOk) {
      score += 10;
    }

    if (volumeOk) {
      score += 5;
    }

    if (momentumOk) {
      score += 10;
    }

    if (emaOk) {
      score += 10;
    }

    if (structureOk) {
      score += 5;
    }
  }

  const finalScore =
    Math.min(
      score,
      95
    );

  const confirmations =
    [
      mtfOk,
      m1Ok,
      strongMtf,
      nearLevel,
      candleOk,
      volumeOk,
      momentumOk,
      emaOk,
      structureOk,
      pullbackOk,
    ].filter(Boolean)
      .length;

  return {
    direction,

    score:
      Math.round(
        finalScore
      ),

    confirmations,

    support:
      round(
        support,
        2
      ),

    resistance:
      round(
        resistance,
        2
      ),

    atr:
      round(
        atrValue,
        2
      ),

    trend:
      direction ||
      "NEUTRAL",

    candleBias:
      bias,

    momentum:
      direction ===
      "BUY"
        ? "BULLISH"
        : direction ===
            "SELL"
          ? "BEARISH"
          : "NEUTRAL",

    volumeOk,

    emaOk,

    structureOk,

    nearLevel,

    mtfOk,

    pullbackOk,

    analysis: {
      currentPrice:
        round(
          currentPrice,
          2
        ),

      m1: {
        direction:
          t1.direction,

        rsi:
          round(
            t1.rsi,
            2
          ),

        ema20:
          round(
            t1.ema20,
            2
          ),

        ema50:
          round(
            t1.ema50,
            2
          ),
      },

      m5: {
        direction:
          t5.direction,

        rsi:
          round(
            t5.rsi,
            2
          ),

        ema20:
          round(
            t5.ema20,
            2
          ),

        ema50:
          round(
            t5.ema50,
            2
          ),

        macd:
          round(
            t5.macd,
            4
          ),
      },

      m15: {
        direction:
          t15.direction,

        rsi:
          round(
            t15.rsi,
            2
          ),

        ema20:
          round(
            t15.ema20,
            2
          ),

        ema50:
          round(
            t15.ema50,
            2
          ),
      },

      h1: {
        direction:
          t1h.direction,

        rsi:
          round(
            t1h.rsi,
            2
          ),

        ema20:
          round(
            t1h.ema20,
            2
          ),

        ema50:
          round(
            t1h.ema50,
            2
          ),
      },

      support:
        round(
          support,
          2
        ),

      resistance:
        round(
          resistance,
          2
        ),

      atr:
        round(
          atrValue,
          2
        ),
    },
  };
}

/* =========================================================
   NETARZ
========================================================= */

async function getUsdToTomanRate(): Promise<number> {
  const key =
    env(
      "NETARZ_API_KEY"
    );

  if (!key) {
    throw new Error(
      "NETARZ_API_KEY تنظیم نشده است."
    );
  }

  const response =
    await fetch(
      NETARZ_URL,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${key}`,

          Accept:
            "application/json",
        },

        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      `NetArz HTTP ${response.status}`
    );
  }

  const rows =
    Array.isArray(
      data?.data
    )
      ? data.data
      : [];

  const usd =
    rows.find(
      (row: any) =>
        String(
          row?.code || ""
        ).toUpperCase() ===
        "USD"
    );

  const rate =
    num(
      usd?.mid ??
        data?.meta?.usd_irt ??
        data?.usd_irt
    );

  if (rate <= 0) {
    throw new Error(
      "نرخ USD/IRT از NetArz معتبر نیست."
    );
  }

  return rate;
}

/* =========================================================
   NEWS BLOCK
========================================================= */

async function checkNewsBlock() {
  try {
    const now =
      new Date();

    const from =
      new Date(
        now.getTime() -
          NEWS_BLOCK_MINUTES *
            60 *
            1000
      );

    const to =
      new Date(
        now.getTime() +
          NEWS_BLOCK_MINUTES *
            60 *
            1000
      );

    const events =
      await prisma.economicEvent.findMany(
        {
          where: {
            eventTime: {
              gte: from,
              lte: to,
            },
          },

          orderBy: {
            eventTime:
              "asc",
          },
        }
      );

    const important =
      events.filter(
        (event: any) =>
          num(
            event?.importance
          ) >=
          NEWS_BLOCK_IMPORTANCE
      );

    return {
      blocked:
        important.length >
        0,

      events:
        important,
    };
  } catch (error) {
    console.error(
      "News check failed:",
      error
    );

    return {
      blocked: false,
      events: [],
    };
  }
}

/* =========================================================
   TELEGRAM SIGNAL
========================================================= */

function signalMessage(
  meta: RunMeta
): string {
  const direction =
    meta.direction ===
    "BUY"
      ? "🟢 BUY"
      : "🔴 SELL";

  return [
    "━━━━━━━━━━━━━━━━━━",
    "🤖 <b>AI GOLD SIGNAL</b>",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `🪙 نماد: <b>${DISPLAY_SYMBOL}</b>`,
    `📊 جهت: <b>${direction}</b>`,
    `🌍 سشن: <b>${
      meta.session || "-"
    }</b>`,
    `⏱ تایم‌فریم: <b>${
      meta.timeframe || "MTF"
    }</b>`,
    "",
    `🎯 Entry: <b>${priceText(
      num(meta.entry)
    )}</b>`,
    `📍 محدوده ورود: <b>${priceText(
      num(meta.entryMin)
    )} تا ${priceText(
      num(meta.entryMax)
    )}</b>`,
    "",
    `🛑 Stop Loss: <b>${priceText(
      num(meta.stopLoss)
    )}</b>`,
    `🥇 TP1: <b>${priceText(
      num(meta.tp1)
    )}</b>`,
    `🥈 TP2: <b>${priceText(
      num(meta.tp2)
    )}</b>`,
    `🥉 TP3: <b>${priceText(
      num(meta.tp3)
    )}</b>`,
    "",
    `📦 حجم: <b>${num(
      meta.totalLot
    ).toFixed(2)} lot</b>`,
    `• TP1: ${num(
      meta.tp1Lot
    ).toFixed(2)} lot`,
    `• TP2: ${num(
      meta.tp2Lot
    ).toFixed(2)} lot`,
    `• TP3: ${num(
      meta.tp3Lot
    ).toFixed(2)} lot`,
    "",
    `💰 ریسک: <b>-${money(
      num(meta.riskUsd)
    )}</b>`,
    `🥇 TP1: <b>+${money(
      num(meta.tp1Usd)
    )}</b>`,
    `🥈 TP2: <b>+${money(
      num(meta.tp2Usd)
    )}</b>`,
    `🥉 TP3: <b>+${money(
      num(meta.tp3Usd)
    )}</b>`,
    `💎 مجموع: <b>+${money(
      num(
        meta.totalPotentialUsd
      )
    )}</b>`,
    "",
    `📈 Score: <b>${
      num(meta.score)
    }/95</b>`,
    `✅ تأییدیه‌ها: <b>${
      num(
        meta.confirmations
      )
    }</b>`,
    "",
    "⚠️ این تحلیل توسط موتور تحلیل AI تولید شده و تضمین سود نیست.",
    "⚠️ اجرای معامله توسط کاربر و بروکر انجام می‌شود.",
    "",
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

/* =========================================================
   ACTIVE RUN
========================================================= */

async function getActiveRun() {
  return prisma.analysisRun.findFirst(
    {
      where: {
        symbol:
          DISPLAY_SYMBOL,

        status: {
          in: [
            "AI_PENDING",
            "AI_TP1",
            "AI_TP2",
          ],
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    }
  );
}

/* =========================================================
   NO TRADE
========================================================= */

async function createNoTrade(
  reason: string,
  price: number,
  analysis?: MarketAnalysis,
  chart?: ChartData
) {
  return prisma.analysisRun.create(
    {
      data: {
        symbol:
          DISPLAY_SYMBOL,

        timeframe:
          "MTF",

        status:
          "AI_NO_TRADE",

        signalGenerated:
          false,

        finishedAt:
          new Date(),

        metadata: {
          kind:
            "AI_MARKET",

          symbol:
            DISPLAY_SYMBOL,

          currentPrice:
            round(
              price,
              2
            ),

          state:
            "NO_TRADE",

          reason,

          score:
            analysis?.score ||
            0,

          confirmations:
            analysis?.confirmations ||
            0,

          support:
            analysis?.support ||
            0,

          resistance:
            analysis?.resistance ||
            0,

          analysis:
            analysis?.analysis ||
            {},

          chart:
            chart || undefined,
        } as any,
      },
    }
  );
}

/* =========================================================
   CREATE SIGNAL
========================================================= */

async function scanMarket() {
  const existing =
    await getActiveRun();

  if (existing) {
    return {
      action:
        "ACTIVE_TRADE",

      runId:
        existing.id,
    };
  }

  let currentPrice = 0;

  try {
    currentPrice =
      await getCachedPrice();
  } catch (error) {
    console.error(
      "Price error:",
      error
    );

    return {
      action:
        "ERROR",

      reason:
        "PRICE_UNAVAILABLE",
    };
  }

  const news =
    await checkNewsBlock();

  /*
   * حتی هنگام News Block هم برای نمودار
   * داده‌ای نداریم، چون هنوز کندل‌ها گرفته نشده‌اند.
   */
  if (news.blocked) {
    await createNoTrade(
      "HIGH_IMPACT_NEWS",
      currentPrice
    );

    return {
      action:
        "NO_TRADE",

      reason:
        "HIGH_IMPACT_NEWS",

      currentPrice,
    };
  }

  const [
    m1,
    m5,
    m15,
    h1,
  ] = await Promise.all([
    getCandles(
      "1min",
      120
    ),

    getCandles(
      "5min",
      160
    ),

    getCandles(
      "15min",
      160
    ),

    getCandles(
      "1h",
      160
    ),
  ]);

  /*
   * نمودار از همان داده‌هایی ساخته می‌شود که
   * موتور تحلیل همین الان دریافت کرده است.
   */
  const chart =
    buildChartData(
      m1,
      m5,
      m15,
      h1
    );

  const analysis =
    analyzeMarket(
      m1,
      m5,
      m15,
      h1,
      currentPrice
    );

  if (
    !analysis.direction
  ) {
    await createNoTrade(
      "NO_DIRECTION",
      currentPrice,
      analysis,
      chart
    );

    return {
      action:
        "NO_TRADE",

      reason:
        "NO_DIRECTION",

      score:
        analysis.score,

      currentPrice,
    };
  }

  if (
    analysis.score <
    SCORE_TO_SIGNAL
  ) {
    await createNoTrade(
      "SCORE_BELOW_THRESHOLD",
      currentPrice,
      analysis,
      chart
    );

    return {
      action:
        "NO_TRADE",

      reason:
        "SCORE_BELOW_THRESHOLD",

      score:
        analysis.score,

      threshold:
        SCORE_TO_SIGNAL,

      currentPrice,
    };
  }

  if (
    analysis.confirmations <
    MIN_CONFIRMATIONS
  ) {
    await createNoTrade(
      "NOT_ENOUGH_CONFIRMATIONS",
      currentPrice,
      analysis,
      chart
    );

    return {
      action:
        "NO_TRADE",

      reason:
        "NOT_ENOUGH_CONFIRMATIONS",

      confirmations:
        analysis.confirmations,

      currentPrice,
    };
  }

  const direction =
    analysis.direction;

  const entry =
    round(
      currentPrice,
      2
    );

  const stopLoss =
    direction === "BUY"
      ? round(
          entry -
            STOP_DISTANCE,
          2
        )
      : round(
          entry +
            STOP_DISTANCE,
          2
        );

  const tp1 =
    direction === "BUY"
      ? round(
          entry +
            TP1_DISTANCE,
          2
        )
      : round(
          entry -
            TP1_DISTANCE,
          2
        );

  const tp2 =
    direction === "BUY"
      ? round(
          entry +
            TP2_DISTANCE,
          2
        )
      : round(
          entry -
            TP2_DISTANCE,
          2
        );

  const tp3 =
    direction === "BUY"
      ? round(
          entry +
            TP3_DISTANCE,
          2
        )
      : round(
          entry -
            TP3_DISTANCE,
          2
        );

  /*
   * بررسی فضای کافی تا TP3.
   */
  const roomToTarget =
    direction === "BUY"
      ? analysis.resistance -
        entry
      : entry -
        analysis.support;

  const requiredRoom =
    TP3_DISTANCE +
    Math.max(
      1,
      analysis.atr * 0.25
    );

  if (
    roomToTarget <
    requiredRoom
  ) {
    await createNoTrade(
      "NOT_ENOUGH_ROOM_TO_TP3",
      currentPrice,
      analysis,
      chart
    );

    return {
      action:
        "NO_TRADE",

      reason:
        "NOT_ENOUGH_ROOM_TO_TP3",

      roomToTarget:
        round(
          roomToTarget,
          2
        ),

      currentPrice,
    };
  }

  const fx =
    await getUsdToTomanRate();

  const meta: RunMeta = {
    kind:
      "AI_SIGNAL",

    symbol:
      DISPLAY_SYMBOL,

    direction,

    entry,

    entryMin:
      round(
        entry -
          ENTRY_TOLERANCE,
        2
      ),

    entryMax:
      round(
        entry +
          ENTRY_TOLERANCE,
        2
      ),

    stopLoss,

    tp1,
    tp2,
    tp3,

    totalLot:
      TOTAL_LOT,

    tp1Lot:
      TP1_LOT,

    tp2Lot:
      TP2_LOT,

    tp3Lot:
      TP3_LOT,

    riskUsd:
      RISK_USD,

    tp1Usd:
      TP1_USD,

    tp2Usd:
      TP2_USD,

    tp3Usd:
      TP3_USD,

    totalPotentialUsd:
      TOTAL_POTENTIAL_USD,

    usdToToman:
      fx,

    riskToman:
      RISK_USD * fx,

    tp1Toman:
      TP1_USD * fx,

    tp2Toman:
      TP2_USD * fx,

    tp3Toman:
      TP3_USD * fx,

    totalPotentialToman:
      TOTAL_POTENTIAL_USD *
      fx,

    session:
      sessionName(),

    score:
      analysis.score,

    confirmations:
      analysis.confirmations,

    timeframe:
      "M1 / M5 / M15 / H1",

    state:
      "AI_PENDING",

    breakeven:
      false,

    entryActivated:
      true,

    currentPrice:
      entry,

    support:
      analysis.support,

    resistance:
      analysis.resistance,

    events: [],

    analysis:
      analysis.analysis,

    chart,
  };

  const run =
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "MTF",

          status:
            "AI_PENDING",

          signalGenerated:
            true,

          startedAt:
            new Date(),

          metadata:
            meta as any,
        },
      }
    );

  try {
    await sendTelegram(
      signalMessage(
        meta
      )
    );
  } catch (error) {
    console.error(
      "Telegram signal error:",
      error
    );
  }

  return {
    action:
      "SIGNAL_CREATED",

    runId:
      run.id,

    signal:
      meta,
  };
}

/* =========================================================
   TRADE EVENTS
========================================================= */

function getEventPnl(
  type: string
) {
  if (
    type === "TP1"
  ) {
    return {
      lot:
        TP1_LOT,

      pnl:
        TP1_USD,
    };
  }

  if (
    type === "TP2"
  ) {
    return {
      lot:
        TP2_LOT,

      pnl:
        TP2_USD,
    };
  }

  if (
    type === "TP3"
  ) {
    return {
      lot:
        TP3_LOT,

      pnl:
        TP3_USD,
    };
  }

  if (
    type === "BE"
  ) {
    return {
      lot:
        TP2_LOT +
        TP3_LOT,

      pnl: 0,
    };
  }

  return {
    lot:
      TOTAL_LOT,

    pnl:
      -RISK_USD,
  };
}

async function registerEvent(
  run: any,
  type: string,
  price: number
) {
  const meta =
    (run.metadata ||
      {}) as RunMeta;

  const fx =
    await getUsdToTomanRate();

  const eventPnl =
    getEventPnl(
      type
    );

  const pnlToman =
    eventPnl.pnl * fx;

  const events =
    Array.isArray(
      meta.events
    )
      ? [...meta.events]
      : [];

  events.push({
    type,

    at:
      new Date().toISOString(),

    price:
      round(
        price,
        2
      ),

    lotClosed:
      eventPnl.lot,

    pnlUsd:
      round(
        eventPnl.pnl,
        2
      ),

    pnlToman:
      round(
        pnlToman,
        0
      ),

    usdToToman:
      round(
        fx,
        0
      ),
  });

  let status =
    "AI_PENDING";

  let state =
    meta.state ||
    "AI_PENDING";

  let breakeven =
    Boolean(
      meta.breakeven
    );

  if (
    type === "TP1"
  ) {
    status =
      "AI_TP1";

    state =
      "AI_TP1";
  }

  if (
    type === "TP2"
  ) {
    status =
      "AI_TP2";

    state =
      "AI_TP2";
  }

  if (
    type === "TP3"
  ) {
    status =
      "AI_TP3";

    state =
      "AI_TP3";
  }

  if (
    type === "BE"
  ) {
    status =
      "AI_BE";

    state =
      "AI_BE";

    breakeven =
      true;
  }

  if (
    type === "SL"
  ) {
    status =
      "AI_SL";

    state =
      "AI_SL";
  }

  const updatedMeta: RunMeta = {
    ...meta,

    state,

    breakeven,

    currentPrice:
      round(
        price,
        2
      ),

    usdToToman:
      fx,

    events,
  };

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        status,

        metadata:
          updatedMeta as any,

        finishedAt:
          type === "TP3" ||
          type === "SL" ||
          type === "BE"
            ? new Date()
            : undefined,
      },
    }
  );

  let message = "";

  if (
    type === "TP1"
  ) {
    message = [
      "━━━━━━━━━━━━━━━━━━",
      "🥇 <b>TP1 HIT — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 سود: <b>+${money(
        TP1_USD
      )}</b>`,
      `🇮🇷 تومان: <b>+${tomanText(
        pnlToman
      )}</b>`,
      "",
      "📦 بسته‌شده: <b>0.04 lot</b>",
      "🛡 حد ضرر باقی‌مانده به Entry منتقل شود.",
      "📌 حجم باقی‌مانده: <b>0.06 lot</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (
    type === "TP2"
  ) {
    message = [
      "━━━━━━━━━━━━━━━━━━",
      "🥈 <b>TP2 HIT — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 سود: <b>+${money(
        TP2_USD
      )}</b>`,
      `🇮🇷 تومان: <b>+${tomanText(
        pnlToman
      )}</b>`,
      "",
      "📦 بسته‌شده: <b>0.03 lot</b>",
      "📌 حجم باقی‌مانده: <b>0.03 lot</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (
    type === "TP3"
  ) {
    message = [
      "━━━━━━━━━━━━━━━━━━",
      "🥉 <b>TP3 HIT — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 سود TP3: <b>+${money(
        TP3_USD
      )}</b>`,
      `🇮🇷 تومان: <b>+${tomanText(
        pnlToman
      )}</b>`,
      "",
      "📦 بسته‌شده: <b>0.03 lot</b>",
      `💎 مجموع سود برنامه: <b>+${money(
        TOTAL_POTENTIAL_USD
      )}</b>`,
      "",
      "✅ معامله کامل شد.",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (
    type === "BE"
  ) {
    message = [
      "━━━━━━━━━━━━━━━━━━",
      "🛡 <b>BREAK EVEN — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      "📌 قیمت به Entry برگشت.",
      "🟡 بخش باقی‌مانده در Break Even بسته شد.",
      "💵 سود/زیان این بخش: <b>$0</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (
    type === "SL"
  ) {
    message = [
      "━━━━━━━━━━━━━━━━━━",
      "🛑 <b>STOP LOSS — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 زیان: <b>-${money(
        RISK_USD
      )}</b>`,
      `🇮🇷 تومان: <b>-${tomanText(
        Math.abs(
          pnlToman
        )
      )}</b>`,
      "",
      "⚠️ معامله بسته شد.",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (message) {
    try {
      await sendTelegram(
        message
      );
    } catch (error) {
      console.error(
        "Telegram event error:",
        error
      );
    }
  }
}

/* =========================================================
   MONITOR
========================================================= */

async function monitorRun(
  run: any
) {
  const meta =
    (run.metadata ||
      {}) as RunMeta;

  if (
    !meta.direction ||
    !meta.entry
  ) {
    return {
      action:
        "INVALID_RUN",
    };
  }

  const price =
    await getCachedPrice();

  const direction =
    meta.direction;

  const entry =
    num(meta.entry);

  const entryMin =
    num(
      meta.entryMin ??
        entry -
          ENTRY_TOLERANCE
    );

  const entryMax =
    num(
      meta.entryMax ??
        entry +
          ENTRY_TOLERANCE
    );

  let activated =
    Boolean(
      meta.entryActivated
    );

  if (!activated) {
    const inside =
      price >=
        entryMin &&
      price <=
        entryMax;

    if (!inside) {
      await prisma.analysisRun.update(
        {
          where: {
            id: run.id,
          },

          data: {
            metadata: {
              ...meta,

              currentPrice:
                round(
                  price,
                  2
                ),
            } as any,
          },
        }
      );

      return {
        action:
          "WAITING_ENTRY",

        currentPrice:
          price,
      };
    }

    activated =
      true;
  }

  const stopLoss =
    num(
      meta.stopLoss
    );

  const tp1 =
    num(meta.tp1);

  const tp2 =
    num(meta.tp2);

  const tp3 =
    num(meta.tp3);

  const state =
    String(
      meta.state ||
        run.status
    );

  /*
   * SL
   */
  if (
    direction === "BUY" &&
    price <= stopLoss
  ) {
    await registerEvent(
      run,
      "SL",
      price
    );

    return {
      action:
        "SL",

      price,
    };
  }

  if (
    direction === "SELL" &&
    price >= stopLoss
  ) {
    await registerEvent(
      run,
      "SL",
      price
    );

    return {
      action:
        "SL",

      price,
    };
  }

  /*
   * TP1
   */
  if (
    state ===
      "AI_PENDING" &&
    (
      direction === "BUY"
        ? price >= tp1
        : price <= tp1
    )
  ) {
    await registerEvent(
      run,
      "TP1",
      price
    );

    return {
      action:
        "TP1",

      price,
    };
  }

  /*
   * BE after TP1
   */
  if (
    state ===
      "AI_TP1" &&
    (
      direction === "BUY"
        ? price <= entry
        : price >= entry
    )
  ) {
    await registerEvent(
      run,
      "BE",
      price
    );

    return {
      action:
        "BE",

      price,
    };
  }

  /*
   * TP2
   */
  if (
    (
      state ===
        "AI_TP1" ||
      state ===
        "AI_BE"
    ) &&
    (
      direction === "BUY"
        ? price >= tp2
        : price <= tp2
    )
  ) {
    await registerEvent(
      run,
      "TP2",
      price
    );

    return {
      action:
        "TP2",

      price,
    };
  }

  /*
   * BE after TP2
   */
  if (
    state ===
      "AI_TP2" &&
    (
      direction === "BUY"
        ? price <= entry
        : price >= entry
    )
  ) {
    await registerEvent(
      run,
      "BE",
      price
    );

    return {
      action:
        "BE",

      price,
    };
  }

  /*
   * TP3
   */
  if (
    (
      state ===
        "AI_TP2" ||
      state ===
        "AI_BE"
    ) &&
    (
      direction === "BUY"
        ? price >= tp3
        : price <= tp3
    )
  ) {
    await registerEvent(
      run,
      "TP3",
      price
    );

    return {
      action:
        "TP3",

      price,
    };
  }

  /*
   * قیمت جاری را در DB ذخیره می‌کنیم.
   * chart قبلی نیز حفظ می‌شود.
   */
  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        metadata: {
          ...meta,

          currentPrice:
            round(
              price,
              2
            ),

          entryActivated:
            activated,
        } as any,
      },
    }
  );

  return {
    action:
      "MONITORING",

    currentPrice:
      price,
  };
}

/* =========================================================
   PERFORMANCE
========================================================= */

async function getPerformance() {
  const now =
    new Date();

  const dayStart =
    new Date(
      now.getTime() -
        24 *
          60 *
          60 *
          1000
    );

  const weekStart =
    new Date(
      now.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000
    );

  const monthStart =
    new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000
    );

  const rows =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,

          createdAt: {
            gte:
              monthStart,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 500,
      }
    );

  function calculate(
    start: Date
  ) {
    let pnl = 0;
    let trades = 0;
    let wins = 0;
    let losses = 0;

    for (
      const row of rows
    ) {
      if (
        row.createdAt <
        start
      ) {
        continue;
      }

      const meta =
        (row.metadata ||
          {}) as RunMeta;

      const events =
        Array.isArray(
          meta.events
        )
          ? meta.events
          : [];

      if (!events.length) {
        continue;
      }

      trades++;

      let tradePnl = 0;

      for (
        const event of events
      ) {
        tradePnl +=
          num(
            event.pnlUsd
          );
      }

      pnl +=
        tradePnl;

      if (
        tradePnl > 0
      ) {
        wins++;
      }

      if (
        tradePnl < 0
      ) {
        losses++;
      }
    }

    return {
      pnl:
        round(
          pnl,
          2
        ),

      trades,

      wins,

      losses,
    };
  }

  return {
    day:
      calculate(
        dayStart
      ),

    week:
      calculate(
        weekStart
      ),

    month:
      calculate(
        monthStart
      ),
  };
}

/* =========================================================
   DASHBOARD
========================================================= */

async function getDashboard() {
  const active =
    await getActiveRun();

  const performance =
    await getPerformance();

  const usdToToman =
    await getUsdToTomanRate().catch(
      () => 0
    );

  /*
   * مهم:
   * اینجا Twelve Data برای dashboard صدا زده نمی‌شود.
   */
  const rows =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 30,
      }
    );

  /*
   * ابتدا رکوردی را پیدا می‌کنیم که
   * نمودار واقعی در آن ذخیره شده باشد.
   */
  let chartRow =
    rows.find(
      (row: any) => {
        const meta =
          (row.metadata ||
            {}) as RunMeta;

        const chart =
          meta.chart;

        return Boolean(
          chart &&
          typeof chart ===
            "object" &&
          Array.isArray(
            chart.candles
          )
        );
      }
    );

  /*
   * سپس آخرین رکورد دارای قیمت را پیدا می‌کنیم.
   */
  let marketRow =
    rows.find(
      (row: any) => {
        const meta =
          (row.metadata ||
            {}) as RunMeta;

        return (
          num(
            meta.currentPrice
          ) > 0
        );
      }
    );

  /*
   * اگر هنوز هیچ قیمت ذخیره‌شده‌ای وجود ندارد،
   * فقط یک بار قیمت می‌گیریم تا dashboard خالی نباشد.
   */
  if (!marketRow) {
    try {
      const price =
        await getCachedPrice();

      marketRow =
        await prisma.analysisRun.create(
          {
            data: {
              symbol:
                DISPLAY_SYMBOL,

              timeframe:
                "MARKET",

              status:
                "AI_NO_TRADE",

              signalGenerated:
                false,

              metadata: {
                kind:
                  "AI_MARKET",

                currentPrice:
                  round(
                    price,
                    2
                  ),

                state:
                  "MARKET_SNAPSHOT",

                reason:
                  "INITIAL_PRICE",
              } as any,
            },
          }
        );
    } catch {
      /*
       * dashboard بدون قیمت هم باید باز شود.
       */
    }
  }

  /*
   * اگر chartRow پیدا نشد، ممکن است همان marketRow
   * حاوی chart باشد.
   */
  if (
    !chartRow &&
    marketRow
  ) {
    const marketMeta =
      (marketRow.metadata ||
        {}) as RunMeta;

    if (
      marketMeta.chart
    ) {
      chartRow =
        marketRow;
    }
  }

  const marketMeta =
    marketRow
      ? ((marketRow.metadata ||
          {}) as RunMeta)
      : {};

  const chartMeta =
    chartRow
      ? ((chartRow.metadata ||
          {}) as RunMeta)
      : {};

  /*
   * اگر chart از یک signal/no-trade قدیمی‌تر باشد،
   * current price همچنان از جدیدترین marketRow گرفته می‌شود.
   */
  const chart =
    chartMeta.chart ||
    null;

  const recent =
    rows
      .filter(
        (row: any) =>
          row.signalGenerated ===
          true
      )
      .slice(0, 20)
      .map(
        (row: any) => ({
          id:
            row.id,

          createdAt:
            row.createdAt,

          status:
            row.status,

          metadata:
            row.metadata,
        })
      );

  return {
    symbol:
      DISPLAY_SYMBOL,

    currentPrice:
      num(
        marketMeta.currentPrice
      ) || null,

    usdToToman:
      usdToToman || null,

    active,

    latest: marketRow
      ? {
          id:
            marketRow.id,

          status:
            marketRow.status,

          signalGenerated:
            marketRow.signalGenerated,

          createdAt:
            marketRow.createdAt,

          metadata:
            marketMeta,
        }
      : null,

    /*
     * خروجی مخصوص نمودار جدید.
     */
    chart,

    /*
     * مقادیر اصلی برای رسم خطوط روی نمودار.
     */
    chartMeta: {
      entry:
        num(
          metaValue(
            active?.metadata,
            "entry"
          )
        ) ||
        num(
          chartMeta.entry
        ) ||
        null,

      stopLoss:
        num(
          metaValue(
            active?.metadata,
            "stopLoss"
          )
        ) ||
        num(
          chartMeta.stopLoss
        ) ||
        null,

      tp1:
        num(
          metaValue(
            active?.metadata,
            "tp1"
          )
        ) ||
        num(
          chartMeta.tp1
        ) ||
        null,

      tp2:
        num(
          metaValue(
            active?.metadata,
            "tp2"
          )
        ) ||
        num(
          chartMeta.tp2
        ) ||
        null,

      tp3:
        num(
          metaValue(
            active?.metadata,
            "tp3"
          )
        ) ||
        num(
          chartMeta.tp3
        ) ||
        null,

      support:
        num(
          metaValue(
            active?.metadata,
            "support"
          )
        ) ||
        num(
          chartMeta.support
        ) ||
        null,

      resistance:
        num(
          metaValue(
            active?.metadata,
            "resistance"
          )
        ) ||
        num(
          chartMeta.resistance
        ) ||
        null,

      direction:
        active?.metadata
          ? String(
              metaValue(
                active.metadata,
                "direction"
              ) || ""
            )
          : chartMeta.direction ||
            null,

      currentPrice:
        num(
          marketMeta.currentPrice
        ) || null,
    },

    performance,

    recent,
  };
}

/*
 * دسترسی امن به metadata رکورد active.
 */
function metaValue(
  metadata: unknown,
  key: string
): unknown {
  if (
    !metadata ||
    typeof metadata !==
      "object"
  ) {
    return undefined;
  }

  return (
    metadata as Record<
      string,
      unknown
    >
  )[key];
}

/* =========================================================
   CRON
========================================================= */

async function runCron() {
  const active =
    await getActiveRun();

  if (active) {
    return monitorRun(
      active
    );
  }

  return scanMarket();
}

/* =========================================================
   SESSION REPORT
========================================================= */

function sessionEnd(): string | null {
  const now =
    new Date();

  const hour =
    now.getUTCHours();

  const minute =
    now.getUTCMinutes();

  if (
    minute >= 15
  ) {
    return null;
  }

  if (hour === 6) {
    return "Sydney";
  }

  if (hour === 9) {
    return "Tokyo";
  }

  if (hour === 16) {
    return "London";
  }

  if (hour === 22) {
    return "New York";
  }

  return null;
}

async function createSessionReport(
  session: string
) {
  const since =
    new Date(
      Date.now() -
        24 *
          60 *
          60 *
          1000
    );

  const rows =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,

          createdAt: {
            gte:
              since,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 100,
      }
    );

  let pnl = 0;
  let wins = 0;
  let losses = 0;

  for (
    const row of rows
  ) {
    const meta =
      (row.metadata ||
        {}) as RunMeta;

    if (
      meta.session !==
      session
    ) {
      continue;
    }

    const events =
      Array.isArray(
        meta.events
      )
        ? meta.events
        : [];

    let tradePnl = 0;

    for (
      const event of events
    ) {
      tradePnl +=
        num(
          event.pnlUsd
        );
    }

    pnl +=
      tradePnl;

    if (
      tradePnl > 0
    ) {
      wins++;
    }

    if (
      tradePnl < 0
    ) {
      losses++;
    }
  }

  const fx =
    await getUsdToTomanRate();

  const toman =
    pnl * fx;

  const message = [
    "━━━━━━━━━━━━━━━━━━",
    `📊 <b>SESSION REPORT — ${session}</b>`,
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📈 معاملات: <b>${rows.length}</b>`,
    `🟢 مثبت: <b>${wins}</b>`,
    `🔴 منفی: <b>${losses}</b>`,
    "",
    `💵 P/L: <b>${
      pnl >= 0
        ? "+"
        : ""
    }${money(pnl)}</b>`,
    `🇮🇷 تومان: <b>${
      toman >= 0
        ? "+"
        : "-"
    }${tomanText(
      Math.abs(toman)
    )}</b>`,
    "",
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");

  try {
    await sendTelegram(
      message
    );
  } catch (error) {
    console.error(
      "Session report Telegram error:",
      error
    );
  }
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      new URL(
        request.url
      );

    const cron =
      url.searchParams.get(
        "cron"
      );

    /*
     * ==============================
     * CRON MODE
     * ==============================
     */
    if (
      cron === "1"
    ) {
      const cronSecret =
        env(
          "NEWS_CRON_SECRET"
        );

      const headerSecret =
        request.headers.get(
          "x-ai-cron-secret"
        );

      const querySecret =
        url.searchParams.get(
          "secret"
        );

      if (
        !cronSecret ||
        (
          headerSecret !==
            cronSecret &&
          querySecret !==
            cronSecret
        )
      ) {
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
        await runCron();

      const endedSession =
        sessionEnd();

      if (
        endedSession
      ) {
        try {
          await createSessionReport(
            endedSession
          );
        } catch (error) {
          console.error(
            "Session report failed:",
            error
          );
        }
      }

      return NextResponse.json({
        ok: true,

        engine:
          "XAUUSD AI Analysis Engine",

        timestamp:
          new Date().toISOString(),

        result,
      });
    }

    /*
     * ==============================
     * DASHBOARD MODE
     * ==============================
     */

    const session =
      await getSession();

    /*
     * پروژه شما session.user ندارد.
     * ساختار session شامل userId است.
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
        }
      );
    }

    const data =
      await getDashboard();

    return NextResponse.json({
      ok: true,

      data,
    });
  } catch (error: any) {
    console.error(
      "AI Analysis route error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          "AI Analysis API failed.",
      },
      {
        status: 500,
      }
    );
  }
}
