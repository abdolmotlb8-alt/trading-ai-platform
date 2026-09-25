import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   AI GOLD ENGINE
   XAUUSD
   ========================================================= */

const DISPLAY_SYMBOL = "XAUUSD";
const TD_SYMBOL = "XAU/USD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.10;
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_DISTANCE = 4;
const TP1_DISTANCE = 6;
const TP2_DISTANCE = 10;
const TP3_DISTANCE = 14;

const STOP_USD =
  TOTAL_LOT *
  CONTRACT_SIZE *
  STOP_DISTANCE;

const TP1_USD =
  TP1_LOT *
  CONTRACT_SIZE *
  TP1_DISTANCE;

const TP2_USD =
  TP2_LOT *
  CONTRACT_SIZE *
  TP2_DISTANCE;

const TP3_USD =
  TP3_LOT *
  CONTRACT_SIZE *
  TP3_DISTANCE;

const TOTAL_POTENTIAL_USD =
  TP1_USD +
  TP2_USD +
  TP3_USD;

const TP1_RR =
  TP1_DISTANCE /
  STOP_DISTANCE;

const TP2_RR =
  TP2_DISTANCE /
  STOP_DISTANCE;

const TP3_RR =
  TP3_DISTANCE /
  STOP_DISTANCE;

const SIGNAL_SCORE = 85;

const NO_TRADE_COOLDOWN_MS = 30_000;

const NEWS_BLOCK_MINUTES = 30;

const TD_KEY =
  process.env.TWELVE_DATA_API_KEY;

const TELEGRAM_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_SIGNAL_CHAT_ID;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

const NETARZ_KEY =
  process.env.NETARZ_API_KEY ||
  process.env.NETARZ_FX_KEY;

/*
  جلوگیری از اجرای همزمان موتور
  در یک instance از Render.
*/
let engineLock: Promise<unknown> | null =
  null;

/* =========================================================
   TYPES
   ========================================================= */

type Direction =
  | "BUY"
  | "SELL";

type EventType =
  | "TP1"
  | "TP2"
  | "TP3"
  | "SL"
  | "BREAKEVEN";

type RunState =
  | "AI_PENDING"
  | "AI_TP1"
  | "AI_TP2"
  | "AI_BE"
  | "AI_SL"
  | "AI_COMPLETED";

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

