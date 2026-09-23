import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TD_BASE = "https://api.twelvedata.com";

const DEFAULT_MIN_SCORE = 86;
const DEFAULT_MIN_CONFIRMATIONS = 6;
const DEFAULT_MIN_MTF = 3;
const DEFAULT_COOLDOWN_MINUTES = 45;
const DEFAULT_MAX_SIGNALS_PER_DAY = 4;
const DEFAULT_VALIDITY_MINUTES = 240;

const DEFAULT_RISK = {
  lotSize: 0.01,
  stopLossDollars: 4,
  tp1Dollars: 5,
  tp2Dollars: 10,
  tp3Dollars: 15,
};

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type IndicatorSet = {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  atr: number;
};

type Analysis = {
  direction: "BUY" | "SELL";
  score: number;
  confirmations: number;

  indicators: IndicatorSet;

  support: number | null;
  resistance: number | null;

  breakout: boolean;
  liquiditySweep: boolean;
  pullback: boolean;

  candlePattern: string;
  volumeConfirmation: boolean;

  mtfBuy: number;
  mtfSell: number;
  mtfAgreement: number;

  trendConfirmed: boolean;
  volatilityConfirmed: boolean;

  reasons: string[];
};

type ReactionLevel = {
  price: number;
  low: number;
  high: number;
  score: number;
  touches: number;
  timeframes: string[];
};

type RiskConfig = {
  lotSize: number;

  stopLossDollars: number;

  tp1Dollars: number;
  tp2Dollars: number;
  tp3Dollars: number;

  contractSize: number;

  usdTomanRate: number | null;
  usdTomanSource: string | null;
};

type SignalControl = {
  minScore: number;
  minConfirmations: number;
  minMtfAgreement: number;

  minMinutesBetweenSignals: number;

  maxSignalsPerDay: number;

  minRoomAtr: number;

  validityMinutes: number;
};

function num(value: unknown, fallback = 0): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function safeObject(value: unknown): Record<string, any> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  return {};
}

function normalizeSymbol(symbol: string): string {
  const raw = String(symbol || "XAUUSD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const aliases: Record<string, string> = {
    GOLD: "XAU/USD",
    XAUUSD: "XAU/USD",

    SILVER: "XAG/USD",
    XAGUSD: "XAG/USD",

    BTCUSDT: "BTC/USD",
    BTCUSD: "BTC/USD",

    ETHUSDT: "ETH/USD",
    ETHUSD: "ETH/USD",
  };

  if (aliases[raw]) {
    return aliases[raw];
  }

  if (raw.length === 6) {
    return `${raw.slice(0, 3)}/${raw.slice(3)}`;
  }

  return symbol.toUpperCase();
}

function displaySymbol(symbol: string): string {
  return normalizeSymbol(symbol).replace("/", "");
}

/*
  IMPORTANT:
  قبلاً کدی مثل:

  "5min".replace("m", "min")

  باعث می‌شد:

  5min -> 5minin

  شود.

  این نسخه کاملاً اصلاح شده است.
*/
function normalizeTimeframe(timeframe: unknown): string {
  const raw = String(timeframe ?? "15min")
    .toLowerCase()
    .trim();

  const aliases: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "45m": "45min",

    "1min": "1min",
    "5min": "5min",
    "15min": "15min",
    "30min": "30min",
    "45min": "45min",

    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "8h": "8h",

    "1d": "1day",
    "1day": "1day",
    day: "1day",
    daily: "1day",
  };

  return aliases[raw] ?? "15min";
}

function priceDigits(symbol: string): number {
  const s = displaySymbol(symbol);

  if (s.startsWith("XAU") || s.startsWith("XAG")) {
    return 2;
  }

  if (s.includes("JPY")) {
    return 3;
  }

  if (s.startsWith("BTC") || s.startsWith("ETH")) {
    return 2;
  }

  return 5;
}

function roundPrice(value: number, symbol: string): number {
  return Number(value.toFixed(priceDigits(symbol)));
}

function formatPrice(
  value: number | null | undefined,
  symbol: string
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(priceDigits(symbol));
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeframeLabel(value: string): string {
  const map: Record<string, string> = {
    "1min": "1m",
    "5min": "5m",
    "15min": "15m",
    "30min": "30m",
    "45min": "45m",
    "1h": "1H",
    "2h": "2H",
    "4h": "4H",
    "8h": "8H",
    "1day": "1D",
  };

  return map[value] ?? value;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function dayStartUtc(): Date {
  const d = new Date();

  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    )
  );
}

function sma(values: number[], period: number): number {
  if (!values.length) {
    return 0;
  }

  const slice = values.slice(-period);

  return (
    slice.reduce((sum, value) => sum + value, 0) /
    slice.length
  );
}

function ema(values: number[], period: number): number {
  if (!values.length) {
    return 0;
  }

  const k = 2 / (period + 1);

  let result = values[0];

  for (let i = 1; i < values.length; i++) {
    result =
      values[i] * k +
      result * (1 - k);
  }

  return result;
}

function rsi(
  values: number[],
  period = 14
): number {
  if (values.length < 2) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  const start = Math.max(
    1,
    values.length - period
  );

  for (let i = start; i < values.length; i++) {
    const change =
      values[i] - values[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const count = Math.max(
    1,
    values.length - start
  );

  const avgGain = gains / count;
  const avgLoss = losses / count;

  if (avgLoss === 0) {
    return avgGain > 0 ? 100 : 50;
  }

  const rs = avgGain / avgLoss;

  return 100 - 100 / (1 + rs);
}

function atr(
  candles: Candle[],
  period = 14
): number {
  if (candles.length < 2) {
    return 0;
  }

  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previousClose =
      candles[i - 1].close;

    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(
        current.high - previousClose
      ),
      Math.abs(
        current.low - previousClose
      )
    );

    trs.push(trueRange);
  }

  return sma(trs, period);
}

function macd(
  values: number[]
): {
  value: number;
  signal: number;
} {
  if (!values.length) {
    return {
      value: 0,
      signal: 0,
    };
  }

  const history: number[] = [];

  const start = Math.max(
    1,
    values.length - 60
  );

  for (let i = start; i <= values.length; i++) {
    const part = values.slice(0, i);

    history.push(
      ema(part, 12) -
        ema(part, 26)
    );
  }

  const value =
    ema(values, 12) -
    ema(values, 26);

  const signal =
    ema(history, 9);

  return {
    value,
    signal,
  };
}

function indicators(
  candles: Candle[]
): IndicatorSet {
  const closes =
    candles.map((c) => c.close);

  const m = macd(closes);

  return {
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),

    rsi: rsi(closes, 14),

    macd: m.value,
    macdSignal: m.signal,

    atr: atr(candles, 14),
  };
}

function swingSupport(
  candles: Candle[]
): number | null {
  if (candles.length < 7) {
    return null;
  }

  const points: number[] = [];

  for (
    let i = 2;
    i < candles.length - 2;
    i++
  ) {
    const current = candles[i];

    if (
      current.low <=
        candles[i - 1].low &&
      current.low <=
        candles[i - 2].low &&
      current.low <=
        candles[i + 1].low &&
      current.low <=
        candles[i + 2].low
    ) {
      points.push(current.low);
    }
  }

  return points.length
    ? points[points.length - 1]
    : null;
}

function swingResistance(
  candles: Candle[]
): number | null {
  if (candles.length < 7) {
    return null;
  }

  const points: number[] = [];

  for (
    let i = 2;
    i < candles.length - 2;
    i++
  ) {
    const current = candles[i];

    if (
      current.high >=
        candles[i - 1].high &&
      current.high >=
        candles[i - 2].high &&
      current.high >=
        candles[i + 1].high &&
      current.high >=
        candles[i + 2].high
    ) {
      points.push(current.high);
    }
  }

  return points.length
    ? points[points.length - 1]
    : null;
}

