import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";
const CONTRACT_SIZE = 100;

// =========================
// TRADE CONFIG
// =========================

const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_USD = 40;

const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_POTENTIAL_USD = 80;

const STOP_DISTANCE =
  STOP_USD / (TOTAL_LOT * CONTRACT_SIZE);

const TP1_DISTANCE =
  TP1_USD / (TP1_LOT * CONTRACT_SIZE);

const TP2_DISTANCE =
  TP2_USD / (TP2_LOT * CONTRACT_SIZE);

const TP3_DISTANCE =
  TP3_USD / (TP3_LOT * CONTRACT_SIZE);

const DEFAULT_NEWS_MINUTES = 30;

// عمداً کمتر از نسخه قبلی شده تا سیستم بیش از حد سخت‌گیر نباشد.
const SCORE_TO_SIGNAL = 72;
const CONFIRMATIONS_TO_SIGNAL = 3;

const MONITOR_STALE_MS = 90_000;

const TELEGRAM_RETRY_COUNT = 3;
const TELEGRAM_RETRY_DELAY_MS = 800;

// =========================
// ENV
// =========================

const TD_KEY = process.env.TWELVE_DATA_API_KEY;
const NETARZ_KEY = process.env.NETARZ_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.SIGNALS_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

// =========================
// MARKET SESSIONS
// =========================

const SESSION_ZONES = {
  Sydney: {
    timezone: "Australia/Sydney",
    start: 7,
    end: 16,
    flag: "🇦🇺",
    fa: "سیدنی",
  },

  Tokyo: {
    timezone: "Asia/Tokyo",
    start: 9,
    end: 18,
    flag: "🇯🇵",
    fa: "توکیو",
  },

  London: {
    timezone: "Europe/London",
    start: 8,
    end: 17,
    flag: "🇬🇧",
    fa: "لندن",
  },

  "New York": {
    timezone: "America/New_York",
    start: 8,
    end: 17,
    flag: "🇺🇸",
    fa: "نیویورک",
  },
} as const;

type SessionName = keyof typeof SESSION_ZONES;

type Direction = "BUY" | "SELL";

type State =
  | "AI_PENDING"
  | "AI_TP1"
  | "AI_TP2"
  | "AI_TP3"
  | "AI_SL"
  | "AI_BE";

type EventType =
  | "TP1"
  | "TP2"
  | "TP3"
  | "SL"
  | "BREAKEVEN";

// =========================
// TYPES
// =========================

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type EventRecord = {
  type: EventType;
  at: string;
  price: number;

  lotClosed: number;

  pnlUsd: number;
  pnlToman: number;

  usdToToman: number;

  telegramMessageId?: string;
  telegramDelivered?: boolean;
  telegramError?: string;
};

type RunMeta = {
  kind: "AI_SCALP";

  userId?: string;

  symbol: string;

  direction: Direction;

  entry: number;

  stopLoss: number;

  protectedStop: number;

  tp1: number;
  tp2: number;
  tp3: number;

  totalLot: number;

  tp1Lot: number;
  tp2Lot: number;
  tp3Lot: number;

  remainingLot: number;

  riskUsd: number;

  tp1Usd: number;
  tp2Usd: number;
  tp3Usd: number;

  totalPotentialUsd: number;

  usdToToman: number;

  riskToman: number;

  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;

  totalPotentialToman: number;

  session: SessionName;
  sessionFa: string;
  sessionFlag: string;

  score: number;

  confirmations: number;

  timeframe: string;

  state: State;

  breakeven: boolean;

  currentPrice: number;

  events: EventRecord[];

  analysis: Record<string, unknown>;

  createdAt: string;

  lastUpdate: string;

  closedAt?: string;

  finalResult?: "WIN" | "LOSS" | "BREAKEVEN";

  telegramMessageId?: string;

  telegramDelivered?: boolean;

  telegramError?: string;
};

// =========================
// BASIC HELPERS
// =========================

function num(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : Number(v);

  return Number.isFinite(n) ? n : 0;
}

function round(
  v: number,
  digits = 2,
): number {
  const p = 10 ** digits;

  return Math.round(v * p) / p;
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function toman(v: number): number {
  return Math.round(v);
}

function formatToman(v: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(v),
  )} تومان`;
}

function formatUsd(v: number): string {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(v))}`;
}

function fmtPrice(v: number): string {
  return v.toFixed(2);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, ms),
  );
}

// =========================
// IRAN TIME
// =========================

function faDateTime(date: Date): string {
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

// =========================
// SESSION HELPERS
// =========================

function localHour(
  date: Date,
  timezone: string,
): number {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    },
  ).formatToParts(date);

  const value = Number(
    parts.find(x => x.type === "hour")?.value ?? 0,
  );

  return value === 24 ? 0 : value;
}

function sessionIsOpen(
  zone: {
    timezone: string;
    start: number;
    end: number;
  },
  date = new Date(),
): boolean {
  const h = localHour(date, zone.timezone);

  return h >= zone.start && h < zone.end;
}

function currentSession(
  date = new Date(),
): SessionName {
  if (
    sessionIsOpen(
      SESSION_ZONES["New York"],
      date,
    )
  ) {
    return "New York";
  }

  if (
    sessionIsOpen(
      SESSION_ZONES.London,
      date,
    )
  ) {
    return "London";
  }

  if (
    sessionIsOpen(
      SESSION_ZONES.Tokyo,
      date,
    )
  ) {
    return "Tokyo";
  }

  return "Sydney";
}

function sessionInfo(name: SessionName) {
  const s = SESSION_ZONES[name];

  return {
    ...s,
    label: `${s.flag} ${s.fa}`,
  };
}

function sessionKey(
  name: SessionName,
  date = new Date(),
): string {
  const timezone =
    SESSION_ZONES[name].timezone;

  const dateText =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  return `${name}-${dateText}`;
}

// =========================
// TWELVE DATA
// =========================

async function td(url: string): Promise<any> {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است.",
    );
  }

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(TD_KEY)}`;

  const response = await fetch(full, {
    cache: "no-store",
  });

  const data = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    data?.status === "error" ||
    data?.code
  ) {
    throw new Error(
      data?.message ||
        `Twelve Data error ${response.status}`,
    );
  }

  return data;
}

async function candles(
  interval: string,
  outputsize: number,
): Promise<Candle[]> {
  const data = await td(
    `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(SYMBOL)}` +
      `&interval=${interval}` +
      `&outputsize=${outputsize}` +
      `&order=ASC` +
      `&timezone=UTC`,
  );

  if (!Array.isArray(data?.values)) {
    throw new Error(
      `داده کندل ${interval} دریافت نشد.`,
    );
  }

  return data.values
    .map((x: any) => ({
      datetime: String(x.datetime),

      open: num(x.open),
      high: num(x.high),
      low: num(x.low),
      close: num(x.close),

      volume: num(x.volume),
    }))
    .filter(
      (x: Candle) =>
        x.close > 0 &&
        x.high > 0 &&
        x.low > 0,
    )
    .sort(
      (a: Candle, b: Candle) =>
        a.datetime.localeCompare(
          b.datetime,
        ),
    );
}

async function latestPrice(): Promise<number> {
  const data = await td(
    `https://api.twelvedata.com/price` +
      `?symbol=${encodeURIComponent(SYMBOL)}`,
  );

  const price = num(data?.price);

  if (!price) {
    throw new Error(
      "قیمت لحظه‌ای XAU/USD دریافت نشد.",
    );
  }

  return price;
}

