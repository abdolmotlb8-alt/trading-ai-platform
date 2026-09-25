import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   AI XAUUSD ENGINE
   ---------------------------------------------------------
   REAL MARKET DATA
   REAL SIGNAL STORAGE
   REAL TELEGRAM EVENTS
   REAL TP / SL MONITORING
   REAL BREAK-EVEN MANAGEMENT
   REAL PERFORMANCE
   REAL USD/TOMan conversion
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.10;

/*
  برای رسیدن دقیق به +80 دلار:
  TP1 = 0.04 × $5 / 0.01 = $20
  TP2 = 0.03 × $8 / 0.01 = $24
  TP3 = 0.03 × $12 / 0.01 = $36
*/
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_USD = 40;

const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_POTENTIAL_USD = 80;

/*
  با قرارداد 100oz:
  0.10 lot × 100 = 10oz
  $40 / 10 = $4 price distance
*/
const STOP_DISTANCE = 4;

const TP1_DISTANCE = 5;
const TP2_DISTANCE = 8;
const TP3_DISTANCE = 12;

/* تحلیل */
const SIGNAL_SCORE_MIN = 70;
const SIGNAL_CONFIRMATIONS_MIN = 3;

/* جلوگیری از صدور سیگنال‌های پشت سرهم */
const MIN_SIGNAL_COOLDOWN_MINUTES = 15;

/* خبر مهم */
const NEWS_BLOCK_MINUTES = 30;

/* API */
const TD_KEY = process.env.TWELVE_DATA_API_KEY;
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
  | "Sydney"
  | "Tokyo"
  | "London"
  | "New York";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type EventType =
  | "TP1"
  | "TP2"
  | "TP3"
  | "SL"
  | "BREAKEVEN";

type EventRecord = {
  id: string;
  type: EventType;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
  telegramSent: boolean;
  telegramMessageId?: string;
  telegramError?: string;
};

type SignalMeta = {
  kind: "AI_XAUUSD_SIGNAL";

  symbol: string;
  direction: Direction;

  entry: number;
  stopLoss: number;

  tp1: number;
  tp2: number;
  tp3: number;

  totalLot: number;

  tp1Lot: number;
  tp2Lot: number;
  tp3Lot: number;

  riskUsd: number;

  tp1Usd: number;
  tp2Usd: number;
  tp3Usd: number;

  totalPotentialUsd: number;

  usdToToman: number;
  usdToTomanAsOf: string;

  riskToman: number;
  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  totalPotentialToman: number;

  session: SessionName;
  sessionFa: string;
  sessionFlag: string;

  iranTime: string;

  timeframe: string;

  score: number;
  confirmations: number;

  reasons: string[];

  support: number;
  resistance: number;

  currentPrice: number;

  /*
    WAITING
    TP1
    TP2
    TP3
    SL
    BREAKEVEN
  */
  state:
    | "WAITING"
    | "TP1"
    | "TP2"
    | "TP3"
    | "SL"
    | "BREAKEVEN";

  /*
    بعد TP1:
    true => SL باقی‌مانده روی Entry
  */
  riskFreeActive: boolean;

  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;

  closed: boolean;

  events: EventRecord[];

  analysis: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;

  telegramInitialSent: boolean;
  telegramInitialMessageId?: string;
  telegramInitialError?: string;

  /*
    اگر یک کندل هم TP و هم SL را لمس کند،
    ترتیب داخل OHLC مشخص نیست.
    سیستم محافظه‌کارانه SL را مقدم می‌کند.
  */
  candleAmbiguous?: boolean;
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function num(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(n) ? n : 0;
}

function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))}`;
}

function formatToman(value: number): string {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${new Intl.NumberFormat("fa-IR").format(
    Math.round(Math.abs(value))
  )} تومان`;
}

function formatPrice(value: number): string {
  return Number(value).toFixed(2);
}

function formatLot(value: number): string {
  return value.toFixed(2);
}

function iranDateTime(date = new Date()): string {
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
   FOREX SESSION
   ========================================================= */

function getSessionInfo(date = new Date()) {
  const utcHour = date.getUTCHours();

  /*
    این محدوده‌ها برای نمایش/طبقه‌بندی هستند.
    تحلیل اصلی بر اساس داده بازار انجام می‌شود.
  */

  if (utcHour >= 13 && utcHour < 22) {
    return {
      name: "New York" as SessionName,
      fa: "نیویورک",
      flag: "🇺🇸",
    };
  }

  if (utcHour >= 7 && utcHour < 16) {
    return {
      name: "London" as SessionName,
      fa: "لندن",
      flag: "🇬🇧",
    };
  }

  if (utcHour >= 0 && utcHour < 9) {
    return {
      name: "Tokyo" as SessionName,
      fa: "توکیو",
      flag: "🇯🇵",
    };
  }

  return {
    name: "Sydney" as SessionName,
    fa: "سیدنی",
    flag: "🇦🇺",
  };
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(url: string) {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Render تنظیم نشده است."
    );
  }

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(TD_KEY)}`;

  const response = await fetch(full, {
    cache: "no-store",
  });

  const data = await response.json();

  if (
    !response.ok ||
    data?.status === "error" ||
    data?.code
  ) {
    throw new Error(
      data?.message ||
        `Twelve Data error ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   CANDLES
   ========================================================= */

