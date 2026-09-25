import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   AI GOLD ANALYSIS ENGINE
   XAUUSD / XAUUSD
   Real market data
   Real monitoring
   Telegram notifications
   Telegram chart snapshot
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.10;
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;
const REMAINING_AFTER_TP1 = 0.06;

/*
  User-defined trading plan
*/
const STOP_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_POTENTIAL_USD = 80;

/*
  Price distances are calculated from the requested
  monetary model and 100oz contract.
*/
const STOP_DISTANCE =
  STOP_USD / (TOTAL_LOT * CONTRACT_SIZE);

const TP1_DISTANCE =
  TP1_USD / (TP1_LOT * CONTRACT_SIZE);

const TP2_DISTANCE =
  TP2_USD / (TP2_LOT * CONTRACT_SIZE);

const TP3_DISTANCE =
  TP3_USD / (TP3_LOT * CONTRACT_SIZE);

/*
  Signal threshold.
  We deliberately do not require an absurd number of
  confirmations. The system requires several independent
  confirmations instead.
*/
const SCORE_TO_SIGNAL = 72;
const MIN_CONFIRMATIONS = 3;

/*
  High impact news protection.
*/
const DEFAULT_NEWS_MINUTES = 30;

/*
  Active statuses.
*/
const ACTIVE_STATUSES = [
  "AI_PENDING",
  "AI_TP1",
  "AI_TP2",
];

/*
  Environment
*/
const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET ||
  process.env.SIGNALS_CRON_SECRET;

const NETARZ_KEY = process.env.NETARZ_API_KEY;

const TELEGRAM_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_SIGNAL_CHAT_ID;

/*
  Telegram chart rendering service.
  No API key is required for the basic chart endpoint.
*/
const QUICKCHART_URL = "https://quickchart.io/chart";

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

type Direction = "BUY" | "SELL";

type SessionName =
  | "Sydney"
  | "Tokyo"
  | "London"
  | "New York";

type EventType =
  | "TP1"
  | "TP2"
  | "TP3"
  | "SL"
  | "BREAKEVEN";

type EventRecord = {
  type: EventType;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;

  telegramSent?: boolean;
  telegramMessageId?: string;
  telegramError?: string;
};

type SessionInfo = {
  name: SessionName;
  flag: string;
  localTime: string;
  tehranTime: string;
  activeSessions: SessionName[];
};

type RunMeta = {
  kind: "AI_SCALP";

  userId?: string;

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

  riskToman: number;
  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  totalPotentialToman: number;

  session: SessionName;

  score: number;

  confirmations: number;

  timeframe: string;

  state:
    | "AI_PENDING"
    | "AI_TP1"
    | "AI_TP2"
    | "AI_TP3"
    | "AI_SL"
    | "AI_BE";

  breakeven: boolean;

  currentPrice: number;

  events: EventRecord[];

  analysis: Record<string, unknown>;

  chartUrl?: string;

  createdAt: string;

  lastUpdate: string;

  lastCheckedAt?: string;

  telegramInitialSent?: boolean;

  telegramInitialMessageId?: string;

  telegramInitialError?: string;
};