function detectBreakout(
  candles: Candle[],
  direction: "BUY" | "SELL"
): boolean {
  if (candles.length < 22) {
    return false;
  }

  const current =
    candles[candles.length - 1];

  const previous =
    candles.slice(-21, -1);

  if (direction === "BUY") {
    return (
      current.close >
      Math.max(
        ...previous.map(
          (c) => c.high
        )
      )
    );
  }

  return (
    current.close <
    Math.min(
      ...previous.map(
        (c) => c.low
      )
    )
  );
}

function detectLiquiditySweep(
  candles: Candle[],
  direction: "BUY" | "SELL"
): boolean {
  if (candles.length < 10) {
    return false;
  }

  const current =
    candles[candles.length - 1];

  const previous =
    candles.slice(-8, -1);

  if (direction === "BUY") {
    const previousLow =
      Math.min(
        ...previous.map(
          (c) => c.low
        )
      );

    return (
      current.low <
        previousLow &&
      current.close >
        previousLow
    );
  }

  const previousHigh =
    Math.max(
      ...previous.map(
        (c) => c.high
      )
    );

  return (
    current.high >
      previousHigh &&
    current.close <
      previousHigh
  );
}

function detectPullback(
  candles: Candle[],
  ind: IndicatorSet,
  direction: "BUY" | "SELL"
): boolean {
  const current =
    candles[candles.length - 1];

  const distance = Math.abs(
    current.close - ind.ema20
  );

  const threshold =
    Math.max(
      ind.atr * 0.65,
      current.close * 0.00015
    );

  if (direction === "BUY") {
    return (
      current.close > ind.ema50 &&
      distance <= threshold
    );
  }

  return (
    current.close < ind.ema50 &&
    distance <= threshold
  );
}

function candlePattern(
  candles: Candle[]
): string {
  if (candles.length < 2) {
    return "Neutral";
  }

  const current =
    candles[candles.length - 1];

  const previous =
    candles[candles.length - 2];

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

  if (
    current.close >
      current.open &&
    previous.close <
      previous.open &&
    current.close >=
      previous.open &&
    current.open <=
      previous.close
  ) {
    return "Bullish Engulfing";
  }

  if (
    current.close <
      current.open &&
    previous.close >
      previous.open &&
    current.open >=
      previous.close &&
    current.close <=
      previous.open
  ) {
    return "Bearish Engulfing";
  }

  if (
    lower > body * 2 &&
    upper < body
  ) {
    return "Hammer";
  }

  if (
    upper > body * 2 &&
    lower < body
  ) {
    return "Shooting Star";
  }

  if (
    body >
    (current.high - current.low) *
      0.65
  ) {
    return current.close >
      current.open
      ? "Strong Bullish"
      : "Strong Bearish";
  }

  return "Neutral";
}

function volumeConfirmed(
  candles: Candle[]
): boolean {
  if (candles.length < 21) {
    return true;
  }

  const current =
    candles[candles.length - 1]
      .volume;

  const average =
    sma(
      candles
        .slice(-21, -1)
        .map((c) => c.volume),
      20
    );

  return (
    average <= 0 ||
    current >= average * 1.05
  );
}

function timeframeTrend(
  candles: Candle[]
): "BUY" | "SELL" | "NEUTRAL" {
  if (candles.length < 20) {
    return "NEUTRAL";
  }

  const ind =
    indicators(candles);

  const close =
    candles[candles.length - 1]
      .close;

  if (
    close > ind.ema20 &&
    ind.ema20 > ind.ema50
  ) {
    return "BUY";
  }

  if (
    close < ind.ema20 &&
    ind.ema20 < ind.ema50
  ) {
    return "SELL";
  }

  return "NEUTRAL";
}

function analyzeMarket(
  main: Candle[],
  mtf: Record<string, Candle[]>
): Analysis {
  const ind =
    indicators(main);

  const current =
    main[main.length - 1].close;

  const buyVotes =
    Object.values(mtf).filter(
      (candles) =>
        timeframeTrend(candles) ===
        "BUY"
    ).length;

  const sellVotes =
    Object.values(mtf).filter(
      (candles) =>
        timeframeTrend(candles) ===
        "SELL"
    ).length;

  const direction: "BUY" | "SELL" =
    buyVotes >= sellVotes
      ? "BUY"
      : "SELL";

  const trendConfirmed =
    direction === "BUY"
      ? current > ind.ema200 &&
        ind.ema20 > ind.ema50
      : current < ind.ema200 &&
        ind.ema20 < ind.ema50;

  const breakout =
    detectBreakout(
      main,
      direction
    );

  const liquiditySweep =
    detectLiquiditySweep(
      main,
      direction
    );

  const pullback =
    detectPullback(
      main,
      ind,
      direction
    );

  const pattern =
    candlePattern(main);

  const volume =
    volumeConfirmed(main);

  const momentum =
    direction === "BUY"
      ? ind.rsi >= 52 &&
        ind.rsi <= 72 &&
        ind.macd >=
          ind.macdSignal
      : ind.rsi <= 48 &&
        ind.rsi >= 28 &&
        ind.macd <=
          ind.macdSignal;

  const mtfAgreement =
    Math.max(
      buyVotes,
      sellVotes
    );

  const volatilityConfirmed =
    ind.atr > 0 &&
    ind.atr /
      Math.max(
        current,
        0.0000001
      ) >=
      0.00005;

  let score = 0;

  const reasons: string[] = [];

  if (trendConfirmed) {
    score += 18;

    reasons.push(
      "روند اصلی با EMA200 هم‌جهت است"
    );
  }

  if (momentum) {
    score += 12;

    reasons.push(
      "مومنتوم RSI/MACD تأیید می‌شود"
    );
  }

  if (breakout) {
    score += 16;

    reasons.push(
      "شکست ساختاری تأیید شده است"
    );
  }

  if (pullback) {
    score += 10;

    reasons.push(
      "پولبک در ناحیه روند دیده شد"
    );
  }

  if (pattern !== "Neutral") {
    score += 12;

    reasons.push(
      `الگوی کندلی: ${pattern}`
    );
  }

  if (volume) {
    score += 8;

    reasons.push(
      "حجم/فعالیت بازار تأیید می‌کند"
    );
  }

  if (mtfAgreement >= 3) {
    score += 12;

    reasons.push(
      `هم‌جهتی چندتایم‌فریم: ${mtfAgreement}/4`
    );
  }

  if (liquiditySweep) {
    score += 6;

    reasons.push(
      "Liquidity Sweep شناسایی شد"
    );
  }

  if (volatilityConfirmed) {
    reasons.push(
      "نوسان بازار برای تشکیل سیگنال کافی است"
    );
  }

  const confirmations = [
    trendConfirmed,
    momentum,
    breakout,
    pullback,
    pattern !== "Neutral",
    volume,
    mtfAgreement >= 3,
    liquiditySweep,
  ].filter(Boolean).length;

  return {
    direction,

    score: clamp(
      Math.round(score),
      0,
      100
    ),

    confirmations,

    indicators: ind,

    support:
      swingSupport(main),

    resistance:
      swingResistance(main),

    breakout,
    liquiditySweep,
    pullback,

    candlePattern:
      pattern,

    volumeConfirmation:
      volume,

    mtfBuy:
      buyVotes,

    mtfSell:
      sellVotes,

    mtfAgreement,

    trendConfirmed,
    volatilityConfirmed,

    reasons,
  };
}

