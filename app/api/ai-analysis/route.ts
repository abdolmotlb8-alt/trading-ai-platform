import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type SessionInfo = {
  name: string;
  fa: string;
  open: boolean;
};

type Analysis = {
  symbol: string;
  price: number;
  direction: "BUY" | "SELL" | "NO_TRADE";
  score: number;
  confirmations: number;

  session: string;
  sessions: SessionInfo[];

  entry?: number;
  stopLoss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;

  lotSize?: number;
  actualRisk?: number;
  rr?: number;

  mtf: string;

  support: number;
  resistance: number;
  atr: number;

  reasons: string[];

  confirmationsList: {
    name: string;
    ok: boolean;
    value: string;
  }[];

  candles: Candle[];

  timeframe: string;

  newsBlocked: boolean;
  newsReason: string;
};

type Meta = {
  userId: string;
  kind: "AI_SCALP";

  symbol: string;
  direction: "BUY" | "SELL";

  entry: number;
  stopLoss: number;

  tp1: number;
  tp2: number;
  tp3: number;

  lotSize: number;

  riskUsd: number;
  actualRisk: number;

  session: string;

  score: number;
  confirmations: number;
  mtf: string;

  reasons: string[];

  confirmationsList: {
    name: string;
    ok: boolean;
    value: string;
  }[];

  state: {
    tp1: boolean;
    tp2: boolean;
    tp3: boolean;
    sl: boolean;
  };

  events: {
    type: string;
    price: number;
    pnlUsd: number;
    at: string;
  }[];

  lastPrice: number;
};

const TD = "https://api.twelvedata.com";

/**
 * نمادهای قابل تحلیل
 *
 * فارکس + طلا
 */
const FX_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "XAUUSD",
];

/**
 * تایم‌فریم‌های پایه موتور
 */
const TF = ["4h", "1h", "15min", "5min", "1min"] as const;

function num(v: unknown, fallback = 0) {
  const n = Number(v);

  return Number.isFinite(n) ? n : fallback;
}

function avg(values: number[]) {
  if (!values.length) return 0;

  return values.reduce((x, y) => x + y, 0) / values.length;
}