// =========================
// INDICATORS
// =========================

function sma(
  values: number[],
  period: number,
): number {
  if (!values.length) return 0;

  const slice =
    values.slice(-period);

  return (
    slice.reduce(
      (a, b) => a + b,
      0,
    ) / slice.length
  );
}

function ema(
  values: number[],
  period: number,
): number {
  if (!values.length) return 0;

  const k = 2 / (period + 1);

  let out = values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    out =
      values[i] * k +
      out * (1 - k);
  }

  return out;
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

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const d =
      values[i] -
      values[i - 1];

    if (d >= 0) {
      gain += d;
    } else {
      loss -= d;
    }
  }

  gain /= period;
  loss /= period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const d =
      values[i] -
      values[i - 1];

    gain =
      (gain * (period - 1) +
        Math.max(d, 0)) /
      period;

    loss =
      (loss * (period - 1) +
        Math.max(-d, 0)) /
      period;
  }

  if (loss === 0) return 100;

  return (
    100 -
    100 /
      (1 + gain / loss)
  );
}

function atr(
  c: Candle[],
  period = 14,
): number {
  if (c.length < period + 1) {
    return 0;
  }

  const tr: number[] = [];

  for (
    let i = 1;
    i < c.length;
    i++
  ) {
    tr.push(
      Math.max(
        c[i].high -
          c[i].low,

        Math.abs(
          c[i].high -
            c[i - 1].close,
        ),

        Math.abs(
          c[i].low -
            c[i - 1].close,
        ),
      ),
    );
  }

  return sma(tr, period);
}

function macd(
  values: number[],
): number {
  return (
    ema(values, 12) -
    ema(values, 26)
  );
}

function swings(
  c: Candle[],
  lookback = 30,
) {
  const data =
    c.slice(-lookback);

  if (!data.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  return {
    support: Math.min(
      ...data.map(x => x.low),
    ),

    resistance: Math.max(
      ...data.map(x => x.high),
    ),
  };
}

function candleBias(
  c: Candle[],
): number {
  const previous = c.at(-2);
  const current = c.at(-1);

  if (!previous || !current) {
    return 0;
  }

  const body =
    Math.abs(
      current.close -
        current.open,
    );

  const range =
    Math.max(
      current.high -
        current.low,
      0.0001,
    );

  if (
    current.close >
      current.open &&
    (
      body / range > 0.55 ||
      current.close >
        previous.high
    )
  ) {
    return 1;
  }

  if (
    current.close <
      current.open &&
    (
      body / range > 0.55 ||
      current.close <
        previous.low
    )
  ) {
    return -1;
  }

  return 0;
}

function trendScore(
  c: Candle[],
) {
  const closes =
    c.map(x => x.close);

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const rsiValue =
    rsi(closes);

  const macdValue =
    macd(closes);

  const direction: Direction | null =
    ema20 > ema50 &&
    rsiValue >= 51 &&
    macdValue > 0
      ? "BUY"
      : ema20 < ema50 &&
          rsiValue <= 49 &&
          macdValue < 0
        ? "SELL"
        : null;

  return {
    direction,

    ema20,
    ema50,

    rsi: rsiValue,

    macd: macdValue,
  };
}

// =========================
// MARKET ANALYSIS
// =========================

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[],
) {
  const t1 =
    trendScore(m1);

  const t5 =
    trendScore(m5);

  const t15 =
    trendScore(m15);

  const t60 =
    trendScore(h1);

  const directions =
    [
      t1.direction,
      t5.direction,
      t15.direction,
      t60.direction,
    ].filter(Boolean) as Direction[];

  const buyVotes =
    directions.filter(
      x => x === "BUY",
    ).length;

  const sellVotes =
    directions.filter(
      x => x === "SELL",
    ).length;

  let direction:
    | Direction
    | null = null;

  if (
    buyVotes >= 3
  ) {
    direction = "BUY";
  } else if (
    sellVotes >= 3
  ) {
    direction = "SELL";
  } else if (
    buyVotes >= 2 &&
    sellVotes === 0
  ) {
    direction = "BUY";
  } else if (
    sellVotes >= 2 &&
    buyVotes === 0
  ) {
    direction = "SELL";
  }

  const last =
    num(m1.at(-1)?.close) ||
    num(m5.at(-1)?.close);

  const structure =
    swings(m5, 30);

  const atrValue =
    atr(m5);

  const candle =
    candleBias(m5);

  const volume =
    num(m5.at(-1)?.volume);

  const averageVolume =
    sma(
      m5
        .slice(0, -1)
        .map(x => x.volume),
      20,
    );

  let score = 0;

  let confirmations = 0;

  const reasons: string[] = [];

  // -------------------------
  // MTF
  // -------------------------

  if (direction) {
    score += 25;
    confirmations++;

    reasons.push(
      `هم‌جهتی چندتایم‌فریم: ${direction}`,
    );
  }

  if (
    direction &&
    t1.direction === direction
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "تأیید روند 1 دقیقه",
    );
  }

  if (
    direction &&
    t15.direction === direction
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "تأیید روند 15 دقیقه",
    );
  }

  if (
    direction &&
    t60.direction === direction
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "تأیید روند 1 ساعت",
    );
  }

  // -------------------------
  // SUPPORT / RESISTANCE
  // -------------------------

  const nearSupport =
    direction === "BUY" &&
    structure.support > 0 &&
    last -
      structure.support <=
      Math.max(
        atrValue * 1.5,
        8,
      );

  const nearResistance =
    direction === "SELL" &&
    structure.resistance > 0 &&
    structure.resistance -
      last <=
      Math.max(
        atrValue * 1.5,
        8,
      );

  if (
    nearSupport ||
    nearResistance
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "قیمت نزدیک ناحیه حمایت/مقاومت است",
    );
  }

  // -------------------------
  // CANDLE
  // -------------------------

  if (
    (
      direction === "BUY" &&
      candle > 0
    ) ||
    (
      direction === "SELL" &&
      candle < 0
    )
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "تأیید کندلی",
    );
  }

  // -------------------------
  // VOLUME
  // -------------------------

  if (
    volume > 0 &&
    averageVolume > 0 &&
    volume >=
      averageVolume * 1.05
  ) {
    score += 5;
    confirmations++;

    reasons.push(
      "حجم بالاتر از میانگین",
    );
  }

  // -------------------------
  // MOMENTUM
  // -------------------------

  if (
    direction === "BUY" &&
    t5.rsi >= 52 &&
    t5.rsi <= 68
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "مومنتوم خرید",
    );
  }

  if (
    direction === "SELL" &&
    t5.rsi <= 48 &&
    t5.rsi >= 32
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "مومنتوم فروش",
    );
  }

  // -------------------------
  // EMA
  // -------------------------

  if (
    direction &&
    (
      (
        direction === "BUY" &&
        last > t5.ema20
      ) ||
      (
        direction === "SELL" &&
        last < t5.ema20
      )
    )
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "قیمت نسبت به EMA20 در جهت تحلیل است",
    );
  }

  // -------------------------
  // RANGE
  // -------------------------

  if (
    atrValue > 0 &&
    Math.abs(
      structure.resistance -
        structure.support,
    ) >=
      atrValue * 2
  ) {
    score += 5;
    confirmations++;

    reasons.push(
      "دامنه نوسان مناسب است",
    );
  }

  return {
    direction,

    score: Math.min(
      score,
      100,
    ),

    confirmations,

    reasons,

    support:
      structure.support,

    resistance:
      structure.resistance,

    atr: atrValue,

    t1,
    t5,
    t15,
    t60,
  };
}