type AnalysisResult = {
  direction: Direction | null;

  score: number;

  confirmations: number;

  reasons: string[];

  support: number;

  resistance: number;

  atr: number;

  t1: ReturnType<typeof trendScore>;
  t5: ReturnType<typeof trendScore>;
  t15: ReturnType<typeof trendScore>;
  t60: ReturnType<typeof trendScore>;
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

function round(
  value: number,
  digits = 2
): number {
  const p = 10 ** digits;

  return Math.round(value * p) / p;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function toman(value: number): number {
  return Math.round(value);
}

function formatToman(value: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(value)
  )} تومان`;
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);

  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(abs)}`;
}

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "-"}${formatUsd(value)}`;
}

function fmtPrice(value: number): string {
  return Number(value).toFixed(2);
}

function safeDate(value: unknown): Date | null {
  if (!value) return null;

  const d = new Date(String(value));

  return Number.isFinite(d.getTime())
    ? d
    : null;
}

/* =========================================================
   TIME / SESSION ENGINE
   ========================================================= */

const SESSION_CONFIG: Record<
  SessionName,
  {
    flag: string;
    timezone: string;
    startHour: number;
    endHour: number;
  }
> = {
  Sydney: {
    flag: "🇦🇺",
    timezone: "Australia/Sydney",
    startHour: 8,
    endHour: 17,
  },

  Tokyo: {
    flag: "🇯🇵",
    timezone: "Asia/Tokyo",
    startHour: 9,
    endHour: 18,
  },

  London: {
    flag: "🇬🇧",
    timezone: "Europe/London",
    startHour: 8,
    endHour: 17,
  },

  "New York": {
    flag: "🇺🇸",
    timezone: "America/New_York",
    startHour: 8,
    endHour: 17,
  },
};

function getHourInTimezone(
  date: Date,
  timezone: string
): number {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }
  ).formatToParts(date);

  const hour = parts.find(
    (x) => x.type === "hour"
  )?.value;

  return Number(hour ?? 0);
}

function getClock(
  date: Date,
  timezone: string
): string {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(date);
}

function getSessionInfo(
  date = new Date()
): SessionInfo {
  const names = Object.keys(
    SESSION_CONFIG
  ) as SessionName[];

  const activeSessions = names.filter(
    (name) => {
      const config =
        SESSION_CONFIG[name];

      const hour = getHourInTimezone(
        date,
        config.timezone
      );

      return (
        hour >= config.startHour &&
        hour < config.endHour
      );
    }
  );

  /*
    Priority during overlaps:
    New York -> London -> Tokyo -> Sydney
  */
  const priority: SessionName[] = [
    "New York",
    "London",
    "Tokyo",
    "Sydney",
  ];

  const name =
    priority.find((x) =>
      activeSessions.includes(x)
    ) ?? "Sydney";

  return {
    name,
    flag: SESSION_CONFIG[name].flag,
    localTime: getClock(
      date,
      SESSION_CONFIG[name].timezone
    ),
    tehranTime: getClock(
      date,
      "Asia/Tehran"
    ),
    activeSessions,
  };
}

function sessionKey(
  name: SessionName,
  date = new Date()
): string {
  const config = SESSION_CONFIG[name];

  const datePart =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: config.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(date);

  return `${name}-${datePart}`;
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function td(
  url: string,
  attempts = 3
): Promise<any> {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است."
    );
  }

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    try {
      const full =
        `${url}${url.includes("?") ? "&" : "?"}` +
        `apikey=${encodeURIComponent(TD_KEY)}`;

      const response = await fetch(
        full,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (
        response.status === 429 &&
        attempt < attempts
      ) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            attempt * 1500
          )
        );

        continue;
      }

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
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            attempt * 1000
          )
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "خطا در ارتباط با Twelve Data."
      );
}

/* =========================================================
   CANDLE PARSER
   ========================================================= */

function parseCandles(
  values: any[]
): Candle[] {
  return values
    .map((x: any) => ({
      datetime: String(
        x.datetime
      ),

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
        x.low > 0
    )
    .sort(
      (a, b) =>
        a.datetime.localeCompare(
          b.datetime
        )
    );
}

async function candles(
  interval: string,
  outputsize: number
): Promise<Candle[]> {
  const data = await td(
    "https://api.twelvedata.com/time_series" +
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

  return parseCandles(
    data.values
  );
}

/*
  Important:
  This is used by the monitor to recover candles
  since the last successful check.
*/
async function candlesSince(
  since: Date
): Promise<Candle[]> {
  const now = new Date();

  const start =
    new Date(
      since.getTime() -
        120_000
    );

  const data = await td(
    "https://api.twelvedata.com/time_series" +
      `?symbol=${encodeURIComponent(SYMBOL)}` +
      `&interval=1min` +
      `&start_date=${encodeURIComponent(
        start.toISOString()
      )}` +
      `&end_date=${encodeURIComponent(
        now.toISOString()
      )}` +
      `&order=ASC` +
      `&timezone=UTC`
  );

  if (!Array.isArray(data?.values)) {
    return [];
  }

  return parseCandles(
    data.values
  ).filter((c) => {
    const d =
      safeDate(c.datetime);

    return (
      d !== null &&
      d.getTime() >=
        start.getTime()
    );
  });
}

async function latestPrice(): Promise<number> {
  const data = await td(
    `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
      SYMBOL
    )}`
  );

  const price =
    num(data?.price);

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

  if (values.length < period) {
    return (
      values.reduce(
        (a, b) => a + b,
        0
      ) / values.length
    );
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
  if (!values.length) return 0;

  const k =
    2 / (period + 1);

  let output =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    output =
      values[i] * k +
      output * (1 - k);
  }

  return output;
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
    const diff =
      values[i] -
      values[i - 1];

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
      values[i] -
      values[i - 1];

    const g =
      Math.max(diff, 0);

    const l =
      Math.max(-diff, 0);

    gain =
      (gain * (period - 1) +
        g) /
      period;

    loss =
      (loss * (period - 1) +
        l) /
      period;
  }

  if (loss === 0) {
    return 100;
  }

  return (
    100 -
    100 /
      (1 + gain / loss)
  );
}

function atr(
  candlesData: Candle[],
  period = 14
): number {
  if (
    candlesData.length <
    period + 1
  ) {
    return 0;
  }

  const tr: number[] = [];

  for (
    let i = 1;
    i < candlesData.length;
    i++
  ) {
    const current =
      candlesData[i];

    const previous =
      candlesData[i - 1];

    tr.push(
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

  return sma(
    tr,
    period
  );
}

function macd(
  values: number[]
): number {
  return (
    ema(values, 12) -
    ema(values, 26)
  );
}

function swings(
  candlesData: Candle[],
  lookback = 30
) {
  const slice =
    candlesData.slice(
      -lookback
    );

  if (!slice.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  return {
    support: Math.min(
      ...slice.map(
        (x) => x.low
      )
    ),

    resistance: Math.max(
      ...slice.map(
        (x) => x.high
      )
    ),
  };
}

function candleBias(
  candlesData: Candle[]
): number {
  const previous =
    candlesData.at(-2);

  const current =
    candlesData.at(-1);

  if (!previous || !current) {
    return 0;
  }

  const body =
    Math.abs(
      current.close -
        current.open
    );

  const range =
    Math.max(
      current.high -
        current.low,
      0.0001
    );

  const bullish =
    current.close >
      current.open &&
    (
      body / range >
        0.55 ||
      current.close >
        previous.high
    );

  const bearish =
    current.close <
      current.open &&
    (
      body / range >
        0.55 ||
      current.close <
        previous.low
    );

  if (bullish) return 1;

  if (bearish) return -1;

  return 0;
}

/* =========================================================
   TREND ENGINE
   ========================================================= */

function trendScore(
  candlesData: Candle[]
) {
  const closes =
    candlesData.map(
      (x) => x.close
    );

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const r =
    rsi(closes, 14);

  const m =
    macd(closes);

  const buy =
    ema20 > ema50 &&
    r >= 52 &&
    r <= 72 &&
    m > 0;

  const sell =
    ema20 < ema50 &&
    r <= 48 &&
    r >= 28 &&
    m < 0;

  if (buy) {
    return {
      direction:
        "BUY" as Direction,

      score: 25,

      ema20,

      ema50,

      rsi: r,

      macd: m,
    };
  }

  if (sell) {
    return {
      direction:
        "SELL" as Direction,

      score: 25,

      ema20,

      ema50,

      rsi: r,

      macd: m,
    };
  }

  return {
    direction: null,

    score: 0,

    ema20,

    ema50,

    rsi: r,

    macd: m,
  };
}

/* =========================================================
   MARKET ANALYSIS
   ========================================================= */

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[]
): AnalysisResult {
  const t1 =
    trendScore(m1);

  const t5 =
    trendScore(m5);

  const t15 =
    trendScore(m15);

  const t60 =
    trendScore(h1);

  const directions = [
    t5.direction,
    t15.direction,
    t60.direction,
  ].filter(
    Boolean
  ) as Direction[];

  const buyVotes =
    directions.filter(
      (x) => x === "BUY"
    ).length;

  const sellVotes =
    directions.filter(
      (x) => x === "SELL"
    ).length;

  let direction:
    | Direction
    | null = null;

  if (buyVotes >= 2) {
    direction = "BUY";
  } else if (sellVotes >= 2) {
    direction = "SELL";
  }

  let score = 0;

  let confirmations = 0;

  const reasons: string[] = [];

  const last =
    m5.at(-1)?.close ?? 0;

  const structure =
    swings(m5, 40);

  const averageAtr =
    atr(m5, 14);

  /* Confirmation 1: MTF trend */
  if (direction) {
    score += 20;

    confirmations++;

    reasons.push(
      `روند چندتایم‌فریم همسو: ${
        direction === "BUY"
          ? "صعودی"
          : "نزولی"
      }`
    );
  }

  /* Confirmation 2: 1m trend */
  if (
    direction &&
    t1.direction === direction
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "روند تایم‌فریم 1 دقیقه همسو است"
    );
  }

  /* Confirmation 3: 15m + 1h */
  if (
    direction &&
    t15.direction === direction &&
    t60.direction === direction
  ) {
    score += 12;

    confirmations++;

    reasons.push(
      "15 دقیقه و 1 ساعت تأییدکننده هستند"
    );
  }

  /* Confirmation 4: support/resistance */
  const nearSupport =
    direction === "BUY" &&
    last -
      structure.support <=
      Math.max(
        averageAtr * 1.5,
        5
      );

  const nearResistance =
    direction === "SELL" &&
    structure.resistance -
      last <=
      Math.max(
        averageAtr * 1.5,
        5
      );

  if (
    nearSupport ||
    nearResistance
  ) {
    score += 10;

    confirmations++;

    reasons.push(
      "قیمت در نزدیکی ناحیه ساختاری معتبر است"
    );
  }

  /* Confirmation 5: candle */
  const bias =
    candleBias(m5);

  if (
    (
      direction === "BUY" &&
      bias > 0
    ) ||
    (
      direction === "SELL" &&
      bias < 0
    )
  ) {
    score += 10;

    confirmations++;

    reasons.push(
      "تأیید کندلی دریافت شد"
    );
  }

  /* Confirmation 6: volume */
  const latestVolume =
    m5.at(-1)?.volume ?? 0;

  const averageVolume =
    sma(
      m5
        .slice(0, -1)
        .map(
          (x) =>
            x.volume
        ),
      20
    );

  if (
    latestVolume > 0 &&
    averageVolume > 0 &&
    latestVolume >=
      averageVolume * 1.05
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "حجم معاملات بالاتر از میانگین است"
    );
  }

  /* Confirmation 7: momentum */
  const r =
    t5.rsi;

  if (
    direction === "BUY" &&
    r >= 52 &&
    r <= 68
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "مومنتوم خرید تأیید شده"
    );
  }

  if (
    direction === "SELL" &&
    r <= 48 &&
    r >= 32
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "مومنتوم فروش تأیید شده"
    );
  }

  /* Confirmation 8: EMA location */
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
    score += 8;

    confirmations++;

    reasons.push(
      "قیمت نسبت به EMA20 در موقعیت مناسب است"
    );
  }

  /* Confirmation 9: MACD */
  if (
    direction === "BUY" &&
    t5.macd > 0
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "MACD مثبت و همسو با خرید است"
    );
  }

  if (
    direction === "SELL" &&
    t5.macd < 0
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "MACD منفی و همسو با فروش است"
    );
  }

  /* Confirmation 10: enough structure */
  if (
    averageAtr > 0 &&
    structure.resistance -
      structure.support >=
      averageAtr * 2
  ) {
    score += 8;

    confirmations++;

    reasons.push(
      "ساختار بازار فضای کافی برای معامله دارد"
    );
  }

  return {
    direction,

    score: Math.min(
      score,
      100
    ),

    confirmations,

    reasons,

    support:
      structure.support,

    resistance:
      structure.resistance,

    atr: averageAtr,

    t1,
    t5,
    t15,
    t60,
  };
}

/* =========================================================
   NEWS PROTECTION
   ========================================================= */

async function newsBlock() {
  const now =
    new Date();

  const until =
    new Date(
      now.getTime() +
        DEFAULT_NEWS_MINUTES *
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
            eventTime:
              "asc",
          },

          take: 10,
        }
      );

    return events;
  } catch {
    /*
      News database must never fabricate
      a result. If the table/query is unavailable,
      return no events instead of inventing news.
    */
    return [];
  }
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToTomanRate() {
  if (!NETARZ_KEY) {
    throw new Error(
      "NETARZ_API_KEY تنظیم نشده است."
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
    Array.isArray(
      data?.data
    )
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
      "نرخ USD/IRR دریافت نشد."
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
        data?.meta?.is_delayed
      ),

    delayedMinutes:
      num(
        data?.meta
          ?.delayed_minutes
      ),

    source:
      data?.meta?.source ??
      "NetArz",
  };
}

/* =========================================================
   TRADE LEVELS
   ========================================================= */

function levels(
  entry: number,
  direction: Direction
) {
  if (direction === "BUY") {
    return {
      stopLoss: round(
        entry -
          STOP_DISTANCE
      ),

      tp1: round(
        entry +
          TP1_DISTANCE
      ),

      tp2: round(
        entry +
          TP2_DISTANCE
      ),

      tp3: round(
        entry +
          TP3_DISTANCE
      ),
    };
  }

  return {
    stopLoss: round(
      entry +
        STOP_DISTANCE
    ),

    tp1: round(
      entry -
        TP1_DISTANCE
    ),

    tp2: round(
      entry -
        TP2_DISTANCE
    ),

    tp3: round(
      entry -
        TP3_DISTANCE
    ),
  };
}

/* =========================================================
   PRICE HIT LOGIC
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

function candleTouchesTarget(
  direction: Direction,
  candle: Candle,
  target: number
) {
  return direction === "BUY"
    ? candle.high >= target
    : candle.low <= target;
}

function candleTouchesStop(
  direction: Direction,
  candle: Candle,
  stop: number
) {
  return direction === "BUY"
    ? candle.low <= stop
    : candle.high >= stop;
}

/* =========================================================
   EVENT P/L
   ========================================================= */

function eventPnl(
  type: EventType
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

/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  text: string
): Promise<string> {
  if (
    !TELEGRAM_TOKEN ||
    !TELEGRAM_CHAT_ID
  ) {
    throw new Error(
      "تنظیمات Telegram کامل نیست."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          chat_id:
            TELEGRAM_CHAT_ID,

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
        "Telegram sendMessage failed."
    );
  }

  return String(
    data.result?.message_id ??
      ""
  );
}

/*
  Send an image using a public URL.
  QuickChart renders the real market data
  supplied by this backend.
*/
async function sendTelegramPhoto(
  photoUrl: string,
  caption: string
): Promise<string> {
  if (
    !TELEGRAM_TOKEN ||
    !TELEGRAM_CHAT_ID
  ) {
    throw new Error(
      "تنظیمات Telegram کامل نیست."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          chat_id:
            TELEGRAM_CHAT_ID,

          photo:
            photoUrl,

          caption,

          parse_mode:
            "HTML",
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
        "Telegram sendPhoto failed."
    );
  }

  return String(
    data.result?.message_id ??
      ""
  );
}

/* =========================================================
   QUICKCHART
   ========================================================= */

function buildChartUrl(
  chartCandles: Candle[],
  meta: RunMeta
): string {
  const selected =
    chartCandles
      .slice(-60);

  const labels =
    selected.map(
      (c) => {
        const d =
          safeDate(
            c.datetime
          );

        if (!d) {
          return c.datetime;
        }

        return new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              "UTC",

            hour:
              "2-digit",

            minute:
              "2-digit",

            hour12:
              false,
          }
        ).format(d);
      }
    );

  const closes =
    selected.map(
      (c) =>
        round(
          c.close,
          2
        )
    );

  const horizontal =
    (value: number) =>
      selected.map(
        () => round(value, 2)
      );

  const config = {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label:
            "XAUUSD",

          data:
            closes,

          borderColor:
            "#d4af37",

          backgroundColor:
            "rgba(212,175,55,0.12)",

          borderWidth:
            3,

          pointRadius:
            0,

          tension:
            0.15,

          fill:
            true,
        },

        {
          label:
            "Entry",

          data:
            horizontal(
              meta.entry
            ),

          borderColor:
            "#ffffff",

          borderWidth:
            2,

          borderDash:
            [6, 4],

          pointRadius:
            0,

          fill:
            false,
        },

        {
          label:
            "Stop Loss",

          data:
            horizontal(
              meta.stopLoss
            ),

          borderColor:
            "#ef4444",

          borderWidth:
            2,

          borderDash:
            [5, 5],

          pointRadius:
            0,

          fill:
            false,
        },

        {
          label:
            "TP1",

          data:
            horizontal(
              meta.tp1
            ),

          borderColor:
            "#22c55e",

          borderWidth:
            2,

          pointRadius:
            0,

          fill:
            false,
        },

        {
          label:
            "TP2",

          data:
            horizontal(
              meta.tp2
            ),

          borderColor:
            "#16a34a",

          borderWidth:
            2,

          borderDash:
            [4, 4],

          pointRadius:
            0,

          fill:
            false,
        },

        {
          label:
            "TP3",

          data:
            horizontal(
              meta.tp3
            ),

          borderColor:
            "#86efac",

          borderWidth:
            2,

          borderDash:
            [2, 4],

          pointRadius:
            0,

          fill:
            false,
        },
      ],
    },

    options: {
      responsive:
        true,

      plugins: {
        legend: {
          position:
            "bottom",
          labels: {
            color:
              "#ffffff",
          },
        },

        title: {
          display:
            true,

          text:
            `XAUUSD | ${
              meta.direction
            } | ${
              meta.session
            }`,

          color:
            "#d4af37",

          font: {
            size:
              20,

            weight:
              "bold",
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color:
              "#9ca3af",

            maxTicksLimit:
              8,
          },

          grid: {
            color:
              "rgba(255,255,255,0.06)",
          },
        },

        y: {
          ticks: {
            color:
              "#9ca3af",
          },

          grid: {
            color:
              "rgba(255,255,255,0.06)",
          },
        },
      },
    },
  };

  const encoded =
    encodeURIComponent(
      JSON.stringify(config)
    );

  return (
    `${QUICKCHART_URL}` +
    `?width=1000` +
    `&height=600` +
    `&devicePixelRatio=2` +
    `&format=png` +
    `&backgroundColor=%2306111f` +
    `&version=4` +
    `&c=${encoded}`
  );
}

/* =========================================================
   TELEGRAM SIGNAL MESSAGE
   ========================================================= */

function buildSignalTelegram(
  meta: RunMeta,
  sessionInfo: SessionInfo,
  rateAsOf: string
) {
  const strength =
    meta.score >= 88
      ? "حرفه‌ای"
      : meta.score >= 78
        ? "متوسط"
        : "ضعیف";

  const directionText =
    meta.direction === "BUY"
      ? "🟢 خرید"
      : "🔴 فروش";

  const newsText =
    String(
      meta.analysis
        ?.newsStatus ??
        "بررسی شد"
    );

  return [
    "🤖 <b>━━━ سیگنال هوش مصنوعی طلا ━━━</b>",
    "",
    "🪙 <b>XAUUSD | طلا</b>",
    `${directionText}`,
    `⭐ قدرت سیگنال: <b>${strength}</b>`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📍 ورود: <b>${fmtPrice(
      meta.entry
    )}</b>`,
    `🛑 حد ضرر: <b>${fmtPrice(
      meta.stopLoss
    )}</b>`,
    `💵 ریسک: <b>-${formatUsd(
      meta.riskUsd
    )}</b> | 🇮🇷 ${formatToman(
      meta.riskToman
    )}`,
    "",
    "🎯 <b>اهداف:</b>",
    "",
    `1️⃣ TP1: <b>${fmtPrice(
      meta.tp1
    )}</b>`,
    `💰 +${formatUsd(
      meta.tp1Usd
    )} | 📦 ${meta.tp1Lot.toFixed(
      2
    )} lot`,
    "",
    `2️⃣ TP2: <b>${fmtPrice(
      meta.tp2
    )}</b>`,
    `💰 +${formatUsd(
      meta.tp2Usd
    )} | 📦 ${meta.tp2Lot.toFixed(
      2
    )} lot`,
    "",
    `3️⃣ TP3: <b>${fmtPrice(
      meta.tp3
    )}</b>`,
    `💰 +${formatUsd(
      meta.tp3Usd
    )} | 📦 ${meta.tp3Lot.toFixed(
      2
    )} lot`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📦 حجم کل: <b>${meta.totalLot.toFixed(
      2
    )} lot</b>`,
    `💰 سود کامل: <b>+${formatUsd(
      meta.totalPotentialUsd
    )}</b>`,
    "",
    "🛡️ <b>مدیریت معامله</b>",
    "",
    "بعد از TP1:",
    "✅ 0.04 lot بسته می‌شود",
    "📦 0.06 lot باقی می‌ماند",
    "🔒 حد ضرر → نقطه ورود",
    "🛡️ معامله وارد حالت ریسک‌فری می‌شود",
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📊 امتیاز: <b>${meta.score}/100</b>`,
    `✅ تأییدیه‌ها: <b>${meta.confirmations}</b>`,
    `🕐 سشن: <b>${sessionInfo.flag} ${meta.session}</b>`,
    `🌍 ساعت سشن: <b>${sessionInfo.localTime}</b>`,
    `🇮🇷 ساعت ایران: <b>${sessionInfo.tehranTime}</b>`,
    `📰 وضعیت خبر: <b>${newsText}</b>`,
    "",
    `💱 نرخ دلار: <b>${new Intl.NumberFormat(
      "fa-IR"
    ).format(
      meta.usdToToman
    )} تومان</b>`,
    `🕒 زمان نرخ: ${rateAsOf}`,
    "",
    "⚠️ <b>این تحلیل توسط هوش مصنوعی تولید شده و تضمین‌کننده سود نیست.</b>",
    "⚠️ اجرای واقعی ممکن است به‌دلیل اسپرد، کمیسیون و اسلیپیج متفاوت باشد.",
  ].join("\n");
}

