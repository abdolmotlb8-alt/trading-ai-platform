import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const TWELVE_DATA_URL = "https://api.twelvedata.com";
const NETARZ_URL = "https://netarz.ir/api/fx/v1/rates/USD";

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

const DEFAULT_NEWS_MINUTES = 30;
const DEFAULT_NEWS_IMPORTANCE = 3;

const SCORE_TO_SIGNAL = Number(
  process.env.AI_SCORE_TO_SIGNAL || "78"
);

const MIN_CONFIRMATIONS = 5;

const PRICE_SNAPSHOT_MAX_AGE_MS = Number(
  process.env.AI_PRICE_CACHE_MS || "120000"
);

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type MarketAnalysis = {
  direction: "BUY" | "SELL" | null;
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

type RunMeta = {
  kind?: string;
  symbol?: string;

  direction?: "BUY" | "SELL";
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

  events?: Array<{
    type: string;
    at: string;
    price: number;
    lotClosed: number;
    pnlUsd: number;
    pnlToman: number;
    usdToToman: number;
  }>;

  analysis?: Record<string, unknown>;

  reason?: string;
  overview?: boolean;

  [key: string]: unknown;
};

let priceCache:
  | {
      price: number;
      fetchedAt: number;
    }
  | null = null;

function env(name: string): string {
  return String(process.env[name] || "").trim();
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
    Math.round(value * factor) / factor
  );
}