async function getCandles(
  interval: string,
  outputsize: number
): Promise<Candle[]> {
  const data = await twelveData(
    `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(SYMBOL)}` +
      `&interval=${encodeURIComponent(interval)}` +
      `&outputsize=${outputsize}` +
      `&order=ASC` +
      `&timezone=UTC`
  );

  if (!Array.isArray(data?.values)) {
    throw new Error(
      `داده کندل ${interval} دریافت نشد.`
    );
  }

  return data.values
    .map((item: any) => ({
      datetime: String(item.datetime),
      open: num(item.open),
      high: num(item.high),
      low: num(item.low),
      close: num(item.close),
      volume: num(item.volume),
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0
    )
    .sort((a, b) =>
      a.datetime.localeCompare(b.datetime)
    );
}

/* =========================================================
   LIVE PRICE
   ========================================================= */

async function getLivePrice(): Promise<number> {
  const data = await twelveData(
    `https://api.twelvedata.com/price` +
      `?symbol=${encodeURIComponent(SYMBOL)}`
  );

  const price = num(data?.price);

  if (!price) {
    throw new Error(
      "قیمت لحظه‌ای XAU/USD دریافت نشد."
    );
  }

  return price;
}

/* =========================================================
   INDICATORS
   ========================================================= */

function sma(
  values: number[],
  period: number
): number {
  if (!values.length) return 0;

  const slice =
    values.length < period
      ? values
      : values.slice(-period);

  return (
    slice.reduce((sum, value) => sum + value, 0) /
    slice.length
  );
}

function ema(
  values: number[],
  period: number
): number {
  if (!values.length) return 0;

  const k = 2 / (period + 1);

  let result = values[0];

  for (let i = 1; i < values.length; i++) {
    result =
      values[i] * k +
      result * (1 - k);
  }

  return result;
}

function calculateRsi(
  values: number[],
  period = 14
): number {
  if (values.length <= period) return 50;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const diff =
      values[i] - values[i - 1];

    if (diff >= 0) {
      gain += diff;
    } else {
      loss -= diff;
    }
  }

  gain /= period;
  loss /= period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const diff =
      values[i] - values[i - 1];

    const g = Math.max(diff, 0);
    const l = Math.max(-diff, 0);

    gain =
      (gain * (period - 1) + g) /
      period;

    loss =
      (loss * (period - 1) + l) /
      period;
  }

  if (loss === 0) return 100;

  const rs = gain / loss;

  return 100 - 100 / (1 + rs);
}

