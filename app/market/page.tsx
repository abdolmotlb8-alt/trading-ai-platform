"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
} from "lightweight-charts";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type MarketItem = {
  symbol: string;
  name: string;
  market: string;
  icon: string;
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

const MARKETS: MarketItem[] = [
  {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    market: "GOLD",
    icon: "🥇",
  },
  {
    symbol: "BTC/USD",
    name: "Bitcoin / US Dollar",
    market: "CRYPTO",
    icon: "₿",
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum / US Dollar",
    market: "CRYPTO",
    icon: "Ξ",
  },
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    market: "FOREX",
    icon: "€",
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    market: "FOREX",
    icon: "£",
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    market: "FOREX",
    icon: "¥",
  },
  {
    symbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    market: "FOREX",
    icon: "A$",
  },
  {
    symbol: "USD/CAD",
    name: "US Dollar / Canadian Dollar",
    market: "FOREX",
    icon: "C$",
  },
];

const TIMEFRAMES = [
  { label: "1 دقیقه", value: "1min" },
  { label: "5 دقیقه", value: "5min" },
  { label: "15 دقیقه", value: "15min" },
  { label: "30 دقیقه", value: "30min" },
  { label: "1 ساعت", value: "1h" },
  { label: "2 ساعت", value: "2h" },
  { label: "4 ساعت", value: "4h" },
  { label: "8 ساعت", value: "8h" },
];

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
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
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
}

function normalizeCandles(input: unknown): Candle[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item: any) => {
      const rawTime = item?.time ?? item?.datetime ?? item?.timestamp;

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

      const open = Number(item?.open);
      const high = Number(item?.high);
      const low = Number(item?.low);
      const close = Number(item?.close);
      const volume =
        item?.volume !== undefined ? Number(item.volume) : undefined;

      if (
        !time ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        return null;
      }

      return {
        time,
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume ?? NaN) ? volume : undefined,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.time - b.time) as Candle[];
}

function calculateEMA(values: number[], period: number) {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);

  let ema = values
    .slice(0, period)
    .reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRSI(values: number[], period = 14) {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;

  const rs = averageGain / averageLoss;

  return 100 - 100 / (1 + rs);
}

function calculateATR(candles: Candle[], period = 14) {
  if (candles.length <= period) return null;

  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trs.push(tr);
  }

  if (trs.length < period) return null;

  let atr =
    trs.slice(0, period).reduce((sum, value) => sum + value, 0) /
    period;

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return atr;
}

function calculateMACD(values: number[]) {
  if (values.length < 35) {
    return {
      macd: null,
      signal: null,
    };
  }

  const ema12Series: number[] = [];
  const ema26Series: number[] = [];

  const multiplier12 = 2 / 13;
  const multiplier26 = 2 / 27;

  let ema12 =
    values.slice(0, 12).reduce((a, b) => a + b, 0) / 12;

  let ema26 =
    values.slice(0, 26).reduce((a, b) => a + b, 0) / 26;

  for (let i = 12; i < values.length; i++) {
    ema12 =
      (values[i] - ema12) * multiplier12 + ema12;

    ema12Series.push(ema12);
  }

  for (let i = 26; i < values.length; i++) {
    ema26 =
      (values[i] - ema26) * multiplier26 + ema26;

    ema26Series.push(ema26);
  }

  const macdValues: number[] = [];

  const startOffset = 14;

  for (
    let i = startOffset;
    i < ema12Series.length;
    i++
  ) {
    const fast = ema12Series[i];
    const slowIndex = i - 14;

    const slow = ema26Series[slowIndex];

    if (slow !== undefined) {
      macdValues.push(fast - slow);
    }
  }

  if (macdValues.length < 9) {
    return {
      macd: null,
      signal: null,
    };
  }

  const signal = calculateEMA(macdValues, 9);

  return {
    macd: macdValues[macdValues.length - 1] ?? null,
    signal,
  };
}

