"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const tomanFmt = new Intl.NumberFormat("fa-IR");
const usdFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function money(v: number) {
  return `$${usdFmt.format(v)}`;
}

function toman(v: number) {
  return `${tomanFmt.format(Math.round(v))} تومان`;
}

function price(v: number) {
  return Number(v || 0).toFixed(2);
}

function dateFa(v?: string | Date | null) {
  if (!v) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}

type Candle = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type ChartPayload = {
  updatedAt?: string;
  timeframe?: string;
  candles?: Candle[];
  timeframes?: Record<string, Candle[]>;
};

type Meta = {
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;

  totalLot: number;
  tp1Lot: number;
  tp2Lot: number;
  tp3Lot: number;

  riskUsd: number;
  tp1Usd: number;
  tp2Usd: number;
  tp3Usd: number;
  totalPotentialUsd: number;

  usdToToman: number;
  riskToman: number;
  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  totalPotentialToman: number;

  session: string;
  score: number;
  confirmations: number;
  timeframe: string;
  state: string;
  breakeven: boolean;
  currentPrice: number;

  events: {
    type: string;
    at: string;
    price: number;
    lotClosed: number;
    pnlUsd: number;
    pnlToman: number;
    usdToToman: number;
  }[];

  analysis?: {
    reasons?: string[];
    support?: number;
    resistance?: number;
    atr?: number;
  };
};

type Perf = {
  trades: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;

  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  slToman: number;

  pnlUsd: number;
  pnlToman: number;
};

type Dashboard = {
  symbol: string;
  contractSize: number;

  position: {
    totalLot: number;
    tp1Lot: number;
    tp2Lot: number;
    tp3Lot: number;
    stopUsd: number;
    tp1Usd: number;
    tp2Usd: number;
    tp3Usd: number;
  };

  active: {
    id: string;
    status: string;
    metadata: Meta;
  } | null;

  latest: {
    id: string;
    status: string;
    metadata: Meta;
  } | null;

  performance: {
    day: Perf;
    week: Perf;
    month: Perf;
    recent: {
      id: string;
      createdAt: string;
      status: string;
      metadata: Meta;
    }[];
  };

  usdToToman: {
    rate: number;
    asOf: string;
  } | null;

  /*
   * مرحله بعد route.ts این بخش را پر می‌کند.
   * نمودار هیچ داده ساختگی تولید نمی‌کند.
   */
  chart?: ChartPayload;
};

const emptyPerf: Perf = {
  trades: 0,
  tp1: 0,
  tp2: 0,
  tp3: 0,
  sl: 0,
  tp1Toman: 0,
  tp2Toman: 0,
  tp3Toman: 0,
  slToman: 0,
  pnlUsd: 0,
  pnlToman: 0,
};

const defaultTimeframes = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
];