// =========================
// NEWS
// =========================

async function newsBlock() {
  const now =
    new Date();

  const until =
    new Date(
      now.getTime() +
        DEFAULT_NEWS_MINUTES *
          60_000,
    );

  return prisma.economicEvent.findMany(
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
    },
  );
}

// =========================
// USD / TOMAN
// =========================

async function getUsdToTomanRate() {
  if (!NETARZ_KEY) {
    throw new Error(
      "NETARZ_API_KEY تنظیم نشده است.",
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
      },
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "دریافت نرخ دلار ناموفق بود.",
    );
  }

  const row =
    Array.isArray(data?.data)
      ? data.data.find(
          (x: any) =>
            x.code === "USD",
        )
      : null;

  const rate =
    num(
      row?.mid ??
        data?.meta?.usd_irt,
    );

  if (!rate) {
    throw new Error(
      "نرخ USD/IRR از سرویس نرخ ارز دریافت نشد.",
    );
  }

  return {
    rate: Math.round(rate),

    asOf: String(
      row?.as_of ??
        data?.meta?.as_of ??
        new Date().toISOString(),
    ),
  };
}

// =========================
// LEVELS
// =========================

function levels(
  entry: number,
  direction: Direction,
) {
  if (direction === "BUY") {
    return {
      stopLoss: round(
        entry -
          STOP_DISTANCE,
      ),

      tp1: round(
        entry +
          TP1_DISTANCE,
      ),

      tp2: round(
        entry +
          TP2_DISTANCE,
      ),

      tp3: round(
        entry +
          TP3_DISTANCE,
      ),
    };
  }

  return {
    stopLoss: round(
      entry +
        STOP_DISTANCE,
    ),

    tp1: round(
      entry -
        TP1_DISTANCE,
    ),

    tp2: round(
      entry -
        TP2_DISTANCE,
    ),

    tp3: round(
      entry -
        TP3_DISTANCE,
    ),
  };
}

function hit(
  direction: Direction,
  price: number,
  target: number,
): boolean {
  return direction === "BUY"
    ? price >= target
    : price <= target;
}

function stopHit(
  direction: Direction,
  price: number,
  stop: number,
): boolean {
  return direction === "BUY"
    ? price <= stop
    : price >= stop;
}

// =========================
// P/L
// =========================

function eventPnl(
  type: EventType,
) {
  if (type === "TP1") {
    return {
      lotClosed: TP1_LOT,
      pnlUsd: TP1_USD,
    };
  }

  if (type === "TP2") {
    return {
      lotClosed: TP2_LOT,
      pnlUsd: TP2_USD,
    };
  }

  if (type === "TP3") {
    return {
      lotClosed: TP3_LOT,
      pnlUsd: TP3_USD,
    };
  }

  if (type === "SL") {
    return {
      lotClosed: TOTAL_LOT,
      pnlUsd: -STOP_USD,
    };
  }

  return {
    lotClosed: 0,
    pnlUsd: 0,
  };
}

// =========================
// TELEGRAM
// =========================

async function sendTelegram(
  text: string,
): Promise<string> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "تنظیمات Telegram کامل نیست.",
    );
  }

  let lastError =
    "Telegram send failed";

  for (
    let attempt = 1;
    attempt <=
      TELEGRAM_RETRY_COUNT;
    attempt++
  ) {
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
              chat_id: chatId,

              text,

              parse_mode: "HTML",

              disable_web_page_preview:
                true,
            }),

            cache: "no-store",
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        response.ok &&
        data?.ok
      ) {
        return String(
          data.result
            ?.message_id ?? "",
        );
      }

      lastError =
        data?.description ||
        `Telegram HTTP ${response.status}`;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : String(error);
    }

    if (
      attempt <
      TELEGRAM_RETRY_COUNT
    ) {
      await sleep(
        TELEGRAM_RETRY_DELAY_MS *
          attempt,
      );
    }
  }

  throw new Error(
    lastError,
  );
}

// =========================
// TELEGRAM INITIAL SIGNAL
// =========================

function buildSignalTelegram(
  meta: RunMeta,
  rateAsOf: string,
): string {
  const session =
    sessionInfo(
      meta.session,
    );

  const strength =
    meta.score >= 88
      ? "حرفه‌ای"
      : meta.score >= 78
        ? "متوسط"
        : "ضعیف";

  return [
    "🤖 <b>سیگنال هوش مصنوعی طلا</b>",

    "⚠️ این تحلیل توسط هوش مصنوعی تولید شده و تضمین‌کننده سود نیست.",

    "",

    `🪙 <b>XAUUSD</b> | ${
      meta.direction === "BUY"
        ? "🟢 خرید BUY"
        : "🔴 فروش SELL"
    }`,

    `⭐ قدرت سیگنال: <b>${strength}</b>`,

    `📊 امتیاز: <b>${meta.score}/100</b> | تأییدیه‌ها: <b>${meta.confirmations}</b>`,

    `🕐 سشن: <b>${session.flag} ${session.fa}</b>`,

    `⏱️ زمان ایران: <b>${faDateTime(
      new Date(meta.createdAt),
    )}</b>`,

    "",

    `📍 ورود: <b>${fmtPrice(
      meta.entry,
    )}</b>`,

    `🛑 حد ضرر: <b>${fmtPrice(
      meta.stopLoss,
    )}</b> | ریسک: <b>-${formatUsd(
      meta.riskUsd,
    )}</b>`,

    `1️⃣ TP1: <b>${fmtPrice(
      meta.tp1,
    )}</b> | ${meta.tp1Lot.toFixed(
      2,
    )} lot | <b>+${formatUsd(
      meta.tp1Usd,
    )}</b>`,

    `2️⃣ TP2: <b>${fmtPrice(
      meta.tp2,
    )}</b> | ${meta.tp2Lot.toFixed(
      2,
    )} lot | <b>+${formatUsd(
      meta.tp2Usd,
    )}</b>`,

    `3️⃣ TP3: <b>${fmtPrice(
      meta.tp3,
    )}</b> | ${meta.tp3Lot.toFixed(
      2,
    )} lot | <b>+${formatUsd(
      meta.tp3Usd,
    )}</b>`,

    `📦 حجم کل: <b>${meta.totalLot.toFixed(
      2,
    )} lot</b>`,

    `💰 سود کامل مدل: <b>+${formatUsd(
      meta.totalPotentialUsd,
    )}</b>`,

    "",

    "🛡️ <b>مدیریت معامله</b>",

    "• بعد از TP1، حجم 0.04 بسته می‌شود.",

    "• 0.06 lot باقی می‌ماند و حد ضرر به نقطه ورود منتقل می‌شود.",

    "• بعد از TP2، 0.03 lot بسته و 0.03 lot نهایی باقی می‌ماند.",

    "• بعد از TP3، معامله کامل می‌شود و نتیجه در کارنامه ثبت می‌شود.",

    "",

    `💱 دلار واقعی: <b>${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      meta.usdToToman,
    )} تومان</b>`,

    `🕒 زمان نرخ: ${rateAsOf}`,

    "",

    "🟢 <b>وضعیت سیگنال: فعال</b>",

    "📡 سیستم از این لحظه TP و SL را مانیتور می‌کند.",
  ].join("\n");
}

