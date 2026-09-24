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

function round(value: number, decimals = 5) {
  const p = 10 ** decimals;
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
    .replace(/"/g, "&quot;");
}

function symbolApi(symbol: string) {
  const clean = symbol.replace(/\s/g, "").toUpperCase();

  if (clean.length === 6) {
    return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  }

  return clean;
}

function decimals(symbol: string) {
  return symbol.includes("JPY") ? 3 : 5;
}

async function td(
  path: string,
  params: Record<string, string | number>
) {
  const key = process.env.TWELVE_DATA_API_KEY;

  if (!key) {
    throw new Error("TWELVE_DATA_API_KEY وجود ندارد.");
  }

  const url = new URL(TD + path);

  const finalParams = {
    ...params,
    apikey: key,
  };

  for (const [keyName, value] of Object.entries(finalParams)) {
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

function atr(candlesData: Candle[], period = 14) {
  if (candlesData.length <= period) return 0;

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

function localHour(zone: string) {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
    }).formatToParts(new Date());

  const hour = Number(
    parts.find(
      (item) => item.type === "hour"
    )?.value ?? 0
  );

  const minute = Number(
    parts.find(
      (item) => item.type === "minute"
    )?.value ?? 0
  );

  return hour + minute / 60;
}

function sessionState(): SessionInfo[] {
  const definitions = [
    ["Asia/Sydney", "Sydney"],
    ["Asia/Tokyo", "Tokyo"],
    ["Europe/London", "London"],
    ["America/New_York", "New York"],
  ] as const;

  return definitions.map(
    ([zone, name]) => {
      const hour = localHour(zone);

      return {
        name,
        fa:
          name === "Sydney"
            ? "سیدنی"
            : name === "Tokyo"
            ? "توکیو"
            : name === "London"
            ? "لندن"
            : "نیویورک",
        open:
          hour >= 8 &&
          hour < 17,
      };
    }
  );
}

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

function makeLevels(
  symbol: string,
  direction: "BUY" | "SELL",
  entry: number,
  atrValue: number,
  sr: {
    support: number;
    resistance: number;
  }
) {
  const structure =
    direction === "BUY"
      ? entry - sr.support
      : sr.resistance - entry;

  const minimum =
    Math.max(
      atrValue * 0.15,
      entry * 0.00015
    );

  const maximum =
    atrValue * 0.65;

  if (
    structure < minimum ||
    structure > maximum
  ) {
    return null;
  }

  const stopDistance =
    Math.max(
      structure,
      atrValue * 0.18
    );

  const contractSize = 100000;

  let lot =
    4 /
    (stopDistance * contractSize);

  lot =
    Math.floor(lot * 100) /
    100;

  if (lot < 0.01) lot = 0.01;
  if (lot > 0.05) return null;

  const actualRisk =
    stopDistance *
    lot *
    contractSize;

  const tp1Distance =
    5 /
    (lot * contractSize);

  const tp2Distance =
    8 /
    (lot * contractSize);

  const tp3Distance =
    12 /
    (lot * contractSize);

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
      Math.max(
        actualRisk,
        0.01
      ),
  };
}

async function analyze(
  symbol: string
): Promise<Analysis> {
  const data =
    await Promise.all(
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
      market[timeframe] =
        data[index];
    }
  );

  const main =
    market["1min"];

  const last =
    main[main.length - 1];

  const closes =
    main.map(
      (item) => item.close
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

  const structure =
    swings(main);

  const sessions =
    sessionState();

  const activeSessions =
    sessions.filter(
      (item) => item.open
    );

  const currentSession =
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

  const trendVotes =
    TF.slice(0, 3).map(
      (timeframe) => {
        const candlesData =
          market[timeframe];

        const candle =
          candlesData[
            candlesData.length - 1
          ];

        const timeframeCloses =
          candlesData.map(
            (item) => item.close
          );

        return candle.close >
          ema(timeframeCloses, 20)
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

  const bullishTrend =
    ema20 > ema50 &&
    last.close > ema20;

  const bearishTrend =
    ema20 < ema50 &&
    last.close < ema20;

  const liquidityLow =
    last.low <
      structure.support &&
    last.close >
      structure.support;

  const liquidityHigh =
    last.high >
      structure.resistance &&
    last.close <
      structure.resistance;

  const pullbackBuy =
    last.low <=
      ema20 + atrValue * 0.35 &&
    last.close > ema20;

  const pullbackSell =
    last.high >=
      ema20 - atrValue * 0.35 &&
    last.close < ema20;

  const candleBuy =
    candleConfirm(
      main,
      "BUY"
    );

  const candleSell =
    candleConfirm(
      main,
      "SELL"
    );

  const volumes =
    main
      .map(
        (item) =>
          item.volume ?? 0
      )
      .slice(-21);

  const averageVolume =
    avg(
      volumes.slice(0, -1)
    );

  const volumeConfirmed =
    averageVolume <= 0
      ? false
      : (last.volume ?? 0) >=
        averageVolume * 0.9;

  const buyScore =
    [
      bullishTrend,
      rsiValue > 50,
      macdValue > 0,
      bullishMtf >= 2,
      liquidityLow ||
        pullbackBuy,
      candleBuy.ok,
      volumeConfirmed,
      activeSessions.length > 0,
      !news.blocked,
    ].filter(Boolean).length;

  const sellScore =
    [
      bearishTrend,
      rsiValue < 50,
      macdValue < 0,
      bearishMtf >= 2,
      liquidityHigh ||
        pullbackSell,
      candleSell.ok,
      volumeConfirmed,
      activeSessions.length > 0,
      !news.blocked,
    ].filter(Boolean).length;

  let direction: Analysis["direction"] =
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

  let score =
    Math.round(
      (votes / 9) * 100
    );

  if (
    activeSessions.length > 1
  ) {
    score += 4;
  }

  if (
    bullishMtf >= 3 ||
    bearishMtf >= 3
  ) {
    score += 5;
  }

  if (
    (liquidityLow ||
      liquidityHigh) &&
    (pullbackBuy ||
      pullbackSell)
  ) {
    score += 4;
  }

  score = clamp(
    score,
    0,
    100
  );

  const confirmations = [
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
          ? bullishTrend
          : direction === "SELL"
          ? bearishTrend
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
          ? liquidityLow
          : direction === "SELL"
          ? liquidityHigh
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
          ? candleBuy.ok
          : direction === "SELL"
          ? candleSell.ok
          : false,
      value:
        direction === "BUY"
          ? candleBuy.name
          : candleSell.name,
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
        activeSessions.length > 0,
      value: currentSession,
    },

    {
      name: "News filter",
      ok: !news.blocked,
      value: news.reason,
    },
  ];

  const goodConfirmations =
    confirmations.filter(
      (item) => item.ok
    ).length;

  const finalDirection =
    direction;

  let levels:
    | ReturnType<typeof makeLevels>
    | null = null;

  if (
    (finalDirection === "BUY" ||
      finalDirection === "SELL") &&
    score >= 88 &&
    goodConfirmations >= 7 &&
    (
      finalDirection === "BUY"
        ? bullishMtf
        : bearishMtf
    ) >= 3 &&
    activeSessions.length > 0 &&
    !news.blocked
  ) {
    levels =
      makeLevels(
        symbol,
        finalDirection,
        last.close,
        atrValue,
        structure
      );
  }

  if (!levels) {
    direction = "NO_TRADE";
  }

  const reasons =
    confirmations
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
    confirmations:
      goodConfirmations,
    session: currentSession,
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
      bullishMtf,
      bearishMtf
    )}/3`,
    support:
      structure.support,
    resistance:
      structure.resistance,
    atr: atrValue,
    reasons,
    confirmationsList:
      confirmations,
    candles:
      main.slice(-80),
    timeframe: "1min",
    newsBlocked:
      news.blocked,
    newsReason:
      news.reason,
  };
}

/*
 * مهم:
 * این تابع همان چیزی است که خطای Render
 * Cannot find name 'activeMeta'
 * مربوط به آن بود.
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
      error: "Telegram env missing",
    };
  }

  const isBuy =
    analysis.direction === "BUY";

  const icon = isBuy
    ? "🟢📈"
    : "🔻📉";

  const name = isBuy
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

💰 Risk target:
<b>-$4.00</b>

📊 Model risk:
<b>-$${analysis.actualRisk?.toFixed(
    2
  )}</b>

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

💼 Lot model:
<b>${analysis.lotSize?.toFixed(
    2
  )}</b>

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

  return rows.find(
    (row) => {
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
        ].includes(
          row.status
        )
      );
    }
  );
}

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
      metadata.userId !==
        userId
    ) {
      continue;
    }

    try {
      const latest =
        await candles(
          metadata.symbol,
          "1min",
          2
        );

      const candle =
        latest[
          latest.length - 1
        ];

      metadata.lastPrice =
        candle.close;

      let hit = "";

      if (
        !metadata.state.sl &&
        (
          metadata.direction ===
          "BUY"
            ? candle.low <=
              metadata.stopLoss
            : candle.high >=
              metadata.stopLoss
        )
      ) {
        hit = "SL";
      } else if (
        !metadata.state.tp1 &&
        (
          metadata.direction ===
          "BUY"
            ? candle.high >=
              metadata.tp1
            : candle.low <=
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
            ? candle.high >=
              metadata.tp2
            : candle.low <=
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
            ? candle.high >=
              metadata.tp3
            : candle.low <=
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
          at: new Date().toISOString(),
        });

        if (hit === "SL") {
          metadata.state.sl =
            true;
        }

        if (hit === "TP1") {
          metadata.state.tp1 =
            true;
        }

        if (hit === "TP2") {
          metadata.state.tp2 =
            true;
        }

        if (hit === "TP3") {
          metadata.state.tp3 =
            true;
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

${esc(metadata.symbol)} · ${metadata.direction}

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
          total: number,
          event: {
            pnlUsd?: number;
          }
        ) =>
          total +
          num(
            event.pnlUsd
          ),
        0
      );

    const finalEvent =
      events[
        events.length - 1
      ];

    if (
      finalEvent.type ===
        "TP3" ||
      finalEvent.type ===
        "SL"
    ) {
      count++;

      pnl += net;

      if (net > 0) {
        wins++;
      } else {
        losses++;
      }

      if (
        finalEvent.type !==
          "TP3" &&
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
    winRate:
      count
        ? round(
            (wins / count) *
              100,
            2
          )
        : 0,
    pnlUsd:
      round(pnl, 2),
  };
}

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
    !FX_SYMBOLS.includes(
      symbol
    )
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
    const monitored =
      await monitor(
        userId
      );

    const analysis =
      await analyze(
        symbol
      );

    let generated:
      | {
          id: string;
          telegram: any;
        }
      | null = null;

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

      const recentMeta =
        recent
          ? activeMeta(
              recent.metadata
            )
          : null;

      if (
        !pending &&
        !(
          recentMeta?.userId ===
            userId &&
          recentMeta.symbol ===
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

    const now = new Date();

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