function numberValue(
  value: unknown
): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function faNumber(
  value: number,
  digits = 2
): string {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function money(value: number): string {
  return `$${faNumber(value, 2)}`;
}

function priceText(value: number): string {
  return faNumber(value, 2);
}

function tomans(value: number): string {
  return `${faNumber(value, 0)} تومان`;
}

function sessionName(
  date = new Date()
): string {
  const hour = date.getUTCHours();

  if (hour >= 22 || hour < 6) {
    return "Sydney";
  }

  if (hour >= 6 && hour < 9) {
    return "Tokyo";
  }

  if (hour >= 7 && hour < 16) {
    return "London";
  }

  if (hour >= 13 && hour < 22) {
    return "New York";
  }

  return "Tokyo";
}

function telegramConfig() {
  return {
    token: env("TELEGRAM_BOT_TOKEN"),
    chatId: env(
      "TELEGRAM_SIGNAL_CHAT_ID"
    ),
  };
}

async function telegramRequest(
  method: string,
  body: Record<string, unknown>
) {
  const config = telegramConfig();

  if (
    !config.token ||
    !config.chatId
  ) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN یا TELEGRAM_SIGNAL_CHAT_ID تنظیم نشده است."
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.token}/${method}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (
    !response.ok ||
    data?.ok !== true
  ) {
    throw new Error(
      `Telegram error: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function sendTelegram(
  text: string
) {
  const config = telegramConfig();

  return telegramRequest(
    "sendMessage",
    {
      chat_id: config.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }
  );
}

function tdApiKey(): string {
  const key = env(
    "TWELVE_DATA_API_KEY"
  );

  if (!key) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables تنظیم نشده است."
    );
  }

  return key;
}

async function td(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  const url = new URL(
    `${TWELVE_DATA_URL}/${endpoint}`
  );

  Object.entries({
    ...params,
    apikey: tdApiKey(),
  }).forEach(([key, value]) => {
    url.searchParams.set(
      key,
      value
    );
  });

  const response = await fetch(
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
      `Twelve Data HTTP ${response.status}: ${JSON.stringify(data)}`
    );
  }

  if (
    data?.status === "error" ||
    data?.code ||
    data?.message
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

async function candles(
  interval: string,
  outputsize = 120
): Promise<Candle[]> {
  const data = await td(
    "time_series",
    {
      symbol: SYMBOL,
      interval,
      outputsize: String(
        outputsize
      ),
    }
  );

  if (
    !Array.isArray(data?.values)
  ) {
    throw new Error(
      `داده کندل ${interval} از Twelve Data دریافت نشد.`
    );
  }

  return data.values
    .map((item: any) => ({
      datetime: String(
        item.datetime
      ),
      open: numberValue(
        item.open
      ),
      high: numberValue(
        item.high
      ),
      low: numberValue(
        item.low
      ),
      close: numberValue(
        item.close
      ),
      volume: numberValue(
        item.volume
      ),
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0
    )
    .reverse();
}

async function latestPrice(): Promise<number> {
  const data = await td(
    "price",
    {
      symbol: SYMBOL,
    }
  );

  const price = numberValue(
    data?.price
  );

  if (price <= 0) {
    throw new Error(
      "قیمت فعلی XAU/USD از Twelve Data دریافت نشد."
    );
  }

  return price;
}

async function latestPriceCached(): Promise<number> {
  const now = Date.now();

  if (
    priceCache &&
    now - priceCache.fetchedAt <
      PRICE_SNAPSHOT_MAX_AGE_MS
  ) {
    return priceCache.price;
  }

  const price =
    await latestPrice();

  priceCache = {
    price,
    fetchedAt: now,
  };

  return price;
}

function sma(
  values: number[],
  period: number
): number {
  if (values.length < period) {
    return values.length
      ? values.reduce(
          (a, b) => a + b,
          0
        ) / values.length
      : 0;
  }

  const slice =
    values.slice(-period);

  return (
    slice.reduce(
      (a, b) => a + b,
      0
    ) / slice.length
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

  let result = values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result =
      (values[i] - result) *
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

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const diff =
      values[i] -
      values[i - 1];

    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let averageGain =
    gains / period;

  let averageLoss =
    losses / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const diff =
      values[i] -
      values[i - 1];

    const gain = Math.max(
      diff,
      0
    );

    const loss = Math.max(
      -diff,
      0
    );

    averageGain =
      (averageGain *
        (period - 1) +
        gain) /
      period;

    averageLoss =
      (averageLoss *
        (period - 1) +
        loss) /
      period;
  }

  if (
    averageLoss === 0
  ) {
    return 100;
  }

  const rs =
    averageGain /
    averageLoss;

  return (
    100 -
    100 / (1 + rs)
  );
}

function atr(
  candlesData: Candle[],
  period = 14
): number {
  if (
    candlesData.length < 2
  ) {
    return 0;
  }

  const trs: number[] = [];

  for (
    let i = 1;
    i < candlesData.length;
    i++
  ) {
    const current =
      candlesData[i];

    const previous =
      candlesData[i - 1];

    const tr = Math.max(
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

    trs.push(tr);
  }

  return sma(trs, period);
}

function macd(values: number[]) {
  const fast =
    ema(values, 12);

  const slow =
    ema(values, 26);

  const line =
    fast - slow;

  return {
    line,
    bullish: line > 0,
    bearish: line < 0,
  };
}

function candleBias(
  data: Candle[]
): string {
  if (data.length < 3) {
    return "NEUTRAL";
  }

  const a =
    data[data.length - 1];

  const b =
    data[data.length - 2];

  const body =
    a.close - a.open;

  const previousBody =
    b.close - b.open;

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
    a.close > b.high
  ) {
    return "BULLISH_BREAK";
  }

  if (
    body < 0 &&
    a.close < b.low
  ) {
    return "BEARISH_BREAK";
  }

  return "NEUTRAL";
}

function swings(
  data: Candle[]
) {
  if (!data.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  const recent =
    data.slice(-60);

  const support =
    Math.min(
      ...recent.map(
        (c) => c.low
      )
    );

  const resistance =
    Math.max(
      ...recent.map(
        (c) => c.high
      )
    );

  return {
    support,
    resistance,
  };
}

function trendScore(
  data: Candle[]
) {
  const closes =
    data.map(
      (c) => c.close
    );

  const price =
    closes.at(-1) || 0;

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const currentRsi =
    rsi(closes);

  const currentMacd =
    macd(closes);

  let score = 0;

  let direction:
    | "BUY"
    | "SELL"
    | null = null;

  if (
    price > ema20 &&
    ema20 > ema50 &&
    currentRsi >= 52 &&
    currentMacd.bullish
  ) {
    score = 100;
    direction = "BUY";
  } else if (
    price < ema20 &&
    ema20 < ema50 &&
    currentRsi <= 48 &&
    currentMacd.bearish
  ) {
    score = 100;
    direction = "SELL";
  } else if (
    price > ema20 &&
    currentRsi >= 50
  ) {
    score = 60;
    direction = "BUY";
  } else if (
    price < ema20 &&
    currentRsi <= 50
  ) {
    score = 60;
    direction = "SELL";
  }

  return {
    score,
    direction,
    price,
    ema20,
    ema50,
    rsi: currentRsi,
    macd: currentMacd.line,
  };
}

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[],
  currentPrice: number
): MarketAnalysis {
  const t5 =
    trendScore(m5);

  const t15 =
    trendScore(m15);

  const t1h =
    trendScore(h1);

  const t1 =
    trendScore(m1);

  const trends = [
    t5.direction,
    t15.direction,
    t1h.direction,
  ].filter(Boolean);

  let direction:
    | "BUY"
    | "SELL"
    | null = null;

  const buys =
    trends.filter(
      (x) => x === "BUY"
    ).length;

  const sells =
    trends.filter(
      (x) => x === "SELL"
    ).length;

  if (buys >= 2) {
    direction = "BUY";
  }

  if (sells >= 2) {
    direction = "SELL";
  }

  const m5Swings =
    swings(m5);

  const support =
    m5Swings.support;

  const resistance =
    m5Swings.resistance;

  const atrValue =
    atr(m5);

  const latestM5 =
    m5.at(-1);

  const bias =
    candleBias(m5);

  const nearDistance =
    Math.max(
      atrValue * 1.75,
      4
    );

  const nearSupport =
    currentPrice >= support &&
    currentPrice - support <=
      nearDistance;

  const nearResistance =
    currentPrice <= resistance &&
    resistance - currentPrice <=
      nearDistance;

  const nearLevel =
    direction === "BUY"
      ? nearSupport
      : direction === "SELL"
        ? nearResistance
        : nearSupport ||
          nearResistance;

  const volumeAverage =
    sma(
      m5
        .slice(-30)
        .map(
          (c) => c.volume
        ),
      20
    );

  const volumeOk =
    volumeAverage > 0 &&
    (latestM5?.volume || 0) >=
      volumeAverage * 0.9;

  const momentumRsi =
    t5.rsi;

  const momentum =
    direction === "BUY"
      ? momentumRsi >= 52
        ? "BULLISH"
        : "WEAK"
      : direction === "SELL"
        ? momentumRsi <= 48
          ? "BEARISH"
          : "WEAK"
        : "NEUTRAL";

  const momentumOk =
    direction === "BUY"
      ? momentumRsi >= 52
      : direction === "SELL"
        ? momentumRsi <= 48
        : false;

  const emaOk =
    direction === "BUY"
      ? t5.price >
        t5.ema20
      : direction === "SELL"
        ? t5.price <
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
      ? buys >= 2
      : direction === "SELL"
        ? sells >= 2
        : false;

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

  const structureOk =
    support > 0 &&
    resistance > 0 &&
    resistance > support;

  let score = 0;

  if (direction) {
    if (mtfOk) {
      score += 25;
    }

    if (
      t1.direction ===
      direction
    ) {
      score += 10;
    }

    if (
      t15.direction ===
        direction &&
      t1h.direction ===
        direction
    ) {
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
      Math.round(score),
      95
    );

  const confirmations = [
    mtfOk,
    t1.direction ===
      direction,
    t15.direction ===
        direction &&
      t1h.direction ===
        direction,
    nearLevel,
    candleOk,
    volumeOk,
    momentumOk,
    emaOk,
    structureOk,
    pullbackOk,
  ].filter(Boolean).length;

  return {
    direction,
    score: finalScore,
    confirmations,
    support,
    resistance,
    atr: atrValue,
    trend:
      direction === "BUY"
        ? "BULLISH"
        : direction === "SELL"
          ? "BEARISH"
          : "NEUTRAL",
    candleBias: bias,
    momentum,
    volumeOk,
    emaOk,
    structureOk,
    nearLevel,
    mtfOk,
    pullbackOk,
    analysis: {
      m1: {
        direction:
          t1.direction,
        rsi: round(
          t1.rsi,
          2
        ),
        ema20: round(
          t1.ema20,
          2
        ),
        ema50: round(
          t1.ema50,
          2
        ),
      },

      m5: {
        direction:
          t5.direction,
        rsi: round(
          t5.rsi,
          2
        ),
        ema20: round(
          t5.ema20,
          2
        ),
        ema50: round(
          t5.ema50,
          2
        ),
        macd: round(
          t5.macd,
          4
        ),
      },

      m15: {
        direction:
          t15.direction,
        rsi: round(
          t15.rsi,
          2
        ),
        ema20: round(
          t15.ema20,
          2
        ),
        ema50: round(
          t15.ema50,
          2
        ),
      },

      h1: {
        direction:
          t1h.direction,
        rsi: round(
          t1h.rsi,
          2
        ),
        ema20: round(
          t1h.ema20,
          2
        ),
        ema50: round(
          t1h.ema50,
          2
        ),
      },

      support:
        round(support, 2),

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

      currentPrice:
        round(
          currentPrice,
          2
        ),
    },
  };
}

async function getUsdToTomanRate(): Promise<number> {
  const apiKey =
    env("NETARZ_API_KEY");

  if (!apiKey) {
    throw new Error(
      "برای تبدیل واقعی دلار به تومان، NETARZ_API_KEY را در Render اضافه کنید."
    );
  }

  const response =
    await fetch(
      NETARZ_URL,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
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
      `NetArz HTTP ${response.status}: ${JSON.stringify(data)}`
    );
  }

  const rows =
    Array.isArray(data?.data)
      ? data.data
      : [];

  const usdRow =
    rows.find(
      (row: any) =>
        String(
          row?.code || ""
        ).toUpperCase() ===
        "USD"
    );

  const rate =
    numberValue(
      usdRow?.mid ??
        data?.meta?.usd_irt ??
        data?.usd_irt
    );

  if (rate <= 0) {
    throw new Error(
      "نرخ USD/IRT معتبر از NetArz دریافت نشد."
    );
  }

  return rate;
}

async function newsBlock() {
  const minutes =
    Number(
      process.env.AI_NEWS_BLOCK_MINUTES ||
        DEFAULT_NEWS_MINUTES
    );

  const importance =
    Number(
      process.env.AI_NEWS_BLOCK_IMPORTANCE ||
        DEFAULT_NEWS_IMPORTANCE
    );

  try {
    const now =
      new Date();

    const from =
      new Date(
        now.getTime() -
          minutes *
            60 *
            1000
      );

    const to =
      new Date(
        now.getTime() +
          minutes *
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
          numberValue(
            event?.importance
          ) >= importance
      );

    if (
      !important.length
    ) {
      return {
        blocked: false,
        events: [],
      };
    }

    return {
      blocked: true,

      events:
        important.map(
          (event: any) => ({
            title:
              event?.title ||
              event?.name ||
              "Economic Event",

            currency:
              event?.currency ||
              "",

            importance:
              numberValue(
                event?.importance
              ),

            eventTime:
              event?.eventTime ||
              null,
          })
        ),
    };
  } catch {
    return {
      blocked: false,
      events: [],
    };
  }
}

function buildSignalTelegram(
  meta: RunMeta
): string {
  const direction =
    meta.direction ===
    "BUY"
      ? "🟢 BUY"
      : "🔴 SELL";

  const entryMin =
    meta.entryMin ??
    ((meta.entry || 0) -
      ENTRY_TOLERANCE);

  const entryMax =
    meta.entryMax ??
    ((meta.entry || 0) +
      ENTRY_TOLERANCE);

  return [
    "━━━━━━━━━━━━━━━━━━",
    "🤖 <b>AI GOLD SIGNAL</b>",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `🪙 نماد: <b>${DISPLAY_SYMBOL}</b>`,
    `📊 جهت: <b>${direction}</b>`,
    `⏱ تایم‌فریم: <b>${
      meta.timeframe || "MTF"
    }</b>`,
    `🌍 سشن: <b>${
      meta.session || "-"
    }</b>`,
    "",
    `🎯 Entry: <b>${priceText(
      meta.entry || 0
    )}</b>`,
    `📌 محدوده مجاز ورود: <b>${priceText(
      entryMin
    )} تا ${priceText(
      entryMax
    )}</b>`,
    "",
    `🛑 Stop Loss: <b>${priceText(
      meta.stopLoss || 0
    )}</b>`,
    `🥇 TP1: <b>${priceText(
      meta.tp1 || 0
    )}</b>`,
    `🥈 TP2: <b>${priceText(
      meta.tp2 || 0
    )}</b>`,
    `🥉 TP3: <b>${priceText(
      meta.tp3 || 0
    )}</b>`,
    "",
    `📦 حجم کل: <b>${(
      meta.totalLot || 0
    ).toFixed(2)} lot</b>`,
    `• TP1: ${(
      meta.tp1Lot || 0
    ).toFixed(2)} lot`,
    `• TP2: ${(
      meta.tp2Lot || 0
    ).toFixed(2)} lot`,
    `• TP3: ${(
      meta.tp3Lot || 0
    ).toFixed(2)} lot`,
    "",
    `💰 ریسک اولیه: <b>${money(
      meta.riskUsd || 0
    )}</b>`,
    `💵 TP1: <b>+${money(
      meta.tp1Usd || 0
    )}</b>`,
    `💵 TP2: <b>+${money(
      meta.tp2Usd || 0
    )}</b>`,
    `💵 TP3: <b>+${money(
      meta.tp3Usd || 0
    )}</b>`,
    `💎 پتانسیل کل: <b>+${money(
      meta.totalPotentialUsd || 0
    )}</b>`,
    "",
    `📈 Score: <b>${
      meta.score || 0
    }/100</b>`,
    `✅ Confirmations: <b>${
      meta.confirmations || 0
    }</b>`,
    "",
    "⚠️ <b>محدوده ورود فقط Entry ± $1 است.</b>",
    "⚠️ خارج از این محدوده، ورود بر عهده کاربر است.",
    "",
    "🤖 این تحلیل توسط موتور تحلیل AI پلتفرم تولید شده و تضمین سود نیست.",
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

function buildEventTelegram(
  type: string,
  meta: RunMeta,
  price: number,
  pnlUsd: number,
  pnlToman: number
): string {
  if (type === "TP1") {
    return [
      "━━━━━━━━━━━━━━━━━━",
      "🥇 <b>TP1 HIT — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 سود TP1: <b>+${money(
        pnlUsd
      )}</b>`,
      `🇮🇷 سود تقریبی: <b>+${tomans(
        pnlToman
      )}</b>`,
      "",
      "📦 مقدار بسته‌شده: <b>0.04 lot</b>",
      "🛡 پیشنهاد: حد ضرر باقی‌مانده به Entry منتقل شود.",
      "📌 حجم باقی‌مانده: <b>0.06 lot</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (type === "TP2") {
    return [
      "━━━━━━━━━━━━━━━━━━",
      "🥈 <b>TP2 HIT — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 سود TP2: <b>+${money(
        pnlUsd
      )}</b>`,
      `🇮🇷 سود تقریبی: <b>+${tomans(
        pnlToman
      )}</b>`,
      "",
      "📦 مقدار بسته‌شده: <b>0.03 lot</b>",
      "📌 حجم باقی‌مانده: <b>0.03 lot</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (type === "TP3") {
    return [
      "━━━━━━━━━━━━━━━━━━",
      "🥉 <b>TP3 HIT — TRADE COMPLETE</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 سود TP3: <b>+${money(
        pnlUsd
      )}</b>`,
      `🇮🇷 سود تقریبی: <b>+${tomans(
        pnlToman
      )}</b>`,
      "",
      "📦 مقدار بسته‌شده: <b>0.03 lot</b>",
      `💎 مجموع سود برنامه: <b>+${money(
        TP1_USD +
          TP2_USD +
          TP3_USD
      )}</b>`,
      "",
      "✅ معامله طبق برنامه TP1 → TP2 → TP3 تکمیل شد.",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (type === "BE") {
    return [
      "━━━━━━━━━━━━━━━━━━",
      "🛡 <b>BREAK EVEN — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      "📌 قیمت به Entry برگشت.",
      "",
      "🟡 باقی‌مانده معامله در نقطه سر‌به‌سر بسته شد.",
      "💵 سود/زیان این بخش: <b>$0</b>",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  if (type === "SL") {
    return [
      "━━━━━━━━━━━━━━━━━━",
      "🛑 <b>STOP LOSS — XAUUSD</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `💰 قیمت: <b>${priceText(
        price
      )}</b>`,
      `💵 زیان برنامه‌ریزی‌شده: <b>-${money(
        Math.abs(pnlUsd)
      )}</b>`,
      `🇮🇷 معادل: <b>-${tomans(
        Math.abs(pnlToman)
      )}</b>`,
      "",
      "⚠️ معامله بسته شد و سیستم منتظر ستاپ جدید می‌ماند.",
      "",
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  return "";
}

async function activeRun() {
  return prisma.analysisRun.findFirst(
    {
      where: {
        symbol: DISPLAY_SYMBOL,

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

function eventPnl(
  type: string,
  meta: RunMeta
) {
  if (type === "TP1") {
    return {
      lotClosed:
        TP1_LOT,
      pnlUsd:
        TP1_USD,
    };
  }

  if (type === "TP2") {
    return {
      lotClosed:
        TP2_LOT,
      pnlUsd:
        TP2_USD,
    };
  }

  if (type === "TP3") {
    return {
      lotClosed:
        TP3_LOT,
      pnlUsd:
        TP3_USD,
    };
  }

  if (type === "BE") {
    const state =
      String(
        meta.state || ""
      );

    return {
      lotClosed:
        state === "AI_TP2"
          ? TP3_LOT
          : TOTAL_LOT -
            TP1_LOT,

      pnlUsd: 0,
    };
  }

  return {
    lotClosed:
      TOTAL_LOT,

    pnlUsd:
      -RISK_USD,
  };
}

async function pushTradeEvent(
  run: any,
  type: string,
  price: number
) {
  const meta =
    (run.metadata ||
      {}) as RunMeta;

  const fx =
    await getUsdToTomanRate();

  const pnl =
    eventPnl(
      type,
      meta
    );

  const pnlToman =
    pnl.pnlUsd * fx;

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
      round(price, 2),

    lotClosed:
      pnl.lotClosed,

    pnlUsd:
      round(
        pnl.pnlUsd,
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

  if (type === "TP1") {
    status = "AI_TP1";
    state = "AI_TP1";
  }

  if (type === "TP2") {
    status = "AI_TP2";
    state = "AI_TP2";
  }

  if (type === "TP3") {
    status = "AI_TP3";
    state = "AI_TP3";
  }

  if (type === "BE") {
    status = "AI_BE";
    state = "AI_BE";
    breakeven = true;
  }

  if (type === "SL") {
    status = "AI_SL";
    state = "AI_SL";
  }

  const updatedMeta:
    RunMeta = {
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
            : run.finishedAt,
      },
    }
  );

  const telegramText =
    buildEventTelegram(
      type,
      updatedMeta,
      price,
      pnl.pnlUsd,
      pnlToman
    );

  if (telegramText) {
    try {
      await sendTelegram(
        telegramText
      );
    } catch (error) {
      console.error(
        "Telegram event delivery failed:",
        error
      );
    }
  }
}

async function monitorOne(
  run: any
) {
  const meta =
    (run.metadata ||
      {}) as RunMeta;

  if (
    !meta.entry ||
    !meta.direction
  ) {
    return {
      monitored: false,
      reason:
        "invalid_run",
    };
  }

  const price =
    await latestPriceCached();

  const direction =
    meta.direction;

  const entry =
    numberValue(
      meta.entry
    );

  const entryMin =
    numberValue(
      meta.entryMin ??
        entry -
          ENTRY_TOLERANCE
    );

  const entryMax =
    numberValue(
      meta.entryMax ??
        entry +
          ENTRY_TOLERANCE
    );

  let entryActivated =
    Boolean(
      meta.entryActivated
    );

  if (!entryActivated) {
    const insideEntryZone =
      price >= entryMin &&
      price <= entryMax;

    if (
      !insideEntryZone
    ) {
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

              entryMin,

              entryMax,

              entryActivated:
                false,
            } as any,
          },
        }
      );

      return {
        monitored: true,
        activated: false,
        currentPrice:
          price,
      };
    }

    entryActivated =
      true;

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

            entryMin,

            entryMax,

            entryActivated:
              true,
          } as any,
        },
      }
    );
  }

  const stopLoss =
    numberValue(
      meta.stopLoss
    );

  const tp1 =
    numberValue(
      meta.tp1
    );

  const tp2 =
    numberValue(
      meta.tp2
    );

  const tp3 =
    numberValue(
      meta.tp3
    );

  const state =
    String(
      meta.state ||
        run.status
    );

  if (
    direction ===
    "BUY"
  ) {
    if (
      price <=
      stopLoss
    ) {
      await pushTradeEvent(
        run,
        "SL",
        price
      );

      return {
        monitored: true,
        event: "SL",
        price,
      };
    }
  } else {
    if (
      price >=
      stopLoss
    ) {
      await pushTradeEvent(
        run,
        "SL",
        price
      );

      return {
        monitored: true,
        event: "SL",
        price,
      };
    }
  }

  if (
    state ===
      "AI_PENDING" &&
    (
      direction ===
      "BUY"
        ? price >= tp1
        : price <= tp1
    )
  ) {
    await pushTradeEvent(
      run,
      "TP1",
      price
    );

    return {
      monitored: true,
      event: "TP1",
      price,
    };
  }

  if (
    state ===
      "AI_TP1" &&
    (
      direction ===
      "BUY"
        ? price <= entry
        : price >= entry
    )
  ) {
    await pushTradeEvent(
      run,
      "BE",
      price
    );

    return {
      monitored: true,
      event: "BE",
      price,
    };
  }

  if (
    (
      state ===
        "AI_TP1" ||
      state ===
        "AI_BE"
    ) &&
    (
      direction ===
      "BUY"
        ? price >= tp2
        : price <= tp2
    )
  ) {
    await pushTradeEvent(
      run,
      "TP2",
      price
    );

    return {
      monitored: true,
      event: "TP2",
      price,
    };
  }

  if (
    state ===
      "AI_TP2" &&
    (
      direction ===
      "BUY"
        ? price <= entry
        : price >= entry
    )
  ) {
    await pushTradeEvent(
      run,
      "BE",
      price
    );

    return {
      monitored: true,
      event: "BE",
      price,
    };
  }

  if (
    (
      state ===
        "AI_TP2" ||
      state ===
        "AI_BE"
    ) &&
    (
      direction ===
      "BUY"
        ? price >= tp3
        : price <= tp3
    )
  ) {
    await pushTradeEvent(
      run,
      "TP3",
      price
    );

    return {
      monitored: true,
      event: "TP3",
      price,
    };
  }

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

          entryActivated,
        } as any,
      },
    }
  );

  return {
    monitored: true,
    event: null,
    price,
  };
}

function sessionEndReached(
  date = new Date()
): string | null {
  const hour =
    date.getUTCHours();

  const minute =
    date.getUTCMinutes();

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

async function sessionReport(
  session: string
) {
  const now =
    new Date();

  const start =
    new Date(
      now.getTime() -
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
            gte: start,
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },

        take: 100,
      }
    );

  let totalPnlUsd = 0;
  let wins = 0;
  let losses = 0;
  let completed = 0;

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
        numberValue(
          event.pnlUsd
        );
    }

    totalPnlUsd +=
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

    if (
      row.status ===
        "AI_TP3" ||
      row.status ===
        "AI_SL" ||
      row.status ===
        "AI_BE"
    ) {
      completed++;
    }
  }

  const fx =
    await getUsdToTomanRate();

  const totalPnlToman =
    totalPnlUsd * fx;

  const text = [
    "━━━━━━━━━━━━━━━━━━",
    `📊 <b>گزارش سشن ${session}</b>`,
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📈 معاملات: <b>${rows.length}</b>`,
    `✅ معاملات مثبت: <b>${wins}</b>`,
    `❌ معاملات منفی: <b>${losses}</b>`,
    `📌 بسته‌شده: <b>${completed}</b>`,
    "",
    `💵 P/L: <b>${
      totalPnlUsd >= 0
        ? "+"
        : ""
    }${money(
      totalPnlUsd
    )}</b>`,
    `🇮🇷 تومان: <b>${
      totalPnlToman >= 0
        ? "+"
        : "-"
    }${tomans(
      Math.abs(
        totalPnlToman
      )
    )}</b>`,
    `💱 USD: <b>${faNumber(
      fx,
      0
    )}</b>`,
    "",
    "━━━━━━━━━━━━━━━━━━",
  ].join("\n");

  try {
    await sendTelegram(
      text
    );
  } catch (error) {
    console.error(
      "Session report Telegram error:",
      error
    );
  }

  await prisma.analysisRun.create(
    {
      data: {
        symbol:
          DISPLAY_SYMBOL,

        timeframe:
          "SESSION",

        status:
          "SESSION_REPORT",

        signalGenerated:
          false,

        metadata: {
          kind:
            "SESSION_REPORT",

          session,

          totalPnlUsd:
            round(
              totalPnlUsd,
              2
            ),

          totalPnlToman:
            round(
              totalPnlToman,
              0
            ),

          usdToToman:
            round(
              fx,
              0
            ),

          wins,
          losses,
          completed,
        } as any,
      },
    }
  );
}

async function createNoTradeRun(
  reason: string,
  price: number,
  analysis?: MarketAnalysis
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
        } as any,
      },
    }
  );
}