// =========================
// TELEGRAM EVENT
// =========================

function buildEventTelegram(
  meta: RunMeta,
  event: EventRecord,
): string {
  const sign =
    event.pnlUsd > 0
      ? "+"
      : event.pnlUsd < 0
        ? "-"
        : "";

  const status =
    event.type === "TP1"
      ? "🟢 هدف اول فعال شد"
      : event.type === "TP2"
        ? "🟢 هدف دوم فعال شد"
        : event.type === "TP3"
          ? "🏆 فول تارگت — معامله برد"
          : event.type === "BREAKEVEN"
            ? "🛡️ ریسک‌فری فعال شد"
            : "🔴 حد ضرر فعال شد — معامله باخت";

  let extra: string[] = [];

  if (event.type === "TP1") {
    extra = [
      "",
      "🛡️ <b>ریسک‌فری فعال شد</b>",
      "",
      "0.04 lot بسته شد.",
      "0.06 lot باقی ماند.",
      "حد ضرر باقی‌مانده → نقطه ورود.",
      "",
      "⚠️ سود TP1 محافظت شد.",
      "📡 مانیتورینگ ادامه دارد.",
    ];
  }

  if (event.type === "TP2") {
    extra = [
      "",
      "🛡️ <b>مدیریت بعد از TP2</b>",
      "",
      "0.03 lot دیگر بسته شد.",
      "0.03 lot نهایی باقی ماند.",
      `حد محافظتی → ${fmtPrice(
        meta.tp1,
      )}`,
      "",
      "📡 مانیتورینگ TP3 ادامه دارد.",
    ];
  }

  if (event.type === "TP3") {
    extra = [
      "",
      "🏆 <b>همه اهداف تکمیل شد.</b>",
      "",
      "معامله تمام شد.",
      "سیگنال منقضی شد.",
      "نتیجه: ✅ برد",
      "در کارنامه ثبت شد.",
    ];
  }

  if (
    event.type === "BREAKEVEN"
  ) {
    extra = [
      "",
      "🛡️ <b>معامله به حد محافظتی برگشت.</b>",
      "",
      "بخش باقی‌مانده بدون زیان بسته شد.",
      "سیگنال منقضی شد.",
      "نتیجه: 🛡️ ریسک‌فری",
      "در کارنامه ثبت شد.",
    ];
  }

  if (event.type === "SL") {
    extra = [
      "",
      "⛔ <b>حد ضرر لمس شد.</b>",
      "",
      "معامله بسته شد.",
      "سیگنال منقضی شد.",
      "نتیجه: ❌ باخت",
      "در کارنامه ثبت شد.",
    ];
  }

  return [
    "🤖 <b>به‌روزرسانی سیگنال هوش مصنوعی</b>",

    status,

    "",

    `🪙 XAUUSD | ${
      meta.direction === "BUY"
        ? "🟢 خرید"
        : "🔴 فروش"
    }`,

    `🕐 سشن: ${
      sessionInfo(meta.session).flag
    } ${
      sessionInfo(meta.session).fa
    }`,

    `⏱️ زمان ایران: <b>${faDateTime(
      new Date(event.at),
    )}</b>`,

    `📍 ورود: ${fmtPrice(
      meta.entry,
    )}`,

    `📌 قیمت رویداد: <b>${fmtPrice(
      event.price,
    )}</b>`,

    `📦 حجم این مرحله: ${event.lotClosed.toFixed(
      2,
    )} lot`,

    `💵 نتیجه این مرحله: <b>${sign}${formatUsd(
      event.pnlUsd,
    )}</b>`,

    `🇮🇷 نتیجه: <b>${
      event.pnlToman >= 0
        ? "+"
        : "-"
    }${formatToman(
      Math.abs(event.pnlToman),
    )}</b>`,

    ...extra,

    "",

    `💱 دلار: ${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      event.usdToToman,
    )} تومان`,
  ].join("\n");
}

// =========================
// NORMALIZE OLD / NEW DATA
// =========================

function normalizeMeta(
  raw: any,
): RunMeta | null {
  if (
    !raw ||
    raw.kind !== "AI_SCALP"
  ) {
    return null;
  }

  const direction: Direction =
    raw.direction === "SELL"
      ? "SELL"
      : "BUY";

  const validStates: State[] = [
    "AI_PENDING",
    "AI_TP1",
    "AI_TP2",
    "AI_TP3",
    "AI_SL",
    "AI_BE",
  ];

  const state: State =
    validStates.includes(
      raw.state,
    )
      ? raw.state
      : "AI_PENDING";

  const session: SessionName =
    Object.prototype.hasOwnProperty.call(
      SESSION_ZONES,
      raw.session,
    )
      ? raw.session
      : currentSession();

  const s =
    sessionInfo(session);

  return {
    kind: "AI_SCALP",

    userId:
      typeof raw.userId === "string"
        ? raw.userId
        : undefined,

    symbol: DISPLAY_SYMBOL,

    direction,

    entry: num(raw.entry),

    stopLoss:
      num(raw.stopLoss),

    protectedStop:
      num(
        raw.protectedStop ||
          raw.stopLoss,
      ),

    tp1: num(raw.tp1),
    tp2: num(raw.tp2),
    tp3: num(raw.tp3),

    totalLot:
      num(
        raw.totalLot ||
          TOTAL_LOT,
      ),

    tp1Lot:
      num(
        raw.tp1Lot ||
          TP1_LOT,
      ),

    tp2Lot:
      num(
        raw.tp2Lot ||
          TP2_LOT,
      ),

    tp3Lot:
      num(
        raw.tp3Lot ||
          TP3_LOT,
      ),

    remainingLot:
      num(
        raw.remainingLot ||
          TOTAL_LOT,
      ),

    riskUsd:
      num(
        raw.riskUsd ||
          STOP_USD,
      ),

    tp1Usd:
      num(
        raw.tp1Usd ||
          TP1_USD,
      ),

    tp2Usd:
      num(
        raw.tp2Usd ||
          TP2_USD,
      ),

    tp3Usd:
      num(
        raw.tp3Usd ||
          TP3_USD,
      ),

    totalPotentialUsd:
      num(
        raw.totalPotentialUsd ||
          TOTAL_POTENTIAL_USD,
      ),

    usdToToman:
      num(raw.usdToToman),

    riskToman:
      num(raw.riskToman),

    tp1Toman:
      num(raw.tp1Toman),

    tp2Toman:
      num(raw.tp2Toman),

    tp3Toman:
      num(raw.tp3Toman),

    totalPotentialToman:
      num(
        raw.totalPotentialToman,
      ),

    session,

    sessionFa: s.fa,

    sessionFlag: s.flag,

    score:
      num(raw.score),

    confirmations:
      num(raw.confirmations),

    timeframe:
      typeof raw.timeframe ===
      "string"
        ? raw.timeframe
        : "1m + 5m + 15m + 1h",

    state,

    breakeven:
      Boolean(raw.breakeven),

    currentPrice:
      num(raw.currentPrice),

    events:
      Array.isArray(raw.events)
        ? raw.events
        : [],

    analysis:
      raw.analysis &&
      typeof raw.analysis ===
        "object"
        ? raw.analysis
        : {},

    createdAt:
      typeof raw.createdAt ===
      "string"
        ? raw.createdAt
        : new Date().toISOString(),

    lastUpdate:
      typeof raw.lastUpdate ===
      "string"
        ? raw.lastUpdate
        : new Date().toISOString(),

    closedAt:
      typeof raw.closedAt ===
      "string"
        ? raw.closedAt
        : undefined,

    finalResult:
      raw.finalResult === "WIN" ||
      raw.finalResult === "LOSS" ||
      raw.finalResult ===
        "BREAKEVEN"
        ? raw.finalResult
        : undefined,

    telegramMessageId:
      typeof raw.telegramMessageId ===
      "string"
        ? raw.telegramMessageId
        : undefined,

    telegramDelivered:
      Boolean(
        raw.telegramDelivered,
      ),

    telegramError:
      typeof raw.telegramError ===
      "string"
        ? raw.telegramError
        : undefined,
  };
}

