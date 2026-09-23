"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RawSignal = {
  id?: string;
  symbol?: string;
  name?: string;
  market?: string;
  marketType?: string;
  interval?: string;
  timeframe?: string;
  side?: string;
  direction?: string;

  price?: number | string | null;
  entry?: number | string | null;
  entryPrice?: number | string | null;
  stopLoss?: number | string | null;
  takeProfit?: number | string | null;
  takeProfit1?: number | string | null;
  takeProfit2?: number | string | null;
  takeProfit3?: number | string | null;

  riskReward?: number | string | null;
  confidence?: number | string | null;
  score?: number | string | null;
  strength?: string | null;
  trend?: string | null;

  rsi?: number | string | null;
  ema20?: number | string | null;
  ema50?: number | string | null;
  macd?: number | string | null;
  macdSignal?: number | string | null;
  macdHistogram?: number | string | null;
  atr?: number | string | null;

  support1?: number | string | null;
  support2?: number | string | null;
  resistance1?: number | string | null;
  resistance2?: number | string | null;

  currentPrice?: number | string | null;

  candleTime?: string | null;
  generatedAt?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  closedAt?: string | null;

  status?: string | null;
  result?: string | null;

  reasons?: unknown;
  confirmations?: unknown;

  telegramSent?: boolean;
  telegramMessageId?: string | null;
  telegramSentAt?: string | null;

  lastCheckedAt?: string | null;

  realizedProfitLoss?: number | string | null;
  riskUsd?: number | string | null;
  takeProfit1Usd?: number | string | null;
  takeProfit2Usd?: number | string | null;
  takeProfit3Usd?: number | string | null;

  metadata?: any;

  bot?: {
    name?: string | null;
  };
};

type Signal = {
  id: string;
  symbol: string;
  name: string;
  market: string;
  interval: string;
  side: "BUY" | "SELL";

  price: number | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  riskReward: number | null;
  confidence: number | null;
  strength: string;
  trend: string;

  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  atr: number | null;

  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;

  currentPrice: number | null;

  status: string;
  result: string | null;

  generatedAt: string | null;
  expiresAt: string | null;
  closedAt: string | null;
  lastCheckedAt: string | null;

  reasons: string[];
  confirmations: string[];

  telegramSent: boolean;

  realizedProfitLoss: number | null;
  riskUsd: number | null;
  takeProfit1Usd: number | null;
  takeProfit2Usd: number | null;
  takeProfit3Usd: number | null;

  botName: string;
};

type Performance = {
  daily?: {
    signals?: number;
    wins?: number;
    losses?: number;
    profitLoss?: number;
  };
  weekly?: {
    signals?: number;
    wins?: number;
    losses?: number;
    profitLoss?: number;
  };
  monthly?: {
    signals?: number;
    wins?: number;
    losses?: number;
    profitLoss?: number;
  };
};

