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

  timeframe: "1min";

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

const FX_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
];

const TF = ["4h", "1h", "15min", "1min"] as const;

function num(value: unknown, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function avg(values: number[]) {
  if (!values.length) return 0;

  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number, digits = 5) {
  const p = 10 ** digits;

  return Math.round(value * p) / p;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function symbolApi(symbol: string) {
  const value = symbol.replace(/\s/g, "").toUpperCase();

  if (value.length === 6) {
    return `${value.slice(0, 3)}/${value.slice(3)}`;
  }

  return value;
}

function decimals(symbol: string) {
  return symbol.includes("JPY") ? 3 : 5;
}

/* -------------------------------------------------------
   Twelve Data
------------------------------------------------------- */

async function td(
  path: string,
  params: Record<string, string | number>
) {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (!key) {
    throw new Error(
      "TWELVE_DATA_API_KEY وجود ندارد."
    );
  }

  const url = new URL(TD + path);

  for (const [keyName, value] of Object.entries({
    ...params,
    apikey: key,
  })) {
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

async function candles(
  symbol: string,
  interval: string,
  outputsize = 180
): Promise<Candle[]> {
  const data = await td("/time_series", {
    symbol: symbolApi(symbol),
    interval,
    outputsize,
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
    .map((x: any) => ({
      datetime: String(x.datetime),
      open: num(x.open),
      high: num(x.high),
      low: num(x.low),
      close: num(x.close),
      volume:
        x.volume == null
          ? undefined
          : num(x.volume),
    }))
    .filter(
      (x: Candle) =>
        x.open &&
        x.high &&
        x.low &&
        x.close
    );
}

/* -------------------------------------------------------
   Indicators
------------------------------------------------------- */

function ema(values: number[], period: number) {
  if (values.length < period) return 0;

  let result = avg(values.slice(0, period));

  const multiplier = 2 / (period + 1);

  for (
    let i = period;
    i < values.length;
    i++
  ) {
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
    const difference =
      values[i] - values[i - 1];

    if (difference >= 0) {
      gain += difference;
    } else {
      loss -= difference;
    }
  }

  let averageGain = gain / period;
  let averageLoss = loss / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const difference =
      values[i] - values[i - 1];

    averageGain =
      ((averageGain * (period - 1)) +
        (difference > 0 ? difference : 0)) /
      period;

    averageLoss =
      ((averageLoss * (period - 1)) +
        (difference < 0 ? -difference : 0)) /
      period;
  }

  if (averageLoss === 0) return 100;

  return (
    100 -
    100 /
      (1 + averageGain / averageLoss)
  );
}

function atr(
  candlesData: Candle[],
  period = 14
) {
  if (candlesData.length <= period) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < candlesData.length; i++) {
    const current = candlesData[i];
    const previous = candlesData[i - 1];

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

function macd(values: number[]) {
  return (
    ema(values, 12) -
    ema(values, 26)
  );
}

/* -------------------------------------------------------
   Structure
------------------------------------------------------- */

function swings(candlesData: Candle[]) {
  const highs: number[] = [];
  const lows: number[] = [];

  for (
    let i = 2;
    i < candlesData.length - 2;
    i++
  ) {
    const current = candlesData[i];

    if (
      current.high >
        candlesData[i - 1].high &&
      current.high >
        candlesData[i - 2].high &&
      current.high >
        candlesData[i + 1].high &&
      current.high >
        candlesData[i + 2].high
    ) {
      highs.push(current.high);
    }

    if (
      current.low <
        candlesData[i - 1].low &&
      current.low <
        candlesData[i - 2].low &&
      current.low <
        candlesData[i + 1].low &&
      current.low <
        candlesData[i + 2].low
    ) {
      lows.push(current.low);
    }
  }

  const last =
    candlesData[candlesData.length - 1];

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

/* -------------------------------------------------------
   Candle confirmation
------------------------------------------------------- */

function candleConfirm(
  candlesData: Candle[],
  direction: "BUY" | "SELL"
) {
  const previous =
    candlesData[candlesData.length - 2];

  const current =
    candlesData[candlesData.length - 1];

  const body = Math.abs(
    current.close - current.open
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

/* -------------------------------------------------------
   Sessions
   Uses local business hours so DST is handled by
   Intl time zones.
------------------------------------------------------- */

function localHour(zone: string) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: zone,
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
      }
    ).formatToParts(new Date());

  const hour = Number(
    parts.find(
      (part) => part.type === "hour"
    )?.value ?? 0
  );

  const minute = Number(
    parts.find(
      (part) => part.type === "minute"
    )?.value ?? 0
  );

  return hour + minute / 60;
}

function sessionState(): SessionInfo[] {
  const definitions = [
    ["Australia/Sydney", "Sydney", "سیدنی"],
    ["Asia/Tokyo", "Tokyo", "توکیو"],
    ["Europe/London", "London", "لندن"],
    [
      "America/New_York",
      "New York",
      "نیویورک",
    ],
  ] as const;

  return definitions.map(
    ([zone, name, fa]) => {
      const hour = localHour(zone);

      return {
        name,
        fa,
        open: hour >= 8 && hour < 17,
      };
    }
  );
}

/* -------------------------------------------------------
   Economic news filter
------------------------------------------------------- */

async function newsCheck(
  symbol: string
) {
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
            currency: currencies[0],
          },
          {
            currency: currencies[1],
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

    reason:
      events.length > 0
        ? `خبر پرریسک نزدیک است: ${events[0].currency} ${events[0].event}`
        : "خبر پرریسک در پنجره فعلی پیدا نشد",
  };
}

/* -------------------------------------------------------
   Risk model

   Target:
   SL = $4
   TP1 = $5
   TP2 = $8
   TP3 = $12

   Volume is calculated from structural stop distance.
------------------------------------------------------- */

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
  const structureDistance =
    direction === "BUY"
      ? entry -
        supportResistance.support
      : supportResistance.resistance -
        entry;

  const minimumDistance = Math.max(
    atrValue * 0.15,
    entry * 0.00015
  );

  const maximumDistance =
    atrValue * 0.65;

  if (
    structureDistance <
      minimumDistance ||
    structureDistance >
      maximumDistance
  ) {
    return null;
  }

  const stopDistance = Math.max(
    structureDistance,
    atrValue * 0.18
  );

  const contractSize = 100000;

  let lot =
    4 /
    (stopDistance * contractSize);

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
    contractSize;

  const tp1Distance =
    5 / (lot * contractSize);

  const tp2Distance =
    8 / (lot * contractSize);

  const tp3Distance =
    12 / (lot * contractSize);

  return {
    entry,

    sl:
      direction === "BUY"
        ? entry - stopDistance
        : entry + stopDistance,

    tp1:
      direction === "BUY"
        ? entry + tp1Distance
        : entry - tp1Distance,

    tp2:
      direction === "BUY"
        ? entry + tp2Distance
        : entry - tp2Distance,

    tp3:
      direction === "BUY"
        ? entry + tp3Distance
        : entry - tp3Distance,

    lot,

    actual: actualRisk,

    rr:
      12 /
      Math.max(actualRisk, 0.01),
  };
}

/* -------------------------------------------------------
   Main AI analysis
------------------------------------------------------- */

async function analyze(
  symbol: string
): Promise<Analysis> {
  const data = await Promise.all(
    TF.map((timeframe) =>
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

  TF.forEach(
    (timeframe, index) => {
      market[timeframe] = data[index];
    }
  );

  const oneMinute =
    market["1min"];

  const last =
    oneMinute[
      oneMinute.length - 1
    ];

  const closes =
    oneMinute.map(
      (candle) => candle.close
    );

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  const rsiValue =
    rsi(closes, 14);

  const macdValue =
    macd(closes);

  const atrValue =
    atr(oneMinute, 14);

  const sr =
    swings(oneMinute);

  const sessions =
    sessionState();

  const activeSessions =
    sessions.filter(
      (session) => session.open
    );

  const session =
    activeSessions.length > 1
      ? activeSessions
          .map(
            (item) => item.fa
          )
          .join(" + ")
      : activeSessions[0]?.fa ??
        "خارج از سشن اصلی";

  const news =
    await newsCheck(symbol);

  /* MTF trend */

  const trendVotes =
    TF.slice(0, 3).map(
      (timeframe) => {
        const candlesData =
          market[timeframe];

        const current =
          candlesData[
            candlesData.length - 1
          ];

        const values =
          candlesData.map(
            (candle) =>
              candle.close
          );

        return current.close >
          ema(values, 20)
          ? 1
          : -1;
      }
    );

  const bullishMtf =
    trendVotes.filter(
      (value) => value > 0
    ).length;

  const bearishMtf =
    trendVotes.filter(
      (value) => value < 0
    ).length;

  /* Trend */

  const upTrend =
    ema20 > ema50 &&
    last.close > ema20;

  const downTrend =
    ema20 < ema50 &&
    last.close < ema20;

  /* Liquidity */

  const sweepLow =
    last.low < sr.support &&
    last.close > sr.support;

  const sweepHigh =
    last.high > sr.resistance &&
    last.close < sr.resistance;

  /* Pullback */

  const pullbackBuy =
    last.low <=
      ema20 + atrValue * 0.35 &&
    last.close > ema20;

  const pullbackSell =
    last.high >=
      ema20 - atrValue * 0.35 &&
    last.close < ema20;

  /* Candle */

  const buyCandle =
    candleConfirm(
      oneMinute,
      "BUY"
    );

  const sellCandle =
    candleConfirm(
      oneMinute,
      "SELL"
    );

  /* Tick volume */

  const volume =
    oneMinute
      .map(
        (candle) =>
          candle.volume ?? 0
      )
      .slice(-21);

  const averageVolume =
    avg(volume.slice(0, -1));

  const volumeConfirmed =
    averageVolume > 0
      ? (last.volume ?? 0) >=
        averageVolume * 0.9
      : false;

  /* BUY votes */

  const buyVotes = [
    upTrend,
    rsiValue > 50,
    macdValue > 0,
    bullishMtf >= 2,
    sweepLow || pullbackBuy,
    buyCandle.ok,
    volumeConfirmed,
    activeSessions.length > 0,
    !news.blocked,
  ].filter(Boolean).length;

  /* SELL votes */

  const sellVotes = [
    downTrend,
    rsiValue < 50,
    macdValue < 0,
    bearishMtf >= 2,
    sweepHigh || pullbackSell,
    sellCandle.ok,
    volumeConfirmed,
    activeSessions.length > 0,
    !news.blocked,
  ].filter(Boolean).length;

  let direction:
    | "BUY"
    | "SELL"
    | "NO_TRADE";

  if (buyVotes > sellVotes) {
    direction = "BUY";
  } else if (sellVotes > buyVotes) {
    direction = "SELL";
  } else {
    direction = "NO_TRADE";
  }

  const votes =
    direction === "BUY"
      ? buyVotes
      : direction === "SELL"
      ? sellVotes
      : Math.max(
          buyVotes,
          sellVotes
        );

  let score = Math.round(
    (votes / 9) * 100
  );

  if (activeSessions.length > 1) {
    score += 4;
  }

  if (
    bullishMtf >= 3 ||
    bearishMtf >= 3
  ) {
    score += 5;
  }

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

  const confirmationsList = [
    {
      name: "روند چند تایم‌فریمی",
      ok:
        direction === "BUY"
          ? bullishMtf >= 3
          : direction === "SELL"
          ? bearishMtf >= 3
          : false,
      value: `${Math.max(
        bullishMtf,
        bearishMtf
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
      name: "Liquidity sweep",
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
      name: "Candle confirmation",
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
      ok: volumeConfirmed,
      value: volumeConfirmed
        ? "Tick volume confirmed"
        : "Unavailable / not counted",
    },

    {
      name: "Session",
      ok:
        activeSessions.length >
        0,
      value: session,
    },

    {
      name: "News filter",
      ok: !news.blocked,
      value: news.reason,
    },
  ];

  const confirmations =
    confirmationsList.filter(
      (item) => item.ok
    ).length;

  let levels:
    | ReturnType<
        typeof makeLevels
      >
    | null = null;

  if (
    (direction === "BUY" ||
      direction === "SELL") &&
    score >= 88 &&
    confirmations >= 7 &&
    (
      direction === "BUY"
        ? bullishMtf
        : bearishMtf
    ) >= 3 &&
    activeSessions.length > 0 &&
    !news.blocked
  ) {
    levels = makeLevels(
      symbol,
      direction,
      last.close,
      atrValue,
      sr
    );
  }

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

    entry: levels?.entry,
    stopLoss: levels?.sl,

    tp1: levels?.tp1,
    tp2: levels?.tp2,
    tp3: levels?.tp3,

    lotSize: levels?.lot,
    actualRisk: levels?.actual,
    rr: levels?.rr,

    mtf: `${Math.max(
      bullishMtf,
      bearishMtf
    )}/3`,

    support: sr.support,
    resistance: sr.resistance,

    atr: atrValue,

    reasons,

    confirmationsList,

    candles:
      oneMinute.slice(-80),

    timeframe: "1min",

    newsBlocked:
      news.blocked,

    newsReason:
      news.reason,
  };
}

/* -------------------------------------------------------
   Telegram
------------------------------------------------------- */

async function sendTelegram(
  analysis: Analysis
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chat =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chat) {
    return {
      ok: false,
      error:
        "Telegram env missing",
    };
  }

  const buy =
    analysis.direction === "BUY";

  const icon = buy
    ? "🟢📈"
    : "🔻📉";

  const name = buy
    ? "BUY"
    : "SELL";

  const precision =
    decimals(
      analysis.symbol
    );

  const text = `
${icon} <b>AI ANALYSIS — ${name}</b>
━━━━━━━━━━━━━━
⚠️ <b>این تحلیل هوش مصنوعی است؛ سیگنال مستقیم یا تضمین سود نیست.</b>

📌 <b>${esc(
    analysis.symbol
  )}</b> · <b>1m Scalping</b>

🕒 Session:
<b>${esc(
    analysis.session
  )}</b>

🎯 Entry:
<b>${analysis.entry?.toFixed(
    precision
  )}</b>

🛑 SL:
<b>${analysis.stopLoss?.toFixed(
    precision
  )}</b>

💵 Risk target:
<b>-$4.00</b>

💵 Model risk:
<b>-${
    analysis.actualRisk?.toFixed(2) ??
    "—"
  }</b>

🟢 TP1:
<b>${analysis.tp1?.toFixed(
    precision
  )}</b> | +$5

🟢 TP2:
<b>${analysis.tp2?.toFixed(
    precision
  )}</b> | +$8

🟢 TP3:
<b>${analysis.tp3?.toFixed(
    precision
  )}</b> | +$12

━━━━━━━━━━━━━━

📊 Score:
<b>${analysis.score}/100</b>

✅ Confirmations:
<b>${analysis.confirmations}</b>

🧭 MTF:
<b>${analysis.mtf}</b>

💼 Lot:
<b>${
    analysis.lotSize?.toFixed(2) ??
    "—"
  }</b>

━━━━━━━━━━━━━━

<b>تاییدیه‌های فعال:</b>

${analysis.reasons
  .map(
    (reason) =>
      `✅ ${esc(reason)}`
  )
  .join("\n")}

━━━━━━━━━━━━━━

⚠️ ریسک هدف $4 است و حجم با حداقل 0.01 لات گرد می‌شود.

⚠️ این خروجی تحلیل بازار است و اجرای معامله توسط این بخش انجام نمی‌شود.
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
      messageId: String(
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

/* -------------------------------------------------------
   Existing AI analysis guard
------------------------------------------------------- */

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
                2 * 86400000
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
      metadata?.userId === userId &&
      metadata?.kind ===
        "AI_SCALP" &&
      metadata.symbol === symbol &&
      [
        "AI_PENDING",
        "AI_TP1",
        "AI_TP2",
      ].includes(row.status)
    );
  });
}

/* -------------------------------------------------------
   Monitor AI analysis
------------------------------------------------------- */

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
                8 * 3600000
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
      const data =
        await candles(
          metadata.symbol,
          "1min",
          2
        );

      const latest =
        data[data.length - 1];

      metadata.lastPrice =
        latest.close;

      let hit = "";

      if (
        !metadata.state.sl &&
        (
          metadata.direction ===
          "BUY"
            ? latest.low <=
              metadata.stopLoss
            : latest.high >=
              metadata.stopLoss
        )
      ) {
        hit = "SL";
      } else if (
        !metadata.state.tp1 &&
        (
          metadata.direction ===
          "BUY"
            ? latest.high >=
              metadata.tp1
            : latest.low <=
              metadata.tp1
        )
      ) {
        hit = "TP1";
      } else if (
        metadata.state.tp1 &&
        !metadata.state.tp2 &&
        (
          metadata.direction ===
          "BUY"
            ? latest.high >=
              metadata.tp2
            : latest.low <=
              metadata.tp2
        )
      ) {
        hit = "TP2";
      } else if (
        metadata.state.tp2 &&
        !metadata.state.tp3 &&
        (
          metadata.direction ===
          "BUY"
            ? latest.high >=
              metadata.tp3
            : latest.low <=
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

        const price =
          hit === "SL"
            ? metadata.stopLoss
            : hit === "TP1"
            ? metadata.tp1
            : hit === "TP2"
            ? metadata.tp2
            : metadata.tp3;

        metadata.events.push({
          type: hit,
          price,
          pnlUsd: pnl,
          at: new Date().toISOString(),
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
                : `AI_${hit}`,

              finishedAt:
                closed
                  ? new Date()
                  : undefined,

              metadata:
                metadata as any,
            },
          }
        );

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

${esc(
            metadata.symbol
          )} · ${
            metadata.direction
          }

🎯 Price:
<b>${price}</b>

💵 Stage P/L:
<b>${
            pnl >= 0 ? "+" : ""
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
                parse_mode: "HTML",
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

/* -------------------------------------------------------
   Performance
------------------------------------------------------- */

function performance(
  rows: any[],
  from: Date
) {
  let signals = 0;
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
        (sum, event) =>
          sum +
          num(event.pnlUsd),
        0
      );

    const final =
      events[events.length - 1];

    if (
      final.type === "TP3" ||
      final.type === "SL"
    ) {
      signals++;

      pnl += net;

      if (net > 0) {
        wins++;
      } else {
        losses++;
      }

      if (
        final.type !== "TP3" &&
        events.some((event) =>
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
    signals,
    wins,
    losses,
    partial,

    winRate:
      signals
        ? round(
            (wins / signals) *
              100,
            2
          )
        : 0,

    pnlUsd:
      round(pnl, 2),
  };
}

/* -------------------------------------------------------
   GET
------------------------------------------------------- */

export async function GET(
  request: Request
) {
  const url =
    new URL(request.url);

  const cron =
    url.searchParams.get(
      "mode"
    ) === "cron";

  const session =
    await getSession();

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

  const symbol =
    (
      url.searchParams.get(
        "symbol"
      ) ?? "EURUSD"
    ).toUpperCase();

  if (
    !FX_SYMBOLS.includes(symbol)
  ) {
    return NextResponse.json(
      {
        error:
          "این موتور فقط جفت‌ارزهای فارکس را تحلیل می‌کند.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    /* First monitor previous AI analyses */

    const monitored =
      await monitor(userId);

    /* Then analyze current market */

    const analysis =
      await analyze(symbol);

    let generated:
      | {
          id: string;
          telegram: any;
        }
      | null = null;

    /*
      Very strict gate.

      No Telegram alert unless:
      - score >= 88
      - confirmations >= 7
      - 3/3 MTF agreement
      - active session
      - no high-impact news
      - valid structural risk model
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
      const pending =
        await previousPending(
          userId,
          symbol
        );

      const recent =
        await prisma.analysisRun.findFirst(
          {
            where: {
              botId: null,

              startedAt: {
                gte: new Date(
                  Date.now() -
                    45 * 60000
                ),
              },
            },

            orderBy: {
              startedAt: "desc",
            },
          }
        );

      const recentMeta =
        recent
          ? activeMeta(
              recent.metadata
            )
          : null;

      const sameUserRecent =
        recentMeta?.userId ===
          userId &&
        recentMeta.symbol ===
          symbol;

      if (
        !pending &&
        !sameUserRecent
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
            analysis.lotSize ?? 0.01,

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

        /*
          Send only confirmed AI analysis
          to Telegram.
        */

        const telegram =
          await sendTelegram(
            analysis
          );

        const row =
          await prisma.analysisRun.create(
            {
              data: {
                botId: null,

                symbol,

                timeframe:
                  "1min",

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

    /*
      Performance history.
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
            startedAt: "desc",
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

    const day =
      new Date(now);

    day.setHours(
      0,
      0,
      0,
      0
    );

    const week =
      new Date(day);

    week.setDate(
      week.getDate() - 6
    );

    const month =
      new Date(day);

    month.setDate(
      month.getDate() - 29
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