// =========================
// ACTIVE RUN
// =========================

async function activeRun() {
  const rows =
    await prisma.analysisRun.findMany(
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

        take: 5,
      },
    );

  for (const row of rows) {
    const meta =
      normalizeMeta(
        row.metadata,
      );

    if (
      meta &&
      !meta.closedAt
    ) {
      return row;
    }
  }

  return null;
}

// =========================
// SAVE META
// =========================

async function saveMeta(
  id: string,
  meta: RunMeta,
  status?: string,
  finishedAt?:
    | Date
    | null,
) {
  const data: any = {
    metadata: meta as any,
  };

  if (status) {
    data.status = status;
  }

  if (
    finishedAt !==
    undefined
  ) {
    data.finishedAt =
      finishedAt;
  }

  await prisma.analysisRun.update(
    {
      where: { id },

      data,
    },
  );
}

// =========================
// NO TRADE
// =========================

async function createNoTradeRun(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[],
  analysis: ReturnType<
    typeof analyzeMarket
  >,
  reason: string,
) {
  return prisma.analysisRun.create(
    {
      data: {
        symbol: DISPLAY_SYMBOL,

        timeframe:
          "5min + MTF",

        status:
          "AI_NO_TRADE",

        signalGenerated:
          false,

        candlesAnalyzed:
          m1.length +
          m5.length +
          m15.length +
          h1.length,

        confirmationsFound:
          analysis.confirmations,

        finishedAt:
          new Date(),

        metadata: {
          kind: "AI_NO_TRADE",

          reason,

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
        } as any,
      },
    },
  );
}

// =========================
// CREATE SIGNAL
// =========================

async function scan(
  userId?: string,
) {
  const active =
    await activeRun();

  if (active) {
    return {
      created: false,
      reason: "active_trade",
      id: active.id,
    };
  }

  // -------------------------
  // NEWS BLOCK
  // -------------------------

  const news =
    await newsBlock();

  if (news.length) {
    return {
      created: false,

      reason:
        "high_impact_news",

      news: news.map(
        (x: any) => ({
          event: x.event,
          currency: x.currency,
          time: x.eventTime,
        }),
      ),
    };
  }

  // -------------------------
  // MARKET DATA
  // -------------------------

  const [
    m1,
    m5,
    m15,
    h1,
  ] = await Promise.all([
    candles("1min", 160),
    candles("5min", 120),
    candles("15min", 100),
    candles("1h", 80),
  ]);

  const analysis =
    analyzeMarket(
      m1,
      m5,
      m15,
      h1,
    );

  // -------------------------
  // NO SIGNAL
  // -------------------------

  if (
    !analysis.direction ||
    analysis.score <
      SCORE_TO_SIGNAL ||
    analysis.confirmations <
      CONFIRMATIONS_TO_SIGNAL
  ) {
    await createNoTradeRun(
      m1,
      m5,
      m15,
      h1,
      analysis,
      "سیگنال به حداقل امتیاز یا تعداد تأییدیه نرسید",
    );

    return {
      created: false,

      reason:
        "no_trade",

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      reasons:
        analysis.reasons,
    };
  }

  // -------------------------
  // ENTRY
  // -------------------------

  const entry =
    num(
      m1.at(-1)?.close ||
        m5.at(-1)?.close,
    );

  if (!entry) {
    return {
      created: false,
      reason: "no_price",
    };
  }

  const lv =
    levels(
      entry,
      analysis.direction,
    );

  // -------------------------
  // STRUCTURE SAFETY
  // -------------------------

  const structureDistance =
    analysis.direction ===
    "BUY"
      ? entry -
        analysis.support
      : analysis.resistance -
        entry;

  if (
    structureDistance >
    STOP_DISTANCE + 1
  ) {
    return {
      created: false,

      reason:
        "structure_too_far",

      structureDistance:
        round(
          structureDistance,
        ),
    };
  }

  // -------------------------
  // FX
  // -------------------------

  const fx =
    await getUsdToTomanRate();

  const now =
    new Date();

  const session =
    currentSession(now);

  const s =
    sessionInfo(session);

  const confirmations =
    Math.max(
      3,
      analysis.confirmations,
    );

  // -------------------------
  // META
  // -------------------------

  const meta: RunMeta = {
    kind: "AI_SCALP",

    userId,

    symbol: DISPLAY_SYMBOL,

    direction:
      analysis.direction,

    entry:
      round(entry),

    stopLoss:
      lv.stopLoss,

    protectedStop:
      lv.stopLoss,

    tp1:
      lv.tp1,

    tp2:
      lv.tp2,

    tp3:
      lv.tp3,

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

    riskToman:
      toman(
        STOP_USD *
          fx.rate,
      ),

    tp1Toman:
      toman(
        TP1_USD *
          fx.rate,
      ),

    tp2Toman:
      toman(
        TP2_USD *
          fx.rate,
      ),

    tp3Toman:
      toman(
        TP3_USD *
          fx.rate,
      ),

    totalPotentialToman:
      toman(
        TOTAL_POTENTIAL_USD *
          fx.rate,
      ),

    session,

    sessionFa:
      s.fa,

    sessionFlag:
      s.flag,

    score:
      analysis.score,

    confirmations,

    timeframe:
      "1m + 5m + 15m + 1h",

    state:
      "AI_PENDING",

    breakeven:
      false,

    currentPrice:
      round(entry),

    events: [],

    analysis: {
      reasons:
        analysis.reasons,

      support:
        analysis.support,

      resistance:
        analysis.resistance,

      atr:
        analysis.atr,

      t1:
        analysis.t1,

      t5:
        analysis.t5,

      t15:
        analysis.t15,

      t60:
        analysis.t60,

      fxAsOf:
        fx.asOf,

      contractSize:
        CONTRACT_SIZE,
    },

    createdAt:
      now.toISOString(),

    lastUpdate:
      now.toISOString(),
  };

  // -------------------------
  // CREATE ACTIVE RUN
  // -------------------------

  const created =
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "1m + MTF",

          status:
            "AI_PENDING",

          signalGenerated:
            true,

          candlesAnalyzed:
            m1.length +
            m5.length +
            m15.length +
            h1.length,

          confirmationsFound:
            confirmations,

          // مهم:
          // معامله فعال نباید finishedAt داشته باشد.
          metadata:
            meta as any,
        },
      },
    );

  // -------------------------
  // SEND INITIAL TELEGRAM
  // -------------------------

  try {
    const messageId =
      await sendTelegram(
        buildSignalTelegram(
          meta,
          fx.asOf,
        ),
      );

    meta.telegramMessageId =
      messageId;

    meta.telegramDelivered =
      true;

    meta.telegramError =
      undefined;
  } catch (error) {
    meta.telegramDelivered =
      false;

    meta.telegramError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  await saveMeta(
    created.id,
    meta,
    "AI_PENDING",
    null,
  );

  return {
    created: true,

    id: created.id,

    meta,
  };
}

