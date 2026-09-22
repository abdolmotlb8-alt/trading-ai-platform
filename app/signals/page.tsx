"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SignalStatus =
  | "ACTIVE"
  | "WAITING"
  | "TP1"
  | "TP2"
  | "TP3"
  | "STOP_LOSS"
  | "EXPIRED"
  | "CLOSED"
  | "WIN"
  | "LOSS"
  | "BREAKEVEN"
  | string;

type SignalResult =
  | "WIN"
  | "LOSS"
  | "BREAKEVEN"
  | "OPEN"
  | "PENDING"
  | string;

type Signal = {
  id: string;

  symbol: string;
  name: string;

  market:
    | "FOREX"
    | "CRYPTO"
    | "COMMODITY"
    | string;

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
    | "NEUTRAL"
    | string;

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

  /* Optional fields from the real signal engine */
  status?: SignalStatus;
  result?: SignalResult;

  telegramSent?: boolean;

  currentPrice?: number | null;
  lastCheckedAt?: string | null;

  createdAt?: string;
  expiresAt?: string | null;
  closedAt?: string | null;

  tp1HitAt?: string | null;
  tp2HitAt?: string | null;
  tp3HitAt?: string | null;
  stopLossHitAt?: string | null;

  realizedProfitLoss?: number | null;
  riskUsd?: number | null;

  takeProfit1Usd?: number | null;
  takeProfit2Usd?: number | null;
  takeProfit3Usd?: number | null;
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
    label: "۵ دقیقه",
  },
  {
    value: "15min",
    label: "۱۵ دقیقه",
  },
  {
    value: "30min",
    label: "۳۰ دقیقه",
  },
  {
    value: "1h",
    label: "۱ ساعت",
  },
  {
    value: "4h",
    label: "۴ ساعت",
  },
];

function formatPrice(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 10000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  }

  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  }

  if (value >= 100) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 3,
    });
  }

  if (value >= 10) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}

