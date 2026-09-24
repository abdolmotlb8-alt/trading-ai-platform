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

type Direction = "BUY" | "SELL";

type EventRecord = {
  type:
    | "TP1_HIT"
    | "TP2_HIT"
    | "TP3_HIT"
    | "SL_HIT"
    | "BREAKEVEN_HIT";

  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number | null;
  usdToToman: number | null;

  telegramStatus: "PENDING" | "SENT" | "FAILED";
  telegramMessageId?: string | null;
  telegramText?: string;

  note?: string;
};

type SignalMeta = {
  risk: {
    lotSize: number;
    stopLossDollars: number;
    tp1Dollars: number;
    tp2Dollars: number;
    tp3Dollars: number;
    contractSize: number;
  };

  levels: {
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
    breakEvenSl: number;
  };

  state: {
    tp1Hit: boolean;
    tp2Hit: boolean;
    tp3Hit: boolean;
    slHit: boolean;
    breakEvenArmed: boolean;
    breakEvenHit: boolean;
  };

  events: EventRecord[];

  lastPrice?: number;
  lastPriceAt?: string;
  lastPriceSource?: string;

  usdToToman?: number | null;
  usdToTomanAt?: string | null;

  session?: string;
};

const TD = "https://api.twelvedata.com";
const NETARZ = "https://netarz.ir/api/fx/v1";

const SYMBOL = "XAUUSD";
const TD_SYMBOL = "XAU/USD";

const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const REMAINING_AFTER_TP1 = 0.06;

const STOP_USD = 4;
const TP1_USD = 5;
const TP2_USD = 8;
const TP3_USD = 12;

const CONTRACT_SIZE = 100;

const MIN_SCORE = 70;
const MIN_CONFIRMATIONS = 2;

const ACTIVE_STATUSES = [
  "WAITING",
  "ACTIVE",
  "TP1_HIT",
  "TP2_HIT",
];

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v: number, d = 5) {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeSymbol(value: unknown) {
  return String(value ?? "")
    .replace(/[\/\s_-]/g, "")
    .toUpperCase();
}

function normalizeTf(value?: string | null) {
  const x = String(value ?? "15min")
    .toLowerCase()
    .replace("m", "min");

  if (x === "1h") return "1h";
  if (x === "2h") return "2h";
  if (x === "4h") return "4h";
  if (x === "8h") return "8h";
  if (x === "1d" || x === "1day") return "1day";

  if (["1min", "5min", "15min", "30min"].includes(x)) {
    return x;
  }

  return "15min";
}

function tdSymbol(symbol: string) {
  if (normalizeSymbol(symbol) === "XAUUSD") {
    return TD_SYMBOL;
  }

  const s = normalizeSymbol(symbol);

  if (s.length === 6) {
    return `${s.slice(0, 3)}/${s.slice(3)}`;
  }

  return symbol;
}

function parseObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

/* ---------------------------------------------------------
   TWELVE DATA
--------------------------------------------------------- */

async function td(
  endpoint: string,
  params: Record<string, string | number | boolean>,
) {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (!key) {
    throw new Error("TWELVE_DATA_API_KEY وجود ندارد.");
  }

  const url = new URL(`${TD}${endpoint}`);

  Object.entries({
    ...params,
    apikey: key,
  }).forEach(([keyName, value]) => {
    url.searchParams.set(keyName, String(value));
  });

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
          `Twelve Data HTTP ${response.status}`,
      ),
    );
  }

  return data;
}

async function getLivePrice(symbol = SYMBOL) {
  const data = await td("/price", {
    symbol: tdSymbol(symbol),
    dp: 5,
  });

  const price = num(data.price);

  if (!price) {
    throw new Error("قیمت لحظه‌ای XAUUSD دریافت نشد.");
  }

  return {
    price,
    source: "Twelve Data /price",
    at: new Date().toISOString(),
  };
}

async function getLatestBar(symbol = SYMBOL) {
  const data = await td("/time_series", {
    symbol: tdSymbol(symbol),
    interval: "1min",
    outputsize: 2,
    order: "desc",
    timezone: "UTC",
  });

  const row = data.values?.[0];

  if (!row) {
    throw new Error("کندل لحظه‌ای XAUUSD دریافت نشد.");
  }

  return {
    price: num(row.close),
    high: num(row.high),
    low: num(row.low),
    datetime: String(row.datetime),
  };
}

async function getCandles(
  symbol: string,
  interval: string,
  outputsize = 220,
): Promise<Candle[]> {
  const data = await td("/time_series", {
    symbol: tdSymbol(symbol),
    interval,
    outputsize,
    order: "asc",
    timezone: "UTC",
  });

  if (!Array.isArray(data.values) || data.values.length < 60) {
    throw new Error(
      `داده کافی برای ${symbol} در ${interval} دریافت نشد.`,
    );
  }

  return data.values
    .map((x: any) => ({
      datetime: String(x.datetime),
      open: num(x.open),
      high: num(x.high),
      low: num(x.low),
      close: num(x.close),
      volume:
        x.volume == null ? undefined : num(x.volume),
    }))
    .filter(
      (x: Candle) =>
        x.open > 0 &&
        x.high > 0 &&
        x.low > 0 &&
        x.close > 0,
    );
}

/* ---------------------------------------------------------
   INDICATORS
--------------------------------------------------------- */

function ema(values: number[], period: number) {
  if (values.length < period) return 0;

  let result = avg(values.slice(0, period));

  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    result =
      values[i] * multiplier +
      result * (1 - multiplier);
  }

  return result;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) gain += change;
    else loss -= change;
  }

  let averageGain = gain / period;
  let averageLoss = loss / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    averageGain =
      (averageGain * (period - 1) +
        (change > 0 ? change : 0)) /
      period;

    averageLoss =
      (averageLoss * (period - 1) +
        (change < 0 ? -change : 0)) /
      period;
  }

  if (averageLoss === 0) return 100;

  return (
    100 -
    100 / (1 + averageGain / averageLoss)
  );
}

function atr(candles: Candle[], period = 14) {
  if (candles.length <= period) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    trueRanges.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(
          candles[i].high -
            candles[i - 1].close,
        ),
        Math.abs(
          candles[i].low -
            candles[i - 1].close,
        ),
      ),
    );
  }

  return avg(trueRanges.slice(-period));
}

function macd(values: number[]) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);

  return {
    line: fast - slow,
  };
}