// =========================
// RETRY TELEGRAM
// =========================

async function retryInitialTelegram(
  runId: string,
  meta: RunMeta,
) {
  if (
    meta.telegramDelivered
  ) {
    return;
  }

  try {
    const messageId =
      await sendTelegram(
        buildSignalTelegram(
          meta,
          String(
            meta.analysis
              .fxAsOf ??
              "نامشخص",
          ),
        ),
      );

    meta.telegramMessageId =
      messageId;

    meta.telegramDelivered =
      true;

    meta.telegramError =
      undefined;

    meta.lastUpdate =
      new Date().toISOString();

    await saveMeta(
      runId,
      meta,
    );
  } catch (error) {
    meta.telegramDelivered =
      false;

    meta.telegramError =
      error instanceof Error
        ? error.message
        : String(error);

    await saveMeta(
      runId,
      meta,
    );
  }
}

// =========================
// MONITOR ACTIVE TRADE
// =========================

async function monitorOne(
  run: any,
) {
  const meta =
    normalizeMeta(
      run.metadata,
    );

  if (!meta) {
    return {
      ok: false,
      reason:
        "invalid_metadata",
    };
  }

  // معامله قبلاً بسته شده
  if (
    [
      "AI_TP3",
      "AI_SL",
      "AI_BE",
    ].includes(meta.state)
  ) {
    return {
      ok: true,
      state: meta.state,
      closed: true,
    };
  }

  // اگر پیام اولیه قبلاً ارسال نشده، دوباره تلاش کن.
  if (
    !meta.telegramDelivered
  ) {
    await retryInitialTelegram(
      run.id,
      meta,
    );
  }

  // -------------------------
  // LIVE PRICE
  // -------------------------

  const price =
    await latestPrice();

  // -------------------------
  // 1 MIN CANDLES
  // برای اینکه فقط close بررسی نشود.
  // -------------------------

  const recent =
    await candles(
      "1min",
      3,
    ).catch(
      () => [] as Candle[],
    );

  const observedHigh =
    Math.max(
      price,
      ...recent.map(
        x => x.high,
      ),
    );

  const observedLow =
    Math.min(
      price,
      ...recent.map(
        x => x.low,
      ),
    );

  meta.currentPrice =
    round(price);

  meta.lastUpdate =
    new Date().toISOString();

  const fx =
    await getUsdToTomanRate();

  const hasEvent = (
    type: EventType,
  ) =>
    meta.events.some(
      event =>
        event.type ===
        type,
    );

  // =========================
  // CREATE EVENT
  // =========================

  const push = async (
    type: EventType,
    priceAtHit: number,
  ) => {
    if (
      hasEvent(type)
    ) {
      return null;
    }

    const base =
      eventPnl(type);

    const event: EventRecord = {
      type,

      at:
        new Date().toISOString(),

      price:
        round(priceAtHit),

      lotClosed:
        base.lotClosed,

      pnlUsd:
        base.pnlUsd,

      pnlToman:
        toman(
          base.pnlUsd *
            fx.rate,
        ),

      usdToToman:
        fx.rate,

      telegramDelivered:
        false,
    };

    meta.events.push(
      event,
    );

    // -----------------------
    // TP1
    // -----------------------

    if (
      type === "TP1"
    ) {
      meta.state =
        "AI_TP1";

      meta.breakeven =
        true;

      meta.protectedStop =
        meta.entry;

      meta.remainingLot =
        round(
          TOTAL_LOT -
            TP1_LOT,
        );
    }

    // -----------------------
    // TP2
    // -----------------------

    else if (
      type === "TP2"
    ) {
      meta.state =
        "AI_TP2";

      meta.protectedStop =
        meta.tp1;

      meta.remainingLot =
        round(
          TOTAL_LOT -
            TP1_LOT -
            TP2_LOT,
        );
    }

    // -----------------------
    // TP3
    // -----------------------

    else if (
      type === "TP3"
    ) {
      meta.state =
        "AI_TP3";

      meta.remainingLot =
        0;

      meta.closedAt =
        event.at;

      meta.finalResult =
        "WIN";
    }

    // -----------------------
    // SL
    // -----------------------

    else if (
      type === "SL"
    ) {
      meta.state =
        "AI_SL";

      meta.remainingLot =
        0;

      meta.closedAt =
        event.at;

      meta.finalResult =
        "LOSS";
    }

    // -----------------------
    // BREAK EVEN
    // -----------------------

    else {
      meta.state =
        "AI_BE";

      meta.remainingLot =
        0;

      meta.closedAt =
        event.at;

      meta.finalResult =
        "BREAKEVEN";
    }

    // -----------------------
    // FIRST SAVE
    // -----------------------

    await saveMeta(
      run.id,

      meta,

      meta.state,

      [
        "AI_TP3",
        "AI_SL",
        "AI_BE",
      ].includes(
        meta.state,
      )
        ? new Date(event.at)
        : null,
    );

    // -----------------------
    // TELEGRAM EVENT
    // -----------------------

    try {
      const messageId =
        await sendTelegram(
          buildEventTelegram(
            meta,
            event,
          ),
        );

      event.telegramMessageId =
        messageId;

      event.telegramDelivered =
        true;

      event.telegramError =
        undefined;
    } catch (error) {
      event.telegramDelivered =
        false;

      event.telegramError =
        error instanceof Error
          ? error.message
          : String(error);
    }

    // -----------------------
    // SECOND SAVE
    // -----------------------

    await saveMeta(
      run.id,

      meta,

      meta.state,

      [
        "AI_TP3",
        "AI_SL",
        "AI_BE",
      ].includes(
        meta.state,
      )
        ? new Date(event.at)
        : null,
    );

    return event;
  };

  // ============================================================
  // AI_PENDING
  // ============================================================

  if (
    meta.state ===
    "AI_PENDING"
  ) {
    const slTouched =
      stopHit(
        meta.direction,
        observedLow,
        meta.stopLoss,
      ) ||
      stopHit(
        meta.direction,
        observedHigh,
        meta.stopLoss,
      );

    const tp1Touched =
      hit(
        meta.direction,
        observedHigh,
        meta.tp1,
      ) ||
      hit(
        meta.direction,
        observedLow,
        meta.tp1,
      );

    // اگر در همان بازه هم SL و هم TP لمس شده باشند،
    // ترتیب واقعی از OHLC قابل اثبات نیست؛
    // سیستم محافظه‌کارانه SL را اول ثبت می‌کند.
    if (slTouched) {
      return push(
        "SL",

        meta.direction ===
          "BUY"
          ? Math.min(
              price,
              observedLow,
            )
          : Math.max(
              price,
              observedHigh,
            ),
      );
    }

    if (tp1Touched) {
      return push(
        "TP1",

        meta.direction ===
          "BUY"
          ? Math.max(
              price,
              observedHigh,
            )
          : Math.min(
              price,
              observedLow,
            ),
      );
    }
  }

  // ============================================================
  // AFTER TP1
  // ============================================================

  if (
    meta.state ===
    "AI_TP1"
  ) {
    const protectedTouched =
      stopHit(
        meta.direction,
        observedLow,
        meta.protectedStop,
      ) ||
      stopHit(
        meta.direction,
        observedHigh,
        meta.protectedStop,
      );

    const tp2Touched =
      hit(
        meta.direction,
        observedHigh,
        meta.tp2,
      ) ||
      hit(
        meta.direction,
        observedLow,
        meta.tp2,
      );

    if (
      protectedTouched
    ) {
      return push(
        "BREAKEVEN",

        meta.direction ===
          "BUY"
          ? Math.min(
              price,
              observedLow,
            )
          : Math.max(
              price,
              observedHigh,
            ),
      );
    }

    if (tp2Touched) {
      return push(
        "TP2",

        meta.direction ===
          "BUY"
          ? Math.max(
              price,
              observedHigh,
            )
          : Math.min(
              price,
              observedLow,
            ),
      );
    }
  }

  // ============================================================
  // AFTER TP2
  // ============================================================

  if (
    meta.state ===
    "AI_TP2"
  ) {
    const protectedTouched =
      stopHit(
        meta.direction,
        observedLow,
        meta.protectedStop,
      ) ||
      stopHit(
        meta.direction,
        observedHigh,
        meta.protectedStop,
      );

    const tp3Touched =
      hit(
        meta.direction,
        observedHigh,
        meta.tp3,
      ) ||
      hit(
        meta.direction,
        observedLow,
        meta.tp3,
      );

    if (
      protectedTouched
    ) {
      return push(
        "BREAKEVEN",

        meta.direction ===
          "BUY"
          ? Math.min(
              price,
              observedLow,
            )
          : Math.max(
              price,
              observedHigh,
            ),
      );
    }

    if (tp3Touched) {
      return push(
        "TP3",

        meta.direction ===
          "BUY"
          ? Math.max(
              price,
              observedHigh,
            )
          : Math.min(
              price,
              observedLow,
            ),
      );
    }
  }

  // -------------------------
  // SAVE CURRENT LIVE STATE
  // -------------------------

  await saveMeta(
    run.id,
    meta,
    meta.state,
    null,
  );

  return {
    ok: true,

    state:
      meta.state,

    price,
  };
}

