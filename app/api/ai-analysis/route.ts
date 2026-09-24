import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   AI XAUUSD ENGINE
   ---------------------------------------------------------
   مهم:
   - این سیستم BROKER نیست.
   - هیچ سفارش واقعی ارسال نمی‌کند.
   - فقط تحلیل بازار + ثبت سیگنال + Telegram است.
   - نماد فقط XAUUSD است.
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

/* ================= POSITION MODEL ================= */

const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const INITIAL_RISK_USD = 40;

const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_POTENTIAL_USD =
  TP1_USD +
  TP2_USD +
  TP3_USD;

const ENTRY_TOLERANCE = 1;

/* ================= AI RULES ================= */

const MIN_SCORE = 85;

const NEWS_BLOCK_MINUTES = 30;

const SIGNAL_MAX_AGE_MINUTES = 90;

/*
  Render Cron را بعداً روی هر 3 دقیقه قرار می‌دهیم.

  با این معماری:
  1m تقریباً هر 3 دقیقه
  15m فقط وقتی کندل جدید لازم باشد
  1h فقط وقتی کندل جدید لازم باشد
  4h فقط وقتی کندل جدید لازم باشد

  بنابراین API بی‌دلیل مصرف نمی‌شود.
*/

const TIMEFRAMES = [
  "1min",
  "15min",
  "1h",
  "4h",
] as const;

type Timeframe = (typeof TIMEFRAMES)[number];

type Direction = "BUY" | "SELL";

type SessionName =
  | "LONDON"
  | "NEW_YORK"
  | "TOKYO"
  | "SYDNEY"
  | "OVERLAP"
  | "OFF";

