"use client";

import { useEffect, useMemo, useState } from "react";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Analysis = {
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  bias: "BUY" | "SELL" | "WAIT";
  score: number;
  rsi: number | null;
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  macd: number | null;
  macdSignal: number | null;
  support: number | null;
  resistance: number | null;
  breakout: string;
  pullback: string;
  candlePattern: string;
  structure: string;
  reasons: string[];
};

type MarketResponse = {
  symbol?: string;
  interval?: string;
  candles?: Candle[];
  data?: Candle[];
  price?: number;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  analysis?: Analysis;
  error?: string;
};

type Market = {
  symbol: string;
  name: string;
  type: string;
  tvSymbol: string;
  icon: string;
};

const MARKETS: Market[] = [
  {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    type: "GOLD",
    tvSymbol: "OANDA:XAUUSD",
    icon: "🥇",
  },
  {
    symbol: "BTC/USD",
    name: "Bitcoin / US Dollar",
    type: "CRYPTO",
    tvSymbol: "COINBASE:BTCUSD",
    icon: "₿",
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum / US Dollar",
    type: "CRYPTO",
    tvSymbol: "COINBASE:ETHUSD",
    icon: "Ξ",
  },
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    type: "FOREX",
    tvSymbol: "OANDA:EURUSD",
    icon: "€",
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    type: "FOREX",
    tvSymbol: "OANDA:GBPUSD",
    icon: "£",
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    type: "FOREX",
    tvSymbol: "OANDA:USDJPY",
    icon: "¥",
  },
  {
    symbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    type: "FOREX",
    tvSymbol: "OANDA:AUDUSD",
    icon: "A$",
  },
  {
    symbol: "USD/CAD",
    name: "US Dollar / Canadian Dollar",
    type: "FOREX",
    tvSymbol: "OANDA:USDCAD",
    icon: "C$",
  },
];

const TIMEFRAMES = [
  { label: "1 دقیقه", value: "1min", tv: "1" },
  { label: "5 دقیقه", value: "5min", tv: "5" },
  { label: "15 دقیقه", value: "15min", tv: "15" },
  { label: "30 دقیقه", value: "30min", tv: "30" },
  { label: "1 ساعت", value: "1h", tv: "60" },
  { label: "2 ساعت", value: "2h", tv: "120" },
  { label: "4 ساعت", value: "4h", tv: "240" },
  { label: "8 ساعت", value: "8h", tv: "480" },
];

function number(value: unknown) {
  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function formatPrice(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (value >= 100) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

function normalizeCandles(input: unknown): Candle[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item: any) => {
      const rawTime =
        item?.time ??
        item?.datetime ??
        item?.timestamp;

      let time = 0;

      if (typeof rawTime === "number") {
        time =
          rawTime > 10_000_000_000
            ? Math.floor(rawTime / 1000)
            : Math.floor(rawTime);
      } else if (typeof rawTime === "string") {
        const parsed = Date.parse(rawTime);

        if (!Number.isNaN(parsed)) {
          time = Math.floor(parsed / 1000);
        }
      }

      const open = number(item?.open);
      const high = number(item?.high);
      const low = number(item?.low);
      const close = number(item?.close);
      const volume = number(item?.volume);

      if (
        !time ||
        open === null ||
        high === null ||
        low === null ||
        close === null
      ) {
        return null;
      }

      return {
        time,
        open,
        high,
        low,
        close,
        volume: volume ?? undefined,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.time - b.time) as Candle[];
}

function calculateEMA(
  values: number[],
  period: number
): number | null {
  if (values.length < period) {
    return null;
  }

  let ema =
    values
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) /
    period;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    ema =
      (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRSI(
  values: number[],
  period = 14
): number | null {
  if (values.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change =
      values[i] - values[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] - values[i - 1];

    const gain = change > 0 ? change : 0;
    const loss =
      change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) /
      period;

    averageLoss =
      (averageLoss * (period - 1) + loss) /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const rs = averageGain / averageLoss;

  return 100 - 100 / (1 + rs);
}

function calculateATR(
  candles: Candle[],
  period = 14
): number | null {
  if (candles.length <= period) {
    return null;
  }

  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(
        current.high - previous.close
      ),
      Math.abs(
        current.low - previous.close
      )
    );

    trs.push(tr);
  }

  if (trs.length < period) {
    return null;
  }

  let atr =
    trs
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) /
    period;

  for (let i = period; i < trs.length; i++) {
    atr =
      (atr * (period - 1) + trs[i]) /
      period;
  }

  return atr;
}

