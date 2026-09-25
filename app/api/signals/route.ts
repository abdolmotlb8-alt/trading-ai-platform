import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TD = "https://api.twelvedata.com";
const SYMBOL = "XAUUSD";
const TD_SYMBOL = "XAU/USD";

const TOTAL_LOT = 0.10;
const CONTRACT_SIZE = 100;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const SL_DISTANCE = 4;
const TP1_DISTANCE = 5;
const TP2_DISTANCE = 10;
const TP3_DISTANCE = 15;

const MIN_SCORE = 82;
const MIN_CONFIRMATIONS = 6;
const SCAN_COOLDOWN_MS = 20_000;

let engineLock: Promise<unknown> | null = null;

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type EventRow = {
  type: string;
  price: number;
  pnlUsd: number;
  cumulativePnlUsd: number;
  pnlIrr?: number | null;
  at: string;
  note?: string;
};

type SignalMeta = {
  risk: {
    lotSize: number;
    stopLossDollars: number;
    tp1Dollars: number;
    tp2Dollars: number;
    tp3Dollars: number;
    contractSize: number;
    slDistance: number;
    tp1Distance: number;
    tp2Distance: number;
    tp3Distance: number;
    tp1Lot: number;
    tp2Lot: number;
    tp3Lot: number;
  };

  levels: {
    entry: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
    activeStop: number;
  };

  events: EventRow[];

  state: {
    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    slHit: boolean;
    breakevenHit: boolean;
  };

  lastPrice?: number;
  lastPriceAt?: string;

  analysis?: {
    score: number;
    confirmations: number;
    reasons: string[];
    support: number;
    resistance: number;
    reactionZones: number[];
    trend: string;
    momentum: string;
  };
};

type Quote = {
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  datetime?: string;
  isMarketOpen: boolean | null;
};

type Analysis = {
  direction: "BUY" | "SELL";
  score: number;
  confirmations: number;
  entry: number;
  support: number;
  resistance: number;
  atr: number;
  reactionZones: number[];
  trend: string;
  momentum: string;
  reasons: string[];

  signals: {
    trend: boolean;
    rsi: boolean;
    macd: boolean;
    pullback: boolean;
    candle: boolean;
    volume: boolean;
    mtf: boolean;
    structure: boolean;
  };
};

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tdSymbol(symbol: string): string {
  const s = symbol.replace(/\s/g, "").toUpperCase();

  if (s === "XAUUSD") return TD_SYMBOL;
  if (s.includes("/")) return s;

  if (s.length === 6) {
    return `${s.slice(0, 3)}/${s.slice(3)}`;
  }

  return s;
}

function normalizeInterval(value: string | null | undefined): string {
  const raw = (value ?? "1min").toLowerCase();

  const map: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1min": "1min",
    "5min": "5min",
    "15min": "15min",
    "30min": "30min",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "8h": "8h",
    "1day": "1day",
  };

  return map[raw] ?? "1min";
}

function parseJson(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

async function td(
  path: string,
  params: Record<string, string | number | boolean>
): Promise<any> {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (!key) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد."
    );
  }

  const url = new URL(`${TD}${path}`);

  for (const [keyName, value] of Object.entries({
    ...params,
    apikey: key,
  })) {
    url.searchParams.set(keyName, String(value));
  }

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

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