function getRiskConfig(
  bot: any
): RiskConfig {
  const config =
    safeObject(bot.analysisConfig);

  const risk =
    safeObject(config.risk);

  const symbol =
    displaySymbol(
      bot.symbol ||
        "XAUUSD"
    );

  const lotSize =
    Math.max(
      0.0001,
      num(
        risk.lotSize,
        num(
          bot.lotSize,
          DEFAULT_RISK.lotSize
        )
      )
    );

  let contractSize =
    num(
      risk.contractSize,
      0
    );

  if (!contractSize) {
    if (
      symbol.startsWith("XAU") ||
      symbol.startsWith("XAG")
    ) {
      contractSize = 100;
    } else if (
      /^[A-Z]{6}$/.test(symbol)
    ) {
      contractSize = 100000;
    } else {
      contractSize = 1;
    }
  }

  return {
    lotSize,

    stopLossDollars:
      Math.max(
        0.01,
        num(
          risk.stopLossDollars,
          DEFAULT_RISK.stopLossDollars
        )
      ),

    tp1Dollars:
      Math.max(
        0.01,
        num(
          risk.tp1Dollars,
          DEFAULT_RISK.tp1Dollars
        )
      ),

    tp2Dollars:
      Math.max(
        0.01,
        num(
          risk.tp2Dollars,
          DEFAULT_RISK.tp2Dollars
        )
      ),

    tp3Dollars:
      Math.max(
        0.01,
        num(
          risk.tp3Dollars,
          DEFAULT_RISK.tp3Dollars
        )
      ),

    contractSize,

    usdTomanRate: null,

    usdTomanSource: null,
  };
}

function getSignalControl(
  bot: any
): SignalControl {
  const config =
    safeObject(bot.analysisConfig);

  const settings =
    safeObject(
      config.signalControl
    );

  return {
    minScore: clamp(
      num(
        settings.minScore,
        DEFAULT_MIN_SCORE
      ),
      50,
      100
    ),

    minConfirmations: clamp(
      num(
        settings.minConfirmations,
        DEFAULT_MIN_CONFIRMATIONS
      ),
      1,
      8
    ),

    minMtfAgreement: clamp(
      num(
        settings.minMtfAgreement,
        DEFAULT_MIN_MTF
      ),
      1,
      4
    ),

    minMinutesBetweenSignals:
      Math.max(
        1,
        num(
          settings.minMinutesBetweenSignals,
          Math.max(
            DEFAULT_COOLDOWN_MINUTES,
            num(
              bot.cooldownMinutes,
              0
            )
          )
        )
      ),

    maxSignalsPerDay:
      Math.max(
        1,
        num(
          settings.maxSignalsPerDay,
          DEFAULT_MAX_SIGNALS_PER_DAY
        )
      ),

    minRoomAtr:
      Math.max(
        0,
        num(
          settings.minRoomAtr,
          0.35
        )
      ),

    validityMinutes:
      Math.max(
        15,
        num(
          settings.validityMinutes,
          DEFAULT_VALIDITY_MINUTES
        )
      ),
  };
}

async function td(
  path: string,
  params: Record<
    string,
    string | number
  >
): Promise<any> {
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
      `${TD_BASE}${path}`
    );

  url.searchParams.set(
    "apikey",
    apiKey
  );

  for (
    const [key, value] of Object.entries(
      params
    )
  ) {
    url.searchParams.set(
      key,
      String(value)
    );
  }

  const response =
    await fetch(
      url.toString(),
      {
        cache: "no-store",
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    data?.status === "error"
  ) {
    throw new Error(
      data?.message ||
        `Twelve Data HTTP ${response.status}`
    );
  }

  return data;
}

async function fetchCandles(
  symbol: string,
  interval: string,
  outputsize = 250
): Promise<Candle[]> {
  const data =
    await td(
      "/time_series",
      {
        symbol:
          normalizeSymbol(symbol),

        interval,

        outputsize,

        order: "ASC",
      }
    );

  const values =
    Array.isArray(
      data?.values
    )
      ? data.values
      : [];

  return values
    .map(
      (value: any) => ({
        datetime:
          String(
            value.datetime
          ),

        open:
          num(value.open),

        high:
          num(value.high),

        low:
          num(value.low),

        close:
          num(value.close),

        volume:
          num(
            value.volume,
            0
          ),
      })
    )
    .filter(
      (c: Candle) =>
        c.close > 0 &&
        c.high >= c.low
    );
}

async function getUsdTomanRate(): Promise<{
  rate: number | null;
  source: string | null;
}> {
  const direct =
    num(
      process.env
        .USD_TOMAN_RATE,
      0
    );

  if (direct > 0) {
    return {
      rate: direct,
      source:
        "USD_TOMAN_RATE",
    };
  }

  const irr =
    num(
      process.env
        .USD_IRR_RATE,
      0
    );

  if (irr > 0) {
    return {
      rate: irr / 10,
      source:
        "USD_IRR_RATE/10",
    };
  }

  try {
    const data =
      await td(
        "/exchange_rate",
        {
          symbol:
            "USD/IRR",
        }
      );

    const rate =
      num(
        data?.rate,
        0
      );

    if (rate > 0) {
      return {
        rate: rate / 10,
        source:
          "TwelveData USD/IRR / 10",
      };
    }
  } catch {
    // نرخ تومان اختیاری است.
  }

  return {
    rate: null,
    source: null,
  };
}

function calculateLevels(
  entry: number,
  direction: "BUY" | "SELL",
  symbol: string,
  risk: RiskConfig
) {
  const exposure =
    Math.max(
      0.0000001,
      risk.lotSize *
        risk.contractSize
    );

  const slDistance =
    risk.stopLossDollars /
    exposure;

  const tp1Distance =
    risk.tp1Dollars /
    exposure;

  const tp2Distance =
    risk.tp2Dollars /
    exposure;

  const tp3Distance =
    risk.tp3Dollars /
    exposure;

  const sign =
    direction === "BUY"
      ? 1
      : -1;

  const stopLoss =
    roundPrice(
      entry -
        sign *
          slDistance,
      symbol
    );

  const tp1 =
    roundPrice(
      entry +
        sign *
          tp1Distance,
      symbol
    );

  const tp2 =
    roundPrice(
      entry +
        sign *
          tp2Distance,
      symbol
    );

  const tp3 =
    roundPrice(
      entry +
        sign *
          tp3Distance,
      symbol
    );

  return {
    entry:
      roundPrice(
        entry,
        symbol
      ),

    stopLoss,

    tp1,

    tp2,

    tp3,

    riskReward:
      risk.stopLossDollars >
      0
        ? Number(
            (
              risk.tp3Dollars /
              risk.stopLossDollars
            ).toFixed(2)
          )
        : 0,

    exposure,
  };
}

async function telegramRequest(
  method: string,
  body: Record<string, any>
): Promise<any> {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is missing"
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          body
        ),

        cache: "no-store",
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    data?.ok !== true
  ) {
    throw new Error(
      data?.description ||
        `Telegram ${method} failed`
    );
  }

  return data;
}

async function sendTelegramMessage(
  text: string
): Promise<{
  messageId: string | null;
}> {
  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (!chatId) {
    throw new Error(
      "TELEGRAM_SIGNAL_CHAT_ID is missing"
    );
  }

  const data =
    await telegramRequest(
      "sendMessage",
      {
        chat_id: chatId,

        text:
          text.slice(
            0,
            4096
          ),

        parse_mode:
          "HTML",

        disable_web_page_preview:
          true,
      }
    );

  return {
    messageId:
      data?.result
        ?.message_id != null
        ? String(
            data.result.message_id
          )
        : null,
  };
}

async function sendTelegramPhoto(
  url: string | undefined,
  caption: string
): Promise<void> {
  if (!url) {
    return;
  }

  const chatId =
    process.env
      .TELEGRAM_SIGNAL_CHAT_ID;

  if (!chatId) {
    return;
  }

  try {
    await telegramRequest(
      "sendPhoto",
      {
        chat_id: chatId,

        photo: url,

        caption:
          caption.slice(
            0,
            1024
          ),

        parse_mode:
          "HTML",
      }
    );
  } catch {
    // عکس اختیاری است.
  }
}