function round(value: number, decimals = 5) {
  const power = 10 ** decimals;

  return Math.round(value * power) / power;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * تبدیل EURUSD به EUR/USD
 * و XAUUSD به XAU/USD
 */
function symbolApi(symbol: string) {
  const value = symbol.replace(/\s/g, "").toUpperCase();

  if (value.length === 6) {
    return `${value.slice(0, 3)}/${value.slice(3)}`;
  }

  return value;
}

/**
 * تعداد اعشار قیمت
 */
function decimals(symbol: string) {
  if (symbol === "XAUUSD") {
    return 2;
  }

  if (symbol.includes("JPY")) {
    return 3;
  }

  return 5;
}

/**
 * درخواست به Twelve Data
 */
async function td(
  path: string,
  params: Record<string, string | number>
) {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (!key) {
    throw new Error("TWELVE_DATA_API_KEY وجود ندارد.");
  }

  const url = new URL(TD + path);

  const allParams = {
    ...params,
    apikey: key,
  };

  for (const [keyName, value] of Object.entries(allParams)) {
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

/**
 * دریافت کندل‌ها
 */
async function candles(
  symbol: string,
  interval: string,
  count = 180
): Promise<Candle[]> {
  const data = await td("/time_series", {
    symbol: symbolApi(symbol),
    interval,
    outputsize: count,
    order: "asc",
    timezone: "UTC",
  });

  if (
    !Array.isArray(data.values) ||
    data.values.length < 70
  ) {
    throw new Error(
      `داده کافی برای ${symbol} / ${interval} دریافت نشد.`
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
        item.open &&
        item.high &&
        item.low &&
        item.close
    );
}

/**
 * EMA
 */
function ema(values: number[], period: number) {
  if (values.length < period) {
    return 0;
  }

  let result = avg(values.slice(0, period));

  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    result =
      values[i] * multiplier +
      result * (1 - multiplier);
  }

  return result;
}

/**
 * RSI
 */
function rsi(values: number[], period = 14) {
  if (values.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const difference =
      values[i] - values[i - 1];

    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const difference =
      values[i] - values[i - 1];

    averageGain =
      (averageGain * (period - 1) +
        (difference > 0 ? difference : 0)) /
      period;

    averageLoss =
      (averageLoss * (period - 1) +
        (difference < 0 ? -difference : 0)) /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  return (
    100 -
    100 /
      (1 + averageGain / averageLoss)
  );
}

/**
 * ATR
 */
function atr(candlesList: Candle[], period = 14) {
  if (candlesList.length <= period) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < candlesList.length; i++) {
    const current = candlesList[i];
    const previous = candlesList[i - 1];

    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(
          current.high - previous.close
        ),
        Math.abs(
          current.low - previous.close
        )
      )
    );
  }

  return avg(
    trueRanges.slice(-period)
  );
}

/**
 * MACD ساده
 */
function macd(values: number[]) {
  return (
    ema(values, 12) -
    ema(values, 26)
  );
}

/**
 * پیدا کردن حمایت و مقاومت
 */
function swings(candlesList: Candle[]) {
  const highs: number[] = [];
  const lows: number[] = [];

  for (
    let i = 2;
    i < candlesList.length - 2;
    i++
  ) {
    const current = candlesList[i];

    if (
      current.high >
        candlesList[i - 1].high &&
      current.high >
        candlesList[i - 2].high &&
      current.high >
        candlesList[i + 1].high &&
      current.high >
        candlesList[i + 2].high
    ) {
      highs.push(current.high);
    }

    if (
      current.low <
        candlesList[i - 1].low &&
      current.low <
        candlesList[i - 2].low &&
      current.low <
        candlesList[i + 1].low &&
      current.low <
        candlesList[i + 2].low
    ) {
      lows.push(current.low);
    }
  }

  const last =
    candlesList[candlesList.length - 1];

  return {
    resistance: Math.max(
      ...highs.slice(-6),
      last.high
    ),

    support: Math.min(
      ...lows.slice(-6),
      last.low
    ),
  };
}

/**
 * تأیید کندلی
 */
function candleConfirm(
  candlesList: Candle[],
  direction: "BUY" | "SELL"
) {
  const previous =
    candlesList[candlesList.length - 2];

  const current =
    candlesList[candlesList.length - 1];

  const body = Math.abs(
    current.close - current.open
  );

  const range = Math.max(
    current.high - current.low,
    1e-9
  );

  const upper =
    current.high -
    Math.max(
      current.open,
      current.close
    );

  const lower =
    Math.min(
      current.open,
      current.close
    ) - current.low;

  const bullishEngulfing =
    current.close > current.open &&
    previous.close < previous.open &&
    current.close > previous.open &&
    current.open < previous.close;

  const bearishEngulfing =
    current.close < current.open &&
    previous.close > previous.open &&
    current.open > previous.close &&
    current.close < previous.open;

  const hammer =
    lower > body * 2 &&
    upper < body;

  const shootingStar =
    upper > body * 2 &&
    lower < body;

  if (
    direction === "BUY" &&
    (bullishEngulfing || hammer)
  ) {
    return {
      ok: true,
      name: bullishEngulfing
        ? "Bullish Engulfing"
        : "Hammer",
    };
  }

  if (
    direction === "SELL" &&
    (bearishEngulfing || shootingStar)
  ) {
    return {
      ok: true,
      name: bearishEngulfing
        ? "Bearish Engulfing"
        : "Shooting Star",
    };
  }

  return {
    ok: false,
    name: "No candle confirmation",
  };
}

/**
 * وضعیت سشن‌ها
 *
 * عمداً بدون Asia/Sydney timezone
 * تا خطای:
 * Invalid time zone specified: Asia/Sydney
 * ایجاد نشود.
 */
function sessionState(): SessionInfo[] {
  const now = new Date();

  const utc =
    now.getUTCHours() +
    now.getUTCMinutes() / 60;

  const year = now.getUTCFullYear();

  /**
   * آخرین یکشنبه ماه
   */
  const lastSunday = (month: number) => {
    const date = new Date(
      Date.UTC(
        year,
        month + 1,
        0
      )
    );

    while (date.getUTCDay() !== 0) {
      date.setUTCDate(
        date.getUTCDate() - 1
      );
    }

    return date;
  };

  /**
   * اروپا
   */
  const euStart = lastSunday(2);
  const euEnd = lastSunday(9);

  const euDst =
    now >= euStart &&
    now < euEnd;

  /**
   * اولین یکشنبه ماه
   */
  const firstSunday = (month: number) => {
    const date = new Date(
      Date.UTC(
        year,
        month,
        1
      )
    );

    while (date.getUTCDay() !== 0) {
      date.setUTCDate(
        date.getUTCDate() + 1
      );
    }

    return date;
  };

  /**
   * آمریکا
   */
  const usStart = new Date(
    firstSunday(2)
  );

  usStart.setUTCDate(
    usStart.getUTCDate() + 7
  );

  const usEnd = firstSunday(10);

  const usDst =
    now >= usStart &&
    now < usEnd;

  return [
    {
      name: "Sydney",
      fa: "سیدنی",
      open: utc >= 21 || utc < 6,
    },

    {
      name: "Tokyo",
      fa: "توکیو",
      open: utc >= 0 && utc < 9,
    },

    {
      name: "London",
      fa: "لندن",
      open:
        utc >= (euDst ? 7 : 8) &&
        utc < (euDst ? 16 : 17),
    },

    {
      name: "New York",
      fa: "نیویورک",
      open:
        utc >= (usDst ? 12 : 13) &&
        utc < (usDst ? 21 : 22),
    },
  ];
}

/**
 * بررسی اخبار مهم
 */
async function newsCheck(symbol: string) {
  const currencies = [
    symbol.slice(0, 3),
    symbol.slice(3),
  ];

  const now = new Date();

  const events =
    await prisma.economicEvent.findMany({
      where: {
        importance: {
          gte: 3,
        },

        eventTime: {
          gte: new Date(
            now.getTime() -
              10 * 60 * 1000
          ),

          lte: new Date(
            now.getTime() +
              30 * 60 * 1000
          ),
        },

        OR: [
          {
            currency:
              currencies[0],
          },

          {
            currency:
              currencies[1],
          },
        ],
      },

      select: {
        event: true,
        currency: true,
        eventTime: true,
      },

      take: 5,
    });

  return {
    blocked: events.length > 0,

    reason: events.length
      ? `خبر پرریسک نزدیک است: ${events[0].currency} ${events[0].event}`
      : "خبر پرریسک در پنجره فعلی پیدا نشد",
  };
}

/**
 * ساخت Entry / SL / TP
 */
function makeLevels(
  symbol: string,
  direction: "BUY" | "SELL",
  entry: number,
  atrValue: number,
  supportResistance: {
    support: number;
    resistance: number;
  }
) {
  const structure =
    direction === "BUY"
      ? entry -
        supportResistance.support
      : supportResistance.resistance -
        entry;

  const minDistance = Math.max(
    atrValue * 0.15,
    entry * 0.00015
  );

  const maxDistance =
    atrValue * 0.65;

  if (
    structure < minDistance ||
    structure > maxDistance
  ) {
    return null;
  }

  const stopDistance = Math.max(
    structure,
    atrValue * 0.18
  );

  /**
   * Forex = 100000
   * Gold = 100
   */
  const contract =
    symbol === "XAUUSD"
      ? 100
      : 100000;

  /**
   * هدف ریسک مدل = $4
   */
  let lot =
    4 /
    (stopDistance * contract);

  lot =
    Math.floor(lot * 100) / 100;

  if (lot < 0.01) {
    lot = 0.01;
  }

  if (lot > 0.05) {
    return null;
  }

  const actualRisk =
    stopDistance *
    lot *
    contract;

  /**
   * TP ها:
   *
   * TP1 = +$5
   * TP2 = +$8
   * TP3 = +$12
   */
  const distanceTP1 =
    5 / (lot * contract);

  const distanceTP2 =
    8 / (lot * contract);

  const distanceTP3 =
    12 / (lot * contract);

  return {
    entry,

    sl:
      direction === "BUY"
        ? entry - stopDistance
        : entry + stopDistance,

    tp1:
      direction === "BUY"
        ? entry + distanceTP1
        : entry - distanceTP1,

    tp2:
      direction === "BUY"
        ? entry + distanceTP2
        : entry - distanceTP2,

    tp3:
      direction === "BUY"
        ? entry + distanceTP3
        : entry - distanceTP3,

    lot,

    actual: actualRisk,

    rr:
      12 /
      Math.max(actualRisk, 0.01),
  };
}

/**
 * موتور اصلی تحلیل
 */
async function analyze(
  symbol: string,
  requestedTimeframe: string
): Promise<Analysis> {
  const selected = [
    "1min",
    "5min",
    "15min",
    "1h",
    "4h",
  ].includes(requestedTimeframe)
    ? requestedTimeframe
    : "1min";

  /**
   * MTF:
   * 4H
   * 1H
   * 15M
   * 1M
   *
   * و تایم‌فریم انتخابی
   */
  const fetchTimeframes = [
    ...new Set([
      "4h",
      "1h",
      "15min",
      "1min",
      selected,
    ]),
  ];

  const data =
    await Promise.all(
      fetchTimeframes.map(
        (timeframe) =>
          candles(
            symbol,
            timeframe,
            180
          )
      )
    );

  const market: Record<
    string,
    Candle[]
  > = {};

  fetchTimeframes.forEach(
    (timeframe, index) => {
      market[timeframe] =
        data[index];
    }
  );

  const main =
    market[selected] as Candle[];

  const last =
    main[main.length - 1];

  const closes =
    main.map(
      (candle) => candle.close
    );

  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const rsiValue =
    rsi(closes);

  const macdValue =
    macd(closes);

  const atrValue =
    atr(main);

  const supportResistance =
    swings(main);

  const sessions =
    sessionState();

  const activeSessions =
    sessions.filter(
      (item) => item.open
    );

  const session =
    activeSessions.length > 1
      ? activeSessions
          .map((item) => item.fa)
          .join(" + ")
      : activeSessions[0]?.fa ??
        "خارج از سشن اصلی";

  const news =
    await newsCheck(symbol);

  /**
   * رأی تایم‌فریم‌های بالاتر
   */
  const trendVotes = [
    "4h",
    "1h",
    "15min",
  ].map((timeframe) => {
    const candlesTF =
      market[timeframe];

    const current =
      candlesTF[
        candlesTF.length - 1
      ];

    const timeframeCloses =
      candlesTF.map(
        (candle) => candle.close
      );

    return current.close >
      ema(
        timeframeCloses,
        20
      )
      ? 1
      : -1;
  });

  const bullishMTF =
    trendVotes.filter(
      (value) => value > 0
    ).length;

  const bearishMTF =
    trendVotes.filter(
      (value) => value < 0
    ).length;

  /**
   * روند
   */
  const upTrend =
    ema20 > ema50 &&
    last.close > ema20;

  const downTrend =
    ema20 < ema50 &&
    last.close < ema20;

  /**
   * Liquidity sweep
   */
  const sweepLow =
    last.low <
      supportResistance.support &&
    last.close >
      supportResistance.support;

  const sweepHigh =
    last.high >
      supportResistance.resistance &&
    last.close <
      supportResistance.resistance;

  /**
   * Pullback
   */
  const pullbackBuy =
    last.low <=
      ema20 + atrValue * 0.35 &&
    last.close > ema20;

  const pullbackSell =
    last.high >=
      ema20 - atrValue * 0.35 &&
    last.close < ema20;

  /**
   * Candle
   */
  const buyCandle =
    candleConfirm(
      main,
      "BUY"
    );

  const sellCandle =
    candleConfirm(
      main,
      "SELL"
    );

  /**
   * Volume
   */
  const volumes = main
    .map(
      (candle) =>
        candle.volume ?? 0
    )
    .slice(-21);

  const averageVolume =
    avg(
      volumes.slice(0, -1)
    );

  const volumeOk =
    averageVolume <= 0
      ? false
      : (last.volume ?? 0) >=
        averageVolume * 0.9;

  /**
   * BUY score
   */
  const buyConditions = [
    upTrend,
    rsiValue > 50,
    macdValue > 0,
    bullishMTF >= 2,
    sweepLow || pullbackBuy,
    buyCandle.ok,
    volumeOk,
    activeSessions.length > 0,
    !news.blocked,
  ];

  /**
   * SELL score
   */
  const sellConditions = [
    downTrend,
    rsiValue < 50,
    macdValue < 0,
    bearishMTF >= 2,
    sweepHigh || pullbackSell,
    sellCandle.ok,
    volumeOk,
    activeSessions.length > 0,
    !news.blocked,
  ];

  const buyScore =
    buyConditions.filter(
      Boolean
    ).length;

  const sellScore =
    sellConditions.filter(
      Boolean
    ).length;

  let direction:
    | "BUY"
    | "SELL"
    | "NO_TRADE" =
    buyScore > sellScore
      ? "BUY"
      : sellScore > buyScore
      ? "SELL"
      : "NO_TRADE";

  const votes =
    direction === "BUY"
      ? buyScore
      : direction === "SELL"
      ? sellScore
      : Math.max(
          buyScore,
          sellScore
        );

  let score = Math.round(
    (votes / 9) * 100
  );

  /**
   * امتیاز سشن‌های همپوشان
   */
  if (activeSessions.length > 1) {
    score += 4;
  }

  /**
   * تأیید کامل MTF
   */
  if (
    bullishMTF >= 3 ||
    bearishMTF >= 3
  ) {
    score += 5;
  }

  /**
   * Sweep + Pullback
   */
  if (
    (sweepLow || sweepHigh) &&
    (pullbackBuy || pullbackSell)
  ) {
    score += 4;
  }

  score = clamp(
    score,
    0,
    100
  );

  /**
   * لیست تأییدیه‌ها
   */
  const confirmationsList = [
    {
      name:
        "روند چند تایم‌فریمی",

      ok:
        direction === "BUY"
          ? bullishMTF >= 3
          : direction === "SELL"
          ? bearishMTF >= 3
          : false,

      value: `${Math.max(
        bullishMTF,
        bearishMTF
      )}/3`,
    },

    {
      name: "EMA 20/50",

      ok:
        direction === "BUY"
          ? upTrend
          : direction === "SELL"
          ? downTrend
          : false,

      value: `${round(
        ema20,
        decimals(symbol)
      )} / ${round(
        ema50,
        decimals(symbol)
      )}`,
    },

    {
      name: "RSI 14",

      ok:
        direction === "BUY"
          ? rsiValue > 50 &&
            rsiValue < 72
          : direction === "SELL"
          ? rsiValue < 50 &&
            rsiValue > 28
          : false,

      value:
        rsiValue.toFixed(1),
    },

    {
      name: "MACD",

      ok:
        direction === "BUY"
          ? macdValue > 0
          : direction === "SELL"
          ? macdValue < 0
          : false,

      value:
        macdValue.toFixed(
          decimals(symbol)
        ),
    },

    {
      name:
        "Liquidity sweep",

      ok:
        direction === "BUY"
          ? sweepLow
          : direction === "SELL"
          ? sweepHigh
          : false,

      value:
        direction === "BUY"
          ? "Sweep low"
          : "Sweep high",
    },

    {
      name: "Pullback",

      ok:
        direction === "BUY"
          ? pullbackBuy
          : direction === "SELL"
          ? pullbackSell
          : false,

      value:
        direction === "BUY"
          ? "EMA pullback"
          : "EMA rejection",
    },

    {
      name:
        "Candle confirmation",

      ok:
        direction === "BUY"
          ? buyCandle.ok
          : direction === "SELL"
          ? sellCandle.ok
          : false,

      value:
        direction === "BUY"
          ? buyCandle.name
          : sellCandle.name,
    },

    {
      name: "Volume",

      ok: volumeOk,

      value: volumeOk
        ? "Tick volume confirmed"
        : "Unavailable / not counted",
    },

    {
      name: "Session",

      ok:
        activeSessions.length > 0,

      value: session,
    },

    {
      name:
        "News filter",

      ok: !news.blocked,

      value: news.reason,
    },
  ];

  const confirmations =
    confirmationsList.filter(
      (item) => item.ok
    ).length;

  const finalDirection =
    direction;

  let levels: ReturnType<
    typeof makeLevels
  > = null;

  /**
   * شرایط ساخت تحلیل معتبر
   */
  if (
    (finalDirection === "BUY" ||
      finalDirection === "SELL") &&
    score >= 88 &&
    confirmations >= 7 &&
    (finalDirection === "BUY"
      ? bullishMTF
      : bearishMTF) >= 3 &&
    activeSessions.length > 0 &&
    !news.blocked
  ) {
    levels = makeLevels(
      symbol,
      finalDirection,
      last.close,
      atrValue,
      supportResistance
    );
  }

  /**
   * اگر شرایط کامل نباشد:
   * NO TRADE
   */
  if (!levels) {
    direction = "NO_TRADE";
  }

  const reasons =
    confirmationsList
      .filter(
        (item) => item.ok
      )
      .map(
        (item) => item.name
      );

  return {
    symbol,

    price: last.close,

    direction,

    score,

    confirmations,

    session,

    sessions,

    entry:
      levels?.entry ??
      last.close,

    stopLoss:
      levels?.sl,

    tp1:
      levels?.tp1,

    tp2:
      levels?.tp2,

    tp3:
      levels?.tp3,

    lotSize:
      levels?.lot,

    actualRisk:
      levels?.actual,

    rr:
      levels?.rr,

    mtf: `${Math.max(
      bullishMTF,
      bearishMTF
    )}/3`,

    support:
      supportResistance.support,

    resistance:
      supportResistance.resistance,

    atr: atrValue,

    reasons,

    confirmationsList,

    candles:
      main.slice(-80),

    timeframe: selected,

    newsBlocked:
      news.blocked,

    newsReason:
      news.reason,
  };
}

/**
 * خواندن metadata
 */
function activeMeta(
  value: unknown
): Meta | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return value as Meta;
}