/* =========================================================
   EVENT TELEGRAM
   ========================================================= */

function buildEventTelegram(
  meta: RunMeta,
  event: EventRecord
) {
  const title =
    event.type === "TP1"
      ? "🟢 هدف اول فعال شد"
      : event.type === "TP2"
        ? "🟢 هدف دوم فعال شد"
        : event.type === "TP3"
          ? "🏆 معامله تکمیل شد"
          : event.type ===
              "BREAKEVEN"
            ? "🛡️ ریسک‌فری فعال شد"
            : "🔴 حد ضرر فعال شد";

  let advice = "";

  if (event.type === "TP1") {
    advice =
      [
        "🛡️ مدیریت معامله:",
        "0.04 lot بسته شد.",
        "0.06 lot باقی ماند.",
        "🔒 حد ضرر بخش باقی‌مانده → نقطه ورود",
        "یعنی معامله وارد حالت ریسک‌فری شد.",
      ].join("\n");
  }

  if (event.type === "TP2") {
    advice =
      [
        "📦 0.03 lot بسته شد.",
        "📦 0.03 lot باقی‌مانده است.",
        "🛡️ حد ضرر بخش باقی‌مانده روی نقطه ورود قرار دارد.",
      ].join("\n");
  }

  if (event.type === "TP3") {
    advice =
      "🏆 هر 0.10 lot معامله طبق برنامه بسته شد.";
  }

  if (event.type === "BREAKEVEN") {
    advice =
      "قیمت به نقطه ورود برگشت و بخش باقی‌مانده بدون زیان بسته شد؛ سود مراحل قبلی حفظ شده است.";
  }

  if (event.type === "SL") {
    advice =
      "🛑 معامله قبل از فعال شدن TP1 به حد ضرر رسید.";
  }

  const result =
    event.pnlUsd === 0
      ? "ریسک‌فری"
      : signedUsd(
          event.pnlUsd
        );

  return [
    "🤖 <b>تحلیل هوش مصنوعی طلا</b>",
    "",
    `<b>${title}</b>`,
    "",
    `🪙 XAUUSD | ${
      meta.direction ===
      "BUY"
        ? "🟢 خرید"
        : "🔴 فروش"
    }`,
    `📍 ورود: <b>${fmtPrice(
      meta.entry
    )}</b>`,
    `📌 قیمت رویداد: <b>${fmtPrice(
      event.price
    )}</b>`,
    "",
    `📦 حجم بسته‌شده: <b>${event.lotClosed.toFixed(
      2
    )} lot</b>`,
    `💵 نتیجه: <b>${result}</b>`,
    `🇮🇷 نتیجه: <b>${formatToman(
      event.pnlToman
    )}</b>`,
    "",
    advice,
    "",
    `💱 نرخ دلار: ${new Intl.NumberFormat(
      "fa-IR"
    ).format(
      event.usdToToman
    )} تومان`,
    `🕐 ${event.at}`,
    "",
    "⚠️ این پیام نتیجه محاسبات موتور تحلیل و مانیتورینگ است.",
  ].join("\n");
}