function calculateMACD(values: number[]) {
  if (values.length < 50) {
    return {
      macd: null,
      signal: null,
    };
  }

  const multiplier12 = 2 / 13;
  const multiplier26 = 2 / 27;

  let ema12 =
    values
      .slice(0, 12)
      .reduce((a, b) => a + b, 0) / 12;

  let ema26 =
    values
      .slice(0, 26)
      .reduce((a, b) => a + b, 0) / 26;

  const macdValues: number[] = [];

  for (let i = 26; i < values.length; i++) {
    ema12 =
      (values[i] - ema12) *
        multiplier12 +
      ema12;

    ema26 =
      (values[i] - ema26) *
        multiplier26 +
      ema26;

    macdValues.push(ema12 - ema26);
  }

  const signal = calculateEMA(
    macdValues,
    9
  );

  return {
    macd:
      macdValues[macdValues.length - 1] ??
      null,
    signal,
  };
}

function detectCandlePattern(
  candles: Candle[]
) {
  if (candles.length < 3) {
    return "داده کافی نیست";
  }

  const current =
    candles[candles.length - 1];

  const previous =
    candles[candles.length - 2];

  const body = Math.abs(
    current.close - current.open
  );

  const range =
    current.high - current.low;

  if (range <= 0) {
    return "بدون الگوی مشخص";
  }

  const upperWick =
    current.high -
    Math.max(
      current.open,
      current.close
    );

  const lowerWick =
    Math.min(
      current.open,
      current.close
    ) - current.low;

  if (body / range < 0.1) {
    return "Doji — بلاتکلیفی";
  }

  if (
    lowerWick > body * 2 &&
    upperWick < body &&
    current.close > current.open
  ) {
    return "Hammer — احتمال واکنش صعودی";
  }

  if (
    upperWick > body * 2 &&
    lowerWick < body &&
    current.close < current.open
  ) {
    return "Shooting Star — احتمال واکنش نزولی";
  }

  if (
    previous.close < previous.open &&
    current.close > current.open &&
    current.open <= previous.close &&
    current.close >= previous.open
  ) {
    return "Bullish Engulfing";
  }

  if (
    previous.close > previous.open &&
    current.close < current.open &&
    current.open >= previous.close &&
    current.close <= previous.open
  ) {
    return "Bearish Engulfing";
  }

  return current.close >= current.open
    ? "کندل صعودی"
    : "کندل نزولی";
}

