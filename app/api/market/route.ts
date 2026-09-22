import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type TDResponse = {
  status?: string;
  message?: string;
  code?: number;
  meta?: unknown;
  values?: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume?: string;
  }>;
};

const SYMBOLS = [
  "XAU/USD",
  "BTC/USD",
  "ETH/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
] as const;

const INTERVALS = [
  "1min",
  "5min",
  "15min",
  "30min",
  "1h",
  "2h",
  "4h",
] as const;

function number(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, digits = 4) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function ema(values: number[], period: number) {
  if (values.length < period) return [];

  const result = new Array<number>(values.length).fill(NaN);

  const multiplier = 2 / (period + 1);

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    result[i] =
      (values[i] - result[i - 1]) * multiplier +
      result[i - 1];
  }

  return result;
}

function sma(values: number[], period: number) {
  if (values.length < period) return [];

  const result = new Array<number>(values.length).fill(NaN);

  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];

    if (i >= period) {
      sum -= values[i - period];
    }

    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
}

function stdDev(values: number[], period: number) {
  const result = new Array<number>(values.length).fill(NaN);

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;

    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }

    const mean = sum / period;

    let variance = 0;

    for (let j = i - period + 1; j <= i; j++) {
      variance += (values[j] - mean) ** 2;
    }

    result[i] = Math.sqrt(variance / period);
  }

  return result;
}

function rsi(values: number[], period = 14) {
  const result = new Array<number>(values.length).fill(NaN);

  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result[period] =
    avgLoss === 0
      ? 100
      : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result[i] =
      avgLoss === 0
        ? 100
        : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

function atr(
  candles: Candle[],
  period = 14
) {
  const tr = candles.map((candle, index) => {
    if (index === 0) {
      return candle.high - candle.low;
    }

    const previousClose = candles[index - 1].close;

    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  return ema(tr, period);
}

function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);

  const line = new Array<number>(values.length).fill(NaN);

  for (let i = 0; i < values.length; i++) {
    if (
      Number.isFinite(fast[i]) &&
      Number.isFinite(slow[i])
    ) {
      line[i] = fast[i] - slow[i];
    }
  }

  const validMacd = line.map((v) =>
    Number.isFinite(v) ? v : 0
  );

  const signal = ema(validMacd, signalPeriod);

  const histogram = new Array<number>(
    values.length
  ).fill(NaN);

  for (let i = 0; i < values.length; i++) {
    if (
      Number.isFinite(line[i]) &&
      Number.isFinite(signal[i])
    ) {
      histogram[i] = line[i] - signal[i];
    }
  }

  return {
    line,
    signal,
    histogram,
  };
}

function detectCandlePattern(
  candles: Candle[]
) {
  if (candles.length < 3) {
    return {
      name: "NONE",
      text: "الگوی کندلی مشخصی دیده نشد.",
    };
  }

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const body = Math.abs(
    current.close - current.open
  );

  const range = current.high - current.low;

  if (range <= 0) {
    return {
      name: "NONE",
      text: "الگوی کندلی مشخصی دیده نشد.",
    };
  }

  const upperWick =
    current.high -
    Math.max(current.open, current.close);

  const lowerWick =
    Math.min(current.open, current.close) -
    current.low;

  const currentBull =
    current.close > current.open;

  const previousBull =
    previous.close > previous.open;

  if (
    !previousBull &&
    currentBull &&
    current.open <= previous.close &&
    current.close >= previous.open
  ) {
    return {
      name: "BULLISH_ENGULFING",
      text: "الگوی Bullish Engulfing شناسایی شد؛ فشار خرید افزایش یافته است.",
    };
  }

  if (
    previousBull &&
    !currentBull &&
    current.open >= previous.close &&
    current.close <= previous.open
  ) {
    return {
      name: "BEARISH_ENGULFING",
      text: "الگوی Bearish Engulfing شناسایی شد؛ فشار فروش افزایش یافته است.",
    };
  }

  if (
    lowerWick > body * 2 &&
    upperWick < body * 0.8 &&
    current.close > current.open
  ) {
    return {
      name: "HAMMER",
      text: "الگوی Hammer دیده شد؛ واکنش خریداران از کف قیمت مشاهده شده است.",
    };
  }

  if (
    upperWick > body * 2 &&
    lowerWick < body * 0.8 &&
    current.close < current.open
  ) {
    return {
      name: "SHOOTING_STAR",
      text: "الگوی Shooting Star دیده شد؛ واکنش فروشندگان در سقف مشاهده شده است.",
    };
  }

  if (body <= range * 0.1) {
    return {
      name: "DOJI",
      text: "کندل Doji دیده شد؛ بازار در وضعیت بلاتکلیفی کوتاه‌مدت قرار دارد.",
    };
  }

  return {
    name: "NONE",
    text: "الگوی کندلی قدرتمند مشخصی در آخرین کندل تأیید نشد.",
  };
}

function findSupportResistance(
  candles: Candle[]
) {
  const recent = candles.slice(-80);

  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);

  const sortedHighs = [...highs].sort(
    (a, b) => b - a
  );

  const sortedLows = [...lows].sort(
    (a, b) => a - b
  );

  const resistance1 =
    sortedHighs[0] ?? 0;

  const resistance2 =
    sortedHighs.find(
      (value) =>
        value < resistance1 * 0.998
    ) ?? resistance1;

  const support1 =
    sortedLows[0] ?? 0;

  const support2 =
    sortedLows.find(
      (value) =>
        value > support1 * 1.002
    ) ?? support1;

  return {
    support1,
    support2,
    resistance1,
    resistance2,
  };
}

