import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   XAUUSD AI ENGINE
   ---------------------------------------------------------
   چرخه:
   MARKET
      ↓
   SCAN
      ↓
   SIGNAL CREATED
      ↓
   TELEGRAM + CHART
      ↓
   MONITOR
      ↓
   TP1 / TP2 / TP3 / SL / BE
      ↓
   COMPLETED
      ↓
   SEARCH NEW SIGNAL
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.10;
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

/*
  0.10 lot × 100 oz × $4 = $40 risk

  TP1:
  $6 movement × 0.04 × 100 = $24
  RR = 24 / 40 = 0.60 on full position,
  اما نسبت هدف قیمتی نسبت به ریسک:
  6 / 4 = 1.50R

  TP2:
  10 / 4 = 2.50R

  TP3:
  14 / 4 = 3.50R
*/

const STOP_USD = 40;

const STOP_DISTANCE = 4.0;

const TP1_DISTANCE = 6.0;
const TP2_DISTANCE = 10.0;
const TP3_DISTANCE = 14.0;

const TP1_USD = TP1_LOT * CONTRACT_SIZE * TP1_DISTANCE;
const TP2_USD = TP2_LOT * CONTRACT_SIZE * TP2_DISTANCE;
const TP3_USD = TP3_LOT * CONTRACT_SIZE * TP3_DISTANCE;

const TOTAL_POTENTIAL_USD =
  TP1_USD +
  TP2_USD +
  TP3_USD;

const TP1_RR = TP1_DISTANCE / STOP_DISTANCE;
const TP2_RR = TP2_DISTANCE / STOP_DISTANCE;
const TP3_RR = TP3_DISTANCE / STOP_DISTANCE;

const DEFAULT_NEWS_MINUTES = 30;

const SCORE_TO_SIGNAL = 85;

/*
  برای اینکه اگر بازار بدون سیگنال بود
  هر چند ثانیه دوباره چهار تایم‌فریم سنگین
  از Twelve Data خوانده نشوند.
*/
const NO_TRADE_COOLDOWN_MS = 30_000;

const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

const NETARZ_KEY =
  process.env.NETARZ_API_KEY ||
  process.env.NETARZ_FX_KEY;

/*
  قفل داخل همان instance سرور.
  باعث می‌شود درخواست همزمان صفحه و Cron
  دو سیگنال مشابه نسازند.
*/
let engineLock: Promise<unknown> | null = null;

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
};

type RunState =
  | "AI_PENDING"
  | "AI_TP1"
  | "AI_TP2"
  | "AI_TP3"
  | "AI_BE"
  | "AI_SL"
  | "AI_COMPLETED";

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

  tp1RR: number;
  tp2RR: number;
  tp3RR: number;

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

  state: RunState;

  breakeven: boolean;

  currentPrice: number;

  priceUpdatedAt: string;

  events: EventRecord[];

  analysis: Record<string, unknown>;

  createdAt: string;

  lastUpdate: string;

  telegramMessageId?: string;

  telegramError?: string;
};

type MarketStatus = {
  open: boolean;
  label: string;
  reason: string;
  timezone: string;
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
  v: number,
  digits = 2
) {
  const p = 10 ** digits;

  return Math.round(v * p) / p;
}

function money(v: number) {
  return Math.round(v * 100) / 100;
}

function toman(v: number) {
  return Math.round(v);
}