type ApiResponse = {
  signals?: RawSignal[];
  performance?: Performance;
  error?: string;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function arrayText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;

          return (
            text(obj.message) ||
            text(obj.reason) ||
            text(obj.name) ||
            JSON.stringify(item)
          );
        }

        return String(item);
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = num(value);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function normalizeSignal(raw: RawSignal): Signal {
  const metadata = raw.metadata || {};

  const levels = metadata.levels || metadata.priceLevels || {};
  const risk = metadata.risk || {};
  const state = metadata.state || {};
  const indicators = metadata.indicators || {};
  const analysis = metadata.analysis || {};

  const entry = firstNumber(
    raw.entry,
    raw.entryPrice,
    levels.entry,
    risk.entry
  );

  const stopLoss = firstNumber(
    raw.stopLoss,
    levels.stopLoss,
    levels.sl,
    risk.stopLoss,
    risk.sl
  );

  const takeProfit1 = firstNumber(
    raw.takeProfit1,
    levels.takeProfit1,
    levels.tp1,
    risk.takeProfit1,
    risk.tp1
  );

  const takeProfit2 = firstNumber(
    raw.takeProfit2,
    levels.takeProfit2,
    levels.tp2,
    risk.takeProfit2,
    risk.tp2
  );

  const takeProfit3 = firstNumber(
    raw.takeProfit3,
    levels.takeProfit3,
    levels.tp3,
    raw.takeProfit,
    risk.takeProfit3,
    risk.tp3
  );

  let riskReward = firstNumber(
    raw.riskReward,
    metadata.riskReward,
    risk.riskReward
  );

  if (
    riskReward === null &&
    entry !== null &&
    stopLoss !== null &&
    takeProfit3 !== null
  ) {
    const riskDistance = Math.abs(entry - stopLoss);

    if (riskDistance > 0) {
      riskReward = Math.abs(takeProfit3 - entry) / riskDistance;
    }
  }

  const score = firstNumber(
    raw.score,
    raw.confidence,
    metadata.score,
    analysis.score
  );

  let sideText = text(raw.side || raw.direction || metadata.side).toUpperCase();

  if (sideText !== "BUY" && sideText !== "SELL") {
    sideText = "BUY";
  }

  const currentPrice = firstNumber(
    raw.currentPrice,
    state.currentPrice,
    metadata.currentPrice,
    raw.price
  );

  const price = firstNumber(
    raw.price,
    state.entryPrice,
    entry
  );

  const status = text(
    raw.status || state.status || metadata.status,
    "ACTIVE"
  ).toUpperCase();

  const reasons = arrayText(
    raw.reasons ||
      metadata.reasons ||
      analysis.reasons
  );

  const confirmations = arrayText(
    raw.confirmations ||
      metadata.confirmations ||
      analysis.confirmations
  );

  return {
    id: text(raw.id, crypto.randomUUID()),
    symbol: text(raw.symbol, "UNKNOWN"),
    name: text(raw.name || metadata.name, text(raw.symbol, "Unknown")),
    market: text(
      raw.market || raw.marketType || metadata.marketType,
      "MARKET"
    ),
    interval: text(
      raw.interval || raw.timeframe || metadata.interval,
      "15min"
    ),

    side: sideText as "BUY" | "SELL",

    price,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,

    riskReward,

    confidence: score,

    strength: text(
      raw.strength ||
        metadata.strength ||
        analysis.strength,
      score !== null && score >= 80
        ? "STRONG"
        : score !== null && score >= 65
          ? "GOOD"
          : "NORMAL"
    ),

    trend: text(
      raw.trend ||
        analysis.trend ||
        metadata.trend,
      sideText === "BUY" ? "BULLISH" : "BEARISH"
    ),

    rsi: firstNumber(
      raw.rsi,
      indicators.rsi,
      metadata.rsi
    ),

    ema20: firstNumber(
      raw.ema20,
      indicators.ema20,
      metadata.ema20
    ),

    ema50: firstNumber(
      raw.ema50,
      indicators.ema50,
      metadata.ema50
    ),

    macd: firstNumber(
      raw.macd,
      indicators.macd,
      metadata.macd
    ),

    macdSignal: firstNumber(
      raw.macdSignal,
      indicators.macdSignal,
      metadata.macdSignal
    ),

    macdHistogram: firstNumber(
      raw.macdHistogram,
      indicators.macdHistogram,
      metadata.macdHistogram
    ),

    atr: firstNumber(
      raw.atr,
      indicators.atr,
      metadata.atr
    ),

    support1: firstNumber(
      raw.support1,
      levels.support1,
      levels.support?.[0],
      metadata.support1
    ),

    support2: firstNumber(
      raw.support2,
      levels.support2,
      levels.support?.[1],
      metadata.support2
    ),

    resistance1: firstNumber(
      raw.resistance1,
      levels.resistance1,
      levels.resistance?.[0],
      metadata.resistance1
    ),

    resistance2: firstNumber(
      raw.resistance2,
      levels.resistance2,
      levels.resistance?.[1],
      metadata.resistance2
    ),

    currentPrice,

    status,

    result: raw.result
      ? text(raw.result)
      : state.result
        ? text(state.result)
        : null,

    generatedAt: text(
      raw.generatedAt || raw.createdAt || metadata.generatedAt,
      ""
    ) || null,

    expiresAt: text(
      raw.expiresAt || state.expiresAt,
      ""
    ) || null,

    closedAt: text(
      raw.closedAt || state.closedAt,
      ""
    ) || null,

    lastCheckedAt: text(
      raw.lastCheckedAt || state.lastCheckedAt,
      ""
    ) || null,

    reasons,
    confirmations,

    telegramSent:
      Boolean(raw.telegramSent) ||
      Boolean(metadata.telegramSent) ||
      Boolean(metadata.telegram?.sent),

    realizedProfitLoss: firstNumber(
      raw.realizedProfitLoss,
      state.realizedProfitLoss,
      metadata.realizedProfitLoss
    ),

    riskUsd: firstNumber(
      raw.riskUsd,
      risk.riskUsd,
      risk.maxLossUsd
    ),

    takeProfit1Usd: firstNumber(
      raw.takeProfit1Usd,
      risk.takeProfit1Usd,
      risk.tp1Usd
    ),

    takeProfit2Usd: firstNumber(
      raw.takeProfit2Usd,
      risk.takeProfit2Usd,
      risk.tp2Usd
    ),

    takeProfit3Usd: firstNumber(
      raw.takeProfit3Usd,
      risk.takeProfit3Usd,
      risk.tp3Usd
    ),

    botName: text(
      raw.bot?.name ||
        metadata.botName,
      "AI Signal Engine"
    ),
  };
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "—";
  }

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (Math.abs(value) >= 100) {
    return value.toFixed(2);
  }

  if (Math.abs(value) >= 10) {
    return value.toFixed(3);
  }

  return value.toFixed(5);
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatUsd(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}$${value.toFixed(2)}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    WAITING: "در انتظار",
    ACTIVE: "فعال",
    TP1_HIT: "TP1 خورد",
    TP2_HIT: "TP2 خورد",
    TP3_HIT: "TP3 کامل",
    STOP_LOSS: "استاپ خورد",
    CLOSED: "بسته شد",
    EXPIRED: "منقضی شد",
  };

  return map[status] || status;
}