function analyze(
  candles: Candle[]
) {
  const closes = candles.map(
    (c) => c.close
  );

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  const rsiValues = rsi(
    closes,
    14
  );

  const atrValues = atr(
    candles,
    14
  );

  const macdValues = macd(
    closes
  );

  const bbMiddle = sma(
    closes,
    20
  );

  const deviations = stdDev(
    closes,
    20
  );

  const last =
    candles.length - 1;

  const price =
    closes[last];

  const e20 =
    ema20[last];

  const e50 =
    ema50[last];

  const e200 =
    ema200[last];

  const currentRsi =
    rsiValues[last];

  const currentAtr =
    atrValues[last];

  const currentMacd =
    macdValues.line[last];

  const currentMacdSignal =
    macdValues.signal[last];

  const currentHistogram =
    macdValues.histogram[last];

  const middle =
    bbMiddle[last];

  const deviation =
    deviations[last];

  const upperBand =
    Number.isFinite(middle) &&
    Number.isFinite(deviation)
      ? middle + deviation * 2
      : 0;

  const lowerBand =
    Number.isFinite(middle) &&
    Number.isFinite(deviation)
      ? middle - deviation * 2
      : 0;

  let bullishScore = 0;
  let bearishScore = 0;

  const reasons: string[] = [];

  if (
    Number.isFinite(e20) &&
    Number.isFinite(e50)
  ) {
    if (price > e20 && e20 > e50) {
      bullishScore += 20;
      reasons.push(
        "قیمت بالای EMA20 و EMA20 بالای EMA50 قرار دارد."
      );
    }

    if (price < e20 && e20 < e50) {
      bearishScore += 20;
      reasons.push(
        "قیمت زیر EMA20 و EMA20 زیر EMA50 قرار دارد."
      );
    }
  }

  if (
    Number.isFinite(e200)
  ) {
    if (price > e200) {
      bullishScore += 10;
      reasons.push(
        "قیمت بالاتر از EMA200 است."
      );
    } else if (price < e200) {
      bearishScore += 10;
      reasons.push(
        "قیمت پایین‌تر از EMA200 است."
      );
    }
  }

  if (
    Number.isFinite(currentRsi)
  ) {
    if (
      currentRsi >= 52 &&
      currentRsi <= 68
    ) {
      bullishScore += 15;
      reasons.push(
        `RSI روی ${round(
          currentRsi,
          1
        )} قرار دارد و مومنتوم خرید را تأیید می‌کند.`
      );
    }

    if (
      currentRsi >= 32 &&
      currentRsi <= 48
    ) {
      bearishScore += 15;
      reasons.push(
        `RSI روی ${round(
          currentRsi,
          1
        )} قرار دارد و مومنتوم فروش را تأیید می‌کند.`
      );
    }

    if (currentRsi > 70) {
      reasons.push(
        "RSI وارد ناحیه اشباع خرید شده است."
      );
    }

    if (currentRsi < 30) {
      reasons.push(
        "RSI وارد ناحیه اشباع فروش شده است."
      );
    }
  }

  if (
    Number.isFinite(currentMacd) &&
    Number.isFinite(currentMacdSignal)
  ) {
    if (
      currentMacd >
      currentMacdSignal
    ) {
      bullishScore += 15;
      reasons.push(
        "MACD بالاتر از خط Signal قرار دارد."
      );
    } else {
      bearishScore += 15;
      reasons.push(
        "MACD پایین‌تر از خط Signal قرار دارد."
      );
    }
  }

  if (
    Number.isFinite(currentHistogram)
  ) {
    if (
      currentHistogram > 0
    ) {
      bullishScore += 10;
    }

    if (
      currentHistogram < 0
    ) {
      bearishScore += 10;
    }
  }

  const pattern =
    detectCandlePattern(
      candles
    );

  if (
    pattern.name ===
    "BULLISH_ENGULFING" ||
    pattern.name === "HAMMER"
  ) {
    bullishScore += 10;
    reasons.push(
      pattern.text
    );
  }

  if (
    pattern.name ===
      "BEARISH_ENGULFING" ||
    pattern.name ===
      "SHOOTING_STAR"
  ) {
    bearishScore += 10;
    reasons.push(
      pattern.text
    );
  }

  const sr =
    findSupportResistance(
      candles
    );

  const previous =
    candles[last - 1];

  const resistance =
    Math.max(
      ...candles
        .slice(-30, -1)
        .map((c) => c.high)
    );

  const support =
    Math.min(
      ...candles
        .slice(-30, -1)
        .map((c) => c.low)
    );

  let breakout:
    | "BULLISH"
    | "BEARISH"
    | "NONE" = "NONE";

  if (
    previous &&
    price > resistance &&
    previous.close <= resistance
  ) {
    breakout = "BULLISH";
    bullishScore += 15;

    reasons.push(
      "شکست صعودی مقاومت کوتاه‌مدت شناسایی شد."
    );
  }

  if (
    previous &&
    price < support &&
    previous.close >= support
  ) {
    breakout = "BEARISH";
    bearishScore += 15;

    reasons.push(
      "شکست نزولی حمایت کوتاه‌مدت شناسایی شد."
    );
  }

  const bullish =
    bullishScore >= 65 &&
    bullishScore >=
      bearishScore + 10;

  const bearish =
    bearishScore >= 65 &&
    bearishScore >=
      bullishScore + 10;

  let direction:
    | "BUY"
    | "SELL"
    | "WAIT" = "WAIT";

  if (bullish) {
    direction = "BUY";
  } else if (bearish) {
    direction = "SELL";
  }

  const trend =
    price > e20 &&
    e20 > e50
      ? "BULLISH"
      : price < e20 &&
        e20 < e50
      ? "BEARISH"
      : "NEUTRAL";

  const strength =
    Math.min(
      99,
      Math.max(
        bullishScore,
        bearishScore
      )
    );

  return {
    price,
    ema20: round(e20),
    ema50: round(e50),
    ema200: round(e200),
    rsi: round(currentRsi, 2),
    atr: round(currentAtr),
    macd: round(currentMacd),
    macdSignal: round(
      currentMacdSignal
    ),
    macdHistogram: round(
      currentHistogram
    ),
    bollinger: {
      middle: round(middle),
      upper: round(upperBand),
      lower: round(lowerBand),
    },
    trend,
    direction,
    strength,
    bullishScore,
    bearishScore,
    breakout,
    candlePattern: pattern.name,
    candlePatternText:
      pattern.text,
    support1: round(
      sr.support1
    ),
    support2: round(
      sr.support2
    ),
    resistance1: round(
      sr.resistance1
    ),
    resistance2: round(
      sr.resistance2
    ),
    reasons: reasons.slice(
      0,
      8
    ),
  };
}

