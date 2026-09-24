import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
|--------------------------------------------------------------------------
| Trading AI - XAUUSD AI Analysis Engine
|--------------------------------------------------------------------------
| بازار:
| XAUUSD / Gold
|
| حجم:
| 0.10 Lot
|
| مدیریت سود:
| TP1 = 0.04 Lot = +$20
| TP2 = 0.03 Lot = +$24
| TP3 = 0.03 Lot = +$36
| Full TP = +$80
|
| ریسک:
| SL = -$4
|
| بعد از TP1:
| 0.04 Lot بسته می‌شود
| 0.06 Lot باقی می‌ماند
| SL -> Entry
|
| نکته:
| هیچ سفارش بروکری در این API ارسال نمی‌شود.
| این موتور تحلیل، سیگنال، مانیتور و اعلان تلگرام را مدیریت می‌کند.
|--------------------------------------------------------------------------
*/

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

/* قرارداد استاندارد */
const CONTRACT_SIZE = 100;

/* حجم کل */
const TOTAL_LOT = 0.10;

/* حجم هر TP */
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

/* مبالغ واقعی مدل */
const STOP_USD = 4;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_POTENTIAL_USD =
  TP1_USD +
  TP2_USD +
  TP3_USD;

/*
 * فاصله قیمتی XAUUSD
 *
 * 0.10 lot * 100 oz = $10 به ازای هر $1 حرکت
 *
 * بنابراین:
 * $4 ضرر = 0.40 حرکت قیمت
 * $20 روی 0.04 lot = $5 حرکت
 * $24 روی 0.03 lot = $8 حرکت
 * $36 روی 0.03 lot = $12 حرکت
 */

const STOP_DISTANCE =
  STOP_USD / (TOTAL_LOT * CONTRACT_SIZE);

const TP1_DISTANCE =
  TP1_USD / (TP1_LOT * CONTRACT_SIZE);

const TP2_DISTANCE =
  TP2_USD / (TP2_LOT * CONTRACT_SIZE);

const TP3_DISTANCE =
  TP3_USD / (TP3_LOT * CONTRACT_SIZE);

/* تحلیل */
const SCORE_TO_SIGNAL = 80;
const MIN_CONFIRMATIONS = 3;

/* خبر مهم */
const DEFAULT_NEWS_MINUTES = 30;

/* Environment */
const TD_KEY = process.env.TWELVE_DATA_API_KEY;
const NETARZ_KEY = process.env.NETARZ_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET ||
  process.env.SIGNALS_CRON_SECRET;

/*
|--------------------------------------------------------------------------
| Sessions
|--------------------------------------------------------------------------
| زمان‌ها بر اساس ساعت محلی همان کشور هستند.
| استفاده از Intl باعث می‌شود DST لندن/نیویورک نیز درست محاسبه شود.
|--------------------------------------------------------------------------
*/

type SessionName =
  | "Sydney"
  | "Tokyo"
  | "London"
  | "New York";

type SessionConfig = {
  fa: string;
  flag: string;
  country: string;
  timezone: string;
  startHour: number;
  endHour: number;
};

const SESSIONS: Record<SessionName, SessionConfig> = {
  Sydney: {
    fa: "سیدنی",
    flag: "🇦🇺",
    country: "استرالیا",
    timezone: "Australia/Sydney",
    startHour: 8,
    endHour: 17,
  },

  Tokyo: {
    fa: "توکیو",
    flag: "🇯🇵",
    country: "ژاپن",
    timezone: "Asia/Tokyo",
    startHour: 9,
    endHour: 18,
  },

  London: {
    fa: "لندن",
    flag: "🇬🇧",
    country: "بریتانیا",
    timezone: "Europe/London",
    startHour: 8,
    endHour: 17,
  },

  "New York": {
    fa: "نیویورک",
    flag: "🇺🇸",
    country: "آمریکا",
    timezone: "America/New_York",
    startHour: 8,
    endHour: 17,
  },
};

type Direction = "BUY" | "SELL";

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
  type: EventType;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
  rateAsOf: string;
  rateDelayed: boolean;
  rateDelayedMinutes: number;
};

type FxRate = {
  rate: number;
  asOf: string;
  delayed: boolean;
  delayedMinutes: number;
  plan: string;
  source: string;
};

type SessionSnapshot = {
  active: SessionName;
  activeFa: string;
  flag: string;
  country: string;
  localTime: string;
  iranTime: string;
  sessions: Record<
    string,
    {
      name: string;
      flag: string;
      country: string;
      localTime: string;
      active: boolean;
    }
  >;
};

type RunMeta = {
  kind: "AI_SCALP";

  userId?: string;

  symbol: string;

  direction: Direction;

  strength:
    | "ضعیف"
    | "متوسط"
    | "حرفه‌ای";

  entry: number;

  stopLoss: number;

  tp1: number;

  tp2: number;

  tp3: number;

  totalLot: number;

  tp1Lot: number;

  tp2Lot: number;

  tp3Lot: number;

  remainingAfterTp1: number;

  riskUsd: number;

  tp1Usd: number;

  tp2Usd: number;

  tp3Usd: number;

  totalPotentialUsd: number;

  usdToToman: number;

  rateAsOf: string;

  rateDelayed: boolean;

  rateDelayedMinutes: number;

  riskToman: number;

  tp1Toman: number;

  tp2Toman: number;

  tp3Toman: number;

  totalPotentialToman: number;

  session: SessionName;

  sessionFa: string;

  sessionFlag: string;

  sessionCountry: string;

  sessionLocalTime: string;

  iranTime: string;

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

  createdAt: string;

  lastUpdate: string;
};

/*
|--------------------------------------------------------------------------
| Utility
|--------------------------------------------------------------------------
*/

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

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}$${new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(Math.abs(value))}`;
}

function formatToman(value: number): string {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${new Intl.NumberFormat(
    "fa-IR"
  ).format(Math.round(Math.abs(value)))} تومان`;
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function faNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function esc(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/*
|--------------------------------------------------------------------------
| Time / Sessions
|--------------------------------------------------------------------------
*/

function timeInZone(
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

function iranDateTime(
  date = new Date()
): string {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: "Asia/Tehran",
      dateStyle: "short",
      timeStyle: "medium",
    }
  ).format(date);
}

function hourInZone(
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

  const hour = Number(
    parts.find((p) => p.type === "hour")?.value
  );

  return hour === 24 ? 0 : hour;
}

function isSessionActive(
  config: SessionConfig,
  date = new Date()
): boolean {
  const hour = hourInZone(
    date,
    config.timezone
  );

  return (
    hour >= config.startHour &&
    hour < config.endHour
  );
}

function currentSession(
  date = new Date()
): SessionName {
  /*
   * اولویت در زمان همپوشانی:
   * New York
   * London
   * Tokyo
   * Sydney
   */

  const priority: SessionName[] = [
    "New York",
    "London",
    "Tokyo",
    "Sydney",
  ];

  for (const name of priority) {
    if (
      isSessionActive(
        SESSIONS[name],
        date
      )
    ) {
      return name;
    }
  }

  /*
   * اگر هیچ سشنی فعال نبود،
   * نزدیک‌ترین سشن را برمی‌گردانیم.
   */

  return "Sydney";
}