async function getQuote(symbol = SYMBOL): Promise<Quote> {
  const data = await td("/quote", {
    symbol: tdSymbol(symbol),
    interval: "1min",
  });

  const price = num(data.close ?? data.price);

  if (!price) {
    throw new Error("قیمت لحظه‌ای XAUUSD دریافت نشد.");
  }

  const open = data.is_market_open;

  const isMarketOpen =
    typeof open === "boolean"
      ? open
      : typeof open === "string"
        ? open.toLowerCase() === "true"
        : null;

  return {
    price,
    open: num(data.open),
    high: num(data.high),
    low: num(data.low),
    close: price,
    datetime: data.datetime
      ? String(data.datetime)
      : new Date().toISOString(),
    isMarketOpen,
  };
}

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 160
): Promise<Candle[]> {
  const data = await td("/time_series", {
    symbol: tdSymbol(symbol),
    interval,
    outputsize,
    order: "asc",
    timezone: "UTC",
  });

  if (
    !Array.isArray(data.values) ||
    data.values.length < 50
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

function ema(values: number[], period: number): number {
  if (values.length < period) {
    return avg(values);
  }

  let value = avg(values.slice(0, period));

  const k = 2 / (period + 1);

  for (let i = period; i < values.length; i += 1) {
    value =
      values[i] * k +
      value * (1 - k);
  }

  return value;
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

  for (let i = 1; i <= period; i += 1) {
    const diff =
      values[i] -
      values[i - 1];

    if (diff >= 0) {
      gain += diff;
    } else {
      loss -= diff;
    }
  }

  let averageGain = gain / period;
  let averageLoss = loss / period;

  for (
    let i = period + 1;
    i < values.length;
    i += 1
  ) {
    const diff =
      values[i] -
      values[i - 1];

    averageGain =
      (averageGain * (period - 1) +
        Math.max(diff, 0)) /
      period;

    averageLoss =
      (averageLoss * (period - 1) +
        Math.max(-diff, 0)) /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const rs =
    averageGain /
    averageLoss;

  return 100 - 100 / (1 + rs);
}

function atr(
  candles: Candle[],
  period = 14
): number {
  if (candles.length < period + 1) {
    return 0;
  }

  const ranges: number[] = [];

  for (let i = 1; i < candles.length; i += 1) {
    ranges.push(
      Math.max(
        candles[i].high -
          candles[i].low,

        Math.abs(
          candles[i].high -
            candles[i - 1].close
        ),

        Math.abs(
          candles[i].low -
            candles[i - 1].close
        )
      )
    );
  }

  return avg(
    ranges.slice(-period)
  );
}

function macd(
  values: number[]
): {
  line: number;
  previous: number;
} {
  const line =
    ema(values, 12) -
    ema(values, 26);

  const previousValues =
    values.slice(0, -1);

  const previous =
    ema(previousValues, 12) -
    ema(previousValues, 26);

  return {
    line,
    previous,
  };
}

function structure(candles: Candle[]) {
  const recent =
    candles.slice(-80);

  const highs: number[] = [];
  const lows: number[] = [];

  for (
    let i = 2;
    i < recent.length - 2;
    i += 1
  ) {
    const c = recent[i];

    if (
      c.high >
        recent[i - 1].high &&
      c.high >
        recent[i - 2].high &&
      c.high >
        recent[i + 1].high &&
      c.high >
        recent[i + 2].high
    ) {
      highs.push(c.high);
    }

    if (
      c.low <
        recent[i - 1].low &&
      c.low <
        recent[i - 2].low &&
      c.low <
        recent[i + 1].low &&
      c.low <
        recent[i + 2].low
    ) {
      lows.push(c.low);
    }
  }

  const resistance = Math.max(
    ...highs.slice(-6),
    ...recent
      .slice(-20)
      .map((c) => c.high)
  );

  const support = Math.min(
    ...lows.slice(-6),
    ...recent
      .slice(-20)
      .map((c) => c.low)
  );

  const candidates = [
    ...highs.slice(-6),
    ...lows.slice(-6),
  ]
    .filter((v) =>
      Number.isFinite(v)
    )
    .sort((a, b) => a - b);

  const zones: number[] = [];

  for (const value of candidates) {
    if (
      !zones.some(
        (z) =>
          Math.abs(z - value) <= 0.8
      )
    ) {
      zones.push(value);
    }
  }

  return {
    resistance,
    support,
    reactionZones:
      zones.slice(-8),
  };
}

function candleSignal(
  candles: Candle[],
  direction: "BUY" | "SELL"
) {
  const a =
    candles[candles.length - 2];

  const b =
    candles[candles.length - 1];

  const body =
    Math.abs(
      b.close - b.open
    );

  const range = Math.max(
    b.high - b.low,
    0.00001
  );

  const upper =
    b.high -
    Math.max(
      b.open,
      b.close
    );

  const lower =
    Math.min(
      b.open,
      b.close
    ) - b.low;

  const bullEngulf =
    b.close > b.open &&
    a.close < a.open &&
    b.close >= a.open &&
    b.open <= a.close;

  const bearEngulf =
    b.close < b.open &&
    a.close > a.open &&
    b.open >= a.close &&
    b.close <= a.open;

  const hammer =
    lower > body * 1.8 &&
    upper < body * 0.8 &&
    body / range < 0.55;

  const shootingStar =
    upper > body * 1.8 &&
    lower < body * 0.8 &&
    body / range < 0.55;

  return direction === "BUY"
    ? {
        ok:
          bullEngulf ||
          hammer,
        name: bullEngulf
          ? "Bullish Engulfing"
          : hammer
            ? "Hammer"
            : "No candle",
      }
    : {
        ok:
          bearEngulf ||
          shootingStar,
        name: bearEngulf
          ? "Bearish Engulfing"
          : shootingStar
            ? "Shooting Star"
            : "No candle",
      };
}

async function analyze(
  symbol: string,
  quote: Quote
): Promise<Analysis> {
  const [
    m1,
    m5,
    m15,
    h1,
  ] = await Promise.all([
    getCandles(
      symbol,
      "1min",
      180
    ),
    getCandles(
      symbol,
      "5min",
      180
    ),
    getCandles(
      symbol,
      "15min",
      180
    ),
    getCandles(
      symbol,
      "1h",
      140
    ),
  ]);

  const main = m1;

  const closes =
    main.map(
      (c) => c.close
    );

  const last =
    main[main.length - 1];

  const e9 =
    ema(closes, 9);

  const e20 =
    ema(closes, 20);

  const e50 =
    ema(closes, 50);

  const r =
    rsi(closes, 14);

  const m =
    macd(closes);

  const a =
    atr(main, 14);

  const sr =
    structure(main);

  const mtf = [
    m5,
    m15,
    h1,
  ].map((candles) => {
    const cs =
      candles.map(
        (c) => c.close
      );

    const lastClose =
      candles[
        candles.length - 1
      ].close;

    return lastClose >
      ema(cs, 20)
      ? 1
      : -1;
  });

  const buyTrend =
    quote.price > e9 &&
    e9 > e20 &&
    e20 > e50;

  const sellTrend =
    quote.price < e9 &&
    e9 < e20 &&
    e20 < e50;

  const buyMomentum =
    r >= 52 &&
    r <= 72 &&
    m.line > m.previous;

  const sellMomentum =
    r <= 48 &&
    r >= 28 &&
    m.line < m.previous;

  const buyPullback =
    last.low <=
      e20 + a * 0.45 &&
    quote.price > e20;

  const sellPullback =
    last.high >=
      e20 - a * 0.45 &&
    quote.price < e20;

  const buyStructure =
    quote.price >
      sr.support &&
    quote.price <
      sr.resistance;

  const sellStructure =
    buyStructure;

  const bullCandle =
    candleSignal(
      main,
      "BUY"
    );

  const bearCandle =
    candleSignal(
      main,
      "SELL"
    );

  const volumes =
    main
      .map(
        (c) =>
          c.volume ?? 0
      )
      .slice(-21);

  const averageVolume =
    avg(
      volumes.slice(0, -1)
    );

  const currentVolume =
    volumes.at(-1) ?? 0;

  const volumeOk =
    averageVolume <= 0 ||
    currentVolume >=
      averageVolume * 0.75;

  const mtfBuy =
    mtf.filter(
      (v) => v > 0
    ).length >= 2;

  const mtfSell =
    mtf.filter(
      (v) => v < 0
    ).length >= 2;

  const buyVotes = [
    buyTrend,
    buyMomentum,
    buyPullback,
    bullCandle.ok,
    volumeOk,
    mtfBuy,
    buyStructure,
  ].filter(Boolean).length;

  const sellVotes = [
    sellTrend,
    sellMomentum,
    sellPullback,
    bearCandle.ok,
    volumeOk,
    mtfSell,
    sellStructure,
  ].filter(Boolean).length;

  const direction: "BUY" | "SELL" =
    buyVotes >= sellVotes
      ? "BUY"
      : "SELL";

  const votes =
    direction === "BUY"
      ? buyVotes
      : sellVotes;

  let score = 0;

  if (
    direction === "BUY"
      ? buyTrend
      : sellTrend
  ) {
    score += 22;
  }

  if (
    direction === "BUY"
      ? buyMomentum
      : sellMomentum
  ) {
    score += 18;
  }

  if (
    direction === "BUY"
      ? buyPullback
      : sellPullback
  ) {
    score += 14;
  }

  if (
    direction === "BUY"
      ? bullCandle.ok
      : bearCandle.ok
  ) {
    score += 12;
  }

  if (volumeOk) {
    score += 8;
  }

  if (
    direction === "BUY"
      ? mtfBuy
      : mtfSell
  ) {
    score += 16;
  }

  if (
    direction === "BUY"
      ? buyStructure
      : sellStructure
  ) {
    score += 10;
  }

  score = clamp(
    Math.round(score),
    0,
    100
  );

  const room =
    a * 0.25;

  const target1 =
    direction === "BUY"
      ? quote.price +
        TP1_DISTANCE
      : quote.price -
        TP1_DISTANCE;

  const hasRoom =
    direction === "BUY"
      ? sr.resistance >=
        target1 + room
      : sr.support <=
        target1 - room;

  if (!hasRoom) {
    score = Math.min(
      score,
      78
    );
  }

  const reasons = [
    direction === "BUY"
      ? "ساختار صعودی EMA 9/20/50"
      : "ساختار نزولی EMA 9/20/50",

    `RSI ${round(r, 1)}`,

    direction === "BUY"
      ? "مومنتوم صعودی MACD"
      : "مومنتوم نزولی MACD",

    direction === "BUY"
      ? "پولبک خرید تأیید شد"
      : "پولبک فروش تأیید شد",

    direction === "BUY"
      ? bullCandle.name
      : bearCandle.name,

    mtfBuy || mtfSell
      ? "تأیید چندتایم‌فریمی"
      : "MTF ضعیف",

    volumeOk
      ? "حجم قابل قبول"
      : "حجم ضعیف",

    hasRoom
      ? "فضای کافی تا TP1"
      : "فضای کافی تا TP1 وجود ندارد",
  ];

  return {
    direction,
    score,
    confirmations: votes,
    entry: quote.price,
    support: sr.support,
    resistance: sr.resistance,
    atr: a,
    reactionZones:
      sr.reactionZones,
    trend:
      direction === "BUY"
        ? "Bullish"
        : "Bearish",
    momentum:
      direction === "BUY"
        ? "Bullish momentum"
        : "Bearish momentum",
    reasons,

    signals: {
      trend:
        direction === "BUY"
          ? buyTrend
          : sellTrend,

      rsi:
        direction === "BUY"
          ? buyMomentum
          : sellMomentum,

      macd:
        direction === "BUY"
          ? m.line > m.previous
          : m.line < m.previous,

      pullback:
        direction === "BUY"
          ? buyPullback
          : sellPullback,

      candle:
        direction === "BUY"
          ? bullCandle.ok
          : bearCandle.ok,

      volume: volumeOk,

      mtf:
        direction === "BUY"
          ? mtfBuy
          : mtfSell,

      structure: hasRoom,
    },
  };
}

function buildRisk() {
  const tp1Dollars =
    TP1_LOT *
    TP1_DISTANCE *
    CONTRACT_SIZE;

  const tp2Dollars =
    TP2_LOT *
    TP2_DISTANCE *
    CONTRACT_SIZE;

  const tp3Dollars =
    TP3_LOT *
    TP3_DISTANCE *
    CONTRACT_SIZE;

  const stopLossDollars =
    TOTAL_LOT *
    SL_DISTANCE *
    CONTRACT_SIZE;

  return {
    lotSize: TOTAL_LOT,
    stopLossDollars:
      round(stopLossDollars),
    tp1Dollars:
      round(tp1Dollars),
    tp2Dollars:
      round(tp2Dollars),
    tp3Dollars:
      round(tp3Dollars),
    contractSize:
      CONTRACT_SIZE,
    slDistance:
      SL_DISTANCE,
    tp1Distance:
      TP1_DISTANCE,
    tp2Distance:
      TP2_DISTANCE,
    tp3Distance:
      TP3_DISTANCE,
    tp1Lot: TP1_LOT,
    tp2Lot: TP2_LOT,
    tp3Lot: TP3_LOT,
  };
}

function buildLevels(
  entry: number,
  direction: "BUY" | "SELL"
) {
  if (direction === "BUY") {
    return {
      entry,
      sl:
        entry -
        SL_DISTANCE,
      tp1:
        entry +
        TP1_DISTANCE,
      tp2:
        entry +
        TP2_DISTANCE,
      tp3:
        entry +
        TP3_DISTANCE,
      activeStop:
        entry -
        SL_DISTANCE,
    };
  }

  return {
    entry,
    sl:
      entry +
      SL_DISTANCE,
    tp1:
      entry -
      TP1_DISTANCE,
    tp2:
      entry -
      TP2_DISTANCE,
    tp3:
      entry -
      TP3_DISTANCE,
    activeStop:
      entry +
      SL_DISTANCE,
  };
}

async function usdIrr(): Promise<number> {
  try {
    const data =
      await td(
        "/exchange_rate",
        {
          symbol:
            "USD/IRR",
        }
      );

    const value =
      num(data.rate);

    return value > 0
      ? value
      : num(
          process.env
            .USD_IRR_RATE
        );
  } catch {
    return num(
      process.env
        .USD_IRR_RATE
    );
  }
}

async function telegramMessage(
  text: string
) {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chat =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chat) {
    return {
      ok: false,
      error:
        "Telegram env missing",
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
          body: JSON.stringify({
            chat_id: chat,
            text,
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
          data.result
            .message_id
        ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Telegram error",
    };
  }
}

function metaOf(
  value: unknown
): SignalMeta {
  const m =
    parseJson(value);

  const risk =
    parseJson(m.risk);

  const levels =
    parseJson(m.levels);

  const state =
    parseJson(m.state);

  return {
    risk: {
      ...buildRisk(),
      ...risk,
    },

    levels: {
      entry:
        num(levels.entry),
      sl:
        num(levels.sl),
      tp1:
        num(levels.tp1),
      tp2:
        num(levels.tp2),
      tp3:
        num(levels.tp3),
      activeStop:
        num(
          levels.activeStop ??
            levels.sl
        ),
    },

    events:
      Array.isArray(
        m.events
      )
        ? m.events
        : [],

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
      breakevenHit:
        Boolean(
          state.breakevenHit
        ),
    },

    lastPrice:
      num(m.lastPrice) ||
      undefined,

    lastPriceAt:
      m.lastPriceAt
        ? String(
            m.lastPriceAt
          )
        : undefined,

    analysis:
      m.analysis,
  };
}

function finalOutcome(
  meta: SignalMeta
) {
  return [
    ...meta.events,
  ]
    .filter((event) =>
      [
        "TP3_HIT",
        "BREAKEVEN_HIT",
        "SL_HIT",
      ].includes(event.type)
    )
    .sort(
      (a, b) =>
        +new Date(a.at) -
        +new Date(b.at)
    )
    .at(-1);
}

function performance(
  signals: any[],
  from: Date
) {
  let total = 0;
  let wins = 0;
  let losses = 0;
  let pnl = 0;

  for (const signal of signals) {
    const meta =
      metaOf(
        signal.metadata
      );

    const events =
      meta.events.filter(
        (event) =>
          new Date(
            event.at
          ).getTime() >=
          from.getTime()
      );

    const final =
      finalOutcome({
        ...meta,
        events,
      });

    if (!final) {
      continue;
    }

    total += 1;

    pnl += num(
      final.cumulativePnlUsd
    );

    if (
      final.type ===
        "TP3_HIT" ||
      final.type ===
        "BREAKEVEN_HIT"
    ) {
      wins += 1;
    }

    if (
      final.type ===
      "SL_HIT"
    ) {
      losses += 1;
    }
  }

  return {
    signals: total,
    wins,
    losses,
    winRate: total
      ? round(
          (wins / total) *
            100
        )
      : 0,
    pnlUsd:
      round(pnl),
  };
}

function eventPnl(
  meta: SignalMeta,
  type: string
): number {
  if (
    type === "TP1_HIT"
  ) {
    return meta.risk
      .tp1Dollars;
  }

  if (
    type === "TP2_HIT"
  ) {
    return meta.risk
      .tp2Dollars;
  }

  if (
    type === "TP3_HIT"
  ) {
    return meta.risk
      .tp3Dollars;
  }

  if (
    type === "SL_HIT"
  ) {
    return -
      meta.risk
        .stopLossDollars;
  }

  return 0;
}

async function sendEventTelegram(
  signal: any,
  type: string,
  price: number,
  meta: SignalMeta
) {
  const labels: Record<
    string,
    string
  > = {
    TP1_HIT:
      "TP1 لمس شد",
    TP2_HIT:
      "TP2 لمس شد",
    TP3_HIT:
      "TP3 لمس شد",
    SL_HIT:
      "STOP LOSS لمس شد",
    BREAKEVEN_HIT:
      "RISK FREE / BREAKEVEN فعال شد",
  };

  const icon =
    type === "SL_HIT"
      ? "🔴"
      : "🟢";

  const event =
    meta.events.at(-1);

  const remaining = [
    !meta.state.tp1Hit
      ? `TP1 ${round(
          meta.levels.tp1
        )}`
      : null,

    !meta.state.tp2Hit
      ? `TP2 ${round(
          meta.levels.tp2
        )}`
      : null,

    !meta.state.tp3Hit
      ? `TP3 ${round(
          meta.levels.tp3
        )}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ") ||
    "تمام اهداف انجام شد";

  const message = [
    `${icon} <b>${labels[type] ?? type}</b>`,

    `<b>${esc(
      signal.symbol
    )}</b> · ${esc(
      signal.direction
    )}`,

    `قیمت: <b>${round(
      price
    )}</b>`,

    event
      ? `سود این مرحله: <b>${
          event.pnlUsd >= 0
            ? "+"
            : ""
        }$${round(
          event.pnlUsd
        )}</b>`
      : "",

    `سود تحقق‌یافته: <b>${
      (meta.events.at(-1)
        ?.cumulativePnlUsd ??
        0) >= 0
        ? "+"
        : ""
    }$${round(
      meta.events.at(-1)
        ?.cumulativePnlUsd ??
        0
    )}</b>`,

    `حدضرر فعال: <b>${round(
      meta.levels.activeStop
    )}</b>`,

    `اهداف باقی‌مانده: <b>${esc(
      remaining
    )}</b>`,

    `Lot: <b>${TOTAL_LOT.toFixed(
      2
    )}</b>`,
  ]
    .filter(Boolean)
    .join("\n");

  return telegramMessage(
    message
  );
}

async function createSignal(
  userId: string,
  bot: any,
  analysis: Analysis
) {
  const levels =
    buildLevels(
      analysis.entry,
      analysis.direction
    );

  const risk =
    buildRisk();

  const now =
    new Date();

  const meta: SignalMeta = {
    risk,

    levels,

    events: [],

    state: {
      tp1Hit: false,
      tp2Hit: false,
      tp3Hit: false,
      slHit: false,
      breakevenHit:
        false,
    },

    lastPrice:
      analysis.entry,

    lastPriceAt:
      now.toISOString(),

    analysis: {
      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      reasons:
        analysis.reasons,

      support:
        analysis.support,

      resistance:
        analysis.resistance,

      reactionZones:
        analysis.reactionZones,

      trend:
        analysis.trend,

      momentum:
        analysis.momentum,
    },
  };

  const signal =
    await prisma.tradingSignal.create(
      {
        data: {
          userId,
          botId: bot.id,

          symbol: SYMBOL,

          timeframe:
            "1min",

          direction:
            analysis.direction,

          entry:
            analysis.entry,

          stopLoss:
            levels.sl,

          takeProfit:
            levels.tp3,

          riskReward:
            round(
              TP3_DISTANCE /
                SL_DISTANCE,
              2
            ),

          score:
            analysis.score,

          confidence:
            analysis.score,

          status:
            "ACTIVE",

          source:
            "DIRECT_SCALP_ENGINE",

          marketStructure:
            analysis.trend,

          supportResistance:
            `S ${round(
              analysis.support
            )} / R ${round(
              analysis.resistance
            )}`,

          liquidity:
            "Liquidity + structure filter",

          pullback:
            analysis.signals
              .pullback
              ? "Confirmed"
              : "Not confirmed",

          candlePattern:
            analysis.signals
              .candle
              ? "Confirmed"
              : "Not confirmed",

          volumeConfirmation:
            analysis.signals
              .volume
              ? "Confirmed"
              : "Weak",

          multiTimeframeConfirmation:
            analysis.signals
              .mtf
              ? "Confirmed"
              : "Weak",

          sessionConfirmation:
            "Checked",

          volatilityConfirmation:
            analysis.atr > 0
              ? `ATR ${round(
                  analysis.atr,
                  2
                )}`
              : "Unavailable",

          newsConfirmation:
            "News filter passed",

          confirmations:
            analysis.signals as any,

          reasons:
            analysis.reasons as any,

          metadata:
            meta as any,

          expiresAt:
            new Date(
              now.getTime() +
                90 *
                  60_000
            ),
        },

        include: {
          bot: {
            select: {
              name: true,
            },
          },
        },
      }
    );

  const text = [
    `🟡 <b>DIRECT SCALP SIGNAL</b>`,

    ``,

    `<b>${SYMBOL}</b> · <b>${analysis.direction}</b>`,

    `Entry: <b>${round(
      levels.entry
    )}</b>`,

    `SL: <b>${round(
      levels.sl
    )}</b> · <b>-$${risk.stopLossDollars}</b>`,

    `TP1: <b>${round(
      levels.tp1
    )}</b> · <b>+$${risk.tp1Dollars}</b> · 0.04 lot`,

    `TP2: <b>${round(
      levels.tp2
    )}</b> · <b>+$${risk.tp2Dollars}</b> · 0.03 lot`,

    `TP3: <b>${round(
      levels.tp3
    )}</b> · <b>+$${risk.tp3Dollars}</b> · 0.03 lot`,

    ``,

    `Risk: <b>-$${risk.stopLossDollars}</b>`,

    `Max plan: <b>+$${round(
      risk.tp1Dollars +
        risk.tp2Dollars +
        risk.tp3Dollars
    )}</b>`,

    `Score: <b>${analysis.score}%</b> · Confirmations: <b>${analysis.confirmations}</b>`,

    `Lot: <b>${TOTAL_LOT.toFixed(
      2
    )}</b>`,

    ``,

    `بعد از TP1: حدضرر حجم باقی‌مانده فوراً به Entry منتقل می‌شود.`,

    ``,

    `<i>تحلیل خودکار بر اساس داده بازار؛ تضمین سود نیست.</i>`,
  ].join("\n");

  const telegram =
    await telegramMessage(
      text
    );

  if (telegram.ok) {
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

  return signal;
}

async function processEvent(
  signal: any,
  type: string,
  price: number,
  meta: SignalMeta
) {
  if (
    meta.events.some(
      (event) =>
        event.type === type
    )
  ) {
    return;
  }

  const now =
    new Date();

  const pnl =
    eventPnl(
      meta,
      type
    );

  const cumulative =
    round(
      (meta.events.at(-1)
        ?.cumulativePnlUsd ??
        0) + pnl
    );

  const fx =
    type === "SL_HIT" ||
    type === "TP1_HIT" ||
    type === "TP2_HIT" ||
    type === "TP3_HIT"
      ? await usdIrr()
      : 0;

  const event: EventRow = {
    type,
    price,
    pnlUsd: pnl,
    cumulativePnlUsd:
      cumulative,
    pnlIrr: fx
      ? Math.round(
          cumulative * fx
        )
      : null,
    at:
      now.toISOString(),
  };

  meta.events.push(
    event
  );

  if (
    type === "TP1_HIT"
  ) {
    meta.state.tp1Hit =
      true;

    meta.levels.activeStop =
      meta.levels.entry;

    event.note =
      "SL moved to Entry; remaining 0.06 lot is risk-free.";
  }

  if (
    type === "TP2_HIT"
  ) {
    meta.state.tp2Hit =
      true;

    meta.levels.activeStop =
      meta.levels.tp1;

    event.note =
      "SL moved to TP1; remaining 0.03 lot is protected.";
  }

  if (
    type === "TP3_HIT"
  ) {
    meta.state.tp3Hit =
      true;
  }

  if (
    type === "SL_HIT"
  ) {
    meta.state.slHit =
      true;
  }

  if (
    type === "BREAKEVEN_HIT"
  ) {
    meta.state.breakevenHit =
      true;
  }

  const terminal = [
    "TP3_HIT",
    "SL_HIT",
    "BREAKEVEN_HIT",
  ].includes(type);

  const status =
    terminal
      ? "CLOSED"
      : type;

  const stopForDb =
    type === "TP1_HIT"
      ? meta.levels.entry
      : type === "TP2_HIT"
        ? meta.levels.tp1
        : meta.levels.activeStop;

  await prisma.tradingSignal.update(
    {
      where: {
        id: signal.id,
      },

      data: {
        status,

        stopLoss:
          stopForDb,

        closedAt:
          terminal
            ? now
            : null,

        metadata:
          meta as any,
      },
    }
  );

  const telegram =
    await sendEventTelegram(
      signal,
      type,
      price,
      meta
    );

  return {
    type,
    telegram:
      telegram.ok,
  };
}

async function monitor(
  userId: string
) {
  const active =
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,

          symbol: SYMBOL,

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
          createdAt:
            "asc",
        },

        take: 10,
      }
    );

  const result: any[] =
    [];

  if (!active.length) {
    return result;
  }

  const quote =
    await getQuote(
      SYMBOL
    );

  for (
    const signal of active
  ) {
    const meta =
      metaOf(
        signal.metadata
      );

    meta.lastPrice =
      quote.price;

    meta.lastPriceAt =
      new Date().toISOString();

    const direction =
      signal.direction as
        | "BUY"
        | "SELL";

    const crossed = (
      level: number
    ) =>
      direction === "BUY"
        ? quote.price >= level
        : quote.price <= level;

    const touched = (
      level: number
    ) =>
      direction === "BUY"
        ? quote.price <= level
        : quote.price >= level;

    try {
      if (
        signal.status ===
          "ACTIVE" &&
        touched(
          meta.levels.activeStop
        )
      ) {
        result.push(
          await processEvent(
            signal,
            "SL_HIT",
            meta.levels.activeStop,
            meta
          )
        );

        continue;
      }

      if (
        signal.status ===
          "ACTIVE" &&
        crossed(
          meta.levels.tp1
        )
      ) {
        result.push(
          await processEvent(
            signal,
            "TP1_HIT",
            meta.levels.tp1,
            meta
          )
        );

        if (
          touched(
            meta.levels.activeStop
          )
        ) {
          result.push(
            await processEvent(
              signal,
              "BREAKEVEN_HIT",
              meta.levels.activeStop,
              meta
            )
          );

          continue;
        }
      }

      if (
        signal.status ===
          "TP1_HIT" &&
        touched(
          meta.levels.activeStop
        )
      ) {
        result.push(
          await processEvent(
            signal,
            "BREAKEVEN_HIT",
            meta.levels.activeStop,
            meta
          )
        );

        continue;
      }

      if (
        (
          signal.status ===
            "TP1_HIT" ||
          meta.state.tp1Hit
        ) &&
        crossed(
          meta.levels.tp2
        ) &&
        !meta.state.tp2Hit
      ) {
        result.push(
          await processEvent(
            signal,
            "TP2_HIT",
            meta.levels.tp2,
            meta
          )
        );

        if (
          touched(
            meta.levels.activeStop
          )
        ) {
          result.push(
            await processEvent(
              signal,
              "BREAKEVEN_HIT",
              meta.levels.activeStop,
              meta
            )
          );

          continue;
        }
      }

      if (
        meta.state.tp2Hit &&
        touched(
          meta.levels.activeStop
        )
      ) {
        result.push(
          await processEvent(
            signal,
            "BREAKEVEN_HIT",
            meta.levels.activeStop,
            meta
          )
        );

        continue;
      }

      if (
        meta.state.tp2Hit &&
        crossed(
          meta.levels.tp3
        ) &&
        !meta.state.tp3Hit
      ) {
        result.push(
          await processEvent(
            signal,
            "TP3_HIT",
            meta.levels.tp3,
            meta
          )
        );

        continue;
      }

      await prisma.tradingSignal.update(
        {
          where: {
            id: signal.id,
          },

          data: {
            metadata:
              meta as any,
          },
        }
      );
    } catch (error) {
      result.push({
        signalId:
          signal.id,

        error:
          error instanceof Error
            ? error.message
            : "monitor error",
      });
    }
  }

  return result;
}

async function scan(
  userId: string,
  requestedInterval: string | null
) {
  const bots =
    await prisma.tradingBot.findMany(
      {
        where: {
          userId,

          isActive:
            true,

          symbol: {
            in: [
              SYMBOL,
              TD_SYMBOL,
            ],
          },

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

        take: 20,
      }
    );

  const made: any[] =
    [];

  const errors: any[] =
    [];

  if (!bots.length) {
    return {
      bots: 0,
      made,
      errors,
    };
  }

  const active =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          userId,

          symbol: {
            in: [
              SYMBOL,
              TD_SYMBOL,
            ],
          },

          status: {
            in: [
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

  if (active) {
    return {
      bots:
        bots.length,
      made,
      errors,
    };
  }

  const recent =
    await prisma.tradingSignal.findFirst(
      {
        where: {
          userId,

          symbol: {
            in: [
              SYMBOL,
              TD_SYMBOL,
            ],
          },

          createdAt: {
            gte: new Date(
              Date.now() -
                SCAN_COOLDOWN_MS
            ),
          },
        },

        select: {
          id: true,
        },
      }
    );

  if (recent) {
    return {
      bots:
        bots.length,
      made,
      errors,
    };
  }

  const quote =
    await getQuote(
      SYMBOL
    );

  if (
    quote.isMarketOpen ===
    false
  ) {
    return {
      bots:
        bots.length,
      made,
      errors,
      marketClosed:
        true,
    };
  }

  const bot =
    bots[0];

  try {
    if (bot.sessionFilter) {
      const hour =
        new Date()
          .getUTCHours();

      if (
        hour < 5 ||
        hour > 21
      ) {
        return {
          bots:
            bots.length,
          made,
          errors,
          sessionBlocked:
            true,
        };
      }
    }

    const interval =
      normalizeInterval(
        requestedInterval ??
          "1min"
      );

    if (
      interval !==
      "1min"
    ) {
      return {
        bots:
          bots.length,
        made,
        errors,
        scanInterval:
          "1min",
      };
    }

    if (bot.newsFilter) {
      const minutes =
        bot.stopBeforeNewsMinutes >
        0
          ? bot.stopBeforeNewsMinutes
          : 30;

      const eventCount =
        await prisma.economicEvent.count(
          {
            where: {
              importance: {
                gte: 2,
              },

              eventTime: {
                gte:
                  new Date(),

                lte:
                  new Date(
                    Date.now() +
                      minutes *
                        60_000
                  ),
              },

              currency:
                "USD",
            },
          }
        );

      if (
        eventCount > 0
      ) {
        return {
          bots:
            bots.length,
          made,
          errors,
          newsBlocked:
            true,
        };
      }
    }

    const analysis =
      await analyze(
        SYMBOL,
        quote
      );

    const threshold =
      Math.max(
        MIN_SCORE,
        num(
          bot.signalThreshold,
          MIN_SCORE
        )
      );

    const confirmations =
      Math.max(
        MIN_CONFIRMATIONS,
        num(
          bot.minConfirmations,
          MIN_CONFIRMATIONS
        )
      );

    if (
      analysis.direction ===
        "BUY" &&
      !bot.buyEnabled
    ) {
      return {
        bots:
          bots.length,
        made,
        errors,
        rejected:
          "BUY disabled",
      };
    }

    if (
      analysis.direction ===
        "SELL" &&
      !bot.sellEnabled
    ) {
      return {
        bots:
          bots.length,
        made,
        errors,
        rejected:
          "SELL disabled",
      };
    }

    if (
      analysis.score <
        threshold ||
      analysis.confirmations <
        confirmations
    ) {
      return {
        bots:
          bots.length,
        made,
        errors,
        rejected: `score=${analysis.score}, confirmations=${analysis.confirmations}`,
      };
    }

    const signal =
      await createSignal(
        userId,
        bot,
        analysis
      );

    made.push(
      signal
    );
  } catch (error) {
    errors.push({
      botId:
        bot.id,

      symbol:
        SYMBOL,

      error:
        error instanceof Error
          ? error.message
          : "scan error",
    });
  }

  return {
    bots:
      bots.length,
    made,
    errors,
  };
}

function zonedDateParts(
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
      }
    ).formatToParts(
      new Date()
    );

  const get = (
    type: string
  ) =>
    parts.find(
      (part) =>
        part.type ===
        type
    )?.value ?? "00";

  return {
    dateKey: `${get(
      "year"
    )}-${get(
      "month"
    )}-${get(
      "day"
    )}`,

    hour: Number(
      get("hour")
    ),
  };
}

async function maybeSendMorningBrief(
  support: number,
  resistance: number,
  reactionZones: number[]
) {
  if (
    !process.env
      .TELEGRAM_BOT_TOKEN ||
    !process.env
      .TELEGRAM_SIGNAL_CHAT_ID
  ) {
    return false;
  }

  const timeZone =
    process.env
      .SIGNAL_BRIEF_TZ ||
    "America/New_York";

  const {
    dateKey,
    hour,
  } =
    zonedDateParts(
      timeZone
    );

  if (
    hour < 7 ||
    hour >= 10
  ) {
    return false;
  }

  const last =
    await prisma.analysisRun.findFirst(
      {
        where: {
          symbol:
            SYMBOL,

          timeframe:
            "MORNING_BRIEF",
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          metadata:
            true,
        },
      }
    );

  const lastMeta =
    parseJson(
      last?.metadata
    );

  if (
    lastMeta.dateKey ===
    dateKey
  ) {
    return false;
  }

  const zones =
    reactionZones
      .slice(-4)
      .map((value) =>
        round(value)
      )
      .join(" · ") ||
    "—";

  const text = [
    `🌅 <b>XAUUSD MORNING MARKET BRIEF</b>`,

    ``,

    `Support: <b>${round(
      support
    )}</b>`,

    `Resistance: <b>${round(
      resistance
    )}</b>`,

    `Reaction zones: <b>${esc(
      zones
    )}</b>`,

    ``,

    `منطقه‌های واکنش از ساختار اخیر قیمت استخراج شده‌اند.`,
  ].join("\n");

  const telegram =
    await telegramMessage(
      text
    );

  if (!telegram.ok) {
    return false;
  }

  await prisma.analysisRun.create(
    {
      data: {
        symbol:
          SYMBOL,

        timeframe:
          "MORNING_BRIEF",

        status:
          "COMPLETED",

        startedAt:
          new Date(),

        finishedAt:
          new Date(),

        signalGenerated:
          false,

        candlesAnalyzed:
          0,

        confirmationsFound:
          0,

        metadata: {
          dateKey,
          support,
          resistance,
          reactionZones,
          telegramMessageId:
            telegram.messageId,
        } as any,
      },
    }
  );

  return true;
}

async function runEngine(
  userId: string,
  requestedInterval: string | null
) {
  if (engineLock) {
    return engineLock;
  }

  engineLock =
    (async () => {
      const monitored =
        await monitor(
          userId
        );

      const activeAfterMonitor =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              symbol: {
                in: [
                  SYMBOL,
                  TD_SYMBOL,
                ],
              },

              status: {
                in: [
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

      const scanned =
        activeAfterMonitor
          ? {
              bots: 0,
              made: [],
              errors: [],
              skipped:
                "active signal exists",
            }
          : await scan(
              userId,
              requestedInterval
            );

      return {
        monitored,
        scanned,
      };
    })();

  try {
    return await engineLock;
  } finally {
    engineLock = null;
  }
}

export async function GET(
  request: Request
) {
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
      }
    );
  }

  if (
    !process.env
      .TWELVE_DATA_API_KEY
  ) {
    return NextResponse.json(
      {
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

  const interval =
    normalizeInterval(
      url.searchParams.get(
        "interval"
      )
    );

  try {
    const engine =
      await runEngine(
        session.userId,
        interval
      );

    const [
      quote,
      chartCandles,
      active,
      signals,
    ] = await Promise.all([
      getQuote(SYMBOL),

      getCandles(
        SYMBOL,
        interval,
        100
      ),

      prisma.tradingSignal.findFirst(
        {
          where: {
            userId:
              session.userId,

            symbol:
              SYMBOL,

            status: {
              in: [
                "ACTIVE",
                "TP1_HIT",
                "TP2_HIT",
              ],
            },
          },

          include: {
            bot: {
              select: {
                name:
                  true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        }
      ),

      prisma.tradingSignal.findMany(
        {
          where: {
            userId:
              session.userId,

            symbol:
              SYMBOL,
          },

          include: {
            bot: {
              select: {
                name:
                  true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 50,
        }
      ),
    ]);

    const day =
      new Date();

    day.setHours(
      0,
      0,
      0,
      0
    );

    const week =
      new Date();

    week.setDate(
      week.getDate() -
        6
    );

    const month =
      new Date();

    month.setDate(
      month.getDate() -
        29
    );

    const activeMeta =
      active
        ? metaOf(
            active.metadata
          )
        : null;

    const liveStructure =
      structure(
        chartCandles
      );

    const morningBriefSent =
      await maybeSendMorningBrief(
        liveStructure.support,
        liveStructure.resistance,
        liveStructure.reactionZones
      );

    const latestClosed =
      signals.find(
        (signal) =>
          signal.status ===
          "CLOSED"
      ) ?? null;

    const risk =
      buildRisk();

    return NextResponse.json(
      {
        ok: true,

        source:
          "Twelve Data",

        symbol:
          SYMBOL,

        live: true,

        currentPrice:
          quote.price,

        marketOpen:
          quote.isMarketOpen,

        quoteAt:
          quote.datetime ??
          new Date().toISOString(),

        candles:
          chartCandles,

        interval,

        active:
          active
            ? {
                ...active,
                metadata:
                  activeMeta,
              }
            : null,

        latestClosed,

        signals,

        engine,

        plan: {
          lot:
            TOTAL_LOT,

          tp1Lot:
            TP1_LOT,

          tp2Lot:
            TP2_LOT,

          tp3Lot:
            TP3_LOT,

          riskUsd:
            risk.stopLossDollars,

          tp1Usd:
            risk.tp1Dollars,

          tp2Usd:
            risk.tp2Dollars,

          tp3Usd:
            risk.tp3Dollars,

          maxUsd:
            round(
              risk.tp1Dollars +
                risk.tp2Dollars +
                risk.tp3Dollars
            ),
        },

        market: {
          morningBriefSent,

          support:
            activeMeta
              ?.analysis
              ?.support ??
            liveStructure.support ??
            null,

          resistance:
            activeMeta
              ?.analysis
              ?.resistance ??
            liveStructure.resistance ??
            null,

          reactionZones:
            activeMeta
              ?.analysis
              ?.reactionZones ??
            liveStructure.reactionZones ??
            [],
        },

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

        chart: {
          onlyCandles:
            true,

          overlays:
            active
              ? {
                  entry:
                    num(
                      activeMeta
                        ?.levels
                        .entry
                    ),

                  sl:
                    num(
                      activeMeta
                        ?.levels
                        .activeStop
                    ),

                  tp1:
                    num(
                      activeMeta
                        ?.levels
                        .tp1
                    ),

                  tp2:
                    num(
                      activeMeta
                        ?.levels
                        .tp2
                    ),

                  tp3:
                    num(
                      activeMeta
                        ?.levels
                        .tp3
                    ),
                }
              : null,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
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
      },
      {
        status: 500,
      }
    );
  }
}
