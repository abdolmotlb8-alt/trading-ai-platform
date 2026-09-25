import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TRADING AI — XAUUSD ADVANCED ANALYSIS ENGINE
   ---------------------------------------------------------
   REAL MARKET DATA
   MULTI TIMEFRAME
   MARKET STRUCTURE
   ATR / RSI / MACD / EMA
   SUPPORT / RESISTANCE
   MOMENTUM
   VOLUME
   NEWS FILTER
   ANTI WHIPSAW
   COOLDOWN
   DUPLICATE SIGNAL PROTECTION
   DYNAMIC SL / TP
   TELEGRAM EVENT MANAGEMENT
   TP1 → TP2 → TP3 → BE / SL
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

/* ---------------- POSITION ---------------- */

const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

/* ---------------- ENGINE ---------------- */

const SCORE_TO_SIGNAL = 84;
const MIN_CONFIRMATIONS = 6;

/*
  بعد از Stop Loss:
  سیستم بلافاصله معامله جدید باز نمی‌کند.
*/
const SL_COOLDOWN_MINUTES = 30;

/*
  بعد از TP3 یا BE:
  کمی فاصله برای جلوگیری از ورود پشت سر هم.
*/
const PROFIT_COOLDOWN_MINUTES = 8;

/*
  حداقل فاصله قیمت از معامله قبلی
  برای جلوگیری از ورود روی همان ناحیه.
*/
const DUPLICATE_DISTANCE_ATR = 0.75;

/*
  اگر قیمت بیش از این مقدار از EMA20
  دور شده باشد، احتمالاً در انتهای حرکت هستیم.
*/
const MAX_EXTENSION_ATR = 1.80;

/*
  حداقل فضای لازم تا مقاومت/حمایت.
*/
const MIN_ROOM_ATR = 0.90;

/*
  حداکثر فاصله Stop
  تا ریسک معامله بیش از حد نشود.
*/
const MAX_STOP_DISTANCE = 5.50;

/*
  حداقل فاصله Stop
*/
const MIN_STOP_DISTANCE = 2.40;

/*
  News block
*/
const DEFAULT_NEWS_MINUTES = 30;

/* ---------------- API KEYS ---------------- */

const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

const NETARZ_KEY = process.env.NETARZ_API_KEY;

/* =========================================================
   SESSIONS
   ========================================================= */

const SESSIONS = {
  Sydney: { start: 21, end: 6 },
  Tokyo: { start: 0, end: 9 },
  London: { start: 7, end: 16 },
  "New York": { start: 13, end: 22 },
} as const;

type SessionName = keyof typeof SESSIONS;

type Direction = "BUY" | "SELL";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type FrameAnalysis = {
  direction: Direction | null;
  strength: number;
  ema20: number;
  ema50: number;
  ema20Slope: number;
  rsi: number;
  macd: number;
  macdPrevious: number;
};

type MarketAnalysis = {
  direction: Direction | null;
  score: number;
  confirmations: number;
  reasons: string[];

  support: number;
  resistance: number;
  atr: number;

  t1: FrameAnalysis;
  t5: FrameAnalysis;
  t15: FrameAnalysis;
  t60: FrameAnalysis;

  candleBias: number;

  volumeRatio: number;

  structureQuality: number;

  roomToTarget: number;

  extension: number;

  regime: "TRENDING" | "RANGING" | "UNCERTAIN";
};