function analyzeMarket(
  candles: Candle[]
): Analysis {
  const closes = candles.map(
    (c) => c.close
  );

  const current =
    closes[closes.length - 1];

  const ema20 = calculateEMA(
    closes,
    20
  );

  const ema50 = calculateEMA(
    closes,
    50
  );

  const ema200 = calculateEMA(
    closes,
    200
  );

  const rsi = calculateRSI(closes);
  const atr = calculateATR(candles);

  const macd = calculateMACD(closes);

  const recent = candles.slice(-100);

  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (
    let i = 2;
    i < recent.length - 2;
    i++
  ) {
    if (
      recent[i].high >
        recent[i - 1].high &&
      recent[i].high >
        recent[i - 2].high &&
      recent[i].high >
        recent[i + 1].high &&
      recent[i].high >
        recent[i + 2].high
    ) {
      pivotHighs.push(
        recent[i].high
      );
    }

    if (
      recent[i].low <
        recent[i - 1].low &&
      recent[i].low <
        recent[i - 2].low &&
      recent[i].low <
        recent[i + 1].low &&
      recent[i].low <
        recent[i + 2].low
    ) {
      pivotLows.push(
        recent[i].low
      );
    }
  }

  const supportCandidates =
    pivotLows.filter(
      (value) => value < current
    );

  const resistanceCandidates =
    pivotHighs.filter(
      (value) => value > current
    );

  const support =
    supportCandidates.length
      ? Math.max(
          ...supportCandidates
        )
      : Math.min(
          ...recent.map(
            (c) => c.low
          )
        );

  const resistance =
    resistanceCandidates.length
      ? Math.min(
          ...resistanceCandidates
        )
      : Math.max(
          ...recent.map(
            (c) => c.high
          )
        );

  let bullish = 0;
  let bearish = 0;

  const reasons: string[] = [];

  if (ema20 !== null) {
    if (current > ema20) {
      bullish += 15;
      reasons.push(
        "قیمت بالای EMA20 است"
      );
    } else {
      bearish += 15;
      reasons.push(
        "قیمت زیر EMA20 است"
      );
    }
  }

  if (
    ema20 !== null &&
    ema50 !== null
  ) {
    if (ema20 > ema50) {
      bullish += 20;
      reasons.push(
        "EMA20 بالاتر از EMA50 است"
      );
    } else {
      bearish += 20;
      reasons.push(
        "EMA20 پایین‌تر از EMA50 است"
      );
    }
  }

  if (ema200 !== null) {
    if (current > ema200) {
      bullish += 15;
      reasons.push(
        "قیمت بالای EMA200 است"
      );
    } else {
      bearish += 15;
      reasons.push(
        "قیمت زیر EMA200 است"
      );
    }
  }

  if (rsi !== null) {
    if (
      rsi >= 52 &&
      rsi <= 68
    ) {
      bullish += 15;
      reasons.push(
        "RSI مومنتوم صعودی دارد"
      );
    }

    if (
      rsi >= 32 &&
      rsi <= 48
    ) {
      bearish += 15;
      reasons.push(
        "RSI مومنتوم نزولی دارد"
      );
    }
  }

  if (
    macd.macd !== null &&
    macd.signal !== null
  ) {
    if (
      macd.macd >
      macd.signal
    ) {
      bullish += 15;
      reasons.push(
        "MACD بالای Signal است"
      );
    } else {
      bearish += 15;
      reasons.push(
        "MACD زیر Signal است"
      );
    }
  }

  let breakout =
    "شکست معتبر شناسایی نشد";

  let pullback =
    "پولبک معتبر شناسایی نشد";

  const previous =
    candles[candles.length - 2];

  if (
    previous &&
    resistance &&
    previous.close <= resistance &&
    current > resistance
  ) {
    bullish += 15;

    breakout =
      "Breakout صعودی مقاومت";

    reasons.push(
      "قیمت مقاومت اخیر را شکسته است"
    );
  }

  if (
    previous &&
    support &&
    previous.close >= support &&
    current < support
  ) {
    bearish += 15;

    breakout =
      "Breakout نزولی حمایت";

    reasons.push(
      "قیمت حمایت اخیر را شکسته است"
    );
  }

  if (
    atr &&
    atr > 0
  ) {
    if (
      Math.abs(
        current - resistance
      ) <
      atr * 0.5
    ) {
      pullback =
        "قیمت نزدیک مقاومت کلیدی است";
    }

    if (
      Math.abs(
        current - support
      ) <
      atr * 0.5
    ) {
      pullback =
        "قیمت نزدیک حمایت کلیدی است";
    }
  }

  const candlePattern =
    detectCandlePattern(
      candles
    );

  if (
    candlePattern.includes(
      "Bullish"
    ) ||
    candlePattern.includes(
      "Hammer"
    )
  ) {
    bullish += 8;

    reasons.push(
      "الگوی کندلی صعودی مشاهده شد"
    );
  }

  if (
    candlePattern.includes(
      "Bearish"
    ) ||
    candlePattern.includes(
      "Shooting"
    )
  ) {
    bearish += 8;

    reasons.push(
      "الگوی کندلی نزولی مشاهده شد"
    );
  }

  let trend:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL" =
    "NEUTRAL";

  if (
    bullish >=
    bearish + 10
  ) {
    trend = "BULLISH";
  } else if (
    bearish >=
    bullish + 10
  ) {
    trend = "BEARISH";
  }

  let bias:
    | "BUY"
    | "SELL"
    | "WAIT" =
    "WAIT";

  if (
    bullish >= 65 &&
    bullish >=
      bearish + 12
  ) {
    bias = "BUY";
  } else if (
    bearish >= 65 &&
    bearish >=
      bullish + 12
  ) {
    bias = "SELL";
  }

  let structure =
    "ساختار خنثی";

  if (candles.length >= 10) {
    const old =
      candles[
        candles.length - 10
      ].close;

    if (current > old) {
      structure =
        "ساختار کوتاه‌مدت صعودی";
    } else if (
      current < old
    ) {
      structure =
        "ساختار کوتاه‌مدت نزولی";
    }
  }

  return {
    trend,
    bias,
    score: Math.min(
      100,
      Math.max(
        bullish,
        bearish
      )
    ),
    rsi,
    atr,
    ema20,
    ema50,
    ema200,
    macd: macd.macd,
    macdSignal:
      macd.signal,
    support,
    resistance,
    breakout,
    pullback,
    candlePattern,
    structure,
    reasons:
      reasons.slice(0, 7),
  };
}