function detectCandlePattern(candles: Candle[]) {
  if (candles.length < 3) return "الگوی کندلی مشخصی شناسایی نشد";

  const c = candles[candles.length - 1];

  const body = Math.abs(c.close - c.open);

  const upperWick = c.high - Math.max(c.open, c.close);

  const lowerWick = Math.min(c.open, c.close) - c.low;

  const range = c.high - c.low;

  if (range <= 0) {
    return "بدون الگوی قابل اتکا";
  }

  if (body / range < 0.1) {
    return "Doji — بلاتکلیفی بازار";
  }

  if (
    lowerWick > body * 2 &&
    upperWick < body &&
    c.close > c.open
  ) {
    return "Hammer — احتمال واکنش صعودی";
  }

  if (
    upperWick > body * 2 &&
    lowerWick < body &&
    c.close < c.open
  ) {
    return "Shooting Star — احتمال واکنش نزولی";
  }

  const previous = candles[candles.length - 2];

  if (
    previous.close < previous.open &&
    c.close > c.open &&
    c.open <= previous.close &&
    c.close >= previous.open
  ) {
    return "Bullish Engulfing — پوشش صعودی";
  }

  if (
    previous.close > previous.open &&
    c.close < c.open &&
    c.open >= previous.close &&
    c.close <= previous.open
  ) {
    return "Bearish Engulfing — پوشش نزولی";
  }

  return c.close > c.open
    ? "کندل صعودی"
    : "کندل نزولی";
}

function calculateAnalysis(candles: Candle[]): Analysis {
  const closes = candles.map((c) => c.close);

  const current = closes[closes.length - 1];

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  const rsi = calculateRSI(closes);
  const atr = calculateATR(candles);

  const macd = calculateMACD(closes);

  const recent = candles.slice(-80);

  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = 2; i < recent.length - 2; i++) {
    const candle = recent[i];

    if (
      candle.high > recent[i - 1].high &&
      candle.high > recent[i - 2].high &&
      candle.high > recent[i + 1].high &&
      candle.high > recent[i + 2].high
    ) {
      pivotHighs.push(candle.high);
    }

    if (
      candle.low < recent[i - 1].low &&
      candle.low < recent[i - 2].low &&
      candle.low < recent[i + 1].low &&
      candle.low < recent[i + 2].low
    ) {
      pivotLows.push(candle.low);
    }
  }

  const supportCandidates = pivotLows.filter(
    (value) => value < current
  );

  const resistanceCandidates = pivotHighs.filter(
    (value) => value > current
  );

  const support =
    supportCandidates.length > 0
      ? Math.max(...supportCandidates)
      : Math.min(...recent.map((c) => c.low));

  const resistance =
    resistanceCandidates.length > 0
      ? Math.min(...resistanceCandidates)
      : Math.max(...recent.map((c) => c.high));

  let bullish = 0;
  let bearish = 0;

  const reasons: string[] = [];

  if (ema20 !== null) {
    if (current > ema20) {
      bullish += 15;
      reasons.push("قیمت بالای EMA20 قرار دارد");
    } else {
      bearish += 15;
      reasons.push("قیمت زیر EMA20 قرار دارد");
    }
  }

  if (ema50 !== null && ema20 !== null) {
    if (ema20 > ema50) {
      bullish += 20;
      reasons.push("EMA20 بالاتر از EMA50 است");
    } else {
      bearish += 20;
      reasons.push("EMA20 پایین‌تر از EMA50 است");
    }
  }

  if (ema200 !== null) {
    if (current > ema200) {
      bullish += 15;
      reasons.push("قیمت بالای EMA200 است");
    } else {
      bearish += 15;
      reasons.push("قیمت زیر EMA200 است");
    }
  }

  if (rsi !== null) {
    if (rsi >= 52 && rsi <= 68) {
      bullish += 15;
      reasons.push("RSI مومنتوم صعودی کنترل‌شده دارد");
    }

    if (rsi >= 32 && rsi <= 48) {
      bearish += 15;
      reasons.push("RSI مومنتوم نزولی کنترل‌شده دارد");
    }
  }

  if (macd.macd !== null && macd.signal !== null) {
    if (macd.macd > macd.signal) {
      bullish += 15;
      reasons.push("MACD بالای خط سیگنال است");
    } else {
      bearish += 15;
      reasons.push("MACD زیر خط سیگنال است");
    }
  }

  const previous = candles[candles.length - 2];

  let breakout = "شکست معتبر شناسایی نشد";
  let pullback = "پولبک معتبر شناسایی نشد";

  if (previous && resistance) {
    if (
      previous.close <= resistance &&
      current > resistance
    ) {
      bullish += 15;
      breakout = "Breakout صعودی بالای مقاومت";
      reasons.push("شکست صعودی مقاومت اخیر");
    }
  }

  if (previous && support) {
    if (
      previous.close >= support &&
      current < support
    ) {
      bearish += 15;
      breakout = "Breakout نزولی زیر حمایت";
      reasons.push("شکست نزولی حمایت اخیر");
    }
  }

  if (atr && atr > 0) {
    if (
      current > resistance &&
      Math.abs(current - resistance) < atr * 0.6
    ) {
      bullish += 8;
      pullback = "قیمت در محدوده پولبک مقاومت شکسته‌شده";
    }

    if (
      current < support &&
      Math.abs(current - support) < atr * 0.6
    ) {
      bearish += 8;
      pullback = "قیمت در محدوده پولبک حمایت شکسته‌شده";
    }
  }

  const candlePattern = detectCandlePattern(candles);

  if (
    candlePattern.includes("Bullish") ||
    candlePattern.includes("Hammer")
  ) {
    bullish += 8;
    reasons.push("الگوی کندلی متمایل به صعود مشاهده شد");
  }

  if (
    candlePattern.includes("Bearish") ||
    candlePattern.includes("Shooting")
  ) {
    bearish += 8;
    reasons.push("الگوی کندلی متمایل به نزول مشاهده شد");
  }

  const score = Math.min(
    100,
    Math.max(bullish, bearish)
  );

  let trend: Analysis["trend"] = "NEUTRAL";

  if (bullish >= bearish + 10) {
    trend = "BULLISH";
  } else if (bearish >= bullish + 10) {
    trend = "BEARISH";
  }

  let bias: Analysis["bias"] = "WAIT";

  if (bullish >= 65 && bullish >= bearish + 12) {
    bias = "BUY";
  } else if (
    bearish >= 65 &&
    bearish >= bullish + 12
  ) {
    bias = "SELL";
  }

  let structure = "ساختار خنثی";

  if (candles.length >= 8) {
    const first = candles[candles.length - 8].close;
    const last = candles[candles.length - 1].close;

    if (last > first) {
      structure = "ساختار کوتاه‌مدت صعودی";
    } else if (last < first) {
      structure = "ساختار کوتاه‌مدت نزولی";
    }
  }

  return {
    trend,
    bias,
    score,
    rsi,
    atr,
    ema20,
    ema50,
    ema200,
    macd: macd.macd,
    macdSignal: macd.signal,
    support,
    resistance,
    breakout,
    pullback,
    candlePattern,
    structure,
    reasons: reasons.slice(0, 7),
  };
}