type Candle = {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type TelegramEvent = {
  type: string;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
};

type TradeMeta = {
  kind: "AI_SCALP";

  symbol: "XAUUSD";

  direction: Direction;

  entry: number;

  entryMin: number;
  entryMax: number;

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

  fullCloseAtTp1Usd: number;

  usdToToman: number;
  usdToTomanAt: string;
  usdToTomanSource: string;

  session: SessionName;

  score: number;

  confirmations: number;

  timeframe: string;

  state: string;

  activated: boolean;

  activationAt?: string;

  breakeven: boolean;

  currentPrice: number;

  events: TelegramEvent[];

  analysis: string[];

  confirmationsList: string[];

  reasons: string[];

  newsBlocked: boolean;

  newsWarning?: string;

  createdAt: string;

  expiresAt: string;

  telegramMessageId?: number | null;
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function money(value: number) {
  return round(value, 2);
}

function fmtPrice(value: number) {
  return value.toFixed(2);
}

function fmtToman(value: number) {
  const sign = value >= 0 ? "+" : "";

  return `${sign}${Math.round(value).toLocaleString(
    "fa-IR",
  )} تومان 🇮🇷`;
}

function fmtUsd(value: number) {
  const sign = value >= 0 ? "+" : "";

  return `${sign}$${value.toFixed(2)}`;
}

/* =========================================================
   CRON AUTH
   ========================================================= */

function cronAuthorized(req: NextRequest) {
  const secret = process.env.NEWS_CRON_SECRET;

  if (!secret) {
    return false;
  }

  const bearer = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  const header = req.headers.get("x-cron-secret");

  return bearer === secret || header === secret;
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(path: string) {
  const apiKey =
    process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است.",
    );
  }

  const url = new URL(
    `https://api.twelvedata.com${path}`,
  );

  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  const json = await response.json();

  if (
    !response.ok ||
    json?.status === "error" ||
    json?.code
  ) {
    throw new Error(
      json?.message ||
        `Twelve Data error ${response.status}`,
    );
  }

  return json;
}

/* =========================================================
   FETCH CANDLES
   ========================================================= */

async function fetchCandles(
  interval: string,
  outputsize = 140,
): Promise<Candle[]> {
  const json = await twelveData(
    `/time_series?symbol=${encodeURIComponent(
      SYMBOL,
    )}&interval=${encodeURIComponent(
      interval,
    )}&outputsize=${outputsize}&timezone=UTC&order=ASC`,
  );

  const values = Array.isArray(json?.values)
    ? json.values
    : [];

  return values
    .map((v: any) => ({
      time: new Date(
        String(v.datetime).replace(
          " ",
          "T",
        ) + "Z",
      ),

      open: Number(v.open),

      high: Number(v.high),

      low: Number(v.low),

      close: Number(v.close),

      volume:
        v.volume == null
          ? null
          : Number(v.volume),
    }))
    .filter(
      (c: Candle) =>
        Number.isFinite(
          c.time.getTime(),
        ) &&
        [
          c.open,
          c.high,
          c.low,
          c.close,
        ].every(Number.isFinite),
    );
}

/* =========================================================
   CACHE MARKET CANDLES
   ========================================================= */

async function cacheCandles(
  timeframe: string,
  candles: Candle[],
) {
  if (!candles.length) {
    return;
  }

  await prisma.$transaction(
    candles.slice(-140).map((candle) =>
      prisma.marketCandle.upsert({
        where: {
          symbol_timeframe_openTime: {
            symbol: DISPLAY_SYMBOL,
            timeframe,
            openTime: candle.time,
          },
        },

        create: {
          symbol: DISPLAY_SYMBOL,

          timeframe,

          openTime: candle.time,

          open: candle.open,

          high: candle.high,

          low: candle.low,

          close: candle.close,

          volume: candle.volume,

          source: "TWELVE_DATA",
        },

        update: {
          open: candle.open,

          high: candle.high,

          low: candle.low,

          close: candle.close,

          volume: candle.volume,

          source: "TWELVE_DATA",
        },
      }),
    ),
  );
}

/* =========================================================
   READ CACHE
   ========================================================= */

async function getCachedCandles(
  timeframe: string,
  take = 140,
): Promise<Candle[]> {
  const rows =
    await prisma.marketCandle.findMany({
      where: {
        symbol: DISPLAY_SYMBOL,
        timeframe,
      },

      orderBy: {
        openTime: "desc",
      },

      take,
    });

  return rows.reverse().map((row) => ({
    time: row.openTime,

    open: row.open,

    high: row.high,

    low: row.low,

    close: row.close,

    volume: row.volume,
  }));
}

/* =========================================================
   TIMEFRAME INTERVAL
   ========================================================= */

function intervalMilliseconds(
  timeframe: string,
) {
  switch (timeframe) {
    case "1min":
      return 60_000;

    case "15min":
      return 15 * 60_000;

    case "1h":
      return 60 * 60_000;

    case "4h":
      return 4 * 60 * 60_000;

    default:
      return 60_000;
  }
}

/* =========================================================
   ENSURE MARKET DATA
   ========================================================= */

async function ensureMarketData() {
  const now = Date.now();

  const result: Partial<
    Record<Timeframe, Candle[]>
  > = {};

  for (const timeframe of TIMEFRAMES) {
    let candles =
      await getCachedCandles(
        timeframe,
        140,
      );

    const last =
      candles.at(-1)?.time.getTime() ??
      0;

    const stale =
      !last ||
      now - last >=
        intervalMilliseconds(
          timeframe,
        ) * 0.8;

    if (stale) {
      const fresh =
        await fetchCandles(
          timeframe,
          140,
        );

      await cacheCandles(
        timeframe,
        fresh,
      );

      candles = fresh;
    }

    result[timeframe] = candles;
  }

  return result as Record<
    Timeframe,
    Candle[]
  >;
}

/* =========================================================
   LIVE USD / TOMAN
   ========================================================= */

async function getUsdToToman() {
  /*
    برای جلوگیری از مصرف اضافه API،
    نرخ را تا 30 دقیقه cache می‌کنیم.

    منبع:
    Twelve Data USD/IRR

    چون:
    1 تومان = 10 ریال

    بنابراین:
    IRR / 10 = Toman
  */

  const cached =
    await prisma.analysisRun.findFirst({
      where: {
        symbol: DISPLAY_SYMBOL,
        status: "AI_SCAN",
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const cachedMeta =
    (cached?.metadata ?? {}) as any;

  const cachedRate =
    Number(
      cachedMeta?.usdToToman,
    );

  const cachedAt =
    cached?.createdAt?.getTime() ??
    0;

  if (
    Number.isFinite(cachedRate) &&
    cachedRate > 0 &&
    Date.now() - cachedAt <
      30 * 60_000
  ) {
    return {
      rate: cachedRate,

      source:
        String(
          cachedMeta?.usdToTomanSource ||
            "Twelve Data USD/IRR ÷ 10",
        ),

      at:
        String(
          cachedMeta?.usdToTomanAt ||
            cached.createdAt.toISOString(),
        ),
    };
  }

  const json =
    await twelveData(
      "/exchange_rate?symbol=USD/IRR",
    );

  const irr =
    Number(json?.rate);

  if (
    !Number.isFinite(irr) ||
    irr <= 0
  ) {
    throw new Error(
      "نرخ زنده USD/IRR دریافت نشد.",
    );
  }

  return {
    rate: irr / 10,

    source:
      "Twelve Data USD/IRR ÷ 10",

    at:
      new Date().toISOString(),
  };
}

/* =========================================================
   EMA
   ========================================================= */

function ema(
  candles: Candle[],
  period: number,
) {
  if (
    candles.length <
    period
  ) {
    return null;
  }

  const multiplier =
    2 / (period + 1);

  let value =
    candles
      .slice(0, period)
      .reduce(
        (sum, candle) =>
          sum + candle.close,
        0,
      ) / period;

  for (
    let i = period;
    i < candles.length;
    i++
  ) {
    value =
      candles[i].close *
        multiplier +
      value *
        (1 - multiplier);
  }

  return value;
}

/* =========================================================
   ATR
   ========================================================= */

function atr(
  candles: Candle[],
  period = 14,
) {
  if (
    candles.length <
    period + 1
  ) {
    return null;
  }

  const ranges: number[] = [];

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const tr =
      Math.max(
        current.high -
          current.low,

        Math.abs(
          current.high -
            previous.close,
        ),

        Math.abs(
          current.low -
            previous.close,
        ),
      );

    ranges.push(tr);
  }

  if (
    ranges.length <
    period
  ) {
    return null;
  }

  return (
    ranges
      .slice(-period)
      .reduce(
        (a, b) => a + b,
        0,
      ) / period
  );
}

/* =========================================================
   RSI
   ========================================================= */

function rsi(
  candles: Candle[],
  period = 14,
) {
  if (
    candles.length <
    period + 1
  ) {
    return 50;
  }

  let gains = 0;

  let losses = 0;

  for (
    let i =
      candles.length -
      period;

    i < candles.length;

    i++
  ) {
    const difference =
      candles[i].close -
      candles[i - 1].close;

    if (
      difference >= 0
    ) {
      gains += difference;
    } else {
      losses +=
        Math.abs(
          difference,
        );
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs =
    gains / losses;

  return (
    100 -
    100 / (1 + rs)
  );
}

/* =========================================================
   AVERAGE VOLUME
   ========================================================= */

function averageVolume(
  candles: Candle[],
  period = 20,
) {
  const volumes =
    candles
      .slice(-period)
      .map(
        (candle) =>
          candle.volume,
      )
      .filter(
        (
          value,
        ): value is number =>
          value != null &&
          Number.isFinite(
            value,
          ),
      );

  if (!volumes.length) {
    return null;
  }

  return (
    volumes.reduce(
      (a, b) => a + b,
      0,
    ) / volumes.length
  );
}

/* =========================================================
   SESSION
   ========================================================= */

function sessionFor(
  date = new Date(),
): SessionName {
  function hour(
    timezone: string,
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            timezone,

          hour: "2-digit",

          hour12: false,
        },
      );

    return Number(
      formatter.format(date),
    );
  }

  const londonHour =
    hour("Europe/London");

  const newYorkHour =
    hour(
      "America/New_York",
    );

  const tokyoHour =
    hour("Asia/Tokyo");

  const sydneyHour =
    hour(
      "Australia/Sydney",
    );

  const london =
    londonHour >= 8 &&
    londonHour < 17;

  const newYork =
    newYorkHour >= 8 &&
    newYorkHour < 17;

  const tokyo =
    tokyoHour >= 9 &&
    tokyoHour < 18;

  const sydney =
    sydneyHour >= 8 &&
    sydneyHour < 16;

  if (
    london &&
    newYork
  ) {
    return "OVERLAP";
  }

  if (london) {
    return "LONDON";
  }

  if (newYork) {
    return "NEW_YORK";
  }

  if (tokyo) {
    return "TOKYO";
  }

  if (sydney) {
    return "SYDNEY";
  }

  return "OFF";
}

/* =========================================================
   SWING LEVELS
   ========================================================= */

function findSwings(
  candles: Candle[],
  lookback = 100,
) {
  const data =
    candles.slice(-lookback);

  const highs: number[] = [];

  const lows: number[] = [];

  for (
    let i = 2;
    i < data.length - 2;
    i++
  ) {
    const high =
      data[i].high;

    const low =
      data[i].low;

    const isHigh =
      high >=
        data[i - 1].high &&
      high >=
        data[i - 2].high &&
      high >=
        data[i + 1].high &&
      high >=
        data[i + 2].high;

    const isLow =
      low <=
        data[i - 1].low &&
      low <=
        data[i - 2].low &&
      low <=
        data[i + 1].low &&
      low <=
        data[i + 2].low;

    if (isHigh) {
      highs.push(high);
    }

    if (isLow) {
      lows.push(low);
    }
  }

  return {
    highs,
    lows,
  };
}

/* =========================================================
   SUPPORT / RESISTANCE
   ========================================================= */

function supportResistance(
  price: number,
  candles: Candle[],
) {
  const {
    highs,
    lows,
  } = findSwings(candles);

  const supports =
    lows
      .filter(
        (level) =>
          level < price,
      )
      .sort(
        (a, b) =>
          Math.abs(
            price - a,
          ) -
          Math.abs(
            price - b,
          ),
      )
      .slice(0, 4);

  const resistances =
    highs
      .filter(
        (level) =>
          level > price,
      )
      .sort(
        (a, b) =>
          Math.abs(
            price - a,
          ) -
          Math.abs(
            price - b,
          ),
      )
      .slice(0, 4);

  return {
    supports,
    resistances,
  };
}

/* =========================================================
   HIGH IMPACT NEWS
   ========================================================= */

async function getHighImpactNews() {
  const now =
    new Date();

  const from =
    new Date(
      now.getTime() -
        NEWS_BLOCK_MINUTES *
          60_000,
    );

  const to =
    new Date(
      now.getTime() +
        NEWS_BLOCK_MINUTES *
          60_000,
    );

  return prisma.economicEvent.findMany(
    {
      where: {
        importance: {
          gte: 3,
        },

        eventTime: {
          gte: from,
          lte: to,
        },

        OR: [
          {
            currency:
              "USD",
          },

          {
            currency:
              "US",
          },

          {
            country:
              "United States",
          },
        ],
      },

      orderBy: {
        eventTime:
          "asc",
      },

      take: 10,
    },
  );
}

/* =========================================================
   MARKET DIRECTION
   ========================================================= */

function marketDirection(
  m1: Candle[],
  m15: Candle[],
  h1: Candle[],
  h4: Candle[],
): Direction {
  const price =
    m1.at(-1)?.close ??
    0;

  const pairs = [
    [
      ema(m15, 20),
      ema(m15, 50),
    ],

    [
      ema(h1, 20),
      ema(h1, 50),
    ],

    [
      ema(h4, 20),
      ema(h4, 50),
    ],
  ];

  let buy = 0;

  let sell = 0;

  for (
    const [
      fast,
      slow,
    ] of pairs
  ) {
    if (
      fast == null ||
      slow == null
    ) {
      continue;
    }

    if (
      fast > slow
    ) {
      buy++;
    }

    if (
      fast < slow
    ) {
      sell++;
    }
  }

  if (
    buy >= 2 &&
    price >
      (ema(
        m15,
        20,
      ) ?? price)
  ) {
    return "BUY";
  }

  if (
    sell >= 2 &&
    price <
      (ema(
        m15,
        20,
      ) ?? price)
  ) {
    return "SELL";
  }

  return buy >= sell
    ? "BUY"
    : "SELL";
}

/* =========================================================
   AI SCORING ENGINE
   ========================================================= */

function analyzeMarket(
  market: Record<
    Timeframe,
    Candle[]
  >,
  newsBlocked: boolean,
) {
  const m1 =
    market["1min"];

  const m15 =
    market["15min"];

  const h1 =
    market["1h"];

  const h4 =
    market["4h"];

  const price =
    m1.at(-1)?.close ??
    0;

  const direction =
    marketDirection(
      m1,
      m15,
      h1,
      h4,
    );

  let score = 0;

  const confirmations: string[] =
    [];

  const reasons: string[] =
    [];

  /* ---------------- TREND ---------------- */

  const trendPairs = [
    [
      ema(m15, 20),
      ema(m15, 50),
    ],

    [
      ema(h1, 20),
      ema(h1, 50),
    ],

    [
      ema(h4, 20),
      ema(h4, 50),
    ],
  ];

  let trendConfirmations =
    0;

  for (
    const [
      fast,
      slow,
    ] of trendPairs
  ) {
    if (
      fast == null ||
      slow == null
    ) {
      continue;
    }

    if (
      direction === "BUY" &&
      fast > slow
    ) {
      trendConfirmations++;
    }

    if (
      direction === "SELL" &&
      fast < slow
    ) {
      trendConfirmations++;
    }
  }

  score +=
    trendConfirmations * 5;

  if (
    trendConfirmations >= 2
  ) {
    confirmations.push(
      "روند چندتایم‌فریمی هم‌جهت است",
    );
  } else {
    reasons.push(
      "روند چندتایم‌فریمی هنوز کاملاً هم‌جهت نیست",
    );
  }

  /* ---------------- MOMENTUM ---------------- */

  const m15Rsi =
    rsi(m15);

  const momentumOk =
    direction === "BUY"
      ? m15Rsi >= 52 &&
        m15Rsi <= 72
      : m15Rsi <= 48 &&
        m15Rsi >= 28;

  if (
    momentumOk
  ) {
    score += 10;

    confirmations.push(
      "مومنتوم 15 دقیقه‌ای تأیید شد",
    );
  } else {
    reasons.push(
      "مومنتوم 15 دقیقه‌ای شرایط مناسب ورود ندارد",
    );
  }

  /* ---------------- STRUCTURE ---------------- */

  const recent =
    m15.slice(-8);

  const structureUp =
    recent.length >= 2 &&
    recent.at(-1)!.high >
      recent[0].high &&
    recent.at(-1)!.low >
      recent[0].low;

  const structureDown =
    recent.length >= 2 &&
    recent.at(-1)!.high <
      recent[0].high &&
    recent.at(-1)!.low <
      recent[0].low;

  const structureOk =
    direction === "BUY"
      ? structureUp
      : structureDown;

  if (
    structureOk
  ) {
    score += 15;

    confirmations.push(
      "ساختار بازار تأیید شد",
    );
  } else {
    reasons.push(
      "ساختار بازار شکست معتبر کافی ندارد",
    );
  }

  /* ---------------- SUPPORT RESISTANCE ---------------- */

  const sr =
    supportResistance(
      price,
      m15,
    );

  const nearestSupport =
    sr.supports[0];

  const nearestResistance =
    sr.resistances[0];

  const marketAtr =
    atr(m15) ?? 2;

  const nearSupport =
    nearestSupport != null &&
    Math.abs(
      price -
        nearestSupport,
    ) <=
      Math.max(
        marketAtr,
        2.5,
      );

  const nearResistance =
    nearestResistance !=
      null &&
    Math.abs(
      nearestResistance -
        price,
    ) <=
      Math.max(
        marketAtr,
        2.5,
      );

  const srOk =
    direction === "BUY"
      ? nearSupport ||
        (nearestResistance !=
          null &&
          price >
            nearestResistance)
      : nearResistance ||
        (nearestSupport !=
          null &&
          price <
            nearestSupport);

  if (srOk) {
    score += 10;

    confirmations.push(
      "ناحیه حمایت/مقاومت مناسب است",
    );
  } else {
    reasons.push(
      "قیمت در ناحیه مناسب حمایت/مقاومت نیست",
    );
  }

  /* ---------------- CANDLE ---------------- */

  const last =
    m1.at(-1);

  let candleOk = false;

  if (last) {
    const body =
      Math.abs(
        last.close -
          last.open,
      );

    const range =
      Math.max(
        last.high -
          last.low,
        0.01,
      );

    const strongBull =
      last.close >
        last.open &&
      body / range >=
        0.45;

    const strongBear =
      last.close <
        last.open &&
      body / range >=
        0.45;

    candleOk =
      direction ===
        "BUY"
        ? strongBull
        : strongBear;
  }

  if (
    candleOk
  ) {
    score += 10;

    confirmations.push(
      "کندل تأییدی ورود شکل گرفته است",
    );
  } else {
    reasons.push(
      "کندل ورود تأیید کافی ندارد",
    );
  }

  /* ---------------- VOLUME ---------------- */

  const averageVol =
    averageVolume(m1);

  const currentVol =
    last?.volume ??
    null;

  const volumeOk =
    averageVol == null ||
    currentVol == null ||
    currentVol >=
      averageVol * 0.9;

  if (
    volumeOk
  ) {
    score += 5;

    confirmations.push(
      "فعالیت/حجم بازار مناسب است",
    );
  } else {
    reasons.push(
      "فعالیت بازار پایین‌تر از میانگین است",
    );
  }

  /* ---------------- PULLBACK ---------------- */

  const currentAtr =
    atr(m1) ?? 1.5;

  const currentBody =
    last
      ? Math.abs(
          last.close -
            last.open,
        )
      : 0;

  const pullbackOk =
    currentBody <=
    currentAtr * 1.2;

  if (
    pullbackOk
  ) {
    score += 10;

    confirmations.push(
      "شرایط پولبک قابل قبول است",
    );
  } else {
    reasons.push(
      "حرکت قیمت بیش از حد کشیده شده است",
    );
  }

  /* ---------------- SESSION ---------------- */

  const session =
    sessionFor();

  if (
    session ===
      "LONDON" ||
    session ===
      "NEW_YORK" ||
    session ===
      "OVERLAP"
  ) {
    score += 5;

    confirmations.push(
      "جلسه معاملاتی فعال است",
    );
  } else {
    reasons.push(
      "جلسه فعلی اولویت پایین‌تری برای اسکالپ دارد",
    );
  }

  /* ---------------- NEWS ---------------- */

  if (
    !newsBlocked
  ) {
    score += 10;

    confirmations.push(
      "فیلتر خبر پرریسک باز است",
    );
  } else {
    reasons.push(
      "خبر پرریسک نزدیک است؛ ورود جدید مسدود است",
    );
  }

  return {
    price,

    direction,

    score: Math.min(
      100,
      Math.round(score),
    ),

    confirmations,

    reasons,

    session,

    supportResistance: sr,
  };
}

/* =========================================================
   TRADE LEVEL CALCULATOR
   ========================================================= */

function calculateLevels(
  entry: number,
  direction: Direction,
) {
  /*
    XAUUSD استاندارد:
    100 oz per 1 LOT

    0.10 LOT
    = 10 oz

    $40 risk
    = $4 price distance

    TP1:
    0.04 LOT = 4 oz
    $20 / 4 = $5

    TP2:
    0.03 LOT = 3 oz
    $24 / 3 = $8

    TP3:
    0.03 LOT = 3 oz
    $36 / 3 = $12
  */

  const stopDistance =
    INITIAL_RISK_USD /
    (TOTAL_LOT *
      CONTRACT_SIZE);

  const tp1Distance =
    TP1_USD /
    (TP1_LOT *
      CONTRACT_SIZE);

  const tp2Distance =
    TP2_USD /
    (TP2_LOT *
      CONTRACT_SIZE);

  const tp3Distance =
    TP3_USD /
    (TP3_LOT *
      CONTRACT_SIZE);

  if (
    direction === "BUY"
  ) {
    return {
      stopLoss:
        entry -
        stopDistance,

      tp1:
        entry +
        tp1Distance,

      tp2:
        entry +
        tp2Distance,

      tp3:
        entry +
        tp3Distance,
    };
  }

  return {
    stopLoss:
      entry +
      stopDistance,

    tp1:
      entry -
      tp1Distance,

    tp2:
      entry -
      tp2Distance,

    tp3:
      entry -
      tp3Distance,
  };
}

/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  message: string,
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (
    !token ||
    !chatId
  ) {
    throw new Error(
      "تنظیمات Telegram کامل نیست.",
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

          text: message,

          parse_mode: "HTML",

          disable_web_page_preview:
            true,
        }),
      },
    );

  const json =
    await response.json();

  if (
    !response.ok ||
    !json?.ok
  ) {
    throw new Error(
      json?.description ||
        "Telegram sendMessage failed",
    );
  }

  return (
    Number(
      json.result?.message_id,
    ) || null
  );
}