/**
 * ارسال تحلیل به Telegram
 */
async function sendTelegram(
  analysis: Analysis
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
      error: "Telegram env missing",
    };
  }

  const isBuy =
    analysis.direction === "BUY";

  const icon = isBuy
    ? "🟢📈"
    : "🔻📉";

  const direction =
    isBuy
      ? "BUY"
      : "SELL";

  const priceDecimals =
    decimals(
      analysis.symbol
    );

  const text = `
${icon} <b>AI ANALYSIS — ${direction}</b>

━━━━━━━━━━━━━━

⚠️ <b>این تحلیل هوش مصنوعی است؛ سیگنال مستقیم یا تضمین سود نیست.</b>

📌 <b>${esc(
    analysis.symbol
  )}</b> · <b>${
    analysis.timeframe
  } Scalping</b>

🕒 Session:
<b>${esc(
    analysis.session
  )}</b>

🎯 Entry:
<b>${analysis.entry?.toFixed(
    priceDecimals
  )}</b>

🛑 SL:
<b>${analysis.stopLoss?.toFixed(
    priceDecimals
  )}</b>

💰 Risk target:
<b>-$4.00</b>

💼 Model risk:
<b>-$${analysis.actualRisk?.toFixed(
    2
  )}</b>

🟢 TP1:
<b>${analysis.tp1?.toFixed(
    priceDecimals
  )}</b>
 | +$5

🟢 TP2:
<b>${analysis.tp2?.toFixed(
    priceDecimals
  )}</b>
 | +$8

🟢 TP3:
<b>${analysis.tp3?.toFixed(
    priceDecimals
  )}</b>
 | +$12

━━━━━━━━━━━━━━

📊 Score:
<b>${analysis.score}/100</b>

✅ Confirmations:
<b>${analysis.confirmations}</b>

🧭 MTF:
<b>${analysis.mtf}</b>

💼 Lot model:
<b>${analysis.lotSize?.toFixed(
    2
  )}</b>

━━━━━━━━━━━━━━

<b>تاییدیه‌ها:</b>

${analysis.reasons
  .map(
    (reason) =>
      `✅ ${esc(reason)}`
  )
  .join("\n")}

━━━━━━━━━━━━━━

⚠️ ریسک هدف $4 است؛ حجم با حداقل 0.01 لات گرد می‌شود و ریسک واقعی مدل در کارت نمایش داده می‌شود.
`;

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
          parse_mode: "HTML",
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
    response.ok &&
    data?.ok
  ) {
    return {
      ok: true,
      messageId:
        String(
          data.result.message_id
        ),
    };
  }

  return {
    ok: false,

    error: String(
      data?.description ??
        `Telegram HTTP ${response.status}`
    ),
  };
}