function statusClass(status: string): string {
  if (status === "STOP_LOSS") {
    return "danger";
  }

  if (
    status === "TP1_HIT" ||
    status === "TP2_HIT" ||
    status === "TP3_HIT"
  ) {
    return "success";
  }

  if (status === "CLOSED" || status === "EXPIRED") {
    return "muted";
  }

  return "active";
}

function scoreClass(score: number | null): string {
  if (score === null) {
    return "normal";
  }

  if (score >= 80) {
    return "strong";
  }

  if (score >= 65) {
    return "good";
  }

  return "normal";
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);

  const [interval, setIntervalValue] = useState("15min");
  const [sideFilter, setSideFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSignals = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/signals?interval=${encodeURIComponent(interval)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت سیگنال‌ها");
      }

      const normalized = Array.isArray(data.signals)
        ? data.signals.map(normalizeSignal)
        : [];

      setSignals(normalized);
      setPerformance(data.performance || null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "خطا در اتصال به موتور سیگنال";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [interval]);

  useEffect(() => {
    loadSignals();

    const timer = window.setInterval(() => {
      loadSignals();
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadSignals]);

  const filteredSignals = useMemo(() => {
    if (sideFilter === "ALL") {
      return signals;
    }

    return signals.filter((signal) => signal.side === sideFilter);
  }, [signals, sideFilter]);

  const stats = useMemo(() => {
    const active = signals.filter(
      (signal) =>
        signal.status === "ACTIVE" ||
        signal.status === "WAITING" ||
        signal.status === "TP1_HIT" ||
        signal.status === "TP2_HIT"
    ).length;

    const buy = signals.filter(
      (signal) => signal.side === "BUY"
    ).length;

    const sell = signals.filter(
      (signal) => signal.side === "SELL"
    ).length;

    const telegram = signals.filter(
      (signal) => signal.telegramSent
    ).length;

    return {
      total: signals.length,
      active,
      buy,
      sell,
      telegram,
    };
  }, [signals]);

  return (
    <main className="page">
      <div className="glow glowOne" />
      <div className="glow glowTwo" />

      <div className="container">
        <header className="header">
          <div>
            <div className="eyebrow">
              <span className="pulse" />
              REAL MARKET ENGINE
            </div>

            <h1>
              <span>AI</span> Trading Signals
            </h1>

            <p>
              سیگنال‌های تولیدشده توسط موتور تحلیل بازار و داده‌های واقعی
            </p>
          </div>

          <button
            className="refresh"
            onClick={() => loadSignals(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? "spin" : ""}>↻</span>
            {refreshing ? "در حال بروزرسانی" : "بروزرسانی"}
          </button>
        </header>

        <section className="engineBar">
          <div className="engineStatus">
            <span className="statusDot" />
            <div>
              <strong>Signal Engine Active</strong>
              <small>
                داده‌ها از API و موتور تحلیل سرور دریافت می‌شوند
              </small>
            </div>
          </div>

          <div className="engineInfo">
            <span>تایم‌فریم</span>

            <select
              value={interval}
              onChange={(event) => {
                setIntervalValue(event.target.value);
              }}
            >
              <option value="1min">1 دقیقه</option>
              <option value="5min">5 دقیقه</option>
              <option value="15min">15 دقیقه</option>
              <option value="30min">30 دقیقه</option>
              <option value="1h">1 ساعت</option>
              <option value="4h">4 ساعت</option>
            </select>
          </div>
        </section>

        <section className="statsGrid">
          <div className="statCard">
            <span>کل سیگنال‌ها</span>
            <strong>{stats.total}</strong>
            <small>دریافت‌شده از API</small>
          </div>

          <div className="statCard">
            <span>سیگنال فعال</span>
            <strong>{stats.active}</strong>
            <small>در حال پیگیری</small>
          </div>

          <div className="statCard">
            <span>BUY</span>
            <strong>{stats.buy}</strong>
            <small>فرصت‌های خرید</small>
          </div>

          <div className="statCard">
            <span>SELL</span>
            <strong>{stats.sell}</strong>
            <small>فرصت‌های فروش</small>
          </div>

          <div className="statCard">
            <span>Telegram</span>
            <strong>{stats.telegram}</strong>
            <small>ارسال‌شده</small>
          </div>
        </section>

        <section className="toolbar">
          <div>
            <button
              className={sideFilter === "ALL" ? "filter active" : "filter"}
              onClick={() => setSideFilter("ALL")}
            >
              همه
            </button>

            <button
              className={sideFilter === "BUY" ? "filter buy active" : "filter buy"}
              onClick={() => setSideFilter("BUY")}
            >
              BUY
            </button>

            <button
              className={sideFilter === "SELL" ? "filter sell active" : "filter sell"}
              onClick={() => setSideFilter("SELL")}
            >
              SELL
            </button>
          </div>

          <div className="updateInfo">
            بروزرسانی خودکار: هر ۶۰ ثانیه
          </div>
        </section>

        {error ? (
          <div className="errorBox">
            <strong>خطا در دریافت اطلاعات</strong>
            <span>{error}</span>
            <button onClick={() => loadSignals(true)}>
              تلاش مجدد
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="loadingBox">
            <div className="loader" />
            <strong>در حال دریافت داده‌های بازار...</strong>
            <span>لطفاً چند لحظه صبر کنید</span>
          </div>
        ) : null}

        {!loading && !error && filteredSignals.length === 0 ? (
          <div className="emptyBox">
            <div className="emptyIcon">⌁</div>
            <h2>در حال حاضر سیگنال معتبری وجود ندارد</h2>
            <p>
              هیچ سیگنال واقعی از موتور تحلیل برای این فیلتر دریافت نشده است.
            </p>
            <button onClick={() => loadSignals(true)}>
              بررسی مجدد بازار
            </button>
          </div>
        ) : null}

        <section className="signalsGrid">
          {filteredSignals.map((signal) => (
            <article
              className={
                signal.side === "BUY"
                  ? "signalCard buyCard"
                  : "signalCard sellCard"
              }
              key={signal.id}
            >
              <div className="signalTop">
                <div>
                  <div className="symbolLine">
                    <strong>{signal.symbol}</strong>
                    <span>{signal.market}</span>
                  </div>

                  <div className="botName">
                    {signal.botName}
                  </div>
                </div>

                <div
                  className={
                    signal.side === "BUY"
                      ? "direction buy"
                      : "direction sell"
                  }
                >
                  <strong>{signal.side}</strong>
                  <span>
                    {signal.side === "BUY" ? "LONG" : "SHORT"}
                  </span>
                </div>
              </div>

              <div className="signalMeta">
                <span>TF: {signal.interval}</span>
                <span>{signal.trend}</span>

                <span className={`status ${statusClass(signal.status)}`}>
                  {statusLabel(signal.status)}
                </span>
              </div>

              <div className="scoreBox">
                <div>
                  <span>AI SCORE</span>
                  <strong>
                    {signal.confidence !== null
                      ? `${formatNumber(signal.confidence)}/100`
                      : "—"}
                  </strong>
                </div>

                <div
                  className={`scoreRing ${scoreClass(
                    signal.confidence
                  )}`}
                >
                  {signal.confidence !== null
                    ? Math.round(signal.confidence)
                    : "—"}
                </div>
              </div>

              <div className="priceGrid">
                <Metric
                  label="Entry"
                  value={formatPrice(signal.entry)}
                />

                <Metric
                  label="Current"
                  value={formatPrice(signal.currentPrice)}
                />

                <Metric
                  label="SL"
                  value={formatPrice(signal.stopLoss)}
                />

                <Metric
                  label="RR"
                  value={
                    signal.riskReward !== null
                      ? `${signal.riskReward.toFixed(2)}R`
                      : "—"
                  }
                />
              </div>

              <div className="levels">
                <div className="level sl">
                  <span>STOP LOSS</span>
                  <strong>{formatPrice(signal.stopLoss)}</strong>
                  <small>
                    {signal.riskUsd !== null
                      ? `-$${Math.abs(signal.riskUsd).toFixed(2)}`
                      : "ریسک"}
                  </small>
                </div>

                <div className="level tp">
                  <span>TAKE PROFIT 1</span>
                  <strong>{formatPrice(signal.takeProfit1)}</strong>
                  <small>
                    {signal.takeProfit1Usd !== null
                      ? `+$${signal.takeProfit1Usd.toFixed(2)}`
                      : "هدف اول"}
                  </small>
                </div>

                <div className="level tp">
                  <span>TAKE PROFIT 2</span>
                  <strong>{formatPrice(signal.takeProfit2)}</strong>
                  <small>
                    {signal.takeProfit2Usd !== null
                      ? `+$${signal.takeProfit2Usd.toFixed(2)}`
                      : "هدف دوم"}
                  </small>
                </div>

                <div className="level tp gold">
                  <span>TAKE PROFIT 3</span>
                  <strong>{formatPrice(signal.takeProfit3)}</strong>
                  <small>
                    {signal.takeProfit3Usd !== null
                      ? `+$${signal.takeProfit3Usd.toFixed(2)}`
                      : "هدف نهایی"}
                  </small>
                </div>
              </div>

              <div className="indicators">
                <div>
                  <span>RSI</span>
                  <strong>{formatNumber(signal.rsi)}</strong>
                </div>

                <div>
                  <span>EMA20</span>
                  <strong>{formatPrice(signal.ema20)}</strong>
                </div>

                <div>
                  <span>EMA50</span>
                  <strong>{formatPrice(signal.ema50)}</strong>
                </div>

                <div>
                  <span>MACD</span>
                  <strong>{formatNumber(signal.macd)}</strong>
                </div>

                <div>
                  <span>ATR</span>
                  <strong>{formatNumber(signal.atr)}</strong>
                </div>
              </div>

              <div className="srGrid">
                <div>
                  <span>Support 1</span>
                  <strong>{formatPrice(signal.support1)}</strong>
                </div>

                <div>
                  <span>Support 2</span>
                  <strong>{formatPrice(signal.support2)}</strong>
                </div>

                <div>
                  <span>Resistance 1</span>
                  <strong>{formatPrice(signal.resistance1)}</strong>
                </div>

                <div>
                  <span>Resistance 2</span>
                  <strong>{formatPrice(signal.resistance2)}</strong>
                </div>
              </div>

              {signal.reasons.length > 0 ? (
                <div className="reasons">
                  <div className="sectionTitle">
                    <span>تحلیل موتور</span>
                    <small>
                      {signal.reasons.length} مورد
                    </small>
                  </div>

                  <div className="reasonList">
                    {signal.reasons.slice(0, 8).map((reason, index) => (
                      <div key={`${signal.id}-reason-${index}`}>
                        <span>✓</span>
                        <p>{reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {signal.confirmations.length > 0 ? (
                <div className="confirmations">
                  <span>تأییدیه‌ها</span>

                  <div>
                    {signal.confirmations.slice(0, 6).map(
                      (confirmation, index) => (
                        <em key={`${signal.id}-confirmation-${index}`}>
                          {confirmation}
                        </em>
                      )
                    )}
                  </div>
                </div>
              ) : null}

              <div className="signalFooter">
                <div>
                  <span>ایجاد</span>
                  <strong>
                    {formatDate(signal.generatedAt)}
                  </strong>
                </div>

                <div>
                  <span>Telegram</span>
                  <strong
                    className={
                      signal.telegramSent
                        ? "telegram yes"
                        : "telegram no"
                    }
                  >
                    {signal.telegramSent
                      ? "✓ ارسال شد"
                      : "— ارسال نشده"}
                  </strong>
                </div>

                <div>
                  <span>نتیجه</span>
                  <strong
                    className={
                      signal.realizedProfitLoss !== null
                        ? signal.realizedProfitLoss >= 0
                          ? "profit"
                          : "loss"
                        : ""
                    }
                  >
                    {signal.realizedProfitLoss !== null
                      ? formatUsd(signal.realizedProfitLoss)
                      : signal.result || "در حال پیگیری"}
                  </strong>
                </div>
              </div>
            </article>
          ))}
        </section>

        {performance ? (
          <section className="performance">
            <div className="performanceHeader">
              <div>
                <span className="eyebrow">PERFORMANCE</span>
                <h2>عملکرد ثبت‌شده سیگنال‌ها</h2>
              </div>
            </div>

            <div className="performanceGrid">
              <PerformanceCard
                title="امروز"
                data={performance.daily}
              />

              <PerformanceCard
                title="هفته"
                data={performance.weekly}
              />

              <PerformanceCard
                title="ماه"
                data={performance.monthly}
              />
            </div>
          </section>
        ) : null}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(212, 175, 55, 0.08),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(0, 220, 180, 0.05),
              transparent 30%
            ),
            #050607;
          color: #f4f1e8;
          padding: 32px 20px 70px;
          position: relative;
          overflow: hidden;
        }

        .container {
          width: min(1450px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .glow {
          position: fixed;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
          opacity: 0.12;
        }

        .glowOne {
          background: #d4af37;
          top: 10%;
          left: -180px;
        }

        .glowTwo {
          background: #00c7a2;
          bottom: 5%;
          right: -180px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 25px;
        }

        .eyebrow {
          color: #d7b54a;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pulse,
        .statusDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #31e7b0;
          box-shadow: 0 0 15px rgba(49, 231, 176, 0.8);
        }

        h1 {
          font-size: clamp(30px, 5vw, 54px);
          margin: 8px 0;
          letter-spacing: -2px;
        }

        h1 span {
          color: #d4af37;
        }

        .header p {
          color: #8e9298;
          margin: 0;
          font-size: 14px;
        }

        .refresh {
          border: 1px solid rgba(212, 175, 55, 0.35);
          background: rgba(212, 175, 55, 0.08);
          color: #e8c95c;
          padding: 13px 18px;
          border-radius: 13px;
          cursor: pointer;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .refresh:hover {
          background: rgba(212, 175, 55, 0.15);
        }

        .refresh:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .refresh span {
          font-size: 20px;
        }

        .spin {
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

        .engineBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 17px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(16, 18, 20, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 18px;
          margin-bottom: 18px;
        }

        .engineStatus {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .engineStatus strong {
          display: block;
          font-size: 13px;
        }

        .engineStatus small {
          display: block;
          color: #777c83;
          margin-top: 4px;
        }

        .engineInfo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #888;
          font-size: 12px;
        }

        select {
          background: #0c0e10;
          color: #e8e2d5;
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 10px;
          padding: 9px 12px;
          outline: none;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .statCard {
          padding: 18px;
          border-radius: 16px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.055),
            rgba(255, 255, 255, 0.018)
          );
          border: 1px solid rgba(255, 255, 255, 0.065);
          backdrop-filter: blur(15px);
        }

        .statCard span,
        .statCard small {
          color: #777c82;
          display: block;
        }

        .statCard strong {
          display: block;
          color: #e4c65c;
          font-size: 28px;
          margin: 7px 0;
        }

        .statCard small {
          font-size: 11px;
        }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 22px 0;
        }

        .filter {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: #8d9298;
          padding: 9px 18px;
          border-radius: 10px;
          margin-left: 7px;
          cursor: pointer;
        }

        .filter.active {
          color: #f2d56a;
          border-color: rgba(212, 175, 55, 0.45);
          background: rgba(212, 175, 55, 0.1);
        }

        .filter.buy.active {
          color: #31e7b0;
          border-color: rgba(49, 231, 176, 0.35);
          background: rgba(49, 231, 176, 0.08);
        }

        .filter.sell.active {
          color: #ff6875;
          border-color: rgba(255, 104, 117, 0.35);
          background: rgba(255, 104, 117, 0.08);
        }

        .updateInfo {
          color: #686d73;
          font-size: 11px;
        }

        .errorBox,
        .emptyBox,
        .loadingBox {
          padding: 45px 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(15, 17, 19, 0.85);
          border-radius: 20px;
          text-align: center;
          margin-bottom: 22px;
        }

        .errorBox {
          border-color: rgba(255, 90, 105, 0.25);
        }

        .errorBox strong,
        .errorBox span {
          display: block;
        }

        .errorBox strong {
          color: #ff6977;
          margin-bottom: 8px;
        }

        .errorBox span {
          color: #9a9da2;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .errorBox button,
        .emptyBox button {
          border: 1px solid rgba(212, 175, 55, 0.35);
          background: rgba(212, 175, 55, 0.1);
          color: #e6c85e;
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
        }

        .loadingBox strong,
        .loadingBox span {
          display: block;
        }

        .loadingBox strong {
          margin-top: 16px;
        }

        .loadingBox span {
          color: #777;
          font-size: 12px;
          margin-top: 5px;
        }

        .loader {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          border: 3px solid rgba(212, 175, 55, 0.18);
          border-top-color: #d4af37;
          margin: auto;
          animation: spin 0.8s linear infinite;
        }

        .emptyIcon {
          font-size: 42px;
          color: #d4af37;
        }

        .emptyBox h2 {
          margin: 8px 0;
          font-size: 20px;
        }

        .emptyBox p {
          color: #777;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .signalsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .signalCard {
          background:
            linear-gradient(
              145deg,
              rgba(19, 21, 23, 0.96),
              rgba(8, 9, 10, 0.96)
            );
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 22px;
          padding: 20px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.25);
        }

        .buyCard {
          border-top: 2px solid rgba(49, 231, 176, 0.55);
        }

        .sellCard {
          border-top: 2px solid rgba(255, 104, 117, 0.55);
        }

        .signalTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .symbolLine {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .symbolLine strong {
          font-size: 24px;
        }

        .symbolLine span {
          color: #8b9095;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 7px;
          padding: 4px 7px;
          font-size: 10px;
        }

        .botName {
          color: #6f7479;
          font-size: 11px;
          margin-top: 5px;
        }

        .direction {
          min-width: 70px;
          text-align: center;
          border-radius: 12px;
          padding: 9px;
        }

        .direction strong,
        .direction span {
          display: block;
        }

        .direction strong {
          font-size: 15px;
        }

        .direction span {
          font-size: 9px;
          margin-top: 2px;
        }

        .direction.buy {
          color: #31e7b0;
          background: rgba(49, 231, 176, 0.08);
        }

        .direction.sell {
          color: #ff6977;
          background: rgba(255, 105, 119, 0.08);
        }

        .signalMeta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 15px 0;
        }

        .signalMeta > span {
          color: #777d83;
          font-size: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 5px 8px;
          border-radius: 7px;
        }

        .signalMeta .status {
          margin-right: auto;
        }

        .status.active {
          color: #d9bc55;
          border-color: rgba(212, 175, 55, 0.25);
        }

        .status.success {
          color: #31e7b0;
          border-color: rgba(49, 231, 176, 0.25);
        }

        .status.danger {
          color: #ff6977;
          border-color: rgba(255, 105, 119, 0.25);
        }

        .status.muted {
          color: #888;
        }

        .scoreBox {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.055);
          margin-bottom: 12px;
        }

        .scoreBox span,
        .scoreBox strong {
          display: block;
        }

        .scoreBox span {
          color: #6f7479;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .scoreBox strong {
          font-size: 22px;
          margin-top: 3px;
          color: #d4af37;
        }

        .scoreRing {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          font-weight: 800;
          font-size: 13px;
          border: 1px solid currentColor;
        }

        .scoreRing.strong {
          color: #31e7b0;
        }

        .scoreRing.good {
          color: #e4c65c;
        }

        .scoreRing.normal {
          color: #9b9da1;
        }

        .priceGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin-bottom: 10px;
        }

        .metric {
          background: rgba(255, 255, 255, 0.025);
          border-radius: 10px;
          padding: 10px;
          min-width: 0;
        }

        .metric span,
        .metric strong,
        .metric small {
          display: block;
        }

        .metric span {
          color: #666c72;
          font-size: 9px;
        }

        .metric strong {
          font-size: 12px;
          margin-top: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric small {
          color: #555;
          font-size: 8px;
          margin-top: 2px;
        }

        .levels {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin: 10px 0;
        }

        .level {
          padding: 11px;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(255, 255, 255, 0.02);
        }

        .level span,
        .level strong,
        .level small {
          display: block;
        }

        .level span {
          font-size: 8px;
          color: #777;
        }

        .level strong {
          font-size: 12px;
          margin-top: 5px;
        }

        .level small {
          color: #666;
          font-size: 9px;
          margin-top: 3px;
        }

        .level.sl {
          border-color: rgba(255, 90, 105, 0.18);
        }

        .level.sl strong {
          color: #ff6977;
        }

        .level.tp {
          border-color: rgba(49, 231, 176, 0.13);
        }

        .level.tp strong {
          color: #31e7b0;
        }

        .level.gold {
          border-color: rgba(212, 175, 55, 0.2);
        }

        .level.gold strong {
          color: #e4c65c;
        }

        .indicators {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          margin-top: 12px;
        }

        .indicators > div {
          text-align: center;
          padding: 8px 4px;
          background: rgba(255, 255, 255, 0.018);
          border-radius: 8px;
        }

        .indicators span,
        .indicators strong {
          display: block;
        }

        .indicators span {
          color: #666b70;
          font-size: 8px;
        }

        .indicators strong {
          font-size: 10px;
          margin-top: 4px;
        }

        .srGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 8px;
        }

        .srGrid div {
          padding: 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.018);
        }

        .srGrid span,
        .srGrid strong {
          display: block;
        }

        .srGrid span {
          color: #666;
          font-size: 8px;
        }

        .srGrid strong {
          margin-top: 3px;
          font-size: 10px;
        }

        .reasons {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sectionTitle {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .sectionTitle span {
          color: #d8bc5a;
          font-size: 11px;
          font-weight: 700;
        }

        .sectionTitle small {
          color: #666;
          font-size: 9px;
        }

        .reasonList {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }

        .reasonList div {
          display: flex;
          gap: 7px;
          align-items: flex-start;
        }

        .reasonList span {
          color: #31e7b0;
          font-size: 11px;
        }

        .reasonList p {
          color: #969a9f;
          font-size: 10px;
          margin: 0;
          line-height: 1.6;
        }

        .confirmations {
          margin-top: 12px;
        }

        .confirmations > span {
          color: #777;
          font-size: 9px;
        }

        .confirmations > div {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 6px;
        }

        .confirmations em {
          font-style: normal;
          font-size: 9px;
          color: #a9a9a9;
          background: rgba(255, 255, 255, 0.035);
          border-radius: 6px;
          padding: 4px 7px;
        }

        .signalFooter {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 16px;
          padding-top: 13px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .signalFooter span,
        .signalFooter strong {
          display: block;
        }

        .signalFooter span {
          color: #60656b;
          font-size: 8px;
        }

        .signalFooter strong {
          font-size: 10px;
          margin-top: 4px;
        }

        .telegram.yes,
        .profit {
          color: #31e7b0;
        }

        .telegram.no {
          color: #777;
        }

        .loss {
          color: #ff6977;
        }

        .performance {
          margin-top: 30px;
        }

        .performanceHeader {
          margin-bottom: 15px;
        }

        .performanceHeader h2 {
          margin: 6px 0 0;
          font-size: 21px;
        }

        .performanceGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .performanceCard {
          padding: 18px;
          border-radius: 17px;
          background: rgba(15, 17, 19, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .performanceCard h3 {
          margin: 0 0 14px;
          color: #d7b54a;
        }

        .performanceStats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .performanceStats div {
          padding: 9px;
          background: rgba(255, 255, 255, 0.025);
          border-radius: 8px;
        }

        .performanceStats span,
        .performanceStats strong {
          display: block;
        }

        .performanceStats span {
          color: #666;
          font-size: 8px;
        }

        .performanceStats strong {
          margin-top: 4px;
          font-size: 13px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .statsGrid {
            grid-template-columns: repeat(3, 1fr);
          }

          .signalsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 750px) {
          .page {
            padding: 20px 12px 50px;
          }

          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .engineBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .toolbar {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .priceGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .levels {
            grid-template-columns: repeat(2, 1fr);
          }

          .indicators {
            grid-template-columns: repeat(3, 1fr);
          }

          .srGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .performanceGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .statsGrid {
            grid-template-columns: 1fr 1fr;
          }

          .statCard strong {
            font-size: 22px;
          }

          .symbolLine strong {
            font-size: 20px;
          }

          .reasonList {
            grid-template-columns: 1fr;
          }

          .signalFooter {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </main>
  );
}

function PerformanceCard({
  title,
  data,
}: {
  title: string;
  data?: {
    signals?: number;
    wins?: number;
    losses?: number;
    profitLoss?: number;
  };
}) {
  const signals = data?.signals ?? 0;
  const wins = data?.wins ?? 0;
  const losses = data?.losses ?? 0;
  const profitLoss = data?.profitLoss ?? 0;

  return (
    <div className="performanceCard">
      <h3>{title}</h3>

      <div className="performanceStats">
        <div>
          <span>سیگنال</span>
          <strong>{signals}</strong>
        </div>

        <div>
          <span>برد</span>
          <strong>{wins}</strong>
        </div>

        <div>
          <span>باخت</span>
          <strong>{losses}</strong>
        </div>

        <div>
          <span>P/L</span>
          <strong
            className={
              profitLoss >= 0 ? "profit" : "loss"
            }
          >
            {formatUsd(profitLoss)}
          </strong>
        </div>
      </div>
    </div>
  );
}