function swings(candles: Candle[]) {
  const recent = candles.slice(-80);

  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = 2; i < recent.length - 2; i++) {
    if (
      recent[i].high > recent[i - 1].high &&
      recent[i].high > recent[i - 2].high &&
      recent[i].high > recent[i + 1].high &&
      recent[i].high > recent[i + 2].high
    ) {
      highs.push(recent[i].high);
    }

    if (
      recent[i].low < recent[i - 1].low &&
      recent[i].low < recent[i - 2].low &&
      recent[i].low < recent[i + 1].low &&
      recent[i].low < recent[i + 2].low
    ) {
      lows.push(recent[i].low);
    }
  }

  return {
    resistance: Math.max(
      ...highs.slice(-5),
      recent[0]?.high ?? 0,
    ),

    support: Math.min(
      ...lows.slice(-5),
      recent[0]?.low ?? 0,
    ),
  };
}

function candlePattern(
  candles: Candle[],
  direction: Direction,
) {
  const previous =
    candles[candles.length - 2];

  const current =
    candles[candles.length - 1];

  const body = Math.abs(
    current.close - current.open,
  );

  const upper =
    current.high -
    Math.max(
      current.open,
      current.close,
    );

  const lower =
    Math.min(
      current.open,
      current.close,
    ) - current.low;

  const bullishEngulf =
    current.close > current.open &&
    previous.close < previous.open &&
    current.close > previous.open &&
    current.open < previous.close;

  const bearishEngulf =
    current.close < current.open &&
    previous.close > previous.open &&
    current.open > previous.close &&
    current.close < previous.open;

  const hammer =
    lower > body * 2 &&
    upper < Math.max(body, 0.01);

  const shootingStar =
    upper > body * 2 &&
    lower < Math.max(body, 0.01);

  if (
    direction === "BUY" &&
    (bullishEngulf || hammer)
  ) {
    return {
      ok: true,
      name: bullishEngulf
        ? "Bullish Engulfing"
        : "Hammer",
    };
  }

  if (
    direction === "SELL" &&
    (bearishEngulf || shootingStar)
  ) {
    return {
      ok: true,
      name: bearishEngulf
        ? "Bearish Engulfing"
        : "Shooting Star",
    };
  }

  return {
    ok: false,
    name: "No confirmation",
  };
}

/* ---------------------------------------------------------
   AI MARKET ANALYSIS
--------------------------------------------------------- */

async function analyze(
  symbol: string,
  timeframe: string,
) {
  const tf = normalizeTf(timeframe);

  const chain = [
    "4h",
    "1h",
    "15min",
    "5min",
    "1min",
  ];

  const results = await Promise.all(
    chain.map((x) =>
      getCandles(symbol, x, 180).catch(
        () => null,
      ),
    ),
  );

  const map: Record<string, Candle[]> = {};

  chain.forEach((name, index) => {
    if (results[index]) {
      map[name] = results[index]!;
    }
  });

  const main =
    map[tf] ??
    map["15min"] ??
    Object.values(map)[0];

  if (!main) {
    throw new Error(
      "هیچ داده‌ای برای تحلیل XAUUSD دریافت نشد.",
    );
  }

  const closes = main.map(
    (x) => x.close,
  );

  const last =
    main[main.length - 1];

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  const currentRsi = rsi(closes);
  const currentMacd = macd(closes);

  const currentAtr = atr(main);

  const structure = swings(main);

  const bullish =
    ema20 > ema50 &&
    last.close > ema20;

  const bearish =
    ema20 < ema50 &&
    last.close < ema20;

  const breakoutBuy =
    last.close >
    structure.resistance;

  const breakoutSell =
    last.close <
    structure.support;

  const sweepLow =
    last.low < structure.support &&
    last.close > structure.support;

  const sweepHigh =
    last.high > structure.resistance &&
    last.close < structure.resistance;

  const pullbackBuy =
    last.low <=
      ema20 + currentAtr * 0.35 &&
    last.close > ema20;

  const pullbackSell =
    last.high >=
      ema20 - currentAtr * 0.35 &&
    last.close < ema20;

  const volumes = main
    .map((x) => x.volume ?? 0)
    .slice(-21);

  const averageVolume =
    avg(volumes.slice(0, -1));

  const volumeOk =
    averageVolume > 0
      ? (last.volume ?? 0) >=
        averageVolume * 0.9
      : true;

  const buyCandle =
    candlePattern(main, "BUY");

  const sellCandle =
    candlePattern(main, "SELL");

  const mtf = [
    map["4h"],
    map["1h"],
    map["15min"],
    map["5min"],
  ]
    .filter(Boolean)
    .map((candles) => {
      const lastCandle =
        candles![candles!.length - 1];

      const values =
        candles!.map(
          (x) => x.close,
        );

      return lastCandle.close >
        ema(values, 20)
        ? 1
        : -1;
    });

  const buyVotes = [
    bullish,
    currentRsi > 50,
    currentMacd.line > 0,
    breakoutBuy ||
      sweepLow ||
      pullbackBuy,
    buyCandle.ok,
    volumeOk,
    mtf.filter((x) => x > 0)
      .length >= 2,
  ].filter(Boolean).length;

  const sellVotes = [
    bearish,
    currentRsi < 50,
    currentMacd.line < 0,
    breakoutSell ||
      sweepHigh ||
      pullbackSell,
    sellCandle.ok,
    volumeOk,
    mtf.filter((x) => x < 0)
      .length >= 2,
  ].filter(Boolean).length;

  const direction: Direction =
    buyVotes >= sellVotes
      ? "BUY"
      : "SELL";

  const confirmations =
    direction === "BUY"
      ? buyVotes
      : sellVotes;

  let score = 0;

  if (
    direction === "BUY"
      ? bullish
      : bearish
  ) {
    score += 18;
  }

  if (
    direction === "BUY"
      ? currentRsi > 50
      : currentRsi < 50
  ) {
    score += 12;
  }

  if (
    direction === "BUY"
      ? currentMacd.line > 0
      : currentMacd.line < 0
  ) {
    score += 12;
  }

  if (
    direction === "BUY"
      ? breakoutBuy || sweepLow
      : breakoutSell || sweepHigh
  ) {
    score += 16;
  }

  if (
    direction === "BUY"
      ? pullbackBuy
      : pullbackSell
  ) {
    score += 10;
  }

  if (
    direction === "BUY"
      ? buyCandle.ok
      : sellCandle.ok
  ) {
    score += 12;
  }

  if (volumeOk) {
    score += 8;
  }

  if (
    mtf.filter((x) =>
      direction === "BUY"
        ? x > 0
        : x < 0,
    ).length >= 2
  ) {
    score += 12;
  }

  score = clamp(
    Math.round(score),
    0,
    100,
  );

  return {
    direction,
    score,
    confirmations,
    entry: last.close,
    atr: currentAtr,
    support: structure.support,
    resistance:
      structure.resistance,

    signals: {
      trend:
        direction === "BUY"
          ? bullish
          : bearish,

      rsi: currentRsi,

      macd:
        currentMacd.line,

      breakout:
        direction === "BUY"
          ? breakoutBuy
          : breakoutSell,

      liquiditySweep:
        direction === "BUY"
          ? sweepLow
          : sweepHigh,

      pullback:
        direction === "BUY"
          ? pullbackBuy
          : pullbackSell,

      candle:
        direction === "BUY"
          ? buyCandle
          : sellCandle,

      volume: volumeOk,

      mtf,
    },

    reasons: [
      direction === "BUY" &&
      bullish
        ? "روند صعودی EMA"
        : direction === "SELL" &&
            bearish
          ? "روند نزولی EMA"
          : "ساختار EMA",

      `RSI ${round(currentRsi, 1)}`,

      direction === "BUY"
        ? currentMacd.line > 0
          ? "MACD مثبت"
          : "MACD منفی"
        : currentMacd.line < 0
          ? "MACD منفی"
          : "MACD مثبت",

      breakoutBuy ||
      breakoutSell
        ? "Breakout ساختاری"
        : sweepLow ||
            sweepHigh
          ? "Liquidity Sweep"
          : pullbackBuy ||
              pullbackSell
            ? "Pullback"
            : "ساختار قیمت",

      (
        direction === "BUY"
          ? buyCandle
          : sellCandle
      ).ok
        ? `الگوی کندلی ${
            (
              direction === "BUY"
                ? buyCandle
                : sellCandle
            ).name
          }`
        : "بدون تأیید کندلی",

      volumeOk
        ? "حجم قابل قبول"
        : "حجم ضعیف",

      "تأیید چندتایم‌فریمی",
    ],

    timeframe: tf,
  };
}