/**
 * پیدا کردن تحلیل فعال قبلی
 */
async function previousPending(
  userId: string,
  symbol: string
) {
  const rows =
    await prisma.analysisRun.findMany(
      {
        where: {
          botId: null,

          startedAt: {
            gte: new Date(
              Date.now() -
                2 *
                  86400000
            ),
          },
        },

        orderBy: {
          startedAt: "desc",
        },

        take: 200,
      }
    );

  return rows.find((row) => {
    const metadata =
      activeMeta(
        row.metadata
      );

    return (
      metadata?.userId ===
        userId &&
      metadata?.kind ===
        "AI_SCALP" &&
      metadata.symbol ===
        symbol &&
      [
        "AI_PENDING",
        "AI_TP1",
        "AI_TP2",
      ].includes(row.status)
    );
  });
}

/**
 * مانیتور کردن TP / SL
 */
async function monitor(
  userId: string
) {
  const rows =
    await prisma.analysisRun.findMany(
      {
        where: {
          botId: null,

          status: {
            in: [
              "AI_PENDING",
              "AI_TP1",
              "AI_TP2",
            ],
          },

          startedAt: {
            gte: new Date(
              Date.now() -
                8 *
                  3600000
            ),
          },
        },

        orderBy: {
          startedAt: "asc",
        },

        take: 100,
      }
    );

  const output: any[] = [];

  for (const row of rows) {
    const metadata =
      activeMeta(
        row.metadata
      );

    if (
      !metadata ||
      metadata.userId !== userId
    ) {
      continue;
    }

    try {
      /**
       * برای مانیتورینگ
       * همیشه قیمت 1 دقیقه‌ای گرفته می‌شود.
       */
      const candles1m =
        await candles(
          metadata.symbol,
          "1min",
          2
        );

      const current =
        candles1m[
          candles1m.length - 1
        ];

      metadata.lastPrice =
        current.close;

      let hit = "";

      /**
       * SL
       */
      if (
        !metadata.state.sl &&
        (
          metadata.direction ===
          "BUY"
            ? current.low <=
              metadata.stopLoss
            : current.high >=
              metadata.stopLoss
        )
      ) {
        hit = "SL";
      }

      /**
       * TP1
       */
      else if (
        !metadata.state.tp1 &&
        (
          metadata.direction ===
          "BUY"
            ? current.high >=
              metadata.tp1
            : current.low <=
              metadata.tp1
        )
      ) {
        hit = "TP1";
      }

      /**
       * TP2
       */
      else if (
        metadata.state.tp1 &&
        !metadata.state.tp2 &&
        (
          metadata.direction ===
          "BUY"
            ? current.high >=
              metadata.tp2
            : current.low <=
              metadata.tp2
        )
      ) {
        hit = "TP2";
      }

      /**
       * TP3
       */
      else if (
        metadata.state.tp2 &&
        !metadata.state.tp3 &&
        (
          metadata.direction ===
          "BUY"
            ? current.high >=
              metadata.tp3
            : current.low <=
              metadata.tp3
        )
      ) {
        hit = "TP3";
      }

      if (hit) {
        const pnl =
          hit === "SL"
            ? -4
            : hit === "TP1"
            ? 5
            : hit === "TP2"
            ? 8
            : 12;

        const hitPrice =
          hit === "SL"
            ? metadata.stopLoss
            : hit === "TP1"
            ? metadata.tp1
            : hit === "TP2"
            ? metadata.tp2
            : metadata.tp3;

        metadata.events.push({
          type: hit,

          price: hitPrice,

          pnlUsd: pnl,

          at:
            new Date().toISOString(),
        });

        if (hit === "SL") {
          metadata.state.sl = true;
        }

        if (hit === "TP1") {
          metadata.state.tp1 = true;
        }

        if (hit === "TP2") {
          metadata.state.tp2 = true;
        }

        if (hit === "TP3") {
          metadata.state.tp3 = true;
        }

        const closed =
          hit === "SL" ||
          hit === "TP3";

        await prisma.analysisRun.update(
          {
            where: {
              id: row.id,
            },

            data: {
              status: closed
                ? hit === "TP3"
                  ? "AI_TP3"
                  : "AI_SL"
                : (`AI_${hit}`),

              finishedAt:
                closed
                  ? new Date()
                  : undefined,

              metadata:
                metadata as any,
            },
          }
        );

        /**
         * ارسال نتیجه مرحله به تلگرام
         */
        const token =
          process.env
            .TELEGRAM_BOT_TOKEN;

        const chat =
          process.env
            .TELEGRAM_SIGNAL_CHAT_ID;

        if (token && chat) {
          const icon =
            hit === "SL"
              ? "🔴"
              : "🟢";

          const text = `
${icon} <b>AI ANALYSIS ${hit}</b>

${esc(metadata.symbol)} · ${
            metadata.direction
          }

Price:
<b>${hitPrice}</b>

Stage P/L:
<b>${
            pnl >= 0
              ? "+"
              : ""
          }$${pnl}</b>

ℹ️ نتیجه مرحله‌ای تحلیل AI ثبت شد.
`;

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
              }),
            }
          ).catch(() => {});
        }

        output.push({
          id: row.id,
          event: hit,
        });
      } else {
        await prisma.analysisRun.update(
          {
            where: {
              id: row.id,
            },

            data: {
              metadata:
                metadata as any,
            },
          }
        );
      }
    } catch (error) {
      output.push({
        id: row.id,

        error:
          error instanceof Error
            ? error.message
            : "monitor error",
      });
    }
  }

  return output;
}

