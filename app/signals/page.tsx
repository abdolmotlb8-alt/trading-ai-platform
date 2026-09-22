"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Signal = {
  id: string;
  symbol: string;
  name: string;
  market:
    | "FOREX"
    | "CRYPTO"
    | "COMMODITY";

  interval: string;

  side:
    | "BUY"
    | "SELL"
    | "WAIT";

  price: number;
  entry: number;

  stopLoss: number | null;

  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  riskReward: number | null;

  confidence: number;
  strength: number;

  trend:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

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

type APIResponse = {
  success: boolean;
  source?: string;
  generatedAt?: string;
  interval?: string;

  signals?: Signal[];

  errors?: Array<{
    symbol: string;
    error: string;
  }>;

  summary?: {
    total: number;
    buy: number;
    sell: number;
    wait: number;
  };

  error?: string;
};

const TIMEFRAMES = [
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
    value: "4h",
    label: "4 ساعت",
  },
];

function formatPrice(
  value: number | null
) {
  if (value === null) {
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

  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 5,
    }
  );
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

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

function symbolIcon(
  symbol: string
) {
  if (
    symbol === "XAU/USD"
  ) {
    return "Au";
  }

  if (
    symbol === "EUR/USD"
  ) {
    return "€";
  }

  if (
    symbol === "GBP/USD"
  ) {
    return "£";
  }

  if (
    symbol === "USD/JPY"
  ) {
    return "¥";
  }

  if (
    symbol === "BTC/USD"
  ) {
    return "₿";
  }

  if (
    symbol === "ETH/USD"
  ) {
    return "Ξ";
  }

  return "◎";
}

