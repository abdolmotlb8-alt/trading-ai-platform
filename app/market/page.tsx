"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Market = {
  symbol: string;
  name: string;
  type: string;
  tvSymbol: string;
  icon: string;
};

type Analysis = {
  trend?: "BULLISH" | "BEARISH" | "NEUTRAL";
  bias?: "BUY" | "SELL" | "WAIT";
  score?: number;
  rsi?: number | null;
  atr?: number | null;
  ema20?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  support?: number | null;
  resistance?: number | null;
  breakout?: string;
  pullback?: string;
  candlePattern?: string;
  structure?: string;
  reasons?: string[];
};

type ApiResponse = {
  candles?: any[];
  data?: any[];
  currentPrice?: number;
  price?: number;
  changePercent?: number;
  analysis?: Analysis;
  error?: string;
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
  { label: "1m", value: "1min", tv: "1" },
  { label: "5m", value: "5min", tv: "5" },
  { label: "15m", value: "15min", tv: "15" },
  { label: "30m", value: "30min", tv: "30" },
  { label: "1H", value: "1h", tv: "60" },
  { label: "2H", value: "2h", tv: "120" },
  { label: "4H", value: "4h", tv: "240" },
  { label: "8H", value: "8h", tv: "480" },
];

function formatPrice(value?: number | null) {
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

function getTrendText(trend?: Analysis["trend"]) {
  if (trend === "BULLISH") return "صعودی";
  if (trend === "BEARISH") return "نزولی";
  return "خنثی";
}

function getBiasText(bias?: Analysis["bias"]) {
  if (bias === "BUY") return "BUY";
  if (bias === "SELL") return "SELL";
  return "WAIT";
}

function getBiasClass(bias?: Analysis["bias"]) {
  if (bias === "BUY") return "green";
  if (bias === "SELL") return "red";
  return "gold";
}

/* =========================================================
   TRADINGVIEW CHART
   روش جدید: TradingView Advanced Chart Widget
   ========================================================= */

function TradingViewChart({
  market,
  interval,
}: {
  market: Market;
  interval: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef(
    `tv-chart-${Math.random().toString(36).slice(2)}`
  );

  const timeframe =
    TIMEFRAMES.find(
      (item) => item.value === interval
    )?.tv ?? "15";

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let cancelled = false;

    container.innerHTML = "";

    const widgetContainer =
      document.createElement("div");

    widgetContainer.className =
      "tradingview-widget-container";

    widgetContainer.style.width = "100%";
    widgetContainer.style.height = "100%";

    const widget = document.createElement("div");

    widget.className =
      "tradingview-widget-container__widget";

    widget.style.width = "100%";
    widget.style.height = "100%";

    widgetContainer.appendChild(widget);

    const script =
      document.createElement("script");

    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;

    const config = {
      autosize: true,
      symbol: market.tvSymbol,
      interval: timeframe,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_side_toolbar: true,
      hide_legend: false,
      hide_volume: false,
      withdateranges: true,
      save_image: false,
      details: false,
      hotlist: false,
      hideideas: true,
      studies: [
        "Volume@tv-basicstudies",
        "MASimple@tv-basicstudies",
        "MACD@tv-basicstudies",
      ],
      support_host:
        "https://www.tradingview.com",
    };

    script.innerHTML =
      JSON.stringify(config);

    widgetContainer.appendChild(script);

    container.appendChild(
      widgetContainer
    );

    const timeout =
      window.setTimeout(() => {
        if (!cancelled && container) {
          const loading =
            container.querySelector(
              ".chart-loading"
            ) as HTMLElement | null;

          if (loading) {
            loading.style.display = "none";
          }
        }
      }, 12000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);

      if (container) {
        container.innerHTML = "";
      }
    };
  }, [
    market.tvSymbol,
    timeframe,
  ]);

  return (
    <div className="tv-frame">
      <div
        ref={containerRef}
        id={widgetIdRef.current}
        className="tv-container"
      />

      <div className="chart-loading">
        <div className="loading-spinner" />
        <div>
          <strong>
            در حال اتصال به TradingView
          </strong>
          <span>
            نمودار بازار در حال بارگذاری است...
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-content">
        <div className="stat-title">
          {title}
        </div>

        <div className="stat-value">
          {value}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL CARD
   ========================================================= */

function DetailCard({
  icon,
  title,
  value,
  tone = "normal",
}: {
  icon: string;
  title: string;
  value: string;
  tone?: "normal" | "green" | "red" | "gold";
}) {
  return (
    <div
      className={`detail-card ${tone}`}
    >
      <div className="detail-icon">
        {icon}
      </div>

      <div className="detail-info">
        <div className="detail-title">
          {title}
        </div>

        <div className="detail-value">
          {value}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function MarketPage() {
  const [symbol, setSymbol] =
    useState("XAU/USD");

  const [interval, setInterval] =
    useState("15min");

  const [price, setPrice] =
    useState<number | null>(null);

  const [changePercent, setChangePercent] =
    useState<number | null>(null);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const selectedMarket = useMemo(
    () =>
      MARKETS.find(
        (market) =>
          market.symbol === symbol
      ) ?? MARKETS[0],
    [symbol]
  );

  async function loadMarket() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
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

      const data: ApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "دریافت اطلاعات بازار ناموفق بود."
        );
      }

      setPrice(
        typeof data.currentPrice ===
          "number"
          ? data.currentPrice
          : typeof data.price ===
            "number"
          ? data.price
          : null
      );

      setChangePercent(
        typeof data.changePercent ===
          "number"
          ? data.changePercent
          : null
      );

      setAnalysis(
        data.analysis ?? null
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "ارتباط با موتور بازار برقرار نشد."
      );

      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();

    const timer =
      window.setInterval(
        loadMarket,
        60_000
      );

    return () =>
      window.clearInterval(timer);
  }, [symbol, interval]);

  const biasClass =
    getBiasClass(
      analysis?.bias
    );

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #030303;
        }

        body {
          color: #f4f4f4;
          font-family:
            Arial,
            "Segoe UI",
            Tahoma,
            sans-serif;
        }

        button {
          font-family: inherit;
        }

        .market-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(212, 175, 55, 0.09),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(212, 175, 55, 0.06),
              transparent 30%
            ),
            #030303;

          padding: 24px;
        }

        .market-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          padding: 24px;

          border: 1px solid
            rgba(212, 175, 55, 0.18);

          border-radius: 26px;

          background:
            linear-gradient(
              135deg,
              rgba(212, 175, 55, 0.08),
              rgba(255, 255, 255, 0.025)
            );

          box-shadow:
            0 20px 70px
              rgba(0, 0, 0, 0.45),
            inset 0 1px 0
              rgba(255, 255, 255, 0.04);

          margin-bottom: 18px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .brand-icon {
          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 18px;

          border: 1px solid
            rgba(212, 175, 55, 0.35);

          background:
            linear-gradient(
              145deg,
              rgba(212, 175, 55, 0.18),
              rgba(212, 175, 55, 0.04)
            );

          font-size: 26px;
        }

        .eyebrow {
          color: #d4af37;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 4px;
          margin-bottom: 5px;
        }

        .page-title {
          margin: 0;
          font-size: 27px;
          font-weight: 900;
        }

        .page-subtitle {
          margin: 7px 0 0;
          color: #777;
          font-size: 13px;
          line-height: 1.9;
        }

        .online-box {
          display: flex;
          align-items: center;
          gap: 10px;

          border: 1px solid
            rgba(34, 197, 94, 0.2);

          border-radius: 16px;

          padding: 12px 15px;

          background:
            rgba(34, 197, 94, 0.045);

          white-space: nowrap;
        }

        .online-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 16px
              rgba(34, 197, 94, 0.8);
        }

        .online-title {
          color: #86efac;
          font-size: 12px;
          font-weight: 800;
        }

        .online-sub {
          color: #555;
          font-size: 10px;
          margin-top: 2px;
        }

        .section {
          margin-bottom: 18px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 0 3px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 900;
        }

        .section-count {
          color: #555;
          font-size: 11px;
        }

        .market-list {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .market-button {
          position: relative;
          min-height: 105px;
          overflow: hidden;

          border: 1px solid
            rgba(255, 255, 255, 0.07);

          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            );

          color: #fff;
          text-align: right;

          padding: 15px;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .market-button:hover {
          transform: translateY(-2px);
          border-color:
            rgba(212, 175, 55, 0.3);
        }

        .market-button.active {
          border-color:
            rgba(212, 175, 55, 0.55);

          background:
            linear-gradient(
              145deg,
              rgba(212, 175, 55, 0.13),
              rgba(255, 255, 255, 0.025)
            );

          box-shadow:
            0 10px 35px
              rgba(212, 175, 55, 0.07);
        }

        .market-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .market-icon {
          width: 35px;
          height: 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            rgba(212, 175, 55, 0.09);

          border: 1px solid
            rgba(212, 175, 55, 0.16);

          font-size: 17px;
        }

        .market-type {
          border: 1px solid
            rgba(255, 255, 255, 0.07);

          border-radius: 999px;

          padding: 4px 7px;

          color: #666;

          font-size: 8px;
          font-weight: 800;
        }

        .market-symbol {
          font-size: 14px;
          font-weight: 900;
        }

        .market-name {
          margin-top: 4px;
          color: #606060;
          font-size: 10px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeframe-card {
          border: 1px solid
            rgba(255, 255, 255, 0.07);

          border-radius: 20px;

          background:
            rgba(255, 255, 255, 0.025);

          padding: 12px;
        }

        .timeframe-title {
          color: #777;
          font-size: 11px;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .timeframe-list {
          display: flex;
          gap: 7px;

          overflow-x: auto;

          scrollbar-width: none;
        }

        .timeframe-list::-webkit-scrollbar {
          display: none;
        }

        .timeframe-button {
          min-width: 58px;
          height: 40px;

          border-radius: 11px;

          border: 1px solid
            rgba(255, 255, 255, 0.07);

          background:
            rgba(255, 255, 255, 0.035);

          color: #888;

          cursor: pointer;

          font-size: 11px;
          font-weight: 800;
        }

        .timeframe-button.active {
          color: #080808;
          background: #d4af37;
          border-color: #d4af37;

          box-shadow:
            0 6px 22px
              rgba(212, 175, 55, 0.16);
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 10px;

          margin-bottom: 18px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;

          min-height: 83px;

          border: 1px solid
            rgba(255, 255, 255, 0.07);

          border-radius: 19px;

          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            );

          padding: 13px;
        }

        .stat-icon {
          width: 41px;
          height: 41px;

          flex: 0 0 41px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            rgba(212, 175, 55, 0.08);

          border: 1px solid
            rgba(212, 175, 55, 0.14);

          font-size: 17px;
        }

        .stat-title {
          color: #666;
          font-size: 10px;
          margin-bottom: 6px;
        }

        .stat-value {
          color: #eee;
          font-size: 15px;
          font-weight: 900;
        }

        .main-grid {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr) 390px;

          gap: 16px;

          align-items: start;
        }

        .chart-card {
          overflow: hidden;

          border: 1px solid
            rgba(212, 175, 55, 0.15);

          border-radius: 25px;

          background: #050505;

          box-shadow:
            0 20px 70px
              rgba(0, 0, 0, 0.5);
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;

          padding: 15px 17px;

          border-bottom: 1px solid
            rgba(255, 255, 255, 0.06);

          background:
            linear-gradient(
              90deg,
              rgba(212, 175, 55, 0.04),
              transparent
            );
        }

        .selected-market {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .selected-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            rgba(212, 175, 55, 0.09);

          border: 1px solid
            rgba(212, 175, 55, 0.2);

          font-size: 19px;
        }

        .selected-symbol {
          font-size: 16px;
          font-weight: 900;
        }

        .selected-name {
          color: #5c5c5c;
          font-size: 10px;
          margin-top: 3px;
        }

        .refresh-button {
          height: 38px;

          padding: 0 13px;

          border-radius: 11px;

          border: 1px solid
            rgba(212, 175, 55, 0.25);

          background:
            rgba(212, 175, 55, 0.07);

          color: #d4af37;

          cursor: pointer;

          font-size: 10px;
          font-weight: 900;
        }

        .refresh-button:hover {
          background:
            rgba(212, 175, 55, 0.13);
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        /* CHART */

        .tv-frame {
          position: relative;

          width: 100%;

          height: 560px;

          background: #050505;
        }

        .tv-container {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          z-index: 2;
        }

        .tv-container
          .tradingview-widget-container {
          width: 100% !important;
          height: 100% !important;
        }

        .tv-container
          .tradingview-widget-container__widget {
          width: 100% !important;
          height: 100% !important;
        }

        .chart-loading {
          position: absolute;

          inset: 0;

          z-index: 1;

          display: flex;

          align-items: center;
          justify-content: center;

          gap: 13px;

          color: #777;

          background: #050505;
        }

        .chart-loading strong {
          display: block;

          color: #c9a52f;

          font-size: 12px;

          margin-bottom: 4px;
        }

        .chart-loading span {
          display: block;

          color: #555;

          font-size: 10px;
        }

        .loading-spinner {
          width: 25px;
          height: 25px;

          border-radius: 50%;

          border: 2px solid
            rgba(212, 175, 55, 0.16);

          border-top-color: #d4af37;

          animation:
            market-spin 0.8s
            linear infinite;
        }

        @keyframes market-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .chart-footer {
          display: flex;

          flex-wrap: wrap;

          gap: 10px 16px;

          padding: 11px 16px;

          border-top: 1px solid
            rgba(255, 255, 255, 0.06);

          color: #555;

          font-size: 9px;
        }

        .analysis-column {
          display: flex;

          flex-direction: column;

          gap: 12px;
        }

        .analysis-card {
          border: 1px solid
            rgba(255, 255, 255, 0.07);

          border-radius: 22px;

          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            );

          padding: 17px;

          box-shadow:
            0 14px 45px
              rgba(0, 0, 0, 0.24);
        }

        .analysis-card.primary {
          border-color:
            rgba(212, 175, 55, 0.2);

          background:
            linear-gradient(
              145deg,
              rgba(212, 175, 55, 0.09),
              rgba(255, 255, 255, 0.02)
            );
        }

        .analysis-heading {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 10px;

          margin-bottom: 14px;
        }

        .analysis-heading-left {
          display: flex;

          align-items: center;

          gap: 9px;
        }

        .heading-icon {
          width: 34px;
          height: 34px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background:
            rgba(212, 175, 55, 0.09);

          border: 1px solid
            rgba(212, 175, 55, 0.14);
        }

        .analysis-heading h2,
        .analysis-heading h3 {
          margin: 0;

          font-size: 13px;

          font-weight: 900;
        }

        .analysis-heading p {
          margin: 3px 0 0;

          color: #555;

          font-size: 9px;
        }

        .score {
          min-width: 58px;

          text-align: center;

          padding: 8px 7px;

          border-radius: 11px;

          background:
            rgba(212, 175, 55, 0.09);

          border: 1px solid
            rgba(212, 175, 55, 0.18);

          color: #d4af37;

          font-size: 11px;

          font-weight: 900;
        }

        .bias-box {
          border: 1px solid
            rgba(212, 175, 55, 0.16);

          border-radius: 17px;

          padding: 16px;

          background:
            rgba(0, 0, 0, 0.22);
        }

        .bias-box.green {
          border-color:
            rgba(34, 197, 94, 0.2);

          background:
            rgba(34, 197, 94, 0.045);
        }

        .bias-box.red {
          border-color:
            rgba(239, 68, 68, 0.2);

          background:
            rgba(239, 68, 68, 0.045);
        }

        .bias-label {
          color: #666;
          font-size: 9px;
        }

        .bias-value {
          margin-top: 5px;

          font-size: 30px;

          font-weight: 1000;

          letter-spacing: 1px;
        }

        .bias-box.green .bias-value {
          color: #4ade80;
        }

        .bias-box.red .bias-value {
          color: #f87171;
        }

        .bias-box.gold .bias-value {
          color: #d4af37;
        }

        .bias-description {
          margin-top: 7px;

          color: #666;

          font-size: 10px;

          line-height: 1.9;
        }

        .detail-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 8px;
        }

        .detail-card {
          display: flex;

          align-items: center;

          gap: 9px;

          min-height: 63px;

          border: 1px solid
            rgba(255, 255, 255, 0.06);

          border-radius: 15px;

          background:
            rgba(0, 0, 0, 0.18);

          padding: 10px;
        }

        .detail-card.green {
          border-color:
            rgba(34, 197, 94, 0.13);
        }

        .detail-card.red {
          border-color:
            rgba(239, 68, 68, 0.13);
        }

        .detail-card.gold {
          border-color:
            rgba(212, 175, 55, 0.15);
        }

        .detail-icon {
          width: 30px;
          height: 30px;

          flex: 0 0 30px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.04);

          font-size: 13px;
        }

        .detail-title {
          color: #555;
          font-size: 9px;
          margin-bottom: 4px;
        }

        .detail-value {
          color: #ddd;

          font-size: 11px;

          font-weight: 900;

          line-height: 1.5;
        }

        .level-box {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 8px;
        }

        .level {
          border-radius: 15px;

          padding: 13px;

          border: 1px solid
            rgba(255, 255, 255, 0.06);

          background:
            rgba(0, 0, 0, 0.18);
        }

        .level.resistance {
          border-color:
            rgba(239, 68, 68, 0.15);
        }

        .level.support {
          border-color:
            rgba(34, 197, 94, 0.15);
        }

        .level-title {
          color: #666;
          font-size: 9px;
        }

        .level-value {
          margin-top: 6px;

          font-size: 13px;

          font-weight: 900;
        }

        .resistance .level-value {
          color: #f87171;
        }

        .support .level-value {
          color: #4ade80;
        }

        .indicator-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 8px;
        }

        .indicator {
          border: 1px solid
            rgba(255, 255, 255, 0.06);

          border-radius: 14px;

          padding: 11px;

          background:
            rgba(0, 0, 0, 0.18);
        }

        .indicator-title {
          color: #555;
          font-size: 9px;
        }

        .indicator-value {
          margin-top: 5px;

          color: #ddd;

          font-size: 11px;

          font-weight: 900;
        }

        .reason-list {
          display: flex;

          flex-direction: column;

          gap: 7px;
        }

        .reason {
          display: flex;

          align-items: flex-start;

          gap: 8px;

          border: 1px solid
            rgba(255, 255, 255, 0.05);

          border-radius: 12px;

          padding: 9px;

          background:
            rgba(0, 0, 0, 0.16);
        }

        .reason-number {
          width: 21px;
          height: 21px;

          flex: 0 0 21px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 7px;

          background:
            rgba(212, 175, 55, 0.09);

          color: #d4af37;

          font-size: 8px;

          font-weight: 900;
        }

        .reason-text {
          color: #777;

          font-size: 10px;

          line-height: 1.8;
        }

        .error-card {
          border: 1px solid
            rgba(239, 68, 68, 0.2);

          border-radius: 18px;

          padding: 14px;

          background:
            rgba(239, 68, 68, 0.04);
        }

        .error-title {
          color: #f87171;

          font-size: 11px;

          font-weight: 900;
        }

        .error-text {
          margin-top: 6px;

          color: #a86666;

          font-size: 10px;

          line-height: 1.8;

          word-break: break-word;
        }

        .footer-note {
          margin-top: 15px;

          padding: 13px 15px;

          border: 1px solid
            rgba(212, 175, 55, 0.1);

          border-radius: 15px;

          color: #555;

          background:
            rgba(212, 175, 55, 0.025);

          font-size: 10px;

          line-height: 1.9;
        }

        @media (max-width: 1100px) {
          .main-grid {
            grid-template-columns:
              minmax(0, 1fr) 350px;
          }

          .market-list {
            grid-template-columns:
              repeat(4, minmax(150px, 1fr));

            overflow-x: auto;
          }
        }

        @media (max-width: 850px) {
          .market-page {
            padding: 12px;
          }

          .topbar {
            align-items: flex-start;

            flex-direction: column;

            padding: 18px;

            border-radius: 21px;
          }

          .online-box {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .tv-frame {
            height: 500px;
          }

          .analysis-column {
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .analysis-card.primary {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 600px) {
          .market-page {
            padding: 9px;
          }

          .page-title {
            font-size: 22px;
          }

          .page-subtitle {
            font-size: 11px;
          }

          .brand-icon {
            width: 49px;
            height: 49px;
            font-size: 22px;
          }

          .market-list {
            display: flex;

            overflow-x: auto;

            padding-bottom: 3px;
          }

          .market-button {
            min-width: 155px;

            flex: 0 0 155px;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 7px;
          }

          .stat-card {
            min-height: 72px;

            padding: 10px;
          }

          .stat-icon {
            width: 35px;
            height: 35px;

            flex-basis: 35px;
          }

          .stat-value {
            font-size: 13px;
          }

          .chart-card {
            border-radius: 19px;
          }

          .chart-header {
            padding: 12px;
          }

          .tv-frame {
            height: 410px;
          }

          .analysis-column {
            display: flex;
          }

          .analysis-card {
            border-radius: 19px;
          }

          .selected-symbol {
            font-size: 14px;
          }

          .refresh-button {
            padding: 0 10px;
          }

          .chart-footer {
            font-size: 8px;
          }
        }
      `}</style>

      <main
        dir="rtl"
        className="market-page"
      >
        <div className="market-container">

          {/* HEADER */}

          <header className="topbar">
            <div className="brand-area">
              <div className="brand-icon">
                📈
              </div>

              <div>
                <div className="eyebrow">
                  TRADING AI
                </div>

                <h1 className="page-title">
                  بازارهای مالی
                </h1>

                <p className="page-subtitle">
                  مرکز حرفه‌ای مشاهده بازار،
                  نمودار زنده و تحلیل تکنیکال
                </p>
              </div>
            </div>

            <div className="online-box">
              <span className="online-dot" />

              <div>
                <div className="online-title">
                  MARKET ONLINE
                </div>

                <div className="online-sub">
                  Live TradingView Chart
                </div>
              </div>
            </div>
          </header>

          {/* MARKETS */}

          <section className="section">
            <div className="section-header">
              <div className="section-title">
                نمادهای بازار
              </div>

              <div className="section-count">
                {MARKETS.length} Markets
              </div>
            </div>

            <div className="market-list">
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
                      className={`market-button ${
                        active
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setSymbol(
                          market.symbol
                        )
                      }
                    >
                      <div className="market-top">
                        <div className="market-icon">
                          {
                            market.icon
                          }
                        </div>

                        <div className="market-type">
                          {
                            market.type
                          }
                        </div>
                      </div>

                      <div className="market-symbol">
                        {
                          market.symbol
                        }
                      </div>

                      <div className="market-name">
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

          <section className="section">
            <div className="timeframe-card">
              <div className="timeframe-title">
                تایم‌فریم نمودار
              </div>

              <div className="timeframe-list">
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
                        className={`timeframe-button ${
                          active
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setInterval(
                            tf.value
                          )
                        }
                      >
                        {tf.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* STATS */}

          <section className="stats-grid">
            <StatCard
              icon="💰"
              title="قیمت فعلی"
              value={formatPrice(
                price
              )}
            />

            <StatCard
              icon="📊"
              title="روند بازار"
              value={getTrendText(
                analysis?.trend
              )}
            />

            <StatCard
              icon="🎯"
              title="RSI 14"
              value={
                analysis?.rsi !==
                  null &&
                analysis?.rsi !==
                  undefined
                  ? analysis.rsi.toFixed(
                      2
                    )
                  : "—"
              }
            />

            <StatCard
              icon="⚡"
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

          <section className="main-grid">

            {/* CHART */}

            <div className="chart-card">
              <div className="chart-header">
                <div className="selected-market">
                  <div className="selected-icon">
                    {
                      selectedMarket.icon
                    }
                  </div>

                  <div>
                    <div className="selected-symbol">
                      {
                        selectedMarket.symbol
                      }
                    </div>

                    <div className="selected-name">
                      {
                        selectedMarket.name
                      }
                    </div>
                  </div>
                </div>

                <button
                  className="refresh-button"
                  onClick={
                    loadMarket
                  }
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "در حال دریافت..."
                    : "↻ بروزرسانی"}
                </button>
              </div>

              <TradingViewChart
                market={
                  selectedMarket
                }
                interval={
                  interval
                }
              />

              <div className="chart-footer">
                <span>
                  ● TradingView
                </span>

                <span>
                  ●{" "}
                  {
                    TIMEFRAMES.find(
                      (x) =>
                        x.value ===
                        interval
                    )?.label
                  }
                </span>

                <span>
                  ● Live Market
                </span>

                <span>
                  ● Technical Analysis
                </span>
              </div>
            </div>

            {/* ANALYSIS */}

            <aside className="analysis-column">

              {/* MAIN ANALYSIS */}

              <div className="analysis-card primary">
                <div className="analysis-heading">
                  <div className="analysis-heading-left">
                    <div className="heading-icon">
                      🧠
                    </div>

                    <div>
                      <h2>
                        تحلیل هوشمند بازار
                      </h2>

                      <p>
                        Technical Engine
                      </p>
                    </div>
                  </div>

                  <div className="score">
                    {analysis?.score ??
                      "—"}
                    /100
                  </div>
                </div>

                <div
                  className={`bias-box ${biasClass}`}
                >
                  <div className="bias-label">
                    نتیجه موتور تحلیل
                  </div>

                  <div className="bias-value">
                    {getBiasText(
                      analysis?.bias
                    )}
                  </div>

                  <div className="bias-description">
                    تحلیل بر اساس روند،
                    EMA، RSI، MACD،
                    ساختار بازار،
                    حمایت، مقاومت و
                    الگوهای کندلی.
                  </div>
                </div>
              </div>

              {/* SUPPORT RESISTANCE */}

              <div className="analysis-card">
                <div className="analysis-heading">
                  <div className="analysis-heading-left">
                    <div className="heading-icon">
                      🎯
                    </div>

                    <div>
                      <h3>
                        حمایت و مقاومت
                      </h3>

                      <p>
                        Key Levels
                      </p>
                    </div>
                  </div>
                </div>

                <div className="level-box">
                  <div className="level resistance">
                    <div className="level-title">
                      مقاومت
                    </div>

                    <div className="level-value">
                      {formatPrice(
                        analysis?.resistance
                      )}
                    </div>
                  </div>

                  <div className="level support">
                    <div className="level-title">
                      حمایت
                    </div>

                    <div className="level-value">
                      {formatPrice(
                        analysis?.support
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MARKET STRUCTURE */}

              <div className="analysis-card">
                <div className="analysis-heading">
                  <div className="analysis-heading-left">
                    <div className="heading-icon">
                      🔎
                    </div>

                    <div>
                      <h3>
                        ساختار بازار
                      </h3>

                      <p>
                        Price Action
                      </p>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <DetailCard
                    icon="📈"
                    title="روند"
                    value={getTrendText(
                      analysis?.trend
                    )}
                  />

                  <DetailCard
                    icon="🕯️"
                    title="الگوی کندلی"
                    value={
                      analysis?.candlePattern ??
                      "—"
                    }
                  />

                  <DetailCard
                    icon="💥"
                    title="Breakout"
                    value={
                      analysis?.breakout ??
                      "—"
                    }
                    tone={
                      analysis?.breakout?.includes(
                        "صعودی"
                      )
                        ? "green"
                        : analysis?.breakout?.includes(
                            "نزولی"
                          )
                        ? "red"
                        : "normal"
                    }
                  />

                  <DetailCard
                    icon="↩️"
                    title="Pullback"
                    value={
                      analysis?.pullback ??
                      "—"
                    }
                  />

                  <DetailCard
                    icon="🏗️"
                    title="ساختار"
                    value={
                      analysis?.structure ??
                      "—"
                    }
                  />

                  <DetailCard
                    icon="⚡"
                    title="ATR"
                    value={formatPrice(
                      analysis?.atr
                    )}
                  />
                </div>
              </div>

              {/* INDICATORS */}

              <div className="analysis-card">
                <div className="analysis-heading">
                  <div className="analysis-heading-left">
                    <div className="heading-icon">
                      📐
                    </div>

                    <div>
                      <h3>
                        اندیکاتورها
                      </h3>

                      <p>
                        Technical Indicators
                      </p>
                    </div>
                  </div>
                </div>

                <div className="indicator-grid">
                  <div className="indicator">
                    <div className="indicator-title">
                      EMA 20
                    </div>

                    <div className="indicator-value">
                      {formatPrice(
                        analysis?.ema20
                      )}
                    </div>
                  </div>

                  <div className="indicator">
                    <div className="indicator-title">
                      EMA 50
                    </div>

                    <div className="indicator-value">
                      {formatPrice(
                        analysis?.ema50
                      )}
                    </div>
                  </div>

                  <div className="indicator">
                    <div className="indicator-title">
                      EMA 200
                    </div>

                    <div className="indicator-value">
                      {formatPrice(
                        analysis?.ema200
                      )}
                    </div>
                  </div>

                  <div className="indicator">
                    <div className="indicator-title">
                      RSI 14
                    </div>

                    <div className="indicator-value">
                      {analysis?.rsi !==
                        null &&
                      analysis?.rsi !==
                        undefined
                        ? analysis.rsi.toFixed(
                            2
                          )
                        : "—"}
                    </div>
                  </div>

                  <div className="indicator">
                    <div className="indicator-title">
                      MACD
                    </div>

                    <div className="indicator-value">
                      {analysis?.macd !==
                        null &&
                      analysis?.macd !==
                        undefined
                        ? analysis.macd.toFixed(
                            5
                          )
                        : "—"}
                    </div>
                  </div>

                  <div className="indicator">
                    <div className="indicator-title">
                      ATR 14
                    </div>

                    <div className="indicator-value">
                      {formatPrice(
                        analysis?.atr
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* REASONS */}

              <div className="analysis-card">
                <div className="analysis-heading">
                  <div className="analysis-heading-left">
                    <div className="heading-icon">
                      🧩
                    </div>

                    <div>
                      <h3>
                        دلایل تحلیل
                      </h3>

                      <p>
                        Engine Reasoning
                      </p>
                    </div>
                  </div>
                </div>

                <div className="reason-list">
                  {analysis?.reasons?.length ? (
                    analysis.reasons
                      .slice(0, 7)
                      .map(
                        (
                          reason,
                          index
                        ) => (
                          <div
                            className="reason"
                            key={`${reason}-${index}`}
                          >
                            <div className="reason-number">
                              {index +
                                1}
                            </div>

                            <div className="reason-text">
                              {
                                reason
                              }
                            </div>
                          </div>
                        )
                      )
                  ) : (
                    <div className="reason">
                      <div className="reason-number">
                        —
                      </div>

                      <div className="reason-text">
                        هنوز اطلاعات تحلیل از
                        موتور بازار دریافت نشده
                        است.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ERROR */}

              {error && (
                <div className="error-card">
                  <div className="error-title">
                    ⚠️ خطای دریافت داده
                  </div>

                  <div className="error-text">
                    {error}
                  </div>
                </div>
              )}
            </aside>
          </section>

          <div className="footer-note">
            این بخش از داده بازار و موتور تحلیل
            تکنیکال استفاده می‌کند. نتیجه تحلیل
            الگوریتمی به‌تنهایی تضمین‌کننده نتیجه
            معامله نیست.
          </div>
        </div>
      </main>
    </>
  );
}