function telegramTime(
  date = new Date()
): string {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone:
        "Asia/Tehran",

      hour: "2-digit",
      minute: "2-digit",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function buildSignalMessage(args: {
  symbol: string;
  direction: "BUY" | "SELL";
  timeframe: string;

  levels: ReturnType<
    typeof calculateLevels
  >;

  risk: RiskConfig;

  analysis: Analysis;

  expiresAt: Date;
}) {
  const buy =
    args.direction === "BUY";

  const icon =
    buy ? "🟢" : "🔴";

  const title =
    buy
      ? "CONFIRMED BUY SIGNAL"
      : "CONFIRMED SELL SIGNAL";

  const rateText =
    args.risk.usdTomanRate
      ? `≈ ${(
          args.risk.stopLossDollars *
          args.risk.usdTomanRate
        ).toLocaleString(
          "fa-IR"
        )} تومان`
      : "نرخ تومان تنظیم نشده";

  return [
    `${icon} <b>${title}</b>`,

    `━━━━━━━━━━━━━━`,

    `📌 Symbol: <b>${escapeHtml(
      displaySymbol(
        args.symbol
      )
    )}</b>`,

    `🕒 Timeframe: <b>${escapeHtml(
      timeframeLabel(
        args.timeframe
      )
    )}</b>`,

    `⏳ اعتبار: <b>${Math.max(
      1,
      Math.round(
        (args.expiresAt.getTime() -
          Date.now()) /
          60000
      )
    )} دقیقه</b>`,

    `🎯 Entry: <b>${formatPrice(
      args.levels.entry,
      args.symbol
    )}</b> 🔵`,

    `🛑 SL: <b>${formatPrice(
      args.levels.stopLoss,
      args.symbol
    )}</b> | Risk: <b>-$${args.risk.stopLossDollars.toFixed(
      2
    )}</b>`,

    `🟢 TP1: <b>${formatPrice(
      args.levels.tp1,
      args.symbol
    )}</b> | +$${args.risk.tp1Dollars.toFixed(
      2
    )}`,

    `🟢 TP2: <b>${formatPrice(
      args.levels.tp2,
      args.symbol
    )}</b> | +$${args.risk.tp2Dollars.toFixed(
      2
    )}`,

    `🟢 TP3: <b>${formatPrice(
      args.levels.tp3,
      args.symbol
    )}</b> | +$${args.risk.tp3Dollars.toFixed(
      2
    )}`,

    `📐 RR: <b>${args.levels.riskReward}R</b> | Lot: <b>${args.risk.lotSize}</b>`,

    `📊 Score: <b>${args.analysis.score}/100</b>`,

    `✅ Confirmations: <b>${args.analysis.confirmations}</b>`,

    `🧭 MTF: <b>${args.analysis.mtfBuy}-${args.analysis.mtfSell}</b>`,

    `📈 RSI: <b>${args.analysis.indicators.rsi.toFixed(
      1
    )}</b> | MACD: <b>${
      args.analysis.indicators.macd >=
      args.analysis.indicators.macdSignal
        ? "Bullish"
        : "Bearish"
    }</b>`,

    `💰 ریسک دلاری: <b>$${args.risk.stopLossDollars.toFixed(
      2
    )}</b> | ${escapeHtml(
      rateText
    )}`,

    `🕐 ${telegramTime()}`,

    `⚠️ <i>این سیگنال بر اساس داده بازار و فیلترهای سیستم تولید شده و تضمین سود نیست.</i>`,
  ].join("\n");
}

function buildEventMessage(args: {
  symbol: string;
  direction: string;
  stage: string;
  price: number;
  pnlUsd: number;
  pnlToman: number | null;
  isLoss?: boolean;
}) {
  const loss =
    Boolean(args.isLoss);

  const icon =
    loss ? "🔴" : "🟢";

  const title =
    loss
      ? "STOP LOSS HIT"
      : `${args.stage} HIT`;

  const toman =
    args.pnlToman == null
      ? "نرخ تومان موجود نیست"
      : `${
          args.pnlToman >= 0
            ? "+"
            : ""
        }${Math.round(
          args.pnlToman
        ).toLocaleString(
          "fa-IR"
        )} تومان`;

  return [
    `${icon} <b>${title}</b>`,

    `━━━━━━━━━━━━━━`,

    `📌 <b>${escapeHtml(
      displaySymbol(
        args.symbol
      )
    )}</b> · ${escapeHtml(
      args.direction
    )}`,

    `🎯 Price: <b>${formatPrice(
      args.price,
      args.symbol
    )}</b>`,

    `💵 P/L: <b>${
      args.pnlUsd >= 0
        ? "+"
        : ""
    }$${args.pnlUsd.toFixed(
      2
    )}</b>`,

    `💰 تومان: <b>${escapeHtml(
      toman
    )}</b>`,

    `🕐 ${telegramTime()}`,

    loss
      ? `⚠️ حد ضرر فعال شد و سیگنال بسته شد.`
      : `ℹ️ این مرحله به قیمت رسید و سود مرحله‌ای در سیستم ثبت شد.`,
  ].join("\n");
}

function collectLevelCandidates(
  candles: Candle[],
  timeframe: string,
  weight: number,
  current: number,
  side:
    | "support"
    | "resistance"
) {
  const result: {
    price: number;
    score: number;
    timeframe: string;
  }[] = [];

  for (
    let i = 2;
    i < candles.length - 2;
    i++
  ) {
    const c =
      candles[i];

    const isSupport =
      c.low <=
        candles[i - 1].low &&
      c.low <=
        candles[i - 2].low &&
      c.low <=
        candles[i + 1].low &&
      c.low <=
        candles[i + 2].low;

    const isResistance =
      c.high >=
        candles[i - 1].high &&
      c.high >=
        candles[i - 2].high &&
      c.high >=
        candles[i + 1].high &&
      c.high >=
        candles[i + 2].high;

    if (
      side === "support" &&
      isSupport &&
      c.low < current
    ) {
      result.push({
        price: c.low,
        score: weight,
        timeframe,
      });
    }

    if (
      side === "resistance" &&
      isResistance &&
      c.high > current
    ) {
      result.push({
        price: c.high,
        score: weight,
        timeframe,
      });
    }
  }

  return result;
}

function clusterLevels(
  candidates: {
    price: number;
    score: number;
    timeframe: string;
  }[],
  tolerance: number,
  zoneWidth: number,
  symbol: string
): ReactionLevel[] {
  const clusters: {
    price: number;
    score: number;
    touches: number;
    timeframes: Set<string>;
  }[] = [];

  for (
    const item of candidates.sort(
      (a, b) =>
        b.score - a.score
    )
  ) {
    const existing =
      clusters.find(
        (cluster) =>
          Math.abs(
            cluster.price -
              item.price
          ) <= tolerance
      );

    if (existing) {
      existing.price =
        (
          existing.price *
            existing.touches +
          item.price
        ) /
        (existing.touches + 1);

      existing.score +=
        item.score;

      existing.touches += 1;

      existing.timeframes.add(
        item.timeframe
      );
    } else {
      clusters.push({
        price: item.price,
        score: item.score,
        touches: 1,
        timeframes:
          new Set([
            item.timeframe,
          ]),
      });
    }
  }

  return clusters
    .map((cluster) => ({
      price: roundPrice(
        cluster.price,
        symbol
      ),

      low: roundPrice(
        cluster.price -
          zoneWidth,
        symbol
      ),

      high: roundPrice(
        cluster.price +
          zoneWidth,
        symbol
      ),

      score:
        cluster.score +
        cluster.touches * 2 +
        cluster.timeframes
          .size *
          3,

      touches:
        cluster.touches,

      timeframes:
        Array.from(
          cluster.timeframes
        ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 3);
}

async function buildReactionLevels(
  symbol: string,
  current: number
): Promise<{
  supports: ReactionLevel[];
  resistances: ReactionLevel[];
}> {
  const [
    daily,
    h4,
    h1,
    m15,
  ] = await Promise.all([
    fetchCandles(
      symbol,
      "1day",
      120
    ),

    fetchCandles(
      symbol,
      "4h",
      180
    ),

    fetchCandles(
      symbol,
      "1h",
      240
    ),

    fetchCandles(
      symbol,
      "15min",
      240
    ),
  ]);

  const atr1h =
    atr(h1, 14) ||
    Math.max(
      current * 0.001,
      0.01
    );

  const tolerance =
    Math.max(
      atr1h * 0.35,
      current * 0.0005
    );

  const zoneWidth =
    Math.max(
      atr1h * 0.12,
      current * 0.00025
    );

  const datasets = [
    [daily, "1D", 7],
    [h4, "4H", 6],
    [h1, "1H", 5],
    [m15, "15m", 3],
  ] as const;

  const supports: {
    price: number;
    score: number;
    timeframe: string;
  }[] = [];

  const resistances: {
    price: number;
    score: number;
    timeframe: string;
  }[] = [];

  for (
    const [
      candles,
      timeframe,
      weight,
    ] of datasets
  ) {
    supports.push(
      ...collectLevelCandidates(
        candles,
        timeframe,
        weight,
        current,
        "support"
      )
    );

    resistances.push(
      ...collectLevelCandidates(
        candles,
        timeframe,
        weight,
        current,
        "resistance"
      )
    );

    if (candles.length) {
      const last =
        candles[
          candles.length - 1
        ];

      if (last.low < current) {
        supports.push({
          price: last.low,
          score:
            weight * 0.8,
          timeframe,
        });
      }

      if (
        last.high > current
      ) {
        resistances.push({
          price: last.high,
          score:
            weight * 0.8,
          timeframe,
        });
      }
    }
  }

  return {
    supports:
      clusterLevels(
        supports,
        tolerance,
        zoneWidth,
        symbol
      ).sort(
        (a, b) =>
          b.price - a.price
      ),

    resistances:
      clusterLevels(
        resistances,
        tolerance,
        zoneWidth,
        symbol
      ).sort(
        (a, b) =>
          a.price - b.price
      ),
  };
}

function buildLevelsMessage(
  symbol: string,
  current: number,
  supports: ReactionLevel[],
  resistances: ReactionLevel[],
  reminder: boolean
) {
  const lines = [
    reminder
      ? `🔔 <b>یادآوری محدوده‌های مهم</b>`
      : `📍 <b>محدوده‌های مهم حمایت و مقاومت</b>`,

    `━━━━━━━━━━━━━━`,

    `📌 Symbol: <b>${escapeHtml(
      displaySymbol(symbol)
    )}</b>`,

    `🔵 Current: <b>${formatPrice(
      current,
      symbol
    )}</b>`,

    ``,

    `🟩 <b>Support / حمایت</b>`,
  ];

  supports.forEach(
    (level, index) => {
      lines.push(
        `🟩 S${
          index + 1
        }: <b>${formatPrice(
          level.low,
          symbol
        )} – ${formatPrice(
          level.high,
          symbol
        )}</b>`
      );
    }
  );

  lines.push(
    ``,
    `🟥 <b>Resistance / مقاومت</b>`
  );

  resistances.forEach(
    (level, index) => {
      lines.push(
        `🟥 R${
          index + 1
        }: <b>${formatPrice(
          level.low,
          symbol
        )} – ${formatPrice(
          level.high,
          symbol
        )}</b>`
      );
    }
  );

  lines.push(
    ``,
    `⚠️ <i>این محدوده‌ها سیگنال مستقیم خرید/فروش نیستند؛ فقط نواحی واکنش احتمالی قیمت هستند.</i>`
  );

  return lines.join("\n");
}

function getLevelReminderState(
  bot: any
): Record<string, any> {
  const config =
    safeObject(
      bot.analysisConfig
    );

  return safeObject(
    config.telegramLevelReminder
  );
}

function isLevelReminderDue(
  bot: any
): {
  due: boolean;
  morning: boolean;
} {
  const state =
    getLevelReminderState(
      bot
    );

  const last =
    state.lastSentAt
      ? new Date(
          String(
            state.lastSentAt
          )
        )
      : null;

  const now =
    new Date();

  const twoHours =
    !last ||
    now.getTime() -
      last.getTime() >=
      2 *
        60 *
        60 *
        1000;

  const hour =
    Number(
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "Asia/Tehran",

          hour: "2-digit",

          hourCycle: "h23",
        }
      ).format(now)
    );

  const dateKey =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Tehran",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(now);

  const morning =
    hour >= 7 &&
    hour < 11 &&
    state.morningDate !==
      dateKey;

  return {
    due:
      twoHours ||
      morning,

    morning,
  };
}

async function maybeSendLevelReminder(
  bot: any,
  force = false
): Promise<boolean> {
  const due =
    isLevelReminderDue(
      bot
    );

  if (!force && !due.due) {
    return false;
  }

  const candles =
    await fetchCandles(
      bot.symbol,
      "1min",
      2
    );

  const current =
    candles[
      candles.length - 1
    ]?.close;

  if (!current) {
    return false;
  }

  const levels =
    await buildReactionLevels(
      bot.symbol,
      current
    );

  const text =
    buildLevelsMessage(
      bot.symbol,
      current,
      levels.supports,
      levels.resistances,
      !force &&
        !due.morning
    );

  const telegram =
    await sendTelegramMessage(
      text
    );

  const config =
    safeObject(
      bot.analysisConfig
    );

  const dateKey =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Tehran",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date()
    );

  const previous =
    getLevelReminderState(
      bot
    );

  config.telegramLevelReminder =
    {
      ...previous,

      lastSentAt:
        new Date().toISOString(),

      morningDate:
        due.morning
          ? dateKey
          : previous.morningDate,

      lastMessageId:
        telegram.messageId,
    };

  await prisma.tradingBot.update(
    {
      where: {
        id: bot.id,
      },

      data: {
        analysisConfig:
          config,
      },
    }
  );

  return true;
}

async function monitorActiveSignals(
  userId: string,
  limit = 50
) {
  const signals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,

          status: {
            in: [
              "ACTIVE",
              "TP1_HIT",
              "TP2_HIT",
            ] as any,
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },

        take: limit,
      }
    );

  const results: any[] =
    [];

  for (
    const signal of
      signals as any[]
  ) {
    try {
      const candles =
        await fetchCandles(
          signal.symbol,
          "1min",
          2
        );

      const price =
        candles[
          candles.length - 1
        ]?.close;

      if (!price) {
        continue;
      }

      const metadata =
        safeObject(
          signal.metadata
        );

      const risk =
        safeObject(
          metadata.risk
        );

      const state =
        safeObject(
          metadata.state
        );

      const levels =
        safeObject(
          metadata.levels
        );

      const direction =
        String(
          signal.direction
        ).toUpperCase() ===
        "SELL"
          ? "SELL"
          : "BUY";

      const rate =
        num(
          risk.usdTomanRate,
          0
        ) || null;

      const stop =
        num(
          signal.stopLoss,
          num(
            levels.stopLoss
          )
        );

      const tp1 =
        num(
          levels.tp1
        );

      const tp2 =
        num(
          levels.tp2
        );

      const tp3 =
        num(
          signal.takeProfit,
          num(
            levels.tp3
          )
        );

      const tp1Profit =
        num(
          risk.tp1Dollars,
          5
        );

      const tp2Profit =
        num(
          risk.tp2Dollars,
          10
        );

      const tp3Profit =
        num(
          risk.tp3Dollars,
          15
        );

      const stopLoss =
        num(
          risk.stopLossDollars,
          4
        );

      let hit:
        | {
            status: string;
            stage: string;
            pnlUsd: number;
            pnlToman:
              | number
              | null;
          }
        | null = null;

      if (
        direction ===
          "BUY" &&
        stop > 0 &&
        price <= stop
      ) {
        hit = {
          status:
            "STOP_LOSS",

          stage:
            "SL",

          pnlUsd:
            -stopLoss,

          pnlToman:
            rate
              ? -stopLoss *
                rate
              : null,
        };
      }

      if (
        direction ===
          "SELL" &&
        stop > 0 &&
        price >= stop
      ) {
        hit = {
          status:
            "STOP_LOSS",

          stage:
            "SL",

          pnlUsd:
            -stopLoss,

          pnlToman:
            rate
              ? -stopLoss *
                rate
              : null,
        };
      }

      const currentStatus =
        String(
          signal.status
        );

      if (
        !hit &&
        currentStatus ===
          "ACTIVE"
      ) {
        if (
          direction ===
            "BUY" &&
          tp1 > 0 &&
          price >= tp1
        ) {
          hit = {
            status:
              "TP1_HIT",

            stage:
              "TP1",

            pnlUsd:
              tp1Profit,

            pnlToman:
              rate
                ? tp1Profit *
                  rate
                : null,
          };
        }

        if (
          direction ===
            "SELL" &&
          tp1 > 0 &&
          price <= tp1
        ) {
          hit = {
            status:
              "TP1_HIT",

            stage:
              "TP1",

            pnlUsd:
              tp1Profit,

            pnlToman:
              rate
                ? tp1Profit *
                  rate
                : null,
          };
        }
      }

      if (
        !hit &&
        currentStatus ===
          "TP1_HIT"
      ) {
        if (
          direction ===
            "BUY" &&
          tp2 > 0 &&
          price >= tp2
        ) {
          hit = {
            status:
              "TP2_HIT",

            stage:
              "TP2",

            pnlUsd:
              tp2Profit,

            pnlToman:
              rate
                ? tp2Profit *
                  rate
                : null,
          };
        }

        if (
          direction ===
            "SELL" &&
          tp2 > 0 &&
          price <= tp2
        ) {
          hit = {
            status:
              "TP2_HIT",

            stage:
              "TP2",

            pnlUsd:
              tp2Profit,

            pnlToman:
              rate
                ? tp2Profit *
                  rate
                : null,
          };
        }
      }

      if (
        !hit &&
        currentStatus ===
          "TP2_HIT"
      ) {
        if (
          direction ===
            "BUY" &&
          tp3 > 0 &&
          price >= tp3
        ) {
          hit = {
            status:
              "TP3_HIT",

            stage:
              "TP3",

            pnlUsd:
              tp3Profit,

            pnlToman:
              rate
                ? tp3Profit *
                  rate
                : null,
          };
        }

        if (
          direction ===
            "SELL" &&
          tp3 > 0 &&
          price <= tp3
        ) {
          hit = {
            status:
              "TP3_HIT",

            stage:
              "TP3",

            pnlUsd:
              tp3Profit,

            pnlToman:
              rate
                ? tp3Profit *
                  rate
                : null,
          };
        }
      }

      const expiresAt =
        signal.expiresAt
          ? new Date(
              signal.expiresAt
            )
          : null;

      if (
        !hit &&
        expiresAt &&
        expiresAt.getTime() <=
          Date.now()
      ) {
        hit = {
          status:
            "EXPIRED",

          stage:
            "EXPIRED",

          pnlUsd: 0,

          pnlToman:
            rate
              ? 0
              : null,
        };
      }

      if (!hit) {
        continue;
      }

      const event = {
        type:
          hit.stage,

        at:
          new Date().toISOString(),

        price,

        pnlUsd:
          hit.pnlUsd,

        pnlToman:
          hit.pnlToman,

        pnlIrr:
          hit.pnlToman ==
          null
            ? null
            : hit.pnlToman *
              10,
      };

      const events =
        Array.isArray(
          metadata.events
        )
          ? [
              ...metadata.events,
              event,
            ]
          : [event];

      const nextState = {
        ...state,

        lastPrice:
          price,

        lastPriceAt:
          new Date().toISOString(),

        lastEvent:
          hit.stage,
      };

      const nextMetadata = {
        ...metadata,

        state:
          nextState,

        events,
      };

      const updateData: any = {
        status:
          hit.status,

        metadata:
          nextMetadata,
      };

      if (
        hit.status ===
          "STOP_LOSS" ||
        hit.status ===
          "TP3_HIT" ||
        hit.status ===
          "EXPIRED"
      ) {
        updateData.closedAt =
          new Date();
      }

      let telegramMessageId:
        | string
        | null = null;

      try {
        const text =
          buildEventMessage(
            {
              symbol:
                signal.symbol,

              direction,

              stage:
                hit.stage,

              price,

              pnlUsd:
                hit.pnlUsd,

              pnlToman:
                hit.pnlToman,

              isLoss:
                hit.status ===
                "STOP_LOSS",
            }
          );

        const telegram =
          await sendTelegramMessage(
            text
          );

        telegramMessageId =
          telegram.messageId;

        const imageUrl =
          hit.status ===
          "STOP_LOSS"
            ? process.env
                .TELEGRAM_TOMAN_IMAGE_URL
            : process.env
                .TELEGRAM_DOLLAR_IMAGE_URL;

        await sendTelegramPhoto(
          imageUrl,
          text
        );

        updateData.telegramSent =
          true;

        updateData.telegramMessageId =
          telegramMessageId;

        updateData.telegramSentAt =
          new Date();

        await prisma.telegramDelivery.create(
          {
            data: {
              signalId:
                signal.id,

              channelId:
                String(
                  process.env
                    .TELEGRAM_SIGNAL_CHAT_ID ||
                    ""
                ),

              messageId:
                telegramMessageId,

              status:
                "SENT",

              sentAt:
                new Date(),
            } as any,
          }
        );
      } catch (
        telegramError: any
      ) {
        await prisma.telegramDelivery
          .create({
            data: {
              signalId:
                signal.id,

              channelId:
                String(
                  process.env
                    .TELEGRAM_SIGNAL_CHAT_ID ||
                    ""
                ),

              messageId:
                null,

              status:
                "FAILED",

              errorMessage:
                String(
                  telegramError?.message ||
                    telegramError
                ),

              sentAt:
                new Date(),
            } as any,
          })
          .catch(
            () =>
              undefined
          );
      }

      await prisma.tradingSignal.update(
        {
          where: {
            id: signal.id,
          },

          data:
            updateData,
        }
      );

      results.push({
        id: signal.id,

        status:
          hit.status,

        stage:
          hit.stage,

        price,

        pnlUsd:
          hit.pnlUsd,

        telegramMessageId,
      });
    } catch (
      error: any
    ) {
      results.push({
        id: signal.id,

        error:
          String(
            error?.message ||
              error
          ),
      });
    }
  }

  return results;
}