type EventRecord = {
  type: "TP1" | "TP2" | "TP3" | "SL" | "BREAKEVEN";

  at: string;

  price: number;

  lotClosed: number;

  pnlUsd: number;

  pnlToman: number;

  usdToToman: number;
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

/* =========================================================
   HELPERS
   ========================================================= */

function num(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : Number(v);

  return Number.isFinite(n) ? n : 0;
}

function round(
  value: number,
  digits = 2
) {
  const p = 10 ** digits;

  return Math.round(value * p) / p;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function toman(value: number) {
  return Math.round(value);
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(value)
  )} تومان`;
}

function formatUsd(value: number) {
  const sign = value >= 0 ? "" : "-";

  return `${sign}$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))}`;
}

function fmtPrice(value: number) {
  return Number(value).toFixed(2);
}

function faNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

/* =========================================================
   SESSION
   ========================================================= */

function currentSession(
  date = new Date()
): SessionName {
  const h = date.getUTCHours();

  if (h >= 13 && h < 22) {
    return "New York";
  }

  if (h >= 7 && h < 16) {
    return "London";
  }

  if (h >= 0 && h < 9) {
    return "Tokyo";
  }

  return "Sydney";
}

function sessionKey(
  name: SessionName,
  date = new Date()
) {
  const h = date.getUTCHours();

  const d = new Date(date);

  if (name === "Sydney" && h < 6) {
    d.setUTCDate(
      d.getUTCDate() - 1
    );
  }

  return `${name}-${d
    .toISOString()
    .slice(0, 10)}`;
}

function sessionEndReached(
  name: SessionName,
  date = new Date()
) {
  const end = SESSIONS[name].end;

  return (
    date.getUTCHours() === end &&
    date.getUTCMinutes() < 2
  );
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function td(url: string) {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است."
    );
  }

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(TD_KEY)}`;

  const response = await fetch(
    full,
    {
      cache: "no-store",
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

/* =========================================================
   MARKET DATA
   ========================================================= */

async function candles(
  interval: string,
  outputsize: number
): Promise<Candle[]> {
  const data = await td(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      SYMBOL
    )}&interval=${interval}&outputsize=${outputsize}&order=ASC&timezone=UTC`
  );

  if (!Array.isArray(data?.values)) {
    throw new Error(
      `داده کندل ${interval} دریافت نشد.`
    );
  }

  return data.values
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
      (
        a: Candle,
        b: Candle
      ) =>
        a.datetime.localeCompare(
          b.datetime
        )
    );
}

async function latestPrice() {
  const data = await td(
    `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
      SYMBOL
    )}`
  );

  const price = num(
    data?.price
  );

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
) {
  if (!values.length) {
    return 0;
  }

  if (values.length < period) {
    return (
      values.at(-1) ?? 0
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
) {
  if (!values.length) {
    return 0;
  }

  const k =
    2 / (period + 1);

  let result =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result =
      values[i] * k +
      result * (1 - k);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14
) {
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

  gain /= period;

  loss /= period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const difference =
      values[i] -
      values[i - 1];

    const currentGain =
      Math.max(
        difference,
        0
      );

    const currentLoss =
      Math.max(
        -difference,
        0
      );

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
) {
  if (
    candlesData.length <
    period + 1
  ) {
    return 0;
  }

  const ranges: number[] =
    [];

  for (
    let i = 1;
    i < candlesData.length;
    i++
  ) {
    const current =
      candlesData[i];

    const previous =
      candlesData[i - 1];

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

  return sma(
    ranges,
    period
  );
}

function macdSeries(
  values: number[]
) {
  const output: number[] =
    [];

  for (
    let i = 0;
    i < values.length;
    i++
  ) {
    const subset =
      values.slice(
        0,
        i + 1
      );

    const fast =
      ema(subset, 12);

    const slow =
      ema(subset, 26);

    output.push(
      fast - slow
    );
  }

  return output;
}

/* =========================================================
   CANDLE ANALYSIS
   ========================================================= */

function candleBias(
  data: Candle[]
) {
  const current =
    data.at(-1);

  const previous =
    data.at(-2);

  if (!current || !previous) {
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

  const bodyRatio =
    body / range;

  const bullish =
    current.close >
      current.open &&
    bodyRatio >= 0.55 &&
    current.close >=
      previous.close;

  const bearish =
    current.close <
      current.open &&
    bodyRatio >= 0.55 &&
    current.close <=
      previous.close;

  if (bullish) {
    return 1;
  }

  if (bearish) {
    return -1;
  }

  return 0;
}

/* =========================================================
   TREND ENGINE
   ========================================================= */

function frameTrend(
  data: Candle[]
): FrameAnalysis {
  const closes =
    data.map(
      x => x.close
    );

  if (closes.length < 30) {
    return {
      direction: null,
      strength: 0,
      ema20: 0,
      ema50: 0,
      ema20Slope: 0,
      rsi: 50,
      macd: 0,
      macdPrevious: 0,
    };
  }

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const previousCloses =
    closes.slice(
      0,
      -5
    );

  const previousEma20 =
    ema(
      previousCloses,
      20
    );

  const ema20Slope =
    ema20 -
    previousEma20;

  const r =
    rsi(closes, 14);

  const macdValues =
    macdSeries(closes);

  const currentMacd =
    macdValues.at(-1) ??
    0;

  const previousMacd =
    macdValues.at(-2) ??
    0;

  let buyScore = 0;

  let sellScore = 0;

  if (ema20 > ema50) {
    buyScore += 30;
  }

  if (ema20 < ema50) {
    sellScore += 30;
  }

  if (ema20Slope > 0) {
    buyScore += 20;
  }

  if (ema20Slope < 0) {
    sellScore += 20;
  }

  if (r >= 52 && r <= 72) {
    buyScore += 20;
  }

  if (r <= 48 && r >= 28) {
    sellScore += 20;
  }

  if (currentMacd > 0) {
    buyScore += 15;
  }

  if (currentMacd < 0) {
    sellScore += 15;
  }

  if (
    currentMacd >
    previousMacd
  ) {
    buyScore += 15;
  }

  if (
    currentMacd <
    previousMacd
  ) {
    sellScore += 15;
  }

  const difference =
    Math.abs(
      ema20 - ema50
    );

  const averagePrice =
    closes.at(-1) || 1;

  const trendStrength =
    Math.min(
      100,
      Math.round(
        (difference /
          averagePrice) *
          10000
      )
    );

  if (
    buyScore >= 65 &&
    buyScore > sellScore
  ) {
    return {
      direction: "BUY",
      strength: Math.min(
        100,
        buyScore +
          Math.min(
            trendStrength,
            20
          )
      ),
      ema20,
      ema50,
      ema20Slope,
      rsi: r,
      macd: currentMacd,
      macdPrevious:
        previousMacd,
    };
  }

  if (
    sellScore >= 65 &&
    sellScore > buyScore
  ) {
    return {
      direction: "SELL",
      strength: Math.min(
        100,
        sellScore +
          Math.min(
            trendStrength,
            20
          )
      ),
      ema20,
      ema50,
      ema20Slope,
      rsi: r,
      macd: currentMacd,
      macdPrevious:
        previousMacd,
    };
  }

  return {
    direction: null,
    strength: 0,
    ema20,
    ema50,
    ema20Slope,
    rsi: r,
    macd: currentMacd,
    macdPrevious:
      previousMacd,
  };
}

/* =========================================================
   MARKET STRUCTURE
   ========================================================= */

function swings(
  data: Candle[],
  lookback = 40
) {
  const slice =
    data.slice(
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
        x => x.low
      )
    ),

    resistance:
      Math.max(
        ...slice.map(
          x => x.high
        )
      ),
  };
}

function structureQuality(
  data: Candle[],
  support: number,
  resistance: number,
  current: number,
  atrValue: number
) {
  if (
    !support ||
    !resistance ||
    !atrValue
  ) {
    return 0;
  }

  const range =
    resistance -
    support;

  if (
    range <
    atrValue * 2
  ) {
    return 0;
  }

  const position =
    (current -
      support) /
    range;

  /*
    وسط رنج = کیفیت کم
    نزدیک لبه‌ها = کیفیت بیشتر
  */

  if (
    position >= 0.25 &&
    position <= 0.75
  ) {
    return 35;
  }

  return 70;
}

/* =========================================================
   VOLUME
   ========================================================= */

function volumeRatio(
  data: Candle[]
) {
  const current =
    data.at(-1)?.volume ??
    0;

  const previous =
    data
      .slice(
        -21,
        -1
      )
      .map(
        x => x.volume
      )
      .filter(
        x => x > 0
      );

  if (
    current <= 0 ||
    !previous.length
  ) {
    return 1;
  }

  const average =
    sma(
      previous,
      Math.min(
        20,
        previous.length
      )
    );

  if (!average) {
    return 1;
  }

  return current /
    average;
}

/* =========================================================
   ADVANCED MARKET ANALYSIS
   ========================================================= */

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[]
): MarketAnalysis {
  const t1 =
    frameTrend(m1);

  const t5 =
    frameTrend(m5);

  const t15 =
    frameTrend(m15);

  const t60 =
    frameTrend(h1);

  const current =
    m5.at(-1)?.close ??
    0;

  const atrValue =
    atr(m5, 14);

  const levels =
    swings(m5, 40);

  const candle =
    candleBias(m5);

  const volume =
    volumeRatio(m5);

  const support =
    levels.support;

  const resistance =
    levels.resistance;

  const range =
    resistance -
    support;

  let regime:
    | "TRENDING"
    | "RANGING"
    | "UNCERTAIN" =
    "UNCERTAIN";

  if (
    atrValue > 0 &&
    range >=
      atrValue * 4
  ) {
    regime =
      "TRENDING";
  }

  if (
    atrValue > 0 &&
    range <
      atrValue * 2.5
  ) {
    regime =
      "RANGING";
  }

  /*
    جهت اصلی فقط وقتی معتبر است
    که 15M و 1H هم‌جهت باشند.
  */

  let direction:
    Direction | null =
    null;

  if (
    t15.direction ===
      "BUY" &&
    t60.direction ===
      "BUY"
  ) {
    direction = "BUY";
  }

  if (
    t15.direction ===
      "SELL" &&
    t60.direction ===
      "SELL"
  ) {
    direction = "SELL";
  }

  let score = 0;

  let confirmations = 0;

  const reasons: string[] =
    [];

  /* ---------- HTF ---------- */

  if (direction) {
    score += 25;
    confirmations++;

    reasons.push(
      `جهت اصلی بازار در 15M و 1H: ${direction}`
    );
  }

  /* ---------- 5M ---------- */

  if (
    direction &&
    t5.direction ===
      direction
  ) {
    score += 15;
    confirmations++;

    reasons.push(
      "تایم‌فریم 5M جهت معامله را تأیید می‌کند"
    );
  } else if (
    direction &&
    t5.direction &&
    t5.direction !==
      direction
  ) {
    score -= 20;

    reasons.push(
      "5M خلاف روند اصلی است"
    );
  }

  /* ---------- 1M ---------- */

  if (
    direction &&
    t1.direction ===
      direction
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "1M نیز با جهت اصلی همسو است"
    );
  }

  /* ---------- EMA ---------- */

  if (
    direction &&
    (
      direction ===
        "BUY"
        ? current >
            t5.ema20 &&
          t5.ema20 >
            t5.ema50
        : current <
            t5.ema20 &&
          t5.ema20 <
            t5.ema50
    )
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "ساختار EMA20/EMA50 تأیید شد"
    );
  }

  /* ---------- RSI ---------- */

  if (
    direction ===
      "BUY" &&
    t5.rsi >= 52 &&
    t5.rsi <= 68
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "RSI در محدوده مناسب خرید است"
    );
  }

  if (
    direction ===
      "SELL" &&
    t5.rsi <= 48 &&
    t5.rsi >= 32
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "RSI در محدوده مناسب فروش است"
    );
  }

  /*
    RSI بیش از حد اشباع شده
    برای جلوگیری از ورود دیرهنگام.
  */

  if (
    direction ===
      "BUY" &&
    t5.rsi > 74
  ) {
    score -= 20;

    reasons.push(
      "BUY رد شد: RSI بیش از حد اشباع است"
    );
  }

  if (
    direction ===
      "SELL" &&
    t5.rsi < 26
  ) {
    score -= 20;

    reasons.push(
      "SELL رد شد: RSI بیش از حد اشباع است"
    );
  }

  /* ---------- MACD ---------- */

  if (
    direction ===
      "BUY" &&
    t5.macd > 0 &&
    t5.macd >=
      t5.macdPrevious
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "MACD مومنتوم خرید را تأیید می‌کند"
    );
  }

  if (
    direction ===
      "SELL" &&
    t5.macd < 0 &&
    t5.macd <=
      t5.macdPrevious
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "MACD مومنتوم فروش را تأیید می‌کند"
    );
  }

  /* ---------- CANDLE ---------- */

  if (
    direction ===
      "BUY" &&
    candle > 0
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "کندل تأیید خرید دارد"
    );
  }

  if (
    direction ===
      "SELL" &&
    candle < 0
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "کندل تأیید فروش دارد"
    );
  }

  /* ---------- STRUCTURE ---------- */

  const quality =
    structureQuality(
      m5,
      support,
      resistance,
      current,
      atrValue
    );

  if (quality >= 60) {
    score += 5;
    confirmations++;

    reasons.push(
      "ساختار بازار کیفیت کافی دارد"
    );
  }

  /* ---------- SUPPORT / RESISTANCE ---------- */

  const distanceFromSupport =
    current -
    support;

  const distanceFromResistance =
    resistance -
    current;

  const roomToTarget =
    direction ===
      "BUY"
      ? distanceFromResistance
      : distanceFromSupport;

  /*
    BUY نزدیک مقاومت ممنوع
  */

  if (
    direction ===
      "BUY" &&
    roomToTarget <
      atrValue *
        MIN_ROOM_ATR
  ) {
    score -= 35;

    reasons.push(
      "BUY رد شد: قیمت بیش از حد به مقاومت نزدیک است"
    );
  } else if (
    direction ===
    "BUY"
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "فضای کافی تا مقاومت وجود دارد"
    );
  }

  /*
    SELL نزدیک حمایت ممنوع
  */

  if (
    direction ===
      "SELL" &&
    roomToTarget <
      atrValue *
        MIN_ROOM_ATR
  ) {
    score -= 35;

    reasons.push(
      "SELL رد شد: قیمت بیش از حد به حمایت نزدیک است"
    );
  } else if (
    direction ===
    "SELL"
  ) {
    score += 10;
    confirmations++;

    reasons.push(
      "فضای کافی تا حمایت وجود دارد"
    );
  }

  /* ---------- EXTENSION ---------- */

  const extension =
    atrValue > 0
      ? Math.abs(
          current -
            t5.ema20
        ) / atrValue
      : 0;

  if (
    extension >
    MAX_EXTENSION_ATR
  ) {
    score -= 25;

    reasons.push(
      "سیگنال رد شد: قیمت بیش از حد از EMA20 فاصله دارد"
    );
  } else {
    score += 5;
    confirmations++;

    reasons.push(
      "قیمت بیش از حد کشیده نشده است"
    );
  }

  /* ---------- VOLUME ---------- */

  if (
    volume >= 1.10
  ) {
    score += 5;
    confirmations++;

    reasons.push(
      "حجم نسبت به میانگین افزایش یافته است"
    );
  } else if (
    volume > 0 &&
    volume < 0.70
  ) {
    score -= 10;

    reasons.push(
      "حجم ضعیف است"
    );
  }

  /* ---------- VOLATILITY ---------- */

  if (
    atrValue >= 2.0 &&
    atrValue <= 6.0
  ) {
    score += 5;
    confirmations++;

    reasons.push(
      "نوسان بازار برای ورود مناسب است"
    );
  }

  /*
    بازار رنج:
    سیگنال را بسیار سخت می‌کنیم.
  */

  if (
    regime ===
    "RANGING"
  ) {
    score -= 25;

    reasons.push(
      "بازار رنج است؛ سیستم از ورود ضعیف جلوگیری کرد"
    );
  }

  if (
    !direction
  ) {
    return {
      direction: null,
      score: 0,
      confirmations: 0,
      reasons: [
        "15M و 1H جهت مشترک و معتبر ندارند",
      ],
      support,
      resistance,
      atr: atrValue,
      t1,
      t5,
      t15,
      t60,
      candleBias: candle,
      volumeRatio: volume,
      structureQuality: quality,
      roomToTarget,
      extension,
      regime,
    };
  }

  return {
    direction,
    score: Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    ),

    confirmations,

    reasons,

    support,

    resistance,

    atr: atrValue,

    t1,

    t5,

    t15,

    t60,

    candleBias: candle,

    volumeRatio: volume,

    structureQuality:
      quality,

    roomToTarget,

    extension,

    regime,
  };
}

/* =========================================================
   NEWS FILTER
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
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToTomanRate() {
  if (!NETARZ_KEY) {
    throw new Error(
      "NETARZ_API_KEY برای نرخ واقعی دلار به تومان تنظیم نشده است."
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
            x.code ===
            "USD"
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
  };
}

/* =========================================================
   DYNAMIC TRADE LEVELS
   ========================================================= */

function buildLevels(
  entry: number,
  direction: Direction,
  atrValue: number,
  support: number,
  resistance: number
) {
  /*
    Stop بر اساس ATR و ساختار بازار.
  */

  const atrStop =
    atrValue * 1.25;

  let structureStop =
    direction === "BUY"
      ? entry - support
      : resistance - entry;

  if (
    !Number.isFinite(
      structureStop
    ) ||
    structureStop <= 0
  ) {
    structureStop =
      atrStop;
  }

  let stopDistance =
    Math.max(
      atrStop,
      structureStop * 0.55
    );

  stopDistance =
    Math.max(
      MIN_STOP_DISTANCE,
      Math.min(
        MAX_STOP_DISTANCE,
        stopDistance
      )
    );

  /*
    TP ها با R multiple.
  */

  const tp1Distance =
    stopDistance * 1.20;

  const tp2Distance =
    stopDistance * 1.80;

  const tp3Distance =
    stopDistance * 2.60;

  if (
    direction === "BUY"
  ) {
    return {
      stopLoss: round(
        entry -
          stopDistance
      ),

      tp1: round(
        entry +
          tp1Distance
      ),

      tp2: round(
        entry +
          tp2Distance
      ),

      tp3: round(
        entry +
          tp3Distance
      ),

      stopDistance,
      tp1Distance,
      tp2Distance,
      tp3Distance,
    };
  }

  return {
    stopLoss: round(
      entry +
        stopDistance
    ),

    tp1: round(
      entry -
        tp1Distance
    ),

    tp2: round(
      entry -
        tp2Distance
    ),

    tp3: round(
      entry -
        tp3Distance
    ),

    stopDistance,
    tp1Distance,
    tp2Distance,
    tp3Distance,
  };
}

/* =========================================================
   P/L CALCULATION
   ========================================================= */

function pnlForMove(
  move: number,
  lot: number
) {
  return move *
    CONTRACT_SIZE *
    lot;
}

function projectedTradeMoney(
  levels: {
    stopDistance: number;
    tp1Distance: number;
    tp2Distance: number;
    tp3Distance: number;
  }
) {
  const riskUsd =
    pnlForMove(
      levels.stopDistance,
      TOTAL_LOT
    );

  const tp1Usd =
    pnlForMove(
      levels.tp1Distance,
      TP1_LOT
    );

  const tp2Usd =
    pnlForMove(
      levels.tp2Distance,
      TP2_LOT
    );

  const tp3Usd =
    pnlForMove(
      levels.tp3Distance,
      TP3_LOT
    );

  return {
    riskUsd: money(
      riskUsd
    ),

    tp1Usd: money(
      tp1Usd
    ),

    tp2Usd: money(
      tp2Usd
    ),

    tp3Usd: money(
      tp3Usd
    ),

    totalPotentialUsd:
      money(
        tp1Usd +
          tp2Usd +
          tp3Usd
      ),
  };
}

/* =========================================================
   HIT HELPERS
   ========================================================= */

function hit(
  direction: Direction,
  price: number,
  target: number
) {
  return direction ===
    "BUY"
    ? price >= target
    : price <= target;
}

function stopHit(
  direction: Direction,
  price: number,
  stop: number
) {
  return direction ===
    "BUY"
    ? price <= stop
    : price >= stop;
}

/* =========================================================
   EVENT P/L
   ========================================================= */

function eventPnl(
  type: EventRecord["type"],
  meta: RunMeta
) {
  if (type === "TP1") {
    return {
      lotClosed:
        meta.tp1Lot,

      pnlUsd:
        meta.tp1Usd,
    };
  }

  if (type === "TP2") {
    return {
      lotClosed:
        meta.tp2Lot,

      pnlUsd:
        meta.tp2Usd,
    };
  }

  if (type === "TP3") {
    return {
      lotClosed:
        meta.tp3Lot,

      pnlUsd:
        meta.tp3Usd,
    };
  }

  if (type === "SL") {
    return {
      lotClosed:
        meta.remainingLot,

      pnlUsd:
        -meta.riskUsd,
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
) {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

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
    data.result?.message_id ??
      ""
  );
}

/* =========================================================
   TELEGRAM — NEW SIGNAL
   ========================================================= */

function buildSignalTelegram(
  meta: RunMeta,
  rateAsOf: string
) {
  const directionIcon =
    meta.direction ===
    "BUY"
      ? "🟢"
      : "🔴";

  const directionText =
    meta.direction ===
    "BUY"
      ? "BUY"
      : "SELL";

  const analysis =
    meta.analysis as any;

  const reasons =
    Array.isArray(
      analysis?.reasons
    )
      ? analysis.reasons
          .slice(0, 7)
      : [];

  return [
    "╔════════════════════╗",
    "🤖 <b>TRADING AI</b>",
    "🟡 <b>XAUUSD — GOLD SIGNAL</b>",
    "╚════════════════════╝",

    "",

    `${directionIcon} <b>${directionText}</b>`,
    `⭐ امتیاز هوش مصنوعی: <b>${meta.score}/100</b>`,
    `🧠 تأیید معتبر: <b>${meta.confirmations}</b>`,
    `📊 تایم‌فریم: <b>${meta.timeframe}</b>`,
    `🌐 سشن: <b>${meta.session}</b>`,

    "",

    "━━━━━━━━━━━━━━━━",
    "🎯 <b>TRADE PLAN</b>",
    "━━━━━━━━━━━━━━━━",

    `📍 Entry: <b>${fmtPrice(
      meta.entry
    )}</b>`,

    `🛑 Stop Loss: <b>${fmtPrice(
      meta.stopLoss
    )}</b>`,

    `🎯 TP1: <b>${fmtPrice(
      meta.tp1
    )}</b>  |  ${meta.tp1Lot.toFixed(
      2
    )} lot`,

    `🎯 TP2: <b>${fmtPrice(
      meta.tp2
    )}</b>  |  ${meta.tp2Lot.toFixed(
      2
    )} lot`,

    `🏆 TP3: <b>${fmtPrice(
      meta.tp3
    )}</b>  |  ${meta.tp3Lot.toFixed(
      2
    )} lot`,

    "",

    `📦 حجم کل: <b>${meta.totalLot.toFixed(
      2
    )} lot</b>`,

    `💎 ریسک مدل: <b>${formatUsd(
      -meta.riskUsd
    )}</b>`,

    `💰 پتانسیل مراحل: <b>+${formatUsd(
      meta.totalPotentialUsd
    )}</b>`,

    "",

    "━━━━━━━━━━━━━━━━",
    "🔍 <b>WHY THIS TRADE?</b>",
    "━━━━━━━━━━━━━━━━",

    ...reasons.map(
      (reason: string) =>
        `• ${reason}`
    ),

    "",

    `🟢 بعد از TP1: <b>${(
      meta.totalLot -
      meta.tp1Lot
    ).toFixed(
      2
    )} lot</b> باقی می‌ماند.`,

    `⏳ بعد از TP2: <b>${(
      meta.totalLot -
      meta.tp1Lot -
      meta.tp2Lot
    ).toFixed(
      2
    )} lot</b> باقی می‌ماند.`,

    `🏁 بعد از TP3: <b>0.00 lot</b> باقی می‌ماند.`,

    "",

    `💱 USD: <b>${faNumber(
      meta.usdToToman
    )} تومان</b>`,

    `🕒 نرخ ارز: ${rateAsOf}`,

    "",

    "🔐 <b>مدیریت معامله:</b>",
    "TP1 → انتقال SL به Entry",
    "TP2 → حفظ سود و ادامه تا TP3",
    "TP3 → تکمیل کامل معامله",

    "",

    "⚠️ <i>این پیام خروجی مدل تحلیلی است و سود تضمینی نیست.</i>",
  ].join("\n");
}

/* =========================================================
   TELEGRAM — EVENTS
   ========================================================= */

function buildEventTelegram(
  meta: RunMeta,
  event: EventRecord
) {
  const remaining =
    meta.remainingLot;

  if (
    event.type ===
    "TP1"
  ) {
    return [
      "╔════════════════════╗",
      "🎯 <b>TP1 HIT</b>",
      "🟡 <b>XAUUSD</b>",
      "╚════════════════════╝",

      "",

      "✅ <b>هدف اول با موفقیت لمس شد</b>",

      `📌 Entry: <b>${fmtPrice(
        meta.entry
      )}</b>`,

      `🎯 TP1: <b>${fmtPrice(
        meta.tp1
      )}</b>`,

      `💵 سود این مرحله: <b>+${formatUsd(
        event.pnlUsd
      )}</b>`,

      `📦 بسته شد: <b>${event.lotClosed.toFixed(
        2
      )} lot</b>`,

      `📦 باقی‌مانده: <b>${remaining.toFixed(
        2
      )} lot</b>`,

      "",

      "🔐 <b>Risk Free فعال شد</b>",

      `🛡️ SL باقی‌مانده → Entry <b>${fmtPrice(
        meta.entry
      )}</b>`,

      "",

      "⏳ <b>اهداف بعدی:</b>",

      `🎯 TP2 → ${fmtPrice(
        meta.tp2
      )}  | انتظار`,

      `🏆 TP3 → ${fmtPrice(
        meta.tp3
      )}  | انتظار`,

      "",

      "🟢 سود TP1 ثبت شد.",
      "🛡️ معامله وارد حالت Risk Free شد.",

      "",

      "🤖 <i>TRADING AI — LIVE TRADE MANAGER</i>",
    ].join("\n");
  }

  if (
    event.type ===
    "TP2"
  ) {
    return [
      "╔════════════════════╗",
      "🎯 <b>TP2 HIT</b>",
      "🟡 <b>XAUUSD</b>",
      "╚════════════════════╝",

      "",

      "🔥 <b>هدف دوم با موفقیت لمس شد</b>",

      `📌 Entry: <b>${fmtPrice(
        meta.entry
      )}</b>`,

      `🎯 TP2: <b>${fmtPrice(
        meta.tp2
      )}</b>`,

      `💵 سود این مرحله: <b>+${formatUsd(
        event.pnlUsd
      )}</b>`,

      `📦 بسته شد: <b>${event.lotClosed.toFixed(
        2
      )} lot</b>`,

      `📦 باقی‌مانده: <b>${remaining.toFixed(
        2
      )} lot</b>`,

      "",

      "🔐 Risk Free همچنان فعال است.",

      "",

      "⏳ <b>آخرین هدف:</b>",

      `🏆 TP3 → <b>${fmtPrice(
        meta.tp3
      )}</b>  | در انتظار`,

      "",

      "🟢 TP1 ثبت شده",
      "🟢 TP2 ثبت شده",
      "⏳ TP3 در انتظار",

      "",

      "🤖 <i>TRADING AI — LIVE TRADE MANAGER</i>",
    ].join("\n");
  }

  if (
    event.type ===
    "TP3"
  ) {
    return [
      "╔════════════════════╗",
      "🏆 <b>TP3 HIT</b>",
      "🟡 <b>XAUUSD</b>",
      "╚════════════════════╝",

      "",

      "🔥🔥 <b>تمام اهداف معامله تکمیل شد</b>",

      `📌 Entry: <b>${fmtPrice(
        meta.entry
      )}</b>`,

      `🏆 TP3: <b>${fmtPrice(
        meta.tp3
      )}</b>`,

      `💵 سود این مرحله: <b>+${formatUsd(
        event.pnlUsd
      )}</b>`,

      `📊 حجم بسته‌شده: <b>${event.lotClosed.toFixed(
        2
      )} lot</b>`,

      "",

      "✅ TP1 — تکمیل",
      "✅ TP2 — تکمیل",
      "✅ TP3 — تکمیل",

      "",

      `💰 مجموع سود مدل: <b>+${formatUsd(
        meta.tp1Usd +
          meta.tp2Usd +
          meta.tp3Usd
      )}</b>`,

      "🏁 <b>معامله کاملاً بسته شد.</b>",

      "",

      "🤖 <i>TRADING AI — TRADE COMPLETED</i>",
    ].join("\n");
  }

  if (
    event.type ===
    "BREAKEVEN"
  ) {
    return [
      "╔════════════════════╗",
      "🔐 <b>RISK FREE / BREAKEVEN</b>",
      "🟡 <b>XAUUSD</b>",
      "╚════════════════════╝",

      "",

      "🛡️ قیمت به نقطه ورود برگشت.",

      `📍 Entry: <b>${fmtPrice(
        meta.entry
      )}</b>`,

      `📌 قیمت رویداد: <b>${fmtPrice(
        event.price
      )}</b>`,

      `📦 حجم باقی‌مانده بسته شد: <b>${event.lotClosed.toFixed(
        2
      )} lot</b>`,

      "",

      "✅ سود مراحل قبلی حفظ شد.",
      "🏁 معامله بدون ضرر جدید بسته شد.",

      "",

      `🎯 TP1: ${
        meta.events.some(
          e =>
            e.type ===
            "TP1"
        )
          ? "✅"
          : "—"
      }`,

      `🎯 TP2: ${
        meta.events.some(
          e =>
            e.type ===
            "TP2"
        )
          ? "✅"
          : "—"
      }`,

      `🏆 TP3: ${
        meta.events.some(
          e =>
            e.type ===
            "TP3"
        )
          ? "✅"
          : "—"
      }`,

      "",

      "🤖 <i>TRADING AI — RISK FREE MANAGER</i>",
    ].join("\n");
  }

  return [
    "╔════════════════════╗",
    "🛑 <b>STOP LOSS HIT</b>",
    "🟡 <b>XAUUSD</b>",
    "╚════════════════════╝",

    "",

    "⚠️ <b>شرایط Stop Loss فعال شد.</b>",

    `📍 Entry: <b>${fmtPrice(
      meta.entry
    )}</b>`,

    `🛑 Stop: <b>${fmtPrice(
      meta.stopLoss
    )}</b>`,

    `📌 قیمت رویداد: <b>${fmtPrice(
      event.price
    )}</b>`,

    `📉 زیان مدل: <b>${formatUsd(
      event.pnlUsd
    )}</b>`,

    "",

    "🔒 معامله بسته شد.",

    "⏸️ موتور سیگنال برای جلوگیری از ورود انتقامی موقتاً قفل شد.",

    "",

    "❌ TP1",
    "❌ TP2",
    "❌ TP3",

    "",

    "🤖 <i>TRADING AI — RISK CONTROL</i>",
  ].join("\n");
}

/* =========================================================
   ACTIVE RUN
   ========================================================= */

async function activeRun() {
  const rows =
    await prisma.analysisRun.findMany(
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
          createdAt: "desc",
        },

        take: 1,
      }
    );

  return (
    rows[0] ?? null
  );
}

/* =========================================================
   COOLDOWN / ANTI WHIPSAW
   ========================================================= */

async function recentTradeLock(
  currentPrice: number,
  atrValue: number
) {
  const recent =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          signalGenerated: true,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 10,
      }
    );

  const now =
    Date.now();

  for (
    const row of recent
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

    const created =
      new Date(
        meta.createdAt ||
          row.createdAt
      ).getTime();

    const ageMinutes =
      (now - created) /
      60_000;

    const lastEvent =
      meta.events?.at(-1);

    if (
      lastEvent?.type ===
        "SL" &&
      ageMinutes <
        SL_COOLDOWN_MINUTES
    ) {
      return {
        locked: true,

        reason:
          "بعد از Stop Loss سیستم موقتاً برای جلوگیری از ورود انتقامی قفل است.",

        untilMinutes:
          Math.max(
            0,
            Math.round(
              SL_COOLDOWN_MINUTES -
                ageMinutes
            )
          ),
      };
    }

    if (
      (
        lastEvent?.type ===
          "TP3" ||
        lastEvent?.type ===
          "BREAKEVEN"
      ) &&
      ageMinutes <
        PROFIT_COOLDOWN_MINUTES
    ) {
      return {
        locked: true,

        reason:
          "معامله قبلی تازه بسته شده؛ سیستم برای جلوگیری از ورود پشت‌سرهم منتظر می‌ماند.",

        untilMinutes:
          Math.max(
            0,
            Math.round(
              PROFIT_COOLDOWN_MINUTES -
                ageMinutes
            )
          ),
      };
    }

    /*
      جلوگیری از تکرار سیگنال
      در همان قیمت / ناحیه.
    */

    if (
      atrValue > 0 &&
      Math.abs(
        currentPrice -
          meta.entry
      ) <
        atrValue *
          DUPLICATE_DISTANCE_ATR &&
      ageMinutes < 20
    ) {
      return {
        locked: true,

        reason:
          "قیمت هنوز نزدیک ناحیه سیگنال قبلی است؛ ورود تکراری مجاز نیست.",

        untilMinutes: 5,
      };
    }
  }

  return {
    locked: false,
  };
}

/* =========================================================
   SIGNAL SCAN
   ========================================================= */

async function scan(
  userId?: string
) {
  const active =
    await activeRun();

  if (active) {
    return {
      created: false,

      reason:
        "active_trade",

      id: active.id,
    };
  }

  /*
    اول قیمت واقعی.
  */

  const currentPrice =
    await latestPrice();

  /*
    داده‌های چندتایم‌فریمی.
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
        160
      ),

      candles(
        "5min",
        140
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

  /*
    تحلیل بازار.
  */

  const analysis =
    analyzeMarket(
      m1,
      m5,
      m15,
      h1
    );

  /*
    News block
  */

  const news =
    await newsBlock();

  if (
    news.length
  ) {
    return {
      created: false,

      reason:
        "high_impact_news",

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      news:
        news.map(
          x => ({
            event:
              x.event,

            currency:
              x.currency,

            time:
              x.eventTime,
          })
        ),
    };
  }

  /*
    Anti-whipsaw.
  */

  const lock =
    await recentTradeLock(
      currentPrice,
      analysis.atr
    );

  if (lock.locked) {
    return {
      created: false,

      reason:
        "trade_lock",

      message:
        lock.reason,

      untilMinutes:
        lock.untilMinutes,
    };
  }

  /*
    Market regime
  */

  if (
    analysis.regime !==
    "TRENDING"
  ) {
    return {
      created: false,

      reason:
        "market_not_trending",

      regime:
        analysis.regime,

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      reasons:
        analysis.reasons,
    };
  }

  /*
    جهت معتبر.
  */

  if (
    !analysis.direction
  ) {
    return {
      created: false,

      reason:
        "no_direction",

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      reasons:
        analysis.reasons,
    };
  }

  /*
    Score.
  */

  if (
    analysis.score <
    SCORE_TO_SIGNAL
  ) {
    return {
      created: false,

      reason:
        "score_below_threshold",

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      reasons:
        analysis.reasons,
    };
  }

  /*
    Confirmations.
  */

  if (
    analysis.confirmations <
    MIN_CONFIRMATIONS
  ) {
    return {
      created: false,

      reason:
        "not_enough_confirmations",

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      reasons:
        analysis.reasons,
    };
  }

  /*
    Entry واقعی.
  */

  const entry =
    currentPrice;

  /*
    جلوگیری از خرید در مقاومت
    و فروش در حمایت.
  */

  const room =
    analysis.roomToTarget;

  if (
    room <
    analysis.atr *
      MIN_ROOM_ATR
  ) {
    return {
      created: false,

      reason:
        "bad_entry_location",

      score:
        analysis.score,

      room:
        round(room),

      atr:
        round(
          analysis.atr
        ),
    };
  }

  /*
    ساخت SL/TP داینامیک.
  */

  const levels =
    buildLevels(
      entry,
      analysis.direction,
      analysis.atr,
      analysis.support,
      analysis.resistance
    );

  /*
    بررسی منطقی بودن SL.
  */

  if (
    levels.stopDistance <
      MIN_STOP_DISTANCE ||
    levels.stopDistance >
      MAX_STOP_DISTANCE
  ) {
    return {
      created: false,

      reason:
        "invalid_stop_distance",

      stopDistance:
        round(
          levels.stopDistance
        ),
    };
  }

  /*
    بررسی فاصله TP3 تا ساختار.
  */

  if (
    analysis.direction ===
      "BUY" &&
    levels.tp3 >
      analysis.resistance
  ) {
    /*
      اگر TP3 خیلی بالاتر از مقاومت است،
      معامله احتمالاً فضای کافی ندارد.
    */

    const available =
      analysis.resistance -
      entry;

    if (
      available <
      levels.tp2Distance
    ) {
      return {
        created: false,

        reason:
          "tp_space_insufficient",
      };
    }
  }

  if (
    analysis.direction ===
      "SELL" &&
    levels.tp3 <
      analysis.support
  ) {
    const available =
      entry -
      analysis.support;

    if (
      available <
      levels.tp2Distance
    ) {
      return {
        created: false,

        reason:
          "tp_space_insufficient",
      };
    }
  }

  /*
    محاسبه سود/ریسک.
  */

  const moneyPlan =
    projectedTradeMoney(
      levels
    );

  /*
    R:R تقریبی TP3.
  */

  const rr =
    levels.stopDistance >
    0
      ? levels.tp3Distance /
        levels.stopDistance
      : 0;

  if (
    rr < 2.0
  ) {
    return {
      created: false,

      reason:
        "poor_risk_reward",

      rr:
        round(rr, 2),
    };
  }

  /*
    نرخ تومان.
  */

  const fx =
    await getUsdToTomanRate();

  const now =
    new Date();

  const session =
    currentSession(now);

  const riskToman =
    toman(
      moneyPlan.riskUsd *
        fx.rate
    );

  const tp1Toman =
    toman(
      moneyPlan.tp1Usd *
        fx.rate
    );

  const tp2Toman =
    toman(
      moneyPlan.tp2Usd *
        fx.rate
    );

  const tp3Toman =
    toman(
      moneyPlan.tp3Usd *
        fx.rate
    );

  const totalPotentialToman =
    toman(
      moneyPlan.totalPotentialUsd *
        fx.rate
    );

  /*
    متادیتای کامل.
  */

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
        levels.stopLoss,

      tp1:
        levels.tp1,

      tp2:
        levels.tp2,

      tp3:
        levels.tp3,

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
        moneyPlan.riskUsd,

      tp1Usd:
        moneyPlan.tp1Usd,

      tp2Usd:
        moneyPlan.tp2Usd,

      tp3Usd:
        moneyPlan.tp3Usd,

      totalPotentialUsd:
        moneyPlan.totalPotentialUsd,

      usdToToman:
        fx.rate,

      riskToman,

      tp1Toman,

      tp2Toman,

      tp3Toman,

      totalPotentialToman,

      session,

      score:
        analysis.score,

      confirmations:
        analysis.confirmations,

      timeframe:
        "1M + 5M + 15M + 1H",

      state:
        "AI_PENDING",

      breakeven:
        false,

      currentPrice:
        currentPrice,

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

        regime:
          analysis.regime,

        structureQuality:
          analysis.structureQuality,

        roomToTarget:
          analysis.roomToTarget,

        extension:
          analysis.extension,

        volumeRatio:
          analysis.volumeRatio,

        rr,

        stopDistance:
          levels.stopDistance,

        tp1Distance:
          levels.tp1Distance,

        tp2Distance:
          levels.tp2Distance,

        tp3Distance:
          levels.tp3Distance,

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

  /*
    ثبت در دیتابیس.
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
    Telegram.
  */

  try {
    const messageId =
      await sendTelegram(
        buildSignalTelegram(
          meta,
          fx.asOf
        )
      );

    meta.analysis = {
      ...meta.analysis,

      telegramMessageId:
        messageId,
    };

    await prisma.analysisRun.update(
      {
        where: {
          id:
            created.id,
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
    };

    await prisma.analysisRun.update(
      {
        where: {
          id:
            created.id,
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

/* =========================================================
   TRADE MONITOR
   ========================================================= */

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

  const price =
    await latestPrice();

  meta.currentPrice =
    price;

  meta.lastUpdate =
    new Date().toISOString();

  const fx =
    await getUsdToTomanRate();

  const push = async (
    type: EventRecord["type"],
    priceAtHit: number
  ) => {
    const base =
      eventPnl(
        type,
        meta
      );

    const event:
      EventRecord =
      {
        type,

        at:
          new Date().toISOString(),

        price:
          round(
            priceAtHit
          ),

        lotClosed:
          base.lotClosed,

        pnlUsd:
          base.pnlUsd,

        pnlToman:
          toman(
            base.pnlUsd *
              fx.rate
          ),

        usdToToman:
          fx.rate,
      };

    meta.events.push(
      event
    );

    /*
      Remaining lot.
    */

    if (
      type === "TP1"
    ) {
      meta.remainingLot =
        Math.max(
          0,
          meta.remainingLot -
            meta.tp1Lot
        );

      meta.state =
        "AI_TP1";

      meta.breakeven =
        true;
    }

    if (
      type === "TP2"
    ) {
      meta.remainingLot =
        Math.max(
          0,
          meta.remainingLot -
            meta.tp2Lot
        );

      meta.state =
        "AI_TP2";

      meta.breakeven =
        true;
    }

    if (
      type === "TP3"
    ) {
      meta.remainingLot =
        Math.max(
          0,
          meta.remainingLot -
            meta.tp3Lot
        );

      meta.state =
        "AI_TP3";
    }

    if (
      type === "SL"
    ) {
      meta.remainingLot =
        0;

      meta.state =
        "AI_SL";
    }

    if (
      type ===
      "BREAKEVEN"
    ) {
      meta.remainingLot =
        0;

      meta.state =
        "AI_BE";
    }

    /*
      Telegram event.
    */

    try {
      await sendTelegram(
        buildEventTelegram(
          meta,
          event
        )
      );
    } catch (error) {
      meta.analysis = {
        ...meta.analysis,

        telegramError:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }

    /*
      ثبت وضعیت جدید.
    */

    await prisma.analysisRun.update(
      {
        where: {
          id:
            run.id,
        },

        data: {
          status:
            meta.state,

          metadata:
            meta as any,

          finishedAt:
            new Date(),
        },
      }
    );

    return event;
  };

  /*
    ---------------------------------------------------------
    IMPORTANT:
    SL قبل از TP1
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_PENDING" &&
    stopHit(
      meta.direction,
      price,
      meta.stopLoss
    )
  ) {
    return push(
      "SL",
      price
    );
  }

  /*
    TP1
  */

  if (
    meta.state ===
      "AI_PENDING" &&
    hit(
      meta.direction,
      price,
      meta.tp1
    )
  ) {
    return push(
      "TP1",
      price
    );
  }

  /*
    بعد از TP1:
    SL = Entry
  */

  if (
    meta.state ===
      "AI_TP1" &&
    stopHit(
      meta.direction,
      price,
      meta.entry
    )
  ) {
    return push(
      "BREAKEVEN",
      price
    );
  }

  /*
    TP2
  */

  if (
    meta.state ===
      "AI_TP1" &&
    hit(
      meta.direction,
      price,
      meta.tp2
    )
  ) {
    return push(
      "TP2",
      price
    );
  }

  /*
    بعد از TP2:
    SL = Entry
  */

  if (
    meta.state ===
      "AI_TP2" &&
    stopHit(
      meta.direction,
      price,
      meta.entry
    )
  ) {
    return push(
      "BREAKEVEN",
      price
    );
  }

  /*
    TP3
  */

  if (
    meta.state ===
      "AI_TP2" &&
    hit(
      meta.direction,
      price,
      meta.tp3
    )
  ) {
    return push(
      "TP3",
      price
    );
  }

  return {
    price,

    state:
      meta.state,

    remainingLot:
      meta.remainingLot,
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
      row.metadata as
        | RunMeta
        | null;

    if (
      !meta?.events
    ) {
      continue;
    }

    output.trades++;

    let final:
      | string
      | null =
      null;

    for (
      const event of
        meta.events
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
        BREAKEVEN سود صفر دارد.
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
      final === "TP3"
    ) {
      output.wins++;
    }

    if (
      final ===
      "BREAKEVEN"
    ) {
      output.breakeven++;
    }

    if (
      final === "SL"
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
      d.getUTCDay() ||
      7;

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

          take: 20,
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
        row => ({
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

  const reports =
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

        take: 50,
      }
    );

  const already =
    reports.find(
      row =>
        (
          row.metadata as any
        )?.key === key
    );

  if (already) {
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
      row => {
        const meta =
          row.metadata as any;

        if (
          meta?.session !==
            name ||
          meta?.kind !==
            "AI_SCALP"
        ) {
          return false;
        }

        const created =
          new Date(
            meta?.createdAt ||
              row.createdAt
          );

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

  const msg = [
    "╔════════════════════╗",
    "📊 <b>SESSION REPORT</b>",
    "🤖 <b>TRADING AI</b>",
    "╚════════════════════╝",

    "",

    `🟡 <b>XAUUSD</b> | ${name}`,

    `📅 ${key}`,

    "",

    `📊 معاملات: <b>${totals.trades}</b>`,

    `🎯 TP1: <b>${totals.tp1}</b>`,

    `🎯 TP2: <b>${totals.tp2}</b>`,

    `🏆 TP3: <b>${totals.tp3}</b>`,

    `🛑 SL: <b>${totals.sl}</b>`,

    `🔐 BE: <b>${totals.breakeven}</b>`,

    "",

    `💰 خالص: <b>${
      totals.pnlUsd >= 0
        ? "+"
        : ""
    }${formatUsd(
      totals.pnlUsd
    )}</b>`,

    `🇮🇷 خالص: <b>${
      totals.pnlToman >= 0
        ? "+"
        : "-"
    }${formatToman(
      Math.abs(
        totals.pnlToman
      )
    )}</b>`,

    "",

    `💱 دلار: <b>${faNumber(
      fx.rate
    )} تومان</b>`,

    "",

    "🤖 <i>گزارش بر اساس رویدادهای ثبت‌شده موتور تحلیل است.</i>",
  ].join("\n");

  let telegramMessageId =
    "";

  try {
    telegramMessageId =
      await sendTelegram(
        msg
      );
  } catch {
    telegramMessageId =
      "";
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

/* =========================================================
   CRON
   ========================================================= */

async function cronCycle() {
  const monitored:
    unknown[] =
    [];

  const active =
    await activeRun();

  if (active) {
    monitored.push(
      await monitorOne(
        active
      )
    );
  } else {
    monitored.push(
      await scan()
    );
  }

  const reports:
    Record<
      string,
      unknown
    > = {};

  for (
    const name of
      Object.keys(
        SESSIONS
      ) as SessionName[]
  ) {
    if (
      sessionEndReached(
        name
      )
    ) {
      reports[name] =
        await sessionReport(
          name
        );
    }
  }

  return {
    monitored,

    reports,
  };
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard(
  userId?: string
) {
  const [
    active,
    perf,
    fx,
    latest,
    livePrice,
    chartCandles,
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
        () => 0
      ),

      candles(
        "1min",
        100
      ).catch(
        () => []
      ),
    ]);

  const meta =
    latest?.metadata as
      | RunMeta
      | undefined;

  return {
    symbol:
      DISPLAY_SYMBOL,

    contractSize:
      CONTRACT_SIZE,

    currentPrice:
      livePrice,

    marketData: {
      connected:
        livePrice > 0,

      provider:
        "Twelve Data",

      updatedAt:
        new Date().toISOString(),
    },

    candles:
      chartCandles,

    position: {
      totalLot:
        TOTAL_LOT,

      tp1Lot:
        TP1_LOT,

      tp2Lot:
        TP2_LOT,

      tp3Lot:
        TP3_LOT,
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

    sessions:
      SESSIONS,

    userId,
  };
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  req: NextRequest
) {
  try {
    const url =
      new URL(
        req.url
      );

    const cron =
      url.searchParams.get(
        "cron"
      ) === "1";

    /*
      CRON MODE
    */

    if (cron) {
      const provided =
        req.headers.get(
          "x-ai-cron-secret"
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

          at:
            new Date().toISOString(),
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
      USER DASHBOARD
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
            : "خطای داخلی موتور تحلیل",
      },
      {
        status: 500,
      }
    );
  }
}