function Chart({
  candles,
}: {
  candles: Candle[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) {
      return;
    }

    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 430,

      layout: {
        background: {
          type: ColorType.Solid,
          color: "#080808",
        },
        textColor: "#d8d8d8",
      },

      grid: {
        vertLines: {
          color: "rgba(212,175,55,0.07)",
        },
        horzLines: {
          color: "rgba(212,175,55,0.07)",
        },
      },

      crosshair: {
        vertLine: {
          color: "rgba(212,175,55,0.35)",
        },
        horzLine: {
          color: "rgba(212,175,55,0.35)",
        },
      },

      rightPriceScale: {
        borderColor: "rgba(212,175,55,0.18)",
      },

      timeScale: {
        borderColor: "rgba(212,175,55,0.18)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 7,
      },

      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },

      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#d4af37",
      downColor: "#b43b3b",
      borderUpColor: "#e4c65a",
      borderDownColor: "#b43b3b",
      wickUpColor: "#d4af37",
      wickDownColor: "#b43b3b",
    });

    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const closes = candles.map((c) => c.close);

    const ema20Data: any[] = [];
    const ema50Data: any[] = [];

    const multiplier20 = 2 / 21;
    const multiplier50 = 2 / 51;

    if (closes.length >= 20) {
      let ema20 =
        closes.slice(0, 20).reduce((a, b) => a + b, 0) /
        20;

      for (let i = 19; i < closes.length; i++) {
        if (i > 19) {
          ema20 =
            (closes[i] - ema20) * multiplier20 + ema20;
        }

        ema20Data.push({
          time: candles[i].time as any,
          value: ema20,
        });
      }
    }

    if (closes.length >= 50) {
      let ema50 =
        closes.slice(0, 50).reduce((a, b) => a + b, 0) /
        50;

      for (let i = 49; i < closes.length; i++) {
        if (i > 49) {
          ema50 =
            (closes[i] - ema50) * multiplier50 + ema50;
        }

        ema50Data.push({
          time: candles[i].time as any,
          value: ema50,
        });
      }
    }

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#d4af37",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema50Series = chart.addSeries(LineSeries, {
      color: "#f4f4f4",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    ema20Series.setData(ema20Data);
    ema50Series.setData(ema50Data);

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;

      chart.applyOptions({
        width: containerRef.current.clientWidth,
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="h-[430px] w-full overflow-hidden rounded-2xl"
    />
  );
}