function calculateAtr(
  candles: Candle[],
  period = 14
): number {
  if (candles.length < period + 1) {
    return 0;
  }

  const values: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    values.push(
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

  return sma(values, period);
}

function calculateMacd(
  values: number[]
): number {
  return (
    ema(values, 12) -
    ema(values, 26)
  );
}

function getSwingLevels(
  candles: Candle[],
  lookback = 30
) {
  const slice =
    candles.slice(-lookback);

  if (!slice.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  return {
    support: Math.min(
      ...slice.map((x) => x.low)
    ),
    resistance: Math.max(
      ...slice.map((x) => x.high)
    ),
  };
}

/* =========================================================
   CANDLE CONFIRMATION
   ========================================================= */

function candleDirection(
  candles: Candle[]
): Direction | null {
  const current = candles.at(-1);
  const previous = candles.at(-2);

  if (!current || !previous) {
    return null;
  }

  const body = Math.abs(
    current.close - current.open
  );

  const range = Math.max(
    current.high - current.low,
    0.0001
  );

  const bodyRatio =
    body / range;

  if (
    current.close > current.open &&
    (bodyRatio > 0.55 ||
      current.close > previous.high)
  ) {
    return "BUY";
  }

  if (
    current.close < current.open &&
    (bodyRatio > 0.55 ||
      current.close < previous.low)
  ) {
    return "SELL";
  }

  return null;
}

/* =========================================================
   TIMEFRAME ANALYSIS
   ========================================================= */

function timeframeAnalysis(
  candles: Candle[]
) {
  const closes =
    candles.map((x) => x.close);

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const rsi =
    calculateRsi(closes);

  const macd =
    calculateMacd(closes);

  let direction:
    | Direction
    | null = null;

  if (
    ema20 > ema50 &&
    rsi >= 51 &&
    rsi <= 72 &&
    macd > 0
  ) {
    direction = "BUY";
  }

  if (
    ema20 < ema50 &&
    rsi <= 49 &&
    rsi >= 28 &&
    macd < 0
  ) {
    direction = "SELL";
  }

  return {
    direction,
    ema20,
    ema50,
    rsi,
    macd,
  };
}

/* =========================================================
   COMPLETE MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket() {
  const [
    m1,
    m5,
    m15,
    h1,
    h4,
  ] = await Promise.all([
    getCandles("1min", 180),
    getCandles("5min", 160),
    getCandles("15min", 120),
    getCandles("1h", 100),
    getCandles("4h", 80),
  ]);

  const a1 =
    timeframeAnalysis(m1);

  const a5 =
    timeframeAnalysis(m5);

  const a15 =
    timeframeAnalysis(m15);

  const a60 =
    timeframeAnalysis(h1);

  const a240 =
    timeframeAnalysis(h4);

  const votes = [
    a1.direction,
    a5.direction,
    a15.direction,
    a60.direction,
    a240.direction,
  ].filter(Boolean) as Direction[];

  const buyVotes =
    votes.filter(
      (x) => x === "BUY"
    ).length;

  const sellVotes =
    votes.filter(
      (x) => x === "SELL"
    ).length;

  let direction:
    | Direction
    | null = null;

  if (buyVotes >= 3) {
    direction = "BUY";
  } else if (sellVotes >= 3) {
    direction = "SELL";
  }

  const reasons: string[] = [];

  let score = 0;

  /*
    1. MTF
  */

  if (direction) {
    score += 20;

    reasons.push(
      `هم‌جهتی چندتایم‌فریم: ${direction}`
    );
  }

  /*
    2. 1m
  */

  if (
    direction &&
    a1.direction === direction
  ) {
    score += 10;

    reasons.push(
      "تایم‌فریم 1 دقیقه همسو است"
    );
  }

  /*
    3. 5m
  */

  if (
    direction &&
    a5.direction === direction
  ) {
    score += 10;

    reasons.push(
      "تایم‌فریم 5 دقیقه تأیید می‌کند"
    );
  }

  /*
    4. 15m
  */

  if (
    direction &&
    a15.direction === direction
  ) {
    score += 10;

    reasons.push(
      "تایم‌فریم 15 دقیقه تأیید می‌کند"
    );
  }

  /*
    5. 1H
  */

  if (
    direction &&
    a60.direction === direction
  ) {
    score += 10;

    reasons.push(
      "روند 1 ساعته همسو است"
    );
  }

  /*
    6. 4H
  */

  if (
    direction &&
    a240.direction === direction
  ) {
    score += 10;

    reasons.push(
      "روند 4 ساعته همسو است"
    );
  }

  const levels =
    getSwingLevels(m5, 40);

  const atr =
    calculateAtr(m5);

  const price =
    m1.at(-1)?.close ||
    m5.at(-1)?.close ||
    0;

  /*
    حمایت / مقاومت
  */

  if (direction) {
    const distance =
      direction === "BUY"
        ? Math.abs(
            price - levels.support
          )
        : Math.abs(
            levels.resistance -
              price
          );

    if (
      distance <=
      Math.max(atr * 1.5, 5)
    ) {
      score += 10;

      reasons.push(
        "قیمت نزدیک ناحیه ساختاری مهم است"
      );
    }
  }

  /*
    کندل
  */

  const candle =
    candleDirection(m5);

  if (
    direction &&
    candle === direction
  ) {
    score += 10;

    reasons.push(
      "تأیید رفتار کندلی"
    );
  }

  /*
    حجم
  */

  const currentVolume =
    m5.at(-1)?.volume || 0;

  const averageVolume =
    sma(
      m5
        .slice(0, -1)
        .map((x) => x.volume),
      20
    );

  if (
    currentVolume > 0 &&
    averageVolume > 0 &&
    currentVolume >=
      averageVolume * 1.05
  ) {
    score += 5;

    reasons.push(
      "حجم بالاتر از میانگین"
    );
  }

  /*
    مومنتوم
  */

  if (
    direction === "BUY" &&
    a5.rsi >= 52 &&
    a5.rsi <= 68
  ) {
    score += 5;

    reasons.push(
      "مومنتوم خرید مناسب است"
    );
  }

  if (
    direction === "SELL" &&
    a5.rsi <= 48 &&
    a5.rsi >= 32
  ) {
    score += 5;

    reasons.push(
      "مومنتوم فروش مناسب است"
    );
  }

  return {
    direction,
    score: Math.min(score, 100),
    confirmations:
      reasons.length,
    reasons,
    support: levels.support,
    resistance:
      levels.resistance,
    atr,

    candles: {
      m1,
      m5,
      m15,
      h1,
      h4,
    },

    timeframeAnalysis: {
      m1: a1,
      m5: a5,
      m15: a15,
      h1: a60,
      h4: a240,
    },
  };
}

/* =========================================================
   NEWS FILTER
   ========================================================= */

async function getImportantNews() {
  const now = new Date();

  const until =
    new Date(
      now.getTime() +
        NEWS_BLOCK_MINUTES *
          60_000
    );

  try {
    const events =
      await prisma.economicEvent.findMany(
        {
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
        }
      );

    return events;
  } catch {
    /*
      اگر جدول خبر در یک نسخه قدیمی
      مشکل داشت، موتور اصلی سیگنال
      متوقف نشود.
    */

    return [];
  }
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToToman() {
  if (!NETARZ_KEY) {
    throw new Error(
      "NETARZ_API_KEY در Render تنظیم نشده است."
    );
  }

  const response =
    await fetch(
      "https://netarz.ir/api/fx/v1/rates?codes=USD",
      {
        headers: {
          Authorization:
            `Bearer ${NETARZ_KEY}`,
        },
        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "دریافت نرخ دلار ناموفق بود."
    );
  }

  const row =
    Array.isArray(data?.data)
      ? data.data.find(
          (x: any) =>
            x.code === "USD"
        )
      : null;

  const rate =
    num(
      row?.mid ??
        data?.meta?.usd_irt
    );

  if (!rate) {
    throw new Error(
      "نرخ واقعی USD/IRR دریافت نشد."
    );
  }

  return {
    rate: Math.round(rate),

    asOf:
      row?.as_of ??
      data?.meta?.as_of ??
      new Date().toISOString(),

    delayed:
      Boolean(
        row?.is_delayed ??
          data?.meta?.is_delayed
      ),

    delayedMinutes:
      num(
        row?.delayed_minutes ??
          data?.meta?.delayed_minutes
      ),
  };
}

/* =========================================================
   PRICE LEVELS
   ========================================================= */

function calculateLevels(
  entry: number,
  direction: Direction
) {
  if (direction === "BUY") {
    return {
      stopLoss: round(
        entry - STOP_DISTANCE
      ),

      tp1: round(
        entry + TP1_DISTANCE
      ),

      tp2: round(
        entry + TP2_DISTANCE
      ),

      tp3: round(
        entry + TP3_DISTANCE
      ),
    };
  }

  return {
    stopLoss: round(
      entry + STOP_DISTANCE
    ),

    tp1: round(
      entry - TP1_DISTANCE
    ),

    tp2: round(
      entry - TP2_DISTANCE
    ),

    tp3: round(
      entry - TP3_DISTANCE
    ),
  };
}

/* =========================================================
   HIT DETECTION
   ========================================================= */

function targetHit(
  direction: Direction,
  price: number,
  target: number
) {
  return direction === "BUY"
    ? price >= target
    : price <= target;
}

function stopHit(
  direction: Direction,
  price: number,
  stop: number
) {
  return direction === "BUY"
    ? price <= stop
    : price >= stop;
}

/* =========================================================
   EVENT PROFIT
   ========================================================= */

function eventProfit(
  type: EventType
) {
  if (type === "TP1") {
    return {
      lot: TP1_LOT,
      usd: TP1_USD,
    };
  }

  if (type === "TP2") {
    return {
      lot: TP2_LOT,
      usd: TP2_USD,
    };
  }

  if (type === "TP3") {
    return {
      lot: TP3_LOT,
      usd: TP3_USD,
    };
  }

  if (type === "SL") {
    return {
      lot: TOTAL_LOT,
      usd: -STOP_USD,
    };
  }

  return {
    lot: 0,
    usd: 0,
  };
}

/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  text: string
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "تنظیمات Telegram کامل نیست."
    );
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
          text,

          parse_mode: "HTML",

          disable_web_page_preview:
            true,
        }),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.description ||
        "ارسال پیام Telegram ناموفق بود."
    );
  }

  return String(
    data.result?.message_id ||
      ""
  );
}

/* =========================================================
   TELEGRAM INITIAL SIGNAL
   ========================================================= */

