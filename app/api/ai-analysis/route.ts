import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.10;
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;

const TOTAL_POTENTIAL_USD = 80;

const STOP_DISTANCE =
  STOP_USD / (TOTAL_LOT * CONTRACT_SIZE);

const TP1_DISTANCE =
  TP1_USD / (TP1_LOT * CONTRACT_SIZE);

const TP2_DISTANCE =
  TP2_USD / (TP2_LOT * CONTRACT_SIZE);

const TP3_DISTANCE =
  TP3_USD / (TP3_LOT * CONTRACT_SIZE);

const DEFAULT_NEWS_MINUTES = 30;
const SCORE_TO_SIGNAL = 85;

const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

const NETARZ_KEY = process.env.NETARZ_API_KEY;

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

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Direction = "BUY" | "SELL";

type SessionName = keyof typeof SESSIONS;

type EventRecord = {
  type:
    | "TP1"
    | "TP2"
    | "TP3"
    | "SL"
    | "BREAKEVEN";

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

function num(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : Number(v);

  return Number.isFinite(n)
    ? n
    : 0;
}

function round(
  v: number,
  digits = 2,
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
  return `${new Intl.NumberFormat(
    "fa-IR",
  ).format(Math.round(v))} تومان`;
}

function formatUsd(v: number) {
  return `$${new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(v)}`;
}

function fmtPrice(v: number) {
  return v.toFixed(2);
}

function currentSession(
  date = new Date(),
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
  date = new Date(),
) {
  const h = date.getUTCHours();

  const d = new Date(date);

  if (
    name === "Sydney" &&
    h < 6
  ) {
    d.setUTCDate(
      d.getUTCDate() - 1,
    );
  }

  return `${name}-${d
    .toISOString()
    .slice(0, 10)}`;
}

function sessionEndReached(
  name: SessionName,
  date = new Date(),
) {
  const end =
    SESSIONS[name].end;

  return (
    date.getUTCHours() === end &&
    date.getUTCMinutes() < 2
  );
}

async function td(url: string) {
  if (!TD_KEY) {
    throw new Error(
      "TWELVE_DATA_API_KEY تنظیم نشده است.",
    );
  }

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(TD_KEY)}`;

  const r = await fetch(full, {
    cache: "no-store",
  });

  const data = await r.json();

  if (
    !r.ok ||
    data?.status === "error" ||
    data?.code
  ) {
    throw new Error(
      data?.message ||
        `Twelve Data error ${r.status}`,
    );
  }

  return data;
}

async function candles(
  interval: string,
  outputsize: number,
): Promise<Candle[]> {
  const data =
    await td(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
        SYMBOL,
      )}&interval=${interval}&outputsize=${outputsize}&order=ASC&timezone=UTC`,
    );

  if (
    !Array.isArray(data?.values)
  ) {
    throw new Error(
      `داده کندل ${interval} دریافت نشد.`,
    );
  }

  return data.values
    .map((x: any) => ({
      datetime: String(
        x.datetime,
      ),

      open: num(x.open),

      high: num(x.high),

      low: num(x.low),

      close: num(x.close),

      volume: num(x.volume),
    }))
    .filter(
      (x: Candle) =>
        x.close > 0,
    )
    .sort(
      (
        a: Candle,
        b: Candle,
      ) =>
        a.datetime.localeCompare(
          b.datetime,
        ),
    );
}