/**
 * محاسبه عملکرد
 */
function performance(
  rows: any[],
  from: Date
) {
  let count = 0;
  let wins = 0;
  let losses = 0;
  let partial = 0;
  let pnl = 0;

  for (const row of rows) {
    if (
      new Date(row.startedAt) <
      from
    ) {
      continue;
    }

    const metadata =
      activeMeta(
        row.metadata
      );

    if (!metadata) {
      continue;
    }

    const events =
      metadata.events ?? [];

    if (!events.length) {
      continue;
    }

    const net =
      events.reduce(
        (
          total,
          event
        ) =>
          total +
          num(
            event.pnlUsd
          ),
        0
      );

    const final =
      events[
        events.length - 1
      ];

    if (
      final.type === "TP3" ||
      final.type === "SL"
    ) {
      count++;

      pnl += net;

      if (net > 0) {
        wins++;
      } else {
        losses++;
      }

      if (
        final.type !== "TP3" &&
        events.some(
          (event) =>
            event.type.startsWith(
              "TP"
            )
        )
      ) {
        partial++;
      }
    }
  }

  return {
    signals: count,

    wins,

    losses,

    partial,

    winRate: count
      ? round(
          (wins / count) *
            100,
          2
        )
      : 0,

    pnlUsd: round(
      pnl,
      2
    ),
  };
}