/* =========================================================
   TELEGRAM SIGNAL MESSAGE
   ========================================================= */

function buildSignalMessage(
  meta: TradeMeta,
) {
  const fullCloseAtTp1 =
    money(
      TOTAL_LOT *
        CONTRACT_SIZE *
        Math.abs(
          meta.tp1 -
            meta.entry,
        ),
    );

  return [
    "🤖 <b>این تحلیل هوش مصنوعی است</b>",

    "",

    "⚠️ این پیام سیگنال مستقیم بروکر نیست و هیچ سفارش واقعی از سایت ارسال نمی‌شود.",

    "",

    `🟡 <b>XAUUSD / GOLD</b>`,

    meta.direction ===
    "BUY"
      ? "🟢 <b>BUY</b>"
      : "🔴 <b>SELL</b>",

    "",

    `🎯 نقطه ورود: <b>${fmtPrice(
      meta.entry,
    )}</b>`,

    `📏 محدوده مجاز ورود: <b>${fmtPrice(
      meta.entryMin,
    )} تا ${fmtPrice(
      meta.entryMax,
    )}</b>`,

    "⚠️ فقط ۱ دلار بالاتر یا پایین‌تر از نقطه ورود مجاز است. اگر قیمت بیشتر از این محدوده فاصله گرفت، ورود جدید بر اساس این تحلیل معتبر نیست.",

    "",

    `🛑 SL: <b>${fmtPrice(
      meta.stopLoss,
    )}</b>`,

    `💥 ریسک اولیه کل: <b>-$40</b>`,

    "",

    `🎯 TP1: <b>${fmtPrice(
      meta.tp1,
    )}</b>`,

    "بستن: <b>0.04 LOT</b>",

    `سود این بخش: <b>+$20</b>`,

    "",

    `🎯 TP2: <b>${fmtPrice(
      meta.tp2,
    )}</b>`,

    "بستن: <b>0.03 LOT</b>",

    `سود این بخش: <b>+$24</b>`,

    "",

    `🎯 TP3: <b>${fmtPrice(
      meta.tp3,
    )}</b>`,

    "بستن: <b>0.03 LOT</b>",

    `سود این بخش: <b>+$36</b>`,

    "",

    `💰 مجموع سود برنامه پله‌ای تا TP3: <b>+$80</b>`,

    `💡 اگر کل 0.10 LOT در قیمت TP1 بسته شود، سود محاسباتی حدود <b>+$${fullCloseAtTp1.toFixed(
      0,
    )}</b> خواهد بود.`,

    "",

    "🔒 بعد از TP1، برای بخش باقی‌مانده حد ضرر به نقطه ورود منتقل می‌شود تا ریسک بخش باقی‌مانده تقریباً صفر شود.",

    "",

    `📊 امتیاز AI: <b>${meta.score}/100</b>`,

    `🧠 تعداد تأییدها: <b>${meta.confirmations}</b>`,

    `🕒 Session: <b>${meta.session}</b>`,

    `⏱ TF: <b>${meta.timeframe}</b>`,

    "",

    `💱 نرخ ثبت‌شده USD/تومان: <b>${Math.round(
      meta.usdToToman,
    ).toLocaleString(
      "en-US",
    )}</b>`,

    "",

    "⚠️ این سیستم تحلیل بازار است، نه بروکر. اجرای ورود، رعایت محدوده ۱ دلاری، حجم معامله و مدیریت ریسک بر عهده کاربر است.",

  ].join("\n");
}