type EventRecord = {
  type: EventType;
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

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function n(value: unknown): number {
  const result =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

function round(
  value: number,
  digits = 2
): number {
  const factor =
    10 ** digits;

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

function formatUsd(
  value: number
): string {
  const sign =
    value >= 0
      ? "+"
      : "-";

  return (
    sign +
    "$" +
    new Intl.NumberFormat(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(
      Math.abs(value)
    )
  );
}

function formatPrice(
  value: number
): string {
  return Number(value || 0)
    .toFixed(2);
}

function formatToman(
  value: number
): string {
  if (!value) {
    return "—";
  }

  return (
    new Intl.NumberFormat(
      "fa-IR"
    ).format(
      Math.round(value)
    ) +
    " تومان"
  );
}

/* =========================================================
   SESSION
   ========================================================= */

function currentSession(
  date = new Date()
): SessionName {
  const hour =
    date.getUTCHours();

  if (
    hour >= 13 &&
    hour < 22
  ) {
    return "New York";
  }

  if (
    hour >= 7 &&
    hour < 16
  ) {
    return "London";
  }

  if (
    hour >= 0 &&
    hour < 9
  ) {
    return "Tokyo";
  }

  return "Sydney";
}

/* =========================================================
   MARKET STATUS
   ========================================================= */

function getNewYorkParts(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/New_York",
        hour12: false,
        hourCycle: "h23",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).formatToParts(date);

  const get =
    (type: string) =>
      parts.find(
        (item) =>
          item.type === type
      )?.value ?? "";

  return {
    weekday:
      get("weekday"),

    hour:
      Number(
        get("hour")
      ),

    minute:
      Number(
        get("minute")
      ),
  };
}

/*
  برنامه محافظه‌کارانه بازار طلا:

  Sunday 18:05 NY
  تا
  Friday 17:00 NY

  وقفه روزانه:
  17:00 تا 18:05 NY

  ساعات بروکرها ممکن است کمی متفاوت باشد.
*/

function getMarketStatus(
  date = new Date()
) {
  const p =
    getNewYorkParts(date);

  const minute =
    p.hour * 60 +
    p.minute;

  const openMinute =
    18 * 60 + 5;

  const closeMinute =
    17 * 60;

  if (
    p.weekday === "Sat"
  ) {
    return {
      open: false,
      label:
        "بازار بسته است",
      reason:
        "تعطیلی پایان هفته",
      timezone:
        "America/New_York",
    };
  }

  if (
    p.weekday === "Sun" &&
    minute < openMinute
  ) {
    return {
      open: false,
      label:
        "بازار بسته است",
      reason:
        "بازار طلا یکشنبه ساعت 18:05 نیویورک باز می‌شود",
      timezone:
        "America/New_York",
    };
  }

  if (
    p.weekday === "Fri" &&
    minute >= closeMinute
  ) {
    return {
      open: false,
      label:
        "بازار بسته است",
      reason:
        "بازار برای پایان هفته بسته شده است",
      timezone:
        "America/New_York",
    };
  }

  if (
    p.weekday !== "Sun" &&
    minute >= closeMinute &&
    minute < openMinute
  ) {
    return {
      open: false,
      label:
        "بازار بسته است",
      reason:
        "وقفه روزانه بازار طلا",
      timezone:
        "America/New_York",
    };
  }

  return {
    open: true,
    label:
      "بازار باز است",
    reason:
      "بازار در ساعت معاملاتی قرار دارد",
    timezone:
      "America/New_York",
  };
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(
  endpoint: string
) {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است."
    );
  }

  const separator =
    endpoint.includes("?")
      ? "&"
      : "?";

  const url =
    endpoint +
    separator +
    "apikey=" +
    encodeURIComponent(
      TD_KEY
    );

  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      }
    );

  let data: any = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (
    !response.ok ||
    data?.status ===
      "error" ||
    data?.code
  ) {
    throw new Error(
      data?.message ||
        `Twelve Data HTTP ${response.status}`
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
  const data =
    await twelveData(
      "https://api.twelvedata.com/time_series" +
        "?symbol=" +
        encodeURIComponent(
          TD_SYMBOL
        ) +
        "&interval=" +
        encodeURIComponent(
          interval
        ) +
        "&outputsize=" +
        String(
          outputsize
        ) +
        "&order=ASC" +
        "&timezone=UTC"
    );

  if (
    !Array.isArray(
      data?.values
    )
  ) {
    return [];
  }

  return data.values
    .map(
      (row: any) => ({
        datetime:
          String(
            row.datetime
          ),

        open:
          n(row.open),

        high:
          n(row.high),

        low:
          n(row.low),

        close:
          n(row.close),

        volume:
          n(row.volume),
      })
    )
    .filter(
      (row: Candle) =>
        row.close > 0 &&
        row.high > 0 &&
        row.low > 0
    )
    .sort(
      (a, b) =>
        a.datetime.localeCompare(
          b.datetime
        )
    );
}

/* =========================================================
   LIVE PRICE
   ========================================================= */

async function getLivePrice() {
  const data =
    await twelveData(
      "https://api.twelvedata.com/quote" +
        "?symbol=" +
        encodeURIComponent(
          TD_SYMBOL
        ) +
        "&interval=1min" +
        "&timezone=UTC"
    );

  const price =
    n(
      data?.close ??
        data?.price
    );

  if (!price) {
    throw new Error(
      "قیمت لحظه‌ای XAU/USD دریافت نشد."
    );
  }

  return {
    price:
      round(price),

    timestamp:
      n(
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
   INDICATORS
   ========================================================= */

function sma(
  values: number[],
  period: number
): number {
  if (!values.length) {
    return 0;
  }

  const usable =
    values.length >= period
      ? values.slice(
          -period
        )
      : values;

  return (
    usable.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / usable.length
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
    2 /
    (period + 1);

  let result =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result =
      values[i] *
        multiplier +
      result *
        (1 -
          multiplier);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14
): number {
  if (
    values.length <=
    period
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
    const change =
      values[i] -
      values[i - 1];

    if (
      change >= 0
    ) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  gains /=
    period;

  losses /=
    period;

  for (
    let i =
      period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    const gain =
      Math.max(
        change,
        0
      );

    const loss =
      Math.max(
        -change,
        0
      );

    gains =
      (gains *
        (period - 1) +
        gain) /
      period;

    losses =
      (losses *
        (period - 1) +
        loss) /
      period;
  }

  if (
    losses === 0
  ) {
    return 100;
  }

  const rs =
    gains / losses;

  return (
    100 -
    100 /
      (1 + rs)
  );
}

function atr(
  candles: Candle[],
  period = 14
): number {
  if (
    candles.length <
    period + 1
  ) {
    return 0;
  }

  const ranges: number[] =
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

function macd(
  values: number[]
): number {
  return (
    ema(values, 12) -
    ema(values, 26)
  );
}

function getStructure(
  candles: Candle[],
  lookback = 30
) {
  const rows =
    candles.slice(
      -lookback
    );

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

/* =========================================================
   TIMEFRAME TREND
   ========================================================= */

function timeframeTrend(
  candles: Candle[]
) {
  const closes =
    candles.map(
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

  if (
    ema20 > ema50 &&
    r >= 52 &&
    r <= 72 &&
    m > 0
  ) {
    return {
      direction:
        "BUY" as Direction,

      ema20,

      ema50,

      rsi: r,

      macd: m,
    };
  }

  if (
    ema20 < ema50 &&
    r <= 48 &&
    r >= 28 &&
    m < 0
  ) {
    return {
      direction:
        "SELL" as Direction,

      ema20,

      ema50,

      rsi: r,

      macd: m,
    };
  }

  return {
    direction:
      null,

    ema20,

    ema50,

    rsi: r,

    macd: m,
  };
}

/* =========================================================
   CANDLE CONFIRMATION
   ========================================================= */

function candleDirection(
  candles: Candle[]
): number {
  const previous =
    candles.at(-2);

  const current =
    candles.at(-1);

  if (
    !previous ||
    !current
  ) {
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

  if (
    current.close >
      current.open &&
    (
      body / range >=
        0.55 ||
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
      body / range >=
        0.55 ||
      current.close <
        previous.low
    )
  ) {
    return -1;
  }

  return 0;
}

/* =========================================================
   ANALYSIS
   ========================================================= */

function analyze(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[]
) {
  const t1 =
    timeframeTrend(m1);

  const t5 =
    timeframeTrend(m5);

  const t15 =
    timeframeTrend(m15);

  const t60 =
    timeframeTrend(h1);

  const directions =
    [
      t5.direction,
      t15.direction,
      t60.direction,
    ].filter(
      (
        value
      ): value is Direction =>
        Boolean(value)
    );

  const buys =
    directions.filter(
      (x) =>
        x === "BUY"
    ).length;

  const sells =
    directions.filter(
      (x) =>
        x === "SELL"
    ).length;

  let direction:
    | Direction
    | null =
    null;

  if (
    buys >= 2
  ) {
    direction =
      "BUY";
  } else if (
    sells >= 2
  ) {
    direction =
      "SELL";
  }

  let score = 0;

  const reasons: string[] =
    [];

  if (direction) {
    score += 25;

    reasons.push(
      `روند چندتایم‌فریم ${direction}`
    );
  }

  if (
    direction &&
    t1.direction ===
      direction
  ) {
    score += 10;

    reasons.push(
      "تایید تایم‌فریم 1 دقیقه"
    );
  }

  if (
    direction &&
    t15.direction ===
      direction &&
    t60.direction ===
      direction
  ) {
    score += 15;

    reasons.push(
      "تایید 15 دقیقه و 1 ساعت"
    );
  }

  const structure =
    getStructure(
      m5,
      30
    );

  const price =
    m5.at(-1)?.close ??
    0;

  const atrValue =
    atr(m5);

  const nearSupport =
    direction ===
      "BUY" &&
    price >
      structure.support &&
    price -
      structure.support <=
      Math.max(
        atrValue * 1.5,
        6
      );

  const nearResistance =
    direction ===
      "SELL" &&
    structure.resistance >
      price &&
    structure.resistance -
      price <=
      Math.max(
        atrValue * 1.5,
        6
      );

  if (
    nearSupport ||
    nearResistance
  ) {
    score += 10;

    reasons.push(
      "قیمت نزدیک ناحیه ساختاری است"
    );
  }

  const candle =
    candleDirection(
      m5
    );

  if (
    (
      direction ===
        "BUY" &&
      candle > 0
    ) ||
    (
      direction ===
        "SELL" &&
      candle < 0
    )
  ) {
    score += 10;

    reasons.push(
      "تایید کندلی"
    );
  }

  const r =
    t5.rsi;

  if (
    direction ===
      "BUY" &&
    r >= 52 &&
    r <= 68
  ) {
    score += 10;

    reasons.push(
      "مومنتوم خرید"
    );
  }

  if (
    direction ===
      "SELL" &&
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
        direction ===
          "BUY" &&
        price >
          t5.ema20
      ) ||
      (
        direction ===
          "SELL" &&
        price <
          t5.ema20
      )
    )
  ) {
    score += 10;

    reasons.push(
      "موقعیت مناسب نسبت به EMA20"
    );
  }

  const volume =
    m5.at(-1)?.volume ??
    0;

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
    volume > 0 &&
    averageVolume > 0 &&
    volume >=
      averageVolume *
        1.05
  ) {
    score += 5;

    reasons.push(
      "حجم بالاتر از میانگین"
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
      structure.support,

    resistance:
      structure.resistance,

    atr:
      atrValue,

    t1,
    t5,
    t15,
    t60,
  };
}

/* =========================================================
   NEWS FILTER
   ========================================================= */

async function isNewsBlocked() {
  try {
    const now =
      new Date();

    const until =
      new Date(
        now.getTime() +
          NEWS_BLOCK_MINUTES *
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
  } catch {
    /*
      خراب بودن جدول اخبار نباید
      موتور اصلی معامله را نابود کند.
    */
    return [];
  }
}

/* =========================================================
   USD / TOMAN
   ========================================================= */

async function getUsdToToman() {
  if (!NETARZ_KEY) {
    return null;
  }

  try {
    const response =
      await fetch(
        "https://netarz.ir/api/fx/v1/rates/USD",
        {
          headers: {
            Authorization:
              `Bearer ${NETARZ_KEY}`,
          },

          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const data =
      await response.json();

    const rate =
      n(
        data?.data?.sell ??
          data?.data?.mid ??
          data?.sell ??
          data?.mid
      );

    if (!rate) {
      return null;
    }

    return {
      rate:
        Math.round(rate),

      asOf:
        new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/* =========================================================
   LEVELS
   ========================================================= */

function createLevels(
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

function targetHit(
  direction: Direction,
  price: number,
  target: number
) {
  return direction ===
    "BUY"
    ? price >= target
    : price <= target;
}

function levelHit(
  direction: Direction,
  price: number,
  level: number
) {
  return direction ===
    "BUY"
    ? price <= level
    : price >= level;
}

/* =========================================================
   ACTIVE RUN
   ========================================================= */

async function getActiveRun() {
  const run =
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

          signalGenerated:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    );

  return run ?? null;
}

/* =========================================================
   RECENT NO TRADE
   ========================================================= */

async function getRecentNoTrade() {
  return prisma.analysisRun.findFirst(
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
}

/* =========================================================
   TELEGRAM REQUEST
   ========================================================= */

async function telegram(
  method: string,
  body: Record<string, unknown>
) {
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
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`,
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
              TELEGRAM_CHAT_ID,

            ...body,
          }),

        cache:
          "no-store",
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

function createChartUrl(
  meta: RunMeta,
  candles: Candle[]
) {
  const rows =
    candles.slice(
      -50
    );

  const labels =
    rows.map(
      (x) =>
        x.datetime.slice(
          -5
        )
    );

  const close =
    rows.map(
      (x) =>
        round(x.close)
    );

  const entry =
    rows.map(
      () =>
        meta.entry
    );

  const sl =
    rows.map(
      () =>
        meta.stopLoss
    );

  const tp1 =
    rows.map(
      () =>
        meta.tp1
    );

  const tp2 =
    rows.map(
      () =>
        meta.tp2
    );

  const tp3 =
    rows.map(
      () =>
        meta.tp3
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
            close,

          borderColor:
            "#d4af37",

          backgroundColor:
            "rgba(212,175,55,0.12)",

          borderWidth: 2,

          pointRadius: 0,

          tension: 0.2,

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
            [6, 6],
        },

        {
          label:
            "SL",

          data:
            sl,

          borderColor:
            "#ef4444",

          borderWidth: 2,

          pointRadius: 0,
        },

        {
          label:
            "TP1",

          data:
            tp1,

          borderColor:
            "#22c55e",

          borderWidth: 1,

          pointRadius: 0,
        },

        {
          label:
            "TP2",

          data:
            tp2,

          borderColor:
            "#16a34a",

          borderWidth: 1,

          pointRadius: 0,
        },

        {
          label:
            "TP3",

          data:
            tp3,

          borderColor:
            "#15803d",

          borderWidth: 2,

          pointRadius: 0,
        },
      ],
    },

    options: {
      plugins: {
        legend: {
          display:
            true,

          labels: {
            color:
              "#ffffff",
          },
        },

        title: {
          display:
            true,

          text:
            `XAUUSD ${meta.direction} | Score ${meta.score}/100`,

          color:
            "#d4af37",

          font: {
            size: 18,
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color:
              "#9ca3af",
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
    "?width=1000" +
    "&height=560" +
    "&format=png" +
    "&c=" +
    encodeURIComponent(
      JSON.stringify(
        config
      )
    )
  );
}

/* =========================================================
   TELEGRAM SIGNAL
   ========================================================= */

function signalMessage(
  meta: RunMeta
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
    `🕐 TF: <b>${meta.timeframe}</b>`,
    "",
    `🎯 Entry: <b>${formatPrice(
      meta.entry
    )}</b>`,
    `🛑 SL: <b>${formatPrice(
      meta.stopLoss
    )}</b>`,
    `💰 Risk: <b>${formatUsd(
      -meta.riskUsd
    )}</b>`,
    "",
    `🎯 TP1: <b>${formatPrice(
      meta.tp1
    )}</b> | ${meta.tp1Lot.toFixed(
      2
    )} lot | ${formatUsd(
      meta.tp1Usd
    )} | RR ${meta.tp1RR.toFixed(
      2
    )}`,
    `🎯 TP2: <b>${formatPrice(
      meta.tp2
    )}</b> | ${meta.tp2Lot.toFixed(
      2
    )} lot | ${formatUsd(
      meta.tp2Usd
    )} | RR ${meta.tp2RR.toFixed(
      2
    )}`,
    `🏆 TP3: <b>${formatPrice(
      meta.tp3
    )}</b> | ${meta.tp3Lot.toFixed(
      2
    )} lot | ${formatUsd(
      meta.tp3Usd
    )} | RR ${meta.tp3RR.toFixed(
      2
    )}`,
    "",
    `📦 Total Lot: <b>${meta.totalLot.toFixed(
      2
    )}</b>`,
    `💰 Full Potential: <b>${formatUsd(
      meta.totalPotentialUsd
    )}</b>`,
    meta.usdToToman
      ? `💱 USD: <b>${new Intl.NumberFormat(
          "fa-IR"
        ).format(
          meta.usdToToman
        )} تومان</b>`
      : "",
    "",
    "⚠️ این سیگنال تحلیل بازار است و تضمین سود نیست.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendSignal(
  meta: RunMeta,
  candles: Candle[]
) {
  const caption =
    signalMessage(
      meta
    );

  try {
    const chartUrl =
      createChartUrl(
        meta,
        candles
      );

    const result =
      await telegram(
        "sendPhoto",
        {
          photo:
            chartUrl,

          caption,

          parse_mode:
            "HTML",
        }
      );

    return String(
      result?.result
        ?.message_id ??
        ""
    );
  } catch {
    const result =
      await telegram(
        "sendMessage",
        {
          text:
            caption,

          parse_mode:
            "HTML",

          disable_web_page_preview:
            true,
        }
      );

    return String(
      result?.result
        ?.message_id ??
        ""
    );
  }
}

/* =========================================================
   TELEGRAM EVENT
   ========================================================= */

function eventMessage(
  meta: RunMeta,
  event: EventRecord
) {
  let title =
    "🤖 AI GOLD ENGINE";

  let description =
    "";

  if (
    event.type ===
    "TP1"
  ) {
    title =
      "🎯 TP1 HIT";

    description =
      "TP1 ثبت شد و بخش اول معامله بسته شد.";
  }

  if (
    event.type ===
    "TP2"
  ) {
    title =
      "🎯 TP2 HIT";

    description =
      "TP2 ثبت شد و بخش دوم معامله بسته شد.";
  }

  if (
    event.type ===
    "TP3"
  ) {
    title =
      "🏆 TP3 HIT";

    description =
      "تمام اهداف معامله تکمیل شد.";
  }

  if (
    event.type ===
    "SL"
  ) {
    title =
      "🛑 STOP LOSS HIT";

    description =
      "حد ضرر لمس شد و معامله بسته شد.";
  }

  if (
    event.type ===
    "BREAKEVEN"
  ) {
    title =
      "🔐 BREAKEVEN";

    description =
      "قیمت به نقطه ورود برگشت و بخش باقی‌مانده بدون زیان بسته شد.";
  }

  return [
    title,

    `🟡 XAUUSD | ${
      meta.direction ===
      "BUY"
        ? "🟢 BUY"
        : "🔴 SELL"
    }`,

    `📌 Entry: <b>${formatPrice(
      meta.entry
    )}</b>`,

    `📍 Event Price: <b>${formatPrice(
      event.price
    )}</b>`,

    `📦 Closed Lot: <b>${event.lotClosed.toFixed(
      2
    )}</b>`,

    `💵 Result: <b>${formatUsd(
      event.pnlUsd
    )}</b>`,

    event.pnlToman
      ? `🇮🇷 ${formatToman(
          event.pnlToman
        )}`
      : "",

    "",

    description,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendEvent(
  meta: RunMeta,
  event: EventRecord
) {
  const result =
    await telegram(
      "sendMessage",
      {
        text:
          eventMessage(
            meta,
            event
          ),

        parse_mode:
          "HTML",

        disable_web_page_preview:
          true,
      }
    );

  return String(
    result?.result
      ?.message_id ??
      ""
  );
}

/* =========================================================
   CREATE EVENT
   ========================================================= */

function getEventValues(
  type: EventType
) {
  if (
    type ===
    "TP1"
  ) {
    return {
      lot:
        TP1_LOT,

      pnl:
        TP1_USD,
    };
  }

  if (
    type ===
    "TP2"
  ) {
    return {
      lot:
        TP2_LOT,

      pnl:
        TP2_USD,
    };
  }

  if (
    type ===
    "TP3"
  ) {
    return {
      lot:
        TP3_LOT,

      pnl:
        TP3_USD,
    };
  }

  if (
    type ===
    "SL"
  ) {
    return {
      lot:
        TOTAL_LOT,

      pnl:
        -STOP_USD,
    };
  }

  return {
    lot: 0.06,
    pnl: 0,
  };
}

/* =========================================================
   MONITOR
   ========================================================= */

async function monitorActiveRun(
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

  const quote =
    await getLivePrice();

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

  const fx =
    await getUsdToToman();

  const fxRate =
    fx?.rate ??
    meta.usdToToman ??
    0;

  const hasEvent =
    (
      type: EventType
    ) =>
      meta.events.some(
        (event) =>
          event.type ===
          type
      );

  const saveEvent =
    async (
      type: EventType
    ) => {
      if (
        hasEvent(type)
      ) {
        return null;
      }

      const values =
        getEventValues(
          type
        );

      const event: EventRecord =
        {
          type,

          at:
            now.toISOString(),

          price,

          lotClosed:
            values.lot,

          pnlUsd:
            values.pnl,

          pnlToman:
            fxRate
              ? Math.round(
                  values.pnl *
                    fxRate
                )
              : 0,

          usdToToman:
            fxRate,
        };

      meta.events.push(
        event
      );

      if (
        type ===
        "TP1"
      ) {
        meta.state =
          "AI_TP1";

        meta.breakeven =
          true;
      }

      if (
        type ===
        "TP2"
      ) {
        meta.state =
          "AI_TP2";

        meta.breakeven =
          true;
      }

      if (
        type ===
        "TP3"
      ) {
        meta.state =
          "AI_COMPLETED";
      }

      if (
        type ===
        "SL"
      ) {
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

      meta.usdToToman =
        fxRate;

      meta.lastUpdate =
        new Date().toISOString();

      /*
        اول DB
        بعد Telegram

        بنابراین اگر Telegram خراب شود
        وضعیت معامله از بین نمی‌رود.
      */

      const terminal =
        type ===
          "SL" ||
        type ===
          "BREAKEVEN" ||
        type ===
          "TP3";

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

      try {
        await sendEvent(
          meta,
          event
        );
      } catch (
        error
      ) {
        meta.telegramError =
          error instanceof Error
            ? error.message
            : String(error);

        await prisma.analysisRun.update(
          {
            where: {
              id:
                run.id,
            },

            data: {
              metadata:
                meta as any,
            },
          }
        );
      }

      return event;
    };

  /*
    ---------------------------------------------------------
    SL قبل از TP
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_PENDING" &&
    levelHit(
      meta.direction,
      price,
      meta.stopLoss
    )
  ) {
    const event =
      await saveEvent(
        "SL"
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
  }

  /*
    ---------------------------------------------------------
    TP1
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_PENDING" &&
    targetHit(
      meta.direction,
      price,
      meta.tp1
    )
  ) {
    await saveEvent(
      "TP1"
    );
  }

  /*
    ---------------------------------------------------------
    بعد از TP1:
    اگر قیمت به Entry برسد → BE
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_TP1" &&
    levelHit(
      meta.direction,
      price,
      meta.entry
    )
  ) {
    const event =
      await saveEvent(
        "BREAKEVEN"
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
  }

  /*
    ---------------------------------------------------------
    TP2
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_TP1" &&
    targetHit(
      meta.direction,
      price,
      meta.tp2
    )
  ) {
    await saveEvent(
      "TP2"
    );
  }

  /*
    ---------------------------------------------------------
    BE بعد از TP2
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_TP2" &&
    levelHit(
      meta.direction,
      price,
      meta.entry
    )
  ) {
    const event =
      await saveEvent(
        "BREAKEVEN"
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
  }

  /*
    ---------------------------------------------------------
    TP3
    ---------------------------------------------------------
  */

  if (
    meta.state ===
      "AI_TP2" &&
    targetHit(
      meta.direction,
      price,
      meta.tp3
    )
  ) {
    const event =
      await saveEvent(
        "TP3"
      );

    return {
      price,

      state:
        meta.state,

      event,
    };
  }

  /*
    آپدیت قیمت حتی وقتی event جدیدی
    اتفاق نیفتاده است.
  */

  await prisma.analysisRun.update(
    {
      where: {
        id:
          run.id,
      },

      data: {
        metadata:
          meta as any,
      },
    }
  );

  return {
    price,

    state:
      meta.state,

    event:
      null,
  };
}

/* =========================================================
   SCAN
   ========================================================= */

async function scanForSignal(
  userId?: string
) {
  const market =
    getMarketStatus();

  if (!market.open) {
    return {
      created: false,

      reason:
        "market_closed",

      market,
    };
  }

  const active =
    await getActiveRun();

  if (active) {
    return {
      created: false,

      reason:
        "active_signal",

      id:
        active.id,
    };
  }

  const recent =
    await getRecentNoTrade();

  if (
    recent &&
    Date.now() -
      recent.createdAt.getTime() <
      NO_TRADE_COOLDOWN_MS
  ) {
    return {
      created: false,

      reason:
        "cooldown",
    };
  }

  /*
    خبر مهم
  */

  const news =
    await isNewsBlocked();

  if (
    news.length > 0
  ) {
    return {
      created: false,

      reason:
        "high_impact_news",
    };
  }

  /*
    دریافت MTF
  */

  const [
    m1,
    m5,
    m15,
    h1,
  ] =
    await Promise.all([
      getCandles(
        "1min",
        150
      ),

      getCandles(
        "5min",
        120
      ),

      getCandles(
        "15min",
        100
      ),

      getCandles(
        "1h",
        80
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
        "not_enough_candles",
    };
  }

  const analysis =
    analyze(
      m1,
      m5,
      m15,
      h1
    );

  /*
    سیگنال ضعیف
  */

  if (
    !analysis.direction ||
    analysis.score <
      SIGNAL_SCORE
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
              "AI_NO_TRADE",

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
          } as any,
        },
      }
    );

    return {
      created: false,

      reason:
        "score_low",

      score:
        analysis.score,
    };
  }

  /*
    قیمت واقعی
  */

  const quote =
    await getLivePrice();

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

  const levels =
    createLevels(
      entry,
      analysis.direction
    );

  /*
    فضای ساختاری
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
    اگر حمایت/مقاومت بیش از حد دور باشد
    سیگنال صادر نمی‌شود.
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
    };
  }

  /*
    TP1 حداقل 6 دلار فضا می‌خواهد.
  */

  if (
    targetRoom <
    TP1_DISTANCE +
      0.5
  ) {
    return {
      created: false,

      reason:
        "not_enough_target_room",

      score:
        analysis.score,
    };
  }

  /*
    کنترل RR
  */

  if (
    TP1_RR < 1.5 ||
    TP2_RR < 2 ||
    TP3_RR < 3
  ) {
    return {
      created: false,

      reason:
        "invalid_rr",
    };
  }

  const fx =
    await getUsdToToman();

  const now =
    new Date();

  const session =
    currentSession(
      now
    );

  const confirmations =
    Math.min(
      8,
      Math.max(
        5,
        Math.floor(
          analysis.score /
            15
        )
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
        fx?.rate ?? 0,

      riskToman:
        fx
          ? Math.round(
              STOP_USD *
                fx.rate
            )
          : 0,

      tp1Toman:
        fx
          ? Math.round(
              TP1_USD *
                fx.rate
            )
          : 0,

      tp2Toman:
        fx
          ? Math.round(
              TP2_USD *
                fx.rate
            )
          : 0,

      tp3Toman:
        fx
          ? Math.round(
              TP3_USD *
                fx.rate
            )
          : 0,

      totalPotentialToman:
        fx
          ? Math.round(
              TOTAL_POTENTIAL_USD *
                fx.rate
            )
          : 0,

      session,

      score:
        analysis.score,

      confirmations,

      timeframe:
        "1m + 5m + 15m + 1H",

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

        structureDistance:
          round(
            structureDistance
          ),

        targetRoom:
          round(
            targetRoom
          ),

        contractSize:
          CONTRACT_SIZE,

        riskDistance:
          STOP_DISTANCE,

        fxAsOf:
          fx?.asOf ?? null,

        t1:
          analysis.t1,

        t5:
          analysis.t5,

        t15:
          analysis.t15,

        t60:
          analysis.t60,
      },

      createdAt:
        now.toISOString(),

      lastUpdate:
        now.toISOString(),
    };

  /*
    ثبت اصلی
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
    Telegram فقط یک بار
    هنگام صدور سیگنال
  */

  if (
    TELEGRAM_TOKEN &&
    TELEGRAM_CHAT_ID
  ) {
    try {
      const messageId =
        await sendSignal(
          meta,
          m1
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
    } catch (
      error
    ) {
      meta.telegramError =
        error instanceof Error
          ? error.message
          : String(error);

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
  }

  return {
    created: true,

    id:
      created.id,

    meta,
  };
}

/* =========================================================
   ENGINE
   ========================================================= */

async function engineCycle(
  userId?: string
) {
  const market =
    getMarketStatus();

  /*
    بازار بسته:
    سیگنال جدید نساز.
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
    await getActiveRun();

  /*
    سیگنال فعال:
    فقط monitor
  */

  if (active) {
    const monitored =
      await monitorActiveRun(
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
    سیگنال فعال نداریم:
    جستجوی جدید
  */

  const scan =
    await scanForSignal(
      userId
    );

  return {
    mode:
      scan.created
        ? "SIGNAL_CREATED"
        : "SEARCHING",

    market,

    monitored:
      null,

    scan,
  };
}

/* =========================================================
   LOCK
   ========================================================= */

async function runLocked<T>(
  fn: () => Promise<T>
): Promise<T> {
  if (engineLock) {
    return (await engineLock) as T;
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
   PERFORMANCE
   ========================================================= */

function calculatePerformance(
  rows: any[]
) {
  let trades = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;

  let tp1 = 0;
  let tp2 = 0;
  let tp3 = 0;
  let sl = 0;

  let pnlUsd = 0;
  let pnlToman = 0;

  for (
    const row of rows
  ) {
    const meta =
      row.metadata as
        | RunMeta
        | null;

    if (
      !meta ||
      !Array.isArray(
        meta.events
      )
    ) {
      continue;
    }

    trades++;

    let terminal:
      | EventType
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
        tp1++;
      }

      if (
        event.type ===
        "TP2"
      ) {
        tp2++;
      }

      if (
        event.type ===
        "TP3"
      ) {
        tp3++;
      }

      if (
        event.type ===
        "SL"
      ) {
        sl++;
      }

      if (
        event.type ===
          "TP1" ||
        event.type ===
          "TP2" ||
        event.type ===
          "TP3" ||
        event.type ===
          "SL"
      ) {
        pnlUsd +=
          n(
            event.pnlUsd
          );

        pnlToman +=
          n(
            event.pnlToman
          );
      }

      if (
        event.type ===
          "TP3" ||
        event.type ===
          "SL" ||
        event.type ===
          "BREAKEVEN"
      ) {
        terminal =
          event.type;
      }
    }

    if (
      terminal ===
      "TP3"
    ) {
      wins++;
    }

    if (
      terminal ===
      "SL"
    ) {
      losses++;
    }

    if (
      terminal ===
      "BREAKEVEN"
    ) {
      breakeven++;
      wins++;
    }
  }

  const completed =
    wins +
    losses;

  const winRate =
    completed > 0
      ? Math.round(
          (wins /
            completed) *
            100
        )
      : 0;

  return {
    trades,

    wins,

    losses,

    breakeven,

    winRate,

    tp1,

    tp2,

    tp3,

    sl,

    pnlUsd:
      round(
        pnlUsd
      ),

    pnlToman:
      Math.round(
        pnlToman
      ),
  };
}

async function getPerformance() {
  const now =
    new Date();

  const dayStart =
    new Date(now);

  dayStart.setUTCHours(
    0,
    0,
    0,
    0
  );

  const weekStart =
    new Date(
      dayStart
    );

  const day =
    weekStart.getUTCDay() ||
    7;

  weekStart.setUTCDate(
    weekStart.getUTCDate() -
      day +
      1
  );

  const monthStart =
    new Date(
      dayStart
    );

  monthStart.setUTCDate(
    1
  );

  const [
    today,
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

            signalGenerated:
              true,

            createdAt: {
              gte:
                dayStart,
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
                weekStart,
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
                monthStart,
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

          take: 20,
        }
      ),
    ]);

  return {
    today:
      calculatePerformance(
        today
      ),

    week:
      calculatePerformance(
        week
      ),

    month:
      calculatePerformance(
        month
      ),

    recent:
      recent.map(
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
   DASHBOARD MARKET
   ========================================================= */

function validTimeframe(
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

  return value &&
    allowed.has(
      value
    )
    ? value
    : "1min";
}

async function getDashboardMarket(
  timeframe: string,
  active: any
) {
  const market =
    getMarketStatus();

  let currentPrice =
    0;

  let quoteTimestamp =
    0;

  let chartCandles:
    Candle[] =
    [];

  /*
    قیمت
  */

  if (market.open) {
    try {
      const quote =
        await getLivePrice();

      currentPrice =
        quote.price;

      quoteTimestamp =
        quote.timestamp;
    } catch {
      currentPrice =
        n(
          active?.metadata
            ?.currentPrice
        );
    }
  }

  /*
    کندل
  */

  try {
    chartCandles =
      await getCandles(
        timeframe,
        100
      );
  } catch {
    chartCandles =
      [];
  }

  /*
    اگر قیمت live نداشتیم،
    آخرین close واقعی چارت را استفاده کن.
  */

  if (
    !currentPrice &&
    chartCandles.length
  ) {
    currentPrice =
      chartCandles.at(
        -1
      )?.close ?? 0;
  }

  return {
    market,

    currentPrice:
      round(
        currentPrice
      ),

    quoteTimestamp,

    timeframe,

    candles:
      chartCandles,
  };
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function getDashboard(
  userId: string,
  timeframe: string
) {
  let engine: any;

  try {
    /*
      هر بار صفحه اطلاعات را می‌خواهد،
      موتور یک cycle اجرا می‌کند.
    */

    engine =
      await runLocked(
        () =>
          engineCycle(
            userId
          )
      );
  } catch (
    error
  ) {
    engine = {
      mode:
        "ENGINE_ERROR",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }

  /*
    دوباره از DB بخوان.
    این قسمت بسیار مهم است چون ممکن است
    همین cycle سیگنال را به TP/SL برده باشد.
  */

  const active =
    await getActiveRun();

  const [
    performance,
    fx,
    latest
  ] =
    await Promise.all([
      getPerformance(),

      getUsdToToman(),

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
    await getDashboardMarket(
      timeframe,
      active
    );

  return {
    symbol:
      DISPLAY_SYMBOL,

    contractSize:
      CONTRACT_SIZE,

    currentPrice:
      market.currentPrice,

    marketStatus:
      market.market,

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
      latest فقط history است.
      وقتی active وجود ندارد UI نباید
      آن را به عنوان سیگنال فعال نشان دهد.
    */

    latest:
      latest
        ? {
            id:
              latest.id,

            status:
              latest.status,

            metadata:
              latest.metadata,

            createdAt:
              latest.createdAt,
          }
        : null,

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
    },

    performance,

    usdToToman:
      fx,

    engine,

    settings: {
      signalScore:
        SIGNAL_SCORE,

      minimumRR:
        TP1_RR,

      telegramEnabled:
        Boolean(
          TELEGRAM_TOKEN &&
          TELEGRAM_CHAT_ID
        ),

      marketDataEnabled:
        Boolean(
          TD_KEY
        ),

      monitoring:
        true,
    },

    state:
      active
        ? "ACTIVE"
        : market.market.open
          ? "SEARCHING"
          : "MARKET_CLOSED",

    userId,
  };
}

/* =========================================================
   CRON
   ========================================================= */

async function runCron() {
  const market =
    getMarketStatus();

  if (!market.open) {
    return {
      ok: true,

      mode:
        "MARKET_CLOSED",

      market,
    };
  }

  const active =
    await getActiveRun();

  if (active) {
    const monitored =
      await monitorActiveRun(
        active
      );

    return {
      ok: true,

      mode:
        "MONITORING",

      monitored,

      market,
    };
  }

  const scan =
    await scanForSignal();

  return {
    ok: true,

    mode:
      scan.created
        ? "SIGNAL_CREATED"
        : "SEARCHING",

    scan,

    market,
  };
}

/* =========================================================
   GET API
   ========================================================= */

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
      =====================================================
      CRON
      =====================================================
    */

    if (isCron) {
      const secret =
        request.headers.get(
          "x-ai-cron-secret"
        ) ||
        url.searchParams.get(
          "secret"
        );

      if (
        !CRON_SECRET ||
        secret !==
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
        await runLocked(
          () =>
            runCron()
        );

      return NextResponse.json(
        result,
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
      =====================================================
      USER
      =====================================================
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
      validTimeframe(
        url.searchParams.get(
          "timeframe"
        )
      );

    const data =
      await getDashboard(
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
            "no-store, no-cache, must-revalidate",
          Pragma:
            "no-cache",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[AI_ANALYSIS]",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی موتور AI",
      },
      {
        status:
          500,
      }
    );
  }
}
