"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const faNumber = new Intl.NumberFormat("fa-IR");
const usdNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const sessions = [
  {
    name: "Sydney",
    icon: "🌏",
    time: "00:00 – 06:00 UTC",
    description: "شروع چرخه بازار آسیا",
  },
  {
    name: "Tokyo",
    icon: "🇯🇵",
    time: "00:00 – 09:00 UTC",
    description: "جلسه آسیایی",
  },
  {
    name: "London",
    icon: "🇬🇧",
    time: "07:00 – 16:00 UTC",
    description: "جلسه اروپا",
  },
  {
    name: "New York",
    icon: "🇺🇸",
    time: "13:00 – 22:00 UTC",
    description: "جلسه آمریکا",
  },
];

type TradeEvent = {
  type: string;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
};

type AnalysisMeta = {
  kind?: string;

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

  events: TradeEvent[];

  analysis?: {
    reasons?: string[];
    support?: number;
    resistance?: number;
    atr?: number;
  };
};

type Performance = {
  trades: number;

  wins?: number;
  losses?: number;
  breakeven?: number;

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

type RecentRun = {
  id: string;
  createdAt: string;
  status: string;
  metadata: AnalysisMeta;
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

  active:
    | {
        id: string;
        status: string;
        metadata: AnalysisMeta;
      }
    | null;

  latest:
    | {
        id: string;
        status: string;
        metadata: AnalysisMeta;
      }
    | null;

  performance: {
    day: Performance;
    week: Performance;
    month: Performance;

    recent: RecentRun[];
  };

  usdToToman: {
    rate: number;
    asOf: string;
  } | null;

  sessions?: Record<
    string,
    {
      start: number;
      end: number;
    }
  >;
};

const emptyPerformance: Performance = {
  trades: 0,
  wins: 0,
  losses: 0,
  breakeven: 0,

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

function formatUsd(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${usdNumber.format(Math.abs(value))}`;
}

function formatToman(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${faNumber.format(Math.round(Math.abs(value)))} تومان`;
}

function formatPrice(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function stateLabel(value?: string) {
  const states: Record<string, string> = {
    AI_PENDING: "در انتظار TP1",
    AI_TP1: "TP1 فعال شده",
    AI_TP2: "TP2 فعال شده",
    AI_TP3: "معامله کامل شد",
    AI_SL: "استاپ لاس",
    AI_BE: "بریک‌ایون",
  };

  return states[value || ""] || "بدون معامله";
}

function eventLabel(value: string) {
  const events: Record<string, string> = {
    TP1: "TP1 رسید",
    TP2: "TP2 رسید",
    TP3: "TP3 رسید",
    SL: "استاپ خورد",
    BREAKEVEN: "بریک‌ایون",
  };

  return events[value] || value;
}

function eventIcon(value: string) {
  if (value === "SL") return "🛑";
  if (value === "TP3") return "🏆";
  if (value === "BREAKEVEN") return "🔐";
  return "🎯";
}

function sessionIcon(name?: string) {
  if (name === "New York") return "🇺🇸";
  if (name === "London") return "🇬🇧";
  if (name === "Tokyo") return "🇯🇵";
  if (name === "Sydney") return "🌏";
  return "🌐";
}

export default function AIAnalysisPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-analysis", {
        method: "GET",
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json?.error || "دریافت اطلاعات تحلیل هوش مصنوعی ناموفق بود."
        );
      }

      setData(json.data);

      setError("");

      setLastUpdate(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ارتباط با موتور تحلیل هوش مصنوعی."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const timer = window.setInterval(() => {
      loadDashboard();
    }, 20000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadDashboard]);

  const meta =
    data?.active?.metadata ||
    data?.latest?.metadata ||
    null;

  const performance =
    data?.performance?.[period] || emptyPerformance;

  const totalEvents =
    (performance.tp1 || 0) +
    (performance.tp2 || 0) +
    (performance.tp3 || 0) +
    (performance.sl || 0);

  const winCount =
    performance.wins ??
    performance.tp3 ??
    0;

  const lossCount =
    performance.losses ??
    performance.sl ??
    0;

  const winRate =
    performance.trades > 0
      ? Math.round((winCount / performance.trades) * 100)
      : 0;

  const chart = useMemo(() => {
    const positive = Math.max(
      0,
      Number(performance.pnlUsd || 0)
    );

    const negative = Math.max(
      0,
      Number(-(performance.pnlUsd || 0))
    );

    const max = Math.max(
      1,
      positive,
      negative,
      performance.tp1 * 20,
      performance.tp2 * 24,
      performance.tp3 * 36,
      performance.sl * 40
    );

    return {
      positive,
      negative,
      max,
    };
  }, [performance]);

  return (
    <main dir="rtl" className="ai-page">
      <style>{styles}</style>

      <div className="page-shell">

        {/* HEADER */}
        <header className="header">

          <div className="brand-area">

            <div className="brand-icon">
              🤖
            </div>

            <div>
              <div className="eyebrow">
                AI MARKET ENGINE
              </div>

              <h1>
                تحلیل هوش مصنوعی طلا
              </h1>

              <p>
                موتور مستقل تحلیل XAUUSD با مدیریت حجم، TP، SL،
                Break-even و کارنامه معاملاتی
              </p>
            </div>

          </div>

          <div className="header-actions">

            <div className="system-status">
              <span className="status-dot" />
              سیستم فعال
            </div>

            <button
              className="refresh-button"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading
                ? "در حال دریافت..."
                : "↻ بروزرسانی"}
            </button>

          </div>

        </header>


        {/* AI DISCLAIMER */}
        <section className="ai-disclaimer">

          <div className="ai-disclaimer-icon">
            🧠
          </div>

          <div>

            <strong>
              این تحلیل هوش مصنوعی است
            </strong>

            <p>
              تحلیل توسط موتور AI برای XAUUSD انجام می‌شود.
              مقادیر TP، SL، حجم و P/L طبق مدل تعریف‌شده ثبت
              می‌شوند. اجرای واقعی سفارش در بروکر فقط با اتصال
              مستقیم به بروکر امکان‌پذیر است.
            </p>

          </div>

        </section>


        {/* ERROR */}
        {error && (
          <div className="error-box">
            ⚠️ {error}
          </div>
        )}


        {/* MAIN MARKET */}
        <section className="market-grid">

          <div className="market-card main-market">

            <div className="market-top">

              <div className="symbol">

                <span className="gold-ball">
                  🟡
                </span>

                <div>
                  <strong>
                    XAUUSD
                  </strong>

                  <small>
                    GOLD / US DOLLAR
                  </small>
                </div>

              </div>

              <div
                className={
                  meta?.direction === "BUY"
                    ? "direction buy"
                    : meta?.direction === "SELL"
                    ? "direction sell"
                    : "direction neutral"
                }
              >
                {meta?.direction === "BUY"
                  ? "🟢 BUY"
                  : meta?.direction === "SELL"
                  ? "🔴 SELL"
                  : "⏳ NO TRADE"}
              </div>

            </div>


            <div className="live-price-label">
              قیمت فعلی بازار
            </div>

            <div className="live-price">
              {meta
                ? formatPrice(meta.currentPrice)
                : "—"}
            </div>

            <div className="price-source">
              XAU/USD · Market Data
            </div>


            <div className="market-meta">

              <div>
                <span>سشن</span>

                <strong>
                  {meta
                    ? `${sessionIcon(meta.session)} ${meta.session}`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>تایم‌فریم</span>

                <strong>
                  {meta?.timeframe || "—"}
                </strong>
              </div>

              <div>
                <span>امتیاز AI</span>

                <strong className="gold-text">
                  {meta?.score ?? "—"}/100
                </strong>
              </div>

              <div>
                <span>تأییدها</span>

                <strong>
                  {meta?.confirmations ?? "—"}
                </strong>
              </div>

            </div>

          </div>


          {/* USD RATE */}
          <div className="market-card currency-card">

            <div className="currency-title">
              💵 نرخ دلار
            </div>

            <div className="currency-big">

              {data?.usdToToman
                ? faNumber.format(
                    Math.round(data.usdToToman.rate)
                  )
                : "—"}

            </div>

            <div className="currency-unit">
              تومان برای هر دلار
            </div>

            <div className="currency-date">

              آخرین دریافت:

              <br />

              {data?.usdToToman?.asOf
                ? formatDate(data.usdToToman.asOf)
                : "—"}

            </div>

            <div className="real-rate">
              ✓ نرخ از سرویس ارزی سرور دریافت می‌شود
              <br />
              ✓ نرخ داخل معامله ذخیره می‌شود
              <br />
              ✓ تغییر نرخ آینده، کارنامه قبلی را تغییر نمی‌دهد
            </div>

          </div>

        </section>


        {/* POSITION MODEL */}
        <section className="section">

          <div className="section-heading">

            <div>
              <span className="section-kicker">
                TRADE MODEL
              </span>

              <h2>
                ساختار دقیق معامله
              </h2>

              <p>
                حجم کل 0.10 لات با تقسیم جداگانه TP1، TP2 و TP3
              </p>
            </div>

            <div className="contract-badge">
              Contract: {data?.contractSize || 100} oz
            </div>

          </div>


          <div className="levels-grid">

            <LevelCard
              title="ENTRY"
              label="نقطه ورود"
              value={meta?.entry}
              type="entry"
            />

            <LevelCard
              title="STOP LOSS"
              label="0.10 LOT · -$40"
              value={meta?.stopLoss}
              type="stop"
              moneyUsd={
                meta
                  ? -meta.riskUsd
                  : -40
              }
              moneyToman={
                meta
                  ? -meta.riskToman
                  : undefined
              }
            />

            <LevelCard
              title="TP1"
              label="0.04 LOT · +$20"
              value={meta?.tp1}
              type="tp"
              moneyUsd={
                meta
                  ? meta.tp1Usd
                  : 20
              }
              moneyToman={
                meta
                  ? meta.tp1Toman
                  : undefined
              }
            />

            <LevelCard
              title="TP2"
              label="0.03 LOT · +$24"
              value={meta?.tp2}
              type="tp"
              moneyUsd={
                meta
                  ? meta.tp2Usd
                  : 24
              }
              moneyToman={
                meta
                  ? meta.tp2Toman
                  : undefined
              }
            />

            <LevelCard
              title="TP3"
              label="0.03 LOT · +$36"
              value={meta?.tp3}
              type="tp"
              moneyUsd={
                meta
                  ? meta.tp3Usd
                  : 36
              }
              moneyToman={
                meta
                  ? meta.tp3Toman
                  : undefined
              }
            />

          </div>

        </section>


        {/* POSITION SUMMARY */}
        <section className="summary-grid">

          <SummaryCard
            icon="📦"
            title="حجم کل"
            value="0.10 LOT"
            sub="0.04 + 0.03 + 0.03"
          />

          <SummaryCard
            icon="🛑"
            title="ریسک حد ضرر"
            value="-40 USD"
            sub={
              meta
                ? formatToman(-meta.riskToman)
                : "طبق نرخ ثبت‌شده"
            }
            danger
          />

          <SummaryCard
            icon="🎯"
            title="TP1"
            value="+20 USD"
            sub={
              meta
                ? formatToman(meta.tp1Toman)
                : "نرخ معامله"
            }
          />

          <SummaryCard
            icon="🎯"
            title="TP2"
            value="+24 USD"
            sub={
              meta
                ? formatToman(meta.tp2Toman)
                : "نرخ معامله"
            }
          />

          <SummaryCard
            icon="🏆"
            title="TP3"
            value="+36 USD"
            sub={
              meta
                ? formatToman(meta.tp3Toman)
                : "نرخ معامله"
            }
          />

          <SummaryCard
            icon="💰"
            title="حداکثر سود"
            value="+80 USD"
            sub={
              meta
                ? formatToman(meta.totalPotentialToman)
                : "TP1 + TP2 + TP3"
            }
            success
          />

        </section>


        {/* CURRENT TRADE */}
        <section className="current-trade card">

          <div className="section-heading">

            <div>
              <span className="section-kicker">
                LIVE AI TRADE
              </span>

              <h2>
                وضعیت تحلیل فعلی
              </h2>
            </div>

            <div
              className={
                meta?.breakeven
                  ? "be-badge active"
                  : "be-badge"
              }
            >
              {meta?.breakeven
                ? "🔐 BREAK-EVEN فعال"
                : "🔓 BREAK-EVEN فعال نشده"}
            </div>

          </div>


          <div className="trade-status">

            <div className="trade-state">

              <span>
                وضعیت
              </span>

              <strong>
                {stateLabel(meta?.state)}
              </strong>

            </div>

            <div className="trade-state">

              <span>
                سشن
              </span>

              <strong>
                {meta
                  ? `${sessionIcon(meta.session)} ${meta.session}`
                  : "—"}
              </strong>

            </div>

            <div className="trade-state">

              <span>
                حجم باقی‌مانده
              </span>

              <strong>
                {meta
                  ? calculateRemainingLot(meta)
                  : "0.10"}
                {" LOT"}
              </strong>

            </div>

            <div className="trade-state">

              <span>
                P/L رویدادها
              </span>

              <strong
                className={
                  calculateEventsPnl(meta) >= 0
                    ? "green"
                    : "red"
                }
              >
                {formatUsd(
                  calculateEventsPnl(meta)
                )}
              </strong>

            </div>

          </div>

        </section>


        {/* PERFORMANCE */}
        <section className="performance card">

          <div className="section-heading">

            <div>
              <span className="section-kicker">
                PERFORMANCE
              </span>

              <h2>
                کارنامه معاملات AI
              </h2>

              <p>
                آمار بر اساس رویدادهای ثبت‌شده در دیتابیس
              </p>
            </div>


            <div className="period-tabs">

              <button
                className={
                  period === "day"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setPeriod("day")
                }
              >
                امروز
              </button>

              <button
                className={
                  period === "week"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setPeriod("week")
                }
              >
                این هفته
              </button>

              <button
                className={
                  period === "month"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setPeriod("month")
                }
              >
                این ماه
              </button>

            </div>

          </div>


          <div className="performance-grid">

            <Metric
              title="معاملات"
              value={String(
                performance.trades
              )}
              icon="📊"
            />

            <Metric
              title="برد"
              value={String(
                winCount
              )}
              icon="🏆"
              success
            />

            <Metric
              title="باخت"
              value={String(
                lossCount
              )}
              icon="🛑"
              danger
            />

            <Metric
              title="Win Rate"
              value={`${winRate}%`}
              icon="📈"
            />

            <Metric
              title="TP1"
              value={String(
                performance.tp1
              )}
              icon="🎯"
              sub={`+${performance.tp1 * 20}$`}
            />

            <Metric
              title="TP2"
              value={String(
                performance.tp2
              )}
              icon="🎯"
              sub={`+${performance.tp2 * 24}$`}
            />

            <Metric
              title="TP3"
              value={String(
                performance.tp3
              )}
              icon="🏆"
              sub={`+${performance.tp3 * 36}$`}
            />

            <Metric
              title="SL"
              value={String(
                performance.sl
              )}
              icon="🛑"
              danger
              sub={`-${performance.sl * 40}$`}
            />

          </div>


          <div className="net-profit">

            <div>

              <span>
                خالص سود / زیان
              </span>

              <strong
                className={
                  performance.pnlUsd >= 0
                    ? "green"
                    : "red"
                }
              >
                {formatUsd(
                  performance.pnlUsd
                )}
              </strong>

            </div>

            <div>

              <span>
                خالص به تومان
              </span>

              <strong
                className={
                  performance.pnlToman >= 0
                    ? "green"
                    : "red"
                }
              >
                {formatToman(
                  performance.pnlToman
                )}
              </strong>

            </div>

            <div>

              <span>
                تعداد رویدادها
              </span>

              <strong>
                {totalEvents}
              </strong>

            </div>

          </div>


          {/* SMALL P/L CHART */}
          <div className="chart-card">

            <div className="chart-header">

              <div>
                <strong>
                  نمودار سود و زیان
                </strong>

                <span>
                  {period === "day"
                    ? "روزانه"
                    : period === "week"
                    ? "هفتگی"
                    : "ماهانه"}
                </span>
              </div>

              <b>
                {formatUsd(
                  performance.pnlUsd
                )}
              </b>

            </div>


            <div className="chart">

              <div className="chart-column">

                <span>
                  سود
                </span>

                <div className="chart-track">

                  <div
                    className="chart-profit"
                    style={{
                      height: `${Math.max(
                        5,
                        (chart.positive /
                          chart.max) *
                          100
                      )}%`,
                    }}
                  />

                </div>

                <b>
                  +${usdNumber.format(
                    chart.positive
                  )}
                </b>

              </div>


              <div className="chart-column">

                <span>
                  زیان
                </span>

                <div className="chart-track">

                  <div
                    className="chart-loss"
                    style={{
                      height: `${Math.max(
                        5,
                        (chart.negative /
                          chart.max) *
                          100
                      )}%`,
                    }}
                  />

                </div>

                <b>
                  -${usdNumber.format(
                    chart.negative
                  )}
                </b>

              </div>

            </div>

          </div>

        </section>


        {/* SESSIONS */}
        <section className="section">

          <div className="section-heading">

            <div>
              <span className="section-kicker">
                TRADING SESSIONS
              </span>

              <h2>
                سشن‌های معاملاتی
              </h2>

              <p>
                پایان هر سشن توسط موتور AI بررسی و کارنامه آن
                برای Telegram ارسال می‌شود.
              </p>
            </div>

          </div>


          <div className="sessions-grid">

            {sessions.map((session) => {

              const active =
                meta?.session === session.name;

              return (
                <div
                  key={session.name}
                  className={
                    active
                      ? "session-card active"
                      : "session-card"
                  }
                >

                  <div className="session-icon">
                    {session.icon}
                  </div>

                  <div className="session-content">

                    <strong>
                      {session.name}
                    </strong>

                    <span>
                      {session.time}
                    </span>

                    <small>
                      {session.description}
                    </small>

                  </div>

                  <div
                    className={
                      active
                        ? "session-live"
                        : "session-wait"
                    }
                  >
                    {active
                      ? "● فعال"
                      : "آماده"}
                  </div>

                </div>
              );

            })}

          </div>

        </section>


        {/* ANALYSIS ENGINE */}
        <section className="analysis-grid">

          <div className="card">

            <div className="section-heading">

              <div>
                <span className="section-kicker">
                  AI ENGINE
                </span>

                <h2>
                  موتور تأیید چندلایه
                </h2>

                <p>
                  قبل از ثبت تحلیل، چند فاکتور بررسی می‌شوند.
                </p>
              </div>

              <div className="score-circle">
                {meta?.score ?? 0}
                <small>/100</small>
              </div>

            </div>


            <div className="engine-list">

              {[
                "Trend",
                "Market Structure",
                "Momentum",
                "Liquidity",
                "Pullback",
                "Candle",
                "Support / Resistance",
                "Multi-Timeframe",
                "Session",
                "News Filter",
                "Risk Engine",
              ].map((item) => (

                <div
                  className="engine-item"
                  key={item}
                >

                  <span>
                    ✓
                  </span>

                  <strong>
                    {item}
                  </strong>

                </div>

              ))}

            </div>

          </div>


          {/* MARKET LEVELS */}
          <div className="card">

            <div className="section-heading">

              <div>
                <span className="section-kicker">
                  MARKET STRUCTURE
                </span>

                <h2>
                  ساختار بازار
                </h2>

                <p>
                  سطوح ثبت‌شده توسط تحلیل AI
                </p>
              </div>

            </div>


            <div className="structure-list">

              <StructureRow
                title="Support"
                value={
                  meta?.analysis?.support
                }
              />

              <StructureRow
                title="Resistance"
                value={
                  meta?.analysis?.resistance
                }
              />

              <StructureRow
                title="ATR"
                value={
                  meta?.analysis?.atr
                }
              />

              <StructureRow
                title="Current Price"
                value={
                  meta?.currentPrice
                }
              />

            </div>

          </div>

        </section>


        {/* TRADE EVENTS */}
        <section className="card events-card">

          <div className="section-heading">

            <div>
              <span className="section-kicker">
                TRADE EVENTS
              </span>

              <h2>
                رویدادهای معامله
              </h2>

              <p>
                TP1، TP2، TP3 و SL هر معامله جداگانه ثبت می‌شوند.
              </p>
            </div>

            {meta?.events?.length ? (
              <span className="event-count">
                {meta.events.length} رویداد
              </span>
            ) : null}

          </div>


          {meta?.events?.length ? (

            <div className="events-list">

              {[...meta.events]
                .reverse()
                .map((event, index) => (

                  <div
                    className="event-row"
                    key={`${event.type}-${event.at}-${index}`}
                  >

                    <div className="event-symbol">
                      {eventIcon(event.type)}
                    </div>

                    <div className="event-info">

                      <strong>
                        {eventLabel(event.type)}
                      </strong>

                      <span>
                        {formatDate(event.at)}
                      </span>

                    </div>

                    <div className="event-detail">

                      <span>
                        قیمت
                      </span>

                      <strong>
                        {formatPrice(
                          event.price
                        )}
                      </strong>

                    </div>

                    <div className="event-detail">

                      <span>
                        حجم
                      </span>

                      <strong>
                        {event.lotClosed.toFixed(2)}
                        {" LOT"}
                      </strong>

                    </div>

                    <div className="event-profit">

                      <strong
                        className={
                          event.pnlUsd >= 0
                            ? "green"
                            : "red"
                        }
                      >
                        {formatUsd(
                          event.pnlUsd
                        )}
                      </strong>

                      <span>
                        🇮🇷{" "}
                        {formatToman(
                          event.pnlToman
                        )}
                      </span>

                    </div>

                  </div>

                ))}

            </div>

          ) : (

            <div className="empty-state">
              هنوز TP یا SL برای تحلیل فعالی ثبت نشده است.
            </div>

          )}

        </section>


        {/* RECENT ANALYSES */}
        <section className="card recent-card">

          <div className="section-heading">

            <div>
              <span className="section-kicker">
                AI HISTORY
              </span>

              <h2>
                آخرین تحلیل‌های هوش مصنوعی
              </h2>

              <p>
                فقط XAUUSD
              </p>
            </div>

          </div>


          {data?.performance?.recent?.length ? (

            <div className="history-list">

              {data.performance.recent.map(
                (run) => {

                  const runMeta =
                    run.metadata;

                  const runPnl =
                    runMeta?.events?.reduce(
                      (sum, event) =>
                        sum + Number(
                          event.pnlUsd || 0
                        ),
                      0
                    ) || 0;

                  return (
                    <div
                      className="history-row"
                      key={run.id}
                    >

                      <div className="history-date">
                        {formatDate(
                          run.createdAt
                        )}
                      </div>

                      <div>
                        {runMeta?.direction ===
                        "BUY"
                          ? "🟢 BUY"
                          : "🔴 SELL"}
                      </div>

                      <div>
                        {sessionIcon(
                          runMeta?.session
                        )}{" "}
                        {runMeta?.session ||
                          "—"}
                      </div>

                      <div>
                        {runMeta?.timeframe ||
                          "—"}
                      </div>

                      <div>
                        {runMeta?.score ?? "—"}
                        /100
                      </div>

                      <div
                        className={
                          runPnl >= 0
                            ? "green"
                            : "red"
                        }
                      >
                        {formatUsd(runPnl)}
                      </div>

                    </div>
                  );

                }
              )}

            </div>

          ) : (

            <div className="empty-state">
              هنوز تحلیل AI ثبت نشده است.
            </div>

          )}

        </section>


        {/* FIXED RULES */}
        <section className="rules-card">

          <div className="rules-title">
            ⚙️ قوانین ثابت موتور معامله
          </div>

          <div className="rules-grid">

            <Rule
              title="Symbol"
              value="XAUUSD"
            />

            <Rule
              title="Total Lot"
              value="0.10"
            />

            <Rule
              title="TP1"
              value="0.04 LOT · +$20"
            />

            <Rule
              title="TP2"
              value="0.03 LOT · +$24"
            />

            <Rule
              title="TP3"
              value="0.03 LOT · +$36"
            />

            <Rule
              title="Stop Loss"
              value="0.10 LOT · -$40"
            />

            <Rule
              title="Maximum Profit"
              value="+$80"
            />

            <Rule
              title="After TP1"
              value="Break-even"
            />

          </div>

        </section>


        {/* FOOTER */}
        <footer className="footer">

          <div>
            🤖 AI Analysis · XAUUSD
          </div>

          <div>
            حجم 0.10 LOT · TP1 0.04 · TP2 0.03 · TP3 0.03
          </div>

          <div>
            {lastUpdate
              ? `آخرین بروزرسانی: ${formatDate(
                  lastUpdate
                )}`
              : "در حال اتصال..."}

          </div>

        </footer>

      </div>
    </main>
  );
}