/* =========================================================
   ACTIVE RUNS
   ========================================================= */

async function activeRuns() {
  return prisma.analysisRun.findMany(
    {
      where: {
        symbol:
          DISPLAY_SYMBOL,

        status: {
          in:
            ACTIVE_STATUSES,
        },
      },

      orderBy: {
        createdAt:
          "asc",
      },

      take: 20,
    }
  );
}

/* =========================================================
   EVENT DUPLICATE PROTECTION
   ========================================================= */

function hasEvent(
  meta: RunMeta,
  type: EventType
) {
  return meta.events.some(
    (event) =>
      event.type === type
  );
}

/* =========================================================
   EVENT DELIVERY RETRY
   ========================================================= */

async function retryTelegramEvents(
  run: any
) {
  const meta =
    run.metadata as RunMeta;

  if (
    !meta ||
    meta.kind !==
      "AI_SCALP"
  ) {
    return [];
  }

  const pending =
    meta.events.filter(
      (event) =>
        event.telegramSent !==
        true
    );

  const retried: string[] = [];

  for (
    const event of pending
  ) {
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

      event.telegramError =
        undefined;

      retried.push(
        event.type
      );
    } catch (error) {
      event.telegramSent =
        false;

      event.telegramError =
        error instanceof Error
          ? error.message
          : String(error);
    }
  }

  if (pending.length) {
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
  }

  return retried;
}