// =========================
// PERFORMANCE
// =========================

function eventTotals(
  rows: any[],
) {
  const out = {
    trades: 0,

    wins: 0,

    losses: 0,

    breakeven: 0,

    tp1: 0,

    tp2: 0,

    tp3: 0,

    sl: 0,

    tp1Toman: 0,

    tp2Toman: 0,

    tp3Toman: 0,

    slToman: 0,

    pnlUsd: 0,

    pnlToman: 0,
  };

  for (
    const row of rows
  ) {
    const meta =
      normalizeMeta(
        row.metadata,
      );

    if (
      !meta ||
      !meta.events.length
    ) {
      continue;
    }

    out.trades++;

    for (
      const event of
        meta.events
    ) {
      if (
        event.type ===
        "TP1"
      ) {
        out.tp1++;

        out.tp1Toman +=
          num(
            event.pnlToman,
          );
      }

      if (
        event.type ===
        "TP2"
      ) {
        out.tp2++;

        out.tp2Toman +=
          num(
            event.pnlToman,
          );
      }

      if (
        event.type ===
        "TP3"
      ) {
        out.tp3++;

        out.tp3Toman +=
          num(
            event.pnlToman,
          );
      }

      if (
        event.type ===
        "SL"
      ) {
        out.sl++;

        out.slToman +=
          num(
            event.pnlToman,
          );
      }

      if (
        event.type !==
        "BREAKEVEN"
      ) {
        out.pnlUsd +=
          num(
            event.pnlUsd,
          );

        out.pnlToman +=
          num(
            event.pnlToman,
          );
      }
    }

    if (
      meta.finalResult ===
        "WIN" ||
      meta.state ===
        "AI_TP3"
    ) {
      out.wins++;
    } else if (
      meta.finalResult ===
        "LOSS" ||
      meta.state ===
        "AI_SL"
    ) {
      out.losses++;
    } else if (
      meta.finalResult ===
        "BREAKEVEN" ||
      meta.state ===
        "AI_BE"
    ) {
      out.breakeven++;
    }
  }

  const decided =
    out.wins +
    out.losses;

  return {
    ...out,

    winRate:
      decided
        ? round(
            (out.wins /
              decided) *
              100,
            1,
          )
        : 0,

    tp1Toman:
      Math.round(
        out.tp1Toman,
      ),

    tp2Toman:
      Math.round(
        out.tp2Toman,
      ),

    tp3Toman:
      Math.round(
        out.tp3Toman,
      ),

    slToman:
      Math.round(
        out.slToman,
      ),

    pnlUsd:
      money(
        out.pnlUsd,
      ),

    pnlToman:
      Math.round(
        out.pnlToman,
      ),
  };
}

// =========================
// PERIOD
// =========================

function startOfPeriod(
  kind:
    | "day"
    | "week"
    | "month",
) {
  const d =
    new Date();

  d.setUTCHours(
    0,
    0,
    0,
    0,
  );

  if (
    kind === "day"
  ) {
    return d;
  }

  if (
    kind === "week"
  ) {
    const day =
      d.getUTCDay() || 7;

    d.setUTCDate(
      d.getUTCDate() -
        day +
        1,
    );

    return d;
  }

  d.setUTCDate(1);

  return d;
}

// =========================
// PERFORMANCE QUERY
// =========================