/* =========================
   COMPONENTS
========================= */

function LevelCard({
  title,
  label,
  value,
  type,
  moneyUsd,
  moneyToman,
}: {
  title: string;
  label: string;
  value?: number;
  type: "entry" | "stop" | "tp";
  moneyUsd?: number;
  moneyToman?: number;
}) {
  return (
    <div className={`level-card ${type}`}>

      <div className="level-top">
        <span>
          {title}
        </span>

        <small>
          {label}
        </small>
      </div>

      <strong className="level-price">
        {formatPrice(value)}
      </strong>

      {moneyUsd !== undefined && (
        <div
          className={
            moneyUsd >= 0
              ? "level-money green"
              : "level-money red"
          }
        >
          {formatUsd(moneyUsd)}
        </div>
      )}

      {moneyToman !== undefined && (
        <div className="level-toman">
          🇮🇷 {formatToman(moneyToman)}
        </div>
      )}

    </div>
  );
}


function SummaryCard({
  icon,
  title,
  value,
  sub,
  danger,
  success,
}: {
  icon: string;
  title: string;
  value: string;
  sub: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="summary-card">

      <div className="summary-icon">
        {icon}
      </div>

      <span>
        {title}
      </span>

      <strong
        className={
          danger
            ? "red"
            : success
            ? "green"
            : ""
        }
      >
        {value}
      </strong>

      <small>
        {sub}
      </small>

    </div>
  );
}