/* =========================================================
   CREATE EVENT
   ========================================================= */

async function createEvent(
  run: any,
  meta: RunMeta,
  type: EventType,
  price: number,
  fxRate: number
) {
  if (
    hasEvent(
      meta,
      type
    )
  ) {
    return null;
  }

  const base =
    eventPnl(type);

  const now =
    new Date();

  const event: EventRecord =
    {
      type,

      at:
        now.toISOString(),

      price:
        round(price),

      lotClosed:
        base.lotClosed,

      pnlUsd:
        base.pnlUsd,

      pnlToman:
        toman(
          base.pnlUsd *
            fxRate
        ),

      usdToToman:
        fxRate,

      telegramSent:
        false,
    };

  meta.events.push(
    event
  );

  if (type === "TP1") {
    meta.state =
      "AI_TP1";

    meta.breakeven =
      true;
  }

  if (type === "TP2") {
    meta.state =
      "AI_TP2";

    meta.breakeven =
      true;
  }

  if (type === "TP3") {
    meta.state =
      "AI_TP3";
  }

  if (type === "SL") {
    meta.state =
      "AI_SL";
  }

  if (
    type === "BREAKEVEN"
  ) {
    meta.state =
      "AI_BE";
  }

  meta.lastUpdate =
    now.toISOString();

  /*
    Persist BEFORE Telegram.
    This is critical:
    if Telegram fails, the event is not lost.
  */
  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        status:
          meta.state,

        metadata:
          meta as any,

        finishedAt:
          (
            type === "SL" ||
            type === "TP3" ||
            type ===
              "BREAKEVEN"
          )
            ? now
            : undefined,
      },
    }
  );

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

    event.telegramError =
      undefined;
  } catch (error) {
    event.telegramSent =
      false;

    event.telegramError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        status:
          meta.state,

        metadata:
          meta as any,
      },
    }
  );

  return event;
}

/* =========================================================
   MONITOR ONE ACTIVE SIGNAL
   ========================================================= */