function sessionSnapshot(
  date = new Date()
): SessionSnapshot {
  const active = currentSession(date);

  const sessions: SessionSnapshot["sessions"] =
    {};

  for (const [
    name,
    config,
  ] of Object.entries(SESSIONS) as [
    SessionName,
    SessionConfig
  ][]) {
    sessions[name] = {
      name: config.fa,
      flag: config.flag,
      country: config.country,
      localTime: timeInZone(
        date,
        config.timezone
      ),
      active:
        name === active &&
        isSessionActive(config, date),
    };
  }

  const config = SESSIONS[active];

  return {
    active,
    activeFa: config.fa,
    flag: config.flag,
    country: config.country,
    localTime: timeInZone(
      date,
      config.timezone
    ),
    iranTime: iranDateTime(date),
    sessions,
  };
}

/*
|--------------------------------------------------------------------------
| Twelve Data
|--------------------------------------------------------------------------
*/

async function td(
  url: string
): Promise<any> {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables تنظیم نشده است."
    );
  }

  const separator = url.includes("?")
    ? "&"
    : "?";

  const fullUrl =
    `${url}${separator}apikey=${encodeURIComponent(
      TD_KEY
    )}`;

  const response = await fetch(
    fullUrl,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );

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

async function candles(
  interval: string,
  outputsize: number
): Promise<Candle[]> {
  const data = await td(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      SYMBOL
    )}&interval=${encodeURIComponent(
      interval
    )}&outputsize=${outputsize}&order=ASC&timezone=UTC`
  );

  if (!Array.isArray(data?.values)) {
    throw new Error(
      `داده کندل ${interval} دریافت نشد.`
    );
  }

  return data.values
    .map((item: any) => ({
      datetime: String(
        item.datetime
      ),
      open: num(item.open),
      high: num(item.high),
      low: num(item.low),
      close: num(item.close),
      volume: num(item.volume),
    }))
    .filter(
      (item: Candle) =>
        item.close > 0 &&
        item.high > 0 &&
        item.low > 0
    )
    .sort(
      (a: Candle, b: Candle) =>
        a.datetime.localeCompare(
          b.datetime
        )
    );
}

async function latestPrice(): Promise<number> {
  try {
    const data = await td(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
        SYMBOL
      )}&dp=5`
    );

    const price = num(data?.price);

    if (price > 0) {
      return price;
    }
  } catch {
    /*
     * fallback پایین‌تر
     */
  }

  /*
   * اگر endpoint قیمت لحظه‌ای مشکل داشت،
   * آخرین کندل را می‌گیریم.
   */

  const fallback = await candles(
    "1min",
    2
  );

  const price =
    fallback.at(-1)?.close ?? 0;

  if (!price) {
    throw new Error(
      "قیمت XAUUSD دریافت نشد."
    );
  }

  return price;
}

/*
|--------------------------------------------------------------------------
| Indicators
|--------------------------------------------------------------------------
*/

function sma(
  values: number[],
  period: number
): number {
  if (!values.length) return 0;

  if (values.length < period) {
    return (
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / values.length
    );
  }

  const slice =
    values.slice(-period);

  return (
    slice.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / slice.length
  );
}

function ema(
  values: number[],
  period: number
): number {
  if (!values.length) return 0;

  const multiplier =
    2 / (period + 1);

  let result = values[0];

  for (
    let i = 1;
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
    const change =
      values[i] -
      values[i - 1];

    if (change >= 0) {
      gain += change;
    } else {
      loss -= change;
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
      Math.max(change, 0);

    const currentLoss =
      Math.max(-change, 0);

    gain =
      (gain * (period - 1) +
        currentGain) /
      period;

    loss =
      (loss * (period - 1) +
        currentLoss) /
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

  const ranges: number[] = [];

  for (
    let i = 1;
    i < candlesData.length;
    i++
  ) {
    const current =
      candlesData[i];

    const previous =
      candlesData[i - 1];

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

    ranges.push(trueRange);
  }

  return sma(ranges, period);
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
  data: Candle[],
  lookback = 30
) {
  const slice =
    data.slice(-lookback);

  if (!slice.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  return {
    support: Math.min(
      ...slice.map(
        (item) => item.low
      )
    ),

    resistance: Math.max(
      ...slice.map(
        (item) => item.high
      )
    ),
  };
}

function candleBias(
  data: Candle[]
): number {
  const previous =
    data.at(-2);

  const current =
    data.at(-1);

  if (!previous || !current) {
    return 0;
  }

  const body = Math.abs(
    current.close -
      current.open
  );

  const range = Math.max(
    current.high -
      current.low,
    0.0001
  );

  const bullish =
    current.close >
      current.open &&
    (
      body / range > 0.55 ||
      current.close >
        previous.high
    );

  const bearish =
    current.close <
      current.open &&
    (
      body / range > 0.55 ||
      current.close <
        previous.low
    );

  if (bullish) return 1;
  if (bearish) return -1;

  return 0;
}

/*
|--------------------------------------------------------------------------
| Trend
|--------------------------------------------------------------------------
*/

function trendScore(
  data: Candle[]
) {
  const closes =
    data.map(
      (item) => item.close
    );

  const ema20 = ema(
    closes,
    20
  );

  const ema50 = ema(
    closes,
    50
  );

  const currentRsi =
    rsi(closes);

  const currentMacd =
    macd(closes);

  const buy =
    ema20 > ema50 &&
    currentRsi >= 52 &&
    currentRsi <= 72 &&
    currentMacd > 0;

  const sell =
    ema20 < ema50 &&
    currentRsi <= 48 &&
    currentRsi >= 28 &&
    currentMacd < 0;

  if (buy) {
    return {
      direction:
        "BUY" as Direction,
      score: 25,
      ema20,
      ema50,
      rsi: currentRsi,
      macd: currentMacd,
    };
  }

  if (sell) {
    return {
      direction:
        "SELL" as Direction,
      score: 25,
      ema20,
      ema50,
      rsi: currentRsi,
      macd: currentMacd,
    };
  }

  return {
    direction: null,
    score: 0,
    ema20,
    ema50,
    rsi: currentRsi,
    macd: currentMacd,
  };
}

/*
|--------------------------------------------------------------------------
| Market Analysis
|--------------------------------------------------------------------------
*/

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[]
) {
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
      (item) =>
        item === "BUY"
    ).length;

  const sellVotes =
    directions.filter(
      (item) =>
        item === "SELL"
    ).length;

  let direction:
    | Direction
    | null = null;

  if (buyVotes >= 2) {
    direction = "BUY";
  } else if (
    sellVotes >= 2
  ) {
    direction = "SELL";
  }

  const reasons: string[] =
    [];

  let score = 0;
  let confirmations = 0;

  /*
   * 1. MTF
   */
  if (direction) {
    score += 25;
    confirmations++;

    reasons.push(
      "هم‌جهتی تایم‌فریم‌های اصلی"
    );
  }

  /*
   * 2. M1
   */
  if (
    direction &&
    t1.direction === direction
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "تأیید روند تایم‌فریم 1 دقیقه"
    );
  }

  /*
   * 3. 15M + 1H
   */
  if (
    direction &&
    t15.direction ===
      direction &&
    t60.direction ===
      direction
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "تأیید 15 دقیقه و 1 ساعت"
    );
  }

  const currentPrice =
    m5.at(-1)?.close ?? 0;

  const structure =
    swings(m5, 30);

  const currentAtr =
    atr(m5);

  /*
   * 4. Support / Resistance
   */
  const nearSupport =
    direction === "BUY" &&
    currentPrice -
      structure.support <=
      Math.max(
        currentAtr * 1.5,
        8
      );

  const nearResistance =
    direction === "SELL" &&
    structure.resistance -
      currentPrice <=
      Math.max(
        currentAtr * 1.5,
        8
      );

  if (
    nearSupport ||
    nearResistance
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "قیمت نزدیک ناحیه ساختاری معتبر"
    );
  }

  /*
   * 5. Candle
   */
  const candle =
    candleBias(m5);

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
      "تأیید کندلی"
    );
  }

  /*
   * 6. Volume
   */
  const currentVolume =
    m5.at(-1)?.volume ??
    0;

  const averageVolume =
    sma(
      m5
        .slice(0, -1)
        .map(
          (item) =>
            item.volume
        ),
      20
    );

  if (
    currentVolume > 0 &&
    averageVolume > 0 &&
    currentVolume >=
      averageVolume * 1.05
  ) {
    score += 5;
    confirmations++;

    reasons.push(
      "حجم بالاتر از میانگین"
    );
  }

  /*
   * 7. Momentum
   */
  if (
    direction === "BUY" &&
    t5.rsi >= 52 &&
    t5.rsi <= 68
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "مومنتوم خرید"
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
      "مومنتوم فروش"
    );
  }

  /*
   * 8. EMA
   */
  if (
    direction &&
    (
      (
        direction === "BUY" &&
        currentPrice >
          t5.ema20
      ) ||
      (
        direction === "SELL" &&
        currentPrice <
          t5.ema20
      )
    )
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "موقعیت مناسب قیمت نسبت به EMA20"
    );
  }

  /*
   * 9. Structure Range
   */
  if (
    currentAtr > 0 &&
    structure.resistance -
      structure.support >=
      currentAtr * 2
  ) {
    score += 5;
    confirmations++;

    reasons.push(
      "دامنه ساختاری مناسب"
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

    atr: currentAtr,

    candle,

    t5,
    t15,
    t60,
  };
}