function Metric({
  title,
  value,
  icon,
  sub,
  danger,
  success,
}: {
  title: string;
  value: string;
  icon: string;
  sub?: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="metric">

      <div className="metric-icon">
        {icon}
      </div>

      <span>
        {title}
      </span>

      <strong
        className={
          danger
            ? "red"
            : success
            ? "green"
            : ""
        }
      >
        {value}
      </strong>

      {sub && (
        <small>
          {sub}
        </small>
      )}

    </div>
  );
}


function StructureRow({
  title,
  value,
}: {
  title: string;
  value?: number;
}) {
  return (
    <div className="structure-row">

      <span>
        {title}
      </span>

      <strong>
        {value !== undefined
          ? formatPrice(value)
          : "—"}
      </strong>

    </div>
  );
}


function Rule({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rule">

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function calculateEventsPnl(
  meta: AnalysisMeta | null
) {
  if (!meta?.events?.length) {
    return 0;
  }

  return meta.events.reduce(
    (sum, event) =>
      sum + Number(event.pnlUsd || 0),
    0
  );
}


function calculateRemainingLot(
  meta: AnalysisMeta
) {
  let remaining = meta.totalLot;

  for (const event of meta.events || []) {
    if (
      event.type === "TP1" ||
      event.type === "TP2" ||
      event.type === "TP3"
    ) {
      remaining -= event.lotClosed;
    }
  }

  return Math.max(
    0,
    remaining
  ).toFixed(2);
}


/* =========================
   STYLES
========================= */

const styles = `
*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#050607;
  color:#f5f7fa;
  font-family:Tahoma,Arial,sans-serif;
}

button{
  font-family:inherit;
}

.ai-page{
  min-height:100vh;
  padding:24px;
  background:
    radial-gradient(
      circle at 15% 0%,
      rgba(194,147,47,.16),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(37,93,61,.13),
      transparent 25%
    ),
    linear-gradient(
      145deg,
      #030405,
      #090a0c 55%,
      #050505
    );
}

.page-shell{
  width:100%;
  max-width:1500px;
  margin:auto;
}


/* HEADER */

.header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  margin-bottom:20px;
}

.brand-area{
  display:flex;
  align-items:center;
  gap:16px;
}

.brand-icon{
  width:62px;
  height:62px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:20px;
  font-size:30px;
  background:
    linear-gradient(
      145deg,
      #e1b74e,
      #6f5014
    );
  box-shadow:
    0 15px 40px rgba(208,162,53,.20);
}

.eyebrow,
.section-kicker{
  color:#d9ad45;
  font-size:11px;
  letter-spacing:3px;
  font-weight:900;
}

.header h1{
  margin:6px 0;
  font-size:34px;
  font-weight:950;
}

.header p{
  margin:0;
  color:#8f96a1;
  font-size:15px;
}

.header-actions{
  display:flex;
  align-items:center;
  gap:10px;
}

.system-status{
  padding:12px 15px;
  border:1px solid rgba(77,215,112,.25);
  background:#0a1710;
  color:#6ee58c;
  border-radius:14px;
  font-size:13px;
  font-weight:900;
}

.status-dot{
  width:8px;
  height:8px;
  display:inline-block;
  border-radius:50%;
  background:#53db72;
  margin-left:7px;
  box-shadow:0 0 14px #53db72;
}

.refresh-button{
  border:1px solid #ffffff16;
  background:#141619;
  color:#fff;
  border-radius:14px;
  padding:12px 17px;
  font-weight:900;
  cursor:pointer;
}

.refresh-button:hover{
  border-color:#d3a63f;
}

.refresh-button:disabled{
  opacity:.6;
  cursor:not-allowed;
}


/* DISCLAIMER */

.ai-disclaimer{
  display:flex;
  align-items:center;
  gap:15px;
  padding:18px;
  margin-bottom:18px;
  border-radius:19px;
  border:1px solid rgba(218,173,69,.20);
  background:
    linear-gradient(
      120deg,
      rgba(60,45,13,.55),
      rgba(14,15,17,.90)
    );
}

.ai-disclaimer-icon{
  width:48px;
  height:48px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:15px;
  background:#201a0c;
  font-size:24px;
}

.ai-disclaimer strong{
  color:#e4bd61;
  font-size:17px;
}

.ai-disclaimer p{
  margin:6px 0 0;
  color:#a5abb5;
  line-height:1.9;
  font-size:13px;
}

.error-box{
  padding:15px 18px;
  margin-bottom:18px;
  border-radius:15px;
  background:#241010;
  border:1px solid #6c2929;
  color:#ff9a9a;
}


/* CARDS */

.card,
.market-card,
.level-card,
.summary-card,
.session-card{
  background:
    linear-gradient(
      145deg,
      rgba(20,21,24,.95),
      rgba(10,11,13,.92)
    );
  border:1px solid #ffffff10;
  box-shadow:
    0 20px 60px rgba(0,0,0,.45);
  backdrop-filter:blur(18px);
}


/* MARKET */

.market-grid{
  display:grid;
  grid-template-columns:1.55fr .9fr;
  gap:16px;
}

.market-card{
  min-height:260px;
  padding:25px;
  border-radius:23px;
}

.main-market{
  background:
    radial-gradient(
      circle at 20% 20%,
      rgba(199,155,54,.12),
      transparent 40%
    ),
    linear-gradient(
      145deg,
      #18150e,
      #0b0d10
    );
}

.market-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.symbol{
  display:flex;
  align-items:center;
  gap:13px;
}

.gold-ball{
  font-size:34px;
}

.symbol strong{
  display:block;
  font-size:22px;
}

.symbol small{
  display:block;
  color:#767d88;
  font-size:11px;
  margin-top:4px;
}

.direction{
  padding:10px 14px;
  border-radius:12px;
  font-weight:950;
  font-size:14px;
}

.direction.buy{
  color:#62e48b;
  background:#0c2013;
  border:1px solid #245a36;
}

.direction.sell{
  color:#ff7777;
  background:#230d0d;
  border:1px solid #642525;
}

.direction.neutral{
  color:#aeb4be;
  background:#16181b;
  border:1px solid #ffffff0d;
}

.live-price-label{
  color:#7e858f;
  margin-top:35px;
  font-size:13px;
}

.live-price{
  margin-top:7px;
  font-size:57px;
  font-weight:950;
  letter-spacing:1px;
}

.price-source{
  color:#676e79;
  margin-top:5px;
  font-size:12px;
}

.market-meta{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
  margin-top:28px;
  padding-top:17px;
  border-top:1px solid #ffffff0d;
}

.market-meta span{
  display:block;
  color:#747b86;
  font-size:12px;
  margin-bottom:6px;
}

.market-meta strong{
  color:#e9edf2;
  font-size:14px;
}

.gold-text{
  color:#e2b650 !important;
}

.currency-card{
  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(218,172,67,.13),
      transparent 38%
    ),
    #0d0f11;
}

.currency-title{
  color:#aeb4bd;
  font-size:14px;
}

.currency-big{
  color:#e5bd5b;
  font-size:38px;
  font-weight:950;
  margin-top:20px;
}

.currency-unit{
  color:#818894;
  font-size:13px;
}

.currency-date{
  margin-top:22px;
  color:#8d949e;
  line-height:1.8;
  font-size:12px;
}

.real-rate{
  margin-top:18px;
  padding:12px;
  border-radius:12px;
  background:#141209;
  color:#b8aa84;
  line-height:1.9;
  font-size:11px;
}


/* SECTION */

.section{
  margin-top:25px;
}

.section-heading{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:15px;
  margin-bottom:16px;
}

.section-heading h2{
  margin:5px 0;
  font-size:23px;
}

.section-heading p{
  margin:0;
  color:#818894;
  font-size:13px;
}

.contract-badge,
.event-count{
  padding:10px 13px;
  border-radius:12px;
  color:#d9ae48;
  background:#19150a;
  border:1px solid #4c3a15;
  font-size:12px;
  font-weight:900;
}


/* LEVELS */

.levels-grid{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:12px;
}

.level-card{
  padding:18px;
  min-height:160px;
  border-radius:19px;
}

.level-card.entry{
  border-color:#ffffff12;
}

.level-card.stop{
  border-color:#692929;
  background:
    linear-gradient(
      145deg,
      #211011,
      #0d0c0d
    );
}

.level-card.tp{
  border-color:#584418;
  background:
    linear-gradient(
      145deg,
      #1e180c,
      #0d0d0d
    );
}

.level-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:8px;
}

.level-top span{
  color:#e6e9ed;
  font-size:14px;
  font-weight:950;
}

.level-top small{
  color:#858c97;
  font-size:10px;
  text-align:left;
}

.level-price{
  display:block;
  margin:22px 0 10px;
  font-size:29px;
}

.level-card.stop .level-price{
  color:#ff7777;
}

.level-card.tp .level-price{
  color:#e2b650;
}

.level-money{
  font-size:16px;
  font-weight:950;
}

.level-toman{
  margin-top:6px;
  color:#aeb4bd;
  font-size:11px;
}


/* SUMMARY */

.summary-grid{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:10px;
  margin-top:16px;
}

.summary-card{
  border-radius:17px;
  padding:17px;
}

.summary-icon{
  font-size:22px;
  margin-bottom:13px;
}

.summary-card > span{
  display:block;
  color:#858c97;
  font-size:12px;
}

.summary-card > strong{
  display:block;
  margin:8px 0;
  font-size:23px;
}

.summary-card > small{
  color:#9299a3;
  font-size:11px;
}


/* CURRENT TRADE */

.current-trade{
  margin-top:16px;
  padding:22px;
  border-radius:22px;
}

.be-badge{
  padding:10px 14px;
  border-radius:12px;
  color:#8d949d;
  background:#15171a;
  border:1px solid #ffffff0d;
  font-size:12px;
  font-weight:900;
}

.be-badge.active{
  color:#6de28b;
  background:#0c1d12;
  border-color:#275b38;
}

.trade-status{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
}

.trade-state{
  padding:16px;
  border-radius:15px;
  background:#0c0e11;
  border:1px solid #ffffff0b;
}

.trade-state span{
  display:block;
  color:#737a85;
  font-size:12px;
  margin-bottom:8px;
}

.trade-state strong{
  font-size:16px;
}


/* PERFORMANCE */

.performance{
  margin-top:16px;
  padding:23px;
  border-radius:22px;
}

.period-tabs{
  display:flex;
  gap:7px;
}

.period-tabs button{
  border:1px solid #ffffff10;
  background:#111316;
  color:#aeb4bd;
  border-radius:11px;
  padding:10px 14px;
  cursor:pointer;
  font-weight:900;
}

.period-tabs button:hover{
  border-color:#c69a38;
}

.period-tabs button.selected{
  color:#171208;
  background:#d5aa43;
  border-color:#d5aa43;
}

.performance-grid{
  display:grid;
  grid-template-columns:repeat(8,1fr);
  gap:9px;
}

.metric{
  padding:15px;
  border-radius:15px;
  background:#0b0d10;
  border:1px solid #ffffff0b;
}

.metric-icon{
  font-size:18px;
  margin-bottom:10px;
}

.metric span{
  display:block;
  color:#747b86;
  font-size:11px;
}

.metric strong{
  display:block;
  margin-top:7px;
  font-size:24px;
}

.metric small{
  display:block;
  margin-top:4px;
  color:#838a95;
  font-size:10px;
}

.net-profit{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
  margin-top:12px;
}

.net-profit > div{
  padding:18px;
  border-radius:16px;
  background:#111316;
  border:1px solid #ffffff0b;
}

.net-profit span{
  display:block;
  color:#777e88;
  font-size:12px;
}

.net-profit strong{
  display:block;
  margin-top:8px;
  font-size:25px;
}

.chart-card{
  margin-top:15px;
  padding:18px;
  border-radius:17px;
  background:#0a0c0f;
  border:1px solid #ffffff0b;
}

.chart-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.chart-header strong{
  display:block;
}

.chart-header span{
  display:block;
  color:#737a85;
  font-size:11px;
  margin-top:4px;
}

.chart{
  height:190px;
  display:flex;
  justify-content:center;
  align-items:flex-end;
  gap:45px;
  margin-top:15px;
}

.chart-column{
  height:100%;
  width:80px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-end;
  gap:7px;
}

.chart-column > span{
  color:#808792;
  font-size:11px;
}

.chart-column > b{
  font-size:11px;
}

.chart-track{
  height:135px;
  width:34px;
  display:flex;
  align-items:flex-end;
  overflow:hidden;
  background:#17191d;
  border-radius:10px;
}

.chart-profit{
  width:100%;
  background:linear-gradient(
    180deg,
    #58df83,
    #153b23
  );
  border-radius:10px 10px 0 0;
}

.chart-loss{
  width:100%;
  background:linear-gradient(
    180deg,
    #ff7272,
    #4b1b1b
  );
  border-radius:10px 10px 0 0;
}


/* SESSIONS */

.sessions-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
}

.session-card{
  position:relative;
  display:flex;
  align-items:center;
  gap:12px;
  padding:17px;
  border-radius:18px;
}

.session-card.active{
  border-color:#c39a39;
  box-shadow:
    0 0 0 1px rgba(195,154,57,.12),
    0 18px 50px rgba(0,0,0,.45);
}

.session-icon{
  width:46px;
  height:46px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:14px;
  background:#17191c;
  font-size:22px;
}

.session-content{
  min-width:0;
}

.session-content strong{
  display:block;
  font-size:15px;
}

.session-content span{
  display:block;
  color:#c8a64e;
  font-size:11px;
  margin-top:4px;
}

.session-content small{
  display:block;
  color:#737a84;
  font-size:10px;
  margin-top:4px;
}

.session-live,
.session-wait{
  margin-right:auto;
  font-size:10px;
  white-space:nowrap;
}

.session-live{
  color:#6ce18b;
}

.session-wait{
  color:#6f7680;
}


/* ANALYSIS */

.analysis-grid{
  display:grid;
  grid-template-columns:1.2fr .8fr;
  gap:16px;
  margin-top:25px;
}

.analysis-grid .card{
  padding:23px;
  border-radius:22px;
}

.score-circle{
  min-width:70px;
  height:70px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  border-radius:50%;
  color:#e2b650;
  background:#181307;
  border:2px solid #765b1e;
  font-size:22px;
  font-weight:950;
}

.score-circle small{
  color:#777e88;
  font-size:9px;
}

.engine-list{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:8px;
}

.engine-item{
  display:flex;
  align-items:center;
  gap:9px;
  padding:11px;
  border-radius:12px;
  background:#0c0e11;
  border:1px solid #ffffff0b;
}

.engine-item span{
  color:#61dd87;
  font-weight:950;
}

.engine-item strong{
  font-size:12px;
  color:#c8cdd4;
}

.structure-list{
  display:flex;
  flex-direction:column;
  gap:9px;
}

.structure-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:14px;
  border-radius:13px;
  background:#0c0e11;
  border:1px solid #ffffff0b;
}

.structure-row span{
  color:#858c96;
  font-size:12px;
}

.structure-row strong{
  font-size:17px;
  color:#e3e7eb;
}


/* EVENTS */

.events-card{
  margin-top:16px;
  padding:23px;
  border-radius:22px;
}

.events-list{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.event-row{
  display:grid;
  grid-template-columns:45px 1.5fr 1fr 1fr 1fr;
  align-items:center;
  gap:10px;
  padding:13px;
  border-radius:14px;
  background:#0b0d10;
  border:1px solid #ffffff0a;
}

.event-symbol{
  width:36px;
  height:36px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:10px;
  background:#16181c;
  font-size:18px;
}

.event-info strong{
  display:block;
  font-size:13px;
}

.event-info span{
  display:block;
  margin-top:4px;
  color:#707781;
  font-size:10px;
}

.event-detail span{
  display:block;
  color:#6f7680;
  font-size:10px;
}

.event-detail strong{
  display:block;
  margin-top:4px;
  font-size:13px;
}

.event-profit{
  text-align:left;
}

.event-profit strong{
  display:block;
  font-size:15px;
}

.event-profit span{
  display:block;
  color:#838a94;
  margin-top:4px;
  font-size:10px;
}


/* HISTORY */

.recent-card{
  margin-top:16px;
  padding:23px;
  border-radius:22px;
}

.history-list{
  display:flex;
  flex-direction:column;
}

.history-row{
  display:grid;
  grid-template-columns:1.4fr .7fr .9fr .7fr .6fr .7fr;
  gap:8px;
  padding:14px 8px;
  border-bottom:1px solid #ffffff0a;
  color:#c4cad2;
  font-size:12px;
}

.history-row:first-child{
  border-top:1px solid #ffffff0a;
}

.history-date{
  color:#818893;
}


/* RULES */

.rules-card{
  margin-top:16px;
  padding:21px;
  border-radius:21px;
  border:1px solid #ffffff10;
  background:
    linear-gradient(
      145deg,
      rgba(24,20,10,.92),
      rgba(12,13,15,.94)
    );
}

.rules-title{
  color:#dfb652;
  font-size:16px;
  font-weight:950;
  margin-bottom:14px;
}

.rules-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:9px;
}

.rule{
  padding:13px;
  border-radius:12px;
  background:#0c0e10;
  border:1px solid #ffffff0a;
}

.rule span{
  display:block;
  color:#777e87;
  font-size:10px;
}

.rule strong{
  display:block;
  color:#e3e7eb;
  margin-top:6px;
  font-size:12px;
}


/* EMPTY */

.empty-state{
  padding:45px 15px;
  text-align:center;
  color:#737a84;
  font-size:13px;
}


/* COLORS */

.green{
  color:#62e18a !important;
}

.red{
  color:#ff7171 !important;
}


/* FOOTER */

.footer{
  display:flex;
  justify-content:space-between;
  gap:15px;
  flex-wrap:wrap;
  padding:20px 5px 35px;
  color:#5e6670;
  font-size:10px;
}


/* TABLET */

@media(max-width:1200px){

  .summary-grid{
    grid-template-columns:repeat(3,1fr);
  }

  .performance-grid{
    grid-template-columns:repeat(4,1fr);
  }

  .levels-grid{
    grid-template-columns:repeat(3,1fr);
  }

  .sessions-grid{
    grid-template-columns:repeat(2,1fr);
  }

}


/* MOBILE */

@media(max-width:800px){

  .ai-page{
    padding:12px;
  }

  .header{
    flex-direction:column;
    align-items:stretch;
  }

  .header-actions{
    width:100%;
    justify-content:space-between;
  }

  .header h1{
    font-size:27px;
  }

  .header p{
    font-size:12px;
    line-height:1.8;
  }

  .brand-icon{
    width:52px;
    height:52px;
    font-size:24px;
  }

  .ai-disclaimer{
    align-items:flex-start;
  }

  .market-grid{
    grid-template-columns:1fr;
  }

  .market-meta{
    grid-template-columns:repeat(2,1fr);
  }

  .live-price{
    font-size:45px;
  }

  .levels-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .summary-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .trade-status{
    grid-template-columns:repeat(2,1fr);
  }

  .section-heading{
    align-items:flex-start;
    flex-direction:column;
  }

  .performance-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .net-profit{
    grid-template-columns:1fr;
  }

  .period-tabs{
    width:100%;
  }

  .period-tabs button{
    flex:1;
  }

  .analysis-grid{
    grid-template-columns:1fr;
  }

  .sessions-grid{
    grid-template-columns:1fr;
  }

  .engine-list{
    grid-template-columns:1fr;
  }

  .event-row{
    grid-template-columns:40px 1fr 1fr;
  }

  .event-detail{
    display:none;
  }

  .event-profit{
    text-align:left;
  }

  .history-row{
    grid-template-columns:1fr 1fr;
    gap:10px;
  }

  .rules-grid{
    grid-template-columns:repeat(2,1fr);
  }

}


/* SMALL MOBILE */

@media(max-width:500px){

  .brand-area{
    align-items:flex-start;
  }

  .ai-disclaimer{
    flex-direction:column;
  }

  .levels-grid{
    grid-template-columns:1fr;
  }

  .summary-grid{
    grid-template-columns:1fr 1fr;
  }

  .summary-card > strong{
    font-size:20px;
  }

  .market-card{
    padding:18px;
  }

  .currency-big{
    font-size:30px;
  }

  .trade-status{
    grid-template-columns:1fr;
  }

  .footer{
    flex-direction:column;
  }

}
`;