function TradingViewChart({
  market,
  interval,
}: {
  market: Market;
  interval: string;
}) {
  const timeframe =
    TIMEFRAMES.find(
      (item) =>
        item.value === interval
    )?.tv ?? "15";

  const params = new URLSearchParams({
    symbol: market.tvSymbol,
    interval: timeframe,
    hidesidetoolbar: "1",
    symboledit: "0",
    saveimage: "0",
    toolbarbg: "050505",
    studies:
      "STD;EMA@tv-basicstudies",
    theme: "dark",
    style: "1",
    timezone: "Etc/UTC",
    withdateranges: "1",
    hideideas: "1",
    hidelegend: "0",
    hidevolume: "0",
    backgroundColor: "050505",
    gridColor: "151515",
    locale: "en",
  });

  return (
    <iframe
      title={`TradingView ${market.symbol}`}
      src={`https://www.tradingview.com/widgetembed/?${params.toString()}`}
      className="h-[430px] w-full border-0"
      loading="lazy"
      allowFullScreen
    />
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="text-[11px] text-gray-600">
        {title}
      </div>

      <div className="mt-2 truncate text-sm font-black text-gray-200">
        {value}
      </div>
    </div>
  );
}

function AnalysisRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 p-3">
      <div className="text-[11px] text-gray-600">
        {title}
      </div>

      <div className="mt-1 text-xs font-bold leading-6 text-gray-300">
        {value}
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [symbol, setSymbol] =
    useState("XAU/USD");

  const [interval, setInterval] =
    useState("15min");

  const [candles, setCandles] =
    useState<Candle[]>([]);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(
      null
    );

  const [price, setPrice] =
    useState<number | null>(
      null
    );

  const [
    changePercent,
    setChangePercent,
  ] = useState<number | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const selectedMarket =
    useMemo(
      () =>
        MARKETS.find(
          (item) =>
            item.symbol ===
            symbol
        ) ?? MARKETS[0],
      [symbol]
    );

  async function loadMarket() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/market?symbol=${encodeURIComponent(
            symbol
          )}&interval=${encodeURIComponent(
            interval
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data: MarketResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "دریافت داده بازار ناموفق بود."
        );
      }

      const raw =
        Array.isArray(
          data.candles
        )
          ? data.candles
          : data.data;

      const normalized =
        normalizeCandles(
          raw
        );

      setCandles(
        normalized
      );

      const calculated =
        data.analysis ??
        (normalized.length
          ? analyzeMarket(
              normalized
            )
          : null);

      setAnalysis(
        calculated
      );

      const latest =
        normalized[
          normalized.length - 1
        ]?.close ?? null;

      setPrice(
        typeof data.currentPrice ===
          "number"
          ? data.currentPrice
          : typeof data.price ===
            "number"
          ? data.price
          : latest
      );

      setChangePercent(
        typeof data.changePercent ===
          "number"
          ? data.changePercent
          : null
      );
    } catch (err: any) {
      setCandles([]);
      setAnalysis(null);

      setError(
        err?.message ||
          "خطا در دریافت اطلاعات بازار."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();

    const timer =
      window.setInterval(
        () => {
          loadMarket();
        },
        60_000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    symbol,
    interval,
  ]);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050505] px-3 py-4 text-white sm:px-5 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <section className="mb-5 rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#15130b] via-[#090909] to-[#050505] p-5 shadow-[0_0_70px_rgba(212,175,55,0.05)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-2xl">
                  📊
                </div>

                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] text-[#d4af37]">
                    TRADING AI
                  </div>

                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                    بازارهای مالی
                  </h1>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-gray-400 sm:text-base">
                نمودار بازار، قیمت، تایم‌فریم‌های
                مختلف و تحلیل تکنیکال الگوریتمی
                در یک محیط ساده و مناسب موبایل.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

              <div>
                <div className="text-sm font-black text-emerald-300">
                  Market Online
                </div>

                <div className="text-xs text-gray-600">
                  TradingView Chart
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SYMBOLS */}

        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black sm:text-lg">
              نمادهای بازار
            </h2>

            <span className="text-xs text-gray-600">
              {MARKETS.length} نماد
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {MARKETS.map(
              (market) => {
                const active =
                  market.symbol ===
                  symbol;

                return (
                  <button
                    key={
                      market.symbol
                    }
                    onClick={() =>
                      setSymbol(
                        market.symbol
                      )
                    }
                    className={[
                      "min-w-[150px] rounded-2xl border p-4 text-right transition",
                      active
                        ? "border-[#d4af37]/60 bg-[#d4af37]/10 shadow-[0_0_30px_rgba(212,175,55,0.08)]"
                        : "border-white/8 bg-white/[0.025] hover:border-[#d4af37]/30",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xl">
                        {
                          market.icon
                        }
                      </span>

                      <span className="rounded-full border border-white/8 px-2 py-1 text-[9px] text-gray-600">
                        {
                          market.type
                        }
                      </span>
                    </div>

                    <div className="text-sm font-black">
                      {
                        market.symbol
                      }
                    </div>

                    <div className="mt-1 truncate text-xs text-gray-600">
                      {
                        market.name
                      }
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* TIMEFRAMES */}

        <section className="mb-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <div className="mb-2 text-xs font-bold text-gray-600">
            تایم‌فریم
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TIMEFRAMES.map(
              (tf) => {
                const active =
                  tf.value ===
                  interval;

                return (
                  <button
                    key={
                      tf.value
                    }
                    onClick={() =>
                      setInterval(
                        tf.value
                      )
                    }
                    className={[
                      "whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition",
                      active
                        ? "bg-[#d4af37] text-black"
                        : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white",
                    ].join(" ")}
                  >
                    {
                      tf.label
                    }
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* SUMMARY */}

        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            title="قیمت فعلی"
            value={formatPrice(
              price
            )}
          />

          <Metric
            title="روند"
            value={
              analysis?.trend ===
              "BULLISH"
                ? "صعودی"
                : analysis?.trend ===
                  "BEARISH"
                ? "نزولی"
                : "خنثی"
            }
          />

          <Metric
            title="RSI"
            value={
              analysis?.rsi !==
                null &&
              analysis?.rsi !==
                undefined
                ? analysis.rsi.toFixed(
                    1
                  )
                : "—"
            }
          />

          <Metric
            title="تغییر"
            value={
              changePercent !==
              null
                ? `${
                    changePercent >=
                    0
                      ? "+"
                      : ""
                  }${changePercent.toFixed(
                    2
                  )}%`
                : "—"
            }
          />
        </section>

        {/* MAIN */}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* CHART */}

          <div className="overflow-hidden rounded-3xl border border-[#d4af37]/15 bg-[#050505]">
            <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {
                    selectedMarket.icon
                  }
                </span>

                <div>
                  <div className="text-lg font-black">
                    {
                      selectedMarket.symbol
                    }
                  </div>

                  <div className="text-xs text-gray-600">
                    {
                      selectedMarket.name
                    }
                  </div>
                </div>
              </div>

              <button
                onClick={
                  loadMarket
                }
                disabled={
                  loading
                }
                className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-xs font-black text-[#e4c65a] hover:bg-[#d4af37]/20 disabled:opacity-50"
              >
                {loading
                  ? "در حال دریافت..."
                  : "↻ بروزرسانی"}
              </button>
            </div>

            <div className="bg-[#050505]">
              <TradingViewChart
                market={
                  selectedMarket
                }
                interval={
                  interval
                }
              />
            </div>

            <div className="border-t border-white/8 px-4 py-3">
              <div className="flex flex-wrap gap-3 text-[10px] text-gray-600">
                <span>
                  نمودار:
                  TradingView
                </span>

                <span>
                  تایم‌فریم:
                  {
                    TIMEFRAMES.find(
                      (x) =>
                        x.value ===
                        interval
                    )?.label
                  }
                </span>

                <span>
                  تحلیل:
                  Trading AI
                </span>
              </div>
            </div>
          </div>

          {/* ANALYSIS */}

          <aside className="space-y-4">
            <div className="rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#15130b] to-[#090909] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black tracking-[0.2em] text-[#d4af37]">
                    SMART ANALYSIS
                  </div>

                  <h2 className="mt-1 text-lg font-black">
                    تحلیل هوشمند بازار
                  </h2>
                </div>

                <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-2 text-xs font-black text-[#e4c65a]">
                  {analysis?.score ??
                    "—"}
                  /100
                </div>
              </div>

              <div
                className={[
                  "rounded-2xl border p-4",
                  analysis?.bias ===
                  "BUY"
                    ? "border-emerald-400/20 bg-emerald-400/5"
                    : analysis?.bias ===
                      "SELL"
                    ? "border-red-400/20 bg-red-400/5"
                    : "border-white/8 bg-white/[0.025]",
                ].join(" ")}
              >
                <div className="text-xs text-gray-600">
                  وضعیت الگوریتم
                </div>

                <div className="mt-2 text-3xl font-black">
                  {analysis?.bias ===
                  "BUY"
                    ? "BUY"
                    : analysis?.bias ===
                      "SELL"
                    ? "SELL"
                    : "WAIT"}
                </div>

                <div className="mt-2 text-xs leading-6 text-gray-600">
                  نتیجه بر اساس
                  روند، EMA، RSI،
                  MACD، ساختار
                  بازار، حمایت،
                  مقاومت و کندل
                  اخیر محاسبه می‌شود.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                📐 حمایت و مقاومت
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4">
                  <div className="text-xs text-gray-600">
                    مقاومت
                  </div>

                  <div className="mt-2 text-sm font-black text-red-300">
                    {formatPrice(
                      analysis?.resistance
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                  <div className="text-xs text-gray-600">
                    حمایت
                  </div>

                  <div className="mt-2 text-sm font-black text-emerald-300">
                    {formatPrice(
                      analysis?.support
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                🧠 تشخیص تکنیکال
              </h3>

              <div className="space-y-3">
                <AnalysisRow
                  title="ساختار بازار"
                  value={
                    analysis?.structure ??
                    "—"
                  }
                />

                <AnalysisRow
                  title="Breakout"
                  value={
                    analysis?.breakout ??
                    "—"
                  }
                />

                <AnalysisRow
                  title="Pullback"
                  value={
                    analysis?.pullback ??
                    "—"
                  }
                />

                <AnalysisRow
                  title="الگوی کندلی"
                  value={
                    analysis?.candlePattern ??
                    "—"
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                📊 اندیکاتورها
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <Metric
                  title="EMA20"
                  value={formatPrice(
                    analysis?.ema20
                  )}
                />

                <Metric
                  title="EMA50"
                  value={formatPrice(
                    analysis?.ema50
                  )}
                />

                <Metric
                  title="EMA200"
                  value={formatPrice(
                    analysis?.ema200
                  )}
                />

                <Metric
                  title="ATR"
                  value={formatPrice(
                    analysis?.atr
                  )}
                />

                <Metric
                  title="RSI"
                  value={
                    analysis?.rsi !==
                      null &&
                    analysis?.rsi !==
                      undefined
                      ? analysis.rsi.toFixed(
                          1
                        )
                      : "—"
                  }
                />

                <Metric
                  title="MACD"
                  value={
                    analysis?.macd !==
                      null &&
                    analysis?.macd !==
                      undefined
                      ? analysis.macd.toFixed(
                          5
                        )
                      : "—"
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                🔎 دلایل تحلیل
              </h3>

              {analysis?.reasons
                ?.length ? (
                <div className="space-y-2">
                  {analysis.reasons.map(
                    (
                      reason,
                      index
                    ) => (
                      <div
                        key={`${reason}-${index}`}
                        className="flex gap-3 rounded-xl border border-white/6 bg-black/20 p-3"
                      >
                        <span className="font-black text-[#d4af37]">
                          {index +
                            1}
                        </span>

                        <span className="text-xs leading-6 text-gray-400">
                          {
                            reason
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-xs leading-6 text-gray-600">
                  برای تحلیل،
                  ابتدا داده بازار
                  باید دریافت شود.
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="text-sm font-black text-red-300">
                  خطای دریافت داده
                </div>

                <div className="mt-2 text-xs leading-6 text-red-200/60">
                  {error}
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d4af37]/10 bg-[#d4af37]/[0.025] p-4">
          <div className="text-xs leading-6 text-gray-600">
            تحلیل این صفحه یک تحلیل تکنیکال الگوریتمی
            بر اساس داده‌های بازار است و نتیجه معامله
            را تضمین نمی‌کند.
          </div>
        </section>
      </div>
    </main>
  );
}