async function monitorOne(
  run: any
) {
  const meta =
    run.metadata as RunMeta;

  if (
    !meta ||
    meta.kind !==
      "AI_SCALP"
  ) {
    return null;
  }

  const now =
    new Date();

  let currentPrice =
    await latestPrice();

  meta.currentPrice =
    currentPrice;

  /*
    Get current FX rate.
    If NetArz is temporarily unavailable,
    do not fabricate a rate.
  */
  const fx =
    await getUsdToTomanRate();

  /*
    Retry unsent Telegram events first.
  */
  await retryTelegramEvents(
    run
  );

  /*
    Determine where monitoring should start.
  */
  const since =
    safeDate(
      meta.lastCheckedAt
    ) ??
    safeDate(
      meta.createdAt
    ) ??
    safeDate(
      run.createdAt
    ) ??
    new Date(
      now.getTime() -
        15 * 60_000
    );

  const history =
    await candlesSince(
      since
    );

  /*
    Always append current price as a final
    monitoring point if no new candle arrived.
  */
  if (!history.length) {
    const state =
      meta.state;

    /*
      Current-price emergency check.
    */
    if (
      state ===
        "AI_PENDING" &&
      stopHit(
        meta.direction,
        currentPrice,
        meta.stopLoss
      )
    ) {
      await createEvent(
        run,
        meta,
        "SL",
        currentPrice,
        fx.rate
      );
    } else if (
      state ===
        "AI_PENDING" &&
      targetHit(
        meta.direction,
        currentPrice,
        meta.tp1
      )
    ) {
      await createEvent(
        run,
        meta,
        "TP1",
        currentPrice,
        fx.rate
      );
    } else if (
      state ===
        "AI_TP1" &&
      stopHit(
        meta.direction,
        currentPrice,
        meta.entry
      )
    ) {
      await createEvent(
        run,
        meta,
        "BREAKEVEN",
        currentPrice,
        fx.rate
      );
    } else if (
      state ===
        "AI_TP1" &&
      targetHit(
        meta.direction,
        currentPrice,
        meta.tp2
      )
    ) {
      await createEvent(
        run,
        meta,
        "TP2",
        currentPrice,
        fx.rate
      );
    } else if (
      state ===
        "AI_TP2" &&
      stopHit(
        meta.direction,
        currentPrice,
        meta.entry
      )
    ) {
      await createEvent(
        run,
        meta,
        "BREAKEVEN",
        currentPrice,
        fx.rate
      );
    } else if (
      state ===
        "AI_TP2" &&
      targetHit(
        meta.direction,
        currentPrice,
        meta.tp3
      )
    ) {
      await createEvent(
        run,
        meta,
        "TP3",
        currentPrice,
        fx.rate
      );
    }
  }

  /*
    Process every new 1-minute candle in chronological order.
  */
  for (
    const candle of history
  ) {
    if (
      meta.state ===
        "AI_SL" ||
      meta.state ===
        "AI_BE" ||
      meta.state ===
        "AI_TP3"
    ) {
      break;
    }

    /*
      Conservative candle rule:
      If both stop and target are touched inside
      the same OHLC candle, exact intrabar order
      cannot be known from OHLC alone.
      We therefore treat SL as first.
    */

    if (
      meta.state ===
      "AI_PENDING"
    ) {
      const stopTouched =
        candleTouchesStop(
          meta.direction,
          candle,
          meta.stopLoss
        );

      const tp1Touched =
        candleTouchesTarget(
          meta.direction,
          candle,
          meta.tp1
        );

      if (
        stopTouched
      ) {
        await createEvent(
          run,
          meta,
          "SL",
          meta.stopLoss,
          fx.rate
        );

        break;
      }

      if (
        tp1Touched
      ) {
        await createEvent(
          run,
          meta,
          "TP1",
          meta.tp1,
          fx.rate
        );

        continue;
      }
    }

    if (
      meta.state ===
      "AI_TP1"
    ) {
      const stopTouched =
        candleTouchesStop(
          meta.direction,
          candle,
          meta.entry
        );

      const tp2Touched =
        candleTouchesTarget(
          meta.direction,
          candle,
          meta.tp2
        );

      if (
        stopTouched
      ) {
        await createEvent(
          run,
          meta,
          "BREAKEVEN",
          meta.entry,
          fx.rate
        );

        break;
      }

      if (
        tp2Touched
      ) {
        await createEvent(
          run,
          meta,
          "TP2",
          meta.tp2,
          fx.rate
        );

        continue;
      }
    }

    if (
      meta.state ===
      "AI_TP2"
    ) {
      const stopTouched =
        candleTouchesStop(
          meta.direction,
          candle,
          meta.entry
        );

      const tp3Touched =
        candleTouchesTarget(
          meta.direction,
          candle,
          meta.tp3
        );

      if (
        stopTouched
      ) {
        await createEvent(
          run,
          meta,
          "BREAKEVEN",
          meta.entry,
          fx.rate
        );

        break;
      }

      if (
        tp3Touched
      ) {
        await createEvent(
          run,
          meta,
          "TP3",
          meta.tp3,
          fx.rate
        );

        break;
      }
    }

    meta.lastCheckedAt =
      candle.datetime;
  }

  /*
    Update current price after candle processing.
  */
  currentPrice =
    await latestPrice();

  meta.currentPrice =
    currentPrice;

  meta.lastUpdate =
    now.toISOString();

  meta.lastCheckedAt =
    history.at(-1)
      ?.datetime ??
    now.toISOString();

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        status:
          meta.state,

        metadata:
          meta as any,

        finishedAt:
          (
            meta.state ===
              "AI_SL" ||
            meta.state ===
              "AI_BE" ||
            meta.state ===
              "AI_TP3"
          )
            ? new Date()
            : undefined,
      },
    }
  );

  return {
    id: run.id,

    state:
      meta.state,

    price:
      currentPrice,

    events:
      meta.events,

    checkedCandles:
      history.length,
  };
}

/* =========================================================
   SIGNAL SCAN
   ========================================================= */

