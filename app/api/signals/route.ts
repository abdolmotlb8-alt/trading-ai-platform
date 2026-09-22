import { NextRequest, NextResponse } from "next/server";

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

type SignalSide = "BUY" | "SELL" | "WAIT";

type MarketType = "FOREX" | "CRYPTO" | "COMMODITY";

type Instrument = {
  symbol: string;
  name: string;
  market: MarketType;
};

type Signal = {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  interval: string;

  side: SignalSide;

  price: number;
  entry: number;

  stopLoss: number | null;

  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  riskReward: number | null;

  confidence: number;
  strength: number;

  trend: "BULLISH" | "BEARISH" | "NEUTRAL";

  rsi: number;
  ema20: number;
  ema50: number;

  macd: number;
  macdSignal: number;
  macdHistogram: number;

  atr: number;

  support1: number;
  support2: number;
  resistance1: number;
  resistance2: number;

  candleTime: string;
  generatedAt: string;

  reasons: string[];
};

const INSTRUMENTS: Instrument[] = [
  {
    symbol: "XAU/USD",
    name: "Gold",
    market: "COMMODITY",
  },
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    market: "FOREX",
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    market: "FOREX",
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    market: "FOREX",
  },
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    market: "CRYPTO",
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    market: "CRYPTO",
  },
];

const ALLOWED_INTERVALS = new Set([
  "5min",
  "15min",
  "30min",
  "1h",
  "4h",
]);

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function round(
  value: number,
  decimals = 5
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = Math.pow(
    10,
    decimals
  );

  return (
    Math.round(value * multiplier) /
    multiplier
  );
}

function decimalsForSymbol(
  symbol: string
): number {
  if (symbol === "XAU/USD") {
    return 2;
  }

  if (symbol === "USD/JPY") {
    return 3;
  }

  if (
    symbol === "BTC/USD" ||
    symbol === "ETH/USD"
  ) {
    return 2;
  }

  return 5;
}

function calculateEMA(
  values: number[],
  period: number
): number[] {
  if (!values.length) {
    return [];
  }

  const result = new Array(
    values.length
  ).fill(0);

  const multiplier =
    2 / (period + 1);

  result[0] = values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result[i] =
      (values[i] - result[i - 1]) *
        multiplier +
      result[i - 1];
  }

  return result;
}

function calculateRSI(
  values: number[],
  period = 14
): number[] {
  const result = new Array(
    values.length
  ).fill(50);

  if (
    values.length <
    period + 1
  ) {
    return result;
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

    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain =
    gains / period;

  let averageLoss =
    losses / period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 -
        100 /
          (1 +
            averageGain /
              averageLoss);

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    const gain =
      change > 0
        ? change
        : 0;

    const loss =
      change < 0
        ? Math.abs(change)
        : 0;

    averageGain =
      (averageGain *
        (period - 1) +
        gain) /
      period;

    averageLoss =
      (averageLoss *
        (period - 1) +
        loss) /
      period;

    if (averageLoss === 0) {
      result[i] = 100;
    } else {
      const relativeStrength =
        averageGain /
        averageLoss;

      result[i] =
        100 -
        100 /
          (1 +
            relativeStrength);
    }
  }

  return result;
}

function calculateATR(
  candles: Candle[],
  period = 14
): number[] {
  if (!candles.length) {
    return [];
  }

  const trueRanges =
    new Array(
      candles.length
    ).fill(0);

  trueRanges[0] =
    candles[0].high -
    candles[0].low;

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const range1 =
      current.high -
      current.low;

    const range2 =
      Math.abs(
        current.high -
          previous.close
      );

    const range3 =
      Math.abs(
        current.low -
          previous.close
      );

    trueRanges[i] =
      Math.max(
        range1,
        range2,
        range3
      );
  }

  const result =
    new Array(
      candles.length
    ).fill(0);

  const firstPeriod =
    Math.min(
      period,
      candles.length
    );

  let initial = 0;

  for (
    let i = 0;
    i < firstPeriod;
    i++
  ) {
    initial +=
      trueRanges[i];
  }

  initial /=
    firstPeriod;

  for (
    let i = 0;
    i < Math.min(
      period,
      candles.length
    );
    i++
  ) {
    result[i] = initial;
  }

  for (
    let i = period;
    i < candles.length;
    i++
  ) {
    result[i] =
      (result[i - 1] *
        (period - 1) +
        trueRanges[i]) /
      period;
  }

  return result;
}