/**
 * GET
 *
 * مثال:
 *
 * /api/ai-analysis?symbol=XAUUSD&timeframe=5min
 */
export async function GET(
  request: Request
) {
  const url =
    new URL(
      request.url
    );

  const cron =
    url.searchParams.get(
      "mode"
    ) === "cron";

  const session =
    await getSession();

  /**
   * احراز هویت
   */
  if (
    !cron &&
    !session?.userId
  ) {
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

  /**
   * بررسی Cron Secret
   */
  if (
    cron &&
    process.env
      .AI_ANALYSIS_CRON_SECRET &&
    request.headers.get(
      "x-cron-secret"
    ) !==
      process.env
        .AI_ANALYSIS_CRON_SECRET
  ) {
    return NextResponse.json(
      {
        error:
          "Cron secret نامعتبر است.",
      },
      {
        status: 401,
      }
    );
  }

  const userId =
    session?.userId ??
    url.searchParams.get(
      "userId"
    );

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "userId لازم است.",
      },
      {
        status: 400,
      }
    );
  }

  /**
   * نماد
   */
  const symbol = (
    url.searchParams.get(
      "symbol"
    ) ?? "EURUSD"
  ).toUpperCase();

  /**
   * تایم‌فریم
   */
  const timeframe =
    url.searchParams.get(
      "timeframe"
    ) ?? "1min";

  /**
   * فقط فارکس + طلا
   */
  if (
    !FX_SYMBOLS.includes(
      symbol
    )
  ) {
    return NextResponse.json(
      {
        error:
          "این موتور فقط فارکس و طلا را تحلیل می‌کند.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    /**
     * اول وضعیت تحلیل‌های قبلی
     * و TP/SL را بررسی می‌کنیم.
     */
    const monitored =
      await monitor(userId);

    /**
     * تحلیل جدید
     */
    const analysis =
      await analyze(
        symbol,
        timeframe
      );

    let generated: any =
      null;

    /**
     * فقط وقتی تحلیل معتبر شد
     * در دیتابیس ثبت و تلگرام ارسال شود.
     */
    if (
      analysis.direction !==
        "NO_TRADE" &&
      analysis.entry &&
      analysis.stopLoss &&
      analysis.tp1 &&
      analysis.tp2 &&
      analysis.tp3
    ) {
      /**
       * تحلیل فعال قبلی
       */
      const pending =
        await previousPending(
          userId,
          symbol
        );

      /**
       * جلوگیری از ارسال چند تحلیل
       * پشت سر هم
       */
      const recent =
        await prisma.analysisRun.findFirst(
          {
            where: {
              botId: null,

              startedAt: {
                gte: new Date(
                  Date.now() -
                    45 *
                      60000
                ),
              },
            },

            orderBy: {
              startedAt:
                "desc",
            },
          }
        );

      const recentMetadata =
        recent
          ? activeMeta(
              recent.metadata
            )
          : null;

      if (
        !pending &&
        !(
          recentMetadata?.userId ===
            userId &&
          recentMetadata.symbol ===
            symbol
        )
      ) {
        const metadata: Meta = {
          userId,

          kind: "AI_SCALP",

          symbol,

          direction:
            analysis.direction,

          entry:
            analysis.entry,

          stopLoss:
            analysis.stopLoss,

          tp1:
            analysis.tp1,

          tp2:
            analysis.tp2,

          tp3:
            analysis.tp3,

          lotSize:
            analysis.lotSize ??
            0.01,

          riskUsd: 4,

          actualRisk:
            analysis.actualRisk ??
            4,

          session:
            analysis.session,

          score:
            analysis.score,

          confirmations:
            analysis.confirmations,

          mtf:
            analysis.mtf,

          reasons:
            analysis.reasons,

          confirmationsList:
            analysis.confirmationsList,

          state: {
            tp1: false,
            tp2: false,
            tp3: false,
            sl: false,
          },

          events: [],

          lastPrice:
            analysis.price,
        };

        /**
         * ارسال Telegram
         */
        const telegram =
          await sendTelegram(
            analysis
          );

        /**
         * ثبت در دیتابیس
         */
        const row =
          await prisma.analysisRun.create(
            {
              data: {
                botId: null,

                symbol,

                timeframe:
                  analysis.timeframe,

                status:
                  "AI_PENDING",

                signalGenerated:
                  true,

                startedAt:
                  new Date(),

                metadata:
                  metadata as any,
              },
            }
          );

        generated = {
          id: row.id,

          telegram,
        };
      }
    }

    /**
     * تاریخچه 31 روز
     */
    const rows =
      await prisma.analysisRun.findMany(
        {
          where: {
            botId: null,

            startedAt: {
              gte: new Date(
                Date.now() -
                  31 *
                    86400000
              ),
            },
          },

          orderBy: {
            startedAt:
              "desc",
          },

          take: 500,
        }
      );

    const mine =
      rows.filter((row) => {
        const metadata =
          activeMeta(
            row.metadata
          );

        return (
          metadata?.userId ===
            userId &&
          metadata?.kind ===
            "AI_SCALP"
        );
      });

    const now =
      new Date();

    /**
     * روزانه
     */
    const day =
      new Date(now);

    day.setHours(
      0,
      0,
      0,
      0
    );

    /**
     * هفتگی
     */
    const week =
      new Date(day);

    week.setDate(
      week.getDate() -
        6
    );

    /**
     * ماهانه
     */
    const month =
      new Date(day);

    month.setDate(
      month.getDate() -
        29
    );

    return NextResponse.json({
      ok: true,

      engine:
        "AI_SCALPING_ANALYSIS",

      disclaimer:
        "تحلیل هوش مصنوعی است و سیگنال مستقیم یا تضمین سود نیست.",

      analysis,

      generated,

      monitored,

      performance: {
        daily:
          performance(
            mine,
            day
          ),

        weekly:
          performance(
            mine,
            week
          ),

        monthly:
          performance(
            mine,
            month
          ),
      },

      history:
        mine
          .slice(0, 20)
          .map((row) => ({
            id: row.id,

            startedAt:
              row.startedAt,

            status:
              row.status,

            metadata:
              row.metadata,
          })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "خطای تحلیل AI",
      },
      {
        status: 500,
      }
    );
  }
}