/*
|--------------------------------------------------------------------------
| News Filter
|--------------------------------------------------------------------------
*/

async function newsBlock() {
  const now =
    new Date();

  const until =
    new Date(
      now.getTime() +
        DEFAULT_NEWS_MINUTES *
          60_000
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
    }
  );
}

/*
|--------------------------------------------------------------------------
| USD -> Toman
|--------------------------------------------------------------------------
|
| از mid استفاده می‌کنیم.
| نرخ و زمان نرخ در رویداد ذخیره می‌شود.
|--------------------------------------------------------------------------
*/

let fxCache:
  | {
      value: FxRate;
      cachedAt: number;
    }
  | null = null;

async function getUsdToTomanRate(): Promise<FxRate> {
  /*
   * برای جلوگیری از مصرف بی‌دلیل سهمیه API
   * نرخ را حداکثر 60 ثانیه در حافظه نگه می‌داریم.
   */

  if (
    fxCache &&
    Date.now() -
      fxCache.cachedAt <
      60_000
  ) {
    return fxCache.value;
  }

  if (!NETARZ_KEY) {
    throw new Error(
      "NETARZ_API_KEY در Render تنظیم نشده است."
    );
  }

  const response =
    await fetch(
      "https://netarz.ir/api/fx/v1/rates/USD",
      {
        headers: {
          Authorization:
            `Bearer ${NETARZ_KEY}`,
        },

        cache: "no-store",

        signal:
          AbortSignal.timeout(
            10000
          ),
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

  const rate =
    num(
      data?.data?.mid ??
        data?.meta?.usd_irt
    );

  if (!rate) {
    throw new Error(
      "نرخ USD/IRT از NetArz دریافت نشد."
    );
  }

  const result: FxRate = {
    rate: Math.round(rate),

    asOf:
      String(
        data?.meta?.as_of ??
          new Date().toISOString()
      ),

    delayed:
      Boolean(
        data?.meta?.is_delayed
      ),

    delayedMinutes:
      num(
        data?.meta
          ?.delayed_minutes
      ),

    plan:
      String(
        data?.meta?.plan ??
          "unknown"
      ),

    source:
      String(
        data?.meta?.source ??
          "netarz.ir"
      ),
  };

  fxCache = {
    value: result,
    cachedAt: Date.now(),
  };

  return result;
}

/*
|--------------------------------------------------------------------------
| Price Levels
|--------------------------------------------------------------------------
*/

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

function hitTarget(
  direction: Direction,
  price: number,
  target: number
) {
  return direction === "BUY"
    ? price >= target
    : price <= target;
}

function hitStop(
  direction: Direction,
  price: number,
  stop: number
) {
  return direction === "BUY"
    ? price <= stop
    : price >= stop;
}

/*
|--------------------------------------------------------------------------
| Strength
|--------------------------------------------------------------------------
*/

function strengthFromScore(
  score: number,
  confirmations: number
):
  | "ضعیف"
  | "متوسط"
  | "حرفه‌ای" {
  if (
    score >= 90 &&
    confirmations >= 6
  ) {
    return "حرفه‌ای";
  }

  if (
    score >= 80 &&
    confirmations >= 3
  ) {
    return "متوسط";
  }

  return "ضعیف";
}

/*
|--------------------------------------------------------------------------
| P/L Event
|--------------------------------------------------------------------------
*/

function eventPnl(
  type: EventType
) {
  switch (type) {
    case "TP1":
      return {
        lotClosed: TP1_LOT,
        pnlUsd: TP1_USD,
      };

    case "TP2":
      return {
        lotClosed: TP2_LOT,
        pnlUsd: TP2_USD,
      };

    case "TP3":
      return {
        lotClosed: TP3_LOT,
        pnlUsd: TP3_USD,
      };

    case "SL":
      return {
        lotClosed: TOTAL_LOT,
        pnlUsd: -STOP_USD,
      };

    case "BREAKEVEN":
      return {
        lotClosed: 0,
        pnlUsd: 0,
      };
  }
}

/*
|--------------------------------------------------------------------------
| Telegram
|--------------------------------------------------------------------------
*/

async function sendTelegram(
  text: string
): Promise<string> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN یا TELEGRAM_SIGNAL_CHAT_ID تنظیم نشده است."
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

        signal:
          AbortSignal.timeout(
            10000
          ),
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
    data?.result?.message_id ??
      ""
  );
}

/*
|--------------------------------------------------------------------------
| Historical Performance
|--------------------------------------------------------------------------
*/

