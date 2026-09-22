"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Analysis = {
  price: number;

  ema20: number;
  ema50: number;
  ema200: number;

  rsi: number;

  atr: number;

  macd: number;
  macdSignal: number;
  macdHistogram: number;

  bollinger: {
    middle: number;
    upper: number;
    lower: number;
  };

  trend:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

  direction:
    | "BUY"
    | "SELL"
    | "WAIT";

  strength: number;

  bullishScore: number;
  bearishScore: number;

  breakout:
    | "BULLISH"
    | "BEARISH"
    | "NONE";

  candlePattern: string;

  candlePatternText: string;

  support1: number;
  support2: number;

  resistance1: number;
  resistance2: number;

  reasons: string[];
};

type MarketResponse = {
  success: boolean;

  symbol: string;

  interval: string;

  generatedAt: string;

  candles: Candle[];

  analysis: Analysis;

  error?: string;
};

const SYMBOLS = [
  {
    value: "XAU/USD",
    label: "طلا",
    code: "XAU",
  },
  {
    value: "BTC/USD",
    label: "بیت‌کوین",
    code: "BTC",
  },
  {
    value: "ETH/USD",
    label: "اتریوم",
    code: "ETH",
  },
  {
    value: "EUR/USD",
    label: "یورو / دلار",
    code: "EUR",
  },
  {
    value: "GBP/USD",
    label: "پوند / دلار",
    code: "GBP",
  },
  {
    value: "USD/JPY",
    label: "دلار / ین",
    code: "JPY",
  },
  {
    value: "AUD/USD",
    label: "دلار استرالیا",
    code: "AUD",
  },
  {
    value: "USD/CAD",
    label: "دلار کانادا",
    code: "CAD",
  },
];

const TIMEFRAMES = [
  {
    value: "1min",
    label: "1 دقیقه",
  },
  {
    value: "5min",
    label: "5 دقیقه",
  },
  {
    value: "15min",
    label: "15 دقیقه",
  },
  {
    value: "30min",
    label: "30 دقیقه",
  },
  {
    value: "1h",
    label: "1 ساعت",
  },
  {
    value: "2h",
    label: "2 ساعت",
  },
  {
    value: "4h",
    label: "4 ساعت",
  },
];

function formatPrice(
  value: number
) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  if (value >= 100) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 3,
      }
    );
  }

  if (value >= 1) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 5,
      }
    );
  }

  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 8,
    }
  );
}

function formatDate(
  value: string
) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "fa-IR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

function toChartTime(
  value: string
): Time {
  const timestamp =
    Math.floor(
      new Date(value).getTime() /
        1000
    );

  return timestamp as Time;
}

function getSymbolInfo(
  symbol: string
) {
  return (
    SYMBOLS.find(
      (item) =>
        item.value === symbol
    ) || SYMBOLS[0]
  );
}

function trendText(
  trend: Analysis["trend"]
) {
  if (trend === "BULLISH") {
    return "صعودی";
  }

  if (trend === "BEARISH") {
    return "نزولی";
  }

  return "خنثی";
}

function directionText(
  direction: Analysis["direction"]
) {
  if (direction === "BUY") {
    return "خرید";
  }

  if (direction === "SELL") {
    return "فروش";
  }

  return "انتظار";
}

function patternText(
  value: string
) {
  const map: Record<
    string,
    string
  > = {
    BULLISH_ENGULFING:
      "Bullish Engulfing",
    BEARISH_ENGULFING:
      "Bearish Engulfing",
    HAMMER: "Hammer",
    SHOOTING_STAR:
      "Shooting Star",
    DOJI: "Doji",
    NONE: "بدون الگوی قدرتمند",
  };

  return (
    map[value] ||
    value
  );
}