async function performance() {
  const [
    day,
    week,
    month,
    recent,
  ] = await Promise.all([
    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          createdAt: {
            gte:
              startOfPeriod(
                "day",
              ),
          },

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      },
    ),

    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          createdAt: {
            gte:
              startOfPeriod(
                "week",
              ),
          },

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      },
    ),

    prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          createdAt: {
            gte:
              startOfPeriod(
                "month",
              ),
          },

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      },
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

        take: 30,
      },
    ),
  ]);

  return {
    day:
      eventTotals(day),

    week:
      eventTotals(week),

    month:
      eventTotals(month),

    recent:
      recent.map(
        row => ({
          id:
            row.id,

          createdAt:
            row.createdAt,

          status:
            row.status,

          metadata:
            row.metadata,
        }),
      ),
  };
}

// =========================
// SESSION REPORT
// =========================

async function sessionReport(
  name: SessionName,
) {
  const now =
    new Date();

  const key =
    sessionKey(
      name,
      now,
    );

  const existing =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          status:
            "SESSION_REPORT",
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 100,
      },
    );

  if (
    existing.some(
      row =>
        (row.metadata as any)
          ?.key === key,
    )
  ) {
    return {
      sent: false,

      reason:
        "already_sent",
    };
  }

  const all =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "asc",
        },
      },
    );

  const rows =
    all.filter(
      row => {
        const meta =
          normalizeMeta(
            row.metadata,
          );

        return Boolean(
          meta &&
            meta.session ===
              name &&
            sessionKey(
              name,
              new Date(
                meta.createdAt,
              ),
            ) === key,
        );
      },
    );

  if (!rows.length) {
    return {
      sent: false,

      reason:
        "no_trades",
    };
  }

  const totals =
    eventTotals(rows);

  const fx =
    await getUsdToTomanRate();

  const msg = [
    "🤖 <b>کارنامه پایان سشن — XAUUSD</b>",

    `${
      sessionInfo(name).flag
    } <b>${
      sessionInfo(name).fa
    }</b>`,

    `📅 ${key}`,

    "",

    `📊 معاملات دارای رویداد: <b>${totals.trades}</b>`,

    `🏆 برد: <b>${totals.wins}</b>`,

    `❌ باخت: <b>${totals.losses}</b>`,

    `🛡️ ریسک‌فری: <b>${totals.breakeven}</b>`,

    `📈 نرخ برد ثبت‌شده: <b>${totals.winRate}%</b>`,

    "",

    `🎯 TP1: ${totals.tp1} مورد | ${formatToman(
      totals.tp1Toman,
    )}`,

    `🎯 TP2: ${totals.tp2} مورد | ${formatToman(
      totals.tp2Toman,
    )}`,

    `🏆 TP3: ${totals.tp3} مورد | ${formatToman(
      totals.tp3Toman,
    )}`,

    `🛑 SL: ${totals.sl} مورد | ${formatToman(
      totals.slToman,
    )}`,

    "",

    `💰 خالص: <b>${
      totals.pnlUsd >= 0
        ? "+"
        : "-"
    }${formatUsd(
      Math.abs(
        totals.pnlUsd,
      ),
    )}</b>`,

    `🇮🇷 خالص: <b>${
      totals.pnlToman >= 0
        ? "+"
        : "-"
    }${formatToman(
      Math.abs(
        totals.pnlToman,
      ),
    )}</b>`,

    `💱 دلار: <b>${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      fx.rate,
    )} تومان</b>`,

    "",

    "⚠️ این گزارش فقط بر اساس معاملات و رویدادهای ثبت‌شده توسط سیستم است.",
  ].join("\n");

  let telegramMessageId =
    "";

  try {
    telegramMessageId =
      await sendTelegram(
        msg,
      );
  } catch {
    // گزارش در DB ثبت می‌شود.
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

        finishedAt:
          now,

        metadata: {
          kind:
            "SESSION_REPORT",

          key,

          session:
            name,

          totals,

          usdToToman:
            fx.rate,

          telegramMessageId,
        } as any,
      },
    },
  );

  return {
    sent: true,

    totals,
  };
}

// =========================
// CRON ENGINE
// =========================

async function cronCycle() {
  const active =
    await activeRun();

  const monitored =
    active
      ? [
          await monitorOne(
            active,
          ),
        ]
      : [
          await scan(),
        ];

  const reports:
    Record<
      string,
      unknown
    > = {};

  for (
    const name of
      Object.keys(
        SESSION_ZONES,
      ) as SessionName[]
  ) {
    const zone =
      SESSION_ZONES[name];

    const hour =
      localHour(
        new Date(),
        zone.timezone,
      );

    if (
      hour === zone.end
    ) {
      reports[name] =
        await sessionReport(
          name,
        );
    }
  }

  return {
    monitored,

    reports,
  };
}

// =========================
// DASHBOARD
// =========================

async function dashboard(
  userId: string,
) {
  let active =
    await activeRun();

  // اگر Cron موقتاً اجرا نشده باشد،
  // باز شدن صفحه می‌تواند وضعیت معامله را تازه کند.
  if (active) {
    const meta =
      normalizeMeta(
        active.metadata,
      );

    if (
      meta &&
      Date.now() -
        new Date(
          meta.lastUpdate,
        ).getTime() >
        MONITOR_STALE_MS
    ) {
      try {
        await monitorOne(
          active,
        );

        active =
          await activeRun();
      } catch {
        // خطای لحظه‌ای API نباید صفحه را خراب کند.
      }
    }
  }

  const [
    perf,
    latest,
    fx,
  ] = await Promise.all([
    performance(),

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
      },
    ),

    getUsdToTomanRate()
      .catch(
        () => null,
      ),
  ]);

  const latestMeta =
    latest
      ? normalizeMeta(
          latest.metadata,
        )
      : null;

  const activeMeta =
    active
      ? normalizeMeta(
          active.metadata,
        )
      : null;

  return {
    symbol:
      DISPLAY_SYMBOL,

    contractSize:
      CONTRACT_SIZE,

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

    active:
      active &&
      activeMeta
        ? {
            id:
              active.id,

            status:
              active.status,

            metadata:
              activeMeta,
          }
        : null,

    latest:
      latest &&
      latestMeta
        ? {
            id:
              latest.id,

            status:
              latest.status,

            metadata:
              latestMeta,
          }
        : null,

    performance:
      perf,

    usdToToman:
      fx,

    sessions:
      SESSION_ZONES,

    userId,
  };
}

// =========================
// CRON AUTH
// =========================

function isCronAuthorized(
  req: NextRequest,
): boolean {
  const url =
    new URL(req.url);

  const provided =
    req.headers.get(
      "x-ai-cron-secret",
    ) ||
    url.searchParams.get(
      "secret",
    );

  return Boolean(
    CRON_SECRET &&
      provided &&
      provided ===
        CRON_SECRET,
  );
}

// =========================
// GET
// =========================

export async function GET(
  req: NextRequest,
) {
  try {
    const url =
      new URL(req.url);

    const cron =
      url.searchParams.get(
        "cron",
      ) === "1";

    // =======================
    // CRON
    // =======================

    if (cron) {
      if (
        !isCronAuthorized(req)
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

      const result =
        await cronCycle();

      return NextResponse.json(
        {
          ok: true,

          ...result,

          at:
            new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    // =======================
    // USER
    // =======================

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
        },
      );
    }

    const data =
      await dashboard(
        session.userId,
      );

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
      },
    );
  } catch (error) {
    console.error(
      "AI_ANALYSIS_ROUTE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی سرور",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
     }