function formatNumber(
  value: number | null | undefined,
  digits = 2
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function symbolIcon(symbol: string) {
  const normalized =
    symbol.toUpperCase();

  if (
    normalized === "XAU/USD" ||
    normalized.includes("XAU")
  ) {
    return "Au";
  }

  if (
    normalized === "EUR/USD" ||
    normalized.includes("EUR")
  ) {
    return "€";
  }

  if (
    normalized === "GBP/USD" ||
    normalized.includes("GBP")
  ) {
    return "£";
  }

  if (
    normalized === "USD/JPY" ||
    normalized.includes("JPY")
  ) {
    return "¥";
  }

  if (
    normalized === "BTC/USD" ||
    normalized.includes("BTC")
  ) {
    return "₿";
  }

  if (
    normalized === "ETH/USD" ||
    normalized.includes("ETH")
  ) {
    return "Ξ";
  }

  return "◎";
}

function marketLabel(
  market: string
) {
  if (market === "FOREX") {
    return "FOREX";
  }

  if (market === "CRYPTO") {
    return "CRYPTO";
  }

  if (market === "COMMODITY") {
    return "COMMODITY";
  }

  return market;
}

function timeframeLabel(
  timeframe: string
) {
  const item =
    TIMEFRAMES.find(
      (item) =>
        item.value === timeframe
    );

  return (
    item?.label ||
    timeframe
  );
}

function trendLabel(
  trend: Signal["trend"]
) {
  if (trend === "BULLISH") {
    return "صعودی";
  }

  if (trend === "BEARISH") {
    return "نزولی";
  }

  return "خنثی";
}

function statusLabel(
  signal: Signal
) {
  const status =
    signal.status ||
    "ACTIVE";

  if (
    status === "TP1"
  ) {
    return "TP1 فعال شد";
  }

  if (
    status === "TP2"
  ) {
    return "TP2 فعال شد";
  }

  if (
    status === "TP3"
  ) {
    return "TP3 تکمیل شد";
  }

  if (
    status ===
      "STOP_LOSS" ||
    status === "SL"
  ) {
    return "حد ضرر";
  }

  if (
    status ===
    "EXPIRED"
  ) {
    return "منقضی شده";
  }

  if (
    status ===
      "CLOSED" ||
    status === "WIN"
  ) {
    return "بسته شده";
  }

  if (
    status === "LOSS"
  ) {
    return "زیان";
  }

  if (
    status ===
    "BREAKEVEN"
  ) {
    return "سر‌به‌سر";
  }

  if (
    status ===
      "WAITING" ||
    signal.side === "WAIT"
  ) {
    return "در انتظار";
  }

  return "فعال";
}

function statusClass(
  signal: Signal
) {
  const status =
    signal.status ||
    "ACTIVE";

  if (
    status === "TP1" ||
    status === "TP2" ||
    status === "TP3" ||
    status === "WIN"
  ) {
    return "status-success";
  }

  if (
    status ===
      "STOP_LOSS" ||
    status === "SL" ||
    status === "LOSS"
  ) {
    return "status-danger";
  }

  if (
    status ===
      "EXPIRED" ||
    status ===
      "BREAKEVEN"
  ) {
    return "status-warning";
  }

  return "status-active";
}

function Side({
  side,
}: {
  side: Signal["side"];
}) {
  if (side === "BUY") {
    return (
      <span className="side side-buy">
        <span className="side-icon">
          ↗
        </span>
        BUY
      </span>
    );
  }

  if (side === "SELL") {
    return (
      <span className="side side-sell">
        <span className="side-icon">
          ↘
        </span>
        SELL
      </span>
    );
  }

  return (
    <span className="side side-wait">
      <span className="side-icon">
        ◌
      </span>
      WAIT
    </span>
  );
}

function Metric({
  title,
  value,
  tone = "",
}: {
  title: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="metric">
      <span className="metric-title">
        {title}
      </span>

      <strong
        className={
          tone
            ? `metric-value ${tone}`
            : "metric-value"
        }
      >
        {value}
      </strong>
    </div>
  );
}

function TargetBox({
  label,
  value,
  tone,
  hit,
}: {
  label: string;
  value: number | null | undefined;
  tone: "entry" | "sl" | "tp";
  hit?: boolean;
}) {
  return (
    <div
      className={`target-box ${tone} ${
        hit
          ? "target-hit"
          : ""
      }`}
    >
      <div className="target-head">
        <span>
          {label}
        </span>

        {hit && (
          <span className="hit-mark">
            ✓
          </span>
        )}
      </div>

      <strong>
        {formatPrice(value)}
      </strong>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] =
    useState<Signal[]>([]);

  const [summary, setSummary] =
    useState({
      total: 0,
      buy: 0,
      sell: 0,
      wait: 0,
    });

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

  const [apiErrors, setApiErrors] =
    useState<
      Array<{
        symbol: string;
        error: string;
      }>
    >([]);

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

          const nextSignals =
            data.signals || [];

          setSignals(
            nextSignals
          );

          setSummary(
            data.summary || {
              total:
                nextSignals.length,
              buy:
                nextSignals.filter(
                  (item) =>
                    item.side ===
                    "BUY"
                ).length,
              sell:
                nextSignals.filter(
                  (item) =>
                    item.side ===
                    "SELL"
                ).length,
              wait:
                nextSignals.filter(
                  (item) =>
                    item.side ===
                    "WAIT"
                ).length,
            }
          );

          setApiErrors(
            data.errors || []
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
    summary.buy;

  const sellCount =
    summary.sell;

  const waitCount =
    summary.wait;

  const activeCount =
    signals.filter(
      (signal) => {
        const status =
          signal.status ||
          "ACTIVE";

        return (
          status ===
            "ACTIVE" ||
          status ===
            "WAITING" ||
          status ===
            "TP1" ||
          status ===
            "TP2"
        );
      }
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
          background: #050505;
          color: #f5f1e8;
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

        button {
          -webkit-tap-highlight-color:
            transparent;
        }

        .page {
          min-height: 100vh;

          overflow-x: hidden;

          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(
                212,
                175,
                55,
                0.14
              ),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 35%,
              rgba(
                212,
                175,
                55,
                0.06
              ),
              transparent 25%
            ),
            linear-gradient(
              180deg,
              #090909 0%,
              #050505 50%,
              #030303 100%
            );
        }

        .container {
          width: min(
            1480px,
            calc(100% - 30px)
          );

          margin: 0 auto;

          padding:
            22px 0 70px;
        }

        .topbar {
          position: relative;

          min-height: 78px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 18px;

          padding:
            13px 16px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.2
            );

          border-radius:
            22px;

          background:
            linear-gradient(
              135deg,
              rgba(
                24,
                22,
                16,
                0.96
              ),
              rgba(
                8,
                8,
                8,
                0.95
              )
            );

          backdrop-filter:
            blur(22px);

          box-shadow:
            0 22px 80px
            rgba(
              0,
              0,
              0,
              0.5
            );
        }

        .topbar::after {
          content: "";

          position: absolute;

          left: 15%;

          right: 15%;

          bottom: -1px;

          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                212,
                175,
                55,
                0.65
              ),
              transparent
            );
        }

        .brand {
          display: flex;

          align-items: center;

          gap: 12px;
        }

        .brand-logo {
          width: 52px;
          height: 52px;

          display: grid;

          place-items: center;

          position: relative;

          border-radius:
            16px;

          color: #050505;

          font-size: 15px;

          font-weight: 1000;

          background:
            linear-gradient(
              135deg,
              #fff1a8 0%,
              #d4af37 38%,
              #8e6815 100%
            );

          box-shadow:
            0 0 30px
            rgba(
              212,
              175,
              55,
              0.18
            ),
            inset 0 1px 0
            rgba(
              255,
              255,
              255,
              0.5
            );
        }

        .brand-logo::before {
          content: "";

          position: absolute;

          inset: 4px;

          border-radius:
            12px;

          border:
            1px solid
            rgba(
              0,
              0,
              0,
              0.25
            );
        }

        .brand-title {
          margin: 0;

          font-size: 18px;

          color: #f6f1df;

          letter-spacing:
            0.2px;
        }

        .brand-subtitle {
          margin:
            5px 0 0;

          color: #80765d;

          font-size: 9px;

          letter-spacing:
            1.1px;

          text-transform:
            uppercase;
        }

        .live {
          display: inline-flex;

          align-items: center;

          gap: 8px;

          padding:
            9px 13px;

          border-radius:
            999px;

          color: #b9f2c9;

          font-size: 9px;

          border:
            1px solid
            rgba(
              73,
              219,
              139,
              0.2
            );

          background:
            rgba(
              73,
              219,
              139,
              0.05
            );
        }

        .live-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background:
            #63e89b;

          box-shadow:
            0 0 13px
            rgba(
              99,
              232,
              155,
              0.9
            );
        }

        .hero {
          position: relative;

          margin-top: 15px;

          padding:
            34px 30px;

          overflow: hidden;

          border-radius:
            28px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.2
            );

          background:
            linear-gradient(
              135deg,
              rgba(
                29,
                26,
                18,
                0.96
              ),
              rgba(
                10,
                10,
                10,
                0.97
              )
            );

          box-shadow:
            0 25px 80px
            rgba(
              0,
              0,
              0,
              0.4
            );
        }

        .hero::before {
          content: "";

          position: absolute;

          width: 450px;
          height: 450px;

          top: -270px;
          left: -120px;

          border-radius: 50%;

          background:
            rgba(
              212,
              175,
              55,
              0.08
            );

          filter:
            blur(65px);
        }

        .hero::after {
          content: "";

          position: absolute;

          right: -130px;
          bottom: -180px;

          width: 360px;
          height: 360px;

          border-radius: 50%;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.06
            );
        }

        .hero-content {
          position: relative;

          z-index: 2;
        }

        .eyebrow {
          display: inline-flex;

          align-items: center;

          gap: 8px;

          color: #d4af37;

          font-size: 9px;

          font-weight: 900;

          letter-spacing:
            1.8px;

          margin-bottom: 11px;
        }

        .eyebrow::before {
          content: "";

          width: 24px;

          height: 1px;

          background:
            #d4af37;
        }

        .hero h1 {
          margin: 0;

          color: #f8f2df;

          font-size:
            clamp(
              28px,
              5vw,
              46px
            );

          line-height: 1.25;

          font-weight: 900;
        }

        .hero-description {
          max-width: 900px;

          margin:
            14px 0 0;

          color: #928a77;

          font-size: 12px;

          line-height: 2.1;
        }

        .toolbar {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          flex-wrap: wrap;

          gap: 13px;

          margin-top: 25px;
        }

        .filters {
          display: flex;

          gap: 7px;

          flex-wrap: wrap;
        }

        .filter {
          min-width: 70px;

          cursor: pointer;

          padding:
            10px 15px;

          border-radius:
            11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          color: #837b69;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          transition:
            0.2s ease;
        }

        .filter:hover {
          border-color:
            rgba(
              212,
              175,
              55,
              0.3
            );

          color: #d4af37;
        }

        .filter.active {
          color: #0a0905;

          border-color:
            rgba(
              212,
              175,
              55,
              0.75
            );

          background:
            linear-gradient(
              135deg,
              #f4dc82,
              #d4af37,
              #9d7519
            );

          box-shadow:
            0 7px 25px
            rgba(
              212,
              175,
              55,
              0.13
            );
        }

        .actions {
          display: flex;

          gap: 8px;
        }

        .select,
        .refresh {
          min-height: 42px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.18
            );

          border-radius:
            11px;

          padding:
            0 13px;

          color: #e9dfc4;

          background:
            #0c0c0b;

          outline: none;
        }

        .select {
          min-width: 150px;

          cursor: pointer;
        }

        .select option {
          background: #11100d;

          color: #eee4c8;
        }

        .refresh {
          cursor: pointer;

          color: #080705;

          font-weight: 800;

          background:
            linear-gradient(
              135deg,
              #f2d779,
              #d4af37,
              #99701a
            );

          transition:
            0.2s ease;
        }

        .refresh:hover {
          transform:
            translateY(-1px);

          box-shadow:
            0 8px 25px
            rgba(
              212,
              175,
              55,
              0.16
            );
        }

        .refresh:disabled {
          opacity: 0.5;

          cursor:
            not-allowed;

          transform:
            none;
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
          position: relative;

          overflow: hidden;

          min-height: 105px;

          padding:
            18px;

          border-radius:
            19px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.11
            );

          background:
            linear-gradient(
              145deg,
              rgba(
                20,
                19,
                15,
                0.94
              ),
              rgba(
                8,
                8,
                8,
                0.95
              )
            );

          box-shadow:
            0 15px 45px
            rgba(
              0,
              0,
              0,
              0.25
            );
        }

        .stat::after {
          content: "";

          position: absolute;

          width: 80px;
          height: 80px;

          left: -35px;
          bottom: -45px;

          border-radius: 50%;

          background:
            rgba(
              212,
              175,
              55,
              0.07
            );

          filter:
            blur(10px);
        }

        .stat-label {
          display: block;

          color: #756d5b;

          font-size: 9px;
        }

        .stat-value {
          display: block;

          margin-top: 8px;

          font-size: 27px;

          font-weight: 900;
        }

        .stat-value.gold {
          color: #d4af37;
        }

        .stat-value.green {
          color: #65e6a0;
        }

        .stat-value.red {
          color: #ff7181;
        }

        .stat-value.gray {
          color: #aaa18e;
        }

        .engine-row {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 10px;

          margin:
            12px 0;
        }

        .engine-status {
          display: inline-flex;

          align-items: center;

          gap: 8px;

          color: #bcb39f;

          font-size: 9px;
        }

        .engine-status strong {
          color: #d4af37;
        }

        .engine-line {
          height: 1px;

          flex: 1;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                212,
                175,
                55,
                0.2
              ),
              transparent
            );
        }

        .api-error-bar {
          margin-bottom: 13px;

          padding:
            11px 14px;

          border-radius:
            13px;

          color: #e8b9a4;

          border:
            1px solid
            rgba(
              217,
              116,
              75,
              0.18
            );

          background:
            rgba(
              150,
              63,
              38,
              0.08
            );

          font-size: 9px;
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
              212,
              175,
              55,
              0.14
            );

          background:
            linear-gradient(
              145deg,
              rgba(
                20,
                19,
                16,
                0.98
              ),
              rgba(
                8,
                8,
                8,
                0.98
              )
            );

          box-shadow:
            0 20px 65px
            rgba(
              0,
              0,
              0,
              0.35
            );

          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .card:hover {
          transform:
            translateY(-2px);

          border-color:
            rgba(
              212,
              175,
              55,
              0.28
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
              #d4af37,
              #fff1a8,
              #d4af37,
              transparent
            );
        }

        .card-head {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 10px;
        }

        .asset {
          display: flex;

          align-items: center;

          gap: 11px;
        }

        .asset-icon {
          width: 48px;
          height: 48px;

          display: grid;

          place-items: center;

          border-radius:
            14px;

          color: #e7c85d;

          font-size: 15px;

          font-weight: 1000;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.3
            );

          background:
            linear-gradient(
              135deg,
              rgba(
                212,
                175,
                55,
                0.16
              ),
              rgba(
                212,
                175,
                55,
                0.03
              )
            );

          box-shadow:
            inset 0 1px 0
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .asset-name {
          margin: 0;

          color: #f4eedf;

          font-size: 15px;

          font-weight: 900;
        }

        .asset-description {
          display: block;

          margin-top: 4px;

          color: #6f6757;

          font-size: 9px;
        }

        .market-badge {
          display: inline-flex;

          margin-top: 5px;

          padding:
            3px 7px;

          border-radius:
            999px;

          color: #a89b7b;

          background:
            rgba(
              212,
              175,
              55,
              0.045
            );

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.1
            );

          font-size: 7px;
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

          font-weight: 1000;
        }

        .side-icon {
          font-size: 13px;
        }

        .side-buy {
          color: #65e6a0;

          border:
            1px solid
            rgba(
              65,
              223,
              147,
              0.2
            );

          background:
            rgba(
              65,
              223,
              147,
              0.06
            );
        }

        .side-sell {
          color: #ff7181;

          border:
            1px solid
            rgba(
              255,
              84,
              106,
              0.2
            );

          background:
            rgba(
              255,
              84,
              106,
              0.06
            );
        }

        .side-wait {
          color: #d4af37;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.2
            );

          background:
            rgba(
              212,
              175,
              55,
              0.05
            );
        }

        .status-row {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 8px;

          margin-top: 12px;
        }

        .status {
          display: inline-flex;

          align-items: center;

          gap: 6px;

          padding:
            6px 9px;

          border-radius:
            8px;

          font-size: 8px;

          font-weight: 800;
        }

        .status-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;
        }

        .status-active {
          color: #e2bd4e;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.18
            );

          background:
            rgba(
              212,
              175,
              55,
              0.05
            );
        }

        .status-active
          .status-dot {
          background:
            #d4af37;

          box-shadow:
            0 0 8px
            rgba(
              212,
              175,
              55,
              0.8
            );
        }

        .status-success {
          color: #65e6a0;

          border:
            1px solid
            rgba(
              65,
              223,
              147,
              0.17
            );

          background:
            rgba(
              65,
              223,
              147,
              0.05
            );
        }

        .status-success
          .status-dot {
          background:
            #65e6a0;
        }

        .status-danger {
          color: #ff7181;

          border:
            1px solid
            rgba(
              255,
              84,
              106,
              0.17
            );

          background:
            rgba(
              255,
              84,
              106,
              0.05
            );
        }

        .status-danger
          .status-dot {
          background:
            #ff7181;
        }

        .status-warning {
          color: #d4af37;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.17
            );

          background:
            rgba(
              212,
              175,
              55,
              0.05
            );
        }

        .status-warning
          .status-dot {
          background:
            #d4af37;
        }

        .telegram {
          display: inline-flex;

          align-items: center;

          gap: 6px;

          color: #77705f;

          font-size: 8px;
        }

        .telegram.sent {
          color: #65e6a0;
        }

        .main-price {
          display: flex;

          align-items:
            flex-end;

          justify-content:
            space-between;

          gap: 15px;

          margin:
            18px 0 14px;

          padding-bottom:
            14px;

          border-bottom:
            1px solid
            rgba(
              212,
              175,
              55,
              0.07
            );
        }

        .price-label {
          color: #716956;

          font-size: 8px;
        }

        .price {
          margin-top: 5px;

          color: #f7f0df;

          font-size: 27px;

          font-weight: 1000;

          letter-spacing:
            -0.7px;
        }

        .price.gold {
          color: #e4c75c;
        }

        .confidence {
          width: 120px;
        }

        .confidence-top {
          display: flex;

          justify-content:
            space-between;

          gap: 8px;

          margin-bottom: 6px;

          color: #746c5c;

          font-size: 8px;
        }

        .confidence-top b {
          color: #d4af37;
        }

        .progress {
          height: 5px;

          overflow: hidden;

          border-radius:
            999px;

          background:
            rgba(
              255,
              255,
              255,
              0.06
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
              #9d7519,
              #d4af37,
              #fff0a1
            );

          box-shadow:
            0 0 10px
            rgba(
              212,
              175,
              55,
              0.25
            );
        }

        .target-grid {
          display: grid;

          grid-template-columns:
            repeat(5, 1fr);

          gap: 6px;
        }

        .target-box {
          min-width: 0;

          padding:
            10px 7px;

          border-radius:
            11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.055
            );

          background:
            rgba(
              255,
              255,
              255,
              0.018
            );
        }

        .target-head {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 3px;

          margin-bottom: 6px;
        }

        .target-head span:first-child {
          color: #686052;

          font-size: 7px;

          white-space: nowrap;
        }

        .target-box strong {
          display: block;

          overflow: hidden;

          text-overflow:
            ellipsis;

          white-space: nowrap;

          font-size: 9px;
        }

        .target-box.entry {
          border-color:
            rgba(
              212,
              175,
              55,
              0.13
            );
        }

        .target-box.entry strong {
          color: #e8dfc8;
        }

        .target-box.sl {
          border-color:
            rgba(
              255,
              84,
              106,
              0.13
            );
        }

        .target-box.sl strong {
          color: #ff7181;
        }

        .target-box.tp {
          border-color:
            rgba(
              65,
              223,
              147,
              0.13
            );
        }

        .target-box.tp strong {
          color: #65e6a0;
        }

        .target-hit {
          box-shadow:
            inset 0 0 0 1px
            rgba(
              101,
              230,
              160,
              0.1
            );
        }

        .hit-mark {
          color: #65e6a0;

          font-size: 9px;
        }

        .secondary-grid {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 6px;

          margin-top: 7px;
        }

        .metric {
          min-width: 0;

          padding:
            10px;

          border-radius:
            11px;

          background:
            rgba(
              255,
              255,
              255,
              0.018
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.045
            );
        }

        .metric-title {
          display: block;

          margin-bottom: 4px;

          color: #625c4f;

          font-size: 7px;
        }

        .metric-value {
          display: block;

          overflow: hidden;

          text-overflow:
            ellipsis;

          white-space: nowrap;

          color: #cfc7b5;

          font-size: 9px;
        }

        .metric-value.gold {
          color: #d4af37;
        }

        .metric-value.green {
          color: #65e6a0;
        }

        .metric-value.red {
          color: #ff7181;
        }

        .levels-box,
        .reason-box {
          margin-top: 9px;

          padding:
            12px;

          border-radius:
            14px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.07
            );

          background:
            rgba(
              0,
              0,
              0,
              0.22
            );
        }

        .levels-title,
        .reason-title {
          color: #827966;

          font-size: 8px;

          margin-bottom: 8px;

          font-weight: 800;
        }

        .sr {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 6px;
        }

        .sr-item {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 5px;

          padding:
            8px;

          border-radius:
            9px;

          background:
            rgba(
              255,
              255,
              255,
              0.018
            );
        }

        .sr-item span {
          color: #625d50;

          font-size: 7px;
        }

        .sr-item strong {
          font-size: 8px;
        }

        .support {
          color: #aab8a9;
        }

        .resistance {
          color: #c49b96;
        }

        .reason {
          display: flex;

          align-items:
            flex-start;

          gap: 7px;

          margin-top: 5px;

          color: #9d9686;

          font-size: 8px;

          line-height: 1.8;
        }

        .reason:first-of-type {
          margin-top: 0;
        }

        .reason-check {
          flex: 0 0 auto;

          color: #d4af37;

          font-weight: 900;
        }

        .empty,
        .error {
          padding:
            60px 20px;

          text-align: center;

          border-radius:
            22px;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.11
            );

          background:
            linear-gradient(
              145deg,
              rgba(
                20,
                19,
                15,
                0.95
              ),
              rgba(
                7,
                7,
                7,
                0.96
              )
            );

          color: #8d8574;

          font-size: 11px;

          line-height: 2;
        }

        .empty-title {
          color: #d4af37;

          font-size: 14px;

          font-weight: 900;

          margin-bottom: 8px;
        }

        .empty-icon {
          width: 55px;
          height: 55px;

          display: grid;

          place-items: center;

          margin:
            0 auto 13px;

          border-radius:
            16px;

          color: #d4af37;

          border:
            1px solid
            rgba(
              212,
              175,
              55,
              0.18
            );

          background:
            rgba(
              212,
              175,
              55,
              0.04
            );

          font-size: 21px;
        }

        .error {
          color: #e18b91;

          border-color:
            rgba(
              255,
              84,
              106,
              0.14
            );
        }

        .retry {
          margin-top: 15px;

          padding:
            10px 19px;

          border: 0;

          border-radius:
            10px;

          cursor: pointer;

          color: #090806;

          font-size: 10px;

          font-weight: 900;

          background:
            linear-gradient(
              135deg,
              #f2d779,
              #d4af37,
              #99701a
            );
        }

        .loading {
          animation:
            loadingPulse 1.4s
            infinite;
        }

        @keyframes loadingPulse {
          50% {
            opacity: 0.45;
          }
        }

        .footer {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 8px;

          margin-top: 12px;

          padding-top: 10px;

          border-top:
            1px solid
            rgba(
              212,
              175,
              55,
              0.07
            );

          color: #625c4f;

          font-size: 7px;
        }

        .footer-right {
          display: flex;

          align-items: center;

          gap: 8px;

          flex-wrap: wrap;
        }

        .result-profit {
          color: #65e6a0;
        }

        .result-loss {
          color: #ff7181;
        }

        .source {
          margin-top: 24px;

          text-align: center;

          color: #504b40;

          font-size: 7px;

          line-height: 2;

          padding:
            0 10px;
        }

        @media (max-width: 1000px) {
          .cards {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .target-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .secondary-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .container {
            width:
              calc(100% - 16px);

            padding:
              8px 0 45px;
          }

          .topbar {
            min-height: 68px;

            border-radius:
              18px;
          }

          .brand-logo {
            width: 45px;
            height: 45px;

            border-radius:
              14px;
          }

          .brand-title {
            font-size: 15px;
          }

          .live {
            padding:
              7px 9px;

            font-size: 8px;
          }

          .hero {
            padding:
              25px 17px;

            border-radius:
              22px;
          }

          .hero h1 {
            font-size: 29px;
          }

          .hero-description {
            font-size: 10px;
          }

          .toolbar {
            align-items:
              stretch;
          }

          .filters {
            width: 100%;
          }

          .filter {
            flex: 1;

            min-width: 0;

            padding:
              9px 7px;

            font-size: 9px;
          }

          .actions {
            width: 100%;

            flex-direction:
              column;
          }

          .select,
          .refresh {
            width: 100%;
          }

          .stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .cards {
            grid-template-columns:
              1fr;
          }
        }

        @media (max-width: 480px) {
          .topbar {
            padding:
              10px;
          }

          .brand-subtitle {
            display: none;
          }

          .brand-logo {
            width: 42px;
            height: 42px;

            border-radius:
              13px;
          }

          .brand-title {
            font-size: 14px;
          }

          .live {
            padding:
              6px 8px;
          }

          .hero h1 {
            font-size: 26px;
          }

          .stats {
            gap: 8px;
          }

          .stat {
            min-height: 91px;

            padding:
              14px;
          }

          .stat-value {
            font-size: 23px;
          }

          .card {
            padding:
              15px;

            border-radius:
              19px;
          }

          .target-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .target-box:last-child {
            grid-column:
              span 2;
          }

          .secondary-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .main-price {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .confidence {
            width: 100%;
          }

          .footer {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .footer-right {
            width: 100%;
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

            موتور بازار فعال
          </div>
        </header>

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              REAL MARKET SIGNAL ENGINE
            </div>

            <h1>
              مرکز سیگنال
              <br />
              Trading AI
            </h1>

            <p className="hero-description">
              این صفحه فقط داده‌ای را
              نمایش می‌دهد که از موتور
              تحلیل بازار دریافت شده است.
              قیمت، Entry، Stop Loss،
              TP1، TP2 و TP3 از داده
              واقعی API دریافت می‌شوند و
              Frontend هیچ سیگنال یا قیمت
              ساختگی ایجاد نمی‌کند.
            </p>

            <div className="toolbar">
              <div className="filters">
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
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
                  type="button"
                  className="refresh"
                  onClick={() =>
                    loadSignals(true)
                  }
                  disabled={
                    refreshing
                  }
                >
                  {refreshing
                    ? "در حال تحلیل..."
                    : "↻ بروزرسانی بازار"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="engine-row">
          <div className="engine-status">
            <span className="live-dot" />

            <span>
              موتور تحلیل:
            </span>

            <strong>
              REAL DATA
            </strong>
          </div>

          <div className="engine-line" />

          <div className="engine-status">
            <span>
              تایم‌فریم:
            </span>

            <strong>
              {timeframeLabel(
                timeframe
              )}
            </strong>
          </div>
        </div>

        <section className="stats">
          <div className="stat">
            <span className="stat-label">
              بازار / خروجی تحلیل
            </span>

            <strong className="stat-value gold">
              {summary.total}
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
              فعال
            </span>

            <strong className="stat-value gray">
              {activeCount}
            </strong>
          </div>
        </section>

        {apiErrors.length > 0 && (
          <div className="api-error-bar">
            <strong>
              بعضی بازارها پاسخ
              نداده‌اند:
            </strong>{" "}
            {apiErrors
              .slice(0, 3)
              .map(
                (item) =>
                  `${item.symbol}: ${item.error}`
              )
              .join(" | ")}
          </div>
        )}

        {loading ? (
          <div className="empty loading">
            <div className="empty-icon">
              ◌
            </div>

            <div className="empty-title">
              در حال تحلیل بازار
            </div>

            دریافت قیمت واقعی،
            محاسبه اندیکاتورها و بررسی
            شرایط سیگنال...
          </div>
        ) : error ? (
          <div className="error">
            <div className="empty-icon">
              !
            </div>

            <div className="empty-title">
              دریافت داده بازار ناموفق بود
            </div>

            <div>
              {error}
            </div>

            <button
              type="button"
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
            <div className="empty-icon">
              ◇
            </div>

            <div className="empty-title">
              سیگنال معتبر فعالی وجود ندارد
            </div>

            <div>
              در تایم‌فریم{" "}
              <strong>
                {timeframeLabel(
                  timeframe
                )}
              </strong>{" "}
              و فیلتر انتخاب‌شده،
              موتور تحلیل در حال حاضر
              شرایط لازم برای BUY یا SELL
              را تأیید نکرده است.
              <br />
              سیستم برای پر کردن صفحه،
              سیگنال ساختگی تولید نمی‌کند.
            </div>
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

                        <span className="market-badge">
                          {marketLabel(
                            signal.market
                          )}
                        </span>
                      </div>
                    </div>

                    <Side
                      side={
                        signal.side
                      }
                    />
                  </div>

                  <div className="status-row">
                    <span
                      className={`status ${statusClass(
                        signal
                      )}`}
                    >
                      <span className="status-dot" />

                      {statusLabel(
                        signal
                      )}
                    </span>

                    <span
                      className={
                        signal.telegramSent
                          ? "telegram sent"
                          : "telegram"
                      }
                    >
                      {signal.telegramSent
                        ? "✓ ارسال به Telegram"
                        : "○ Telegram"}
                    </span>
                  </div>

                  <div className="main-price">
                    <div>
                      <div className="price-label">
                        قیمت فعلی بازار
                      </div>

                      <div className="price gold">
                        {formatPrice(
                          signal.currentPrice ??
                            signal.price
                        )}
                      </div>
                    </div>

                    <div className="confidence">
                      <div className="confidence-top">
                        <span>
                          قدرت سیگنال
                        </span>

                        <b>
                          {formatNumber(
                            signal.strength,
                            0
                          )}
                          %
                        </b>
                      </div>

                      <div className="progress">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                signal.strength ||
                                  0
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="target-grid">
                    <TargetBox
                      label="ENTRY"
                      value={
                        signal.entry
                      }
                      tone="entry"
                    />

                    <TargetBox
                      label="SL"
                      value={
                        signal.stopLoss
                      }
                      tone="sl"
                      hit={
                        !!signal.stopLossHitAt
                      }
                    />

                    <TargetBox
                      label="TP1"
                      value={
                        signal.takeProfit1
                      }
                      tone="tp"
                      hit={
                        !!signal.tp1HitAt
                      }
                    />

                    <TargetBox
                      label="TP2"
                      value={
                        signal.takeProfit2
                      }
                      tone="tp"
                      hit={
                        !!signal.tp2HitAt
                      }
                    />

                    <TargetBox
                      label="TP3"
                      value={
                        signal.takeProfit3
                      }
                      tone="tp"
                      hit={
                        !!signal.tp3HitAt
                      }
                    />
                  </div>

                  <div className="secondary-grid">
                    <Metric
                      title="R:R"
                      value={
                        signal.riskReward
                          ? `1:${formatNumber(
                              signal.riskReward,
                              2
                            )}`
                          : "—"
                      }
                      tone="gold"
                    />

                    <Metric
                      title="CONFIDENCE"
                      value={`${formatNumber(
                        signal.confidence,
                        0
                      )}%`}
                      tone="gold"
                    />

                    <Metric
                      title="TREND"
                      value={trendLabel(
                        signal.trend
                      )}
                      tone={
                        signal.trend ===
                        "BULLISH"
                          ? "green"
                          : signal.trend ===
                            "BEARISH"
                          ? "red"
                          : ""
                      }
                    />

                    <Metric
                      title="TIMEFRAME"
                      value={timeframeLabel(
                        signal.interval
                      )}
                    />
                  </div>

                  <div className="secondary-grid">
                    <Metric
                      title="RSI"
                      value={formatNumber(
                        signal.rsi,
                        2
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

                  <div className="secondary-grid">
                    <Metric
                      title="MACD"
                      value={formatNumber(
                        signal.macd,
                        5
                      )}
                    />

                    <Metric
                      title="MACD SIGNAL"
                      value={formatNumber(
                        signal.macdSignal,
                        5
                      )}
                    />

                    <Metric
                      title="HISTOGRAM"
                      value={formatNumber(
                        signal.macdHistogram,
                        5
                      )}
                    />

                    <Metric
                      title="CURRENT"
                      value={formatPrice(
                        signal.currentPrice ??
                          signal.price
                      )}
                    />
                  </div>

                  <div className="levels-box">
                    <div className="levels-title">
                      حمایت و مقاومت بازار
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
                      دلایل تأیید سیگنال
                    </div>

                    {signal.reasons &&
                    signal.reasons.length >
                      0 ? (
                      signal.reasons
                        .slice(
                          0,
                          6
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
                              <span className="reason-check">
                                ✓
                              </span>

                              <span>
                                {reason}
                              </span>
                            </div>
                          )
                        )
                    ) : (
                      <div className="reason">
                        <span className="reason-check">
                          •
                        </span>

                        <span>
                          اطلاعات تحلیل
                          برای این سیگنال
                          در API ثبت نشده
                          است.
                        </span>
                      </div>
                    )}
                  </div>

                  {(signal.riskUsd !==
                    null &&
                    signal.riskUsd !==
                      undefined) ||
                  (signal.realizedProfitLoss !==
                    null &&
                    signal.realizedProfitLoss !==
                      undefined) ? (
                    <div className="levels-box">
                      <div className="levels-title">
                        مدیریت مالی سیگنال
                      </div>

                      <div className="secondary-grid">
                        <Metric
                          title="RISK USD"
                          value={
                            signal.riskUsd !==
                            null &&
                            signal.riskUsd !==
                              undefined
                              ? `$${formatNumber(
                                  signal.riskUsd,
                                  2
                                )}`
                              : "—"
                          }
                          tone="red"
                        />

                        <Metric
                          title="TP1 USD"
                          value={
                            signal.takeProfit1Usd !==
                              null &&
                            signal.takeProfit1Usd !==
                              undefined
                              ? `$${formatNumber(
                                  signal.takeProfit1Usd,
                                  2
                                )}`
                              : "—"
                          }
                          tone="green"
                        />

                        <Metric
                          title="TP2 USD"
                          value={
                            signal.takeProfit2Usd !==
                              null &&
                            signal.takeProfit2Usd !==
                              undefined
                              ? `$${formatNumber(
                                  signal.takeProfit2Usd,
                                  2
                                )}`
                              : "—"
                          }
                          tone="green"
                        />

                        <Metric
                          title="TP3 USD"
                          value={
                            signal.takeProfit3Usd !==
                              null &&
                            signal.takeProfit3Usd !==
                              undefined
                              ? `$${formatNumber(
                                  signal.takeProfit3Usd,
                                  2
                                )}`
                              : "—"
                          }
                          tone="green"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="footer">
                    <div className="footer-right">
                      <span>
                        ایجاد:{" "}
                        {formatDate(
                          signal.createdAt ||
                            signal.generatedAt
                        )}
                      </span>

                      <span>
                        کندل:{" "}
                        {formatDate(
                          signal.candleTime
                        )}
                      </span>

                      {signal.lastCheckedAt && (
                        <span>
                          بررسی:{" "}
                          {formatDate(
                            signal.lastCheckedAt
                          )}
                        </span>
                      )}
                    </div>

                    <span>
                      {signal.expiresAt
                        ? `انقضا: ${formatDate(
                            signal.expiresAt
                          )}`
                        : `بروزرسانی: ${formatDate(
                            signal.generatedAt
                          )}`}
                    </span>
                  </div>

                  {signal.realizedProfitLoss !==
                    null &&
                    signal.realizedProfitLoss !==
                      undefined && (
                      <div
                        className={
                          signal.realizedProfitLoss >=
                          0
                            ? "result-profit"
                            : "result-loss"
                        }
                        style={{
                          marginTop: 9,
                          fontSize: 9,
                          fontWeight: 800,
                        }}
                      >
                        نتیجه ثبت‌شده:{" "}
                        {signal.realizedProfitLoss >=
                        0
                          ? "+"
                          : ""}
                        $
                        {formatNumber(
                          signal.realizedProfitLoss,
                          2
                        )}
                      </div>
                    )}
                </article>
              )
            )}
          </section>
        )}

        <div className="source">
          منبع قیمت و بازار:
          Twelve Data ·
          نمایش فقط داده دریافت‌شده از
          موتور تحلیل ·
          بروزرسانی خودکار هر ۶۰ ثانیه
          <br />
          این صفحه قیمت، سیگنال یا نتیجه
          ساختگی تولید نمی‌کند. نتیجه
          معامله فقط زمانی نمایش داده
          می‌شود که Backend آن را ثبت
          کرده باشد.
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