async function scan() {
  const existing =
    await activeRun();

  if (existing) {
    return {
      action:
        "monitor",

      runId:
        existing.id,
    };
  }

  let currentPrice =
    0;

  try {
    currentPrice =
      await latestPriceCached();
  } catch (error) {
    console.error(
      "Could not get XAUUSD price:",
      error
    );

    return {
      action:
        "error",

      reason:
        "price_unavailable",
    };
  }

  const news =
    await newsBlock();

  if (
    news.blocked
  ) {
    await createNoTradeRun(
      "high_impact_news",
      currentPrice
    );

    return {
      action:
        "no_trade",

      reason:
        "high_impact_news",

      currentPrice,
    };
  }

  const [
    m1,
    m5,
    m15,
    h1,
  ] =
    await Promise.all([
      candles(
        "1min",
        120
      ),

      candles(
        "5min",
        160
      ),

      candles(
        "15min",
        160
      ),

      candles(
        "1h",
        160
      ),
    ]);

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
    await createNoTradeRun(
      "no_direction",
      currentPrice,
      analysis
    );

    return {
      action:
        "no_trade",

      reason:
        "no_direction",

      score:
        analysis.score,

      currentPrice,
    };
  }

  if (
    analysis.score <
    SCORE_TO_SIGNAL
  ) {
    await createNoTradeRun(
      "score_below_threshold",
      currentPrice,
      analysis
    );

    return {
      action:
        "no_trade",

      reason:
        "score_below_threshold",

      score:
        analysis.score,

      required:
        SCORE_TO_SIGNAL,

      currentPrice,
    };
  }

  if (
    analysis.confirmations <
    MIN_CONFIRMATIONS
  ) {
    await createNoTradeRun(
      "not_enough_confirmations",
      currentPrice,
      analysis
    );

    return {
      action:
        "no_trade",

      reason:
        "not_enough_confirmations",

      confirmations:
        analysis.confirmations,

      currentPrice,
    };
  }

  const entry =
    round(
      currentPrice,
      2
    );

  const direction =
    analysis.direction;

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
   * به جای فیلتر سخت فاصله از حمایت/مقاومت،
   * بررسی می‌کنیم که تا TP3 فضای کافی وجود داشته باشد.
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
      analysis.atr *
        0.25
    );

  if (
    roomToTarget <=
    requiredRoom
  ) {
    await createNoTradeRun(
      "not_enough_room_to_tp3",
      currentPrice,
      analysis
    );

    return {
      action:
        "no_trade",

      reason:
        "not_enough_room_to_tp3",

      roomToTarget:
        round(
          roomToTarget,
          2
        ),

      requiredRoom:
        round(
          requiredRoom,
          2
        ),

      currentPrice,
    };
  }

  const fx =
    await getUsdToTomanRate();

  const entryMin =
    round(
      entry -
        ENTRY_TOLERANCE,
      2
    );

  const entryMax =
    round(
      entry +
        ENTRY_TOLERANCE,
      2
    );

  const meta:
    RunMeta = {
      kind:
        "AI_SIGNAL",

      symbol:
        DISPLAY_SYMBOL,

      direction,

      entry,

      entryMin,

      entryMax,

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
        round(
          analysis.support,
          2
        ),

      resistance:
        round(
          analysis.resistance,
          2
        ),

      events: [],

      analysis:
        analysis.analysis,
    };

  const run =
    await prisma.analysisRun.create(
      {
        data: {