/* ---------------------------------------------------------
   SESSION
--------------------------------------------------------- */

function getSession() {
  const now = new Date();

  const hour =
    now.getUTCHours() +
    now.getUTCMinutes() / 60;

  const active: string[] = [];

  if (
    hour >= 21 ||
    hour < 6
  ) {
    active.push("🇦🇺 Sydney");
  }

  if (
    hour >= 0 &&
    hour < 9
  ) {
    active.push("🇯🇵 Tokyo");
  }

  if (
    hour >= 7 &&
    hour < 16
  ) {
    active.push("🇬🇧 London");
  }

  if (
    hour >= 13 &&
    hour < 22
  ) {
    active.push("🇺🇸 New York");
  }

  return active.length
    ? active.join(" · ")
    : "🌙 Market transition";
}

function iranTime() {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: "Asia/Tehran",
      dateStyle: "short",
      timeStyle: "medium",
      hour12: false,
    },
  ).format(new Date());
}

/* ---------------------------------------------------------
   FIXED GOLD PLAN
--------------------------------------------------------- */

function riskConfig() {
  return {
    lotSize: TOTAL_LOT,
    stopLossDollars: STOP_USD,
    tp1Dollars: TP1_USD,
    tp2Dollars: TP2_USD,
    tp3Dollars: TP3_USD,
    contractSize: CONTRACT_SIZE,
  };
}

function calculateLevels(
  entry: number,
  direction: Direction,
) {
  const slDistance =
    STOP_USD /
    (TOTAL_LOT * CONTRACT_SIZE);

  const tp1Distance =
    TP1_USD /
    (TP1_LOT * CONTRACT_SIZE);

  const tp2Distance =
    TP2_USD /
    (TP2_LOT * CONTRACT_SIZE);

  const tp3Distance =
    TP3_USD /
    (TP3_LOT * CONTRACT_SIZE);

  if (direction === "BUY") {
    return {
      sl: entry - slDistance,
      tp1: entry + tp1Distance,
      tp2: entry + tp2Distance,
      tp3: entry + tp3Distance,
      breakEvenSl: entry,
    };
  }

  return {
    sl: entry + slDistance,
    tp1: entry - tp1Distance,
    tp2: entry - tp2Distance,
    tp3: entry - tp3Distance,
    breakEvenSl: entry,
  };
}

/* ---------------------------------------------------------
   NETARZ
--------------------------------------------------------- */