async function latestPrice() {
  const data =
    await td(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
        SYMBOL,
      )}`,
    );

  const p = num(
    data?.price,
  );

  if (!p) {
    throw new Error(
      "قیمت لحظه‌ای XAU/USD دریافت نشد.",
    );
  }

  return p;
}

function sma(
  values: number[],
  period: number,
) {
  if (
    values.length < period
  ) {
    return values.at(-1) ?? 0;
  }

  const slice =
    values.slice(-period);

  return (
    slice.reduce(
      (a, b) => a + b,
      0,
    ) / period
  );
}

function ema(
  values: number[],
  period: number,
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
  period = 14,
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
      (1 +
        gain / loss)
  );
}

function atr(
  c: Candle[],
  period = 14,
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
            c[i - 1].close,
        ),

        Math.abs(
          c[i].low -
            c[i - 1].close,
        ),
      ),
    );
  }

  return sma(
    tr,
    period,
  );
}

function macd(
  values: number[],
) {
  const fast =
    ema(values, 12);

  const slow =
    ema(values, 26);

  return fast - slow;
}

function swings(
  c: Candle[],
  lookback = 20,
) {
  const s =
    c.slice(-lookback);

  return {
    support: Math.min(
      ...s.map(
        (x) => x.low,
      ),
    ),

    resistance: Math.max(
      ...s.map(
        (x) => x.high,
      ),
    ),
  };
}

function candleBias(
  c: Candle[],
) {
  const a = c.at(-2);
  const b = c.at(-1);

  if (!a || !b) {
    return 0;
  }

  const body =
    Math.abs(
      b.close -
        b.open,
    );

  const range =
    Math.max(
      b.high -
        b.low,
      0.0001,
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
  c: Candle[],
): {
  direction:
    | Direction
    | null;

  score: number;

  ema20: number;

  ema50: number;

  rsi: number;

  macd: number;
} {
  const closes =
    c.map(
      (x) => x.close,
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
      direction: "BUY",
      score: 25,
      ema20: e20,
      ema50: e50,
      rsi: r,
      macd: m,
    };
  }

  if (sell) {
    return {
      direction: "SELL",
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

function analyzeMarket(
  m1: Candle[],
  m5: Candle[],
  m15: Candle[],
  h1: Candle[],
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
      Boolean,
    ) as Direction[];

  const buyVotes =
    directions.filter(
      (x) => x === "BUY",
    ).length;

  const sellVotes =
    directions.filter(
      (x) => x === "SELL",
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
      `روند چندتایم‌فریم: ${direction}`,
    );
  }

  if (
    direction &&
    t1.direction ===
      direction
  ) {
    score += 10;

    reasons.push(
      "روند 1 دقیقه همسو است",
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
      "15m و 1h هم‌جهت هستند",
    );
  }

  const last =
    m5.at(-1)?.close ??
    0;

  const s =
    swings(
      m5,
      30,
    );

  const a =
    atr(m5);

  const nearSupport =
    direction ===
      "BUY" &&
    last -
      s.support <=
      Math.max(
        a * 1.5,
        8,
      );

  const nearResistance =
    direction ===
      "SELL" &&
    s.resistance -
      last <=
      Math.max(
        a * 1.5,
        8,
      );

  if (
    nearSupport ||
    nearResistance
  ) {
    score += 10;

    reasons.push(
      "قیمت نزدیک ناحیه ساختاری معتبر است",
    );
  }

  const cb =
    candleBias(m5);

  if (
    (
      direction ===
        "BUY" &&
      cb > 0
    ) ||
    (
      direction ===
        "SELL" &&
      cb < 0
    )
  ) {
    score += 10;

    reasons.push(
      "تأیید کندلی",
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
            x.volume,
        ),
      20,
    );

  if (
    volume > 0 &&
    avgVol > 0 &&
    volume >=
      avgVol * 1.05
  ) {
    score += 5;

    reasons.push(
      "حجم بالاتر از میانگین",
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
      "مومنتوم خرید",
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
      "مومنتوم فروش",
    );
  }

  if (
    direction &&
    (
      (
        direction ===
          "BUY" &&
        last >
          t5.ema20
      ) ||
      (
        direction ===
          "SELL" &&
        last <
          t5.ema20
      )
    )
  ) {
    score += 10;

    reasons.push(
      "قیمت نسبت به EMA20 در جای مناسب است",
    );
  }

  if (
    direction &&
    Math.abs(
      s.resistance -
        s.support,
    ) >=
      a * 2
  ) {
    score += 5;

    reasons.push(
      "دامنه ساختاری کافی",
    );
  }

  return {
    direction,

    score: Math.min(
      score,
      100,
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

async function newsBlock() {
  const now =
    new Date();

  const until =
    new Date(
      now.getTime() +
        DEFAULT_NEWS_MINUTES *
          60_000,
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
      },
    );

  return events;
}

async function getUsdToTomanRate() {
  if (!NETARZ_KEY) {
    throw new Error(
      "برای تبدیل واقعی دلار به تومان، NETARZ_API_KEY را در Render اضافه کنید. سیستم نرخ آزمایشی ندارد.",
    );
  }

  const r =
    await fetch(
      "https://netarz.ir/api/fx/v1/rates?codes=USD",
      {
        headers: {
          Authorization:
            `Bearer ${NETARZ_KEY}`,
        },

        cache:
          "no-store",
      },
    );

  const data =
    await r.json();

  if (!r.ok) {
    throw new Error(
      data?.error
        ?.message ||
        "دریافت نرخ واقعی دلار به تومان ناموفق بود.",
    );
  }

  const row =
    Array.isArray(
      data?.data,
    )
      ? data.data.find(
          (x: any) =>
            x.code ===
            "USD",
        )
      : null;

  const rate =
    num(
      row?.mid ??
        data?.meta
          ?.usd_irt,
    );

  if (!rate) {
    throw new Error(
      "نرخ واقعی USD/IRR از سرویس نرخ ارز دریافت نشد.",
    );
  }

  return {
    rate: Math.round(
      rate,
    ),

    asOf:
      row?.as_of ??
      data?.meta
        ?.as_of ??
      new Date().toISOString(),
  };
}

function levels(
  entry: number,
  direction: Direction,
) {
  if (
    direction ===
    "BUY"
  ) {
    return {
      stopLoss: round(
        entry -
          STOP_DISTANCE,
      ),

      tp1: round(
        entry +
          TP1_DISTANCE,
      ),

      tp2: round(
        entry +
          TP2_DISTANCE,
      ),

      tp3: round(
        entry +
          TP3_DISTANCE,
      ),
    };
  }

  return {
    stopLoss: round(
      entry +
        STOP_DISTANCE,
    ),

    tp1: round(
      entry -
        TP1_DISTANCE,
    ),

    tp2: round(
      entry -
        TP2_DISTANCE,
    ),

    tp3: round(
      entry -
        TP3_DISTANCE,
    ),
  };
}

function hit(
  direction: Direction,
  price: number,
  target: number,
) {
  return direction ===
    "BUY"
    ? price >= target
    : price <= target;
}

function stopHit(
  direction: Direction,
  price: number,
  stop: number,
) {
  return direction ===
    "BUY"
    ? price <= stop
    : price >= stop;
}

function eventPnl(
  type: EventRecord["type"],
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

  return {
    lotClosed: 0,
    pnlUsd: 0,
  };
}

async function sendTelegram(
  text: string,
) {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (
    !token ||
    !chatId
  ) {
    throw new Error(
      "تنظیمات Telegram کامل نیست.",
    );
  }

  const r =
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          {
            chat_id:
              chatId,

            text,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              true,
          },
        ),
      },
    );

  const data =
    await r.json();

  if (
    !r.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.description ||
        "Telegram send failed",
    );
  }

  return String(
    data.result
      ?.message_id ??
      "",
  );
}

function buildSignalTelegram(
  meta: RunMeta,
  rateAsOf: string,
) {
  return [
    "🤖 <b>این تحلیل هوش مصنوعی است</b>",

    "⚠️ این پیام سیگنال قطعی یا تضمین سود نیست؛ داده بازار و محاسبات مدل را نشان می‌دهد.",

    "",

    `🟡 <b>طلا XAUUSD</b> | ${
      meta.direction ===
      "BUY"
        ? "🟢 BUY"
        : "🔴 SELL"
    }`,

    `🕐 سشن: <b>${meta.session}</b>`,

    `📊 تایم‌فریم تحلیل: <b>${meta.timeframe}</b>`,

    `⭐ امتیاز: <b>${meta.score}/100</b> | تأییدها: <b>${meta.confirmations}</b>`,

    "",

    `🎯 ورود: <b>${fmtPrice(meta.entry)}</b>`,

    `📏 محدوده مجاز ورود: <b>${fmtPrice(
      meta.entry - 1,
    )}</b> تا <b>${fmtPrice(
      meta.entry + 1,
    )}</b>`,

    "⚠️ ورود خارج از محدوده ±1 دلار نسبت به قیمت اعلام‌شده، دیگر ورود مطابق این تحلیل محسوب نمی‌شود.",

    `🛑 استاپ: <b>${fmtPrice(
      meta.stopLoss,
    )}</b> | ریسک: <b>${formatUsd(
      meta.riskUsd,
    )}</b> | 🇮🇷 ${formatToman(
      meta.riskToman,
    )}`,

    `🎯 TP1: <b>${fmtPrice(
      meta.tp1,
    )}</b> | ${
      meta.tp1Lot.toFixed(
        2,
      )
    } lot | +${formatUsd(
      meta.tp1Usd,
    )} | 🇮🇷 ${formatToman(
      meta.tp1Toman,
    )}`,

    `🎯 TP2: <b>${fmtPrice(
      meta.tp2,
    )}</b> | ${
      meta.tp2Lot.toFixed(
        2,
      )
    } lot | +${formatUsd(
      meta.tp2Usd,
    )} | 🇮🇷 ${formatToman(
      meta.tp2Toman,
    )}`,

    `🎯 TP3: <b>${fmtPrice(
      meta.tp3,
    )}</b> | ${
      meta.tp3Lot.toFixed(
        2,
      )
    } lot | +${formatUsd(
      meta.tp3Usd,
    )} | 🇮🇷 ${formatToman(
      meta.tp3Toman,
    )}`,

    `📦 حجم کل: <b>${meta.totalLot.toFixed(
      2,
    )} lot</b>`,

    `💰 پتانسیل کل: <b>+${formatUsd(
      meta.totalPotentialUsd,
    )}</b> | 🇮🇷 ${formatToman(
      meta.totalPotentialToman,
    )}`,

    `💱 نرخ واقعی دلار: <b>${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      meta.usdToToman,
    )} تومان</b>`,

    `🕒 نرخ در: ${rateAsOf}`,

    "",

    "🔐 بعد از TP1: بستن 0.04 lot و پیشنهاد انتقال SL به نقطه ورود برای 0.06 lot باقی‌مانده.",

    "📌 TP2: بستن 0.03 lot دیگر و حفظ سود مراحل قبلی.",

    "🏆 TP3: بستن 0.03 lot نهایی و تکمیل ساختار معامله.",

    "⚠️ این سیستم به بروکر متصل نیست و معامله را اجرا نمی‌کند؛ فقط تحلیل، ثبت رویداد و اطلاع‌رسانی انجام می‌دهد.",
  ].join("\n");
}

function buildEventTelegram(
  meta: RunMeta,
  event: EventRecord,
) {
  const title =
    event.type ===
    "TP1"
      ? "🎯 TP1 HIT"
      : event.type ===
          "TP2"
        ? "🎯 TP2 HIT"
        : event.type ===
            "TP3"
          ? "🏆 TP3 HIT"
          : event.type ===
              "BREAKEVEN"
            ? "🔐 BREAKEVEN HIT"
            : "🛑 STOP LOSS HIT";

  const advice =
    event.type ===
    "TP1"
      ? "بعد از TP1: 0.04 lot بسته شد؛ برای 0.06 lot باقی‌مانده SL به نقطه ورود منتقل شود."
      : event.type ===
          "TP2"
        ? "TP2 رسید؛ 0.03 lot دیگر بسته شد. برای 0.03 lot باقی‌مانده SL در نقطه ورود قرار دارد."
        : event.type ===
            "TP3"
          ? "کل اهداف تکمیل شد؛ 0.03 lot نهایی بسته شد."
          : event.type ===
              "BREAKEVEN"
            ? "قیمت به نقطه ورود برگشت؛ بخش باقی‌مانده در BE بسته شد و سود مراحل قبلی حفظ شد."
            : "استاپ فعال شد و معامله با زیان مدل‌شده بسته شد.";

  return [
    "🤖 <b>این تحلیل هوش مصنوعی است</b>",

    title,

    `🟡 XAUUSD | ${
      meta.direction ===
      "BUY"
        ? "🟢 BUY"
        : "🔴 SELL"
    } | سشن ${meta.session}`,

    `📌 ورود: ${fmtPrice(
      meta.entry,
    )} | قیمت رویداد: ${fmtPrice(
      event.price,
    )}`,

    `📦 حجم بسته‌شده: ${event.lotClosed.toFixed(
      2,
    )} lot`,

    `💵 نتیجه این مرحله: <b>${
      event.pnlUsd >= 0
        ? "+"
        : ""
    }${formatUsd(
      event.pnlUsd,
    )}</b>`,

    `🇮🇷 نتیجه: <b>${formatToman(
      event.pnlToman,
    )}</b>`,

    `💱 نرخ واقعی دلار: ${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      event.usdToToman,
    )} تومان`,

    advice,
  ].join("\n");
}

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
      },
    );

  return rows[0] ?? null;
}

async function scan(
  userId?: string,
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

  const news =
    await newsBlock();

  if (news.length) {
    return {
      created: false,
      reason:
        "high_impact_news",

      news: news.map(
        (x) => ({
          event:
            x.event,

          currency:
            x.currency,

          time:
            x.eventTime,
        }),
      ),
    };
  }

  const [
    m1,
    m5,
    m15,
    h1,
  ] =
    await Promise.all([
      candles(
        "1min",
        120,
      ),

      candles(
        "5min",
        100,
      ),

      candles(
        "15min",
        80,
      ),

      candles(
        "1h",
        60,
      ),
    ]);

  const analysis =
    analyzeMarket(
      m1,
      m5,
      m15,
      h1,
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
          },
        },
      },
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

  const entry =
    m1.at(-1)?.close ||
    m5.at(-1)?.close ||
    0;

  const lv =
    levels(
      entry,
      analysis.direction,
    );

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
        "fixed_stop_not_structurally_safe",

      score:
        analysis.score,

      structureDistance:
        round(
          structureDistance,
        ),
    };
  }

  const fx =
    await getUsdToTomanRate();

  const now =
    new Date();

  const session =
    currentSession(now);

  const confirmations =
    Math.max(
      5,
      Math.round(
        analysis.score /
          15,
      ),
    );

  const meta: RunMeta = {
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
          fx.rate,
      ),

    tp1Toman:
      toman(
        TP1_USD *
          fx.rate,
      ),

    tp2Toman:
      toman(
        TP2_USD *
          fx.rate,
      ),

    tp3Toman:
      toman(
        TP3_USD *
          fx.rate,
      ),

    totalPotentialToman:
      toman(
        TOTAL_POTENTIAL_USD *
          fx.rate,
      ),

    session,

    score:
      analysis.score,

    confirmations,

    timeframe:
      "5min + MTF 15min/1h/1min",

    state:
      "AI_PENDING",

    breakeven:
      false,

    currentPrice:
      entry,

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
            now,

          metadata:
            meta as any,
        },
      },
    );

  try {
    const messageId =
      await sendTelegram(
        buildSignalTelegram(
          meta,
          fx.asOf,
        ),
      );

    meta.analysis = {
      ...meta.analysis,

      telegramMessageId:
        messageId,
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
      },
    );
  } catch (e) {
    meta.analysis = {
      ...meta.analysis,

      telegramError:
        e instanceof Error
          ? e.message
          : String(e),
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
      },
    );
  }

  return {
    created: true,

    id: created.id,

    meta,
  };
}

async function monitorOne(
  run: any,
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
    priceAtHit: number,
  ) => {
    const base =
      eventPnl(type);

    const event:
      EventRecord = {
      type,

      at:
        new Date().toISOString(),

      price:
        round(priceAtHit),

      lotClosed:
        base.lotClosed,

      pnlUsd:
        base.pnlUsd,

      pnlToman:
        toman(
          base.pnlUsd *
            fx.rate,
        ),

      usdToToman:
        fx.rate,
    };

    meta.events.push(
      event,
    );

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

    if (
      type === "TP3"
    ) {
      meta.state =
        "AI_TP3";
    }

    if (
      type === "SL"
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

    try {
      await sendTelegram(
        buildEventTelegram(
          meta,
          event,
        ),
      );
    } catch (e) {
      meta.analysis = {
        ...meta.analysis,

        telegramError:
          e instanceof Error
            ? e.message
            : String(e),
      };
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

          finishedAt:
            new Date(),
        },
      },
    );

    return event;
  };

  if (
    meta.state ===
      "AI_PENDING" &&
    stopHit(
      meta.direction,
      price,
      meta.stopLoss,
    )
  ) {
    return push(
      "SL",
      price,
    );
  }

  if (
    meta.state ===
      "AI_PENDING" &&
    hit(
      meta.direction,
      price,
      meta.tp1,
    )
  ) {
    return push(
      "TP1",
      price,
    );
  }

  if (
    meta.state ===
      "AI_TP1" &&
    stopHit(
      meta.direction,
      price,
      meta.entry,
    )
  ) {
    return push(
      "BREAKEVEN",
      price,
    );
  }

  if (
    meta.state ===
      "AI_TP1" &&
    hit(
      meta.direction,
      price,
      meta.tp2,
    )
  ) {
    return push(
      "TP2",
      price,
    );
  }

  if (
    meta.state ===
      "AI_TP2" &&
    stopHit(
      meta.direction,
      price,
      meta.entry,
    )
  ) {
    return push(
      "BREAKEVEN",
      price,
    );
  }

  if (
    meta.state ===
      "AI_TP2" &&
    hit(
      meta.direction,
      price,
      meta.tp3,
    )
  ) {
    return push(
      "TP3",
      price,
    );
  }

  return {
    price,
    state:
      meta.state,
  };
}

function eventTotals(
  rows: any[],
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
      row.metadata as RunMeta;

    if (
      !meta?.events
    ) {
      continue;
    }

    out.trades++;

    let final:
      string | null =
      null;

    for (
      const e of meta.events
    ) {
      if (
        e.type === "TP1"
      ) {
        out.tp1++;

        out.tp1Toman +=
          e.pnlToman;
      }

      if (
        e.type === "TP2"
      ) {
        out.tp2++;

        out.tp2Toman +=
          e.pnlToman;
      }

      if (
        e.type === "TP3"
      ) {
        out.tp3++;

        out.tp3Toman +=
          e.pnlToman;
      }

      if (
        e.type === "SL"
      ) {
        out.sl++;

        out.slToman +=
          e.pnlToman;
      }

      if (
        e.type === "TP1" ||
        e.type === "TP2" ||
        e.type === "TP3" ||
        e.type === "SL" ||
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
      final ===
        "TP3" ||
      final ===
        "BREAKEVEN"
    ) {
      out.wins++;
    }

    if (
      final === "SL"
    ) {
      out.losses++;
    }

    if (
      final ===
      "BREAKEVEN"
    ) {
      out.breakeven++;
    }
  }

  return {
    ...out,

    tp1Toman:
      Math.round(
        out.tp1Toman,
      ),

    tp2Toman:
      Math.round(
        out.tp2Toman,
      ),

    tp3Toman:
      Math.round(
        out.tp3Toman,
      ),

    slToman:
      Math.round(
        out.slToman,
      ),

    pnlUsd:
      money(
        out.pnlUsd,
      ),

    pnlToman:
      Math.round(
        out.pnlToman,
      ),
  };
}

function startOfPeriod(
  kind:
    | "day"
    | "week"
    | "month",
) {
  const d =
    new Date();

  d.setUTCHours(
    0,
    0,
    0,
    0,
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
        1,
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
                  "day",
                ),
            },

            signalGenerated:
              true,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },
      ),

      prisma.analysisRun.findMany(
        {
          where: {
            symbol:
              DISPLAY_SYMBOL,

            createdAt: {
              gte:
                startOfPeriod(
                  "week",
                ),
            },

            signalGenerated:
              true,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },
      ),

      prisma.analysisRun.findMany(
        {
          where: {
            symbol:
              DISPLAY_SYMBOL,

            createdAt: {
              gte:
                startOfPeriod(
                  "month",
                ),
            },

            signalGenerated:
              true,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },
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
        },
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
        (r) => ({
          id:
            r.id,

          createdAt:
            r.createdAt,

          status:
            r.status,

          metadata:
            r.metadata,
        }),
      ),
  };
}

async function sessionReport(
  name: SessionName,
) {
  const now =
    new Date();

  const key =
    sessionKey(
      name,
      now,
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
      },
    );

  const already =
    reports.find(
      (r) =>
        (r.metadata as any)
          ?.key === key,
    );

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
      },
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
            m?.createdAt ||
              r.createdAt,
          );

        return (
          sessionKey(
            name,
            created,
          ) === key
        );
      },
    );

  if (already) {
    return {
      sent: false,
      reason:
        "already_sent",
    };
  }

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

  const winLike =
    totals.tp1 +
    totals.tp2 +
    totals.tp3;

  const loss =
    totals.sl;

  const msg = [
    "🤖 <b>کارنامه پایان سشن — تحلیل هوش مصنوعی</b>",

    `🟡 XAUUSD | <b>${name}</b>`,

    `📅 ${key}`,

    "",

    `📊 تعداد معاملات: <b>${totals.trades}</b>`,

    `🎯 TP1: <b>${totals.tp1}</b> مورد = ${formatUsd(
      totals.tp1 *
        TP1_USD,
    )} | 🇮🇷 ${formatToman(
      totals.tp1Toman,
    )}`,

    `🎯 TP2: <b>${totals.tp2}</b> مورد = ${formatUsd(
      totals.tp2 *
        TP2_USD,
    )} | 🇮🇷 ${formatToman(
      totals.tp2Toman,
    )}`,

    `🏆 TP3: <b>${totals.tp3}</b> مورد = ${formatUsd(
      totals.tp3 *
        TP3_USD,
    )} | 🇮🇷 ${formatToman(
      totals.tp3Toman,
    )}`,

    `🛑 SL: <b>${loss}</b> مورد = -${formatUsd(
      loss *
        STOP_USD,
    )} | 🇮🇷 ${formatToman(
      totals.slToman,
    )}`,

    "",

    `📈 برد/مثبت: <b>${winLike}</b>`,

    `📉 باخت استاپ: <b>${loss}</b>`,

    `💰 خالص سشن: <b>${
      totals.pnlUsd >= 0
        ? "+"
        : ""
    }${formatUsd(
      totals.pnlUsd,
    )}</b>`,

    `🇮🇷 خالص سشن: <b>${
      totals.pnlToman >= 0
        ? "+"
        : "-"
    }${formatToman(
      Math.abs(
        totals.pnlToman,
      ),
    )}</b>`,

    `💱 نرخ واقعی دلار در زمان گزارش: <b>${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      fx.rate,
    )} تومان</b>`,

    "",

    "⚠️ اعداد P/L بر اساس حجم 0.10 lot و قرارداد 100oz برای XAUUSD و رویدادهای ثبت‌شده توسط سیستم هستند؛ اجرای واقعی بروکر می‌تواند به‌علت اسپرد، کمیسیون و اسلیپیج متفاوت باشد.",
  ].join("\n");

  let telegramMessageId =
    "";

  try {
    telegramMessageId =
      await sendTelegram(
        msg,
      );
  } catch {
    // report remains recorded
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
            fx.rate,

          telegramMessageId,
        } as any,
      },
    },
  );

  return {
    sent: true,
    totals,
  };
}

async function cronCycle() {
  const monitored =
    [] as unknown[];

  const active =
    await activeRun();

  if (active) {
    monitored.push(
      await monitorOne(
        active,
      ),
    );
  } else {
    monitored.push(
      await scan(),
    );
  }

  const reports:
    Record<
      string,
      unknown
    > = {};

  for (
    const name of Object.keys(
      SESSIONS,
    ) as SessionName[]
  ) {
    if (
      sessionEndReached(
        name,
      )
    ) {
      reports[name] =
        await sessionReport(
          name,
        );
    }
  }

  return {
    monitored,

    reports,
  };
}

async function dashboard(
  userId?: string,
) {
  const [
    active,
    perf,
    fx,
    latest,
  ] =
    await Promise.all([
      activeRun(),

      performance(),

      getUsdToTomanRate().catch(
        () => null,
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
        },
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

export async function GET(
  req: NextRequest,
) {
  try {
    const url =
      new URL(
        req.url,
      );

    const cron =
      url.searchParams.get(
        "cron",
      ) === "1";

    if (cron) {
      const provided =
        req.headers.get(
          "x-ai-cron-secret",
        ) ||
        url.searchParams.get(
          "secret",
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
          },
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
        },
      );
    }

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
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,

        data:
          await dashboard(
            session.userId,
          ),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,

        error:
          e instanceof Error
            ? e.message
            : "خطای داخلی",
      },
      {
        status: 500,
      },
    );
  }
}