async function scanBots(
  userId: string,
  bots: any[]
) {
  const created: any[] =
    [];

  const skipped: any[] =
    [];

  for (
    const bot of bots
  ) {
    try {
      if (!bot.isActive) {
        continue;
      }

      const control =
        getSignalControl(
          bot
        );

      const timeframe =
        normalizeTimeframe(
          bot.timeframe
        );

      const symbol =
        bot.symbol;

      const buyEnabled =
        bot.buyEnabled !==
        false;

      const sellEnabled =
        bot.sellEnabled !==
        false;

      const [
        main,
        m5,
        m15,
        h1,
        h4,
      ] = await Promise.all([
        fetchCandles(
          symbol,
          timeframe,
          260
        ),

        fetchCandles(
          symbol,
          "5min",
          220
        ),

        fetchCandles(
          symbol,
          "15min",
          220
        ),

        fetchCandles(
          symbol,
          "1h",
          220
        ),

        fetchCandles(
          symbol,
          "4h",
          220
        ),
      ]);

      if (
        main.length < 60
      ) {
        skipped.push({
          botId: bot.id,

          reason:
            "not_enough_candles",
        });

        continue;
      }

      const analysis =
        analyzeMarket(
          main,
          {
            m5,
            m15,
            h1,
            h4,
          }
        );

      const direction =
        analysis.direction;

      if (
        direction ===
          "BUY" &&
        !buyEnabled
      ) {
        skipped.push({
          botId: bot.id,
          reason:
            "buy_disabled",
        });

        continue;
      }

      if (
        direction ===
          "SELL" &&
        !sellEnabled
      ) {
        skipped.push({
          botId: bot.id,
          reason:
            "sell_disabled",
        });

        continue;
      }

      if (
        analysis.score <
        control.minScore
      ) {
        skipped.push({
          botId: bot.id,

          reason:
            `score_${analysis.score}`,
        });

        continue;
      }

      if (
        analysis.confirmations <
        control.minConfirmations
      ) {
        skipped.push({
          botId: bot.id,

          reason:
            `confirmations_${analysis.confirmations}`,
        });

        continue;
      }

      if (
        analysis.mtfAgreement <
        control.minMtfAgreement
      ) {
        skipped.push({
          botId: bot.id,

          reason:
            `mtf_${analysis.mtfAgreement}`,
        });

        continue;
      }

      if (
        !analysis.trendConfirmed ||
        !analysis.volatilityConfirmed
      ) {
        skipped.push({
          botId: bot.id,

          reason:
            "trend_or_volatility",
        });

        continue;
      }

      const current =
        main[
          main.length - 1
        ].close;

      const oppositeLevel =
        direction ===
        "BUY"
          ? analysis.resistance
          : analysis.support;

      if (
        oppositeLevel &&
        analysis.indicators.atr >
          0
      ) {
        const room =
          Math.abs(
            oppositeLevel -
              current
          );

        if (
          room <
          analysis.indicators.atr *
            control.minRoomAtr
        ) {
          skipped.push({
            botId: bot.id,

            reason:
              "insufficient_room",
          });

          continue;
        }
      }

      const now =
        new Date();

      const recent =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              symbol,

              createdAt: {
                gte:
                  new Date(
                    now.getTime() -
                      control.minMinutesBetweenSignals *
                        60_000
                  ),
              },
            },

            orderBy: {
              createdAt:
                "desc",
            },
          }
        );

      if (recent) {
        skipped.push({
          botId: bot.id,

          reason:
            "cooldown",
        });

        continue;
      }

      const active =
        await prisma.tradingSignal.findFirst(
          {
            where: {
              userId,

              symbol,

              status: {
                in: [
                  "ACTIVE",
                  "TP1_HIT",
                  "TP2_HIT",
                ] as any,
              },
            },
          }
        );

      if (active) {
        skipped.push({
          botId: bot.id,

          reason:
            "active_signal",
        });

        continue;
      }

      const todayCount =
        await prisma.tradingSignal.count(
          {
            where: {
              userId,

              symbol,

              createdAt: {
                gte:
                  dayStartUtc(),
              },
            },
          }
        );

      if (
        todayCount >=
        control.maxSignalsPerDay
      ) {
        skipped.push({
          botId: bot.id,

          reason:
            "daily_limit",
        });

        continue;
      }

      if (
        bot.sessionFilter !==
          false &&
        !String(
          bot.marketType ||
            ""
        )
          .toUpperCase()
          .includes(
            "CRYPTO"
          )
      ) {
        const hour =
          new Date().getUTCHours();

        if (
          hour < 6 ||
          hour >= 21
        ) {
          skipped.push({
            botId: bot.id,

            reason:
              "session_filter",
          });

          continue;
        }
      }

      if (
        bot.newsFilter !==
        false
      ) {
        const minutes =
          Math.max(
            0,
            num(
              bot.stopBeforeNewsMinutes,
              30
            )
          );

        const newsCount =
          await prisma.economicEvent.count(
            {
              where: {
                eventTime: {
                  gte: now,

                  lte:
                    new Date(
                      now.getTime() +
                        minutes *
                          60_000
                    ),
                },

                importance: {
                  gte: 2,
                },
              },
            }
          );

        if (
          newsCount > 0
        ) {
          skipped.push({
            botId: bot.id,

            reason:
              "news_filter",
          });

          continue;
        }
      }

      const risk =
        getRiskConfig(
          bot
        );

      const toman =
        await getUsdTomanRate();

      risk.usdTomanRate =
        toman.rate;

      risk.usdTomanSource =
        toman.source;

      const levels =
        calculateLevels(
          current,
          direction,
          symbol,
          risk
        );

      const expiresAt =
        addMinutes(
          now,
          control.validityMinutes
        );

      const metadata = {
        version: 2,

        engine:
          "REAL_TWELVE_DATA_MTF",

        levels: {
          entry:
            levels.entry,

          stopLoss:
            levels.stopLoss,

          tp1:
            levels.tp1,

          tp2:
            levels.tp2,

          tp3:
            levels.tp3,
        },

        risk,

        state: {
          createdAt:
            now.toISOString(),

          lastPrice:
            current,

          lastPriceAt:
            now.toISOString(),
        },

        indicators:
          analysis.indicators,

        analysis: {
          mtfBuy:
            analysis.mtfBuy,

          mtfSell:
            analysis.mtfSell,

          mtfAgreement:
            analysis.mtfAgreement,

          trendConfirmed:
            analysis.trendConfirmed,

          volatilityConfirmed:
            analysis.volatilityConfirmed,
        },

        events: [],
      };

      const signal =
        await prisma.tradingSignal.create(
          {
            data: {
              userId,

              botId:
                bot.id,

              symbol,

              direction,

              timeframe,

              entryPrice:
                levels.entry,

              stopLoss:
                levels.stopLoss,

              takeProfit:
                levels.tp3,

              score:
                analysis.score,

              status:
                "ACTIVE",

              source:
                "TWELVE_DATA_ENGINE",

              marketStructure:
                analysis.trendConfirmed
                  ? "TREND_CONFIRMED"
                  : "MIXED",

              supportResistance:
                JSON.stringify(
                  {
                    support:
                      analysis.support,

                    resistance:
                      analysis.resistance,
                  }
                ),

              liquidity:
                analysis.liquiditySweep
                  ? "SWEEP_CONFIRMED"
                  : "NONE",

              pullback:
                analysis.pullback
                  ? "CONFIRMED"
                  : "NONE",

              candlePattern:
                analysis.candlePattern,

              volumeConfirmation:
                analysis.volumeConfirmation,

              multiTimeframeConfirmation:
                analysis.mtfAgreement >=
                control.minMtfAgreement,

              sessionConfirmation:
                true,

              volatilityConfirmation:
                analysis.volatilityConfirmed,

              newsConfirmation:
                true,

              confirmations:
                analysis.confirmations,

              reasons:
                analysis.reasons,

              expiresAt,

              metadata,

              telegramSent:
                false,
            } as any,
          }
        );

      try {
        const text =
          buildSignalMessage(
            {
              symbol,

              direction,

              timeframe,

              levels,

              risk,

              analysis,

              expiresAt,
            }
          );

        const telegram =
          await sendTelegramMessage(
            text
          );

        await sendTelegramPhoto(
          process.env
            .TELEGRAM_DOLLAR_IMAGE_URL,
          text
        );

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
            },
          }
        );

        await prisma.telegramDelivery.create(
          {
            data: {
              signalId:
                signal.id,

              channelId:
                String(
                  process.env
                    .TELEGRAM_SIGNAL_CHAT_ID ||
                    ""
                ),

              messageId:
                telegram.messageId,

              status:
                "SENT",

              sentAt:
                new Date(),
            } as any,
          }
        );
      } catch (
        telegramError: any
      ) {
        await prisma.telegramDelivery
          .create({
            data: {
              signalId:
                signal.id,

              channelId:
                String(
                  process.env
                    .TELEGRAM_SIGNAL_CHAT_ID ||
                    ""
                ),

              messageId:
                null,

              status:
                "FAILED",

              errorMessage:
                String(
                  telegramError?.message ||
                    telegramError
                ),

              sentAt:
                new Date(),
            } as any,
          })
          .catch(
            () =>
              undefined
          );
      }

      created.push({
        ...signal,
        metadata,
      });
    } catch (
      error: any
    ) {
      skipped.push({
        botId: bot.id,

        reason:
          String(
            error?.message ||
              error
          ),
      });
    }
  }

  return {
    created,
    skipped,
  };
}