async function historicalPerformance() {
  const rows =
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
            "desc",
        },

        take: 100,
      }
    );

  let closed = 0;
  let wins = 0;
  let losses = 0;
  let breakevens = 0;

  let pnlUsd = 0;
  let pnlToman = 0;

  for (const row of rows) {
    const meta =
      row.metadata as RunMeta | null;

    if (
      !meta ||
      meta.kind !==
        "AI_SCALP"
    ) {
      continue;
    }

    const events =
      Array.isArray(
        meta.events
      )
        ? meta.events
        : [];

    let final:
      | EventType
      | null = null;

    for (const event of events) {
      if (
        event.type === "TP1" ||
        event.type === "TP2" ||
        event.type === "TP3" ||
        event.type === "SL" ||
        event.type ===
          "BREAKEVEN"
      ) {
        final =
          event.type;
      }

      if (
        event.type !==
        "BREAKEVEN"
      ) {
        pnlUsd +=
          num(
            event.pnlUsd
          );

        pnlToman +=
          num(
            event.pnlToman
          );
      }
    }

    if (!final) {
      continue;
    }

    if (
      final === "SL"
    ) {
      losses++;
      closed++;
    } else if (
      final ===
        "BREAKEVEN"
    ) {
      breakevens++;
      closed++;
    } else if (
      final === "TP3"
    ) {
      wins++;
      closed++;
    }
  }

  const winRate =
    closed > 0
      ? round(
          (wins /
            closed) *
            100,
          1
        )
      : null;

  return {
    closed,
    wins,
    losses,
    breakevens,
    winRate,
    pnlUsd:
      money(pnlUsd),
    pnlToman:
      Math.round(
        pnlToman
      ),
  };
}

/*
|--------------------------------------------------------------------------
| Telegram - New Signal
|--------------------------------------------------------------------------
*/