async function scan(
  userId?: string
) {
  const active =
    await activeRuns();

  if (active.length) {
    return {
      created: false,

      reason:
        "active_trade",

      activeIds:
        active.map(
          (x) => x.id
        ),
    };
  }

  const news =
    await newsBlock();

  if (news.length) {
    return {
      created: false,

      reason:
        "high_impact_news",

      news:
        news.map(
          (x: any) => ({
            event:
              x.event,

            currency:
              x.currency,

            time:
              x.eventTime,

            importance:
              x.importance,
          })
        ),
    };
  }

  /*
    Real market data.
  */
  const [
    m1,
    m5,
    m15,
    h1,
  ] = await Promise.all([
    candles(
      "1min",
      180
    ),

    candles(
      "5min",
      120
    ),

    candles(
      "15min",
      100
    ),

    candles(
      "1h",
      80
    ),
  ]);

  const analysis =
    analyzeMarket(
      m1,
      m5,
      m15,
      h1
    );

  if (
    !analysis.direction ||
    analysis.score <
      SCORE_TO_SIGNAL ||
    analysis.confirmations <
      MIN_CONFIRMATIONS
  ) {
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

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

          metadata:
            {
              kind:
                "AI_SCALP",

              reason:
                "confirmation_or_score_below_threshold",

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
      }
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

  /*
    Entry uses the latest real 1-minute close.
  */
  const entry =
    m1.at(-1)?.close ??
    m5.at(-1)?.close ??
    0;

  if (!entry) {
    return {
      created: false,

      reason:
        "invalid_entry",
    };
  }

  const lv =
    levels(
      entry,
      analysis.direction
    );

  /*
    Basic structural protection.
  */
  const structureDistance =
    analysis.direction ===
    "BUY"
      ? entry -
        analysis.support
      : analysis.resistance -
        entry;

  if (
    structureDistance >
    STOP_DISTANCE + 0.25
  ) {
    return {
      created: false,

      reason:
        "structure_too_far",

      structureDistance:
        round(
          structureDistance
        ),
    };
  }

  const fx =
    await getUsdToTomanRate();

  const now =
    new Date();

  const sessionInfo =
    getSessionInfo(now);

  const confirmationScore =
    analysis.confirmations;

  const meta: RunMeta =
    {
      kind:
        "AI_SCALP",

      userId,

      symbol:
        DISPLAY_SYMBOL,

      direction:
        analysis.direction,

      entry:
        round(entry),

      stopLoss:
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
            fx.rate
        ),

      tp1Toman:
        toman(
          TP1_USD *
            fx.rate
        ),

      tp2Toman:
        toman(
          TP2_USD *
            fx.rate
        ),

      tp3Toman:
        toman(
          TP3_USD *
            fx.rate
        ),

      totalPotentialToman:
        toman(
          TOTAL_POTENTIAL_USD *
            fx.rate
        ),

      session:
        sessionInfo.name,

      score:
        analysis.score,

      confirmations:
        confirmationScore,

      timeframe:
        "1m + 5m + 15m + 1h",

      state:
        "AI_PENDING",

      breakeven:
        false,

      currentPrice:
        entry,

      events: [],

      analysis:
        {
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

          atr:
            round(
              analysis.atr,
              4
            ),

          t1:
            analysis.t1,

          t5:
            analysis.t5,

          t15:
            analysis.t15,

          t60:
            analysis.t60,

          contractSize:
            CONTRACT_SIZE,

          newsStatus:
            news.length
              ? "خبر مهم نزدیک است"
              : "خبر مهمی در بازه حفاظتی نیست",

          fxAsOf:
            fx.asOf,

          fxDelayed:
            fx.delayed,

          fxDelayedMinutes:
            fx.delayedMinutes,
        },

      createdAt:
        now.toISOString(),

      lastUpdate:
        now.toISOString(),

      lastCheckedAt:
        now.toISOString(),

      telegramInitialSent:
        false,
    };

  /*
    Build chart from REAL 1m candles.
  */
  const chartUrl =
    buildChartUrl(
      m1,
      meta
    );

  meta.chartUrl =
    chartUrl;

  const created =
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "1min + MTF",

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
            confirmationScore,

          finishedAt:
            now,

          metadata:
            meta as any,
        },
      }
    );

  /*
    Send text signal first.
    This guarantees that the signal exists even
    if the image renderer temporarily fails.
  */
  try {
    const messageId =
      await sendTelegram(
        buildSignalTelegram(
          meta,
          sessionInfo,
          fx.asOf
        )
      );

    meta.telegramInitialSent =
      true;

    meta.telegramInitialMessageId =
      messageId;

    meta.telegramInitialError =
      undefined;
  } catch (error) {
    meta.telegramInitialSent =
      false;

    meta.telegramInitialError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  /*
    Send the real chart snapshot.
  */
  try {
    const chartCaption =
      [
        `🪙 <b>XAUUSD</b> | ${
          meta.direction ===
          "BUY"
            ? "🟢 BUY"
            : "🔴 SELL"
        }`,

        `📍 ورود: <b>${fmtPrice(
          meta.entry
        )}</b>`,

        `🛑 SL: <b>${fmtPrice(
          meta.stopLoss
        )}</b>`,

        `🎯 TP1: <b>${fmtPrice(
          meta.tp1
        )}</b>`,

        `🎯 TP2: <b>${fmtPrice(
          meta.tp2
        )}</b>`,

        `🎯 TP3: <b>${fmtPrice(
          meta.tp3
        )}</b>`,

        `⭐ امتیاز: <b>${meta.score}/100</b>`,

        `✅ تأییدیه: <b>${meta.confirmations}</b>`,

        `🕐 ${
          sessionInfo.flag
        } ${meta.session}`,

        "📈 نمودار بر اساس داده واقعی XAUUSD هنگام صدور سیگنال است.",
      ].join("\n");

    const chartMessageId =
      await sendTelegramPhoto(
        chartUrl,
        chartCaption
      );

    meta.analysis = {
      ...meta.analysis,

      chartTelegramSent:
        true,

      chartTelegramMessageId:
        chartMessageId,
    };
  } catch (error) {
    meta.analysis = {
      ...meta.analysis,

      chartTelegramSent:
        false,

      chartTelegramError:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  /*
    Final persistence.
  */
  await prisma.analysisRun.update(
    {
      where: {
        id: created.id,
      },

      data: {
        metadata:
          meta as any,
      },
    }
  );

  return {
    created: true,

    id: created.id,

    meta,
  };
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function eventTotals(
  rows: any[]
) {
  const output = {
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
      row.metadata as RunMeta;

    if (
      !meta ||
      meta.kind !==
        "AI_SCALP"
    ) {
      continue;
    }

    output.trades++;

    let final:
      | EventType
      | null = null;

    for (
      const event of
        meta.events ??
        []
    ) {
      if (
        event.type ===
        "TP1"
      ) {
        output.tp1++;

        output.tp1Toman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "TP2"
      ) {
        output.tp2++;

        output.tp2Toman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "TP3"
      ) {
        output.tp3++;

        output.tp3Toman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "SL"
      ) {
        output.sl++;

        output.slToman +=
          event.pnlToman;
      }

      if (
        event.type ===
          "TP1" ||
        event.type ===
          "TP2" ||
        event.type ===
          "TP3" ||
        event.type ===
          "SL" ||
        event.type ===
          "BREAKEVEN"
      ) {
        final =
          event.type;
      }

      /*
        BE has zero P/L.
        Previous TP profit remains counted.
      */
      if (
        event.type !==
        "BREAKEVEN"
      ) {
        output.pnlUsd +=
          event.pnlUsd;

        output.pnlToman +=
          event.pnlToman;
      }
    }

    if (
      final ===
        "TP3"
    ) {
      output.wins++;
    }

    if (
      final ===
        "BREAKEVEN"
    ) {
      output.breakeven++;

      output.wins++;
    }

    if (
      final ===
        "SL"
    ) {
      output.losses++;
    }
  }

  return {
    ...output,

    tp1Toman:
      Math.round(
        output.tp1Toman
      ),

    tp2Toman:
      Math.round(
        output.tp2Toman
      ),

    tp3Toman:
      Math.round(
        output.tp3Toman
      ),

    slToman:
      Math.round(
        output.slToman
      ),

    pnlUsd:
      money(
        output.pnlUsd
      ),

    pnlToman:
      Math.round(
        output.pnlToman
      ),
  };
}

/* =========================================================
   PERIOD
   ========================================================= */

function startOfPeriod(
  kind:
    | "day"
    | "week"
    | "month"
) {
  const d =
    new Date();

  d.setUTCHours(
    0,
    0,
    0,
    0
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
        1
    );

    return d;
  }

  d.setUTCDate(1);

  return d;
}

/* =========================================================
   PERFORMANCE QUERY
   ========================================================= */

async function performance() {
  const [
    day,
    week,
    month,
    recent,
  ] =
    await Promise.all([
      prisma.analysisRun.findMany(
        {
          where: {
            symbol:
              DISPLAY_SYMBOL,

            createdAt: {
              gte:
                startOfPeriod(
                  "day"
                ),
            },

            signalGenerated:
              true,
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

            createdAt: {
              gte:
                startOfPeriod(
                  "week"
                ),
            },

            signalGenerated:
              true,
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

            createdAt: {
              gte:
                startOfPeriod(
                  "month"
                ),
            },

            signalGenerated:
              true,
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

          take: 30,
        }
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
        (row) => ({
          id:
            row.id,

          createdAt:
            row.createdAt,

          status:
            row.status,

          metadata:
            row.metadata,
        })
      ),
  };
}

/* =========================================================
   SESSION REPORT
   ========================================================= */

async function sessionReport(
  name: SessionName
) {
  const now =
    new Date();

  const key =
    sessionKey(
      name,
      now
    );

  const already =
    await prisma.analysisRun.findFirst(
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
      }
    );

  if (
    already &&
    (already.metadata as any)
      ?.key === key
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
      }
    );

  const rows =
    all.filter(
      (row) => {
        const meta =
          row.metadata as any;

        if (
          meta?.kind !==
            "AI_SCALP" ||
          meta?.session !==
            name
        ) {
          return false;
        }

        const created =
          safeDate(
            meta?.createdAt
          ) ??
          row.createdAt;

        return (
          sessionKey(
            name,
            created
          ) === key
        );
      }
    );

  const totals =
    eventTotals(rows);

  if (
    !totals.trades
  ) {
    return {
      sent: false,

      reason:
        "no_trades",
    };
  }

  const fx =
    await getUsdToTomanRate();

  const message =
    [
      "🤖 <b>کارنامه سشن تحلیل هوش مصنوعی</b>",
      "",
      `🪙 XAUUSD`,
      `🕐 ${name}`,
      `📅 ${key}`,
      "",
      `📊 معاملات: <b>${totals.trades}</b>`,
      `🎯 TP1: <b>${totals.tp1}</b>`,
      `🎯 TP2: <b>${totals.tp2}</b>`,
      `🏆 TP3: <b>${totals.tp3}</b>`,
      `🛑 SL: <b>${totals.sl}</b>`,
      `🛡️ BE: <b>${totals.breakeven}</b>`,
      "",
      `📈 برد: <b>${totals.wins}</b>`,
      `📉 باخت: <b>${totals.losses}</b>`,
      "",
      `💰 خالص: <b>${signedUsd(
        totals.pnlUsd
      )}</b>`,
      `🇮🇷 خالص: <b>${totals.pnlToman >= 0 ? "+" : "-"}${formatToman(
        Math.abs(
          totals.pnlToman
        )
      )}</b>`,
      "",
      `💱 نرخ دلار: <b>${new Intl.NumberFormat(
        "fa-IR"
      ).format(
        fx.rate
      )} تومان</b>`,
      "",
      "⚠️ این گزارش فقط بر اساس رویدادهای واقعی ثبت‌شده توسط موتور مانیتورینگ است.",
    ].join("\n");

  let messageId =
    "";

  try {
    messageId =
      await sendTelegram(
        message
      );
  } catch {
    /*
      Report remains recorded.
    */
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

        metadata:
          {
            kind:
              "SESSION_REPORT",

            key,

            session:
              name,

            totals,

            usdToToman:
              fx.rate,

            telegramMessageId:
              messageId,
          } as any,
      },
    }
  );

  return {
    sent: true,

    totals,
  };
}