function calculateMACD(
  values: number[]
) {
  const ema12 =
    calculateEMA(
      values,
      12
    );

  const ema26 =
    calculateEMA(
      values,
      26
    );

  const macdLine =
    values.map(
      (_, index) =>
        ema12[index] -
        ema26[index]
    );

  const signalLine =
    calculateEMA(
      macdLine,
      9
    );

  const histogram =
    macdLine.map(
      (value, index) =>
        value -
        signalLine[index]
    );

  return {
    macdLine,
    signalLine,
    histogram,
  };
}

async function fetchMarketCandles(
  symbol: string,
  interval: string
): Promise<Candle[]> {
  const apiKey =
    process.env
      .TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY is missing"
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
    "250"
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
        method: "GET",
        cache: "no-store",
        headers: {
          Accept:
            "application/json",
        },
      }
    );

  const text =
    await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Market API returned invalid JSON. HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Market API HTTP ${response.status}`
    );
  }

  if (
    data?.status ===
    "error"
  ) {
    throw new Error(
      data?.message ||
        "Market provider error"
    );
  }

  if (
    !Array.isArray(
      data?.values
    )
  ) {
    throw new Error(
      `No candle data received for ${symbol}`
    );
  }

  const candles =
    data.values
      .map(
        (item: any) => ({
          datetime:
            String(
              item.datetime
            ),

          open:
            toNumber(
              item.open
            ),

          high:
            toNumber(
              item.high
            ),

          low:
            toNumber(
              item.low
            ),

          close:
            toNumber(
              item.close
            ),

          volume:
            item.volume !==
            undefined
              ? toNumber(
                  item.volume
                )
              : undefined,
        })
      )
      .filter(
        (item: Candle) =>
          item.open > 0 &&
          item.high > 0 &&
          item.low > 0 &&
          item.close > 0
      )
      .reverse();

  if (
    candles.length < 60
  ) {
    throw new Error(
      `Not enough market candles for ${symbol}`
    );
  }

  return candles;
}

function calculateLevels(
  candles: Candle[],
  price: number
) {
  const recent =
    candles.slice(-50);

  const highs =
    recent.map(
      (c) => c.high
    );

  const lows =
    recent.map(
      (c) => c.low
    );

  const resistance1 =
    Math.max(...highs);

  const support1 =
    Math.min(...lows);

  const previous =
    candles.slice(-100, -50);

  const resistance2 =
    previous.length
      ? Math.max(
          ...previous.map(
            (c) => c.high
          )
        )
      : resistance1;

  const support2 =
    previous.length
      ? Math.min(
          ...previous.map(
            (c) => c.low
          )
        )
      : support1;

  return {
    resistance1:
      round(
        resistance1
      ),

    resistance2:
      round(
        Math.max(
          resistance2,
          price
        )
      ),

    support1:
      round(
        support1
      ),

    support2:
      round(
        Math.min(
          support2,
          price
        )
      ),
  };
}

function analyze(
  instrument: Instrument,
  candles: Candle[],
  interval: string
): Signal {
  const decimals =
    decimalsForSymbol(
      instrument.symbol
    );

  const closes =
    candles.map(
      (c) => c.close
    );

  const ema20 =
    calculateEMA(
      closes,
      20
    );

  const ema50 =
    calculateEMA(
      closes,
      50
    );

  const rsi =
    calculateRSI(
      closes,
      14
    );

  const atr =
    calculateATR(
      candles,
      14
    );

  const macd =
    calculateMACD(
      closes
    );

  const lastIndex =
    candles.length - 1;

  const previousIndex =
    candles.length - 2;

  const current =
    candles[lastIndex];

  const price =
    current.close;

  const currentEMA20 =
    ema20[lastIndex];

  const currentEMA50 =
    ema50[lastIndex];

  const currentRSI =
    rsi[lastIndex];

  const currentATR =
    atr[lastIndex];

  const currentMACD =
    macd.macdLine[
      lastIndex
    ];

  const currentSignal =
    macd.signalLine[
      lastIndex
    ];

  const previousMACD =
    macd.macdLine[
      previousIndex
    ];

  const previousSignal =
    macd.signalLine[
      previousIndex
    ];

  const histogram =
    macd.histogram[
      lastIndex
    ];

  let buyScore = 0;
  let sellScore = 0;

  const buyReasons: string[] =
    [];

  const sellReasons: string[] =
    [];

  /*
   * TREND
   */

  if (
    price >
    currentEMA20
  ) {
    buyScore += 15;

    buyReasons.push(
      "قیمت بالای EMA20 قرار دارد."
    );
  } else {
    sellScore += 15;

    sellReasons.push(
      "قیمت زیر EMA20 قرار دارد."
    );
  }

  if (
    currentEMA20 >
    currentEMA50
  ) {
    buyScore += 20;

    buyReasons.push(
      "EMA20 بالاتر از EMA50 است."
    );
  }

  if (
    currentEMA20 <
    currentEMA50
  ) {
    sellScore += 20;

    sellReasons.push(
      "EMA20 پایین‌تر از EMA50 است."
    );
  }

  /*
   * RSI
   */

  if (
    currentRSI >= 52 &&
    currentRSI <= 68
  ) {
    buyScore += 15;

    buyReasons.push(
      "RSI مومنتوم صعودی را تأیید می‌کند."
    );
  }

  if (
    currentRSI <= 48 &&
    currentRSI >= 32
  ) {
    sellScore += 15;

    sellReasons.push(
      "RSI مومنتوم نزولی را تأیید می‌کند."
    );
  }

  /*
   * MACD
   */

  if (
    currentMACD >
    currentSignal
  ) {
    buyScore += 10;

    buyReasons.push(
      "MACD بالاتر از خط سیگنال است."
    );
  }

  if (
    currentMACD <
    currentSignal
  ) {
    sellScore += 10;

    sellReasons.push(
      "MACD پایین‌تر از خط سیگنال است."
    );
  }

  const bullishCross =
    currentMACD >
      currentSignal &&
    previousMACD <=
      previousSignal;

  const bearishCross =
    currentMACD <
      currentSignal &&
    previousMACD >=
      previousSignal;

  if (bullishCross) {
    buyScore += 10;

    buyReasons.push(
      "کراس صعودی MACD در آخرین کندل ثبت شده است."
    );
  }

  if (bearishCross) {
    sellScore += 10;

    sellReasons.push(
      "کراس نزولی MACD در آخرین کندل ثبت شده است."
    );
  }

  /*
   * MOMENTUM
   */

  if (
    histogram > 0 &&
    currentMACD >
      previousMACD
  ) {
    buyScore += 10;

    buyReasons.push(
      "مومنتوم MACD در حال تقویت است."
    );
  }

  if (
    histogram < 0 &&
    currentMACD <
      previousMACD
  ) {
    sellScore += 10;

    sellReasons.push(
      "مومنتوم نزولی MACD در حال تقویت است."
    );
  }

  /*
   * MARKET STRUCTURE
   */

  const structure =
    candles.slice(-20);

  const recentHigh =
    Math.max(
      ...structure.map(
        (c) => c.high
      )
    );

  const recentLow =
    Math.min(
      ...structure.map(
        (c) => c.low
      )
    );

  const bullishStructure =
    price >
    recentLow +
      (recentHigh -
        recentLow) *
        0.65;

  const bearishStructure =
    price <
    recentLow +
      (recentHigh -
        recentLow) *
        0.35;

  if (
    bullishStructure
  ) {
    buyScore += 10;

    buyReasons.push(
      "ساختار کوتاه‌مدت بازار متمایل به صعود است."
    );
  }

  if (
    bearishStructure
  ) {
    sellScore += 10;

    sellReasons.push(
      "ساختار کوتاه‌مدت بازار متمایل به نزول است."
    );
  }

  /*
   * FINAL DECISION
   */

  let side: SignalSide =
    "WAIT";

  if (
    buyScore >= 65 &&
    buyScore >=
      sellScore + 8
  ) {
    side = "BUY";
  } else if (
    sellScore >= 65 &&
    sellScore >=
      buyScore + 8
  ) {
    side = "SELL";
  }

  const strength =
    Math.min(
      99,
      Math.max(
        buyScore,
        sellScore
      )
    );

  let confidence = Math.min(
    95,
    strength
  );

  if (side === "WAIT") {
    confidence = Math.min(
      68,
      strength
    );
  }

  /*
   * ATR RISK MANAGEMENT
   */

  let entry = price;

  let stopLoss:
    | number
    | null = null;

  let takeProfit1:
    | number
    | null = null;

  let takeProfit2:
    | number
    | null = null;

  let takeProfit3:
    | number
    | null = null;

  let riskReward:
    | number
    | null = null;

  if (
    side === "BUY" &&
    currentATR > 0
  ) {
    const risk =
      currentATR * 1.5;

    entry = price;

    stopLoss =
      entry - risk;

    takeProfit1 =
      entry + risk;

    takeProfit2 =
      entry + risk * 2;

    takeProfit3 =
      entry + risk * 3;

    riskReward = 3;
  }

  if (
    side === "SELL" &&
    currentATR > 0
  ) {
    const risk =
      currentATR * 1.5;

    entry = price;

    stopLoss =
      entry + risk;

    takeProfit1 =
      entry - risk;

    takeProfit2 =
      entry - risk * 2;

    takeProfit3 =
      entry - risk * 3;

    riskReward = 3;
  }

  const levels =
    calculateLevels(
      candles,
      price
    );

  const trend =
    currentEMA20 >
    currentEMA50
      ? "BULLISH"
      : currentEMA20 <
        currentEMA50
      ? "BEARISH"
      : "NEUTRAL";

  const reasons =
    side === "BUY"
      ? buyReasons
      : side === "SELL"
      ? sellReasons
      : [
          "شرایط ورود معتبر هنوز کامل نشده است.",
          "سیستم منتظر تأیید بیشتر روند و مومنتوم است.",
        ];

  return {
    id: `${instrument.symbol}-${interval}-${Date.now()}`,

    symbol:
      instrument.symbol,

    name:
      instrument.name,

    market:
      instrument.market,

    interval,

    side,

    price: round(
      price,
      decimals
    ),

    entry: round(
      entry,
      decimals
    ),

    stopLoss:
      stopLoss !== null
        ? round(
            stopLoss,
            decimals
          )
        : null,

    takeProfit1:
      takeProfit1 !== null
        ? round(
            takeProfit1,
            decimals
          )
        : null,

    takeProfit2:
      takeProfit2 !== null
        ? round(
            takeProfit2,
            decimals
          )
        : null,

    takeProfit3:
      takeProfit3 !== null
        ? round(
            takeProfit3,
            decimals
          )
        : null,

    riskReward,

    confidence: Math.round(
      confidence
    ),

    strength: Math.round(
      strength
    ),

    trend,

    rsi: round(
      currentRSI,
      2
    ),

    ema20: round(
      currentEMA20,
      decimals
    ),

    ema50: round(
      currentEMA50,
      decimals
    ),

    macd: round(
      currentMACD,
      decimals
    ),

    macdSignal: round(
      currentSignal,
      decimals
    ),

    macdHistogram:
      round(
        histogram,
        decimals
      ),

    atr: round(
      currentATR,
      decimals
    ),

    support1: round(
      levels.support1,
      decimals
    ),

    support2: round(
      levels.support2,
      decimals
    ),

    resistance1: round(
      levels.resistance1,
      decimals
    ),

    resistance2: round(
      levels.resistance2,
      decimals
    ),

    candleTime:
      current.datetime,

    generatedAt:
      new Date().toISOString(),

    reasons,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const requestedInterval =
      request.nextUrl.searchParams.get(
        "interval"
      ) || "15min";

    const interval =
      ALLOWED_INTERVALS.has(
        requestedInterval
      )
        ? requestedInterval
        : "15min";

    const requestedSymbol =
      request.nextUrl.searchParams.get(
        "symbol"
      );

    let instruments =
      INSTRUMENTS;

    if (requestedSymbol) {
      instruments =
        INSTRUMENTS.filter(
          (instrument) =>
            instrument.symbol ===
            requestedSymbol
        );

      if (!instruments.length) {
        return NextResponse.json(
          {
            success: false,
            error:
              "نماد مورد نظر پشتیبانی نمی‌شود.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const results =
      await Promise.allSettled(
        instruments.map(
          async (instrument) => {
            const candles =
              await fetchMarketCandles(
                instrument.symbol,
                interval
              );

            return analyze(
              instrument,
              candles,
              interval
            );
          }
        )
      );

    const signals: Signal[] =
      [];

    const errors: Array<{
      symbol: string;
      error: string;
    }> = [];

    results.forEach(
      (result, index) => {
        if (
          result.status ===
          "fulfilled"
        ) {
          signals.push(
            result.value
          );
        } else {
          errors.push({
            symbol:
              instruments[index]
                .symbol,

            error:
              result.reason instanceof
              Error
                ? result.reason.message
                : "Unknown market data error",
          });
        }
      }
    );

    signals.sort(
      (a, b) =>
        b.strength -
        a.strength
    );

    return NextResponse.json(
      {
        success: true,

        source:
          "Twelve Data",

        generatedAt:
          new Date().toISOString(),

        interval,

        signals,

        errors,

        summary: {
          total:
            signals.length,

          buy:
            signals.filter(
              (item) =>
                item.side ===
                "BUY"
            ).length,

          sell:
            signals.filter(
              (item) =>
                item.side ===
                "SELL"
            ).length,

          wait:
            signals.filter(
              (item) =>
                item.side ===
                "WAIT"
            ).length,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error(
      "SIGNALS_API_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی موتور سیگنال",

        signals: [],
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