async function getUsdToman() {
  const key =
    process.env.NETARZ_API_KEY;

  if (!key) {
    return {
      rate: null,
      asOf: null,
      error: "NETARZ_API_KEY missing",
    };
  }

  try {
    const response = await fetch(
      `${NETARZ}/rates/USD`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${key}`,
        },
      },
    );

    const body =
      await response
        .json()
        .catch(() => null);

    if (!response.ok || !body?.data) {
      return {
        rate: null,
        asOf:
          body?.meta?.as_of ??
          null,
        error:
          body?.error?.message ??
          `NetArz HTTP ${response.status}`,
      };
    }

    const rate = num(
      body.data.mid ??
        body.meta?.usd_irt,
    );

    return {
      rate:
        rate > 0 ? rate : null,
      asOf:
        body.meta?.as_of ??
        null,
      error:
        rate > 0
          ? null
          : "NetArz rate unavailable",
    };
  } catch (error) {
    return {
      rate: null,
      asOf: null,
      error:
        error instanceof Error
          ? error.message
          : "NetArz request failed",
    };
  }
}

/* ---------------------------------------------------------
   TELEGRAM
--------------------------------------------------------- */

async function sendTelegram(
  text: string,
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chat =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chat) {
    return {
      ok: false,
      error:
        "Telegram environment variables missing",
    };
  }

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
            chat_id: chat,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        },
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (
      !response.ok ||
      !data?.ok
    ) {
      return {
        ok: false,
        error:
          String(
            data?.description ??
              `Telegram HTTP ${response.status}`,
          ),
      };
    }

    return {
      ok: true,
      messageId: String(
        data.result.message_id,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Telegram request failed",
    };
  }
}

/* ---------------------------------------------------------
   META
--------------------------------------------------------- */

function readMeta(
  metadata: unknown,
): SignalMeta {
  const meta =
    parseObject(metadata);

  const rawRisk =
    parseObject(meta.risk);

  const rawLevels =
    parseObject(meta.levels);

  const rawState =
    parseObject(meta.state);

  return {
    risk: {
      ...riskConfig(),
      ...rawRisk,
    },

    levels: {
      sl: num(rawLevels.sl),
      tp1: num(rawLevels.tp1),
      tp2: num(rawLevels.tp2),
      tp3: num(rawLevels.tp3),
      breakEvenSl:
        num(rawLevels.breakEvenSl),
    },

    state: {
      tp1Hit: Boolean(
        rawState.tp1Hit,
      ),

      tp2Hit: Boolean(
        rawState.tp2Hit,
      ),

      tp3Hit: Boolean(
        rawState.tp3Hit,
      ),

      slHit: Boolean(
        rawState.slHit,
      ),

      breakEvenArmed:
        Boolean(
          rawState.breakEvenArmed,
        ),

      breakEvenHit:
        Boolean(
          rawState.breakEvenHit,
        ),
    },

    events: Array.isArray(
      meta.events,
    )
      ? (meta.events as EventRecord[])
      : [],

    lastPrice:
      num(meta.lastPrice) ||
      undefined,

    lastPriceAt:
      meta.lastPriceAt,

    lastPriceSource:
      meta.lastPriceSource,

    usdToToman:
      meta.usdToToman ?? null,

    usdToTomanAt:
      meta.usdToTomanAt,

    session:
      meta.session,
  };
}

/* ---------------------------------------------------------
   EVENT TELEGRAM TEXT
--------------------------------------------------------- */

function makeEventText(
  signal: any,
  type: EventRecord["type"],
  price: number,
  pnlUsd: number,
  pnlToman: number | null,
  usdRate: number | null,
  session: string,
  remainingLot: number,
) {
  const title =
    type === "TP1_HIT"
      ? "🎯 TP1 HIT"
      : type === "TP2_HIT"
        ? "🎯 TP2 HIT"
        : type === "TP3_HIT"
          ? "🎯 TP3 HIT"
          : type === "SL_HIT"
            ? "🛑 STOP LOSS HIT"
            : "🟡 BREAK-EVEN HIT";

  const toman =
    pnlToman == null
      ? "—"
      : `${pnlToman >= 0 ? "+" : "-"}${Math.abs(
          Math.round(pnlToman),
        ).toLocaleString(
          "fa-IR",
        )} تومان`;

  return [
    `<b>${title}</b>`,
    "",
    `🪙 <b>XAUUSD</b> · ${esc(
      String(signal.direction),
    )}`,

    `💵 قیمت برخورد: <b>${round(
      price,
      2,
    )}</b>`,

    `💰 P/L: <b>${
      pnlUsd >= 0 ? "+" : "-"
    }$${Math.abs(pnlUsd).toFixed(
      2,
    )}</b>`,

    `🇮🇷 تومان: <b>${toman}</b>`,

    usdRate
      ? `💱 دلار نِت اَرز: <b>${Math.round(
          usdRate,
        ).toLocaleString(
          "fa-IR",
        )} تومان</b>`
      : "💱 دلار نِت اَرز: <b>در دسترس نیست</b>",

    `📦 حجم باقی‌مانده: <b>${remainingLot.toFixed(
      2,
    )} lot</b>`,

    `🕒 ساعت ایران: <b>${iranTime()}</b>`,

    `🌐 سشن: <b>${esc(
      session,
    )}</b>`,

    `🆔 Signal: <code>${esc(
      String(signal.id),
    )}</code>`,

    type === "TP1_HIT"
      ? "\n🔐 استاپ 0.06 lot باقی‌مانده بلافاصله روی Entry منتقل شد."
      : type === "TP2_HIT"
        ? "\n⏳ TP3 هنوز در انتظار است."
        : type === "TP3_HIT"
          ? "\n✅ هر 3 تارگت تکمیل شدند."
          : type === "SL_HIT"
            ? pnlUsd === 0
              ? "\n🟡 استاپ بعد از TP1 روی Entry بود؛ زیان جدید $0."
              : "\n❌ معامله با Stop Loss بسته شد."
            : "\n🟡 استاپ باقی‌مانده روی Entry فعال شد.",
  ].join("\n");
}

/* ---------------------------------------------------------
   EVENT HELPERS
--------------------------------------------------------- */

function eventExists(
  meta: SignalMeta,
  type: string,
) {
  return meta.events.some(
    (event) =>
      event.type === type,
  );
}

async function deliverEvent(
  signal: any,
  meta: SignalMeta,
  event: EventRecord,
) {
  if (!event.telegramText) {
    return false;
  }

  const result =
    await sendTelegram(
      event.telegramText,
    );

  const index =
    meta.events.findIndex(
      (x) =>
        x.type === event.type &&
        x.at === event.at,
    );

  if (index === -1) {
    return false;
  }

  meta.events[index] = {
    ...meta.events[index],

    telegramStatus:
      result.ok
        ? "SENT"
        : "FAILED",

    telegramMessageId:
      result.ok
        ? result.messageId
        : null,

    note: result.ok
      ? meta.events[index].note
      : `${meta.events[index].note ?? ""} | ${result.error}`,
  };

  const chat =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (chat) {
    try {
      await prisma.telegramDelivery.create(
        {
          data: {
            signalId: signal.id,
            channelId: chat,
            messageId:
              result.ok
                ? result.messageId
                : null,
            status:
              result.ok
                ? "SENT"
                : "FAILED",
            errorMessage:
              result.ok
                ? null
                : result.error,
            sentAt:
              result.ok
                ? new Date()
                : null,
          },
        },
      );
    } catch {
      // Event is still saved inside signal metadata.
    }
  }

  return result.ok;
}

/* ---------------------------------------------------------
   MONITOR ONE SIGNAL
--------------------------------------------------------- */

async function monitorSignal(
  signal: any,
) {
  const candle =
    await getLatestBar(
      SYMBOL,
    );

  const live =
    await getLivePrice(
      SYMBOL,
    ).catch(() => ({
      price: candle.price,
      source:
        "Twelve Data /time_series",
      at: new Date().toISOString(),
    }));

  const price =
    live.price;

  const meta =
    readMeta(
      signal.metadata,
    );

  meta.lastPrice =
    price;

  meta.lastPriceAt =
    live.at;

  meta.lastPriceSource =
    live.source;

  meta.session =
    getSession();

  const fx =
    await getUsdToman();

  if (fx.rate) {
    meta.usdToToman =
      fx.rate;

    meta.usdToTomanAt =
      fx.asOf ??
      new Date().toISOString();
  }

  /*
   * Retry failed Telegram deliveries first.
   */
  for (
    const event of meta.events.filter(
      (x) =>
        x.telegramStatus ===
          "FAILED" ||
        x.telegramStatus ===
          "PENDING",
    )
  ) {
    await deliverEvent(
      signal,
      meta,
      event,
    );
  }

  const direction: Direction =
    String(
      signal.direction,
    ).toUpperCase() === "SELL"
      ? "SELL"
      : "BUY";

  const state =
    meta.state;

  const levels =
    meta.levels;

  const currentStop =
    state.breakEvenArmed
      ? levels.breakEvenSl
      : levels.sl;

  const stopHit =
    direction === "BUY"
      ? candle.low <=
          currentStop ||
        price <= currentStop
      : candle.high >=
          currentStop ||
        price >= currentStop;

  const tp1Hit =
    !state.tp1Hit &&
    (
      direction === "BUY"
        ? candle.high >=
            levels.tp1 ||
          price >= levels.tp1
        : candle.low <=
            levels.tp1 ||
          price <= levels.tp1
    );

  const tp2Hit =
    state.tp1Hit &&
    !state.tp2Hit &&
    (
      direction === "BUY"
        ? candle.high >=
            levels.tp2 ||
          price >= levels.tp2
        : candle.low <=
            levels.tp2 ||
          price <= levels.tp2
    );

  const tp3Hit =
    state.tp2Hit &&
    !state.tp3Hit &&
    (
      direction === "BUY"
        ? candle.high >=
            levels.tp3 ||
          price >= levels.tp3
        : candle.low <=
            levels.tp3 ||
          price <= levels.tp3
    );

  /*
   * SL has priority over TP inside an ambiguous
   * one-minute candle.
   */
  if (
    !state.slHit &&
    stopHit
  ) {
    const isBreakEven =
      state.breakEvenArmed;

    const pnlUsd =
      isBreakEven
        ? 0
        : -STOP_USD;

    const event: EventRecord = {
      type: isBreakEven
        ? "BREAKEVEN_HIT"
        : "SL_HIT",

      at: new Date().toISOString(),

      price: round(
        currentStop,
        5,
      ),

      lotClosed:
        isBreakEven
          ? REMAINING_AFTER_TP1
          : TOTAL_LOT,

      pnlUsd,

      pnlToman:
        fx.rate
          ? pnlUsd * fx.rate
          : null,

      usdToToman:
        fx.rate,

      telegramStatus:
        "PENDING",

      telegramMessageId:
        null,

      note:
        isBreakEven
          ? "TP1 hit and SL moved to Entry."
          : "Initial stop loss hit.",
    };

    event.telegramText =
      makeEventText(
        signal,
        event.type,
        event.price,
        event.pnlUsd,
        event.pnlToman,
        event.usdToToman,
        meta.session ??
          getSession(),
        0,
      );

    if (
      !eventExists(
        meta,
        event.type,
      )
    ) {
      meta.events.push(
        event,
      );
    }

    state.slHit = true;

    if (isBreakEven) {
      state.breakEvenHit =
        true;
    }
  }

  /*
   * TP1
   */
  else if (
    !state.slHit &&
    tp1Hit
  ) {
    const event: EventRecord = {
      type: "TP1_HIT",

      at: new Date().toISOString(),

      price: round(
        levels.tp1,
        5,
      ),

      lotClosed:
        TP1_LOT,

      pnlUsd:
        TP1_USD,

      pnlToman:
        fx.rate
          ? TP1_USD * fx.rate
          : null,

      usdToToman:
        fx.rate,

      telegramStatus:
        "PENDING",

      telegramMessageId:
        null,

      note:
        "TP1 hit. SL moved to Entry for remaining 0.06 lot.",
    };

    state.tp1Hit =
      true;

    state.breakEvenArmed =
      true;

    event.telegramText =
      makeEventText(
        signal,
        event.type,
        event.price,
        event.pnlUsd,
        event.pnlToman,
        event.usdToToman,
        meta.session ??
          getSession(),
        REMAINING_AFTER_TP1,
      );

    if (
      !eventExists(
        meta,
        "TP1_HIT",
      )
    ) {
      meta.events.push(
        event,
      );
    }
  }

  /*
   * TP2
   */
  else if (
    !state.slHit &&
    tp2Hit
  ) {
    const event: EventRecord = {
      type: "TP2_HIT",

      at: new Date().toISOString(),

      price: round(
        levels.tp2,
        5,
      ),

      lotClosed:
        TP2_LOT,

      pnlUsd:
        TP2_USD,

      pnlToman:
        fx.rate
          ? TP2_USD * fx.rate
          : null,

      usdToToman:
        fx.rate,

      telegramStatus:
        "PENDING",

      telegramMessageId:
        null,

      note:
        "TP2 hit. TP3 remains active.",
    };

    state.tp2Hit =
      true;

    event.telegramText =
      makeEventText(
        signal,
        event.type,
        event.price,
        event.pnlUsd,
        event.pnlToman,
        event.usdToToman,
        meta.session ??
          getSession(),
        TP3_LOT,
      );

    if (
      !eventExists(
        meta,
        "TP2_HIT",
      )
    ) {
      meta.events.push(
        event,
      );
    }
  }

  /*
   * TP3
   */
  else if (
    !state.slHit &&
    tp3Hit
  ) {
    const event: EventRecord = {
      type: "TP3_HIT",

      at: new Date().toISOString(),

      price: round(
        levels.tp3,
        5,
      ),

      lotClosed:
        TP3_LOT,

      pnlUsd:
        TP3_USD,

      pnlToman:
        fx.rate
          ? TP3_USD * fx.rate
          : null,

      usdToToman:
        fx.rate,

      telegramStatus:
        "PENDING",

      telegramMessageId:
        null,

      note:
        "TP3 hit. Full planned position completed.",
    };

    state.tp3Hit =
      true;

    event.telegramText =
      makeEventText(
        signal,
        event.type,
        event.price,
        event.pnlUsd,
        event.pnlToman,
        event.usdToToman,
        meta.session ??
          getSession(),
        0,
      );

    if (
      !eventExists(
        meta,
        "TP3_HIT",
      )
    ) {
      meta.events.push(
        event,
      );
    }
  }

  /*
   * STATUS
   */
  let status =
    "ACTIVE";

  let closedAt:
    | Date
    | undefined;

  if (
    state.slHit
  ) {
    status =
      state.breakEvenHit
        ? "CLOSED"
        : "SL_HIT";

    closedAt =
      new Date();
  } else if (
    state.tp3Hit
  ) {
    status =
      "CLOSED";

    closedAt =
      new Date();
  } else if (
    state.tp2Hit
  ) {
    status =
      "TP2_HIT";
  } else if (
    state.tp1Hit
  ) {
    status =
      "TP1_HIT";
  }

  /*
   * Persist BEFORE Telegram.
   * This prevents losing the event if Telegram fails.
   */
  await prisma.tradingSignal.update(
    {
      where: {
        id: signal.id,
      },

      data: {
        status,

        closedAt,

        stopLoss:
          state.breakEvenArmed
            ? levels.breakEvenSl
            : levels.sl,

        metadata:
          meta as any,
      },
    },
  );

  /*
   * Send every pending event.
   */
  for (
    const event of meta.events.filter(
      (x) =>
        x.telegramStatus ===
        "PENDING",
    )
  ) {
    await deliverEvent(
      signal,
      meta,
      event,
    );
  }

  /*
   * Persist Telegram SENT/FAILED status.
   */
  await prisma.tradingSignal.update(
    {
      where: {
        id: signal.id,
      },

      data: {
        metadata:
          meta as any,
      },
    },
  );

  return {
    signalId:
      signal.id,

    price,

    status,

    session:
      meta.session,

    events:
      meta.events.map(
        (event) => ({
          type:
            event.type,
          price:
            event.price,
          pnlUsd:
            event.pnlUsd,
          pnlToman:
            event.pnlToman,
          telegram:
            event.telegramStatus,
          at:
            event.at,
        }),
      ),
  };
}

/* ---------------------------------------------------------
   PERFORMANCE
--------------------------------------------------------- */

function calculatePerformance(
  signals: any[],
  from: Date,
) {
  let total = 0;
  let wins = 0;
  let losses = 0;

  let pnlUsd = 0;
  let pnlToman = 0;

  let hasToman = false;

  for (
    const signal of signals
  ) {
    const meta =
      readMeta(
        signal.metadata,
      );

    const events =
      meta.events.filter(
        (event) =>
          new Date(
            event.at,
          ).getTime() >=
          from.getTime(),
      );

    if (!events.length) {
      continue;
    }

    const hasTp =
      events.some(
        (event) =>
          event.type ===
            "TP1_HIT" ||
          event.type ===
            "TP2_HIT" ||
          event.type ===
            "TP3_HIT",
      );

    const finished =
      events.some(
        (event) =>
          event.type ===
            "SL_HIT" ||
          event.type ===
            "BREAKEVEN_HIT" ||
          event.type ===
            "TP3_HIT",
      );

    if (!finished) {
      continue;
    }

    total++;

    /*
     * اگر حداقل یکی از TPها خورده باشد،
     * معامله در کارنامه برد/مثبت محسوب می‌شود.
     */
    if (hasTp) {
      wins++;
    } else if (
      events.some(
        (event) =>
          event.type ===
          "SL_HIT",
      )
    ) {
      losses++;
    }

    /*
     * مهم:
     * همه TPها جمع می‌شوند.
     *
     * TP1 = +5
     * TP2 = +8
     * TP3 = +12
     *
     * Full TP = +25
     */
    for (
      const event of events
    ) {
      pnlUsd +=
        num(event.pnlUsd);

      if (
        event.pnlToman !=
        null
      ) {
        pnlToman +=
          num(
            event.pnlToman,
          );

        hasToman = true;
      }
    }
  }

  return {
    signals: total,

    wins,

    losses,

    winRate:
      total
        ? round(
            (wins / total) *
              100,
            2,
          )
        : 0,

    pnlUsd:
      round(
        pnlUsd,
        2,
      ),

    pnlToman:
      hasToman
        ? Math.round(
            pnlToman,
          )
        : null,
  };
}

/* ---------------------------------------------------------
   SCAN / CREATE SIGNAL
--------------------------------------------------------- */

async function scanUser(
  userId: string,
  requestedTf?: string,
) {
  const bots =
    await prisma.tradingBot.findMany(
      {
        where: {
          userId,

          isActive:
            true,

          botStatus: {
            in: [
              "RUNNING",
              "ACTIVE",
              "STARTED",
            ],
          },

          symbol: {
            in: [
              "XAUUSD",
              "XAU/USD",
              "xauusd",
              "xau/usd",
            ],
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },

        take: 20,
      },
    );

  const made: any[] = [];
  const errors: any[] = [];

  for (
    const bot of bots
  ) {
    try {
      const timeframe =
        normalizeTf(
          requestedTf ??
            bot.timeframe ??
            "15min",
        );

      const existing =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              botId:
                bot.id,

              symbol:
                SYMBOL,

              status: {
                in: ACTIVE_STATUSES,
              },
            },

            select: {
              id: true,
            },
          },
        );

      /*
       * تا وقتی یک سیگنال XAUUSD باز است،
       * سیگنال جدید تولید نمی‌شود.
       */
      if (existing) {
        continue;
      }

      const cooldown =
        Math.max(
          1,
          num(
            bot.cooldownMinutes,
            5,
          ),
        );

      const recent =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              botId:
                bot.id,

              symbol:
                SYMBOL,

              createdAt: {
                gte:
                  new Date(
                    Date.now() -
                      cooldown *
                        60000,
                  ),
              },
            },

            select: {
              id: true,
            },
          },
        );

      if (recent) {
        continue;
      }

      const analysis =
        await analyze(
          SYMBOL,
          timeframe,
        );

      /*
       * برای اولین فرصت معتبر:
       * حداقل 70 امتیاز و 2 تأیید.
       */
      if (
        analysis.score <
          MIN_SCORE ||
        analysis.confirmations <
          MIN_CONFIRMATIONS
      ) {
        continue;
      }

      if (
        analysis.direction ===
          "BUY" &&
        bot.buyEnabled ===
          false
      ) {
        continue;
      }

      if (
        analysis.direction ===
          "SELL" &&
        bot.sellEnabled ===
          false
      ) {
        continue;
      }

      const levels =
        calculateLevels(
          analysis.entry,
          analysis.direction,
        );

      const meta: SignalMeta = {
        risk:
          riskConfig(),

        levels,

        events: [],

        state: {
          tp1Hit:
            false,

          tp2Hit:
            false,

          tp3Hit:
            false,

          slHit:
            false,

          breakEvenArmed:
            false,

          breakEvenHit:
            false,
        },

        lastPrice:
          analysis.entry,

        lastPriceAt:
          new Date().toISOString(),

        lastPriceSource:
          "Twelve Data",

        session:
          getSession(),
      };

      const signal =
        await prisma.tradingSignal.create(
          {
            data: {
              userId,

              botId:
                bot.id,

              symbol:
                SYMBOL,

              timeframe,

              direction:
                analysis.direction,

              entry:
                analysis.entry,

              stopLoss:
                levels.sl,

              takeProfit:
                levels.tp3,

              riskReward:
                round(
                  TP3_USD /
                    STOP_USD,
                  2,
                ),

              score:
                analysis.score,

              confidence:
                analysis.score,

              status:
                "ACTIVE",

              source:
                "TWELVE_DATA_XAU_ENGINE",

              marketStructure:
                analysis.direction ===
                "BUY"
                  ? "Bullish"
                  : "Bearish",

              supportResistance:
                `S ${round(
                  analysis.support,
                  2,
                )} / R ${round(
                  analysis.resistance,
                  2,
                )}`,

              liquidity:
                analysis.signals
                  .liquiditySweep
                  ? "Liquidity sweep confirmed"
                  : "No sweep",

              pullback:
                analysis.signals
                  .pullback
                  ? "Pullback confirmed"
                  : "No pullback",

              candlePattern:
                analysis.signals
                  .candle.name,

              volumeConfirmation:
                analysis.signals
                  .volume
                  ? "Confirmed"
                  : "Weak",

              multiTimeframeConfirmation:
                "4H / 1H / 15M / 5M / 1M",

              sessionConfirmation:
                meta.session,

              volatilityConfirmation:
                analysis.atr > 0
                  ? `ATR ${round(
                      analysis.atr,
                      2,
                    )}`
                  : "ATR unavailable",

              newsConfirmation:
                "Analysis passed",

              confirmations:
                analysis.signals as any,

              reasons:
                analysis.reasons as any,

              metadata:
                meta as any,

              expiresAt:
                new Date(
                  Date.now() +
                    180 *
                      60000,
                ),
            },
          },
        );

      const fx =
        await getUsdToman();

      const message = [
        `🚨 <b>XAUUSD ${analysis.direction}</b>`,
        "",
        `🪙 نماد: <b>XAUUSD</b>`,

        `📦 حجم کل: <b>${TOTAL_LOT.toFixed(
          2,
        )} lot</b>`,

        `💵 Entry: <b>${round(
          analysis.entry,
          2,
        )}</b>`,

        `🛑 SL: <b>${round(
          levels.sl,
          2,
        )}</b> · -$${STOP_USD}`,

        `🎯 TP1: <b>${round(
          levels.tp1,
          2,
        )}</b> · +$${TP1_USD} · بستن ${TP1_LOT.toFixed(
          2,
        )} lot`,

        `🎯 TP2: <b>${round(
          levels.tp2,
          2,
        )}</b> · +$${TP2_USD} · بستن ${TP2_LOT.toFixed(
          2,
        )} lot`,

        `🎯 TP3: <b>${round(
          levels.tp3,
          2,
        )}</b> · +$${TP3_USD} · بستن ${TP3_LOT.toFixed(
          2,
        )} lot`,

        "",

        `🔐 بعد از TP1: SL برای <b>${REMAINING_AFTER_TP1.toFixed(
          2,
        )} lot</b> روی Entry می‌آید.`,

        `📊 Score: <b>${analysis.score}/100</b>`,

        `✅ Confirmations: <b>${analysis.confirmations}</b>`,

        `🌐 سشن: <b>${esc(
          meta.session ??
            getSession(),
        )}</b>`,

        `🕒 ساعت ایران: <b>${iranTime()}</b>`,

        `💱 دلار نِت اَرز: <b>${
          fx.rate
            ? `${Math.round(
                fx.rate,
              ).toLocaleString(
                "fa-IR",
              )} تومان`
            : "در دسترس نیست"
        }</b>`,

        "",

        "⚠️ سیگنال بر اساس داده بازار تولید شده است؛ اجرای بروکر می‌تواند به‌دلیل اسپرد و اسلیپیج متفاوت باشد.",
      ].join("\n");

      const telegram =
        await sendTelegram(
          message,
        );

      if (
        telegram.ok
      ) {
        await prisma.tradingSignal.update(
          {
            where: {
              id: signal.id,
            },

            data: {
              telegramSent:
                true,

              telegramMessageId:
                telegram.messageId,

              telegramSentAt:
                new Date(),

              metadata: {
                ...meta,

                usdToToman:
                  fx.rate,

                usdToTomanAt:
                  fx.asOf,
              } as any,
            },
          },
        );

        const chat =
          process.env
            .TELEGRAM_SIGNAL_CHAT_ID;

        if (chat) {
          await prisma.telegramDelivery.create(
            {
              data: {
                signalId:
                  signal.id,

                channelId:
                  chat,

                messageId:
                  telegram.messageId,

                status:
                  "SENT",

                sentAt:
                  new Date(),
              },
            },
          );
        }
      } else {
        /*
         * خود Signal باقی می‌ماند.
         * در اجرای بعدی دوباره می‌توان Telegram را retry کرد.
         */
        await prisma.tradingSignal.update(
          {
            where: {
              id: signal.id,
            },

            data: {
              metadata: {
                ...meta,

                telegramInitialStatus:
                  "FAILED",

                telegramInitialError:
                  telegram.error,

                usdToToman:
                  fx.rate,

                usdToTomanAt:
                  fx.asOf,
              } as any,
            },
          },
        );

        const chat =
          process.env
            .TELEGRAM_SIGNAL_CHAT_ID;

        if (chat) {
          await prisma.telegramDelivery.create(
            {
              data: {
                signalId:
                  signal.id,

                channelId:
                  chat,

                status:
                  "FAILED",

                errorMessage:
                  telegram.error,
              },
            },
          );
        }
      }

      made.push(
        signal,
      );
    } catch (error) {
      errors.push({
        botId:
          bot.id,

        symbol:
          SYMBOL,

        error:
          error instanceof
          Error
            ? error.message
            : "scan error",
      });
    }
  }

  return {
    bots:
      bots.length,

    made,

    errors,
  };
}

/* ---------------------------------------------------------
   MONITOR ALL ACTIVE SIGNALS
--------------------------------------------------------- */

async function monitorAllSignals() {
  const signals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          symbol:
            SYMBOL,

          status: {
            in: ACTIVE_STATUSES,
          },
        },

        include: {
          bot: true,
        },

        orderBy: {
          createdAt:
            "asc",
        },

        take: 200,
      },
    );

  const results: any[] = [];

  for (
    const signal of signals
  ) {
    try {
      results.push(
        await monitorSignal(
          signal,
        ),
      );
    } catch (error) {
      results.push({
        signalId:
          signal.id,

        error:
          error instanceof
          Error
            ? error.message
            : "monitor error",
      });
    }
  }

  return results;
}

/* ---------------------------------------------------------
   RETRY FAILED EVENT TELEGRAMS
--------------------------------------------------------- */

async function retryFailedEvents() {
  const signals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          symbol:
            SYMBOL,

          metadata: {
            not: null,
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },

        take: 200,
      },
    );

  const results: any[] = [];

  for (
    const signal of signals
  ) {
    try {
      const meta =
        readMeta(
          signal.metadata,
        );

      const pending =
        meta.events.filter(
          (event) =>
            event.telegramStatus ===
              "FAILED" ||
            event.telegramStatus ===
              "PENDING",
        );

      if (!pending.length) {
        continue;
      }

      for (
        const event of pending
      ) {
        await deliverEvent(
          signal,
          meta,
          event,
        );
      }

      await prisma.tradingSignal.update(
        {
          where: {
            id: signal.id,
          },

          data: {
            metadata:
              meta as any,
          },
        },
      );

      results.push({
        signalId:
          signal.id,

        retried:
          pending.length,
      });
    } catch (error) {
      results.push({
        signalId:
          signal.id,

        error:
          error instanceof
          Error
            ? error.message
            : "retry error",
      });
    }
  }

  return results;
}

/* ---------------------------------------------------------
   SCAN ALL USERS
--------------------------------------------------------- */

async function scanAllUsers() {
  const bots =
    await prisma.tradingBot.findMany(
      {
        where: {
          isActive:
            true,

          botStatus: {
            in: [
              "RUNNING",
              "ACTIVE",
              "STARTED",
            ],
          },

          symbol: {
            in: [
              "XAUUSD",
              "XAU/USD",
              "xauusd",
              "xau/usd",
            ],
          },
        },

        select: {
          userId: true,
        },

        distinct: [
          "userId",
        ],
      },
    );

  const results: any[] = [];

  for (
    const bot of bots
  ) {
    results.push({
      userId:
        bot.userId,

      result:
        await scanUser(
          bot.userId,
          "1min",
        ),
    });
  }

  return results;
}

/* ---------------------------------------------------------
   SERVER CRON
--------------------------------------------------------- */

function validCronRequest(
  request: Request,
) {
  const url =
    new URL(
      request.url,
    );

  if (
    url.searchParams.get(
      "cron",
    ) !== "1"
  ) {
    return false;
  }

  const secret =
    process.env
      .SIGNALS_CRON_SECRET ||
    process.env
      .AI_CRON_SECRET ||
    process.env
      .NEWS_CRON_SECRET;

  if (!secret) {
    return false;
  }

  const supplied =
    request.headers.get(
      "x-signals-cron-secret",
    ) ??
    request.headers.get(
      "x-ai-cron-secret",
    ) ??
    request.headers.get(
      "x-cron-secret",
    );

  return (
    supplied ===
    secret
  );
}

async function runServerEngine() {
  const retry =
    await retryFailedEvents();

  const monitored =
    await monitorAllSignals();

  const scanned =
    await scanAllUsers();

  const market =
    await getLivePrice(
      SYMBOL,
    ).catch(() => null);

  const fx =
    await getUsdToman();

  return {
    ok: true,

    serverSide:
      true,

    market: {
      symbol:
        SYMBOL,

      price:
        market?.price ??
        null,

      source:
        market?.source ??
        null,

      at:
        market?.at ??
        new Date().toISOString(),

      session:
        getSession(),

      iranTime:
        iranTime(),

      usdToToman:
        fx.rate,

      usdToTomanAt:
        fx.asOf,

      usdToTomanError:
        fx.error,
    },

    retry,

    monitored,

    scanned,
  };
}

/* ---------------------------------------------------------
   GET
--------------------------------------------------------- */

export async function GET(
  request: Request,
) {
  try {
    /*
     * SERVER-SIDE ENGINE
     */
    if (
      validCronRequest(
        request,
      )
    ) {
      return NextResponse.json(
        await runServerEngine(),
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * NORMAL USER REQUEST
     */
    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error:
            "احراز هویت لازم است.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      !process.env
        .TWELVE_DATA_API_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد.",
        },
        {
          status: 500,
        },
      );
    }

    const url =
      new URL(
        request.url,
      );

    const interval =
      url.searchParams.get(
        "interval",
      ) ?? undefined;

    const manualScan =
      url.searchParams.get(
        "scan",
      ) === "1";

    /*
     * Manual scan only creates a new signal.
     * Monitoring is owned by server cron.
     */
    if (manualScan) {
      await scanUser(
        session.userId,
        interval,
      );
    }

    const signals =
      await prisma.tradingSignal.findMany(
        {
          where: {
            userId:
              session.userId,

            symbol:
              SYMBOL,
          },

          include: {
            bot: {
              select: {
                name: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 100,
        },
      );

    const market =
      await getLivePrice(
        SYMBOL,
      );

    const fx =
      await getUsdToman();

    const now =
      new Date();

    const day =
      new Date(now);

    day.setHours(
      0,
      0,
      0,
      0,
    );

    const week =
      new Date(now);

    week.setDate(
      week.getDate() -
        6,
    );

    week.setHours(
      0,
      0,
      0,
      0,
    );

    const month =
      new Date(now);

    month.setDate(
      month.getDate() -
        29,
    );

    month.setHours(
      0,
      0,
      0,
      0,
    );

    return NextResponse.json(
      {
        ok: true,

        engine: {
          source:
            "Twelve Data",

          serverSideMonitoring:
            true,

          monitoredFromPage:
            false,
        },

        market: {
          symbol:
            SYMBOL,

          price:
            market.price,

          source:
            market.source,

          at:
            market.at,

          session:
            getSession(),

          iranTime:
            iranTime(),

          usdToToman:
            fx.rate,

          usdToTomanAt:
            fx.asOf,

          usdToTomanError:
            fx.error,
        },

        signals,

        performance: {
          daily:
            calculatePerformance(
              signals,
              day,
            ),

          weekly:
            calculatePerformance(
              signals,
              week,
            ),

          monthly:
            calculatePerformance(
              signals,
              month,
            ),
        },

        plan: {
          symbol:
            SYMBOL,

          totalLot:
            TOTAL_LOT,

          slUsd:
            STOP_USD,

          tp1Usd:
            TP1_USD,

          tp1Lot:
            TP1_LOT,

          tp2Usd:
            TP2_USD,

          tp2Lot:
            TP2_LOT,

          tp3Usd:
            TP3_USD,

          tp3Lot:
            TP3_LOT,

          remainingAfterTp1:
            REMAINING_AFTER_TP1,

          moveSlToEntry:
            true,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "خطای موتور سیگنال",
      },
      {
        status: 500,
      },
    );
  }
}