/* =========================================================
   CRON ENGINE
   ========================================================= */

async function cronCycle() {
  const monitored: any[] =
    [];

  /*
    Monitor ALL active signals.
  */
  const active =
    await activeRuns();

  for (
    const run of active
  ) {
    try {
      const result =
        await monitorOne(
          run
        );

      if (result) {
        monitored.push(
          result
        );
      }
    } catch (error) {
      monitored.push({
        id:
          run.id,

        error:
          error instanceof
          Error
            ? error.message
            : String(error),
      });
    }
  }

  /*
    Retry initial Telegram deliveries.
  */
  for (
    const run of active
  ) {
    const meta =
      run.metadata as RunMeta;

    if (
      meta?.kind ===
        "AI_SCALP" &&
      meta.telegramInitialSent !==
        true
    ) {
      try {
        const sessionInfo =
          getSessionInfo();

        const fx =
          await getUsdToTomanRate();

        const messageId =
          await sendTelegram(
            buildSignalTelegram(
              meta,
              sessionInfo,
              fx.asOf
            )
          );

        meta.telegramInitialSent =
          true;

        meta.telegramInitialMessageId =
          messageId;

        meta.telegramInitialError =
          undefined;

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
      } catch (error) {
        meta.telegramInitialError =
          error instanceof
          Error
            ? error.message
            : String(error);

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
      }
    }
  }

  /*
    If there is no active trade,
    search for a new one.
  */
  if (!active.length) {
    try {
      const scanResult =
        await scan();

      monitored.push({
        scan:
          scanResult,
      });
    } catch (error) {
      monitored.push({
        scanError:
          error instanceof
          Error
            ? error.message
            : String(error),
      });
    }
  }

  /*
    Session reports.
  */
  const reports:
    Record<
      string,
      unknown
    > = {};

  /*
    Only send report when session just ended.
    We use a 5-minute window to avoid duplicate reports.
  */
  const now =
    new Date();

  const sessionNames =
    Object.keys(
      SESSION_CONFIG
    ) as SessionName[];

  for (
    const name of
      sessionNames
  ) {
    const config =
      SESSION_CONFIG[name];

    const hour =
      getHourInTimezone(
        now,
        config.timezone
      );

    /*
      Session report approximately
      around the local closing hour.
    */
    if (
      hour ===
        config.endHour &&
      now.getMinutes() <
        5
    ) {
      try {
        reports[name] =
          await sessionReport(
            name
          );
      } catch (
        error
      ) {
        reports[name] = {
          error:
            error instanceof
            Error
              ? error.message
              : String(error),
        };
      }
    }
  }

  return {
    monitored,

    reports,

    at:
      new Date().toISOString(),
  };
}

/* =========================================================
   DASHBOARD DATA
   ========================================================= */

async function dashboard(
  userId: string
) {
  const [
    active,
    latest,
    perf,
    fx,
    chartCandles,
    price,
  ] =
    await Promise.all([
      activeRuns(),

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

      performance(),

      getUsdToTomanRate()
        .catch(
          () => null
        ),

      candles(
        "1min",
        180
      ).catch(
        () => []
      ),

      latestPrice()
        .catch(
          () => null
        ),
    ]);

  const latestMeta =
    latest?.metadata as
      | RunMeta
      | undefined;

  const activePayload =
    active.map(
      (run) => ({
        id:
          run.id,

        status:
          run.status,

        createdAt:
          run.createdAt,

        metadata:
          run.metadata,
      })
    );

  return {
    symbol:
      DISPLAY_SYMBOL,

    dataSource:
      "Twelve Data XAU/USD",

    live:
      true,

    currentPrice:
      price,

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
      activePayload[0] ??
      null,

    activeSignals:
      activePayload,

    latest:
      latestMeta
        ? {
            id:
              latest?.id,

            status:
              latest?.status,

            createdAt:
              latest?.createdAt,

            metadata:
              latestMeta,
          }
        : null,

    performance:
      perf,

    usdToToman:
      fx,

    sessions:
      SESSION_CONFIG,

    sessionInfo:
      getSessionInfo(),

    candles:
      chartCandles,

    userId,
  };
}

/* =========================================================
   AUTH / CRON
   ========================================================= */

function validCronRequest(
  request: NextRequest
): boolean {
  const url =
    new URL(
      request.url
    );

  const querySecret =
    url.searchParams.get(
      "secret"
    );

  const headerSecret =
    request.headers.get(
      "x-ai-cron-secret"
    ) ||
    request.headers.get(
      "x-signals-cron-secret"
    ) ||
    request.headers.get(
      "x-cron-secret"
    );

  const provided =
    headerSecret ||
    querySecret;

  return Boolean(
    CRON_SECRET &&
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
      new URL(
        request.url
      );

    const cron =
      url.searchParams.get(
        "cron"
      ) === "1";

    /*
      Server-to-server Cron
    */
    if (cron) {
      if (
        !validCronRequest(
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
        await cronCycle();

      return NextResponse.json(
        {
          ok: true,

          engine:
            "AI_GOLD_ENGINE",

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
      Normal dashboard request
    */
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

    /*
      Optional manual scan.
      Example:
      /api/ai-analysis?scan=1
    */
    const manualScan =
      url.searchParams.get(
        "scan"
      ) === "1";

    let scanResult:
      | unknown
      | undefined;

    if (
      manualScan
    ) {
      scanResult =
        await scan(
          session.userId
        );
    }

    const data =
      await dashboard(
        session.userId
      );

    return NextResponse.json(
      {
        ok: true,

        data,

        scan:
          scanResult,
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
      "AI_ANALYSIS_ENGINE_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "خطای داخلی موتور تحلیل هوش مصنوعی",
      },

      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