/* =========================================================
   EVENT TOMAN
   ========================================================= */

function pnlToman(
  pnlUsd: number,
  rate: number,
) {
  return money(
    pnlUsd * rate,
  );
}

/* =========================================================
   CREATE AI SIGNAL
   ========================================================= */

async function createAiSignal(
  market: Record<
    Timeframe,
    Candle[]
  >,
  usd: {
    rate: number;
    source: string;
    at: string;
  },
) {
  const news =
    await getHighImpactNews();

  const analysis =
    analyzeMarket(
      market,
      news.length > 0,
    );

  /*
    سیگنال فقط زمانی ایجاد می‌شود
    که تمام فیلترهای مهم عبور کرده باشند.
  */

  if (
    analysis.score <
      MIN_SCORE
  ) {
    return {
      generated: false,

      reason:
        "AI score below threshold",

      analysis,

      news,
    };
  }

  if (
    news.length > 0
  ) {
    return {
      generated: false,

      reason:
        "high impact news",

      analysis,

      news,
    };
  }

  if (
    analysis.session ===
    "OFF"
  ) {
    return {
      generated: false,

      reason:
        "market session not active",

      analysis,

      news,
    };
  }

  /*
    فقط یک معامله AI همزمان.
  */

  const active =
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

        take: 5,
      },
    );

  if (
    active.length
  ) {
    return {
      generated: false,

      reason:
        "active AI trade exists",

      analysis,

      news,
    };
  }

  const entry =
    round(
      analysis.price,
      2,
    );

  const levels =
    calculateLevels(
      entry,
      analysis.direction,
    );

  const now =
    new Date();

  const meta: TradeMeta =
    {
      kind:
        "AI_SCALP",

      symbol:
        "XAUUSD",

      direction:
        analysis.direction,

      entry,

      entryMin:
        round(
          entry -
            ENTRY_TOLERANCE,
          2,
        ),

      entryMax:
        round(
          entry +
            ENTRY_TOLERANCE,
          2,
        ),

      stopLoss:
        round(
          levels.stopLoss,
          2,
        ),

      tp1:
        round(
          levels.tp1,
          2,
        ),

      tp2:
        round(
          levels.tp2,
          2,
        ),

      tp3:
        round(
          levels.tp3,
          2,
        ),

      totalLot:
        TOTAL_LOT,

      tp1Lot:
        TP1_LOT,

      tp2Lot:
        TP2_LOT,

      tp3Lot:
        TP3_LOT,

      riskUsd:
        INITIAL_RISK_USD,

      tp1Usd:
        TP1_USD,

      tp2Usd:
        TP2_USD,

      tp3Usd:
        TP3_USD,

      totalPotentialUsd:
        TOTAL_POTENTIAL_USD,

      fullCloseAtTp1Usd:
        money(
          TOTAL_LOT *
            CONTRACT_SIZE *
            Math.abs(
              levels.tp1 -
                entry,
            ),
        ),

      usdToToman:
        usd.rate,

      usdToTomanAt:
        usd.at,

      usdToTomanSource:
        usd.source,

      session:
        analysis.session,

      score:
        analysis.score,

      confirmations:
        analysis
          .confirmations
          .length,

      timeframe:
        "1m + 15m + 1h + 4h",

      state:
        "WAITING_ENTRY",

      activated:
        false,

      breakeven:
        false,

      currentPrice:
        analysis.price,

      events: [],

      analysis:
        analysis
          .confirmations,

      confirmationsList:
        analysis
          .confirmations,

      reasons:
        analysis.reasons,

      newsBlocked:
        false,

      createdAt:
        now.toISOString(),

      expiresAt:
        new Date(
          now.getTime() +
            SIGNAL_MAX_AGE_MINUTES *
              60_000,
        ).toISOString(),
    };

  const run =
    await prisma.analysisRun.create(
      {
        data: {
          symbol:
            DISPLAY_SYMBOL,

          timeframe:
            meta.timeframe,

          status:
            "AI_PENDING",

          signalGenerated:
            true,

          candlesAnalyzed:
            Object.values(
              market,
            ).reduce(
              (
                sum,
                candles,
              ) =>
                sum +
                candles.length,
              0,
            ),

          confirmationsFound:
            meta.confirmations,

          metadata:
            meta as any,
        },
      },
    );

  try {
    const messageId =
      await sendTelegram(
        buildSignalMessage(
          meta,
        ),
      );

    const finalMeta = {
      ...meta,

      telegramMessageId:
        messageId,
    };

    await prisma.analysisRun.update(
      {
        where: {
          id: run.id,
        },

        data: {
          metadata:
            finalMeta as any,
        },
      },
    );

    return {
      generated: true,

      runId:
        run.id,

      analysis,

      news,

      meta:
        finalMeta,
    };
  } catch (error) {
    await prisma.analysisRun.update(
      {
        where: {
          id: run.id,
        },

        data: {
          status:
            "AI_TELEGRAM_ERROR",

          errorMessage:
            error instanceof
            Error
              ? error.message
              : "Telegram error",
        },
      },
    );

    throw error;
  }
}