function buildSignalTelegram(
  meta: RunMeta,
  history: Awaited<
    ReturnType<
      typeof historicalPerformance
    >
  >
) {
  const directionText =
    meta.direction ===
    "BUY"
      ? "🟢 خرید"
      : "🔴 فروش";

  const rateStatus =
    meta.rateDelayed
      ? `⚠️ نرخ با ${meta.rateDelayedMinutes} دقیقه تأخیر`
      : "🟢 نرخ بدون تأخیر";

  const historicalText =
    history.closed > 0
      ? `${history.winRate}% از معاملات بسته‌شده`
      : "هنوز داده کافی ثبت نشده";

  return [
    "🤖 <b>━━━ سیگنال هوش مصنوعی طلا ━━━</b>",
    "",

    `🪙 <b>XAUUSD | طلا</b>`,
    `${directionText} | قدرت: <b>${esc(
      meta.strength
    )}</b>`,

    "",

    "━━━━━━━━━━━━━━━━━━",

    `📍 <b>نقطه ورود:</b> ${formatPrice(
      meta.entry
    )}`,

    `🛑 <b>حد ضرر:</b> ${formatPrice(
      meta.stopLoss
    )}`,
    `💔 ریسک کل: <b>${formatUsd(
      -meta.riskUsd
    )}</b> | 🇮🇷 ${formatToman(
      -meta.riskToman
    )}`,

    "",

    "🎯 <b>اهداف سود</b>",

    `1️⃣ TP1 → <b>${formatPrice(
      meta.tp1
    )}</b>`,
    `💰 +$20 | 📦 0.04 لات | 🇮🇷 ${formatToman(
      meta.tp1Toman
    )}`,

    "",

    `2️⃣ TP2 → <b>${formatPrice(
      meta.tp2
    )}</b>`,
    `💰 +$24 | 📦 0.03 لات | 🇮🇷 ${formatToman(
      meta.tp2Toman
    )}`,

    "",

    `3️⃣ TP3 → <b>${formatPrice(
      meta.tp3
    )}</b>`,
    `💰 +$36 | 📦 0.03 لات | 🇮🇷 ${formatToman(
      meta.tp3Toman
    )}`,

    "",

    "━━━━━━━━━━━━━━━━━━",

    `📊 <b>حجم کل:</b> ${meta.totalLot.toFixed(
      2
    )} لات`,

    `💵 <b>سود کامل:</b> +$80 | 🇮🇷 ${formatToman(
      meta.totalPotentialToman
    )}`,

    "",

    "🛡️ <b>مدیریت معامله و ریسک‌فری</b>",

    "بعد از رسیدن قیمت به TP1:",

    "✅ 0.04 لات بسته می‌شود",
    "📦 0.06 لات باقی می‌ماند",
    "🔒 حد ضرر باقی‌مانده → نقطه ورود",

    "یعنی سود TP1 حفظ می‌شود و",
    "بخش باقی‌مانده وارد حالت <b>ریسک‌فری</b> می‌شود.",

    "",

    "━━━━━━━━━━━━━━━━━━",

    "🌍 <b>سشن معاملاتی</b>",

    `${meta.sessionFlag} ${meta.sessionFa} | ${meta.sessionCountry}`,

    `🕐 ساعت سشن: <b>${esc(
      meta.sessionLocalTime
    )}</b>`,

    `🇮🇷 ساعت ایران: <b>${esc(
      meta.iranTime
    )}</b>`,

    "",

    "🧠 <b>نتیجه تحلیل</b>",

    `⭐ امتیاز: <b>${meta.score}/100</b>`,
    `✅ تأییدیه‌های واقعی: <b>${meta.confirmations}</b>`,

    "",

    "📈 <b>کارنامه ثبت‌شده قبلی</b>",
    `🎯 درصد معاملات برنده ثبت‌شده: <b>${historicalText}</b>`,
    `📊 معاملات بسته‌شده: <b>${history.closed}</b>`,

    "",

    "💱 <b>نرخ دلار برای محاسبات</b>",
    `💵 $1 = <b>${faNumber(
      meta.usdToToman
    )} تومان</b>`,
    `🕒 زمان نرخ: <b>${esc(
      meta.rateAsOf
    )}</b>`,
    rateStatus,

    "",

    "━━━━━━━━━━━━━━━━━━",

    "⚠️ <b>هشدار</b>",
    "این تحلیل توسط هوش مصنوعی تولید شده است.",
    "هیچ تضمینی برای سود وجود ندارد.",
    "نتیجه واقعی معامله می‌تواند تحت تأثیر اسپرد، کمیسیون و اسلیپیج باشد.",

    "",

    `🆔 شناسه سیگنال: <code>${esc(
      meta.createdAt
    )}</code>`,

    "",

    "🤖 <b>Trading AI Platform</b>",
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| Telegram - Event
|--------------------------------------------------------------------------
*/

function buildEventTelegram(
  meta: RunMeta,
  event: EventRecord
) {
  const titles: Record<
    EventType,
    string
  > = {
    TP1:
      "🟢 ━━━ هدف اول فعال شد ━━━",

    TP2:
      "🟢 ━━━ هدف دوم فعال شد ━━━",

    TP3:
      "🏆 ━━━ معامله تکمیل شد ━━━",

    SL:
      "🔴 ━━━ حد ضرر فعال شد ━━━",

    BREAKEVEN:
      "🛡️ ━━━ ریسک‌فری فعال شد ━━━",
  };

  let explanation =
    "";

  if (
    event.type ===
    "TP1"
  ) {
    explanation = [
      "🎯 TP1 لمس شد.",
      "",
      "✅ 0.04 لات بسته شد.",
      "📦 0.06 لات باقی ماند.",
      "🔒 حد ضرر باقی‌مانده به نقطه ورود منتقل شد.",
      "",
      "💡 سود TP1 محافظت شد و معامله وارد حالت ریسک‌فری شد.",
    ].join("\n");
  }

  if (
    event.type ===
    "TP2"
  ) {
    explanation = [
      "🎯 TP2 لمس شد.",
      "",
      "✅ 0.03 لات بسته شد.",
      "📦 0.03 لات باقی ماند.",
      "🛡️ سود مراحل قبلی همچنان ثبت شده است.",
    ].join("\n");
  }

  if (
    event.type ===
    "TP3"
  ) {
    explanation = [
      "🎯 TP3 لمس شد.",
      "",
      "✅ آخرین 0.03 لات بسته شد.",
      "🏆 تمام اهداف معامله تکمیل شدند.",
      "",
      "💰 سود کامل معامله: +$80",
    ].join("\n");
  }

  if (
    event.type ===
    "BREAKEVEN"
  ) {
    explanation = [
      "📍 قیمت به نقطه ورود برگشت.",
      "",
      "🛡️ حد ضرر ریسک‌فری فعال شد.",
      "📦 حجم باقی‌مانده بسته شد.",
      "",
      "💰 سود TP1 و TP2 که قبلاً ثبت شده بودند حفظ شدند.",
    ].join("\n");
  }

  if (
    event.type ===
    "SL"
  ) {
    explanation = [
      "🛑 حد ضرر اولیه فعال شد.",
      "",
      "❌ معامله قبل از ریسک‌فری بسته شد.",
      "📊 این معامله به‌عنوان باخت در کارنامه ثبت شد.",
    ].join("\n");
  }

  return [
    "🤖 <b>این تحلیل هوش مصنوعی است</b>",
    "",
    `<b>${titles[event.type]}</b>`,
    "",
    `🪙 XAUUSD | ${
      meta.direction ===
      "BUY"
        ? "🟢 خرید"
        : "🔴 فروش"
    }`,

    `${meta.sessionFlag} ${meta.sessionFa}`,

    "",

    `📍 ورود: <b>${formatPrice(
      meta.entry
    )}</b>`,

    `📌 قیمت رویداد: <b>${formatPrice(
      event.price
    )}</b>`,

    "",

    explanation,

    "",

    "━━━━━━━━━━━━━━━━━━",

    `📦 حجم بسته‌شده: <b>${event.lotClosed.toFixed(
      2
    )} لات</b>`,

    `💵 نتیجه این مرحله: <b>${formatUsd(
      event.pnlUsd
    )}</b>`,

    `🇮🇷 نتیجه این مرحله: <b>${formatToman(
      event.pnlToman
    )}</b>`,

    "",

    `💱 نرخ دلار ثبت‌شده: <b>${faNumber(
      event.usdToToman
    )} تومان</b>`,

    `🕒 زمان نرخ: <b>${esc(
      event.rateAsOf
    )}</b>`,

    event.rateDelayed
      ? `⚠️ نرخ ${event.rateDelayedMinutes} دقیقه تأخیر داشته است.`
      : "🟢 نرخ بدون تأخیر بوده است.",

    "",

    `🇮🇷 زمان رویداد: <b>${esc(
      iranDateTime(
        new Date(event.at)
      )
    )}</b>`,

    "",

    "📊 این رویداد در کارنامه ثبت شد.",
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| Create Event
|--------------------------------------------------------------------------
*/

async function createEvent(
  run: any,
  meta: RunMeta,
  type: EventType,
  price: number
) {
  /*
   * جلوگیری از ثبت دوباره
   */
  if (
    meta.events.some(
      (event) =>
        event.type === type
    )
  ) {
    return null;
  }

  const fx =
    await getUsdToTomanRate();

  const pnl =
    eventPnl(type);

  const event: EventRecord = {
    type,

    at:
      new Date().toISOString(),

    price:
      round(price),

    lotClosed:
      pnl.lotClosed,

    pnlUsd:
      pnl.pnlUsd,

    pnlToman:
      toman(
        pnl.pnlUsd *
          fx.rate
      ),

    usdToToman:
      fx.rate,

    rateAsOf:
      fx.asOf,

    rateDelayed:
      fx.delayed,

    rateDelayedMinutes:
      fx.delayedMinutes,
  };

  meta.events.push(
    event
  );

  /*
   * State
   */
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
    type ===
    "BREAKEVEN"
  ) {
    meta.state =
      "AI_BE";
  }

  meta.lastUpdate =
    new Date().toISOString();

  /*
   * وضعیت پایان
   */
  const isClosed =
    type === "SL" ||
    type === "TP3" ||
    type === "BREAKEVEN";

  /*
   * اول دیتابیس را ثبت می‌کنیم.
   * سپس Telegram.
   *
   * بنابراین حتی اگر Telegram قطع باشد،
   * کارنامه از بین نمی‌رود.
   */

  await prisma.analysisRun.update(
    {
      where: {
        id: run.id,
      },

      data: {
        status:
          meta.state,

        signalGenerated:
          true,

        finishedAt:
          isClosed
            ? new Date()
            : undefined,

        metadata:
          meta as any,
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

    meta.analysis = {
      ...meta.analysis,

      lastTelegramMessageId:
        messageId,

      lastTelegramAt:
        new Date().toISOString(),

      telegramError:
        null,
    };

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
    /*
     * رویداد در دیتابیس باقی می‌ماند.
     * بنابراین حتی اگر تلگرام موقتاً قطع باشد،
     * آمار و کارنامه از بین نمی‌رود.
     */

    meta.analysis = {
      ...meta.analysis,

      telegramError:
        error instanceof Error
          ? error.message
          : String(error),

      telegramErrorAt:
        new Date().toISOString(),
    };

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

  return event;
}

/*
|--------------------------------------------------------------------------
| Active Run
|--------------------------------------------------------------------------
*/

async function activeRun() {
  const row =
    await prisma.analysisRun.findFirst(
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

  return row ?? null;
}

/*
|--------------------------------------------------------------------------
| Scan
|--------------------------------------------------------------------------
*/

async function scan(
  userId?: string
) {
  const existing =
    await activeRun();

  if (existing) {
    return {
      created: false,
      reason:
        "active_trade",
      id:
        existing.id,
    };
  }

  /*
   * News
   */
  const news =
    await newsBlock();

  if (news.length) {
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "5min",

          status:
            "AI_NO_TRADE",

          signalGenerated:
            false,

          candlesAnalyzed:
            0,

          confirmationsFound:
            0,

          finishedAt:
            new Date(),

          metadata:
            {
              kind:
                "AI_SCALP",

              reason:
                "high_impact_news",

              news:
                news.map(
                  (item) => ({
                    event:
                      item.event,

                    currency:
                      item.currency,

                    time:
                      item.eventTime,
                  })
                ),
            } as any,
        },
      }
    );

    return {
      created: false,

      reason:
        "high_impact_news",

      news:
        news.map(
          (item) => ({
            event:
              item.event,

            currency:
              item.currency,

            time:
              item.eventTime,
          })
        ),
    };
  }

  /*
   * دریافت بازار
   */
  const [
    m1,
    m5,
    m15,
    h1,
  ] =
    await Promise.all([
      candles(
        "1min",
        150
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

  /*
   * سیگنال فقط وقتی ساخته می‌شود که
   * هم امتیاز و هم تعداد تأییدیه کافی باشد.
   */

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
            "5min",

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
                "score_or_confirmations_low",

              score:
                analysis.score,

              confirmations:
                analysis.confirmations,

              reasons:
                analysis.reasons,
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
   * Entry
   */
  const entry =
    m1.at(-1)?.close ??
    m5.at(-1)?.close ??
    0;

  if (!entry) {
    return {
      created: false,
      reason:
        "no_entry_price",
    };
  }

  const priceLevels =
    levels(
      entry,
      analysis.direction
    );

  /*
   * جلوگیری از سیگنال‌هایی که
   * SL از نظر ساختاری خیلی دور است.
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
    STOP_DISTANCE +
      0.15
  ) {
    return {
      created: false,

      reason:
        "structure_not_safe",

      score:
        analysis.score,
    };
  }

  /*
   * FX
   */
  const fx =
    await getUsdToTomanRate();

  const now =
    new Date();

  const session =
    sessionSnapshot(now);

  const strength =
    strengthFromScore(
      analysis.score,
      analysis.confirmations
    );

  const meta: RunMeta = {
    kind:
      "AI_SCALP",

    userId,

    symbol:
      DISPLAY_SYMBOL,

    direction:
      analysis.direction,

    strength,

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

    remainingAfterTp1:
      0.06,

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

    rateAsOf:
      fx.asOf,

    rateDelayed:
      fx.delayed,

    rateDelayedMinutes:
      fx.delayedMinutes,

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
      session.active,

    sessionFa:
      session.activeFa,

    sessionFlag:
      session.flag,

    sessionCountry:
      session.country,

    sessionLocalTime:
      session.localTime,

    iranTime:
      session.iranTime,

    score:
      analysis.score,

    confirmations:
      analysis.confirmations,

    timeframe:
      "1m + 5m + 15m + 1h",

    state:
      "AI_PENDING",

    breakeven:
      false,

    currentPrice:
      round(entry),

    events: [],

    analysis:
      {
        reasons:
          analysis.reasons,

        support:
          analysis.support,

        resistance:
          analysis.resistance,

        atr:
          analysis.atr,

        candle:
          analysis.candle,

        t5:
          analysis.t5,

        t15:
          analysis.t15,

        t60:
          analysis.t60,

        contractSize:
          CONTRACT_SIZE,

        stopDistance:
          STOP_DISTANCE,

        tp1Distance:
          TP1_DISTANCE,

        tp2Distance:
          TP2_DISTANCE,

        tp3Distance:
          TP3_DISTANCE,

        fxSource:
          fx.source,

        fxPlan:
          fx.plan,

        allSessions:
          session.sessions,
      },

    createdAt:
      now.toISOString(),

    lastUpdate:
      now.toISOString(),
  };

  /*
   * کارنامه قبلی
   */
  const history =
    await historicalPerformance();

  /*
   * ثبت Run
   */
  const created =
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            "5min",

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
            analysis.confirmations,

          finishedAt:
            now,

          metadata:
            meta as any,
        },
      }
    );

  /*
   * ارسال تلگرام
   */
  try {
    const messageId =
      await sendTelegram(
        buildSignalTelegram(
          meta,
          history
        )
      );

    meta.analysis = {
      ...meta.analysis,

      telegramMessageId:
        messageId,

      telegramSentAt:
        new Date().toISOString(),

      telegramError:
        null,
    };

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
  } catch (error) {
    meta.analysis = {
      ...meta.analysis,

      telegramError:
        error instanceof Error
          ? error.message
          : String(error),

      telegramErrorAt:
        new Date().toISOString(),
    };

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
  }

  return {
    created: true,

    id:
      created.id,

    meta,
  };
}

/*
|--------------------------------------------------------------------------
| Monitor
|--------------------------------------------------------------------------
|
| مهم:
| فقط قیمت لحظه‌ای بررسی نمی‌شود.
| چند کندل 1 دقیقه اخیر نیز بررسی می‌شود.
|
| این کار کمک می‌کند اگر بین دو اجرای Cron
| TP یا SL لمس شده باشد، رویداد ثبت شود.
|--------------------------------------------------------------------------
*/

async function monitorOne(
  run: any
) {
  const meta =
    run.metadata as
      | RunMeta
      | null;

  if (
    !meta ||
    meta.kind !==
      "AI_SCALP"
  ) {
    return null;
  }

  const currentPrice =
    await latestPrice();

  meta.currentPrice =
    round(currentPrice);

  meta.lastUpdate =
    new Date().toISOString();

  /*
   * کندل‌های اخیر
   */
  const recent =
    await candles(
      "1min",
      30
    );

  /*
   * فقط کندل‌های بعد از ایجاد سیگنال
   */
  const createdAt =
    new Date(
      meta.createdAt
    ).getTime();

  const usable =
    recent.filter(
      (candle) => {
        const t =
          new Date(
            candle.datetime
          ).getTime();

        return (
          Number.isFinite(t) &&
          t >=
            createdAt -
              60_000
        );
      }
    );

  /*
   * اگر هیچ کندل مناسبی نداریم،
   * قیمت لحظه‌ای را بررسی می‌کنیم.
   */
  const candlesToCheck =
    usable.length
      ? usable
      : [];

  /*
   * رویدادها را به ترتیب بررسی می‌کنیم.
   */
  for (
    const candle of
      candlesToCheck
  ) {
    /*
     * اگر معامله هنوز pending است:
     *
     * اول SL بررسی می‌شود.
     *
     * چون در یک کندل 1 دقیقه‌ای
     * ترتیب High/Low را نمی‌دانیم،
     * این حالت محافظه‌کارانه است.
     */

    if (
      meta.state ===
      "AI_PENDING"
    ) {
      const slHit =
        hitStop(
          meta.direction,
          candle.close,
          meta.stopLoss
        ) ||
        hitStop(
          meta.direction,
          candle.high,
          meta.stopLoss
        ) ||
        hitStop(
          meta.direction,
          candle.low,
          meta.stopLoss
        );

      if (slHit) {
        return createEvent(
          run,
          meta,
          "SL",
          meta.stopLoss
        );
      }

      const tp1Hit =
        hitTarget(
          meta.direction,
          candle.high,
          meta.tp1
        ) ||
        hitTarget(
          meta.direction,
          candle.low,
          meta.tp1
        ) ||
        hitTarget(
          meta.direction,
          candle.close,
          meta.tp1
        );

      if (tp1Hit) {
        await createEvent(
          run,
          meta,
          "TP1",
          meta.tp1
        );

        /*
         * بعد از TP1، همان معامله ادامه دارد.
         * حلقه ادامه پیدا می‌کند.
         */
        continue;
      }
    }

    /*
     * TP1 -> Break-even
     */
    if (
      meta.state ===
      "AI_TP1"
    ) {
      const breakEvenHit =
        hitStop(
          meta.direction,
          candle.close,
          meta.entry
        ) ||
        hitStop(
          meta.direction,
          candle.high,
          meta.entry
        ) ||
        hitStop(
          meta.direction,
          candle.low,
          meta.entry
        );

      if (breakEvenHit) {
        return createEvent(
          run,
          meta,
          "BREAKEVEN",
          meta.entry
        );
      }

      const tp2Hit =
        hitTarget(
          meta.direction,
          candle.high,
          meta.tp2
        ) ||
        hitTarget(
          meta.direction,
          candle.low,
          meta.tp2
        ) ||
        hitTarget(
          meta.direction,
          candle.close,
          meta.tp2
        );

      if (tp2Hit) {
        await createEvent(
          run,
          meta,
          "TP2",
          meta.tp2
        );

        continue;
      }
    }

    /*
     * TP2 -> Break-even
     */
    if (
      meta.state ===
      "AI_TP2"
    ) {
      const breakEvenHit =
        hitStop(
          meta.direction,
          candle.close,
          meta.entry
        ) ||
        hitStop(
          meta.direction,
          candle.high,
          meta.entry
        ) ||
        hitStop(
          meta.direction,
          candle.low,
          meta.entry
        );

      if (breakEvenHit) {
        return createEvent(
          run,
          meta,
          "BREAKEVEN",
          meta.entry
        );
      }

      const tp3Hit =
        hitTarget(
          meta.direction,
          candle.high,
          meta.tp3
        ) ||
        hitTarget(
          meta.direction,
          candle.low,
          meta.tp3
        ) ||
        hitTarget(
          meta.direction,
          candle.close,
          meta.tp3
        );

      if (tp3Hit) {
        return createEvent(
          run,
          meta,
          "TP3",
          meta.tp3
        );
      }
    }
  }

  /*
   * آخرین قیمت نیز بررسی شود.
   */
  if (
    meta.state ===
    "AI_PENDING"
  ) {
    if (
      hitStop(
        meta.direction,
        currentPrice,
        meta.stopLoss
      )
    ) {
      return createEvent(
        run,
        meta,
        "SL",
        currentPrice
      );
    }

    if (
      hitTarget(
        meta.direction,
        currentPrice,
        meta.tp1
      )
    ) {
      return createEvent(
        run,
        meta,
        "TP1",
        currentPrice
      );
    }
  }

  if (
    meta.state ===
    "AI_TP1"
  ) {
    if (
      hitStop(
        meta.direction,
        currentPrice,
        meta.entry
      )
    ) {
      return createEvent(
        run,
        meta,
        "BREAKEVEN",
        currentPrice
      );
    }

    if (
      hitTarget(
        meta.direction,
        currentPrice,
        meta.tp2
      )
    ) {
      return createEvent(
        run,
        meta,
        "TP2",
        currentPrice
      );
    }
  }

  if (
    meta.state ===
    "AI_TP2"
  ) {
    if (
      hitStop(
        meta.direction,
        currentPrice,
        meta.entry
      )
    ) {
      return createEvent(
        run,
        meta,
        "BREAKEVEN",
        currentPrice
      );
    }

    if (
      hitTarget(
        meta.direction,
        currentPrice,
        meta.tp3
      )
    ) {
      return createEvent(
        run,
        meta,
        "TP3",
        currentPrice
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
    id:
      run.id,

    state:
      meta.state,

    price:
      currentPrice,
  };
}

/*
|--------------------------------------------------------------------------
| Event Totals
|--------------------------------------------------------------------------
*/

function eventTotals(
  rows: any[]
) {
  const result = {
    trades: 0,

    closedTrades: 0,

    openTrades: 0,

    wins: 0,

    losses: 0,

    breakeven: 0,

    tp1: 0,

    tp2: 0,

    tp3: 0,

    sl: 0,

    tp1Usd: 0,

    tp2Usd: 0,

    tp3Usd: 0,

    slUsd: 0,

    pnlUsd: 0,

    pnlToman: 0,

    tp1Toman: 0,

    tp2Toman: 0,

    tp3Toman: 0,

    slToman: 0,
  };

  for (
    const row of rows
  ) {
    const meta =
      row.metadata as
        | RunMeta
        | null;

    if (
      !meta ||
      meta.kind !==
        "AI_SCALP"
    ) {
      continue;
    }

    result.trades++;

    const events =
      Array.isArray(
        meta.events
      )
        ? meta.events
        : [];

    let final:
      | EventType
      | null = null;

    for (
      const event of
        events
    ) {
      if (
        event.type ===
        "TP1"
      ) {
        result.tp1++;

        result.tp1Usd +=
          event.pnlUsd;

        result.tp1Toman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "TP2"
      ) {
        result.tp2++;

        result.tp2Usd +=
          event.pnlUsd;

        result.tp2Toman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "TP3"
      ) {
        result.tp3++;

        result.tp3Usd +=
          event.pnlUsd;

        result.tp3Toman +=
          event.pnlToman;
      }

      if (
        event.type ===
        "SL"
      ) {
        result.sl++;

        result.slUsd +=
          event.pnlUsd;

        result.slToman +=
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

      if (
        event.type !==
        "BREAKEVEN"
      ) {
        result.pnlUsd +=
          event.pnlUsd;

        result.pnlToman +=
          event.pnlToman;
      }
    }

    if (
      final === "SL"
    ) {
      result.losses++;
      result.closedTrades++;
    } else if (
      final ===
      "BREAKEVEN"
    ) {
      result.breakeven++;
      result.closedTrades++;
    } else if (
      final === "TP3"
    ) {
      result.wins++;
      result.closedTrades++;
    } else {
      result.openTrades++;
    }
  }

  return {
    ...result,

    tp1Usd:
      money(result.tp1Usd),

    tp2Usd:
      money(result.tp2Usd),

    tp3Usd:
      money(result.tp3Usd),

    slUsd:
      money(result.slUsd),

    pnlUsd:
      money(result.pnlUsd),

    pnlToman:
      Math.round(
        result.pnlToman
      ),

    tp1Toman:
      Math.round(
        result.tp1Toman
      ),

    tp2Toman:
      Math.round(
        result.tp2Toman
      ),

    tp3Toman:
      Math.round(
        result.tp3Toman
      ),

    slToman:
      Math.round(
        result.slToman
      ),
  };
}

/*
|--------------------------------------------------------------------------
| Period
|--------------------------------------------------------------------------
*/

function startOfPeriod(
  type:
    | "day"
    | "week"
    | "month"
) {
  const date =
    new Date();

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  if (
    type === "week"
  ) {
    const day =
      date.getUTCDay() ||
      7;

    date.setUTCDate(
      date.getUTCDate() -
        day +
        1
    );
  }

  if (
    type === "month"
  ) {
    date.setUTCDate(1);
  }

  return date;
}

/*
|--------------------------------------------------------------------------
| Performance
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Session Report
|--------------------------------------------------------------------------
*/

function sessionKey(
  name: SessionName,
  date = new Date()
) {
  const config =
    SESSIONS[name];

  const localDate =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          config.timezone,

        year: "numeric",

        month: "2-digit",

        day: "2-digit",
      }
    ).format(date);

  return `${name}-${localDate}`;
}

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

  const existing =
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
    existing &&
    (
      existing.metadata as any
    )?.key === key
  ) {
    return {
      sent: false,

      reason:
        "already_sent",
    };
  }

  const rows =
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

  const sessionRows =
    rows.filter(
      (row) => {
        const meta =
          row.metadata as
            | RunMeta
            | null;

        if (
          !meta ||
          meta.kind !==
            "AI_SCALP"
        ) {
          return false;
        }

        return (
          meta.session ===
            name &&
          sessionKey(
            name,
            new Date(
              meta.createdAt
            )
          ) === key
        );
      }
    );

  const totals =
    eventTotals(
      sessionRows
    );

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

  const config =
    SESSIONS[name];

  const msg = [
    "🤖 <b>━━━ کارنامه پایان سشن ━━━</b>",
    "",

    `🪙 XAUUSD | ${config.flag} <b>${config.fa}</b>`,

    `🌍 کشور: ${config.country}`,

    "",

    `📊 معاملات: <b>${totals.trades}</b>`,

    `🟢 برد کامل: <b>${totals.wins}</b>`,

    `🔴 باخت: <b>${totals.losses}</b>`,

    `🛡️ ریسک‌فری: <b>${totals.breakeven}</b>`,

    "",

    `🎯 TP1: <b>${totals.tp1}</b> | ${formatUsd(
      totals.tp1Usd
    )} | ${formatToman(
      totals.tp1Toman
    )}`,

    `🎯 TP2: <b>${totals.tp2}</b> | ${formatUsd(
      totals.tp2Usd
    )} | ${formatToman(
      totals.tp2Toman
    )}`,

    `🏆 TP3: <b>${totals.tp3}</b> | ${formatUsd(
      totals.tp3Usd
    )} | ${formatToman(
      totals.tp3Toman
    )}`,

    `🛑 SL: <b>${totals.sl}</b> | ${formatUsd(
      totals.slUsd
    )} | ${formatToman(
      totals.slToman
    )}`,

    "",

    `💰 <b>خالص سشن:</b> ${formatUsd(
      totals.pnlUsd
    )}`,

    `🇮🇷 <b>خالص تومان:</b> ${formatToman(
      totals.pnlToman
    )}`,

    "",

    `💱 نرخ دلار گزارش: <b>${faNumber(
      fx.rate
    )} تومان</b>`,

    `🕒 زمان نرخ: ${esc(
      fx.asOf
    )}`,

    fx.delayed
      ? `⚠️ نرخ ${fx.delayedMinutes} دقیقه تأخیر داشته است.`
      : "🟢 نرخ بدون تأخیر.",

    "",

    "⚠️ کارنامه بر اساس رویدادهای ثبت‌شده سیستم است.",
    "نتیجه واقعی بروکر می‌تواند به دلیل اسپرد، کمیسیون و اسلیپیج متفاوت باشد.",
  ].join("\n");

  let telegramMessageId =
    "";

  try {
    telegramMessageId =
      await sendTelegram(
        msg
      );
  } catch {
    /*
     * گزارش دیتابیس ثبت می‌شود
     * حتی اگر تلگرام خطا دهد.
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

            rateAsOf:
              fx.asOf,

            rateDelayed:
              fx.delayed,

            rateDelayedMinutes:
              fx.delayedMinutes,

            telegramMessageId,
          } as any,
      },
    }
  );

  return {
    sent: true,

    totals,
  };
}

/*
|--------------------------------------------------------------------------
| Cron Cycle
|--------------------------------------------------------------------------
*/

async function cronCycle() {
  const results: unknown[] =
    [];

  const active =
    await activeRun();

  if (active) {
    results.push(
      await monitorOne(
        active
      )
    );
  } else {
    results.push(
      await scan()
    );
  }

  const reports: Record<
    string,
    unknown
  > = {};

  /*
   * گزارش پایان سشن
   */
  for (
    const name of Object.keys(
      SESSIONS
    ) as SessionName[]
  ) {
    const config =
      SESSIONS[name];

    const date =
      new Date();

    const localHour =
      hourInZone(
        date,
        config.timezone
      );

    /*
     * در شروع ساعت 17 محلی،
     * گزارش پایان سشن ارسال می‌شود.
     */
    if (
      localHour ===
        config.endHour &&
      date.getUTCMinutes() <
        3
    ) {
      reports[name] =
        await sessionReport(
          name
        );
    }
  }

  return {
    monitored:
      results,

    reports,

    at:
      new Date().toISOString(),
  };
}

/*
|--------------------------------------------------------------------------
| Dashboard Data
|--------------------------------------------------------------------------
*/

async function dashboard(
  userId?: string
) {
  const [
    active,
    perf,
    fx,
    latest,
    livePrice,
  ] =
    await Promise.all([
      activeRun(),

      performance(),

      getUsdToTomanRate().catch(
        () => null
      ),

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

      latestPrice().catch(
        () => null
      ),
    ]);

  const meta =
    latest?.metadata as
      | RunMeta
      | undefined;

  const session =
    sessionSnapshot();

  return {
    symbol:
      DISPLAY_SYMBOL,

    livePrice,

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

      remainingAfterTp1:
        0.06,

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

      stopDistance:
        STOP_DISTANCE,

      tp1Distance:
        TP1_DISTANCE,

      tp2Distance:
        TP2_DISTANCE,

      tp3Distance:
        TP3_DISTANCE,
    },

    active: active
      ? {
          id:
            active.id,

          status:
            active.status,

          metadata:
            active.metadata,
        }
      : null,

    latest: meta
      ? {
          id:
            latest?.id,

          status:
            latest?.status,

          metadata:
            meta,
        }
      : null,

    performance:
      perf,

    usdToToman:
      fx,

    currentSession:
      session,

    sessions:
      Object.fromEntries(
        Object.entries(
          SESSIONS
        ).map(
          ([
            name,
            config,
          ]) => [
            name,
            {
              fa:
                config.fa,

              flag:
                config.flag,

              country:
                config.country,

              timezone:
                config.timezone,

              startHour:
                config.startHour,

              endHour:
                config.endHour,

              localTime:
                timeInZone(
                  new Date(),
                  config.timezone
                ),

              active:
                isSessionActive(
                  config
                ),
            },
          ]
        )
      ),

    userId,
  };
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      new URL(
        request.url
      );

    const isCron =
      url.searchParams.get(
        "cron"
      ) === "1";

    /*
     * Server Cron
     */
    if (isCron) {
      const provided =
        request.headers.get(
          "x-ai-cron-secret"
        ) ||
        request.headers.get(
          "x-cron-secret"
        ) ||
        url.searchParams.get(
          "secret"
        );

      if (
        !CRON_SECRET ||
        provided !==
          CRON_SECRET
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
     * درخواست عادی سایت
     */
    const session =
      await getSession();

    /*
     * مهم:
     * getSession در پروژه شما
     * userId برمی‌گرداند، نه session.user.
     *
     * بنابراین اینجا از session?.userId استفاده می‌کنیم.
     */
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

    const data =
      await dashboard(
        session.userId
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
            : "خطای داخلی موتور تحلیل AI",
      },

      {
        status: 500,
      }
    );
  }
}
