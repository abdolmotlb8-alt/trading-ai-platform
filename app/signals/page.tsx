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

type MarketAnalysis = {
  symbol: string;
  name: string;
  interval: string;
  market: "FOREX" | "CRYPTO" | "COMMODITY";

  side: SignalSide;

  price: number;
  entry: number;

  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  riskReward: number | null;

  strength: number;
  confidence: number;

  trend: "BULLISH" | "BEARISH" | "NEUTRAL";

  rsi: number;
  ema20: number;
  ema50: number;

  macd: number;
  macdSignal: number;
  atr: number;

  candleTime: string;
  generatedAt: string;

  reasons: string[];
};

const SYMBOLS = [
  {
    symbol: "XAU/USD",
    name: "Gold",
    market: "COMMODITY" as const,
  },
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    market: "FOREX" as const,
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    market: "FOREX" as const,
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    market: "FOREX" as const,
  },
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    market: "CRYPTO" as const,
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    market: "CRYPTO" as const,
  },
];

const INTERVALS = new Set([
  "1min",
  "5min",
  "15min",
  "30min",
  "1h",
  "4h",
  "1day",
]);

function number(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, decimals = 5): number {
  if (!Number.isFinite(value)) return 0;

  const factor = Math.pow(10, decimals);

  return Math.round(value * factor) / factor;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];

  const result = new Array(values.length).fill(0);

  const multiplier = 2 / (period + 1);

  let previous = values[0];

  result[0] = previous;

  for (let i = 1; i < values.length; i++) {
    previous =
      (values[i] - previous) * multiplier + previous;

    result[i] = previous;
  }

  return result;
}

function rsi(values: number[], period = 14): number[] {
  if (values.length < period + 1) {
    return values.map(() => 50);
  }

  const result = new Array(values.length).fill(50);

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

  let averageGain = gains / period;
  let averageLoss = losses / period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 - 100 / (1 + averageGain / averageLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;

    result[i] =
      averageLoss === 0
        ? 100
        : 100 -
          100 /
            (1 + averageGain / averageLoss);
  }

  return result;
}

function atr(candles: Candle[], period = 14): number[] {
  if (!candles.length) return [];

  const trueRanges = new Array(candles.length).fill(0);

  trueRanges[0] =
    candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const range1 =
      current.high - current.low;

    const range2 =
      Math.abs(current.high - previous.close);

    const range3 =
      Math.abs(current.low - previous.close);

    trueRanges[i] =
      Math.max(range1, range2, range3);
  }

  const result = new Array(candles.length).fill(0);

  let initial = 0;

  for (
    let i = 0;
    i < Math.min(period, trueRanges.length);
    i++
  ) {
    initial += trueRanges[i];
  }

  initial =
    initial /
    Math.min(period, trueRanges.length);

  result[
    Math.min(period - 1, candles.length - 1)
  ] = initial;

  for (
    let i = period;
    i < candles.length;
    i++
  ) {
    result[i] =
      (result[i - 1] * (period - 1) +
        trueRanges[i]) /
      period;
  }

  for (let i = 0; i < Math.min(period - 1, candles.length); i++) {
    result[i] = initial;
  }

  return result;
}

function macd(values: number[]) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);

  const macdLine = values.map(
    (_, index) =>
      fast[index] - slow[index]
  );

  const signalLine = ema(macdLine, 9);

  const histogram = macdLine.map(
    (value, index) =>
      value - signalLine[index]
  );

  return {
    macdLine,
    signalLine,
    histogram,
  };
}

function getDecimals(symbol: string): number {
  if (symbol === "USD/JPY") return 3;

  if (
    symbol === "BTC/USD" ||
    symbol === "ETH/USD"
  ) {
    return 2;
  }

  if (symbol === "XAU/USD") return 2;

  return 5;
}