function buildInitialTelegram(
  meta: SignalMeta
) {
  const direction =
    meta.direction === "BUY"
      ? "🟢 خرید"
      : "🔴 فروش";

  const riskFreeText =
    "بعد از TP1، کاربر باید برای 0.06 لات باقی‌مانده حد ضرر را فوراً به نقطه ورود منتقل کند.";

  return [
    "🤖 <b>━━━ سیگنال هوش مصنوعی طلا ━━━</b>",

    "",

    `🪙 <b>XAUUSD | طلا</b>`,
    `${direction}`,

    "",

    `⭐ قدرت سیگنال: <b>${meta.score}/100</b>`,
    `✅ تعداد تأییدیه‌ها: <b>${meta.confirmations}</b>`,

    "",

    `📍 ورود: <b>${formatPrice(meta.entry)}</b>`,
    `🛑 حد ضرر: <b>${formatPrice(meta.stopLoss)}</b>`,
    `💰 ریسک: <b>${formatUsd(-meta.riskUsd)}</b>`,
    `🇮🇷 ریسک: <b>${formatToman(-meta.riskToman)}</b>`,

    "",

    `🎯 <b>TP1</b>: ${formatPrice(meta.tp1)}`,
    `📦 حجم: ${formatLot(meta.tp1Lot)} لات`,
    `💰 سود: <b>${formatUsd(meta.tp1Usd)}</b>`,
    `🇮🇷 ${formatToman(meta.tp1Toman)}`,

    "",

    `🎯 <b>TP2</b>: ${formatPrice(meta.tp2)}`,
    `📦 حجم: ${formatLot(meta.tp2Lot)} لات`,
    `💰 سود: <b>${formatUsd(meta.tp2Usd)}</b>`,
    `🇮🇷 ${formatToman(meta.tp2Toman)}`,

    "",

    `🎯 <b>TP3</b>: ${formatPrice(meta.tp3)}`,
    `📦 حجم: ${formatLot(meta.tp3Lot)} لات`,
    `💰 سود: <b>${formatUsd(meta.tp3Usd)}</b>`,
    `🇮🇷 ${formatToman(meta.tp3Toman)}`,

    "",

    `📦 حجم کل: <b>${formatLot(meta.totalLot)} لات</b>`,
    `🏆 سود کامل: <b>${formatUsd(meta.totalPotentialUsd)}</b>`,
    `🇮🇷 سود کامل: <b>${formatToman(meta.totalPotentialToman)}</b>`,

    "",

    `🛡️ <b>مدیریت ریسک‌فری</b>`,
    riskFreeText,

    "",

    `🕐 سشن: ${meta.sessionFlag} <b>${meta.sessionFa}</b>`,
    `⏱️ زمان ایران: <b>${meta.iranTime}</b>`,

    "",

    `💱 دلار: <b>${new Intl.NumberFormat("fa-IR").format(meta.usdToToman)} تومان</b>`,

    "",

    `🧠 ${meta.reasons
      .slice(0, 6)
      .map(
        (x) => `• ${x}`
      )
      .join("\n")}`,

    "",

    "⚠️ <b>این تحلیل توسط هوش مصنوعی تولید شده و تضمین‌کننده سود نیست.</b>",
  ].join("\n");
}

/* =========================================================
   TELEGRAM EVENT
   ========================================================= */