export default function MarketPage() {
  const chartContainer =
    useRef<HTMLDivElement | null>(
      null
    );

  const chartRef =
    useRef<IChartApi | null>(
      null
    );

  const candleSeriesRef =
    useRef<ISeriesApi<"Candlestick"> | null>(
      null
    );

  const ema20SeriesRef =
    useRef<ISeriesApi<"Line"> | null>(
      null
    );

  const ema50SeriesRef =
    useRef<ISeriesApi<"Line"> | null>(
      null
    );

  const [
    symbol,
    setSymbol,
  ] = useState("XAU/USD");

  const [
    interval,
    setIntervalValue,
  ] = useState("15min");

  const [
    data,
    setData,
  ] =
    useState<MarketResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    lastUpdate,
    setLastUpdate,
  ] = useState("");

  const loadMarket =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await fetch(
              `/api/market?symbol=${encodeURIComponent(
                symbol
              )}&interval=${encodeURIComponent(
                interval
              )}`,
              {
                cache: "no-store",
              }
            );

          const result =
            (await response.json()) as MarketResponse;

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                "داده بازار دریافت نشد."
            );
          }

          setData(result);

          setLastUpdate(
            result.generatedAt
          );
        } catch (err) {
          console.error(
            "MARKET_PAGE_ERROR",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت بازار."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [symbol, interval]
    );

  useEffect(() => {
    loadMarket();

    const timer =
      window.setInterval(
        () => {
          loadMarket(true);
        },
        60_000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [loadMarket]);

  useEffect(() => {
    if (
      !chartContainer.current ||
      !data?.candles?.length
    ) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.remove();

      chartRef.current =
        null;

      candleSeriesRef.current =
        null;

      ema20SeriesRef.current =
        null;

      ema50SeriesRef.current =
        null;
    }

    const container =
      chartContainer.current;

    const chart =
      createChart(
        container,
        {
          autoSize: true,

          layout: {
            background: {
              type:
                ColorType.Solid,
              color:
                "#0a0906",
            },

            textColor:
              "#b8aa8a",
          },

          grid: {
            vertLines: {
              color:
                "rgba(212,175,55,0.07)",
            },

            horzLines: {
              color:
                "rgba(212,175,55,0.07)",
            },
          },

          crosshair: {
            vertLine: {
              color:
                "rgba(212,175,55,0.28)",
            },

            horzLine: {
              color:
                "rgba(212,175,55,0.28)",
            },
          },

          rightPriceScale: {
            borderColor:
              "rgba(212,175,55,0.15)",
          },

          timeScale: {
            borderColor:
              "rgba(212,175,55,0.15)",

            timeVisible: true,

            secondsVisible: false,
          },
        }
      );

    const candleSeries =
      chart.addSeries(
        CandlestickSeries,
        {
          upColor:
            "#d8b44a",

          downColor:
            "#c94d4d",

          borderVisible:
            false,

          wickUpColor:
            "#e7c65b",

          wickDownColor:
            "#c94d4d",

          priceLineVisible:
            true,

          lastValueVisible:
            true,
        }
      );

    const ema20Series =
      chart.addSeries(
        LineSeries,
        {
          color:
            "#e7c65b",

          lineWidth: 1,

          priceLineVisible:
            false,

          lastValueVisible:
            false,
        }
      );

    const ema50Series =
      chart.addSeries(
        LineSeries,
        {
          color:
            "#8f7a46",

          lineWidth: 1,

          priceLineVisible:
            false,

          lastValueVisible:
            false,
        }
      );

    const candles =
      data.candles;

    candleSeries.setData(
      candles.map(
        (candle) => ({
          time:
            toChartTime(
              candle.time
            ),

          open:
            candle.open,

          high:
            candle.high,

          low:
            candle.low,

          close:
            candle.close,
        })
      )
    );

    function calculateEMA(
      values: number[],
      period: number
    ) {
      const result:
        | {
            time: Time;
            value: number;
          }[] = [];

      if (
        values.length <
        period
      ) {
        return result;
      }

      const multiplier =
        2 /
        (period + 1);

      let previous =
        values
          .slice(0, period)
          .reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          ) / period;

      result.push({
        time:
          toChartTime(
            candles[
              period - 1
            ].time
          ),

        value: previous,
      });

      for (
        let i = period;
        i < values.length;
        i++
      ) {
        previous =
          (values[i] -
            previous) *
            multiplier +
          previous;

        result.push({
          time:
            toChartTime(
              candles[i]
                .time
            ),

          value:
            previous,
        });
      }

      return result;
    }

    const closes =
      candles.map(
        (c) => c.close
      );

    ema20Series.setData(
      calculateEMA(
        closes,
        20
      )
    );

    ema50Series.setData(
      calculateEMA(
        closes,
        50
      )
    );

    chart.timeScale()
      .fitContent();

    chartRef.current =
      chart;

    candleSeriesRef.current =
      candleSeries;

    ema20SeriesRef.current =
      ema20Series;

    ema50SeriesRef.current =
      ema50Series;

    const resizeObserver =
      new ResizeObserver(
        () => {
          if (
            chartContainer.current
          ) {
            chart.applyOptions({
              width:
                chartContainer
                  .current
                  .clientWidth,
            });
          }
        }
      );

    resizeObserver.observe(
      container
    );

    return () => {
      resizeObserver.disconnect();

      chart.remove();

      if (
        chartRef.current ===
        chart
      ) {
        chartRef.current =
          null;
      }
    };
  }, [data]);

  const info =
    useMemo(
      () =>
        getSymbolInfo(
          symbol
        ),
      [symbol]
    );

  const analysis =
    data?.analysis;

  return (
    <main
      dir="rtl"
      className="market-page"
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;

          background:
            #050504;

          color:
            #f5efe0;

          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        button,
        select {
          font: inherit;
        }

        .market-page {
          min-height:
            100vh;

          padding:
            18px;

          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(
                212,
                175,
                55,
                0.12
              ),
              transparent 28%
            ),
            radial-gradient(
              circle at 0% 60%,
              rgba(
                121,
                92,
                22,
                0.08
              ),
              transparent 30%
            ),
            #050504;
        }

        .shell {
          width:
            min(
              1450px,
              100%
            );

          margin:
            0 auto;
        }

        .topbar {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            16px;

          padding:
            16px 18px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.18
            );

          border-radius:
            24px;

          background:
            linear-gradient(
              135deg,
              rgba(
                21,
                19,
                12,
                0.96
              ),
              rgba(
                8,
                8,
                7,
                0.98
              )
            );

          box-shadow:
            0 20px 70px
            rgba(
              0,
              0,
              0,
              0.38
            );
        }

        .brand {
          display:
            flex;

          align-items:
            center;

          gap:
            12px;
        }

        .logo {
          width:
            48px;

          height:
            48px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            15px;

          color:
            #1a1405;

          font-weight:
            1000;

          background:
            linear-gradient(
              145deg,
              #fff1a7,
              #d4af37,
              #8c6919
            );

          border:
            1px solid
            rgba(
              255,
              232,
              140,
              0.7
            );

          box-shadow:
            0 0 30px
            rgba(
              212,
              175,
              55,
              0.18
            );
        }

        .brand strong {
          display:
            block;

          font-size:
            17px;
        }

        .brand small {
          display:
            block;

          margin-top:
            5px;

          color:
            #83785f;

          font-size:
            10px;
        }

        .live {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            8px;

          padding:
            9px 13px;

          border-radius:
            999px;

          color:
            #66e0a8;

          background:
            rgba(
              63,
              224,
              166,
              0.07
            );

          border:
            1px solid
            rgba(
              63,
              224,
              166,
              0.18
            );

          font-size:
            10px;
        }

        .dot {
          width:
            7px;

          height:
            7px;

          border-radius:
            50%;

          background:
            #63e5aa;

          box-shadow:
            0 0 14px
            #63e5aa;
        }

        .market-list {
          display:
            grid;

          grid-template-columns:
            repeat(
              8,
              minmax(
                0,
                1fr
              )
            );

          gap:
            8px;

          margin-top:
            14px;
        }

        .symbol-button {
          min-width:
            0;

          cursor:
            pointer;

          padding:
            13px 10px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.1
            );

          border-radius:
            16px;

          background:
            #0b0a08;

          color:
            #8d846f;

          text-align:
            right;

          transition:
            0.2s ease;
        }

        .symbol-button:hover {
          border-color:
            rgba(
              212,
              175,
              55,
              0.3
            );
        }

        .symbol-button.active {
          color:
            #f5dfa0;

          border-color:
            rgba(
              212,
              175,
              55,
              0.42
            );

          background:
            linear-gradient(
              135deg,
              rgba(
                70,
                57,
                22,
                0.6
              ),
              rgba(
                20,
                17,
                9,
                0.9
              )
            );
        }

        .symbol-code {
          display:
            block;

          font-size:
            12px;

          font-weight:
            900;
        }

        .symbol-name {
          display:
            block;

          margin-top:
            5px;

          font-size:
            9px;

          color:
            #665e4c;
        }

        .symbol-button.active
          .symbol-name {
          color:
            #a99459;
        }

        .hero {
          margin-top:
            14px;

          padding:
            22px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.18
            );

          border-radius:
            26px;

          background:
            linear-gradient(
              145deg,
              rgba(
                23,
                21,
                13,
                0.96
              ),
              rgba(
                8,
                8,
                7,
                0.98
              )
            );
        }

        .hero-head {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            flex-start;

          gap:
            20px;
        }

        .eyebrow {
          color:
            #d4af37;

          font-size:
            9px;

          font-weight:
            900;

          letter-spacing:
            2px;
        }

        .hero h1 {
          margin:
            7px 0 0;

          font-size:
            clamp(
              25px,
              4vw,
              38px
            );
        }

        .hero p {
          margin:
            7px 0 0;

          color:
            #887f6d;

          font-size:
            11px;

          line-height:
            1.9;
        }

        .price-block {
          text-align:
            left;
        }

        .price-label {
          color:
            #665f50;

          font-size:
            9px;
        }

        .price {
          margin-top:
            5px;

          color:
            #f1dc92;

          font-size:
            clamp(
              23px,
              4vw,
              35px
            );

          font-weight:
            1000;
        }

        .change {
          margin-top:
            4px;

          font-size:
            10px;

          color:
            #6ce0a9;
        }

        .controls {
          display:
            flex;

          gap:
            8px;

          margin-top:
            18px;

          flex-wrap:
            wrap;
        }

        .timeframe {
          display:
            flex;

          gap:
            5px;

          padding:
            5px;

          overflow-x:
            auto;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.1
            );

          border-radius:
            13px;

          background:
            #080806;
        }

        .tf {
          border:
            0;

          cursor:
            pointer;

          min-width:
            54px;

          padding:
            9px 10px;

          border-radius:
            9px;

          background:
            transparent;

          color:
            #706754;

          font-size:
            10px;
        }

        .tf.active {
          color:
            #171205;

          background:
            linear-gradient(
              135deg,
              #f5dc7c,
              #c49b29
            );

          font-weight:
            900;
        }

        .refresh {
          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.2
            );

          background:
            #0d0b07;

          color:
            #d8c98f;

          border-radius:
            13px;

          padding:
            0 17px;

          min-height:
            42px;

          cursor:
            pointer;
        }

        .refresh:disabled {
          opacity:
            0.55;

          cursor:
            not-allowed;
        }

        .chart-card {
          margin-top:
            14px;

          padding:
            12px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.15
            );

          border-radius:
            24px;

          background:
            #080806;

          overflow:
            hidden;
        }

        .chart-head {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          padding:
            5px 7px 12px;
        }

        .chart-title {
          color:
            #d8c990;

          font-size:
            11px;

          font-weight:
            900;
        }

        .chart-note {
          color:
            #625b4b;

          font-size:
            8px;
        }

        .chart {
          width:
            100%;

          height:
            430px;

          border-radius:
            16px;

          overflow:
            hidden;
        }

        .analysis-grid {
          display:
            grid;

          grid-template-columns:
            1.2fr
            0.8fr;

          gap:
            14px;

          margin-top:
            14px;
        }

        .panel {
          padding:
            18px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.13
            );

          border-radius:
            22px;

          background:
            linear-gradient(
              145deg,
              rgba(
                18,
                16,
                10,
                0.97
              ),
              rgba(
                7,
                7,
                6,
                0.98
              )
            );
        }

        .panel-head {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          gap:
            10px;

          margin-bottom:
            14px;
        }

        .panel h2 {
          margin:
            0;

          font-size:
            15px;
        }

        .panel-sub {
          color:
            #716957;

          font-size:
            9px;

          margin-top:
            4px;
        }

        .direction {
          padding:
            9px 13px;

          border-radius:
            12px;

          font-size:
            11px;

          font-weight:
            900;
        }

        .direction.buy {
          color:
            #6ee2ac;

          background:
            rgba(
              59,
              210,
              146,
              0.08
            );

          border:
            1px solid
            rgba(
              59,
              210,
              146,
              0.18
            );
        }

        .direction.sell {
          color:
            #e66d6d;

          background:
            rgba(
              230,
              80,
              80,
              0.08
            );

          border:
            1px solid
            rgba(
              230,
              80,
              80,
              0.18
            );
        }

        .direction.wait {
          color:
            #d6bd6b;

          background:
            rgba(
              212,
              175,
              55,
              0.07
            );

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.15
            );
        }

        .score {
          margin-bottom:
            16px;
        }

        .score-row {
          display:
            flex;

          justify-content:
            space-between;

          color:
            #77705f;

          font-size:
            9px;

          margin-bottom:
            6px;
        }

        .bar {
          height:
            7px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            #17150e;
        }

        .bar span {
          display:
            block;

          height:
            100%;

          background:
            linear-gradient(
              90deg,
              #8b6817,
              #f0d46c
            );
        }

        .analysis-text {
          color:
            #b8af9c;

          font-size:
            10px;

          line-height:
            2;
        }

        .reasons {
          display:
            grid;

          gap:
            7px;

          margin-top:
            12px;
        }

        .reason {
          padding:
            9px 11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.04
            );

          border-radius:
            11px;

          background:
            rgba(
              255,
              255,
              255,
              0.018
            );

          color:
            #aaa18e;

          font-size:
            9px;

          line-height:
            1.8;
        }

        .reason::before {
          content:
            "◆";

          margin-left:
            7px;

          color:
            #d4af37;

          font-size:
            7px;
        }

        .metrics {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap:
            7px;
        }

        .metric {
          padding:
            12px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.045
            );

          border-radius:
            13px;

          background:
            rgba(
              255,
              255,
              255,
              0.018
            );
        }

        .metric span {
          display:
            block;

          color:
            #635d50;

          font-size:
            8px;

          margin-bottom:
            5px;
        }

        .metric strong {
          color:
            #d6c898;

          font-size:
            11px;
        }

        .levels {
          display:
            grid;

          grid-template-columns:
            1fr 1fr;

          gap:
            7px;

          margin-top:
            10px;
        }

        .level {
          padding:
            11px;

          border-radius:
            12px;

          background:
            #0b0a07;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.07
            );
        }

        .level span {
          display:
            block;

          color:
            #625c4e;

          font-size:
            8px;

          margin-bottom:
            5px;
        }

        .level strong {
          font-size:
            11px;
        }

        .support {
          color:
            #64cfe0;
        }

        .resistance {
          color:
            #e18b70;
        }

        .bullish {
          color:
            #65dfa7;
        }

        .bearish {
          color:
            #e06b70;
        }

        .neutral {
          color:
            #cbbd88;
        }

        .indicators {
          display:
            grid;

          grid-template-columns:
            repeat(
              4,
              1fr
            );

          gap:
            7px;

          margin-top:
            10px;
        }

        .status {
          margin-top:
            14px;

          padding:
            13px;

          border-radius:
            14px;

          background:
            rgba(
              212,
              175,
              55,
              0.04
            );

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.1
            );

          color:
            #9b927d;

          font-size:
            9px;

          line-height:
            1.9;
        }

        .loading,
        .error {
          min-height:
            430px;

          display:
            grid;

          place-items:
            center;

          color:
            #8d846f;

          font-size:
            11px;

          text-align:
            center;
        }

        .error {
          color:
            #dc7474;
        }

        .retry {
          margin-top:
            12px;

          padding:
            9px 16px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.2
            );

          border-radius:
            10px;

          color:
            #d9c77f;

          background:
            #0d0b07;

          cursor:
            pointer;
        }

        .footer {
          margin:
            18px 0 8px;

          text-align:
            center;

          color:
            #4e493d;

          font-size:
            8px;

          line-height:
            2;
        }

        @media (
          max-width: 1050px
        ) {
          .market-list {
            grid-template-columns:
              repeat(
                4,
                1fr
              );
          }

          .analysis-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {
          .market-page {
            padding:
              8px;
          }

          .topbar {
            border-radius:
              18px;

            padding:
              13px;
          }

          .live {
            font-size:
              8px;
          }

          .market-list {
            display:
              flex;

            overflow-x:
              auto;

            padding-bottom:
              3px;
          }

          .symbol-button {
            min-width:
              112px;
          }

          .hero {
            padding:
              16px;

            border-radius:
              20px;
          }

          .hero-head {
            flex-direction:
              column;
          }

          .price-block {
            width:
              100%;

            text-align:
              right;
          }

          .chart-card {
            padding:
              7px;

            border-radius:
              19px;
          }

          .chart {
            height:
              360px;
          }

          .controls {
            flex-direction:
              column;
          }

          .timeframe {
            width:
              100%;

            overflow-x:
              auto;
          }

          .tf {
            flex:
              1;

            min-width:
              47px;

            padding:
              8px 4px;

            font-size:
              9px;
          }

          .refresh {
            width:
              100%;

            min-height:
              42px;
          }

          .metrics {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .indicators {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .panel {
            padding:
              14px;
          }

          .panel-head {
            align-items:
              flex-start;
          }
        }
      `}</style>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="logo">
              AI
            </div>

            <div>
              <strong>
                Trading AI
              </strong>

              <small>
                Real Market Intelligence
              </small>
            </div>
          </div>

          <div className="live">
            <span className="dot" />
            بازار زنده
          </div>
        </header>

        <section className="market-list">
          {SYMBOLS.map(
            (item) => (
              <button
                key={
                  item.value
                }
                className={
                  symbol ===
                  item.value
                    ? "symbol-button active"
                    : "symbol-button"
                }
                onClick={() =>
                  setSymbol(
                    item.value
                  )
                }
              >
                <span className="symbol-code">
                  {item.code}
                </span>

                <span className="symbol-name">
                  {item.label}
                </span>
              </button>
            )
          )}
        </section>

        <section className="hero">
          <div className="hero-head">
            <div>
              <div className="eyebrow">
                REAL MARKET ANALYSIS
              </div>

              <h1>
                {symbol}
              </h1>

              <p>
                {info.label}
                {" · "}
                تحلیل مستقیم
                داده‌های واقعی بازار
              </p>
            </div>

            <div className="price-block">
              <div className="price-label">
                قیمت فعلی
              </div>

              <div className="price">
                {analysis
                  ? formatPrice(
                      analysis.price
                    )
                  : "—"}
              </div>

              {analysis && (
                <div className="change">
                  سیستم تحلیل فعال است
                </div>
              )}
            </div>
          </div>

          <div className="controls">
            <div className="timeframe">
              {TIMEFRAMES.map(
                (item) => (
                  <button
                    key={
                      item.value
                    }
                    className={
                      interval ===
                      item.value
                        ? "tf active"
                        : "tf"
                    }
                    onClick={() =>
                      setIntervalValue(
                        item.value
                      )
                    }
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>

            <button
              className="refresh"
              disabled={
                refreshing
              }
              onClick={() =>
                loadMarket(
                  true
                )
              }
            >
              {refreshing
                ? "در حال دریافت..."
                : "↻ بروزرسانی بازار"}
            </button>
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-head">
            <span className="chart-title">
              نمودار کندلی
            </span>

            <span className="chart-note">
              Candles · EMA20 · EMA50
            </span>
          </div>

          {loading ? (
            <div className="chart loading">
              در حال دریافت کندل‌های
              واقعی بازار...
            </div>
          ) : error ? (
            <div className="chart error">
              <div>
                <div>
                  {error}
                </div>

                <button
                  className="retry"
                  onClick={() =>
                    loadMarket()
                  }
                >
                  تلاش مجدد
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={
                chartContainer
              }
              className="chart"
            />
          )}
        </section>

        {analysis && (
          <section className="analysis-grid">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>
                    تحلیل هوشمند بازار
                  </h2>

                  <div className="panel-sub">
                    تحلیل الگوریتمی بر اساس
                    کندل‌های واقعی
                  </div>
                </div>

                <span
                  className={`direction ${
                    analysis.direction ===
                    "BUY"
                      ? "buy"
                      : analysis.direction ===
                        "SELL"
                      ? "sell"
                      : "wait"
                  }`}
                >
                  {directionText(
                    analysis.direction
                  )}
                </span>
              </div>

              <div className="score">
                <div className="score-row">
                  <span>
                    قدرت تحلیل
                  </span>

                  <strong>
                    {
                      analysis.strength
                    }
                    %
                  </strong>
                </div>

                <div className="bar">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        analysis.strength
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="analysis-text">
                <strong>
                  وضعیت روند:
                </strong>{" "}
                <span
                  className={
                    analysis.trend ===
                    "BULLISH"
                      ? "bullish"
                      : analysis.trend ===
                        "BEARISH"
                      ? "bearish"
                      : "neutral"
                  }
                >
                  {trendText(
                    analysis.trend
                  )}
                </span>
              </div>

              <div className="analysis-text">
                <strong>
                  وضعیت شکست:
                </strong>{" "}
                {analysis.breakout ===
                "BULLISH"
                  ? "شکست صعودی"
                  : analysis.breakout ===
                    "BEARISH"
                  ? "شکست نزولی"
                  : "شکست معتبر مشاهده نشد"}
              </div>

              <div className="analysis-text">
                <strong>
                  الگوی کندلی:
                </strong>{" "}
                {patternText(
                  analysis.candlePattern
                )}
              </div>

              <div className="analysis-text">
                {analysis.candlePatternText}
              </div>

              <div className="reasons">
                {analysis.reasons.map(
                  (
                    reason,
                    index
                  ) => (
                    <div
                      className="reason"
                      key={`${reason}-${index}`}
                    >
                      {reason}
                    </div>
                  )
                )}
              </div>

              <div className="status">
                این بخش «پیش‌بینی تضمینی» نیست؛
                تحلیل بر اساس داده واقعی،
                ساختار قیمت و اندیکاتورهای
                تکنیکال انجام می‌شود. در مرحله
                بعد همین موتور به سیستم تولید
                سیگنال، Entry، SL و TP متصل
                خواهد شد.
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>
                    شاخص‌های تکنیکال
                  </h2>

                  <div className="panel-sub">
                    وضعیت فعلی بازار
                  </div>
                </div>
              </div>

              <div className="metrics">
                <div className="metric">
                  <span>
                    RSI 14
                  </span>

                  <strong>
                    {analysis.rsi}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    ATR 14
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.atr
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    EMA 20
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.ema20
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    EMA 50
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.ema50
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    EMA 200
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.ema200
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    MACD
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.macd
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    MACD Signal
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.macdSignal
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>
                    Histogram
                  </span>

                  <strong>
                    {formatPrice(
                      analysis.macdHistogram
                    )}
                  </strong>
                </div>
              </div>

              <div className="levels">
                <div className="level">
                  <span>
                    حمایت ۱
                  </span>

                  <strong className="support">
                    {formatPrice(
                      analysis.support1
                    )}
                  </strong>
                </div>

                <div className="level">
                  <span>
                    حمایت ۲
                  </span>

                  <strong className="support">
                    {formatPrice(
                      analysis.support2
                    )}
                  </strong>
                </div>

                <div className="level">
                  <span>
                    مقاومت ۱
                  </span>

                  <strong className="resistance">
                    {formatPrice(
                      analysis.resistance1
                    )}
                  </strong>
                </div>

                <div className="level">
                  <span>
                    مقاومت ۲
                  </span>

                  <strong className="resistance">
                    {formatPrice(
                      analysis.resistance2
                    )}
                  </strong>
                </div>
              </div>

              <div className="levels">
                <div className="level">
                  <span>
                    Bollinger Upper
                  </span>

                  <strong>
                    {formatPrice(
                      analysis
                        .bollinger
                        .upper
                    )}
                  </strong>
                </div>

                <div className="level">
                  <span>
                    Bollinger Middle
                  </span>

                  <strong>
                    {formatPrice(
                      analysis
                        .bollinger
                        .middle
                    )}
                  </strong>
                </div>

                <div className="level">
                  <span>
                    Bollinger Lower
                  </span>

                  <strong>
                    {formatPrice(
                      analysis
                        .bollinger
                        .lower
                    )}
                  </strong>
                </div>

                <div className="level">
                  <span>
                    تایم‌فریم
                  </span>

                  <strong>
                    {interval}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="footer">
          منبع داده: Twelve Data · نمودار:
          Lightweight Charts · تحلیل تکنیکال
          الگوریتمی · بروزرسانی خودکار هر ۶۰ ثانیه
          {lastUpdate
            ? ` · آخرین دریافت: ${formatDate(
                lastUpdate
              )}`
            : ""}
        </div>
      </div>
    </main>
  );
}