async function getMarketData(
  symbol: string,
  interval: string,
  outputsize = 250
): Promise<Candle[]> {
  const apiKey =
    process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY is not configured"
    );
  }

  const url =
    new URL(
      "https://api.twelvedata.com/time_series"
    );

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set(
    "outputsize",
    String(outputsize)
  );
  url.searchParams.set(
    "timezone",
    "UTC"
  );
  url.searchParams.set(
    "apikey",
    apiKey
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const rawText = await response.text();

  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Market provider returned non-JSON response (${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Market provider HTTP ${response.status}`
    );
  }

  if (
    data?.status === "error" ||
    data?.code
  ) {
    throw new Error(
      data?.message ||
        "Market provider returned an error"
    );
  }

  if (
    !Array.isArray(data?.values) ||
    data.values.length < 60
  ) {
    throw new Error(
      `Insufficient market candles for ${symbol}`
    );
  }

  const candles: Candle[] =
    data.values
      .map((item: any) => ({
        datetime: String(item.datetime),
        open: number(item.open),
        high: number(item.high),
        low: number(item.low),
        close: number(item.close),
        volume:
          item.volume !== undefined
            ? number(item.volume)
            : undefined,
      }))
      .filter(
        (item: Candle) =>
          item.open > 0 &&
          item.high > 0 &&
          item.low > 0 &&
          item.close > 0
      )
      .reverse();

  return candles;
}

function analyzeMarket(
  instrument: (typeof SYMBOLS)[number],
  candles: Candle[],
  interval: string
): MarketAnalysis {
  const closes = candles.map(
    (c) => c.close
  );

  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);

  const rsiSeries = rsi(closes, 14);

  const atrSeries = atr(candles, 14);

  const macdResult = macd(closes);

  const last = candles[candles.length - 1];

  const price = last.close;

  const ema20 =
    ema20Series[ema20Series.length - 1];

  const ema50 =
    ema50Series[ema50Series.length - 1];

  const currentRsi =
    rsiSeries[rsiSeries.length - 1];

  const currentAtr =
    atrSeries[atrSeries.length - 1];

  const currentMacd =
    macdResult.macdLine[
      macdResult.macdLine.length - 1
    ];

  const currentMacdSignal =
    macdResult.signalLine[
      macdResult.signalLine.length - 1
    ];

  const previousMacd =
    macdResult.macdLine[
      macdResult.macdLine.length - 2
    ];

  const previousMacdSignal =
    macdResult.signalLine[
      macdResult.signalLine.length - 2
    ];

  let buyScore = 0;
  let sellScore = 0;

  const buyReasons: string[] = [];
  const sellReasons: string[] = [];

  // Trend
  if (price > ema20) {
    buyScore += 15;
    buyReasons.push(
      "قیمت بالای EMA20 قرار دارد"
    );
  } else {
    sellScore += 15;
    sellReasons.push(
      "قیمت زیر EMA20 قرار دارد"
    );
  }

  if (ema20 > ema50) {
    buyScore += 20;
    buyReasons.push(
      "EMA20 بالاتر از EMA50 است"
    );
  }

  if (ema20 < ema50) {
    sellScore += 20;
    sellReasons.push(
      "EMA20 پایین‌تر از EMA50 است"
    );
  }

  // RSI
  if (
    currentRsi >= 52 &&
    currentRsi <= 68
  ) {
    buyScore += 15;
    buyReasons.push(
      "RSI مومنتوم صعودی سالم را نشان می‌دهد"
    );
  }

  if (
    currentRsi <= 48 &&
    currentRsi >= 32
  ) {
    sellScore += 15;
    sellReasons.push(
      "RSI مومنتوم نزولی سالم را نشان می‌دهد"
    );
  }

  // MACD
  const bullishMacd =
    currentMacd >
      currentMacdSignal &&
    previousMacd <=
      previousMacdSignal;

  const bearishMacd =
    currentMacd <
      currentMacdSignal &&
    previousMacd >=
      previousMacdSignal;

  if (
    currentMacd >
    currentMacdSignal
  ) {
    buyScore += 10;
    buyReasons.push(
      "MACD بالاتر از خط سیگنال است"
    );
  }

  if (
    currentMacd <
    currentMacdSignal
  ) {
    sellScore += 10;
    sellReasons.push(
      "MACD پایین‌تر از خط سیگنال است"
    );
  }

  if (bullishMacd) {
    buyScore += 10;
    buyReasons.push(
      "کراس صعودی MACD تازه شکل گرفته"
    );
  }

  if (bearishMacd) {
    sellScore += 10;
    sellReasons.push(
      "کراس نزولی MACD تازه شکل گرفته"
    );
  }

  // Price structure
  const lookback = candles.slice(-20);

  const recentHigh = Math.max(
    ...lookback.map((c) => c.high)
  );

  const recentLow = Math.min(
    ...lookback.map((c) => c.low)
  );

  if (price > recentHigh * 0.998) {
    buyScore += 15;
    buyReasons.push(
      "قیمت نزدیک سقف ساختار اخیر است"
    );
  }

  if (price < recentLow * 1.002) {
    sellScore += 15;
    sellReasons.push(
      "قیمت نزدیک کف ساختار اخیر است"
    );
  }

  // Volatility confirmation
  if (
    currentAtr > 0 &&
    currentAtr <
      price * 0.03
  ) {
    buyScore += 5;
    sellScore += 5;
  }

  const strongestScore =
    Math.max(
      buyScore,
      sellScore
    );

  let side: SignalSide = "WAIT";

  if (
    buyScore >= 65 &&
    buyScore > sellScore + 5
  ) {
    side = "BUY";
  } else if (
    sellScore >= 65 &&
    sellScore > buyScore + 5
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

  const confidence =
    side === "WAIT"
      ? Math.min(69, strongestScore)
      : Math.min(
          98,
          Math.round(
            65 +
              Math.max(
                0,
                strongestScore - 65
              ) *
                1.1
          )
        );

  const decimals =
    getDecimals(instrument.symbol);

  let entry: number = price;

  let stopLoss: number | null = null;
  let takeProfit1: number | null = null;
  let takeProfit2: number | null = null;
  let takeProfit3: number | null = null;
  let riskReward: number | null = null;

  if (
    side === "BUY" &&
    currentAtr > 0
  ) {
    const risk =
      currentAtr * 1.5;

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
    currentAtr > 0
  ) {
    const risk =
      currentAtr * 1.5;

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

  const trend =
    ema20 > ema50
      ? "BULLISH"
      : ema20 < ema50
      ? "BEARISH"
      : "NEUTRAL";

  const reasons =
    side === "BUY"
      ? buyReasons
      : side === "SELL"
      ? sellReasons
      : [
          "شرایط فعلی برای ورود معتبر کافی نیست",
          "سیستم در انتظار تأیید بیشتر بازار است",
        ];

  return {
    symbol: instrument.symbol,
    name: instrument.name,
    interval,
    market: instrument.market,

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

    strength,
    confidence,

    trend,

    rsi: round(
      currentRsi,
      2
    ),

    ema20: round(
      ema20,
      decimals
    ),

    ema50: round(
      ema50,
      decimals
    ),

    macd: round(
      currentMacd,
      decimals
    ),

    macdSignal: round(
      currentMacdSignal,
      decimals
    ),

    atr: round(
      currentAtr,
      decimals
    ),

    candleTime:
      last.datetime,

    generatedAt:
      new Date().toISOString(),

    reasons,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const intervalParam =
      request.nextUrl.searchParams.get(
        "interval"
      ) || "15min";

    const interval =
      INTERVALS.has(intervalParam)
        ? intervalParam
        : "15min";

    const symbolParam =
      request.nextUrl.searchParams.get(
        "symbol"
      );

    const requestedSymbols =
      symbolParam
        ? SYMBOLS.filter(
            (item) =>
              item.symbol ===
              symbolParam
          )
        : SYMBOLS;

    if (!requestedSymbols.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "نماد مورد نظر پشتیبانی نمی‌شود",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const results =
      await Promise.allSettled(
        requestedSymbols.map(
          async (instrument) => {
            const candles =
              await getMarketData(
                instrument.symbol,
                interval,
                250
              );

            return analyzeMarket(
              instrument,
              candles,
              interval
            );
          }
        )
      );

    const signals: MarketAnalysis[] = [];

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
              requestedSymbols[index]
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

        source: "Twelve Data",

        generatedAt:
          new Date().toISOString(),

        interval,

        signals,

        errors,

        meta: {
          total:
            signals.length,
          buy:
            signals.filter(
              (s) =>
                s.side === "BUY"
            ).length,
          sell:
            signals.filter(
              (s) =>
                s.side === "SELL"
            ).length,
          wait:
            signals.filter(
              (s) =>
                s.side === "WAIT"
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
            : "خطای ناشناخته در موتور سیگنال",
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