function buildEventTelegram(
  meta: SignalMeta,
  event: EventRecord
) {
  if (event.type === "TP1") {
    return [
      "🟢 <b>هدف اول فعال شد — TP1</b>",

      "",

      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,

      `🎯 قیمت TP1: <b>${formatPrice(event.price)}</b>`,

      `💰 سود TP1: <b>${formatUsd(event.pnlUsd)}</b>`,
      `🇮🇷 سود: <b>${formatToman(event.pnlToman)}</b>`,

      `📦 بسته شد: <b>${formatLot(TP1_LOT)} لات</b>`,

      `📦 باقی‌مانده: <b>${formatLot(
        TOTAL_LOT - TP1_LOT
      )} لات</b>`,

      "",

      "🛡️ <b>ریسک‌فری فعال شد</b>",
      `🔐 حد ضرر بخش باقی‌مانده → <b>نقطه ورود ${formatPrice(meta.entry)}</b>`,

      "",

      "⚠️ اگر قیمت برگردد، بخش باقی‌مانده در نقطه ورود بسته می‌شود و TP1 به عنوان سود حفظ می‌شود.",
    ].join("\n");
  }

  if (event.type === "TP2") {
    return [
      "🟢 <b>هدف دوم فعال شد — TP2</b>",

      "",

      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,

      `🎯 قیمت: <b>${formatPrice(event.price)}</b>`,

      `💰 سود این مرحله: <b>${formatUsd(event.pnlUsd)}</b>`,
      `🇮🇷 سود: <b>${formatToman(event.pnlToman)}</b>`,

      `📦 بسته شد: <b>${formatLot(TP2_LOT)} لات</b>`,

      "",

      "🛡️ <b>ریسک‌فری همچنان فعال است</b>",

      `🔐 حد ضرر بخش باقی‌مانده → <b>نقطه ورود ${formatPrice(meta.entry)}</b>`,

      "",

      `📊 سود ثبت‌شده تا این لحظه: <b>${formatUsd(
        TP1_USD + TP2_USD
      )}</b>`,
    ].join("\n");
  }

  if (event.type === "TP3") {
    return [
      "🏆 <b>معامله تکمیل شد — TP3</b>",

      "",

      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,

      `🎯 قیمت TP3: <b>${formatPrice(event.price)}</b>`,

      `💰 سود TP3: <b>${formatUsd(event.pnlUsd)}</b>`,
      `🇮🇷 سود: <b>${formatToman(event.pnlToman)}</b>`,

      "",

      `🏆 <b>سود نهایی: ${formatUsd(TOTAL_POTENTIAL_USD)}</b>`,

      `🇮🇷 <b>${formatToman(
        meta.totalPotentialToman
      )}</b>`,

      "",

      "✅ تمام اهداف معامله تکمیل شد.",
    ].join("\n");
  }

  if (event.type === "BREAKEVEN") {
    const previousProfit =
      meta.events
        .filter(
          (x) =>
            x.type === "TP1" ||
            x.type === "TP2"
        )
        .reduce(
          (sum, x) =>
            sum + x.pnlUsd,
          0
        );

    return [
      "🛡️ <b>ریسک‌فری فعال شد — خروج در نقطه ورود</b>",

      "",

      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,

      `📍 ورود: <b>${formatPrice(meta.entry)}</b>`,

      `📍 خروج: <b>${formatPrice(event.price)}</b>`,

      "",

      `💰 سود مراحل قبلی: <b>${formatUsd(previousProfit)}</b>`,

      `📦 بخش باقی‌مانده: در نقطه ورود بسته شد`,

      "",

      "✅ این معامله <b>باخت محسوب نمی‌شود</b>.",
      "سود TPهای قبلی حفظ شده است.",
    ].join("\n");
  }

  return [
    "🔴 <b>حد ضرر فعال شد — STOP LOSS</b>",

    "",

    `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,

    `📍 ورود: <b>${formatPrice(meta.entry)}</b>`,

    `🛑 استاپ: <b>${formatPrice(event.price)}</b>`,

    `💵 ضرر: <b>${formatUsd(event.pnlUsd)}</b>`,

    `🇮🇷 ضرر: <b>${formatToman(event.pnlToman)}</b>`,

    `📦 حجم: <b>${formatLot(TOTAL_LOT)} لات</b>`,

    "",

    "❌ TP1 قبل از استاپ فعال نشده بود.",
    "معامله به عنوان باخت ثبت شد.",
  ].join("\n");
}

/* =========================================================
   DUPLICATE / ACTIVE SIGNAL
   ========================================================= */

async function findActiveSignal() {
  const active =
    await prisma.analysisRun.findFirst(
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

          signalGenerated: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      }
    );

  return active;
}

/* =========================================================
   LAST SIGNAL COOLDOWN
   ========================================================= */

async function cooldownActive() {
  const since =
    new Date(
      Date.now() -
        MIN_SIGNAL_COOLDOWN_MINUTES *
          60_000
    );

  const row =
    await prisma.analysisRun.findFirst(
      {
        where: {
          symbol: DISPLAY_SYMBOL,
          signalGenerated: true,
          createdAt: {
            gte: since,
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      }
    );

  return row;
}

/* =========================================================
   EVENT EXISTENCE
   ========================================================= */

function hasEvent(
  meta: SignalMeta,
  type: EventType
) {
  return meta.events.some(
    (event) =>
      event.type === type
  );
}

/* =========================================================
   SAVE TELEGRAM DELIVERY
   ========================================================= */

async function saveDelivery(
  signalId: string,
  status: "SENT" | "FAILED",
  messageId?: string,
  errorMessage?: string
) {
  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID ||
    "UNKNOWN";

  try {
    await prisma.telegramDelivery.create(
      {
        data: {
          signalId,

          channelId: chatId,

          messageId:
            messageId || null,

          status,

          errorMessage:
            errorMessage || null,

          sentAt:
            status === "SENT"
              ? new Date()
              : null,
        },
      }
    );
  } catch {
    /*
      ثبت Delivery نباید موتور معامله
      را متوقف کند.
    */
  }
}

/* =========================================================
   CREATE EVENT
   ========================================================= */

async function createEvent(
  run: any,
  meta: SignalMeta,
  type: EventType,
  price: number,
  fxRate: number
) {
  if (hasEvent(meta, type)) {
    return null;
  }

  const profit =
    eventProfit(type);

  const now =
    new Date();

  const event: EventRecord = {
    id:
      `${type}-${Date.now()}`,

    type,

    at:
      now.toISOString(),

    price:
      round(price),

    lotClosed:
      profit.lot,

    pnlUsd:
      profit.usd,

    pnlToman:
      Math.round(
        profit.usd * fxRate
      ),

    usdToToman:
      fxRate,

    telegramSent:
      false,
  };

  meta.events.push(event);

  if (type === "TP1") {
    meta.tp1Hit = true;
    meta.riskFreeActive = true;
    meta.state = "TP1";
  }

  if (type === "TP2") {
    meta.tp2Hit = true;
    meta.riskFreeActive = true;
    meta.state = "TP2";
  }

  if (type === "TP3") {
    meta.tp3Hit = true;
    meta.state = "TP3";
    meta.closed = true;
  }

  if (type === "SL") {
    meta.state = "SL";
    meta.closed = true;
  }

  if (type === "BREAKEVEN") {
    meta.state = "BREAKEVEN";
    meta.closed = true;
  }

  meta.updatedAt =
    now.toISOString();

  /*
    ابتدا DB ذخیره می‌شود.
    بنابراین حتی اگر Telegram خطا بدهد،
    نتیجه معامله از بین نمی‌رود.
  */

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        status:
          meta.state === "TP1"
            ? "AI_TP1"
            : meta.state === "TP2"
              ? "AI_TP2"
              : meta.state === "TP3"
                ? "AI_TP3"
                : meta.state === "SL"
                  ? "AI_SL"
                  : meta.state === "BREAKEVEN"
                    ? "AI_BE"
                    : "AI_PENDING",

        metadata:
          meta as any,

        finishedAt:
          meta.closed
            ? now
            : undefined,
      },
    }
  );

  /*
    سپس Telegram
  */

  try {
    const messageId =
      await sendTelegram(
        buildEventTelegram(
          meta,
          event
        )
      );

    event.telegramSent =
      true;

    event.telegramMessageId =
      messageId;

    await saveDelivery(
      run.id,
      "SENT",
      messageId
    );
  } catch (error) {
    event.telegramError =
      error instanceof Error
        ? error.message
        : String(error);

    await saveDelivery(
      run.id,
      "FAILED",
      undefined,
      event.telegramError
    );
  }

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        metadata:
          meta as any,
      },
    }
  );

  return event;
}

/* =========================================================
   MONITOR SIGNAL
   ========================================================= */

async function monitorSignal(
  run: any
) {
  const meta =
    run.metadata as SignalMeta;

  if (
    !meta ||
    meta.kind !==
      "AI_XAUUSD_SIGNAL"
  ) {
    return null;
  }

  if (meta.closed) {
    return {
      state: meta.state,
      closed: true,
    };
  }

  const [
    price,
    fx,
  ] = await Promise.all([
    getLivePrice(),
    getUsdToToman(),
  ]);

  meta.currentPrice =
    price;

  meta.updatedAt =
    new Date().toISOString();

  /*
    مهم:
    اگر TP و SL هر دو در یک کندل لمس شده باشند،
    ترتیب واقعی OHLC قابل تشخیص نیست.
    برای جلوگیری از جعل سود،
    SL اولویت دارد.
  */

  const latestBars =
    await getCandles(
      "1min",
      3
    );

  const candle =
    latestBars.at(-1);

  const low =
    candle?.low ?? price;

  const high =
    candle?.high ?? price;

  /*
    ---------------------------------------------------------
    WAITING
    ---------------------------------------------------------
  */

  if (
    meta.state === "WAITING"
  ) {
    const stop =
      stopHit(
        meta.direction,
        price,
        meta.stopLoss
      ) ||
      stopHit(
        meta.direction,
        low,
        meta.stopLoss
      ) ||
      stopHit(
        meta.direction,
        high,
        meta.stopLoss
      );

    if (stop) {
      return createEvent(
        run,
        meta,
        "SL",
        meta.stopLoss,
        fx.rate
      );
    }

    const tp1 =
      targetHit(
        meta.direction,
        price,
        meta.tp1
      ) ||
      targetHit(
        meta.direction,
        high,
        meta.tp1
      ) ||
      targetHit(
        meta.direction,
        low,
        meta.tp1
      );

    if (tp1) {
      return createEvent(
        run,
        meta,
        "TP1",
        meta.tp1,
        fx.rate
      );
    }
  }

  /*
    ---------------------------------------------------------
    TP1
    ---------------------------------------------------------
  */

  if (
    meta.state === "TP1"
  ) {
    /*
      اول بررسی BE
    */

    const be =
      stopHit(
        meta.direction,
        price,
        meta.entry
      ) ||
      stopHit(
        meta.direction,
        low,
        meta.entry
      ) ||
      stopHit(
        meta.direction,
        high,
        meta.entry
      );

    if (be) {
      return createEvent(
        run,
        meta,
        "BREAKEVEN",
        meta.entry,
        fx.rate
      );
    }

    /*
      سپس TP2
    */

    const tp2 =
      targetHit(
        meta.direction,
        price,
        meta.tp2
      ) ||
      targetHit(
        meta.direction,
        high,
        meta.tp2
      ) ||
      targetHit(
        meta.direction,
        low,
        meta.tp2
      );

    if (tp2) {
      return createEvent(
        run,
        meta,
        "TP2",
        meta.tp2,
        fx.rate
      );
    }
  }

  /*
    ---------------------------------------------------------
    TP2
    ---------------------------------------------------------
  */

  if (
    meta.state === "TP2"
  ) {
    /*
      ریسک‌فری همچنان روی Entry است.
    */

    const be =
      stopHit(
        meta.direction,
        price,
        meta.entry
      ) ||
      stopHit(
        meta.direction,
        low,
        meta.entry
      ) ||
      stopHit(
        meta.direction,
        high,
        meta.entry
      );

    if (be) {
      return createEvent(
        run,
        meta,
        "BREAKEVEN",
        meta.entry,
        fx.rate
      );
    }

    const tp3 =
      targetHit(
        meta.direction,
        price,
        meta.tp3
      ) ||
      targetHit(
        meta.direction,
        high,
        meta.tp3
      ) ||
      targetHit(
        meta.direction,
        low,
        meta.tp3
      );

    if (tp3) {
      return createEvent(
        run,
        meta,
        "TP3",
        meta.tp3,
        fx.rate
      );
    }
  }

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        metadata:
          meta as any,
      },
    }
  );

  return {
    state: meta.state,
    price,
    closed: false,
  };
}

/* =========================================================
   CREATE NEW SIGNAL
   ========================================================= */

async function createSignal() {
  /*
    1. سیگنال باز؟
  */

  const active =
    await findActiveSignal();

  if (active) {
    return {
      created: false,
      reason:
        "یک معامله فعال وجود دارد.",
      activeId:
        active.id,
    };
  }

  /*
    2. cooldown
  */

  const cooldown =
    await cooldownActive();

  if (cooldown) {
    return {
      created: false,
      reason:
        "فاصله حداقل بین سیگنال‌ها هنوز تمام نشده است.",
      cooldownId:
        cooldown.id,
    };
  }

  /*
    3. خبر
  */

  const news =
    await getImportantNews();

  if (news.length > 0) {
    return {
      created: false,
      reason:
        "خبر مهم نزدیک است؛ صدور سیگنال متوقف شد.",
      news: news.map(
        (x: any) => ({
          event: x.event,
          currency:
            x.currency,
          eventTime:
            x.eventTime,
          importance:
            x.importance,
        })
      ),
    };
  }

  /*
    4. تحلیل کامل
  */

  const analysis =
    await analyzeMarket();

  if (
    !analysis.direction ||
    analysis.score <
      SIGNAL_SCORE_MIN ||
    analysis.confirmations <
      SIGNAL_CONFIRMATIONS_MIN
  ) {
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "1m / 5m / 15m / 1H / 4H",

          status:
            "AI_NO_TRADE",

          signalGenerated:
            false,

          candlesAnalyzed:
            analysis.candles.m1.length +
            analysis.candles.m5.length +
            analysis.candles.m15.length +
            analysis.candles.h1.length +
            analysis.candles.h4.length,

          confirmationsFound:
            analysis.confirmations,

          finishedAt:
            new Date(),

          metadata:
            {
              kind:
                "AI_NO_TRADE",

              score:
                analysis.score,

              confirmations:
                analysis.confirmations,

              reasons:
                analysis.reasons,

              direction:
                analysis.direction,
            } as any,
        },
      }
    );

    return {
      created: false,
      reason:
        "شرایط ورود معتبر نیست.",
      score:
        analysis.score,
      confirmations:
        analysis.confirmations,
      direction:
        analysis.direction,
    };
  }

  /*
    5. قیمت ورود
  */

  const entry =
    await getLivePrice();

  if (!entry) {
    throw new Error(
      "قیمت ورود دریافت نشد."
    );
  }

  /*
    6. سطوح
  */

  const priceLevels =
    calculateLevels(
      entry,
      analysis.direction
    );

  /*
    7. دلار
  */

  const fx =
    await getUsdToToman();

  /*
    8. سشن
  */

  const session =
    getSessionInfo();

  const now =
    new Date();

  /*
    9. meta
  */

  const meta: SignalMeta = {
    kind:
      "AI_XAUUSD_SIGNAL",

    symbol:
      DISPLAY_SYMBOL,

    direction:
      analysis.direction,

    entry:
      round(entry),

    stopLoss:
      priceLevels.stopLoss,

    tp1:
      priceLevels.tp1,

    tp2:
      priceLevels.tp2,

    tp3:
      priceLevels.tp3,

    totalLot:
      TOTAL_LOT,

    tp1Lot:
      TP1_LOT,

    tp2Lot:
      TP2_LOT,

    tp3Lot:
      TP3_LOT,

    riskUsd:
      STOP_USD,

    tp1Usd:
      TP1_USD,

    tp2Usd:
      TP2_USD,

    tp3Usd:
      TP3_USD,

    totalPotentialUsd:
      TOTAL_POTENTIAL_USD,

    usdToToman:
      fx.rate,

    usdToTomanAsOf:
      fx.asOf,

    riskToman:
      Math.round(
        STOP_USD *
          fx.rate
      ),

    tp1Toman:
      Math.round(
        TP1_USD *
          fx.rate
      ),

    tp2Toman:
      Math.round(
        TP2_USD *
          fx.rate
      ),

    tp3Toman:
      Math.round(
        TP3_USD *
          fx.rate
      ),

    totalPotentialToman:
      Math.round(
        TOTAL_POTENTIAL_USD *
          fx.rate
      ),

    session:
      session.name,

    sessionFa:
      session.fa,

    sessionFlag:
      session.flag,

    iranTime:
      iranDateTime(now),

    timeframe:
      "1m + 5m + 15m + 1H + 4H",

    score:
      analysis.score,

    confirmations:
      analysis.confirmations,

    reasons:
      analysis.reasons,

    support:
      round(
        analysis.support
      ),

    resistance:
      round(
        analysis.resistance
      ),

    currentPrice:
      round(entry),

    state:
      "WAITING",

    riskFreeActive:
      false,

    tp1Hit:
      false,

    tp2Hit:
      false,

    tp3Hit:
      false,

    closed:
      false,

    events:
      [],

    analysis:
      {
        timeframeAnalysis:
          analysis.timeframeAnalysis,

        atr:
          analysis.atr,

        newsBlocked:
          false,

        fxDelayed:
          fx.delayed,

        fxDelayedMinutes:
          fx.delayedMinutes,
      },

    createdAt:
      now.toISOString(),

    updatedAt:
      now.toISOString(),

    telegramInitialSent:
      false,
  };

  /*
    10. AnalysisRun
  */

  const run =
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "1m / 5m / 15m / 1H / 4H",

          status:
            "AI_PENDING",

          signalGenerated:
            true,

          candlesAnalyzed:
            analysis.candles.m1.length +
            analysis.candles.m5.length +
            analysis.candles.m15.length +
            analysis.candles.h1.length +
            analysis.candles.h4.length,

          confirmationsFound:
            analysis.confirmations,

          finishedAt:
            now,

          metadata:
            meta as any,
        },
      }
    );

  /*
    11. Telegram signal
  */

  try {
    const messageId =
      await sendTelegram(
        buildInitialTelegram(
          meta
        )
      );

    meta.telegramInitialSent =
      true;

    meta.telegramInitialMessageId =
      messageId;

    await saveDelivery(
      run.id,
      "SENT",
      messageId
    );
  } catch (error) {
    meta.telegramInitialError =
      error instanceof Error
        ? error.message
        : String(error);

    await saveDelivery(
      run.id,
      "FAILED",
      undefined,
      meta.telegramInitialError
    );
  }

  /*
    12. DB نهایی
  */

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        metadata:
          meta as any,
      },
    }
  );

  return {
    created: true,
    id: run.id,
    signal: meta,
  };
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function calculateTotals(
  rows: any[]
) {
  const result = {
    trades: 0,

    tp1: 0,
    tp2: 0,
    tp3: 0,

    stopLoss: 0,
    breakeven: 0,

    wins: 0,
    losses: 0,

    pnlUsd: 0,
    pnlToman: 0,

    tp1Usd: 0,
    tp2Usd: 0,
    tp3Usd: 0,

    slUsd: 0,

    tp1Toman: 0,
    tp2Toman: 0,
    tp3Toman: 0,

    slToman: 0,
  };

  for (const row of rows) {
    const meta =
      row.metadata as SignalMeta;

    if (
      !meta ||
      meta.kind !==
        "AI_XAUUSD_SIGNAL"
    ) {
      continue;
    }

    result.trades++;

    for (const event of
      meta.events || []) {
      if (event.type === "TP1") {
        result.tp1++;

        result.tp1Usd +=
          event.pnlUsd;

        result.tp1Toman +=
          event.pnlToman;

        result.pnlUsd +=
          event.pnlUsd;

        result.pnlToman +=
          event.pnlToman;
      }

      if (event.type === "TP2") {
        result.tp2++;

        result.tp2Usd +=
          event.pnlUsd;

        result.tp2Toman +=
          event.pnlToman;

        result.pnlUsd +=
          event.pnlUsd;

        result.pnlToman +=
          event.pnlToman;
      }

      if (event.type === "TP3") {
        result.tp3++;

        result.tp3Usd +=
          event.pnlUsd;

        result.tp3Toman +=
          event.pnlToman;

        result.pnlUsd +=
          event.pnlUsd;

        result.pnlToman +=
          event.pnlToman;
      }

      if (event.type === "SL") {
        result.stopLoss++;

        result.slUsd +=
          event.pnlUsd;

        result.slToman +=
          event.pnlToman;

        result.pnlUsd +=
          event.pnlUsd;

        result.pnlToman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "BREAKEVEN"
      ) {
        result.breakeven++;
      }
    }

    /*
      معامله موفق:
      TP3
      یا TP1/TP2 و بعد BE
    */

    const hasTP =
      meta.events.some(
        (e) =>
          e.type === "TP1" ||
          e.type === "TP2" ||
          e.type === "TP3"
      );

    const hasSL =
      meta.events.some(
        (e) =>
          e.type === "SL"
      );

    const hasBE =
      meta.events.some(
        (e) =>
          e.type ===
          "BREAKEVEN"
      );

    if (
      meta.tp3Hit ||
      hasBE
    ) {
      result.wins++;
    } else if (
      hasSL &&
      !hasTP
    ) {
      result.losses++;
    }
  }

  const closed =
    result.wins +
    result.losses;

  const winRate =
    closed > 0
      ? round(
          (result.wins /
            closed) *
            100,
          2
        )
      : 0;

  return {
    ...result,

    pnlUsd:
      money(result.pnlUsd),

    pnlToman:
      Math.round(
        result.pnlToman
      ),

    winRate,
  };
}

/* =========================================================
   PERIOD START
   ========================================================= */

function startOfPeriod(
  period:
    | "day"
    | "week"
    | "month"
) {
  const now =
    new Date();

  now.setUTCHours(
    0,
    0,
    0,
    0
  );

  if (
    period === "day"
  ) {
    return now;
  }

  if (
    period === "week"
  ) {
    const day =
      now.getUTCDay() ||
      7;

    now.setUTCDate(
      now.getUTCDate() -
        day +
        1
    );

    return now;
  }

  now.setUTCDate(1);

  return now;
}

/* =========================================================
   PERFORMANCE REPORT
   ========================================================= */

async function getPerformance() {
  const [
    day,
    week,
    month,
    all,
  ] = await Promise.all([
    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,

          createdAt: {
            gte:
              startOfPeriod(
                "day"
              ),
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    ),

    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,

          createdAt: {
            gte:
              startOfPeriod(
                "week"
              ),
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    ),

    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,

          createdAt: {
            gte:
              startOfPeriod(
                "month"
              ),
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    ),

    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 100,
      }
    ),
  ]);

  return {
    daily:
      calculateTotals(day),

    weekly:
      calculateTotals(week),

    monthly:
      calculateTotals(month),

    allTime:
      calculateTotals(all),

    recent:
      all.slice(0, 20).map(
        (row) => ({
          id:
            row.id,

          status:
            row.status,

          createdAt:
            row.createdAt,

          metadata:
            row.metadata,
        })
      ),
  };
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard() {
  const [
    active,
    latest,
    performance,
    price,
    fx,
    candlesData,
  ] = await Promise.all([
    findActiveSignal(),

    prisma.analysisRun.findFirst(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    ),

    getPerformance(),

    getLivePrice().catch(
      () => null
    ),

    getUsdToToman().catch(
      () => null
    ),

    getCandles(
      "1min",
      180
    ).catch(
      () => []
    ),
  ]);

  return {
    symbol:
      DISPLAY_SYMBOL,

    livePrice:
      price,

    candles:
      candlesData,

    active:
      active
        ? {
            id:
              active.id,

            status:
              active.status,

            metadata:
              active.metadata,
          }
        : null,

    latest:
      latest
        ? {
            id:
              latest.id,

            status:
              latest.status,

            metadata:
              latest.metadata,
          }
        : null,

    position: {
      totalLot:
        TOTAL_LOT,

      tp1Lot:
        TP1_LOT,

      tp2Lot:
        TP2_LOT,

      tp3Lot:
        TP3_LOT,

      stopUsd:
        STOP_USD,

      tp1Usd:
        TP1_USD,

      tp2Usd:
        TP2_USD,

      tp3Usd:
        TP3_USD,

      totalPotentialUsd:
        TOTAL_POTENTIAL_USD,
    },

    performance,

    usdToToman:
      fx,

    sessions: {
      Sydney:
        "🇦🇺 سیدنی",

      Tokyo:
        "🇯🇵 توکیو",

      London:
        "🇬🇧 لندن",

      NewYork:
        "🇺🇸 نیویورک",
    },

    serverTime:
      new Date().toISOString(),

    iranTime:
      iranDateTime(),
  };
}

/* =========================================================
   CRON ENGINE
   ========================================================= */

async function cronEngine() {
  const results: any[] = [];

  /*
    اول تمام معاملات فعال
    مانیتور می‌شوند.
  */

  const activeRuns =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,

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
            "asc",
        },
      }
    );

  /*
    هر معامله فعال باید
    مانیتور شود.
  */

  for (const run of
    activeRuns) {
    try {
      const result =
        await monitorSignal(
          run
        );

      results.push({
        id:
          run.id,

        result,
      });
    } catch (error) {
      results.push({
        id:
          run.id,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  /*
    اگر هیچ معامله‌ای باز نیست،
    دنبال سیگنال جدید بگرد.
  */

  if (
    activeRuns.length === 0
  ) {
    try {
      const signal =
        await createSignal();

      results.push({
        signal,
      });
    } catch (error) {
      results.push({
        signalError:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  return {
    results,

    activeTrades:
      activeRuns.length,

    at:
      new Date().toISOString(),
  };
}

/* =========================================================
   CRON AUTH
   ========================================================= */

function isCronAuthorized(
  request: NextRequest
) {
  const url =
    new URL(request.url);

  const provided =
    request.headers.get(
      "x-ai-cron-secret"
    ) ||
    request.headers.get(
      "x-signals-cron-secret"
    ) ||
    request.headers.get(
      "x-cron-secret"
    ) ||
    url.searchParams.get(
      "secret"
    );

  if (
    !CRON_SECRET ||
    !provided
  ) {
    return false;
  }

  return (
    provided ===
    CRON_SECRET
  );
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

    const cron =
      url.searchParams.get(
        "cron"
      ) === "1";

    /*
      -----------------------------------------------
      CRON
      -----------------------------------------------
    */

    if (cron) {
      if (
        !isCronAuthorized(
          request
        )
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

      const result =
        await cronEngine();

      return NextResponse.json(
        {
          ok: true,

          engine:
            "AI_XAUUSD_ENGINE",

          ...result,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
      -----------------------------------------------
      USER
      -----------------------------------------------
    */

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

    const data =
      await dashboard();

    return NextResponse.json(
      {
        ok: true,

        data,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI ANALYSIS ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی موتور تحلیل هوش مصنوعی",
      },
      {
        status: 500,
      }
    );
  }
}