export default function MarketPage() {
  const [symbol, setSymbol] = useState("XAU/USD");
  const [interval, setInterval] = useState("15min");

  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [price, setPrice] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedMarket = useMemo(
    () => MARKETS.find((item) => item.symbol === symbol) ?? MARKETS[0],
    [symbol]
  );

  async function loadMarket() {
    setLoading(true);
    setError("");

    try {
      const url =
        `/api/market?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${encodeURIComponent(interval)}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data: MarketResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "دریافت اطلاعات بازار با خطا مواجه شد."
        );
      }

      const normalized =
        normalizeCandles(data.candles).length > 0
          ? normalizeCandles(data.candles)
          : normalizeCandles(data.data);

      if (normalized.length === 0) {
        throw new Error(
          "داده کندلی از API دریافت نشد."
        );
      }

      setCandles(normalized);

      const calculated =
        data.analysis ??
        calculateAnalysis(normalized);

      setAnalysis(calculated);

      const lastClose =
        normalized[normalized.length - 1]?.close ?? null;

      setPrice(
        typeof data.currentPrice === "number"
          ? data.currentPrice
          : typeof data.price === "number"
          ? data.price
          : lastClose
      );

      setChangePercent(
        typeof data.changePercent === "number"
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

    const timer = setInterval(() => {
      loadMarket();
    }, 60_000);

    return () => clearInterval(timer);
  }, [symbol, interval]);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050505] px-3 py-4 text-white sm:px-5 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}
        <section className="mb-5 rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#15130c] via-[#090909] to-[#050505] p-5 shadow-[0_0_60px_rgba(212,175,55,0.06)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-xl">
                  📊
                </div>

                <div>
                  <div className="text-xs font-bold tracking-[0.25em] text-[#d4af37]">
                    TRADING AI
                  </div>

                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                    بازارهای مالی
                  </h1>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-gray-400 sm:text-base">
                نمودار زنده، کندل‌ها، روند، مومنتوم،
                حمایت و مقاومت و تحلیل تکنیکال الگوریتمی
                در یک محیط تمیز و مناسب موبایل.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

              <div>
                <div className="text-sm font-bold text-emerald-300">
                  Market Engine
                </div>

                <div className="text-xs text-gray-500">
                  دریافت داده از API
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SYMBOLS */}
        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-white sm:text-lg">
              نمادها
            </h2>

            <span className="text-xs text-gray-500">
              {MARKETS.length} بازار
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {MARKETS.map((market) => {
              const active = market.symbol === symbol;

              return (
                <button
                  key={market.symbol}
                  onClick={() => setSymbol(market.symbol)}
                  className={[
                    "min-w-[145px] rounded-2xl border p-4 text-right transition",
                    active
                      ? "border-[#d4af37]/60 bg-[#d4af37]/10 shadow-[0_0_25px_rgba(212,175,55,0.08)]"
                      : "border-white/8 bg-white/[0.025] hover:border-[#d4af37]/30 hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xl">
                      {market.icon}
                    </span>

                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-gray-500">
                      {market.market}
                    </span>
                  </div>

                  <div className="text-sm font-black">
                    {market.symbol}
                  </div>

                  <div className="mt-1 truncate text-xs text-gray-500">
                    {market.name}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* TIMEFRAMES */}
        <section className="mb-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <div className="mb-2 px-1 text-xs font-bold text-gray-500">
            تایم‌فریم
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TIMEFRAMES.map((tf) => {
              const active = tf.value === interval;

              return (
                <button
                  key={tf.value}
                  onClick={() => setInterval(tf.value)}
                  className={[
                    "whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition",
                    active
                      ? "bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white",
                  ].join(" ")}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* MARKET SUMMARY */}
        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <div className="text-xs text-gray-500">
              قیمت فعلی
            </div>

            <div className="mt-2 text-lg font-black text-[#f1d36a] sm:text-xl">
              {formatPrice(price)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <div className="text-xs text-gray-500">
              روند
            </div>

            <div className="mt-2 text-sm font-black">
              {analysis?.trend === "BULLISH"
                ? "صعودی"
                : analysis?.trend === "BEARISH"
                ? "نزولی"
                : "خنثی"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <div className="text-xs text-gray-500">
              RSI
            </div>

            <div className="mt-2 text-lg font-black">
              {analysis?.rsi !== null &&
              analysis?.rsi !== undefined
                ? analysis.rsi.toFixed(1)
                : "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <div className="text-xs text-gray-500">
              تغییر
            </div>

            <div
              className={[
                "mt-2 text-lg font-black",
                changePercent !== null &&
                changePercent >= 0
                  ? "text-emerald-400"
                  : "text-red-400",
              ].join(" ")}
            >
              {changePercent !== null
                ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`
                : "—"}
            </div>
          </div>
        </section>

        {/* MAIN GRID */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* CHART */}
          <div className="overflow-hidden rounded-3xl border border-[#d4af37]/15 bg-[#080808]">
            <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {selectedMarket.icon}
                  </span>

                  <div>
                    <div className="text-lg font-black">
                      {selectedMarket.symbol}
                    </div>

                    <div className="text-xs text-gray-500">
                      {selectedMarket.name}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={loadMarket}
                disabled={loading}
                className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-xs font-bold text-[#e5c75d] transition hover:bg-[#d4af37]/20 disabled:opacity-50"
              >
                {loading ? "در حال بروزرسانی..." : "↻ بروزرسانی"}
              </button>
            </div>

            <div className="relative">
              {loading && candles.length === 0 ? (
                <div className="flex h-[430px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />

                    <div className="text-sm font-bold text-gray-300">
                      در حال دریافت داده بازار...
                    </div>

                    <div className="mt-2 text-xs text-gray-600">
                      {selectedMarket.symbol} · {interval}
                    </div>
                  </div>
                </div>
              ) : candles.length > 0 ? (
                <Chart candles={candles} />
              ) : (
                <div className="flex h-[430px] items-center justify-center px-6 text-center">
                  <div>
                    <div className="mb-3 text-4xl">
                      📡
                    </div>

                    <div className="text-sm font-black text-gray-300">
                      داده بازار در دسترس نیست
                    </div>

                    <div className="mt-2 text-xs leading-6 text-gray-600">
                      {error || "خطایی در دریافت اطلاعات رخ داده است."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 border-t border-white/8 px-4 py-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-2">
                <i className="h-2 w-5 rounded-full bg-[#d4af37]" />
                EMA20
              </span>

              <span className="flex items-center gap-2">
                <i className="h-2 w-5 rounded-full bg-white" />
                EMA50
              </span>

              <span>
                کندل: {candles.length}
              </span>
            </div>
          </div>

          {/* ANALYSIS */}
          <aside className="space-y-4">
            <div className="rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#15130b] to-[#090909] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold tracking-wider text-[#d4af37]">
                    SMART ANALYSIS
                  </div>

                  <h2 className="mt-1 text-lg font-black">
                    تحلیل تکنیکال
                  </h2>
                </div>

                <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-2 text-xs font-black text-[#e4c65a]">
                  {analysis?.score ?? "—"}/100
                </div>
              </div>

              <div
                className={[
                  "rounded-2xl border p-4",
                  analysis?.bias === "BUY"
                    ? "border-emerald-400/20 bg-emerald-400/5"
                    : analysis?.bias === "SELL"
                    ? "border-red-400/20 bg-red-400/5"
                    : "border-white/8 bg-white/[0.025]",
                ].join(" ")}
              >
                <div className="text-xs text-gray-500">
                  وضعیت فعلی الگوریتم
                </div>

                <div className="mt-2 text-2xl font-black">
                  {analysis?.bias === "BUY"
                    ? "BUY"
                    : analysis?.bias === "SELL"
                    ? "SELL"
                    : "WAIT"}
                </div>

                <div className="mt-2 text-xs leading-6 text-gray-500">
                  این نتیجه حاصل ترکیب روند،
                  EMA، RSI، MACD، ساختار بازار،
                  حمایت/مقاومت و کندل اخیر است.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                📐 حمایت و مقاومت
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4">
                  <div className="text-xs text-gray-500">
                    مقاومت
                  </div>

                  <div className="mt-2 text-base font-black text-red-300">
                    {formatPrice(analysis?.resistance)}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                  <div className="text-xs text-gray-500">
                    حمایت
                  </div>

                  <div className="mt-2 text-base font-black text-emerald-300">
                    {formatPrice(analysis?.support)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                🧠 تشخیص ساختار بازار
              </h3>

              <div className="space-y-3">
                <InfoRow
                  title="ساختار"
                  value={analysis?.structure}
                />

                <InfoRow
                  title="شکست"
                  value={analysis?.breakout}
                />

                <InfoRow
                  title="پولبک"
                  value={analysis?.pullback}
                />

                <InfoRow
                  title="کندل"
                  value={analysis?.candlePattern}
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
                  value={formatPrice(analysis?.ema20)}
                />

                <Metric
                  title="EMA50"
                  value={formatPrice(analysis?.ema50)}
                />

                <Metric
                  title="EMA200"
                  value={formatPrice(analysis?.ema200)}
                />

                <Metric
                  title="ATR"
                  value={formatPrice(analysis?.atr)}
                />

                <Metric
                  title="RSI"
                  value={
                    analysis?.rsi !== null &&
                    analysis?.rsi !== undefined
                      ? analysis.rsi.toFixed(1)
                      : "—"
                  }
                />

                <Metric
                  title="MACD"
                  value={
                    analysis?.macd !== null &&
                    analysis?.macd !== undefined
                      ? analysis.macd.toFixed(5)
                      : "—"
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-sm font-black">
                🔎 دلایل تحلیل
              </h3>

              {analysis?.reasons?.length ? (
                <div className="space-y-2">
                  {analysis.reasons.map((reason, index) => (
                    <div
                      key={`${reason}-${index}`}
                      className="flex gap-3 rounded-xl border border-white/6 bg-black/20 p-3"
                    >
                      <span className="text-[#d4af37]">
                        {index + 1}
                      </span>

                      <span className="text-xs leading-6 text-gray-400">
                        {reason}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs leading-6 text-gray-600">
                  هنوز داده کافی برای تحلیل دریافت نشده است.
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* FOOTER NOTE */}
        <section className="mt-4 rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.025] p-4">
          <div className="text-xs leading-6 text-gray-500">
            ⚠️ تحلیل این صفحه الگوریتمی است و بر اساس داده
            بازار و اندیکاتورهای تکنیکال محاسبه می‌شود.
            هیچ الگوریتمی نمی‌تواند نتیجه معامله را تضمین کند.
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 p-3">
      <div className="text-[11px] text-gray-600">
        {title}
      </div>

      <div className="mt-1 text-xs font-bold leading-6 text-gray-300">
        {value || "—"}
      </div>
    </div>
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
    <div className="rounded-xl border border-white/6 bg-black/20 p-3">
      <div className="text-[10px] text-gray-600">
        {title}
      </div>

      <div className="mt-1 truncate text-xs font-black text-gray-300">
        {value}
      </div>
    </div>
  );
}