function Side({
  side,
}: {
  side: Signal["side"];
}) {
  if (side === "BUY") {
    return (
      <span className="side buy">
        <b>↗</b>
        BUY
      </span>
    );
  }

  if (side === "SELL") {
    return (
      <span className="side sell">
        <b>↘</b>
        SELL
      </span>
    );
  }

  return (
    <span className="side wait">
      <b>◌</b>
      WAIT
    </span>
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
    <div className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] =
    useState<Signal[]>([]);

  const [timeframe, setTimeframe] =
    useState("15min");

  const [filter, setFilter] =
    useState<
      "ALL" | "BUY" | "SELL"
    >("ALL");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdate, setLastUpdate] =
    useState("");

  const loadSignals =
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
              `/api/signals?interval=${encodeURIComponent(
                timeframe
              )}`,
              {
                method: "GET",
                cache: "no-store",

                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            ) || "";

          const text =
            await response.text();

          if (
            !contentType.includes(
              "application/json"
            )
          ) {
            throw new Error(
              `API پاسخ JSON نداده است. HTTP ${response.status}`
            );
          }

          let data: APIResponse;

          try {
            data =
              JSON.parse(text);
          } catch {
            throw new Error(
              "پاسخ API قابل خواندن نیست."
            );
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ||
                `API Error ${response.status}`
            );
          }

          setSignals(
            data.signals || []
          );

          setLastUpdate(
            data.generatedAt ||
              new Date().toISOString()
          );
        } catch (err) {
          console.error(
            "SIGNALS_PAGE_ERROR:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت سیگنال‌ها"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [timeframe]
    );

  useEffect(() => {
    loadSignals();

    const intervalId =
      window.setInterval(
        () => {
          loadSignals(true);
        },
        60_000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadSignals]);

  const visibleSignals =
    useMemo(() => {
      if (filter === "ALL") {
        return signals;
      }

      return signals.filter(
        (signal) =>
          signal.side === filter
      );
    }, [
      signals,
      filter,
    ]);

  const buyCount =
    signals.filter(
      (signal) =>
        signal.side === "BUY"
    ).length;

  const sellCount =
    signals.filter(
      (signal) =>
        signal.side === "SELL"
    ).length;

  const waitCount =
    signals.filter(
      (signal) =>
        signal.side === "WAIT"
    ).length;

  return (
    <main
      dir="rtl"
      className="page"
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #050914;
          color: #eef7ff;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        body {
          min-width: 320px;
        }

        button,
        select {
          font: inherit;
        }

        .page {
          min-height: 100vh;

          background:
            radial-gradient(
              circle at 8% 0%,
              rgba(
                0,
                210,
                255,
                0.14
              ),
              transparent 25%
            ),

            radial-gradient(
              circle at 92% 5%,
              rgba(
                94,
                78,
                255,
                0.15
              ),
              transparent 28%
            ),

            linear-gradient(
              180deg,
              #07101d 0%,
              #040811 100%
            );

          overflow-x: hidden;
        }

        .container {
          width: min(
            1480px,
            calc(100% - 30px)
          );

          margin: auto;

          padding:
            24px 0 60px;
        }

        .topbar {
          min-height: 72px;

          display: flex;
          align-items: center;
          justify-content:
            space-between;

          gap: 20px;

          padding:
            12px 16px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );

          border-radius: 22px;

          background:
            rgba(
              10,
              22,
              37,
              0.76
            );

          backdrop-filter:
            blur(24px);

          box-shadow:
            0 25px 70px
            rgba(
              0,
              0,
              0,
              0.35
            );
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          width: 48px;
          height: 48px;

          display: grid;
          place-items: center;

          border-radius: 16px;

          color: #03131e;

          font-size: 16px;
          font-weight: 900;

          background:
            linear-gradient(
              135deg,
              #5ceaff,
              #7786ff
            );

          box-shadow:
            0 0 35px
            rgba(
              54,
              220,
              255,
              0.25
            );
        }

        .brand-title {
          margin: 0;
          font-size: 17px;
        }

        .brand-subtitle {
          margin:
            4px 0 0;

          color: #72869e;

          font-size: 10px;
        }

        .live {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding:
            8px 12px;

          border-radius:
            999px;

          color: #63efb1;

          font-size: 10px;

          background:
            rgba(
              48,
              224,
              157,
              0.07
            );

          border:
            1px solid
            rgba(
              48,
              224,
              157,
              0.2
            );
        }

        .live-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background:
            #58edaa;

          box-shadow:
            0 0 13px
            #58edaa;
        }

        .hero {
          position: relative;

          margin-top: 15px;

          padding:
            30px 28px;

          border-radius: 28px;

          overflow: hidden;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            linear-gradient(
              135deg,
              rgba(
                13,
                34,
                52,
                0.95
              ),
              rgba(
                7,
                15,
                28,
                0.96
              )
            );
        }

        .hero::before {
          content: "";

          position: absolute;

          width: 420px;
          height: 420px;

          border-radius: 50%;

          left: -180px;
          top: -220px;

          background:
            rgba(
              0,
              213,
              255,
              0.08
            );

          filter:
            blur(50px);
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .eyebrow {
          color: #5ddfff;

          font-size: 10px;

          letter-spacing:
            1.4px;

          font-weight: 800;

          margin-bottom: 9px;
        }

        .hero h1 {
          margin: 0;

          font-size:
            clamp(
              28px,
              5vw,
              46px
            );

          line-height: 1.2;
        }

        .hero-description {
          max-width: 800px;

          color: #899cb3;

          font-size: 13px;

          line-height: 2;

          margin:
            13px 0 0;
        }

        .toolbar {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          flex-wrap: wrap;

          gap: 12px;

          margin-top: 23px;
        }

        .filters {
          display: flex;

          gap: 7px;

          flex-wrap: wrap;
        }

        .filter {
          cursor: pointer;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          color: #8fa1b5;

          border-radius:
            11px;

          padding:
            9px 14px;

          font-size: 11px;
        }

        .filter.active {
          color: white;

          border-color:
            rgba(
              70,
              220,
              255,
              0.35
            );

          background:
            rgba(
              70,
              220,
              255,
              0.1
            );
        }

        .actions {
          display: flex;

          gap: 8px;
        }

        .select,
        .refresh {
          min-height: 40px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          color: white;

          border-radius:
            11px;

          padding:
            0 12px;
        }

        .refresh {
          cursor: pointer;
        }

        .refresh:disabled {
          opacity: 0.5;
          cursor:
            not-allowed;
        }

        .stats {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 11px;

          margin:
            14px 0;
        }

        .stat {
          padding:
            17px;

          border-radius:
            19px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              10,
              21,
              35,
              0.82
            );
        }

        .stat-label {
          color: #71849b;

          font-size: 10px;
        }

        .stat-value {
          display: block;

          margin-top: 7px;

          font-size: 25px;

          font-weight: 900;
        }

        .cyan {
          color: #5bdfff;
        }

        .green {
          color: #58efad;
        }

        .red {
          color: #ff7185;
        }

        .yellow {
          color: #ffd76c;
        }

        .cards {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                360px,
                1fr
              )
            );

          gap: 14px;
        }

        .card {
          position: relative;

          overflow: hidden;

          padding:
            19px;

          border-radius:
            23px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.075
            );

          background:
            linear-gradient(
              145deg,
              rgba(
                15,
                29,
                46,
                0.96
              ),
              rgba(
                6,
                13,
                24,
                0.96
              )
            );

          box-shadow:
            0 18px 55px
            rgba(
              0,
              0,
              0,
              0.23
            );
        }

        .card::before {
          content: "";

          position: absolute;

          top: 0;
          left: 0;
          right: 0;

          height: 2px;

          background:
            linear-gradient(
              90deg,
              transparent,
              #57dcff,
              transparent
            );
        }

        .card-head {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 10px;
        }

        .asset {
          display: flex;

          align-items: center;

          gap: 10px;
        }

        .asset-icon {
          width: 46px;
          height: 46px;

          display: grid;

          place-items: center;

          border-radius:
            14px;

          font-size: 14px;

          font-weight: 900;

          color: #dffbff;

          border:
            1px solid
            rgba(
              88,
              220,
              255,
              0.18
            );

          background:
            linear-gradient(
              135deg,
              rgba(
                57,
                207,
                240,
                0.18
              ),
              rgba(
                105,
                95,
                255,
                0.18
              )
            );
        }

        .asset-name {
          margin: 0;

          font-size: 15px;
        }

        .asset-description {
          display: block;

          margin-top: 4px;

          color: #6f829a;

          font-size: 9px;
        }

        .side {
          display: inline-flex;

          align-items: center;

          gap: 5px;

          padding:
            8px 10px;

          border-radius:
            10px;

          font-size: 10px;

          font-weight: 900;
        }

        .side.buy {
          color: #61f0ae;

          background:
            rgba(
              49,
              224,
              157,
              0.09
            );

          border:
            1px solid
            rgba(
              49,
              224,
              157,
              0.2
            );
        }

        .side.sell {
          color: #ff7085;

          background:
            rgba(
              255,
              72,
              103,
              0.09
            );

          border:
            1px solid
            rgba(
              255,
              72,
              103,
              0.2
            );
        }

        .side.wait {
          color: #ffd66c;

          background:
            rgba(
              255,
              214,
              108,
              0.08
            );

          border:
            1px solid
            rgba(
              255,
              214,
              108,
              0.15
            );
        }

        .main-price {
          display: flex;

          align-items:
            flex-end;

          justify-content:
            space-between;

          gap: 15px;

          margin:
            20px 0 15px;
        }

        .price-label {
          color: #6f8299;

          font-size: 9px;
        }

        .price {
          margin-top: 5px;

          font-size: 27px;

          font-weight: 900;

          letter-spacing:
            -1px;
        }

        .confidence {
          width: 105px;
        }

        .confidence-top {
          display: flex;

          justify-content:
            space-between;

          margin-bottom: 6px;

          color: #71849b;

          font-size: 9px;
        }

        .progress {
          height: 6px;

          overflow: hidden;

          border-radius:
            999px;

          background:
            rgba(
              255,
              255,
              255,
              0.07
            );
        }

        .progress span {
          display: block;

          height: 100%;

          border-radius:
            inherit;

          background:
            linear-gradient(
              90deg,
              #50defe,
              #7b82ff
            );
        }

        .levels {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 6px;
        }

        .level {
          padding:
            10px 7px;

          border-radius:
            12px;

          background:
            rgba(
              255,
              255,
              255,
              0.032
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.05
            );
        }

        .level-label {
          display: block;

          margin-bottom: 5px;

          color: #667991;

          font-size: 8px;
        }

        .level-value {
          display: block;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          font-size: 10px;
        }

        .entry {
          color: #dbefff;
        }

        .stop {
          color: #ff7387;
        }

        .target {
          color: #59edaa;
        }

        .indicators {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 6px;

          margin-top: 7px;
        }

        .metric {
          padding:
            10px;

          border-radius:
            11px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .metric span {
          display: block;

          color: #657990;

          font-size: 8px;

          margin-bottom: 4px;
        }

        .metric strong {
          font-size: 10px;
        }

        .levels-box {
          margin-top: 10px;

          padding:
            12px;

          border-radius:
            14px;

          background:
            rgba(
              4,
              10,
              18,
              0.42
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.05
            );
        }

        .levels-title {
          color: #8598af;

          font-size: 9px;

          margin-bottom: 9px;
        }

        .sr {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 7px;
        }

        .sr-item {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            8px;

          border-radius:
            9px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .sr-item span {
          color: #687b92;

          font-size: 8px;
        }

        .sr-item strong {
          font-size: 9px;
        }

        .support {
          color: #59d9ff;
        }

        .resistance {
          color: #ff8294;
        }

        .reason-box {
          margin-top: 10px;

          padding:
            12px;

          border-radius:
            14px;

          background:
            rgba(
              4,
              10,
              18,
              0.38
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.05
            );
        }

        .reason-title {
          color: #8497ae;

          font-size: 9px;

          margin-bottom: 7px;
        }

        .reason {
          display: flex;

          gap: 6px;

          color: #b4c2d2;

          font-size: 9px;

          line-height: 1.7;

          margin-top: 3px;
        }

        .reason b {
          color: #5be4aa;
        }

        .footer {
          display: flex;

          justify-content:
            space-between;

          gap: 7px;

          margin-top: 12px;

          padding-top: 10px;

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.055
            );

          color: #5e7188;

          font-size: 8px;
        }

        .empty,
        .error {
          padding:
            55px 20px;

          text-align: center;

          border-radius:
            22px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              9,
              19,
              32,
              0.8
            );
        }

        .error {
          color: #ff8496;
        }

        .retry {
          margin-top: 15px;

          padding:
            10px 18px;

          border: 0;

          border-radius:
            10px;

          cursor: pointer;

          color: white;

          background:
            linear-gradient(
              135deg,
              #1196bc,
              #5c62db
            );
        }

        .loading {
          animation:
            loadingPulse 1.3s
            infinite;
        }

        @keyframes loadingPulse {
          50% {
            opacity: 0.45;
          }
        }

        .source {
          text-align: center;

          color: #566b83;

          font-size: 8px;

          margin-top: 24px;

          line-height: 2;
        }

        @media (max-width: 850px) {
          .container {
            width:
              calc(100% - 16px);

            padding-top: 8px;
          }

          .stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .cards {
            grid-template-columns:
              1fr;
          }

          .toolbar {
            align-items:
              stretch;
          }

          .actions {
            width: 100%;
          }

          .select,
          .refresh {
            flex: 1;
          }
        }

        @media (max-width: 480px) {
          .topbar {
            border-radius:
              18px;
          }

          .brand-subtitle {
            display: none;
          }

          .hero {
            padding:
              24px 17px;

            border-radius:
              22px;
          }

          .hero h1 {
            font-size: 28px;
          }

          .hero-description {
            font-size: 11px;
          }

          .filters {
            width: 100%;
          }

          .filter {
            flex: 1;

            padding:
              9px 7px;
          }

          .actions {
            flex-direction:
              column;
          }

          .select,
          .refresh {
            width: 100%;
          }

          .levels {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .indicators {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .footer {
            flex-direction:
              column;

            text-align: center;
          }
        }
      `}</style>

      <div className="container">
        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">
              AI
            </div>

            <div>
              <h2 className="brand-title">
                Trading AI
              </h2>

              <p className="brand-subtitle">
                Real Market Intelligence
              </p>
            </div>
          </div>

          <div className="live">
            <span className="live-dot" />
            داده بازار زنده
          </div>
        </header>

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              REAL-TIME MARKET ENGINE
            </div>

            <h1>
              سیگنال‌های معاملاتی
              هوشمند
            </h1>

            <p className="hero-description">
              موتور تحلیل Trading AI
              قیمت واقعی بازار را
              دریافت کرده و بر اساس
              روند، EMA، RSI، MACD،
              ATR و ساختار قیمت،
              وضعیت بازار را محاسبه
              می‌کند. در صورت نبود
              شرایط معتبر، سیستم
              سیگنال ساختگی تولید
              نمی‌کند.
            </p>

            <div className="toolbar">
              <div className="filters">
                <button
                  className={
                    filter === "ALL"
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter("ALL")
                  }
                >
                  همه
                </button>

                <button
                  className={
                    filter === "BUY"
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter("BUY")
                  }
                >
                  BUY
                </button>

                <button
                  className={
                    filter === "SELL"
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter("SELL")
                  }
                >
                  SELL
                </button>
              </div>

              <div className="actions">
                <select
                  className="select"
                  value={timeframe}
                  onChange={(event) =>
                    setTimeframe(
                      event.target.value
                    )
                  }
                >
                  {TIMEFRAMES.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        تایم‌فریم:{" "}
                        {item.label}
                      </option>
                    )
                  )}
                </select>

                <button
                  className="refresh"
                  onClick={() =>
                    loadSignals(true)
                  }
                  disabled={
                    refreshing
                  }
                >
                  {refreshing
                    ? "در حال دریافت..."
                    : "↻ بروزرسانی"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="stat">
            <span className="stat-label">
              بازارهای بررسی‌شده
            </span>

            <strong className="stat-value cyan">
              {signals.length}
            </strong>
          </div>

          <div className="stat">
            <span className="stat-label">
              BUY
            </span>

            <strong className="stat-value green">
              {buyCount}
            </strong>
          </div>

          <div className="stat">
            <span className="stat-label">
              SELL
            </span>

            <strong className="stat-value red">
              {sellCount}
            </strong>
          </div>

          <div className="stat">
            <span className="stat-label">
              WAIT
            </span>

            <strong className="stat-value yellow">
              {waitCount}
            </strong>
          </div>
        </section>

        {loading ? (
          <div className="empty loading">
            در حال دریافت قیمت واقعی
            بازار و محاسبه تحلیل...
          </div>
        ) : error ? (
          <div className="error">
            <strong>
              دریافت داده بازار ناموفق
              بود
            </strong>

            <div
              style={{
                marginTop: 10,
              }}
            >
              {error}
            </div>

            <button
              className="retry"
              onClick={() =>
                loadSignals()
              }
            >
              تلاش مجدد
            </button>
          </div>
        ) : visibleSignals.length ===
          0 ? (
          <div className="empty">
            در حال حاضر سیگنال معتبری
            در این فیلتر وجود ندارد.
            <br />
            سیستم برای ساخت سیگنال
            جعلی، بازار را مجبور به
            BUY یا SELL نمی‌کند.
          </div>
        ) : (
          <section className="cards">
            {visibleSignals.map(
              (signal) => (
                <article
                  className="card"
                  key={signal.id}
                >
                  <div className="card-head">
                    <div className="asset">
                      <div className="asset-icon">
                        {symbolIcon(
                          signal.symbol
                        )}
                      </div>

                      <div>
                        <h3 className="asset-name">
                          {signal.symbol}
                        </h3>

                        <span className="asset-description">
                          {signal.name}
                        </span>
                      </div>
                    </div>

                    <Side
                      side={
                        signal.side
                      }
                    />
                  </div>

                  <div className="main-price">
                    <div>
                      <div className="price-label">
                        قیمت فعلی بازار
                      </div>

                      <div className="price">
                        {formatPrice(
                          signal.price
                        )}
                      </div>
                    </div>

                    <div className="confidence">
                      <div className="confidence-top">
                        <span>
                          قدرت
                        </span>

                        <b>
                          {
                            signal.strength
                          }
                          %
                        </b>
                      </div>

                      <div className="progress">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              signal.strength
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="levels">
                    <div className="level">
                      <span className="level-label">
                        ENTRY
                      </span>

                      <strong className="level-value entry">
                        {formatPrice(
                          signal.entry
                        )}
                      </strong>
                    </div>

                    <div className="level">
                      <span className="level-label">
                        STOP LOSS
                      </span>

                      <strong className="level-value stop">
                        {formatPrice(
                          signal.stopLoss
                        )}
                      </strong>
                    </div>

                    <div className="level">
                      <span className="level-label">
                        TP 1
                      </span>

                      <strong className="level-value target">
                        {formatPrice(
                          signal.takeProfit1
                        )}
                      </strong>
                    </div>

                    <div className="level">
                      <span className="level-label">
                        TP 2
                      </span>

                      <strong className="level-value target">
                        {formatPrice(
                          signal.takeProfit2
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    className="levels"
                    style={{
                      marginTop: 6,
                    }}
                  >
                    <div className="level">
                      <span className="level-label">
                        TP 3
                      </span>

                      <strong className="level-value target">
                        {formatPrice(
                          signal.takeProfit3
                        )}
                      </strong>
                    </div>

                    <div className="level">
                      <span className="level-label">
                        R:R
                      </span>

                      <strong className="level-value">
                        {signal.riskReward
                          ? `1:${signal.riskReward}`
                          : "—"}
                      </strong>
                    </div>

                    <div className="level">
                      <span className="level-label">
                        CONFIDENCE
                      </span>

                      <strong className="level-value">
                        {
                          signal.confidence
                        }
                        %
                      </strong>
                    </div>

                    <div className="level">
                      <span className="level-label">
                        TREND
                      </span>

                      <strong
                        className={`level-value ${
                          signal.trend ===
                          "BULLISH"
                            ? "target"
                            : signal.trend ===
                              "BEARISH"
                            ? "stop"
                            : ""
                        }`}
                      >
                        {signal.trend ===
                        "BULLISH"
                          ? "صعودی"
                          : signal.trend ===
                            "BEARISH"
                          ? "نزولی"
                          : "خنثی"}
                      </strong>
                    </div>
                  </div>

                  <div className="indicators">
                    <Metric
                      title="RSI"
                      value={String(
                        signal.rsi
                      )}
                    />

                    <Metric
                      title="EMA 20"
                      value={formatPrice(
                        signal.ema20
                      )}
                    />

                    <Metric
                      title="EMA 50"
                      value={formatPrice(
                        signal.ema50
                      )}
                    />

                    <Metric
                      title="ATR"
                      value={formatPrice(
                        signal.atr
                      )}
                    />
                  </div>

                  <div className="indicators">
                    <Metric
                      title="MACD"
                      value={formatPrice(
                        signal.macd
                      )}
                    />

                    <Metric
                      title="SIGNAL"
                      value={formatPrice(
                        signal.macdSignal
                      )}
                    />

                    <Metric
                      title="HISTOGRAM"
                      value={formatPrice(
                        signal.macdHistogram
                      )}
                    />

                    <Metric
                      title="TF"
                      value={
                        signal.interval
                      }
                    />
                  </div>

                  <div className="levels-box">
                    <div className="levels-title">
                      حمایت و مقاومت
                    </div>

                    <div className="sr">
                      <div className="sr-item">
                        <span>
                          مقاومت ۲
                        </span>

                        <strong className="resistance">
                          {formatPrice(
                            signal.resistance2
                          )}
                        </strong>
                      </div>

                      <div className="sr-item">
                        <span>
                          مقاومت ۱
                        </span>

                        <strong className="resistance">
                          {formatPrice(
                            signal.resistance1
                          )}
                        </strong>
                      </div>

                      <div className="sr-item">
                        <span>
                          حمایت ۱
                        </span>

                        <strong className="support">
                          {formatPrice(
                            signal.support1
                          )}
                        </strong>
                      </div>

                      <div className="sr-item">
                        <span>
                          حمایت ۲
                        </span>

                        <strong className="support">
                          {formatPrice(
                            signal.support2
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="reason-box">
                    <div className="reason-title">
                      منطق تولید سیگنال
                    </div>

                    {signal.reasons
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          reason,
                          index
                        ) => (
                          <div
                            className="reason"
                            key={`${signal.id}-${index}`}
                          >
                            <b>
                              ✓
                            </b>

                            <span>
                              {reason}
                            </span>
                          </div>
                        )
                      )}
                  </div>

                  <div className="footer">
                    <span>
                      کندل:{" "}
                      {formatDate(
                        signal.candleTime
                      )}
                    </span>

                    <span>
                      بروزرسانی:{" "}
                      {formatDate(
                        signal.generatedAt
                      )}
                    </span>
                  </div>
                </article>
              )
            )}
          </section>
        )}

        <div className="source">
          منبع قیمت: Twelve Data ·
          تحلیل الگوریتمی بر اساس
          داده بازار ·
          بروزرسانی خودکار هر ۶۰ ثانیه
          <br />
          این سیستم تضمین‌کننده سود
          یا نتیجه معامله نیست.
          تصمیم معامله باید با مدیریت
          ریسک انجام شود.
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