/* =========================================================
   PRICE CROSSING
   ========================================================= */

function levelReached(
  direction: Direction,
  price: number,
  level: number,
) {
  return direction ===
    "BUY"
    ? price >= level
    : price <= level;
}

function stopReached(
  direction: Direction,
  price: number,
  stop: number,
) {
  return direction ===
    "BUY"
    ? price <= stop
    : price >= stop;
}

/* =========================================================
   MONITOR ACTIVE AI TRADE
   ========================================================= */

async function monitorActiveTrades(
  market: Record<
    Timeframe,
    Candle[]
  >,
  usd: {
    rate: number;
    source: string;
    at: string;
  },
) {
  const active =
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
            "asc",
        },

        take: 10,
      },
    );

  const price =
    market[
      "1min"
    ].at(-1)?.close ?? 0;

  const changes: string[] =
    [];

  for (
    const run of active
  ) {
    const raw =
      (run.metadata ??
        {}) as any;

    if (
      raw.kind !==
      "AI_SCALP"
    ) {
      continue;
    }

    const meta =
      raw as TradeMeta;

    const now =
      new Date();

    meta.currentPrice =
      price;

    /*
      هنوز وارد محدوده ورود نشده.
    */

    if (
      !meta.activated
    ) {
      const inside =
        price >=
          meta.entryMin &&
        price <=
          meta.entryMax;

      if (
        inside
      ) {
        meta.activated =
          true;

        meta.activationAt =
          now.toISOString();

        meta.state =
          "ACTIVE";

        await prisma.analysisRun.update(
          {
            where: {
              id: run.id,
            },

            data: {
              metadata:
                meta as any,
            },
          },
        );
      } else if (
        now.getTime() >
        new Date(
          meta.expiresAt,
        ).getTime()
      ) {
        meta.state =
          "EXPIRED";

        await prisma.analysisRun.update(
          {
            where: {
              id: run.id,
            },

            data: {
              status:
                "AI_EXPIRED",

              finishedAt:
                now,

              metadata:
                meta as any,
            },
          },
        );

        changes.push(
          `${run.id}:expired`,
        );

        continue;
      } else {
        continue;
      }
    }

    const lastEvent =
      meta.events?.at(
        -1,
      )?.type;

    /*
      ==========================
      TP1
      ==========================
    */

    if (
      lastEvent !==
        "TP1" &&
      levelReached(
        meta.direction,
        price,
        meta.tp1,
      )
    ) {
      const event:
        TelegramEvent =
        {
          type:
            "TP1",

          at:
            now.toISOString(),

          price:
            round(
              price,
              2,
            ),

          lotClosed:
            TP1_LOT,

          pnlUsd:
            TP1_USD,

          pnlToman:
            pnlToman(
              TP1_USD,
              usd.rate,
            ),

          usdToToman:
            usd.rate,
        };

      meta.events = [
        ...(meta.events ??
          []),

        event,
      ];

      meta.breakeven =
        true;

      meta.state =
        "AI_TP1";

      /*
        بعد از TP1:
        SL باقی‌مانده = Entry
      */

      meta.stopLoss =
        meta.entry;

      meta.usdToToman =
        usd.rate;

      meta.usdToTomanAt =
        usd.at;

      meta.usdToTomanSource =
        usd.source;

      await prisma.analysisRun.update(
        {
          where: {
            id: run.id,
          },

          data: {
            status:
              "AI_TP1",

            metadata:
              meta as any,
          },
        },
      );

      await sendTelegram(
        [
          "🟢 <b>AI TP1 HIT — XAUUSD</b>",

          "",

          `قیمت فعلی: <b>${fmtPrice(
            price,
          )}</b>`,

          `TP1: <b>${fmtPrice(
            meta.tp1,
          )}</b>`,

          `بخش بسته‌شده: <b>0.04 LOT</b>`,

          `سود TP1: <b>+$20</b>`,

          fmtToman(
            pnlToman(
              20,
              usd.rate,
            ),
          ),

          "",

          "🔒 مدیریت ریسک: حد ضرر بخش باقی‌مانده روی Entry منتقل شد.",

          `Entry: ${fmtPrice(
            meta.entry,
          )}`,

          `TP2: ${fmtPrice(
            meta.tp2,
          )}`,

          `TP3: ${fmtPrice(
            meta.tp3,
          )}`,

          "",

          "⚠️ این سیستم بروکر نیست و سفارش واقعی ارسال نمی‌کند.",
        ].join("\n"),
      );

      changes.push(
        `${run.id}:TP1`,
      );

      continue;
    }

    /*
      ==========================
      TP2
      ==========================
    */

    if (
      lastEvent ===
        "TP1" &&
      levelReached(
        meta.direction,
        price,
        meta.tp2,
      )
    ) {
      const event:
        TelegramEvent =
        {
          type:
            "TP2",

          at:
            now.toISOString(),

          price:
            round(
              price,
              2,
            ),

          lotClosed:
            TP2_LOT,

          pnlUsd:
            TP2_USD,

          pnlToman:
            pnlToman(
              TP2_USD,
              usd.rate,
            ),

          usdToToman:
            usd.rate,
        };

      meta.events = [
        ...(meta.events ??
          []),

        event,
      ];

      meta.state =
        "AI_TP2";

      await prisma.analysisRun.update(
        {
          where: {
            id: run.id,
          },

          data: {
            status:
              "AI_TP2",

            metadata:
              meta as any,
          },
        },
      );

      await sendTelegram(
        [
          "🟢 <b>AI TP2 HIT — XAUUSD</b>",

          "",

          `قیمت: <b>${fmtPrice(
            price,
          )}</b>`,

          "بخش بسته‌شده: <b>0.03 LOT</b>",

          "سود TP2: <b>+$24</b>",

          fmtToman(
            pnlToman(
              24,
              usd.rate,
            ),
          ),

          "",

          "💰 سود قفل‌شده تا این مرحله: <b>+$44</b>",

          `TP3: <b>${fmtPrice(
            meta.tp3,
          )}</b>`,
        ].join("\n"),
      );

      changes.push(
        `${run.id}:TP2`,
      );

      continue;
    }

    /*
      ==========================
      TP3
      ==========================
    */

    if (
      lastEvent ===
        "TP2" &&
      levelReached(
        meta.direction,
        price,
        meta.tp3,
      )
    ) {
      const event:
        TelegramEvent =
        {
          type:
            "TP3",

          at:
            now.toISOString(),

          price:
            round(
              price,
              2,
            ),

          lotClosed:
            TP3_LOT,

          pnlUsd:
            TP3_USD,

          pnlToman:
            pnlToman(
              TP3_USD,
              usd.rate,
            ),

          usdToToman:
            usd.rate,
        };

      meta.events = [
        ...(meta.events ??
          []),

        event,
      ];

      meta.state =
        "COMPLETED_TP3";

      await prisma.analysisRun.update(
        {
          where: {
            id: run.id,
          },

          data: {
            status:
              "AI_COMPLETED",

            finishedAt:
              now,

            metadata:
              meta as any,
          },
        },
      );

      await sendTelegram(
        [
          "🏆 <b>AI TP3 HIT — XAUUSD</b>",

          "",

          `قیمت: <b>${fmtPrice(
            price,
          )}</b>`,

          "بخش بسته‌شده: <b>0.03 LOT</b>",

          "سود TP3: <b>+$36</b>",

          fmtToman(
            pnlToman(
              36,
              usd.rate,
            ),
          ),

          "",

          "💰 مجموع سود برنامه پله‌ای: <b>+$80</b>",

          "⚖️ سود نهایی برنامه در برابر ریسک اولیه: <b>1:2</b>",

          "",

          "⚠️ این عدد مدل محاسباتی سیستم است؛ اجرای واقعی سفارش در بروکر انجام می‌شود، نه در این سایت.",
        ].join("\n"),
      );

      changes.push(
        `${run.id}:TP3`,
      );

      continue;
    }

    /*
      ==========================
      STOP LOSS
      ==========================
    */

    if (
      stopReached(
        meta.direction,
        price,
        meta.stopLoss,
      )
    ) {
      /*
        بعد از TP1:
        SL = Entry

        پس ضرر بخش باقی‌مانده
        تقریباً صفر است.
      */

      if (
        meta.breakeven
      ) {
        const event:
          TelegramEvent =
          {
            type:
              "BREAKEVEN",

            at:
              now.toISOString(),

            price:
              round(
                price,
                2,
              ),

            lotClosed:
              0,

            pnlUsd:
              0,

            pnlToman:
              0,

            usdToToman:
              usd.rate,
          };

        meta.events = [
          ...(meta.events ??
            []),

          event,
        ];

        meta.state =
          "BREAKEVEN_EXIT";

        await prisma.analysisRun.update(
          {
            where: {
              id: run.id,
            },

            data: {
              status:
                "AI_BREAKEVEN",

              finishedAt:
                now,

              metadata:
                meta as any,
            },
          },
        );

        await sendTelegram(
          [
            "⚪ <b>AI BREAK-EVEN — XAUUSD</b>",

            "",

            `قیمت به Entry برگشت: <b>${fmtPrice(
              meta.entry,
            )}</b>`,

            "TP1 قبلاً لمس شده بود و SL بخش باقی‌مانده روی Entry قرار داشت.",

            "نتیجه بخش باقی‌مانده تقریباً صفر است.",

            `سود ثبت‌شده قبلی: <b>+$20</b>`,
          ].join("\n"),
        );
      } else {
        const event:
          TelegramEvent =
          {
            type:
              "SL",

            at:
              now.toISOString(),

            price:
              round(
                price,
                2,
              ),

            lotClosed:
              TOTAL_LOT,

            pnlUsd:
              -INITIAL_RISK_USD,

            pnlToman:
              pnlToman(
                -INITIAL_RISK_USD,
                usd.rate,
              ),

            usdToToman:
              usd.rate,
          };

        meta.events = [
          ...(meta.events ??
            []),

          event,
        ];

        meta.state =
          "STOPPED_LOSS";

        await prisma.analysisRun.update(
          {
            where: {
              id: run.id,
            },

            data: {
              status:
                "AI_SL",

              finishedAt:
                now,

              metadata:
                meta as any,
            },
          },
        );

        await sendTelegram(
          [
            "🔴 <b>AI SL HIT — XAUUSD</b>",

            "",

            `قیمت: <b>${fmtPrice(
              price,
            )}</b>`,

            "ریسک اولیه: <b>-$40</b>",

            fmtToman(
              pnlToman(
                -40,
                usd.rate,
              ),
            ),

            "",

            "⚠️ این سیستم بروکر نیست و فقط وضعیت مدل تحلیلی را ثبت می‌کند.",
          ].join("\n"),
        );
      }

      changes.push(
        `${run.id}:STOP`,
      );
    }
  }

  return changes;
}