function periodStart(
  period: string
): Date {
  const now =
    new Date();

  if (
    period === "day"
  ) {
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );
  }

  if (
    period === "week"
  ) {
    const date =
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate()
        )
      );

    const day =
      date.getUTCDay();

    date.setUTCDate(
      date.getUTCDate() -
        day
    );

    return date;
  }

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );
}

async function calculatePerformance(
  userId: string
) {
  const signals =
    await prisma.tradingSignal.findMany(
      {
        where: {
          userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take: 1000,
      }
    );

  const periods =
    [
      "day",
      "week",
      "month",
    ] as const;

  const output: Record<
    string,
    any
  > = {};

  for (
    const period of periods
  ) {
    const start =
      periodStart(
        period
      );

    let pnlUsd = 0;
    let pnlToman = 0;

    let wins = 0;
    let losses = 0;
    let closed = 0;

    for (
      const signal of
        signals as any[]
    ) {
      if (
        new Date(
          signal.createdAt
        ) < start
      ) {
        continue;
      }

      const metadata =
        safeObject(
          signal.metadata
        );

      const events =
        Array.isArray(
          metadata.events
        )
          ? metadata.events
          : [];

      let signalPnl = 0;

      for (
        const event of events
      ) {
        signalPnl += num(
          event.pnlUsd,
          0
        );

        pnlToman += num(
          event.pnlToman,
          num(
            event.pnlIrr,
            0
          ) / 10
        );
      }

      pnlUsd +=
        signalPnl;

      const wasClosed =
        [
          "STOP_LOSS",
          "TP3",
          "EXPIRED",
        ].some(
          (type) =>
            events.some(
              (event: any) =>
                event.type ===
                type
            )
        );

      if (wasClosed) {
        closed++;

        if (
          signalPnl > 0
        ) {
          wins++;
        }

        if (
          signalPnl < 0
        ) {
          losses++;
        }
      }
    }

    output[period] = {
      pnlUsd:
        Number(
          pnlUsd.toFixed(2)
        ),

      pnlToman:
        Math.round(
          pnlToman
        ),

      pnlIrr:
        Math.round(
          pnlToman * 10
        ),

      wins,

      losses,

      closed,
    };
  }

  return output;
}

async function getUserBots(
  userId: string
) {
  return prisma.tradingBot.findMany(
    {
      where: {
        userId,

        isActive: true,
      },

      orderBy: {
        createdAt:
          "asc",
      },
    }
  );
}

function isCronRequest(
  request: NextRequest
): boolean {
  const secret =
    process.env
      .SIGNAL_CRON_SECRET;

  return Boolean(
    secret &&
      request.headers.get(
        "x-cron-secret"
      ) === secret
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const cron =
      isCronRequest(
        request
      );

    const session =
      cron
        ? null
        : await getSession();

    const userId =
      session?.userId;

    const mode =
      request.nextUrl.searchParams.get(
        "mode"
      ) || "user";

    const forceLevels =
      request.nextUrl.searchParams.get(
        "levels"
      ) === "1";

    if (
      !cron &&
      !userId
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    /*
      حالت مانیتور برای Cron
    */

    if (
      cron &&
      mode ===
        "monitor"
    ) {
      const active =
        await prisma.tradingSignal.findMany(
          {
            where: {
              status: {
                in: [
                  "ACTIVE",
                  "TP1_HIT",
                  "TP2_HIT",
                ] as any,
              },
            },

            orderBy: {
              createdAt:
                "asc",
            },

            take: 200,
          }
        );

      const users =
        new Set<string>();

      for (
        const signal of
          active as any[]
      ) {
        users.add(
          signal.userId
        );
      }

      const monitored: any[] =
        [];

      for (
        const uid of users
      ) {
        monitored.push(
          ...(await monitorActiveSignals(
            uid,
            200
          ))
        );
      }

      return NextResponse.json({
        ok: true,

        mode,

        monitored,

        at:
          new Date().toISOString(),
      });
    }

    /*
      حالت ارسال محدوده‌ها
    */

    if (
      cron &&
      mode ===
        "levels"
    ) {
      const bots =
        await prisma.tradingBot.findMany(
          {
            where: {
              isActive: true,
            },
          }
        );

      let sent = 0;

      for (
        const bot of
          bots as any[]
      ) {
        try {
          if (
            await maybeSendLevelReminder(
              bot,
              false
            )
          ) {
            sent++;
          }
        } catch {
          // ادامه
        }
      }

      return NextResponse.json({
        ok: true,

        mode,

        sent,

        at:
          new Date().toISOString(),
      });
    }

    /*
      حالت Scan برای Cron
    */

    if (
      cron &&
      mode ===
        "scan"
    ) {
      const bots =
        await prisma.tradingBot.findMany(
          {
            where: {
              isActive: true,
            },
          }
        );

      const grouped =
        new Map<
          string,
          any[]
        >();

      for (
        const bot of
          bots as any[]
      ) {
        grouped.set(
          bot.userId,
          [
            ...(grouped.get(
              bot.userId
            ) || []),
            bot,
          ]
        );
      }

      const results: any[] =
        [];

      for (
        const [
          uid,
          userBots,
        ] of grouped
      ) {
        results.push({
          userId: uid,

          ...(await scanBots(
            uid,
            userBots
          )),
        });
      }

      return NextResponse.json({
        ok: true,

        mode,

        results,

        at:
          new Date().toISOString(),
      });
    }

    /*
      حالت عادی صفحه Signals
    */

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    /*
      اول سیگنال‌های قبلی را بررسی می‌کنیم
    */

    await monitorActiveSignals(
      userId
    );

    /*
      سپس ربات‌ها را برای سیگنال جدید بررسی می‌کنیم
    */

    const bots =
      await getUserBots(
        userId
      );

    const scan =
      await scanBots(
        userId,
        bots
      );

    /*
      محدوده‌های حمایت و مقاومت
    */

    let levelReminderSent =
      false;

    for (
      const bot of
        bots as any[]
    ) {
      try {
        if (
          await maybeSendLevelReminder(
            bot,
            forceLevels
          )
        ) {
          levelReminderSent =
            true;
        }
      } catch {
        /*
          خطای محدوده نباید
          کل API سیگنال را خراب کند.
        */
      }
    }

    /*
      دریافت سیگنال‌ها
    */

    const signals =
      await prisma.tradingSignal.findMany(
        {
          where: {
            userId,
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
        }
      );

    /*
      محاسبه عملکرد
    */

    const performance =
      await calculatePerformance(
        userId
      );

    return NextResponse.json(
      {
        ok: true,

        signals,

        performance,

        createdSignals:
          scan.created.length,

        skipped:
          scan.skipped,

        levelReminderSent,

        at:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "/api/signals GET error",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          String(
            error?.message ||
              error
          ),
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );

    /*
      ارسال دستی محدوده‌ها
    */

    if (
      body?.action ===
      "level-reminder"
    ) {
      const bots =
        await getUserBots(
          session.userId
        );

      let sent = 0;

      for (
        const bot of
          bots as any[]
      ) {
        try {
          if (
            await maybeSendLevelReminder(
              bot,
              true
            )
          ) {
            sent++;
          }
        } catch {
          // ادامه
        }
      }

      return NextResponse.json({
        ok: true,

        sent,
      });
    }

    return NextResponse.json(
      {
        ok: false,

        error:
          "UNSUPPORTED_ACTION",
      },
      {
        status: 400,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "/api/signals POST error",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          String(
            error?.message ||
              error
          ),
      },
      {
        status: 500,
      }
    );
  }
}