async function getMarketData(
  symbol: string,
  interval: string
) {
  const apiKey =
    process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY در Environment Variables وجود ندارد."
    );
  }

  const url =
    new URL(
      "https://api.twelvedata.com/time_series"
    );

  url.searchParams.set(
    "symbol",
    symbol
  );

  url.searchParams.set(
    "interval",
    interval
  );

  url.searchParams.set(
    "outputsize",
    "300"
  );

  url.searchParams.set(
    "timezone",
    "UTC"
  );

  url.searchParams.set(
    "apikey",
    apiKey
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Twelve Data HTTP ${response.status}`
    );
  }

  const data =
    (await response.json()) as TDResponse;

  if (
    !data.values ||
    !Array.isArray(
      data.values
    )
  ) {
    throw new Error(
      data.message ||
        "داده کندل از Twelve Data دریافت نشد."
    );
  }

  const candles =
    data.values
      .map((item) => ({
        time: item.datetime,
        open: number(item.open),
        high: number(item.high),
        low: number(item.low),
        close: number(item.close),
        volume: number(
          item.volume
        ),
      }))
      .filter(
        (candle) =>
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.close > 0
      )
      .sort(
        (a, b) =>
          new Date(
            a.time
          ).getTime() -
          new Date(
            b.time
          ).getTime()
      );

  if (candles.length < 220) {
    throw new Error(
      `تعداد کندل کافی نیست. دریافت شد: ${candles.length}`
    );
  }

  const analysis =
    analyze(candles);

  return {
    candles,
    analysis,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const params =
      request.nextUrl.searchParams;

    const rawSymbol =
      params.get("symbol") ||
      "XAU/USD";

    const rawInterval =
      params.get("interval") ||
      "15min";

    const symbol =
      rawSymbol.trim();

    const interval =
      rawInterval.trim();

    if (
      !SYMBOLS.includes(
        symbol as (typeof SYMBOLS)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "نماد انتخاب‌شده پشتیبانی نمی‌شود.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !INTERVALS.includes(
        interval as (typeof INTERVALS)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "تایم‌فریم انتخاب‌شده پشتیبانی نمی‌شود.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await getMarketData(
        symbol,
        interval
      );

    return NextResponse.json({
      success: true,

      source: "Twelve Data",

      symbol,

      interval,

      generatedAt:
        new Date().toISOString(),

      candles:
        result.candles,

      analysis:
        result.analysis,
    });
  } catch (error) {
    console.error(
      "MARKET_API_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "خطا در دریافت اطلاعات بازار.",
      },
      {
        status: 500,
      }
    );
  }
}