/* =========================================================
   SUPPORT / RESISTANCE TELEGRAM REPORT
   ========================================================= */

async function sendSupportResistanceReport(
  market: Record<
    Timeframe,
    Candle[]
  >,
  usd: {
    rate: number;
  },
) {
  const now =
    new Date();

  /*
    آخرین گزارش S/R
    را بین 100 رکورد اخیر پیدا می‌کنیم.
  */

  const recentRuns =
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

        take: 100,
      },
    );

  const lastReport =
    recentRuns.find(
      (run) =>
        (run.metadata as any)
          ?.kind ===
        "AI_SR_REPORT",
    );

  if (
    lastReport &&
    Date.now() -
      lastReport.createdAt.getTime() <
      2 *
        60 *
        60_000
  ) {
    return false;
  }

  const price =
    market[
      "1h"
    ].at(-1)?.close ?? 0;

  const levels =
    supportResistance(
      price,
      market["1h"],
    );

  const utcHour =
    now.getUTCHours();

  const morning =
    utcHour >= 6 &&
    utcHour <= 9;

  const report =
    [
      "🧭 <b>تحلیل مستقل حمایت و مقاومت XAUUSD</b>",

      "",

      "⚠️ <b>این پیام سیگنال نیست.</b>",

      "این سطوح فقط نواحی مهم حمایت و مقاومت بازار هستند و ممکن است در آن‌ها واکنش قیمت ایجاد شود.",

      "",

      `💵 قیمت فعلی: <b>${fmtPrice(
        price,
      )}</b>`,

      "",

      "🟢 <b>حمایت‌های مهم:</b>",

      ...(levels.supports.length
        ? levels.supports.map(
            (
              level,
              index,
            ) =>
              `${index + 1}. <b>${fmtPrice(
                level,
              )}</b>`,
          )
        : [
            "داده کافی نیست",
          ]),

      "",

      "🔴 <b>مقاومت‌های مهم:</b>",

      ...(levels.resistances
        .length
        ? levels.resistances.map(
            (
              level,
              index,
            ) =>
              `${index + 1}. <b>${fmtPrice(
                level,
              )}</b>`,
          )
        : [
            "داده کافی نیست",
          ]),

      "",

      "📌 این سطوح را در تحلیل‌های بعدی در نظر بگیرید؛ اما به‌تنهایی به معنی ورود یا خروج نیستند.",

      "",

      `💱 USD/تومان: <b>${Math.round(
        usd.rate,
      ).toLocaleString(
        "en-US",
      )}</b>`,

      "",

      "⏰ این کادر حداکثر هر ۲ ساعت به‌روزرسانی می‌شود.",
    ].join("\n");

  await sendTelegram(
    report,
  );

  await prisma.analysisRun.create(
    {
      data: {
        symbol:
          DISPLAY_SYMBOL,

        timeframe:
          "1h",

        status:
          "AI_SR_REPORT",

        signalGenerated:
          false,

        metadata: {
          kind:
            "AI_SR_REPORT",

          morning,

          price,

          supports:
            levels.supports,

          resistances:
            levels.resistances,

          usdToToman:
            usd.rate,
        },
      },
    },
  );

  return true;
}