function formatToman(v: number) {
  if (!v) return "—";

  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(v)
  )} تومان`;
}

function formatUsd(v: number) {
  return `$${new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(v)}`;
}

function fmtPrice(v: number) {
  return Number(v || 0).toFixed(2);
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

  if (
    name === "Sydney" &&
    h < 6
  ) {
    d.setUTCDate(
      d.getUTCDate() - 1
    );
  }

  return `${name}-${d
    .toISOString()
    .slice(0, 10)}`;
}

const SESSIONS = {
  Sydney: {
    start: 21,
    end: 6,
  },

  Tokyo: {
    start: 0,
    end: 9,
  },

  London: {
    start: 7,
    end: 16,
  },

  "New York": {
    start: 13,
    end: 22,
  },
} as const;

function sessionEndReached(
  name: SessionName,
  date = new Date()
) {
  const end =
    SESSIONS[name].end;

  return (
    date.getUTCHours() === end &&
    date.getUTCMinutes() < 2
  );
}

/* =========================================================
   NEW YORK TIME
   ========================================================= */

function newYorkParts(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/New_York",
        hour12: false,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).formatToParts(date);

  const get = (
    type: string
  ) =>
    parts.find(
      (x) => x.type === type
    )?.value ?? "";

  return {
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/*
  XAU/USD معمولاً تقریباً 23 ساعت در روز
  و 5 روز هفته معامله می‌شود.

  این schedule عمداً محافظه‌کارانه است:
  Sunday 18:05 NY → Friday 17:00 NY
  daily break → 17:00 تا 18:05 NY

  ساعات دقیق بروکر می‌تواند متفاوت باشد.
*/

function getGoldMarketStatus(
  date = new Date()
): MarketStatus {
  const p = newYorkParts(date);

  const minuteOfDay =
    p.hour * 60 + p.minute;

  const openMinute =
    18 * 60 + 5;

  const closeMinute =
    17 * 60;

  if (p.weekday === "Sat") {
    return {
      open: false,
      label: "بازار بسته است",
      reason: "تعطیلی پایان هفته",
      timezone:
        "America/New_York",
    };
  }

  if (p.weekday === "Sun") {
    if (
      minuteOfDay <
      openMinute
    ) {
      return {
        open: false,
        label: "بازار بسته است",
        reason:
          "بازگشایی بازار طلا یکشنبه ساعت 18:05 نیویورک",
        timezone:
          "America/New_York",
      };
    }
  }

  if (
    p.weekday === "Fri" &&
    minuteOfDay >= closeMinute
  ) {
    return {
      open: false,
      label: "بازار بسته است",
      reason:
        "بازار طلا برای پایان هفته بسته شده است",
      timezone:
        "America/New_York",
    };
  }

  if (
    p.weekday !== "Sun" &&
    minuteOfDay >= closeMinute &&
    minuteOfDay < openMinute
  ) {
    return {
      open: false,
      label: "بازار بسته است",
      reason:
        "وقفه روزانه بازار طلا",
      timezone:
        "America/New_York",
    };
  }

  return {
    open: true,
    label: "بازار باز است",
    reason:
      "داده لحظه‌ای بازار فعال است",
    timezone:
      "America/New_York",
  };
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function td(
  url: string
) {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Render تنظیم نشده است."
    );
  }

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(
      TD_KEY
    )}`;

  const response =
    await fetch(full, {
      cache: "no-store",
    });

  const data =
    await response.json();

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
  const data =
    await td(
      `https://api.twelvedata.com/time_series` +
        `?symbol=${encodeURIComponent(
          SYMBOL
        )}` +
        `&interval=${encodeURIComponent(
          interval
        )}` +
        `&outputsize=${outputsize}` +
        `&order=ASC` +
        `&timezone=UTC`
    );

  if (
    !Array.isArray(
      data?.values
    )
  ) {
    throw new Error(
      `داده کندل ${interval} دریافت نشد.`
    );
  }

  return data.values
    .map((x: any) => ({
      datetime:
        String(x.datetime),

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
      (a: Candle, b: Candle) =>
        a.datetime.localeCompare(
          b.datetime
        )
    );
}

async function latestQuote() {
  const data =
    await td(
      `https://api.twelvedata.com/quote` +
        `?symbol=${encodeURIComponent(
          SYMBOL
        )}` +
        `&interval=1min` +
        `&timezone=UTC`
    );

  const price =
    num(
      data?.close ??
        data?.price
    );

  if (!price) {
    throw new Error(
      "قیمت لحظه‌ای XAU/USD دریافت نشد."
    );
  }

  return {
    price,
    timestamp:
      num(
        data?.last_quote_at ??
          data?.timestamp
      ),
    datetime:
      data?.datetime
        ? String(
            data.datetime
          )
        : null,
    providerMarketOpen:
      typeof data?.is_market_open ===
      "boolean"
        ? data.is_market_open
        : null,
  };
}

/* =========================================================
   TECHNICAL INDICATORS
   ========================================================= */

function sma(
  values: number[],
  period: number
) {
  if (!values.length) {
    return 0;
  }

  if (
    values.length <
    period
  ) {
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
    ) / period
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

  let out =
    values[0];

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

    const g =
      Math.max(d, 0);

    const l =
      Math.max(-d, 0);

    gain =
      (gain *
        (period - 1) +
        g) /
      period;

    loss =
      (loss *
        (period - 1) +
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
  c: Candle[],
  period = 14
) {
  if (
    c.length <
    period + 1
  ) {
    return 0;
  }

  const tr: number[] =
    [];

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
            c[i - 1].close
        ),

        Math.abs(
          c[i].low -
            c[i - 1].close
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
) {
  const fast =
    ema(values, 12);

  const slow =
    ema(values, 26);

  return fast - slow;
}

function swings(
  c: Candle[],
  lookback = 30
) {
  const rows =
    c.slice(-lookback);

  if (!rows.length) {
    return {
      support: 0,
      resistance: 0,
    };
  }

  return {
    support:
      Math.min(
        ...rows.map(
          (x) => x.low
        )
      ),

    resistance:
      Math.max(
        ...rows.map(
          (x) => x.high
        )
      ),
  };
}

function candleBias(
  c: Candle[]
) {
  const a =
    c.at(-2);

  const b =
    c.at(-1);

  if (!a || !b) {
    return 0;
  }

  const body =
    Math.abs(
      b.close -
        b.open
    );

  const range =
    Math.max(
      b.high -
        b.low,
      0.0001
    );

  const bullish =
    b.close > b.open &&
    (
      body / range >
        0.55 ||
      b.close > a.high
    );

  const bearish =
    b.close < b.open &&
    (
      body / range >
        0.55 ||
      b.close < a.low
    );

  return bullish
    ? 1
    : bearish
      ? -1
      : 0;
}

function trendScore(
  c: Candle[]
) {
  const closes =
    c.map(
      (x) => x.close
    );

  const e20 =
    ema(closes, 20);

  const e50 =
    ema(closes, 50);

  const r =
    rsi(closes);

  const m =
    macd(closes);

  const buy =
    e20 > e50 &&
    r >= 52 &&
    r <= 72 &&
    m > 0;

  const sell =
    e20 < e50 &&
    r <= 48 &&
    r >= 28 &&
    m < 0;

  if (buy) {
    return {
      direction:
        "BUY" as Direction,

      score: 25,

      ema20: e20,

      ema50: e50,

      rsi: r,

      macd: m,
    };
  }

  if (sell) {
    return {
      direction:
        "SELL" as Direction,

      score: 25,

      ema20: e20,

      ema50: e50,

      rsi: r,

      macd: m,
    };
  }

  return {
    direction: null,

    score: 0,

    ema20: e20,

    ema50: e50,

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

  const direction:
    | Direction
    | null =
    buyVotes >= 2
      ? "BUY"
      : sellVotes >= 2
        ? "SELL"
        : null;

  let score = 0;

  const reasons: string[] =
    [];

  if (direction) {
    score += 25;

    reasons.push(
      `روند چندتایم‌فریم: ${direction}`
    );
  }

  if (
    direction &&
    t1.direction ===
      direction
  ) {
    score += 10;

    reasons.push(
      "روند 1 دقیقه همسو است"
    );
  }

  if (
    direction &&
    t15.direction ===
      direction &&
    t60.direction ===
      direction
  ) {
    score += 10;

    reasons.push(
      "15m و 1h هم‌جهت هستند"
    );
  }

  const last =
    m5.at(-1)?.close ??
    0;

  const s =
    swings(m5, 30);

  const a =
    atr(m5);

  const nearSupport =
    direction === "BUY" &&
    last >
      s.support &&
    last -
      s.support <=
      Math.max(
        a * 1.5,
        6
      );

  const nearResistance =
    direction === "SELL" &&
    s.resistance >
      last &&
    s.resistance -
      last <=
      Math.max(
        a * 1.5,
        6
      );

  if (
    nearSupport ||
    nearResistance
  ) {
    score += 10;

    reasons.push(
      "قیمت نزدیک ناحیه ساختاری معتبر است"
    );
  }

  const cb =
    candleBias(m5);

  if (
    (
      direction === "BUY" &&
      cb > 0
    ) ||
    (
      direction === "SELL" &&
      cb < 0
    )
  ) {
    score += 10;

    reasons.push(
      "تأیید کندلی"
    );
  }

  const volume =
    m5.at(-1)?.volume ??
    0;

  const avgVol =
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
    volume > 0 &&
    avgVol > 0 &&
    volume >=
      avgVol * 1.05
  ) {
    score += 5;

    reasons.push(
      "حجم بالاتر از میانگین"
    );
  }

  const r =
    t5.rsi;

  if (
    direction === "BUY" &&
    r >= 52 &&
    r <= 68
  ) {
    score += 10;

    reasons.push(
      "مومنتوم خرید"
    );
  }

  if (
    direction === "SELL" &&
    r <= 48 &&
    r >= 32
  ) {
    score += 10;

    reasons.push(
      "مومنتوم فروش"
    );
  }

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

    reasons.push(
      "قیمت نسبت به EMA20 در جای مناسب است"
    );
  }

  if (
    direction &&
    a > 0 &&
    Math.abs(
      s.resistance -
        s.support
    ) >=
      a * 2
  ) {
    score += 5;

    reasons.push(
      "دامنه ساختاری کافی"
    );
  }

  return {
    direction,

    score:
      Math.min(
        score,
        100
      ),

    reasons,

    support:
      s.support,

    resistance:
      s.resistance,

    atr: a,

    t5,

    t15,

    t60,
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
          eventTime:
            "asc",
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
    return null;
  }

  try {
    const response =
      await fetch(
        "https://netarz.ir/api/fx/v1/rates?codes=USD",
        {
          headers: {
            Authorization:
              `Bearer ${NETARZ_KEY}`,
          },

          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

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
          data?.meta
            ?.usd_irt
      );

    if (!rate) {
      return null;
    }

    return {
      rate:
        Math.round(
          rate
        ),

      asOf:
        row?.as_of ??
        data?.meta
          ?.as_of ??
        new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/* =========================================================
   LEVELS
   ========================================================= */

function levels(
  entry: number,
  direction: Direction
) {
  if (
    direction ===
    "BUY"
  ) {
    return {
      stopLoss:
        round(
          entry -
            STOP_DISTANCE
        ),

      tp1:
        round(
          entry +
            TP1_DISTANCE
        ),

      tp2:
        round(
          entry +
            TP2_DISTANCE
        ),

      tp3:
        round(
          entry +
            TP3_DISTANCE
        ),
    };
  }

  return {
    stopLoss:
      round(
        entry +
          STOP_DISTANCE
      ),

    tp1:
      round(
        entry -
          TP1_DISTANCE
      ),

    tp2:
      round(
        entry -
          TP2_DISTANCE
      ),

    tp3:
      round(
        entry -
          TP3_DISTANCE
      ),
  };
}

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
  type: EventType
) {
  if (
    type === "TP1"
  ) {
    return {
      lotClosed:
        TP1_LOT,

      pnlUsd:
        TP1_USD,
    };
  }

  if (
    type === "TP2"
  ) {
    return {
      lotClosed:
        TP2_LOT,

      pnlUsd:
        TP2_USD,
    };
  }

  if (
    type === "TP3"
  ) {
    return {
      lotClosed:
        TP3_LOT,

      pnlUsd:
        TP3_USD,
    };
  }

  if (
    type === "SL"
  ) {
    return {
      lotClosed:
        TOTAL_LOT,

      pnlUsd:
        -STOP_USD,
    };
  }

  if (
    type ===
    "BREAKEVEN"
  ) {
    return {
      lotClosed:
        0.06,

      pnlUsd:
        0,
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

async function telegramRequest(
  method: string,
  body: Record<string, unknown>
) {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "تنظیمات Telegram کامل نیست."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            chat_id:
              chatId,

            ...body,
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
        "Telegram API error"
    );
  }

  return data;
}

/* =========================================================
   TELEGRAM CHART
   ========================================================= */

function buildTelegramChartUrl(
  meta: RunMeta,
  chartCandles: Candle[]
) {
  const rows =
    chartCandles
      .slice(-45);

  const labels =
    rows.map(
      (x) =>
        x.datetime
          .slice(-5)
    );

  const closes =
    rows.map(
      (x) =>
        round(x.close)
    );

  const entry =
    rows.map(
      () => meta.entry
    );

  const sl =
    rows.map(
      () =>
        meta.stopLoss
    );

  const tp1 =
    rows.map(
      () => meta.tp1
    );

  const tp2 =
    rows.map(
      () => meta.tp2
    );

  const tp3 =
    rows.map(
      () => meta.tp3
    );

  const chart =
    {
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
              "#d9a62e",

            backgroundColor:
              "rgba(217,166,46,0.12)",

            borderWidth: 2,

            pointRadius: 0,

            tension: 0.18,

            fill: true,
          },

          {
            label:
              "ENTRY",

            data:
              entry,

            borderColor:
              "#ffffff",

            borderWidth: 1,

            pointRadius: 0,

            borderDash:
              [5, 5],
          },

          {
            label:
              "SL",

            data:
              sl,

            borderColor:
              "#ff4d5f",

            borderWidth: 1,

            pointRadius: 0,
          },

          {
            label:
              "TP1",

            data:
              tp1,

            borderColor:
              "#4ade80",

            borderWidth: 1,

            pointRadius: 0,
          },

          {
            label:
              "TP2",

            data:
              tp2,

            borderColor:
              "#22c55e",

            borderWidth: 1,

            pointRadius: 0,
          },

          {
            label:
              "TP3",

            data:
              tp3,

            borderColor:
              "#16a34a",

            borderWidth: 2,

            pointRadius: 0,
          },
        ],
      },

      options: {
        responsive:
          true,

        plugins: {
          legend: {
            display:
              true,

            labels: {
              color:
                "#e5e7eb",
            },
          },

          title: {
            display:
              true,

            text:
              `XAUUSD ${meta.direction} | Score ${meta.score}/100`,

            color:
              "#f4c95d",

            font: {
              size: 18,
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
                "rgba(255,255,255,0.05)",
            },
          },

          y: {
            ticks: {
              color:
                "#9ca3af",
            },

            grid: {
              color:
                "rgba(255,255,255,0.05)",
            },
          },
        },
      },
    };

  return (
    "https://quickchart.io/chart" +
    "?width=900" +
    "&height=520" +
    "&version=4" +
    "&format=png" +
    "&c=" +
    encodeURIComponent(
      JSON.stringify(
        chart
      )
    )
  );
}

/* =========================================================
   TELEGRAM SIGNAL MESSAGE
   ========================================================= */

function buildSignalTelegram(
  meta: RunMeta,
  rateAsOf: string
) {
  return [
    "🤖 <b>AI GOLD SIGNAL</b>",
    "",

    `🟡 <b>XAUUSD</b> | ${
      meta.direction ===
      "BUY"
        ? "🟢 BUY"
        : "🔴 SELL"
    }`,

    `📊 Score: <b>${meta.score}/100</b>`,

    `🕐 Timeframe: <b>${meta.timeframe}</b>`,

    "",

    `🎯 Entry: <b>${fmtPrice(
      meta.entry
    )}</b>`,

    `🛑 SL: <b>${fmtPrice(
      meta.stopLoss
    )}</b> | Risk: <b>${formatUsd(
      meta.riskUsd
    )}</b>`,

    "",

    `🎯 TP1: <b>${fmtPrice(
      meta.tp1
    )}</b> | ${meta.tp1Lot.toFixed(
      2
    )} lot | +${formatUsd(
      meta.tp1Usd
    )} | RR ${meta.tp1RR.toFixed(
      2
    )}`,

    `🎯 TP2: <b>${fmtPrice(
      meta.tp2
    )}</b> | ${meta.tp2Lot.toFixed(
      2
    )} lot | +${formatUsd(
      meta.tp2Usd
    )} | RR ${meta.tp2RR.toFixed(
      2
    )}`,

    `🏆 TP3: <b>${fmtPrice(
      meta.tp3
    )}</b> | ${meta.tp3Lot.toFixed(
      2
    )} lot | +${formatUsd(
      meta.tp3Usd
    )} | RR ${meta.tp3RR.toFixed(
      2
    )}`,

    "",

    `📦 Total: <b>${meta.totalLot.toFixed(
      2
    )} lot</b>`,

    `💰 Potential: <b>+${formatUsd(
      meta.totalPotentialUsd
    )}</b>`,

    meta.usdToToman
      ? `💱 USD: <b>${new Intl.NumberFormat(
          "fa-IR"
        ).format(
          meta.usdToToman
        )} تومان</b>`
      : "",

    rateAsOf
      ? `🕒 FX: ${rateAsOf}`
      : "",

    "",

    "⚠️ تحلیل بازار است و تضمین سود نیست.",
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================
   TELEGRAM EVENT
   ========================================================= */

function buildEventTelegram(
  meta: RunMeta,
  event: EventRecord
) {
  const title =
    event.type === "TP1"
      ? "🎯 TP1 HIT"
      : event.type === "TP2"
        ? "🎯 TP2 HIT"
        : event.type === "TP3"
          ? "🏆 TP3 HIT"
          : event.type ===
              "BREAKEVEN"
            ? "🔐 BREAKEVEN"
            : "🛑 STOP LOSS HIT";

  const result =
    event.pnlUsd > 0
      ? `+${formatUsd(
          event.pnlUsd
        )}`
      : event.pnlUsd < 0
        ? `-${formatUsd(
            Math.abs(
              event.pnlUsd
            )
          )}`
        : "$0";

  const advice =
    event.type === "TP1"
      ? "TP1 ثبت شد؛ 0.04 lot بسته شد و SL بخش باقی‌مانده روی Entry محافظت می‌شود."
      : event.type === "TP2"
        ? "TP2 ثبت شد؛ 0.03 lot بسته شد و 0.03 lot باقی مانده است."
        : event.type === "TP3"
          ? "تمام اهداف تکمیل شد؛ معامله کامل شد و سیستم به جستجوی سیگنال جدید می‌رود."
          : event.type ===
              "BREAKEVEN"
            ? "قیمت به Entry برگشت؛ بخش باقی‌مانده بدون زیان بسته شد."
            : "حد ضرر لمس شد؛ معامله بسته شد و سیستم بلافاصله جستجوی سیگنال جدید را آغاز می‌کند.";

  return [
    "🤖 <b>AI GOLD ENGINE</b>",

    title,

    `🟡 XAUUSD | ${
      meta.direction ===
      "BUY"
        ? "🟢 BUY"
        : "🔴 SELL"
    }`,

    `📌 Entry: <b>${fmtPrice(
      meta.entry
    )}</b>`,

    `📍 Event Price: <b>${fmtPrice(
      event.price
    )}</b>`,

    `📦 Closed Lot: <b>${event.lotClosed.toFixed(
      2
    )}</b>`,

    `💵 Result: <b>${result}</b>`,

    event.pnlToman
      ? `🇮🇷 ${formatToman(
          event.pnlToman
        )}`
      : "",

    "",

    advice,
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================
   TELEGRAM SIGNAL SEND
   ========================================================= */

async function sendSignalTelegram(
  meta: RunMeta,
  chartCandles: Candle[],
  rateAsOf: string
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

  const caption =
    buildSignalTelegram(
      meta,
      rateAsOf
    );

  try {
    const chartUrl =
      buildTelegramChartUrl(
        meta,
        chartCandles
      );

    const data =
      await telegramRequest(
        "sendPhoto",
        {
          photo:
            chartUrl,

          caption,

          parse_mode:
            "HTML",

          disable_notification:
            false,
        }
      );

    return String(
      data?.result
        ?.message_id ??
        ""
    );
  } catch {
    /*
      اگر QuickChart یا sendPhoto
      در دسترس نبود، خود سیگنال
      نباید از بین برود.
    */

    const data =
      await telegramRequest(
        "sendMessage",
        {
          text:
            caption,

          parse_mode:
            "HTML",

          disable_web_page_preview:
            true,

          disable_notification:
            false,
        }
      );

    return String(
      data?.result
        ?.message_id ??
        ""
    );
  }
}

/* =========================================================
   TELEGRAM EVENT SEND
   ========================================================= */

async function sendEventTelegram(
  meta: RunMeta,
  event: EventRecord
) {
  const text =
    buildEventTelegram(
      meta,
      event
    );

  const data =
    await telegramRequest(
      "sendMessage",
      {
        text,

        parse_mode:
          "HTML",

        disable_web_page_preview:
          true,

        disable_notification:
          false,
      }
    );

  return String(
    data?.result
      ?.message_id ??
      ""
  );
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
          createdAt:
            "desc",
        },

        take: 1,
      }
    );

  return (
    rows[0] ?? null
  );
}

/* =========================================================
   LAST NO-TRADE
   ========================================================= */

async function recentNoTrade() {
  const row =
    await prisma.analysisRun.findFirst(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          status:
            "AI_NO_TRADE",
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    );

  return row;
}

/* =========================================================
   SCAN ENGINE
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

      id:
        active.id,
    };
  }

  const market =
    getGoldMarketStatus();

  if (!market.open) {
    return {
      created: false,

      reason:
        "market_closed",

      market,
    };
  }

  /*
    جلوگیری از مصرف بیهوده API
    وقتی هنوز شرایط بازار عوض نشده.
  */

  const lastNoTrade =
    await recentNoTrade();

  if (
    lastNoTrade &&
    Date.now() -
      lastNoTrade.createdAt.getTime() <
      NO_TRADE_COOLDOWN_MS
  ) {
    return {
      created: false,

      reason:
        "search_cooldown",

      lastScan:
        lastNoTrade.createdAt,
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
          (x) => ({
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
    MTF data
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
        120
      ),

      candles(
        "5min",
        100
      ),

      candles(
        "15min",
        80
      ),

      candles(
        "1h",
        60
      ),
    ]);

  if (
    m1.length < 50 ||
    m5.length < 50 ||
    m15.length < 50 ||
    h1.length < 50
  ) {
    return {
      created: false,

      reason:
        "insufficient_market_data",
    };
  }

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
      SCORE_TO_SIGNAL
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
            0,

          finishedAt:
            new Date(),

          metadata: {
            kind:
              "AI_SCALP",

            reason:
              "score_below_threshold",

            score:
              analysis.score,

            reasons:
              analysis.reasons,

            support:
              analysis.support,

            resistance:
              analysis.resistance,

            atr:
              analysis.atr,
          },
        },
      }
    );

    return {
      created: false,

      reason:
        "no_trade",

      score:
        analysis.score,

      reasons:
        analysis.reasons,
    };
  }

  /*
    قیمت واقعی
  */

  const quote =
    await latestQuote();

  const entry =
    round(
      quote.price
    );

  if (!entry) {
    return {
      created: false,

      reason:
        "invalid_price",
    };
  }

  const lv =
    levels(
      entry,
      analysis.direction
    );

  /*
    بررسی ساختار برای BUY
    و SELL

    هدف اول باید فضای واقعی
    حداقل 1.5R داشته باشد.
  */

  const structureDistance =
    analysis.direction ===
    "BUY"
      ? entry -
        analysis.support
      : analysis.resistance -
        entry;

  const targetRoom =
    analysis.direction ===
    "BUY"
      ? analysis.resistance -
        entry
      : entry -
        analysis.support;

  /*
    استاپ 4 دلار است.
    اگر ساختار خیلی دور باشد،
    سیگنال را صادر نمی‌کنیم.
  */

  if (
    structureDistance >
    STOP_DISTANCE +
      0.75
  ) {
    return {
      created: false,

      reason:
        "structure_too_far",

      score:
        analysis.score,

      structureDistance:
        round(
          structureDistance
        ),
    };
  }

  /*
    TP1 باید واقعاً فضای حداقل
    6 دلار داشته باشد.
  */

  if (
    targetRoom <
    TP1_DISTANCE +
      0.50
  ) {
    return {
      created: false,

      reason:
        "tp1_space_not_clear",

      score:
        analysis.score,

      targetRoom:
        round(
          targetRoom
        ),
    };
  }

  /*
    کنترل RR
  */

  if (
    TP1_RR <
    1.5 ||
    TP2_RR <
    2 ||
    TP3_RR <
    3
  ) {
    return {
      created: false,

      reason:
        "invalid_risk_reward",
    };
  }

  const fx =
    await getUsdToTomanRate();

  const now =
    new Date();

  const session =
    currentSession(
      now
    );

  const confirmations =
    Math.max(
      5,
      Math.round(
        analysis.score /
          15
      )
    );

  const meta: RunMeta =
    {
      kind:
        "AI_SCALP",

      userId,

      symbol:
        DISPLAY_SYMBOL,

      direction:
        analysis.direction,

      entry,

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

      tp1RR:
        TP1_RR,

      tp2RR:
        TP2_RR,

      tp3RR:
        TP3_RR,

      usdToToman:
        fx?.rate ??
        0,

      riskToman:
        fx
          ? toman(
              STOP_USD *
                fx.rate
            )
          : 0,

      tp1Toman:
        fx
          ? toman(
              TP1_USD *
                fx.rate
            )
          : 0,

      tp2Toman:
        fx
          ? toman(
              TP2_USD *
                fx.rate
            )
          : 0,

      tp3Toman:
        fx
          ? toman(
              TP3_USD *
                fx.rate
            )
          : 0,

      totalPotentialToman:
        fx
          ? toman(
              TOTAL_POTENTIAL_USD *
                fx.rate
            )
          : 0,

      session,

      score:
        analysis.score,

      confirmations,

      timeframe:
        "5m + 15m + 1H + 1m",

      state:
        "AI_PENDING",

      breakeven:
        false,

      currentPrice:
        entry,

      priceUpdatedAt:
        now.toISOString(),

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

        t5:
          analysis.t5,

        t15:
          analysis.t15,

        t60:
          analysis.t60,

        structureDistance:
          round(
            structureDistance
          ),

        targetRoom:
          round(
            targetRoom
          ),

        riskDistance:
          STOP_DISTANCE,

        contractSize:
          CONTRACT_SIZE,

        fxAsOf:
          fx?.asOf ??
          null,
      },

      createdAt:
        now.toISOString(),

      lastUpdate:
        now.toISOString(),
    };

  /*
    ثبت دائمی سیگنال
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
            confirmations,

          finishedAt:
            null,

          metadata:
            meta as any,
        },
      }
    );

  /*
    Telegram فقط یک بار هنگام
    صدور سیگنال
  */

  try {
    const messageId =
      await sendSignalTelegram(
        meta,
        m1,
        fx?.asOf ??
          ""
      );

    meta.telegramMessageId =
      messageId;

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
  } catch (e) {
    meta.telegramError =
      e instanceof Error
        ? e.message
        : String(e);

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
   MONITOR ACTIVE SIGNAL
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

  /*
    قیمت جدید
  */

  const quote =
    await latestQuote();

  const price =
    round(
      quote.price
    );

  const now =
    new Date();

  meta.currentPrice =
    price;

  meta.priceUpdatedAt =
    now.toISOString();

  meta.lastUpdate =
    now.toISOString();

  /*
    نرخ دلار اختیاری است.
    خرابی NetArz نباید مانیتور
    SL/TP را متوقف کند.
  */

  const fx =
    await getUsdToTomanRate();

  const rate =
    fx?.rate ??
    meta.usdToToman ??
    0;

  /*
    جلوگیری از ثبت تکراری
  */

  const hasEvent =
    (
      type: EventType
    ) =>
      meta.events.some(
        (e) =>
          e.type === type
      );

  const push =
    async (
      type: EventType,
      priceAtHit: number
    ) => {
      if (
        hasEvent(type)
      ) {
        return null;
      }

      const base =
        eventPnl(type);

      const event: EventRecord =
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
            rate
              ? toman(
                  base.pnlUsd *
                    rate
                )
              : 0,

          usdToToman:
            rate,
        };

      meta.events.push(
        event
      );

      /*
        وضعیت مرحله
      */

      if (
        type === "TP1"
      ) {
        meta.state =
          "AI_TP1";

        meta.breakeven =
          true;
      }

      if (
        type === "TP2"
      ) {
        meta.state =
          "AI_TP2";

        meta.breakeven =
          true;
      }

      /*
        TP3 پایان کامل معامله است.
      */

      if (
        type === "TP3"
      ) {
        meta.state =
          "AI_COMPLETED";
      }

      /*
        SL پایان کامل معامله است.
      */

      if (
        type === "SL"
      ) {
        meta.state =
          "AI_SL";
      }

      /*
        BE پایان معامله بخش باقی‌مانده
        و پایان سیگنال است.
      */

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
        Telegram event
        فقط یک بار
      */

      try {
        await sendEventTelegram(
          meta,
          event
        );
      } catch (e) {
        meta.telegramError =
          e instanceof Error
            ? e.message
            : String(e);
      }

      const terminal =
        type === "SL" ||
        type ===
          "BREAKEVEN" ||
        type === "TP3";

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
              terminal
                ? new Date()
                : null,
          },
        }
      );

      return event;
    };

  /*
    =======================================================
    مهم:
    اگر قیمت در یک جهش از Entry
    مستقیم از TP1 و TP2 و TP3 عبور کند،
    همه مراحل در همان مانیتور ثبت می‌شوند.
    =======================================================
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
    const event =
      await push(
        "SL",
        price
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
  }

  if (
    meta.state ===
      "AI_PENDING" &&
    hit(
      meta.direction,
      price,
      meta.tp1
    )
  ) {
    await push(
      "TP1",
      price
    );
  }

  /*
    بعد از TP1:
    اگر قیمت به Entry برگشت
    → BE
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
    const event =
      await push(
        "BREAKEVEN",
        price
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
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
    await push(
      "TP2",
      price
    );
  }

  /*
    بعد از TP2:
    BE
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
    const event =
      await push(
        "BREAKEVEN",
        price
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
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
    const event =
      await push(
        "TP3",
        price
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
  }

  /*
    بعد از تغییر state به TP3
    یا COMPLETED، دیگر active نیست.
  */

  return {
    price,

    state:
      meta.state,

    event:
      null,
  };
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function eventTotals(
  rows: any[]
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
      row.metadata as
        | RunMeta
        | null;

    if (
      !meta?.events
    ) {
      continue;
    }

    out.trades++;

    let final:
      | EventType
      | null =
      null;

    for (
      const e of meta.events
    ) {
      if (
        e.type ===
        "TP1"
      ) {
        out.tp1++;

        out.tp1Toman +=
          e.pnlToman;
      }

      if (
        e.type ===
        "TP2"
      ) {
        out.tp2++;

        out.tp2Toman +=
          e.pnlToman;
      }

      if (
        e.type ===
        "TP3"
      ) {
        out.tp3++;

        out.tp3Toman +=
          e.pnlToman;
      }

      if (
        e.type ===
        "SL"
      ) {
        out.sl++;

        out.slToman +=
          e.pnlToman;
      }

      if (
        e.type ===
          "TP1" ||
        e.type ===
          "TP2" ||
        e.type ===
          "TP3" ||
        e.type ===
          "SL" ||
        e.type ===
          "BREAKEVEN"
      ) {
        final =
          e.type;
      }

      if (
        e.type !==
        "BREAKEVEN"
      ) {
        out.pnlUsd +=
          e.pnlUsd;

        out.pnlToman +=
          e.pnlToman;
      }
    }

    if (
      final === "TP3"
    ) {
      out.wins++;
    }

    if (
      final ===
      "BREAKEVEN"
    ) {
      out.wins++;

      out.breakeven++;
    }

    if (
      final === "SL"
    ) {
      out.losses++;
    }
  }

  return {
    ...out,

    tp1Toman:
      Math.round(
        out.tp1Toman
      ),

    tp2Toman:
      Math.round(
        out.tp2Toman
      ),

    tp3Toman:
      Math.round(
        out.tp3Toman
      ),

    slToman:
      Math.round(
        out.slToman
      ),

    pnlUsd:
      money(
        out.pnlUsd
      ),

    pnlToman:
      Math.round(
        out.pnlToman
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

          take: 20,
        }
      ),
    ]);

  return {
    day:
      eventTotals(
        day
      ),

    week:
      eventTotals(
        week
      ),

    month:
      eventTotals(
        month
      ),

    recent:
      recent.map(
        (r) => ({
          id:
            r.id,

          createdAt:
            r.createdAt,

          status:
            r.status,

          metadata:
            r.metadata,
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
      (r) =>
        (r.metadata as any)
          ?.key === key
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
      (r) => {
        const m =
          r.metadata as any;

        if (
          m?.session !==
            name ||
          m?.kind !==
            "AI_SCALP"
        ) {
          return false;
        }

        const created =
          new Date(
            m?.createdAt ??
              r.createdAt
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
    eventTotals(
      rows
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

  const winLike =
    totals.tp1 +
    totals.tp2 +
    totals.tp3;

  const loss =
    totals.sl;

  const msg =
    [
      "🤖 <b>کارنامه پایان سشن — AI GOLD ENGINE</b>",

      `🟡 XAUUSD | <b>${name}</b>`,

      `📅 ${key}`,

      "",

      `📊 معاملات: <b>${totals.trades}</b>`,

      `🎯 TP1: <b>${totals.tp1}</b>`,

      `🎯 TP2: <b>${totals.tp2}</b>`,

      `🏆 TP3: <b>${totals.tp3}</b>`,

      `🛑 SL: <b>${loss}</b>`,

      "",

      `📈 رویدادهای مثبت: <b>${winLike}</b>`,

      `💰 خالص: <b>${
        totals.pnlUsd >= 0
          ? "+"
          : ""
      }${formatUsd(
        totals.pnlUsd
      )}</b>`,

      fx
        ? `💱 دلار: <b>${new Intl.NumberFormat(
            "fa-IR"
          ).format(
            fx.rate
          )} تومان</b>`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  let telegramMessageId =
    "";

  try {
    telegramMessageId =
      await sendEventTelegram(
        {
          kind:
            "AI_SCALP",

          symbol:
            DISPLAY_SYMBOL,

          direction:
            "BUY",

          entry: 0,

          stopLoss: 0,

          tp1: 0,

          tp2: 0,

          tp3: 0,

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

          tp1RR:
            TP1_RR,

          tp2RR:
            TP2_RR,

          tp3RR:
            TP3_RR,

          usdToToman:
            fx?.rate ??
            0,

          riskToman:
            0,

          tp1Toman:
            0,

          tp2Toman:
            0,

          tp3Toman:
            0,

          totalPotentialToman:
            0,

          session:
            name,

          score:
            0,

          confirmations:
            0,

          timeframe:
            "SESSION",

          state:
            "AI_COMPLETED",

          breakeven:
            false,

          currentPrice:
            0,

          priceUpdatedAt:
            now.toISOString(),

          events: [],

          analysis: {},

          createdAt:
            now.toISOString(),

          lastUpdate:
            now.toISOString(),
        },
        {
          type:
            "BREAKEVEN",

          at:
            now.toISOString(),

          price:
            totals.pnlUsd,

          lotClosed:
            0,

          pnlUsd:
            totals.pnlUsd,

          pnlToman:
            totals.pnlToman,

          usdToToman:
            fx?.rate ??
            0,
        }
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

        metadata: {
          kind:
            "SESSION_REPORT",

          key,

          session:
            name,

          totals,

          usdToToman:
            fx?.rate ??
            0,

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
   ENGINE CYCLE
   ========================================================= */

async function engineCycle(
  userId?: string
) {
  const market =
    getGoldMarketStatus();

  /*
    اگر بازار بسته است:
    هیچ سیگنال جدیدی صادر نمی‌کنیم.
  */

  if (!market.open) {
    return {
      mode:
        "MARKET_CLOSED",

      market,

      monitored:
        null,

      scan:
        null,
    };
  }

  const active =
    await activeRun();

  /*
    اگر معامله فعال است:
    فقط قیمت را مانیتور کن.
  */

  if (active) {
    const monitored =
      await monitorOne(
        active
      );

    return {
      mode:
        "MONITORING",

      market,

      monitored,

      scan:
        null,
    };
  }

  /*
    اگر معامله‌ای فعال نیست:
    جستجوی سیگنال جدید.
  */

  const scanResult =
    await scan(
      userId
    );

  return {
    mode:
      scanResult.reason ===
      "no_trade"
        ? "SEARCHING"
        : scanResult.created
          ? "SIGNAL_CREATED"
          : "SEARCHING",

    market,

    monitored:
      null,

    scan:
      scanResult,
  };
}

/* =========================================================
   LOCK
   ========================================================= */

async function runWithEngineLock<T>(
  fn: () => Promise<T>
) {
  if (engineLock) {
    return {
      skipped: true,
    } as T;
  }

  const promise =
    fn();

  engineLock =
    promise;

  try {
    return await promise;
  } finally {
    engineLock =
      null;
  }
}

/* =========================================================
   MARKET DATA FOR DASHBOARD
   ========================================================= */

function normalizeTimeframe(
  value: string | null
) {
  const allowed =
    new Set([
      "1min",
      "5min",
      "15min",
      "30min",
      "1h",
      "4h",
    ]);

  if (
    value &&
    allowed.has(
      value
    )
  ) {
    return value;
  }

  return "1min";
}

async function dashboardMarket(
  timeframe: string,
  active: any
) {
  const market =
    getGoldMarketStatus();

  let chartCandles:
    Candle[] = [];

  let currentPrice =
    0;

  let quoteTimestamp =
    0;

  /*
    اگر بازار باز است،
    قیمت لحظه‌ای بخوان.
  */

  if (market.open) {
    try {
      const quote =
        await latestQuote();

      currentPrice =
        round(
          quote.price
        );

      quoteTimestamp =
        quote.timestamp;
    } catch {
      currentPrice =
        num(
          active?.metadata
            ?.currentPrice
        );
    }
  } else {
    currentPrice =
      num(
        active?.metadata
          ?.currentPrice
      );
  }

  /*
    کندل واقعی برای چارت
  */

  try {
    chartCandles =
      await candles(
        timeframe,
        100
      );
  } catch {
    chartCandles =
      [];
  }

  return {
    market,

    currentPrice,

    quoteTimestamp,

    timeframe,

    candles:
      chartCandles,
  };
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard(
  userId: string,
  timeframe: string
) {
  const activeBefore =
    await activeRun();

  /*
    موتور در هر refresh صفحه
    یک بار اجرا می‌شود.

    اگر active باشد:
      monitor

    اگر active نباشد:
      scan
  */

  let engine:
    | any
    | null =
    null;

  try {
    engine =
      await runWithEngineLock(
        () =>
          engineCycle(
            userId
          )
      );
  } catch (e) {
    engine = {
      mode:
        "ENGINE_ERROR",

      error:
        e instanceof Error
          ? e.message
          : String(e),
    };
  }

  /*
    بعد از engine دوباره active را
    از DB می‌خوانیم تا آخرین state
    روی صفحه باشد.
  */

  const active =
    await activeRun();

  const [
    perf,
    fx,
    latest,
  ] =
    await Promise.all([
      performance(),

      getUsdToTomanRate(),

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
    ]);

  const market =
    await dashboardMarket(
      timeframe,
      active ??
        activeBefore
    );

  /*
    latest فقط برای تاریخچه است.
    UI نباید آن را به عنوان active
    نمایش دهد.
  */

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

      stopDistance:
        STOP_DISTANCE,

      tp1Distance:
        TP1_DISTANCE,

      tp2Distance:
        TP2_DISTANCE,

      tp3Distance:
        TP3_DISTANCE,

      tp1RR:
        TP1_RR,

      tp2RR:
        TP2_RR,

      tp3RR:
        TP3_RR,

      totalPotentialUsd:
        TOTAL_POTENTIAL_USD,
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

    /*
      latest فقط برای history
    */

    latest: latest
      ? {
          id:
            latest.id,

          status:
            latest.status,

          metadata:
            latest.metadata,
        }
      : null,

    performance:
      perf,

    usdToToman:
      fx,

    market,

    engine,

    chart: {
      timeframe:
        market.timeframe,

      candles:
        market.candles,

      currentPrice:
        market.currentPrice,

      quoteTimestamp:
        market.quoteTimestamp,
    },

    settings: {
      scoreToSignal:
        SCORE_TO_SIGNAL,

      minimumRR:
        TP1_RR,

      monitoring:
        true,

      telegram:
        Boolean(
          process.env
            .TELEGRAM_BOT_TOKEN &&
            process.env
              .TELEGRAM_SIGNAL_CHAT_ID
        ),

      marketData:
        Boolean(
          TD_KEY
        ),
    },

    sessions:
      SESSIONS,

    userId,
  };
}

/* =========================================================
   SESSION REPORT CYCLE
   ========================================================= */

async function cronCycle() {
  const monitored:
    unknown[] =
    [];

  const market =
    getGoldMarketStatus();

  /*
    اگر بازار بسته است،
    فقط وضعیت بازار را گزارش کن.
  */

  if (!market.open) {
    return {
      monitored,

      reports: {},

      market,
    };
  }

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
    const name of Object.keys(
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

    market,
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
      CRON
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
            status:
              401,
          }
        );
      }

      const result =
        await runWithEngineLock(
          () =>
            cronCycle()
        );

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
          status:
            401,
        }
      );
    }

    const timeframe =
      normalizeTimeframe(
        url.searchParams.get(
          "timeframe"
        )
      );

    const data =
      await dashboard(
        session.userId,
        timeframe
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
  } catch (e) {
    console.error(
      "[AI_ANALYSIS_GET_ERROR]",
      e
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          e instanceof Error
            ? e.message
            : "خطای داخلی موتور تحلیل",
      },
      {
        status:
          500,
      }
    );
  }
}