export default function AIAnalysisPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  /*
   * 1 دقیقه به صورت پیش‌فرض
   */
  const [selectedTimeframe, setSelectedTimeframe] = useState("1m");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/ai-analysis", {
        cache: "no-store",
      });

      const j = await r.json();

      if (!r.ok || !j.ok) {
        throw new Error(j.error || "خطا در دریافت اطلاعات");
      }

      setData(j.data);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "خطای ارتباط با سرور"
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();

    /*
     * داشبورد هر 20 ثانیه اطلاعات ذخیره‌شده سرور را می‌خواند.
     * این قسمت API جدیدی برای هر تیک قیمت ایجاد نمی‌کند.
     */
    const id = window.setInterval(load, 20000);

    return () => window.clearInterval(id);
  }, [load]);

  const meta =
    data?.active?.metadata ||
    data?.latest?.metadata ||
    null;

  const perf =
    data?.performance?.[period] ||
    emptyPerf;

  const availableTimeframes = useMemo(() => {
    const serverFrames = Object.keys(
      data?.chart?.timeframes || {}
    );

    if (serverFrames.length) {
      return serverFrames;
    }

    return defaultTimeframes;
  }, [data?.chart?.timeframes]);

  useEffect(() => {
    if (
      availableTimeframes.length &&
      !availableTimeframes.includes(selectedTimeframe)
    ) {
      setSelectedTimeframe(
        availableTimeframes.includes("1m")
          ? "1m"
          : availableTimeframes[0]
      );
    }
  }, [availableTimeframes, selectedTimeframe]);

  const candles = useMemo(() => {
    if (!data?.chart) {
      return [];
    }

    if (data.chart.timeframes?.[selectedTimeframe]) {
      return data.chart.timeframes[selectedTimeframe];
    }

    if (
      selectedTimeframe ===
      (data.chart.timeframe || "1m")
    ) {
      return data.chart.candles || [];
    }

    return [];
  }, [
    data?.chart,
    selectedTimeframe,
  ]);

  const chart = useMemo(() => {
    const max = Math.max(
      1,
      Math.abs(perf.pnlUsd),
      perf.tp1 * 20,
      perf.tp2 * 24,
      perf.tp3 * 36,
      perf.sl * 40
    );

    return {
      win: Math.max(0, perf.pnlUsd),
      loss: Math.max(0, -perf.pnlUsd),
      max,
    };
  }, [perf]);

  return (
    <main
      dir="rtl"
      className="ai-page"
    >
      <style>{css}</style>

      <div className="shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              AI MARKET ENGINE
            </div>

            <h1>
              تحلیل هوش مصنوعی طلا
            </h1>

            <p>
              فقط XAUUSD · چندتایم‌فریم ·
              مدیریت TP/SL · کارنامه واقعی ثبت‌شده
            </p>
          </div>

          <div className="top-actions">
            <span className="live">
              <i />
              سیستم پایش
            </span>

            <button
              onClick={load}
              disabled={busy}
            >
              {busy
                ? "در حال دریافت…"
                : "↻ بروزرسانی"}
            </button>
          </div>
        </header>

        <section className="notice">
          <b>
            🤖 این تحلیل هوش مصنوعی است
          </b>

          <span>
            این بخش تحلیل و پایش بازار است و
            سود یا اجرای واقعی بروکر را تضمین
            نمی‌کند. P/L مدل بر اساس قیمت
            XAU/USD و حجم مشخص‌شده ثبت می‌شود.
          </span>
        </section>

        {error && (
          <div className="error">
            ⚠️ {error}
          </div>
        )}

        {/* =========================
            XAUUSD LIVE CHART
        ========================== */}

        <section className="card market-chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-symbol">
                <span className="gold-dot" />
                XAUUSD
              </div>

              <h2>
                نمودار زنده بازار طلا
              </h2>

              <p>
                داده بازار XAU/USD · کندل‌های چندتایم‌فریم
              </p>
            </div>

            <div className="chart-status">
              <span className="chart-live-dot" />
              <span>
                {data?.chart?.updatedAt
                  ? `آخرین بروزرسانی: ${dateFa(
                      data.chart.updatedAt
                    )}`
                  : "در انتظار داده بازار"}
              </span>
            </div>
          </div>

          <div className="timeframe-bar">
            <div className="timeframe-label">
              تایم‌فریم بازار
            </div>

            <div className="timeframe-buttons">
              {availableTimeframes.map(
                (tf) => (
                  <button
                    key={tf}
                    type="button"
                    className={
                      selectedTimeframe === tf
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedTimeframe(tf)
                    }
                  >
                    {tf}
                  </button>
                )
              )}
            </div>

            <div className="default-timeframe">
              <span />
              پیش‌فرض: 1m
            </div>
          </div>

          <GoldChart
            candles={candles}
            meta={meta}
            timeframe={selectedTimeframe}
          />
        </section>

        {/* =========================
            SUMMARY
        ========================== */}

        <section className="hero-grid">
          <div className="card hero-card">
            <div className="card-head">
              <span>
                🟡 XAUUSD
              </span>

              <span
                className={
                  meta?.direction === "BUY"
                    ? "buy"
                    : meta?.direction === "SELL"
                    ? "sell"
                    : "neutral"
                }
              >
                {meta
                  ? meta.direction === "BUY"
                    ? "🟢 BUY"
                    : "🔴 SELL"
                  : "NO TRADE"}
              </span>
            </div>

            <div className="market-current-price">
              {meta
                ? price(meta.currentPrice)
                : "—"}
            </div>

            <div className="price-sub">
              آخرین قیمت ثبت‌شده توسط موتور بازار
            </div>

            <div className="meta-row">
              <span>
                سشن:
                <b>
                  {meta?.session || "—"}
                </b>
              </span>

              <span>
                تایم‌فریم:
                <b>
                  {meta?.timeframe || "—"}
                </b>
              </span>

              <span>
                امتیاز:
                <b>
                  {meta?.score ?? "—"}/100
                </b>
              </span>

              <span>
                تأییدها:
                <b>
                  {meta?.confirmations ?? "—"}
                </b>
              </span>
            </div>
          </div>

          <div className="card fx-card">
            <div className="label">
              نرخ واقعی دلار به تومان
            </div>

            <div className="fx-number">
              {data?.usdToToman
                ? toman(
                    data.usdToToman.rate
                  )
                : "—"}
            </div>

            <div className="muted">
              منبع نرخ در سرور · زمان:
              {" "}
              {data?.usdToToman?.asOf
                ? dateFa(
                    data.usdToToman.asOf
                  )
                : "—"}
            </div>

            <div className="fx-rule">
              بدون نرخ آزمایشی؛ اگر سرویس نرخ
              در دسترس نباشد، محاسبه تومان برای
              سیگنال جدید متوقف می‌شود.
            </div>
          </div>
        </section>

        {/* =========================
            LEVELS
        ========================== */}

        <section className="levels-grid">
          <Level
            title="ورود"
            value={meta?.entry}
            tone="entry"
          />

          <Level
            title="حد ضرر"
            value={meta?.stopLoss}
            tone="sl"
            extra={
              meta
                ? `-${money(
                    meta.riskUsd
                  )} · ${toman(
                    meta.riskToman
                  )}`
                : undefined
            }
          />

          <Level
            title="TP1 · 0.04 lot"
            value={meta?.tp1}
            tone="tp"
            extra={
              meta
                ? `+${money(
                    meta.tp1Usd
                  )} · 🇮🇷 ${toman(
                    meta.tp1Toman
                  )}`
                : undefined
            }
          />

          <Level
            title="TP2 · 0.03 lot"
            value={meta?.tp2}
            tone="tp"
            extra={
              meta
                ? `+${money(
                    meta.tp2Usd
                  )} · 🇮🇷 ${toman(
                    meta.tp2Toman
                  )}`
                : undefined
            }
          />

          <Level
            title="TP3 · 0.03 lot"
            value={meta?.tp3}
            tone="tp"
            extra={
              meta
                ? `+${money(
                    meta.tp3Usd
                  )} · 🇮🇷 ${toman(
                    meta.tp3Toman
                  )}`
                : undefined
            }
          />
        </section>

        {/* =========================
            POSITION MODEL
        ========================== */}

        <section className="cards-3">
          <Info
            title="حجم کل"
            value={`${
              data?.position.totalLot.toFixed(
                2
              ) || "0.10"
            } lot`}
            sub="0.04 + 0.03 + 0.03"
          />

          <Info
            title="ریسک استاپ"
            value={
              meta
                ? `-${money(
                    meta.riskUsd
                  )}`
                : "-$40"
            }
            sub={
              meta
                ? `🇮🇷 ${toman(
                    meta.riskToman
                  )}`
                : "بر اساس نرخ ثبت‌شده"
            }
            danger
          />

          <Info
            title="حداکثر سود"
            value={
              meta
                ? `+${money(
                    meta.totalPotentialUsd
                  )}`
                : "+$80"
            }
            sub={
              meta
                ? `🇮🇷 ${toman(
                    meta.totalPotentialToman
                  )}`
                : "TP1 + TP2 + TP3"
            }
            success
          />
        </section>

        {/* =========================
            PERFORMANCE
        ========================== */}

        <section className="card report">
          <div className="section-title">
            <div>
              <h2>
                کارنامه
              </h2>

              <p>
                ثبت روزانه، هفتگی و ماهانه؛
                هر TP و SL جداگانه شمرده می‌شود.
              </p>
            </div>

            <div className="tabs">
              {(
                [
                  ["day", "امروز"],
                  ["week", "این هفته"],
                  ["month", "این ماه"],
                ] as const
              ).map(([k, t]) => (
                <button
                  key={k}
                  className={
                    period === k
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriod(k)
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="stats-grid">
            <Stat
              title="معاملات"
              value={String(
                perf.trades
              )}
            />

            <Stat
              title="TP1"
              value={String(
                perf.tp1
              )}
              sub={`+${money(
                perf.tp1 * 20
              )} · 🇮🇷 ${toman(
                perf.tp1Toman
              )}`}
            />

            <Stat
              title="TP2"
              value={String(
                perf.tp2
              )}
              sub={`+${money(
                perf.tp2 * 24
              )} · 🇮🇷 ${toman(
                perf.tp2Toman
              )}`}
            />

            <Stat
              title="TP3"
              value={String(
                perf.tp3
              )}
              sub={`+${money(
                perf.tp3 * 36
              )} · 🇮🇷 ${toman(
                perf.tp3Toman
              )}`}
            />

            <Stat
              title="استاپ"
              value={String(
                perf.sl
              )}
              sub={`-${money(
                perf.sl * 40
              )} · 🇮🇷 ${toman(
                perf.slToman
              )}`}
              danger
            />

            <Stat
              title="خالص"
              value={`${
                perf.pnlUsd >= 0
                  ? "+"
                  : ""
              }${money(
                perf.pnlUsd
              )}`}
              sub={`${
                perf.pnlToman >= 0
                  ? "+"
                  : "-"
              }${toman(
                Math.abs(
                  perf.pnlToman
                )
              )}`}
              success={
                perf.pnlUsd >= 0
              }
              danger={
                perf.pnlUsd < 0
              }
            />
          </div>

          <div className="chart-wrap">
            <div className="chart-title">
              نمودار کوچک سود/زیان
            </div>

            <div className="bars">
              <div className="bar-col">
                <span>
                  برد
                </span>

                <div className="bar-track">
                  <div
                    className="bar win"
                    style={{
                      height: `${Math.max(
                        4,
                        (chart.win /
                          chart.max) *
                          100
                      )}%`,
                    }}
                  />
                </div>

                <b>
                  +{money(chart.win)}
                </b>
              </div>

              <div className="bar-col">
                <span>
                  باخت
                </span>

                <div className="bar-track">
                  <div
                    className="bar loss"
                    style={{
                      height: `${Math.max(
                        4,
                        (chart.loss /
                          chart.max) *
                          100
                      )}%`,
                    }}
                  />
                </div>

                <b>
                  -{money(chart.loss)}
                </b>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            AI ENGINE
        ========================== */}

        <section className="split">
          <div className="card analysis-card">
            <div className="section-title">
              <div>
                <h2>
                  موتور تحلیل
                </h2>

                <p>
                  تأییدهای چندلایه قبل از ثبت تحلیل
                </p>
              </div>

              <span className="score">
                {meta?.score ?? 0}/100
              </span>
            </div>

            <div className="checks">
              {(
                meta?.analysis?.reasons || [
                  "Trend",
                  "Structure",
                  "Momentum",
                  "Liquidity",
                  "Pullback",
                  "Candle",
                  "Session",
                  "News",
                  "Risk",
                ]
              ).map(
                (x, i) => (
                  <div
                    key={`${x}-${i}`}
                    className="check"
                  >
                    <span>
                      ✓
                    </span>

                    {x}
                  </div>
                )
              )}
            </div>

            <div className="state">
              وضعیت:
              {" "}
              <b>
                {stateFa(
                  meta?.state
                )}
              </b>

              {meta?.breakeven && (
                <em>
                  {" "}
                  🔐 BE فعال
                </em>
              )}
            </div>
          </div>

          <div className="card event-card">
            <div className="section-title">
              <div>
                <h2>
                  رویدادهای معامله
                </h2>

                <p>
                  هر برخورد در دیتابیس ثبت می‌شود.
                </p>
              </div>
            </div>

            <div className="events">
              {meta?.events?.length ? (
                [...meta.events]
                  .reverse()
                  .map(
                    (e, i) => (
                      <div
                        className="event"
                        key={`${e.type}-${i}`}
                      >
                        <span>
                          {eventIcon(
                            e.type
                          )}
                        </span>

                        <div>
                          <b>
                            {eventFa(
                              e.type
                            )}
                          </b>

                          <small>
                            {dateFa(
                              e.at
                            )}
                            {" · "}
                            {price(
                              e.price
                            )}
                            {" · "}
                            {e.lotClosed.toFixed(
                              2
                            )} lot
                          </small>
                        </div>

                        <strong
                          className={
                            e.pnlUsd >= 0
                              ? "green"
                              : "red"
                          }
                        >
                          {e.pnlUsd >= 0
                            ? "+"
                            : ""}
                          {money(
                            e.pnlUsd
                          )}

                          <small>
                            🇮🇷{" "}
                            {toman(
                              e.pnlToman
                            )}
                          </small>
                        </strong>
                      </div>
                    )
                  )
              ) : (
                <div className="empty">
                  هنوز رویدادی ثبت نشده است.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================
            RECENT ANALYSES
        ========================== */}

        <section className="card recent">
          <div className="section-title">
            <div>
              <h2>
                آخرین تحلیل‌ها
              </h2>

              <p>
                تاریخچه سیگنال‌های AI فقط برای XAUUSD
              </p>
            </div>
          </div>

          <div className="table">
            {data?.performance.recent?.length ? (
              data.performance.recent.map(
                (r) => {
                  const pnl =
                    r.metadata.events?.reduce(
                      (a, e) =>
                        a + e.pnlUsd,
                      0
                    ) || 0;

                  return (
                    <div
                      className="tr"
                      key={r.id}
                    >
                      <span>
                        {dateFa(
                          r.createdAt
                        )}
                      </span>

                      <span>
                        {r.metadata.direction ===
                        "BUY"
                          ? "🟢 BUY"
                          : "🔴 SELL"}
                      </span>

                      <span>
                        {r.metadata.session}
                      </span>

                      <span>
                        {r.status}
                      </span>

                      <span>
                        {r.metadata.score}/100
                      </span>

                      <span
                        className={
                          pnl >= 0
                            ? "green"
                            : "red"
                        }
                      >
                        {pnl >= 0
                          ? "+"
                          : ""}
                        {money(pnl)}
                      </span>
                    </div>
                  );
                }
              )
            ) : (
              <div className="empty">
                هنوز تحلیلی ثبت نشده است.
              </div>
            )}
          </div>
        </section>

        <footer>
          AI Analysis · XAUUSD · Contract size{" "}
          {data?.contractSize || 100} oz ·
          حجم کل 0.10 lot · TP1 0.04 · TP2 0.03 ·
          TP3 0.03
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   GOLD CHART
========================================================= */

function GoldChart({
  candles,
  meta,
  timeframe,
}: {
  candles: Candle[];
  meta: Meta | null;
  timeframe: string;
}) {
  const width = 1200;
  const height = 520;

  const padding = {
    top: 38,
    right: 105,
    bottom: 52,
    left: 25,
  };

  const visibleCandles = useMemo(() => {
    /*
     * برای جلوگیری از شلوغی نمودار،
     * آخرین 120 کندل نمایش داده می‌شود.
     *
     * داده‌ها واقعی هستند و اینجا هیچ کندل
     * ساختگی ساخته نمی‌شود.
     */
    return candles.slice(-120);
  }, [candles]);

  const chartData = useMemo(() => {
    if (!visibleCandles.length) {
      return null;
    }

    const allValues = visibleCandles.flatMap(
      (c) => [
        c.high,
        c.low,
        c.open,
        c.close,
      ]
    );

    const levels = [
      meta?.entry,
      meta?.stopLoss,
      meta?.tp1,
      meta?.tp2,
      meta?.tp3,
      meta?.analysis?.support,
      meta?.analysis?.resistance,
      meta?.currentPrice,
    ].filter(
      (v): v is number =>
        typeof v === "number" &&
        Number.isFinite(v)
    );

    const minRaw = Math.min(
      ...allValues,
      ...levels
    );

    const maxRaw = Math.max(
      ...allValues,
      ...levels
    );

    const range = Math.max(
      0.01,
      maxRaw - minRaw
    );

    const paddingPrice = Math.max(
      range * 0.08,
      0.25
    );

    const minPrice =
      minRaw - paddingPrice;

    const maxPrice =
      maxRaw + paddingPrice;

    const innerWidth =
      width -
      padding.left -
      padding.right;

    const innerHeight =
      height -
      padding.top -
      padding.bottom;

    const xStep =
      innerWidth /
      Math.max(
        1,
        visibleCandles.length
      );

    const candleWidth = Math.max(
      2,
      Math.min(9, xStep * 0.62)
    );

    const y = (value: number) =>
      padding.top +
      ((maxPrice - value) /
        (maxPrice - minPrice)) *
        innerHeight;

    const x = (index: number) =>
      padding.left +
      xStep * index +
      xStep / 2;

    return {
      minPrice,
      maxPrice,
      innerWidth,
      innerHeight,
      xStep,
      candleWidth,
      y,
      x,
    };
  }, [visibleCandles, meta]);

  if (!visibleCandles.length || !chartData) {
    return (
      <div className="chart-empty">
        <div className="chart-empty-icon">
          ◌
        </div>

        <h3>
          در انتظار داده واقعی XAUUSD
        </h3>

        <p>
          موتور تحلیل باید داده کندلی بازار را
          از سرور دریافت کند.
        </p>

        <span>
          XAUUSD · {timeframe}
        </span>
      </div>
    );
  }

  const {
    minPrice,
    maxPrice,
    innerWidth,
    innerHeight,
    xStep,
    candleWidth,
    y,
    x,
  } = chartData;

  const priceLevels = [
    {
      name: "ENTRY",
      value: meta?.entry,
      className: "chart-entry",
    },
    {
      name: "SL",
      value: meta?.stopLoss,
      className: "chart-sl",
    },
    {
      name: "TP1",
      value: meta?.tp1,
      className: "chart-tp",
    },
    {
      name: "TP2",
      value: meta?.tp2,
      className: "chart-tp",
    },
    {
      name: "TP3",
      value: meta?.tp3,
      className: "chart-tp",
    },
  ].filter(
    (
      level
    ): level is {
      name: string;
      value: number;
      className: string;
    } =>
      typeof level.value ===
        "number" &&
      Number.isFinite(level.value)
  );

  const extraLevels = [
    {
      name: "SUPPORT",
      value: meta?.analysis?.support,
      className: "chart-support",
    },
    {
      name: "RESISTANCE",
      value:
        meta?.analysis?.resistance,
      className: "chart-resistance",
    },
  ].filter(
    (
      level
    ): level is {
      name: string;
      value: number;
      className: string;
    } =>
      typeof level.value ===
        "number" &&
      Number.isFinite(level.value)
  );

  const currentPrice =
    typeof meta?.currentPrice ===
    "number"
      ? meta.currentPrice
      : visibleCandles[
          visibleCandles.length - 1
        ]?.close;

  const gridLines = 6;

  return (
    <div className="gold-chart">
      <div className="chart-toolbar">
        <div>
          <span className="chart-toolbar-symbol">
            XAU/USD
          </span>

          <span className="chart-toolbar-tf">
            {timeframe}
          </span>
        </div>

        <div className="chart-toolbar-info">
          <span>
            {visibleCandles.length} کندل
          </span>

          {meta && (
            <span
              className={
                meta.direction ===
                "BUY"
                  ? "chart-buy"
                  : "chart-sell"
              }
            >
              {meta.direction ===
              "BUY"
                ? "BUY"
                : "SELL"}
            </span>
          )}
        </div>
      </div>

      <div className="svg-chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="svg-chart"
          role="img"
          aria-label="نمودار XAUUSD"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="chartBg"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#12100b"
              />
              <stop
                offset="100%"
                stopColor="#08090b"
              />
            </linearGradient>

            <filter id="goldGlow">
              <feGaussianBlur
                stdDeviation="3"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            rx="20"
            fill="url(#chartBg)"
          />

          {/* Grid */}

          {Array.from(
            { length: gridLines },
            (_, i) => {
              const ratio =
                i /
                (gridLines - 1);

              const yy =
                padding.top +
                ratio *
                  innerHeight;

              const value =
                maxPrice -
                ratio *
                  (maxPrice -
                    minPrice);

              return (
                <g
                  key={`grid-${i}`}
                >
                  <line
                    x1={
                      padding.left
                    }
                    x2={
                      width -
                      padding.right
                    }
                    y1={yy}
                    y2={yy}
                    stroke="#ffffff"
                    strokeOpacity="0.07"
                    strokeDasharray="5 8"
                  />

                  <text
                    x={
                      width -
                      padding.right +
                      12
                    }
                    y={yy + 4}
                    fill="#777d87"
                    fontSize="12"
                    direction="ltr"
                  >
                    {value.toFixed(2)}
                  </text>
                </g>
              );
            }
          )}

          {/* Candles */}

          {visibleCandles.map(
            (candle, index) => {
              const cx = x(index);

              const openY =
                y(candle.open);

              const closeY =
                y(candle.close);

              const highY =
                y(candle.high);

              const lowY =
                y(candle.low);

              const bullish =
                candle.close >=
                candle.open;

              const bodyTop =
                Math.min(
                  openY,
                  closeY
                );

              const bodyHeight =
                Math.max(
                  1.5,
                  Math.abs(
                    openY -
                      closeY
                  )
                );

              return (
                <g
                  key={`candle-${String(
                    candle.time
                  )}-${index}`}
                >
                  <line
                    x1={cx}
                    x2={cx}
                    y1={highY}
                    y2={lowY}
                    stroke={
                      bullish
                        ? "#52dc91"
                        : "#ff6565"
                    }
                    strokeWidth="1.5"
                    opacity="0.9"
                  />

                  <rect
                    x={
                      cx -
                      candleWidth /
                        2
                    }
                    y={bodyTop}
                    width={
                      candleWidth
                    }
                    height={
                      bodyHeight
                    }
                    rx="1.5"
                    fill={
                      bullish
                        ? "#3fcf82"
                        : "#ed5b5b"
                    }
                    opacity="0.95"
                  />
                </g>
              );
            }
          )}

          {/* Support / Resistance */}

          {extraLevels.map(
            (level) => {
              const yy =
                y(level.value);

              return (
                <g
                  key={level.name}
                >
                  <line
                    x1={
                      padding.left
                    }
                    x2={
                      width -
                      padding.right
                    }
                    y1={yy}
                    y2={yy}
                    stroke={
                      level.name ===
                      "SUPPORT"
                        ? "#55d88c"
                        : "#ff9c52"
                    }
                    strokeOpacity="0.55"
                    strokeDasharray="4 7"
                  />

                  <rect
                    x={
                      padding.left +
                      8
                    }
                    y={yy - 14}
                    width="88"
                    height="23"
                    rx="7"
                    fill="#08090b"
                    stroke="#ffffff"
                    strokeOpacity="0.08"
                  />

                  <text
                    x={
                      padding.left +
                      18
                    }
                    y={yy + 2}
                    fill={
                      level.name ===
                      "SUPPORT"
                        ? "#55d88c"
                        : "#ff9c52"
                    }
                    fontSize="10"
                    fontWeight="800"
                    direction="ltr"
                  >
                    {level.name}
                  </text>
                </g>
              );
            }
          )}

          {/* Entry / SL / TP */}

          {priceLevels.map(
            (level) => {
              const yy =
                y(level.value);

              const isEntry =
                level.name ===
                "ENTRY";

              const isSL =
                level.name ===
                "SL";

              return (
                <g
                  key={`${level.name}-${level.value}`}
                >
                  <line
                    x1={
                      padding.left
                    }
                    x2={
                      width -
                      padding.right
                    }
                    y1={yy}
                    y2={yy}
                    stroke={
                      isEntry
                        ? "#e9c15a"
                        : isSL
                        ? "#ff5757"
                        : "#d6ad45"
                    }
                    strokeWidth={
                      isEntry
                        ? 2
                        : 1.5
                    }
                    strokeDasharray={
                      isEntry
                        ? undefined
                        : "8 6"
                    }
                    filter={
                      isEntry
                        ? "url(#goldGlow)"
                        : undefined
                    }
                    opacity="0.95"
                  />

                  <rect
                    x={
                      width -
                      padding.right +
                      7
                    }
                    y={yy - 12}
                    width="72"
                    height="22"
                    rx="7"
                    fill={
                      isEntry
                        ? "#d9ad3e"
                        : isSL
                        ? "#6e2424"
                        : "#493916"
                    }
                  />

                  <text
                    x={
                      width -
                      padding.right +
                      15
                    }
                    y={yy + 3}
                    fill={
                      isEntry
                        ? "#171208"
                        : "#fff"
                    }
                    fontSize="10"
                    fontWeight="900"
                    direction="ltr"
                  >
                    {level.name}
                  </text>

                  <text
                    x={
                      width -
                      padding.right +
                      8
                    }
                    y={yy + 27}
                    fill="#aeb4bf"
                    fontSize="10"
                    direction="ltr"
                  >
                    {level.value.toFixed(
                      2
                    )}
                  </text>
                </g>
              );
            }
          )}

          {/* Current price */}

          {typeof currentPrice ===
            "number" && (
            <g>
              <line
                x1={
                  padding.left
                }
                x2={
                  width -
                  padding.right
                }
                y1={y(
                  currentPrice
                )}
                y2={y(
                  currentPrice
                )}
                stroke="#f2f4f7"
                strokeOpacity="0.45"
                strokeDasharray="2 6"
              />

              <circle
                cx={
                  width -
                  padding.right -
                  4
                }
                cy={y(
                  currentPrice
                )}
                r="4"
                fill="#f4f6f8"
              />

              <rect
                x={
                  width -
                  padding.right +
                  7
                }
                y={
                  y(
                    currentPrice
                  ) - 12
                }
                width="72"
                height="22"
                rx="7"
                fill="#f0f2f4"
              />

              <text
                x={
                  width -
                  padding.right +
                  14
                }
                y={
                  y(
                    currentPrice
                  ) + 3
                }
                fill="#08090b"
                fontSize="10"
                fontWeight="900"
                direction="ltr"
              >
                {currentPrice.toFixed(
                  2
                )}
              </text>
            </g>
          )}

          {/* Time axis */}

          {visibleCandles.map(
            (candle, index) => {
              if (
                index !==
                visibleCandles.length -
                  1 &&
                index % 20 !== 0
              ) {
                return null;
              }

              const label =
                formatCandleTime(
                  candle.time
                );

              return (
                <text
                  key={`time-${String(
                    candle.time
                  )}-${index}`}
                  x={x(index)}
                  y={
                    height -
                    18
                  }
                  textAnchor="middle"
                  fill="#696f79"
                  fontSize="10"
                  direction="ltr"
                >
                  {label}
                </text>
              );
            }
          )}
        </svg>
      </div>

      <div className="chart-legend">
        <span>
          <i className="legend-entry" />
          Entry
        </span>

        <span>
          <i className="legend-sl" />
          Stop Loss
        </span>

        <span>
          <i className="legend-tp" />
          TP1 / TP2 / TP3
        </span>

        <span>
          <i className="legend-support" />
          Support
        </span>

        <span>
          <i className="legend-resistance" />
          Resistance
        </span>

        <span>
          <i className="legend-price" />
          قیمت فعلی
        </span>
      </div>
    </div>
  );
}

function formatCandleTime(
  value: string | number
) {
  try {
    const date =
      typeof value === "number"
        ? new Date(
            value < 10000000000
              ? value * 1000
              : value
          )
        : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).format(date);
  } catch {
    return String(value);
  }
}

function Level({
  title,
  value,
  extra,
  tone,
}: {
  title: string;
  value?: number;
  extra?: string;
  tone: string;
}) {
  return (
    <div
      className={`level ${tone}`}
    >
      <span>
        {title}
      </span>

      <b>
        {typeof value ===
        "number"
          ? price(value)
          : "—"}
      </b>

      {extra && (
        <small>
          {extra}
        </small>
      )}
    </div>
  );
}

function Info({
  title,
  value,
  sub,
  danger,
  success,
}: {
  title: string;
  value: string;
  sub: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="info">
      <span>
        {title}
      </span>

      <b
        className={
          danger
            ? "red"
            : success
            ? "green"
            : ""
        }
      >
        {value}
      </b>

      <small>
        {sub}
      </small>
    </div>
  );
}

function Stat({
  title,
  value,
  sub,
  danger,
  success,
}: {
  title: string;
  value: string;
  sub?: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="stat">
      <span>
        {title}
      </span>

      <b
        className={
          danger
            ? "red"
            : success
            ? "green"
            : ""
        }
      >
        {value}
      </b>

      {sub && (
        <small>
          {sub}
        </small>
      )}
    </div>
  );
}

function stateFa(v?: string) {
  return (
    {
      AI_PENDING: "در انتظار",
      AI_TP1: "TP1 خورد",
      AI_TP2: "TP2 خورد",
      AI_TP3: "TP3 تکمیل شد",
      AI_SL: "استاپ خورد",
      AI_BE: "بریک‌ایون / بسته‌شده",
    } as Record<
      string,
      string
    >
  )[v || ""] || "بدون معامله";
}

function eventFa(v: string) {
  return (
    {
      TP1: "TP1 رسید",
      TP2: "TP2 رسید",
      TP3: "TP3 رسید",
      SL: "استاپ خورد",
      BREAKEVEN: "بریک‌ایون",
    } as Record<
      string,
      string
    >
  )[v] || v;
}

function eventIcon(v: string) {
  if (v === "SL") {
    return "🛑";
  }

  if (v === "TP3") {
    return "🏆";
  }

  if (v === "BREAKEVEN") {
    return "🔐";
  }

  return "🎯";
}

const css = `
*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
  background:#05070b;
}

body{
  color:#f4f7fb;
  font-family:Tahoma,Arial,sans-serif;
}

button{
  font-family:inherit;
}

.ai-page{
  min-height:100vh;
  background:
    radial-gradient(
      circle at 10% 0%,
      #3b2b08 0,
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 15%,
      #16341d 0,
      transparent 25%
    ),
    linear-gradient(
      145deg,
      #040608,
      #0c0d10 55%,
      #080806
    );
  padding:22px;
}

.shell{
  max-width:1450px;
  margin:auto;
}

.topbar{
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:center;
  margin-bottom:18px;
}

.eyebrow{
  font-size:12px;
  letter-spacing:3px;
  color:#d7a93a;
  font-weight:900;
}

.topbar h1{
  font-size:34px;
  margin:8px 0;
}

.topbar p{
  margin:0;
  color:#aeb4bf;
  font-size:16px;
}

.top-actions{
  display:flex;
  gap:10px;
  align-items:center;
}

.top-actions button,
.tabs button,
.timeframe-buttons button{
  border:1px solid #ffffff16;
  background:#15171b;
  color:#fff;
  border-radius:13px;
  padding:12px 16px;
  font-weight:800;
  cursor:pointer;
  transition:.2s;
}

.top-actions button:hover,
.tabs button:hover,
.timeframe-buttons button:hover{
  border-color:#c79b35;
  transform:translateY(-1px);
}

.top-actions button:disabled{
  opacity:.6;
  cursor:wait;
}

.live{
  border:1px solid #2c6a3b;
  background:#0c1b11;
  color:#7fe69a;
  padding:11px 14px;
  border-radius:13px;
  font-weight:800;
}

.live i{
  display:inline-block;
  width:8px;
  height:8px;
  background:#49d76b;
  border-radius:50%;
  margin-left:7px;
  box-shadow:
    0 0 14px #49d76b;
}

.notice,
.error,
.card,
.level,
.info{
  background:rgba(15,16,19,.88);
  border:1px solid #ffffff12;
  box-shadow:0 18px 50px #0007;
  backdrop-filter:blur(16px);
}

.notice{
  padding:17px 20px;
  border-radius:17px;
  margin-bottom:16px;
  display:flex;
  gap:14px;
  align-items:center;
}

.notice b{
  color:#e2b74f;
  font-size:17px;
  white-space:nowrap;
}

.notice span{
  color:#aeb4bf;
  font-size:14px;
  line-height:1.8;
}

.error{
  padding:14px 18px;
  border-radius:14px;
  color:#ff9e9e;
  margin-bottom:16px;
}

/* ===============================
   GOLD CHART
================================ */

.market-chart-card{
  padding:0;
  overflow:hidden;
  margin-bottom:16px;
  background:
    linear-gradient(
      145deg,
      rgba(21,19,13,.97),
      rgba(10,12,15,.95)
    );
}

.chart-header{
  padding:22px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  border-bottom:1px solid #ffffff0b;
}

.chart-symbol{
  display:flex;
  align-items:center;
  gap:9px;
  color:#e5bd56;
  font-weight:900;
  font-size:14px;
  letter-spacing:1px;
}

.gold-dot{
  width:10px;
  height:10px;
  border-radius:50%;
  background:#e0b64e;
  box-shadow:0 0 15px #d8aa3c;
}

.chart-header h2{
  margin:9px 0 5px;
  font-size:23px;
}

.chart-header p{
  margin:0;
  color:#858c97;
  font-size:13px;
}

.chart-status{
  display:flex;
  align-items:center;
  gap:8px;
  color:#858c97;
  font-size:12px;
  white-space:nowrap;
}

.chart-live-dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#4bd978;
  box-shadow:0 0 12px #4bd978;
}

.timeframe-bar{
  display:flex;
  align-items:center;
  gap:12px;
  padding:14px 22px;
  border-bottom:1px solid #ffffff0b;
  background:rgba(0,0,0,.18);
}

.timeframe-label{
  color:#8f96a2;
  font-size:12px;
  font-weight:800;
  white-space:nowrap;
}

.timeframe-buttons{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
}

.timeframe-buttons button{
  padding:8px 13px;
  min-width:52px;
  border-radius:10px;
  font-size:12px;
}

.timeframe-buttons button.active{
  background:#d4aa43;
  color:#151107;
  border-color:#d4aa43;
  box-shadow:
    0 0 18px rgba(212,170,67,.2);
}

.default-timeframe{
  margin-right:auto;
  color:#707782;
  font-size:11px;
  display:flex;
  align-items:center;
  gap:7px;
}

.default-timeframe span{
  width:6px;
  height:6px;
  background:#d5aa42;
  border-radius:50%;
  box-shadow:0 0 8px #d5aa42;
}

.gold-chart{
  width:100%;
}

.chart-toolbar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:13px 22px 10px;
  color:#858c97;
  font-size:11px;
}

.chart-toolbar-symbol{
  color:#e4bd5a;
  font-weight:900;
  direction:ltr;
  display:inline-block;
  margin-left:8px;
}

.chart-toolbar-tf{
  color:#777e89;
  direction:ltr;
}

.chart-toolbar-info{
  display:flex;
  gap:12px;
  align-items:center;
}

.chart-buy{
  color:#5ddd91;
  font-weight:900;
}

.chart-sell{
  color:#ff6d6d;
  font-weight:900;
}

.svg-chart-wrap{
  width:100%;
  padding:0 12px 12px;
  overflow:hidden;
}

.svg-chart{
  width:100%;
  min-height:390px;
  display:block;
  border-radius:20px;
}

.chart-legend{
  display:flex;
  align-items:center;
  gap:17px;
  flex-wrap:wrap;
  padding:0 22px 19px;
  color:#858c97;
  font-size:11px;
}

.chart-legend span{
  display:flex;
  align-items:center;
  gap:6px;
}

.chart-legend i{
  display:inline-block;
  width:17px;
  height:3px;
  border-radius:5px;
}

.legend-entry{
  background:#e7bd50;
}

.legend-sl{
  background:#ff5757;
}

.legend-tp{
  background:#d6ad45;
}

.legend-support{
  background:#55d88c;
}

.legend-resistance{
  background:#ff9c52;
}

.legend-price{
  background:#f2f4f7;
}

.chart-empty{
  min-height:440px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-align:center;
  padding:40px 20px;
  background:
    radial-gradient(
      circle at center,
      rgba(196,151,48,.07),
      transparent 45%
    );
}

.chart-empty-icon{
  width:70px;
  height:70px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  border:1px solid #d2a53f33;
  color:#d2a53f;
  font-size:38px;
  margin-bottom:15px;
  box-shadow:
    0 0 35px rgba(210,165,63,.08);
}

.chart-empty h3{
  margin:0 0 8px;
  font-size:18px;
}

.chart-empty p{
  margin:0 0 13px;
  color:#7d848f;
  font-size:13px;
}

.chart-empty span{
  direction:ltr;
  color:#c49b39;
  font-size:12px;
  font-weight:800;
}

/* ===============================
   HERO
================================ */

.hero-grid{
  display:grid;
  grid-template-columns:1.6fr 1fr;
  gap:16px;
}

.card{
  border-radius:22px;
  padding:22px;
}

.hero-card{
  background:
    linear-gradient(
      135deg,
      rgba(27,24,15,.95),
      rgba(12,14,17,.9)
    );
}

.card-head,
.meta-row,
.section-title{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
}

.card-head{
  font-size:18px;
  font-weight:900;
}

.buy,
.green{
  color:#62e48b;
}

.sell,
.red{
  color:#ff7272;
}

.neutral{
  color:#a3a8b0;
}

.market-current-price{
  font-size:45px;
  font-weight:900;
  letter-spacing:1px;
  margin-top:24px;
  color:#f0f2f5;
  direction:ltr;
  text-align:right;
}

.price-sub,
.muted,
.label,
.section-title p{
  color:#8f96a2;
  font-size:14px;
}

.meta-row{
  margin-top:25px;
  padding-top:16px;
  border-top:1px solid #ffffff0d;
  color:#8f96a2;
  flex-wrap:wrap;
}

.meta-row b{
  color:#f5f7fa;
  margin-right:5px;
}

.fx-number{
  font-size:34px;
  font-weight:900;
  color:#e8c260;
  margin:13px 0;
}

.fx-rule{
  margin-top:18px;
  padding:12px;
  border-radius:12px;
  background:#17130a;
  color:#cdbb8a;
  font-size:12px;
  line-height:1.8;
}

.levels-grid{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:12px;
  margin:16px 0;
}

.level{
  border-radius:18px;
  padding:17px;
  min-height:122px;
}

.level span,
.info span,
.stat span{
  display:block;
  color:#9298a3;
  font-size:13px;
}

.level b{
  display:block;
  font-size:27px;
  margin:12px 0;
  direction:ltr;
  text-align:right;
}

.level small,
.info small,
.stat small{
  display:block;
  color:#aeb4bf;
  font-size:12px;
  line-height:1.7;
}

.level.entry b{
  color:#e9edf3;
}

.level.sl{
  border-color:#6c2424;
}

.level.sl b{
  color:#ff7373;
}

.level.tp{
  border-color:#5b481b;
}

.level.tp b{
  color:#e5b94e;
}

.cards-3{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
  margin-bottom:16px;
}

.info{
  border-radius:18px;
  padding:18px;
}

.info b{
  display:block;
  font-size:28px;
  margin:10px 0;
}

/* ===============================
   PERFORMANCE
================================ */

.report{
  margin-bottom:16px;
}

.section-title h2{
  margin:0 0 6px;
  font-size:21px;
}

.tabs{
  display:flex;
  gap:7px;
}

.tabs button.active{
  background:#d2a53f;
  color:#17120a;
  border-color:#d2a53f;
}

.stats-grid{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:10px;
  margin-top:18px;
}

.stat{
  padding:16px;
  border-radius:16px;
  background:#0c0e12;
  border:1px solid #ffffff0d;
}

.stat b{
  display:block;
  font-size:27px;
  margin:10px 0;
}

.chart-wrap{
  margin-top:16px;
  border-top:1px solid #ffffff0d;
  padding-top:18px;
}

.chart-title{
  font-weight:800;
  margin-bottom:12px;
}

.bars{
  height:190px;
  display:flex;
  justify-content:center;
  gap:35px;
  align-items:flex-end;
}

.bar-col{
  height:100%;
  width:90px;
  display:flex;
  flex-direction:column;
  justify-content:flex-end;
  align-items:center;
  gap:7px;
  color:#9ca3ae;
}

.bar-track{
  height:135px;
  width:34px;
  background:#181a1f;
  border-radius:10px;
  display:flex;
  align-items:flex-end;
  overflow:hidden;
}

.bar{
  width:100%;
  border-radius:10px 10px 0 0;
}

.bar.win{
  background:
    linear-gradient(
      180deg,
      #4bd978,
      #173d26
    );
}

.bar.loss{
  background:
    linear-gradient(
      180deg,
      #ff6d6d,
      #4a1e1e
    );
}

/* ===============================
   ANALYSIS
================================ */

.split{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
  margin-bottom:16px;
}

.checks{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:8px;
  margin-top:17px;
}

.check{
  padding:11px 12px;
  border:1px solid #ffffff0d;
  border-radius:12px;
  color:#c8cdd5;
  font-size:14px;
}

.check span{
  color:#67df8c;
  margin-left:8px;
}

.score{
  padding:9px 13px;
  border-radius:10px;
  color:#e5b94e;
  background:#211a0b;
  border:1px solid #5a4517;
  font-weight:900;
  direction:ltr;
}

.state{
  margin-top:16px;
  color:#aeb4bf;
}

.state b{
  color:#e5b94e;
}

.state em{
  color:#67df8c;
  font-style:normal;
}

.events{
  margin-top:14px;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.event{
  display:grid;
  grid-template-columns:35px 1fr auto;
  gap:10px;
  align-items:center;
  padding:11px;
  border-radius:13px;
  background:#0b0d11;
  border:1px solid #ffffff0b;
}

.event>span{
  font-size:22px;
}

.event b{
  display:block;
}

.event small{
  display:block;
  color:#818894;
  font-size:11px;
  margin-top:4px;
}

.event strong{
  text-align:left;
}

/* ===============================
   RECENT
================================ */

.recent{
  margin-bottom:16px;
}

.table{
  margin-top:15px;
}

.tr{
  display:grid;
  grid-template-columns:
    1.3fr
    .8fr
    .8fr
    .9fr
    .6fr
    .7fr;
  gap:8px;
  padding:13px 10px;
  border-bottom:1px solid #ffffff0a;
  color:#c8cdd5;
  font-size:13px;
}

.tr:first-child{
  border-top:1px solid #ffffff0a;
}

.empty{
  text-align:center;
  padding:30px;
  color:#737a86;
}

.ai-page footer{
  text-align:center;
  color:#656c77;
  font-size:12px;
  padding:12px 0 30px;
}

/* ===============================
   RESPONSIVE
================================ */

@media(max-width:1050px){

  .levels-grid{
    grid-template-columns:repeat(3,1fr);
  }

  .stats-grid{
    grid-template-columns:repeat(3,1fr);
  }

  .hero-grid,
  .split{
    grid-template-columns:1fr;
  }

  .topbar{
    align-items:flex-start;
    flex-direction:column;
  }

  .top-actions{
    width:100%;
  }

  .chart-header{
    align-items:flex-start;
    flex-direction:column;
  }

  .chart-status{
    white-space:normal;
  }
}

@media(max-width:650px){

  .ai-page{
    padding:12px;
  }

  .topbar h1{
    font-size:26px;
  }

  .topbar p{
    font-size:13px;
  }

  .notice{
    align-items:flex-start;
    flex-direction:column;
  }

  .hero-grid,
  .cards-3{
    grid-template-columns:1fr;
  }

  .levels-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .level{
    min-height:110px;
  }

  .level b{
    font-size:23px;
  }

  .stats-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .tr{
    grid-template-columns:1fr 1fr;
    font-size:12px;
  }

  .tr span:nth-child(n+3){
    display:none;
  }

  .market-current-price{
    font-size:38px;
  }

  .meta-row{
    flex-wrap:wrap;
    justify-content:flex-start;
  }

  .top-actions{
    justify-content:space-between;
  }

  .timeframe-bar{
    align-items:flex-start;
    flex-direction:column;
  }

  .default-timeframe{
    margin-right:0;
  }

  .chart-toolbar{
    padding-right:14px;
    padding-left:14px;
  }

  .svg-chart-wrap{
    padding-right:5px;
    padding-left:5px;
  }

  .svg-chart{
    min-height:330px;
  }

  .chart-legend{
    gap:10px;
    padding-right:14px;
    padding-left:14px;
  }

  .chart-empty{
    min-height:350px;
  }

  .chart-header{
    padding:17px;
  }

  .timeframe-bar{
    padding:12px 17px;
  }
}
`;