/* =========================================================
   FULL SCAN
   ========================================================= */

async function runAiScan() {
  const started =
    Date.now();

  /*
    1. Market data
  */

  const market =
    await ensureMarketData();

  /*
    2. Live USD/Toman
  */

  const usd =
    await getUsdToToman();

  /*
    3. Monitor existing signal
  */

  const monitored =
    await monitorActiveTrades(
      market,
      usd,
    );

  /*
    4. Search for a NEW signal
  */

  const created =
    await createAiSignal(
      market,
      usd,
    );

  /*
    5. Support/Resistance
       every ~2 hours
  */

  const supportResistanceSent =
    await sendSupportResistanceReport(
      market,
      usd,
    );

  /*
    6. Save scanner result
  */

  await prisma.analysisRun.create(
    {
      data: {
        symbol:
          DISPLAY_SYMBOL,

        timeframe:
          "1m + 15m + 1h + 4h",

        status:
          created.generated
            ? "AI_SIGNAL_CREATED"
            : "AI_NO_TRADE",

        signalGenerated:
          created.generated,

        durationMs:
          Date.now() -
          started,

        candlesAnalyzed:
          Object.values(
            market,
          ).reduce(
            (
              total,
              candles,
            ) =>
              total +
              candles.length,
            0,
          ),

        confirmationsFound:
          created.analysis
            .confirmations
            .length,

        metadata: {
          kind:
            "AI_SCAN",

          price:
            created.analysis
              .price,

          direction:
            created.analysis
              .direction,

          score:
            created.analysis
              .score,

          session:
            created.analysis
              .session,

          confirmations:
            created.analysis
              .confirmations,

          reasons:
            created.analysis
              .reasons,

          supports:
            created.analysis
              .supportResistance
              .supports,

          resistances:
            created.analysis
              .supportResistance
              .resistances,

          monitored,

          supportResistanceSent,

          usdToToman:
            usd.rate,

          usdToTomanSource:
            usd.source,

          usdToTomanAt:
            usd.at,
        },
      },
    },
  );

  return {
    ok: true,

    generated:
      created.generated,

    score:
      created.analysis
        .score,

    direction:
      created.analysis
        .direction,

    session:
      created.analysis
        .session,

    monitored,

    supportResistanceSent,

    usdToToman:
      usd.rate,
  };
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function getTradeMeta(
  run: any,
): TradeMeta | null {
  const metadata =
    run?.metadata;

  if (
    !metadata ||
    metadata.kind !==
      "AI_SCALP"
  ) {
    return null;
  }

  return metadata as TradeMeta;
}

async function calculatePerformance(
  days: number,
) {
  const from =
    new Date(
      Date.now() -
        days *
          24 *
          60 *
          60_000,
    );

  const runs =
    await prisma.analysisRun.findMany(
      {
        where: {
          symbol:
            DISPLAY_SYMBOL,

          createdAt: {
            gte: from,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 500,
      },
    );

  let pnlUsd = 0;

  let wins = 0;

  let losses = 0;

  let breakeven = 0;

  let tp1 = 0;

  let tp2 = 0;

  let tp3 = 0;

  let sl = 0;

  for (
    const run of runs
  ) {
    const meta =
      getTradeMeta(run);

    if (!meta) {
      continue;
    }

    for (
      const event of
        meta.events ??
        []
    ) {
      pnlUsd +=
        Number(
          event.pnlUsd ||
            0,
        );

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
        "BREAKEVEN"
      ) {
        breakeven++;
      }
    }

    if (
      meta.state ===
      "COMPLETED_TP3"
    ) {
      wins++;
    }

    if (
      meta.state ===
      "STOPPED_LOSS"
    ) {
      losses++;
    }
  }

  const closedTrades =
    wins + losses;

  return {
    pnlUsd:
      money(pnlUsd),

    signals:
      runs.filter(
        (run) =>
          run.signalGenerated,
      ).length,

    wins,

    losses,

    breakeven,

    winRate:
      closedTrades
        ? money(
            (wins /
              closedTrades) *
              100,
          )
        : 0,

    tp1,

    tp2,

    tp3,

    sl,
  };
}

/* =========================================================
   DASHBOARD DATA
   ========================================================= */

async function getDashboard() {
  const [
    activeRuns,
    latest,
    day,
    week,
    month,
  ] =
    await Promise.all([
      prisma.analysisRun.findMany(
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

          take: 5,
        },
      ),

      prisma.analysisRun.findFirst(
        {
          where: {
            symbol:
              DISPLAY_SYMBOL,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },
      ),

      calculatePerformance(
        1,
      ),

      calculatePerformance(
        7,
      ),

      calculatePerformance(
        30,
      ),
    ]);

  const activeRun =
    activeRuns[0] ??
    null;

  const activeMeta =
    getTradeMeta(
      activeRun,
    );

  const latestMeta =
    getTradeMeta(
      latest,
    );

  return {
    symbol:
      "XAUUSD",

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
        INITIAL_RISK_USD,

      tp1Usd:
        TP1_USD,

      tp2Usd:
        TP2_USD,

      tp3Usd:
        TP3_USD,

      totalPotentialUsd:
        TOTAL_POTENTIAL_USD,

      entryTolerance:
        ENTRY_TOLERANCE,

      fullCloseAtTp1Usd:
        50,
    },

    active:
      activeMeta
        ? {
            id:
              activeRun?.id ??
              null,

            status:
              activeRun?.status ??
              null,

            metadata:
              activeMeta,
          }
        : null,

    latest:
      latestMeta
        ? {
            id:
              latest?.id ??
              null,

            status:
              latest?.status ??
              null,

            metadata:
              latestMeta,
          }
        : null,

    performance: {
      day,

      week,

      month,
    },
  };
}

/* =========================================================
   GET
   ---------------------------------------------------------
   فقط اطلاعات DB را برمی‌گرداند.
   این GET نباید Twelve Data را صدا بزند.
   ========================================================= */

export async function GET() {
  try {
    const data =
      await getDashboard();

    return NextResponse.json(
      {
        ok: true,

        data,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "خطای سرور",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
   ---------------------------------------------------------
   فقط Cron/Server مجاز است.
   ========================================================= */

export async function POST(
  req: NextRequest,
) {
  if (
    !cronAuthorized(req)
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

  try {
    const body =
      await req
        .json()
        .catch(
          () => ({}),
        );

    const action =
      body?.action ||
      "scan";

    if (
      action !==
      "scan"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "action نامعتبر است.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await runAiScan();

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "AI SCAN ERROR:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "خطای اسکن AI",
      },
      {
        status: 500,
      },
    );
  }
}
