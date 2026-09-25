"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const faNumber = new Intl.NumberFormat("fa-IR");
const usdNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

type Timeframe = "1min" | "5min" | "15min" | "30min" | "1h" | "4h";

type Candle = {
  datetime?: string;
  time?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type EventRow = {
  type: string;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
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

  createdAt?: string;

  events: EventRow[];

  analysis?: {
    reasons?: string[];
    support?: number;
    resistance?: number;
    atr?: number;
  };
};

type Performance = {
  trades: number;

  tp1: number;
  tp2: number;
  tp3: number;

  sl: number;
  breakeven: number;

  wins: number;
  losses: number;

  winRate: number;

  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;

  slToman: number;
  pnlUsd: number;
  pnlToman: number;
};

type RecentSignal = {
  id: string;
  createdAt: string;
  status: string;
  metadata: Meta;
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

  candles?: Candle[];

  currentPrice?: number;

  performance: {
    day: Performance;
    week: Performance;
    month: Performance;

    recent: RecentSignal[];
  };

  usdToToman: {
    rate: number;
    asOf: string;
    delayed?: boolean;
    delayedMinutes?: number;
  } | null;
};

const EMPTY_PERFORMANCE: Performance = {
  trades: 0,
  tp1: 0,
  tp2: 0,
  tp3: 0,
  sl: 0,
  breakeven: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  tp1Toman: 0,
  tp2Toman: 0,
  tp3Toman: 0,
  slToman: 0,
  pnlUsd: 0,
  pnlToman: 0,
};

const TIMEFRAMES: {
  id: Timeframe;
  label: string;
}[] = [
  { id: "1min", label: "1M" },
  { id: "5min", label: "5M" },
  { id: "15min", label: "15M" },
  { id: "30min", label: "30M" },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
];

export default function AIAnalysisPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>("1min");

  const [period, setPeriod] = useState<
    "day" | "week" | "month"
  >("day");

  const [loading, setLoading] = useState(true);
  const [changingTimeframe, setChangingTimeframe] = useState(false);

  const [error, setError] = useState("");

  const load = useCallback(
    async (selectedTimeframe: Timeframe = timeframe) => {
      try {
        setError("");

        const response = await fetch(
          `/api/ai-analysis?timeframe=${encodeURIComponent(
            selectedTimeframe
          )}`,
          {
            cache: "no-store",
          }
        );

        const json = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(
            json.error || "دریافت اطلاعات بازار انجام نشد."
          );
        }

        setData(json.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "خطای ارتباط با موتور تحلیل"
        );
      } finally {
        setLoading(false);
        setChangingTimeframe(false);
      }
    },
    [timeframe]
  );

  useEffect(() => {
    load(timeframe);

    const timer = window.setInterval(() => {
      load(timeframe);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [load, timeframe]);

  const activeSignal =
    data?.active?.metadata ||
    null;

  const latestSignal =
    data?.latest?.metadata ||
    null;

  const signal =
    activeSignal ||
    latestSignal ||
    null;

  const performance =
    data?.performance?.[period] ||
    EMPTY_PERFORMANCE;

  const candles = useMemo(() => {
    return Array.isArray(data?.candles)
      ? data!.candles.filter(
          (c) =>
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close)
        )
      : [];
  }, [data?.candles]);

  function changeTimeframe(next: Timeframe) {
    if (next === timeframe) return;

    setChangingTimeframe(true);
    setTimeframe(next);
    load(next);
  }

  return (
    <main
      dir="rtl"
      className="ai-root"
    >
      <style>{styles}</style>

      <div className="ai-container">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="ai-header">

          <div className="brand">

            <div className="brand-icon">
              AI
            </div>

            <div>
              <div className="brand-mini">
                TRADING AI
              </div>

              <h1>
                تحلیل هوشمند طلا
              </h1>

              <p>
                XAUUSD · Real Market Engine
              </p>
            </div>

          </div>

          <div className="header-status">

            <div className="connection">
              <span className="connection-dot" />
              LIVE MARKET
            </div>

            <button
              className="refresh-button"
              onClick={() => load(timeframe)}
              disabled={loading}
            >
              {loading ? "در حال اتصال..." : "↻ بروزرسانی"}
            </button>

          </div>

        </header>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="error-box">
            <span>⚠️</span>
            <div>
              <strong>
                ارتباط با موتور بازار
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            REAL MARKET CHART
        ====================================================== */}

        <section className="market-section">

          <div className="market-top">

            <div className="market-title">

              <div className="gold-dot" />

              <div>
                <strong>
                  XAUUSD
                </strong>

                <span>
                  GOLD SPOT
                </span>
              </div>

            </div>

            <div className="market-live">

              <span className="pulse" />

              قیمت بازار

              <strong>
                {formatPrice(
                  data?.currentPrice ||
                    signal?.currentPrice ||
                    0
                )}
              </strong>

            </div>

          </div>

          <div className="timeframes">

            {TIMEFRAMES.map((item) => (

              <button
                key={item.id}
                className={
                  timeframe === item.id
                    ? "timeframe active"
                    : "timeframe"
                }
                onClick={() =>
                  changeTimeframe(item.id)
                }
              >
                {item.label}
              </button>

            ))}

          </div>

          <div className="chart-container">

            {candles.length > 0 ? (
              <LiveCandlestickChart
                candles={candles}
                signal={activeSignal}
              />
            ) : (
              <div className="chart-loading">

                <div className="chart-loader" />

                <strong>
                  {changingTimeframe
                    ? "در حال دریافت تایم‌فریم..."
                    : "در انتظار داده واقعی بازار..."}
                </strong>

                <span>
                  نمودار فقط از داده واقعی XAUUSD
                  ساخته می‌شود.
                </span>

              </div>
            )}

          </div>

          <div className="chart-footer">

            <span>
              ● داده بازار
            </span>

            <span>
              {timeframeLabel(timeframe)}
            </span>

            <span>
              {candles.length
                ? `${candles.length} کندل`
                : "بدون داده"}
            </span>

            <span>
              بروزرسانی خودکار
            </span>

          </div>

        </section>

        {/* =====================================================
            SIGNAL BOX
        ====================================================== */}

        <section className="signal-section">

          <div className="section-heading">

            <div>
              <span>
                AI SIGNAL
              </span>

              <h2>
                سیگنال فعال
              </h2>
            </div>

            <div
              className={
                activeSignal
                  ? "signal-status active"
                  : "signal-status"
              }
            >
              <span />
              {activeSignal
                ? "معامله فعال"
                : "سیگنال فعال نیست"}
            </div>

          </div>

          {!signal ? (

            <div className="no-signal">

              <div className="no-signal-icon">
                ◈
              </div>

              <strong>
                در حال حاضر سیگنال فعالی وجود ندارد
              </strong>

              <span>
                موتور هوش مصنوعی بازار را برای
                فرصت مناسب XAUUSD بررسی می‌کند.
              </span>

            </div>

          ) : (

            <SignalCard
              signal={signal}
              active={Boolean(activeSignal)}
            />

          )}

        </section>

        {/* =====================================================
            RISK FREE
        ====================================================== */}

        <section className="riskfree-section">

          <div className="section-heading">

            <div>
              <span>
                TRADE MANAGEMENT
              </span>

              <h2>
                مدیریت ریسک‌فری
              </h2>
            </div>

            <div className="safe-badge">
              محافظت از سود
            </div>

          </div>

          <div className="risk-grid">

            <div className="risk-step">

              <div className="step-number">
                01
              </div>

              <div>
                <strong>
                  قبل از TP1
                </strong>

                <p>
                  اگر قیمت مستقیماً به حد ضرر
                  برسد، نتیجه معامله
                  <b className="danger-text">
                    -$40
                  </b>
                  خواهد بود.
                </p>
              </div>

            </div>

            <div className="risk-arrow">
              ←
            </div>

            <div className="risk-step highlight">

              <div className="step-number">
                02
              </div>

              <div>
                <strong>
                  TP1 فعال شد
                </strong>

                <p>
                  TP1 با حجم
                  <b>0.04 lot</b>
                  بسته می‌شود و
                  <b className="success-text">
                    +$20
                  </b>
                  ثبت می‌شود.
                </p>
              </div>

            </div>

            <div className="risk-arrow">
              ←
            </div>

            <div className="risk-step safe">

              <div className="step-number">
                03
              </div>

              <div>
                <strong>
                  Risk Free
                </strong>

                <p>
                  حد ضرر حجم باقی‌مانده
                  به نقطه ورود منتقل می‌شود.
                  بنابراین برگشت قیمت به Entry
                  باخت محسوب نمی‌شود.
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            LOT / PROFIT PLAN
        ====================================================== */}

        <section className="plan-section">

          <div className="section-heading">

            <div>
              <span>
                POSITION PLAN
              </span>

              <h2>
                ساختار حجم و سود
              </h2>
            </div>

            <div className="total-lot">
              حجم کل
              <strong>
                0.10
              </strong>
              lot
            </div>

          </div>

          <div className="plan-grid">

            <ProfitCard
              number="01"
              title="TP1"
              lot="0.04"
              profit="$20"
              percent="40%"
              className="tp1"
            />

            <ProfitCard
              number="02"
              title="TP2"
              lot="0.03"
              profit="$24"
              percent="30%"
              className="tp2"
            />

            <ProfitCard
              number="03"
              title="TP3"
              lot="0.03"
              profit="$36"
              percent="30%"
              className="tp3"
            />

            <div className="total-profit">

              <span>
                TOTAL POTENTIAL
              </span>

              <strong>
                +$80
              </strong>

              <small>
                TP1 + TP2 + TP3
              </small>

            </div>

          </div>

          <div className="plan-note">

            <span>i</span>

            <p>
              مدل مدیریت معامله به‌صورت مرحله‌ای است:
              ابتدا بخشی از حجم در TP1 بسته می‌شود،
              سپس حجم باقی‌مانده وارد وضعیت Risk Free
              می‌شود و TP2 و TP3 ادامه پیدا می‌کنند.
            </p>

          </div>

        </section>

        {/* =====================================================
            PERFORMANCE
        ====================================================== */}

        <section className="performance-section">

          <div className="section-heading">

            <div>
              <span>
                PERFORMANCE
              </span>

              <h2>
                کارنامه معاملاتی
              </h2>

              <p>
                فقط معاملات ثبت‌شده توسط موتور
              </p>
            </div>

            <div className="period-tabs">

              {[
                ["day", "امروز"],
                ["week", "هفته"],
                ["month", "ماه"],
              ].map(([key, label]) => (

                <button
                  key={key}
                  className={
                    period === key
                      ? "period active"
                      : "period"
                  }
                  onClick={() =>
                    setPeriod(
                      key as
                        | "day"
                        | "week"
                        | "month"
                    )
                  }
                >
                  {label}
                </button>

              ))}

            </div>

          </div>

          <div className="performance-grid">

            <Metric
              title="تعداد معاملات"
              value={String(performance.trades)}
              icon="▣"
            />

            <Metric
              title="TP1"
              value={String(performance.tp1)}
              sub={`+${
                performance.tp1 * 20
              }`}
              icon="1"
              success
            />

            <Metric
              title="TP2"
              value={String(performance.tp2)}
              sub={`+${
                performance.tp2 * 24
              }`}
              icon="2"
              success
            />

            <Metric
              title="TP3"
              value={String(performance.tp3)}
              sub={`+${
                performance.tp3 * 36
              }`}
              icon="3"
              success
            />

            <Metric
              title="استاپ"
              value={String(performance.sl)}
              sub={`-${
                performance.sl * 40
              }`}
              icon="×"
              danger
            />

            <Metric
              title="Risk Free"
              value={String(
                performance.breakeven
              )}
              icon="✓"
              success
            />

          </div>

          <div className="performance-bottom">

            <div className="winrate-card">

              <div className="winrate-ring">

                <div>
                  <strong>
                    {Number(
                      performance.winRate || 0
                    ).toFixed(1)}
                    %
                  </strong>

                  <span>
                    Win Rate
                  </span>
                </div>

              </div>

              <div className="winrate-info">

                <span>
                  عملکرد معاملات
                </span>

                <strong>
                  {performance.wins}
                  {" "}
                  برد
                </strong>

                <small>
                  {performance.losses}
                  {" "}
                  باخت
                </small>

              </div>

            </div>

            <div className="net-profit-card">

              <span>
                NET RESULT
              </span>

              <strong
                className={
                  performance.pnlUsd >= 0
                    ? "success-text"
                    : "danger-text"
                }
              >
                {performance.pnlUsd >= 0
                  ? "+"
                  : ""}
                {money(
                  performance.pnlUsd
                )}
              </strong>

              <small>
                {performance.pnlToman >= 0
                  ? "+"
                  : "-"}
                {toman(
                  Math.abs(
                    performance.pnlToman
                  )
                )}
              </small>

            </div>

          </div>

        </section>

        {/* =====================================================
            RECENT TRADES
        ====================================================== */}

        <section className="history-section">

          <div className="section-heading">

            <div>
              <span>
                TRADE HISTORY
              </span>

              <h2>
                آخرین معاملات
              </h2>
            </div>

          </div>

          <div className="history-list">

            {data?.performance?.recent?.length ? (

              data.performance.recent
                .slice(0, 10)
                .map((item) => {

                  const m =
                    item.metadata;

                  const pnl =
                    m?.events?.reduce(
                      (sum, event) =>
                        sum +
                        Number(
                          event.pnlUsd || 0
                        ),
                      0
                    ) || 0;

                  return (
                    <div
                      className="history-row"
                      key={item.id}
                    >

                      <div className="history-direction">

                        <span
                          className={
                            m.direction ===
                            "BUY"
                              ? "direction buy"
                              : "direction sell"
                          }
                        >
                          {m.direction ===
                          "BUY"
                            ? "BUY"
                            : "SELL"}
                        </span>

                        <div>
                          <strong>
                            XAUUSD
                          </strong>

                          <small>
                            {dateFa(
                              item.createdAt
                            )}
                          </small>
                        </div>

                      </div>

                      <div>
                        <span>
                          Entry
                        </span>

                        <strong>
                          {formatPrice(
                            m.entry
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          وضعیت
                        </span>

                        <strong>
                          {stateFa(
                            item.status ||
                              m.state
                          )}
                        </strong>
                      </div>

                      <div className="history-result">

                        <span>
                          نتیجه
                        </span>

                        <strong
                          className={
                            pnl >= 0
                              ? "success-text"
                              : "danger-text"
                          }
                        >
                          {pnl >= 0
                            ? "+"
                            : ""}
                          {money(pnl)}
                        </strong>

                      </div>

                    </div>
                  );
                })

            ) : (

              <div className="history-empty">
                هنوز معامله‌ای ثبت نشده است.
              </div>

            )}

          </div>

        </section>

        {/* =====================================================
            ENGINE SETTINGS
        ====================================================== */}

        <section className="settings-section">

          <div className="section-heading">

            <div>
              <span>
                ENGINE SETTINGS
              </span>

              <h2>
                تنظیمات موتور تحلیل
              </h2>
            </div>

            <div className="settings-status">
              ● آماده پایش
            </div>

          </div>

          <div className="settings-grid">

            <Setting
              title="نماد"
              value="XAUUSD"
            />

            <Setting
              title="حجم کل"
              value="0.10 LOT"
            />

            <Setting
              title="ریسک اولیه"
              value="-$40"
            />

            <Setting
              title="TP Management"
              value="3 مراحل"
            />

            <Setting
              title="Risk Free"
              value="بعد از TP1"
            />

            <Setting
              title="Timeframes"
              value="1M → 4H"
            />

            <Setting
              title="Market Data"
              value="REAL"
            />

            <Setting
              title="Telegram"
              value="CONNECTED"
            />

          </div>

        </section>

        {/* =====================================================
            TELEGRAM
        ====================================================== */}

        <section className="telegram-section">

          <div className="telegram-icon">
            ✈
          </div>

          <div className="telegram-content">

            <span>
              TELEGRAM AUTOMATION
            </span>

            <h3>
              کارنامه و رویدادهای معامله
              به تلگرام ارسال می‌شوند
            </h3>

            <p>
              صدور سیگنال، TP1، فعال‌شدن Risk Free،
              TP2، TP3، Stop Loss و نتیجه نهایی
              باید توسط موتور اصلی در تلگرام ثبت شود.
            </p>

          </div>

          <div className="telegram-state">
            <span />
            آماده
          </div>

        </section>

        {/* =====================================================
            DISCLAIMER
        ====================================================== */}

        <div className="disclaimer">

          <strong>
            ⚠️ توضیح سیستم
          </strong>

          <span>
            این بخش تحلیل بازار توسط موتور هوش مصنوعی
            است و سود را تضمین نمی‌کند. قیمت‌ها و نتایج
            باید فقط از داده واقعی بازار و رویدادهای
            ثبت‌شده توسط سرور محاسبه شوند.
          </span>

        </div>

        <footer className="page-footer">
          TRADING AI · XAUUSD · REAL MARKET ANALYSIS
        </footer>

      </div>
    </main>
  );
}

/* ============================================================
   SIGNAL CARD
============================================================ */

function SignalCard({
  signal,
  active,
}: {
  signal: Meta;
  active: boolean;
}) {
  const buy = signal.direction === "BUY";

  return (
    <div className="signal-card">

      <div className="signal-main">

        <div className="signal-direction">

          <div
            className={
              buy
                ? "direction-large buy-bg"
                : "direction-large sell-bg"
            }
          >
            {buy ? "▲" : "▼"}
          </div>

          <div>

            <span>
              {active
                ? "ACTIVE POSITION"
                : "LATEST SIGNAL"}
            </span>

            <h3>
              {buy ? "BUY" : "SELL"}
            </h3>

            <small>
              XAUUSD ·{" "}
              {timeframeLabel(
                signal.timeframe as Timeframe
              )}
            </small>

          </div>

        </div>

        <div className="signal-score">

          <span>
            قدرت تحلیل
          </span>

          <strong>
            {signal.score || 0}
            <small>/100</small>
          </strong>

          <div className="score-line">
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    signal.score || 0
                  )
                )}%`,
              }}
            />
          </div>

        </div>

      </div>

      <div className="signal-levels">

        <SignalLevel
          title="ENTRY"
          value={signal.entry}
          type="entry"
        />

        <SignalLevel
          title="STOP LOSS"
          value={signal.stopLoss}
          type="sl"
          extra={`-${
            signal.riskUsd || 40
          }`}
        />

        <SignalLevel
          title="TP1 · 0.04"
          value={signal.tp1}
          type="tp"
          extra="+$20"
        />

        <SignalLevel
          title="TP2 · 0.03"
          value={signal.tp2}
          type="tp"
          extra="+$24"
        />

        <SignalLevel
          title="TP3 · 0.03"
          value={signal.tp3}
          type="tp"
          extra="+$36"
        />

      </div>

      <div className="signal-bottom">

        <div>
          <span>
            حجم کل
          </span>

          <strong>
            0.10 LOT
          </strong>
        </div>

        <div>
          <span>
            سشن
          </span>

          <strong>
            {signal.session || "—"}
          </strong>
        </div>

        <div>
          <span>
            تأییدیه
          </span>

          <strong>
            {signal.confirmations || 0}
          </strong>
        </div>

        <div>
          <span>
            وضعیت
          </span>

          <strong className="gold-text">
            {stateFa(signal.state)}
          </strong>
        </div>

        <div>
          <span>
            Risk Free
          </span>

          <strong
            className={
              signal.breakeven
                ? "success-text"
                : "muted-text"
            }
          >
            {signal.breakeven
              ? "فعال"
              : "منتظر TP1"}
          </strong>
        </div>

      </div>

    </div>
  );
}

/* ============================================================
   SIGNAL LEVEL
============================================================ */

function SignalLevel({
  title,
  value,
  type,
  extra,
}: {
  title: string;
  value: number;
  type: "entry" | "sl" | "tp";
  extra?: string;
}) {
  return (
    <div className={`signal-level ${type}`}>

      <span>
        {title}
      </span>

      <strong>
        {formatPrice(value)}
      </strong>

      {extra && (
        <small>
          {extra}
        </small>
      )}

    </div>
  );
}

/* ============================================================
   PROFIT CARD
============================================================ */

function ProfitCard({
  number,
  title,
  lot,
  profit,
  percent,
  className,
}: {
  number: string;
  title: string;
  lot: string;
  profit: string;
  percent: string;
  className: string;
}) {
  return (
    <div className={`profit-card ${className}`}>

      <div className="profit-top">

        <span>
          {number}
        </span>

        <strong>
          {title}
        </strong>

      </div>

      <div className="profit-main">
        {profit}
      </div>

      <div className="profit-details">

        <span>
          حجم بسته‌شدن
        </span>

        <b>
          {lot} LOT
        </b>

      </div>

      <div className="profit-progress">

        <i
          style={{
            width: percent,
          }}
        />

      </div>

      <small>
        {percent} از حجم کل
      </small>

    </div>
  );
}

/* ============================================================
   METRIC
============================================================ */

function Metric({
  title,
  value,
  sub,
  icon,
  success,
  danger,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: string;
  success?: boolean;
  danger?: boolean;
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
          success
            ? "success-text"
            : danger
            ? "danger-text"
            : ""
        }
      >
        {value}
      </strong>

      {sub && (
        <small>
          {sub} USD
        </small>
      )}

    </div>
  );
}

/* ============================================================
   SETTING
============================================================ */

function Setting({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="setting">

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

      <i />

    </div>
  );
}

/* ============================================================
   REAL CANDLESTICK CHART
============================================================ */

function LiveCandlestickChart({
  candles,
  signal,
}: {
  candles: Candle[];
  signal: Meta | null;
}) {
  const visible = candles.slice(-100);

  if (!visible.length) {
    return (
      <div className="chart-loading">
        داده واقعی نمودار موجود نیست.
      </div>
    );
  }

  const width = 1200;
  const height = 520;

  const padding = {
    top: 25,
    right: 75,
    bottom: 35,
    left: 15,
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  const highs = visible.map(
    (c) => Number(c.high)
  );

  const lows = visible.map(
    (c) => Number(c.low)
  );

  let maxPrice = Math.max(...highs);
  let minPrice = Math.min(...lows);

  if (signal) {
    maxPrice = Math.max(
      maxPrice,
      signal.entry,
      signal.stopLoss,
      signal.tp1,
      signal.tp2,
      signal.tp3
    );

    minPrice = Math.min(
      minPrice,
      signal.entry,
      signal.stopLoss,
      signal.tp1,
      signal.tp2,
      signal.tp3
    );
  }

  const range =
    Math.max(
      maxPrice - minPrice,
      0.01
    );

  const extra = range * 0.08;

  maxPrice += extra;
  minPrice -= extra;

  const finalRange =
    maxPrice - minPrice;

  const xStep =
    chartWidth / visible.length;

  function y(price: number) {
    return (
      padding.top +
      ((maxPrice - price) /
        finalRange) *
        chartHeight
    );
  }

  function x(index: number) {
    return (
      padding.left +
      index * xStep +
      xStep / 2
    );
  }

  const gridLines = 7;

  return (
    <div className="svg-chart">

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="نمودار واقعی XAUUSD"
      >

        <defs>

          <linearGradient
            id="chartGold"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop
              offset="0%"
              stopColor="#8b651f"
            />

            <stop
              offset="50%"
              stopColor="#e5bd55"
            />

            <stop
              offset="100%"
              stopColor="#fff0a7"
            />

          </linearGradient>

        </defs>

        {/* Grid */}

        {Array.from({
          length: gridLines,
        }).map((_, index) => {

          const value =
            maxPrice -
            (finalRange /
              (gridLines - 1)) *
              index;

          const yy = y(value);

          return (
            <g key={index}>

              <line
                x1={padding.left}
                x2={
                  width -
                  padding.right
                }
                y1={yy}
                y2={yy}
                stroke="#ffffff"
                strokeOpacity="0.06"
              />

              <text
                x={
                  width -
                  padding.right +
                  10
                }
                y={yy + 4}
                fill="#777d88"
                fontSize="13"
              >
                {value.toFixed(2)}
              </text>

            </g>
          );
        })}

        {/* Candles */}

        {visible.map((candle, index) => {

          const bullish =
            candle.close >= candle.open;

          const candleX = x(index);

          const bodyTop = y(
            Math.max(
              candle.open,
              candle.close
            )
          );

          const bodyBottom = y(
            Math.min(
              candle.open,
              candle.close
            )
          );

          const bodyHeight =
            Math.max(
              2,
              bodyBottom - bodyTop
            );

          const candleWidth =
            Math.max(
              3,
              Math.min(
                10,
                xStep * 0.58
              )
            );

          return (
            <g key={`${candle.datetime}-${index}`}>

              <line
                x1={candleX}
                x2={candleX}
                y1={y(candle.high)}
                y2={y(candle.low)}
                stroke={
                  bullish
                    ? "#48d88a"
                    : "#ef6565"
                }
                strokeWidth="1.4"
              />

              <rect
                x={
                  candleX -
                  candleWidth / 2
                }
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                rx="1"
                fill={
                  bullish
                    ? "#48d88a"
                    : "#ef6565"
                }
                opacity="0.95"
              />

            </g>
          );
        })}

        {/* Current price */}

        {visible.length > 0 && (
          <>
            <line
              x1={padding.left}
              x2={
                width -
                padding.right
              }
              y1={y(
                visible[
                  visible.length - 1
                ].close
              )}
              y2={y(
                visible[
                  visible.length - 1
                ].close
              )}
              stroke="#e7bd4e"
              strokeDasharray="6 5"
              strokeWidth="1.3"
              opacity="0.9"
            />

            <rect
              x={
                width -
                padding.right +
                5
              }
              y={
                y(
                  visible[
                    visible.length - 1
                  ].close
                ) - 11
              }
              width="67"
              height="22"
              rx="5"
              fill="#d7ad43"
            />

            <text
              x={
                width -
                padding.right +
                10
              }
              y={
                y(
                  visible[
                    visible.length - 1
                  ].close
                ) + 4
              }
              fill="#0b0b0b"
              fontSize="12"
              fontWeight="700"
            >
              {visible[
                visible.length - 1
              ].close.toFixed(2)}
            </text>
          </>
        )}

        {/* Active signal levels */}

        {signal && (
          <>

            <ChartLevel
              label="ENTRY"
              value={signal.entry}
              y={y(signal.entry)}
              color="#d7ad43"
              width={width}
              right={padding.right}
            />

            <ChartLevel
              label="SL"
              value={signal.stopLoss}
              y={y(signal.stopLoss)}
              color="#ef6565"
              width={width}
              right={padding.right}
            />

            <ChartLevel
              label="TP1"
              value={signal.tp1}
              y={y(signal.tp1)}
              color="#49d88a"
              width={width}
              right={padding.right}
            />

            <ChartLevel
              label="TP2"
              value={signal.tp2}
              y={y(signal.tp2)}
              color="#49d88a"
              width={width}
              right={padding.right}
            />

            <ChartLevel
              label="TP3"
              value={signal.tp3}
              y={y(signal.tp3)}
              color="#49d88a"
              width={width}
              right={padding.right}
            />

          </>
        )}

      </svg>

    </div>
  );
}

/* ============================================================
   CHART LEVEL
============================================================ */

function ChartLevel({
  label,
  value,
  y,
  color,
  width,
  right,
}: {
  label: string;
  value: number;
  y: number;
  color: string;
  width: number;
  right: number;
}) {
  return (
    <g>

      <line
        x1="15"
        x2={width - right}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth="1"
        strokeDasharray="4 5"
        opacity="0.8"
      />

      <rect
        x={width - right + 5}
        y={y - 10}
        width="68"
        height="20"
        rx="5"
        fill={color}
      />

      <text
        x={width - right + 10}
        y={y + 4}
        fill="#050505"
        fontSize="11"
        fontWeight="800"
      >
        {label} {value.toFixed(2)}
      </text>

    </g>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function formatPrice(value?: number) {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(2);
}

function money(value: number) {
  return `$${usdNumber.format(
    Number(value || 0)
  )}`;
}

function toman(value: number) {
  return `${faNumber.format(
    Math.round(Number(value || 0))
  )} تومان`;
}

function dateFa(
  value?: string | Date | null
) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fa-IR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  } catch {
    return "—";
  }
}

function timeframeLabel(
  timeframe?: Timeframe | string
) {
  const map: Record<
    string,
    string
  > = {
    "1min": "1 Minute",
    "5min": "5 Minute",
    "15min": "15 Minute",
    "30min": "30 Minute",
    "1h": "1 Hour",
    "4h": "4 Hour",
  };

  return map[timeframe || ""] || "1 Minute";
}

function stateFa(value?: string) {
  const map: Record<
    string,
    string
  > = {
    WAITING: "در انتظار",
    ACTIVE: "فعال",
    TP1_HIT: "TP1 فعال شد",
    TP2_HIT: "TP2 فعال شد",
    TP3_HIT: "معامله تکمیل شد",
    SL_HIT: "استاپ لاس",
    BREAKEVEN_HIT:
      "ریسک‌فری / بریک‌ایون",
    AI_PENDING: "در انتظار",
    AI_TP1: "TP1 فعال",
    AI_TP2: "TP2 فعال",
    AI_TP3: "تکمیل شده",
    AI_SL: "استاپ لاس",
    AI_BE: "ریسک‌فری",
  };

  return (
    map[value || ""] ||
    value ||
    "بدون وضعیت"
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #050505;
  color: #f5f5f5;
  font-family:
    Tahoma,
    Arial,
    sans-serif;
}

.ai-root {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 20% 0%,
      rgba(214, 165, 55, 0.09),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(33, 83, 57, 0.08),
      transparent 25%
    ),
    linear-gradient(
      145deg,
      #030303,
      #080808 48%,
      #050505
    );
  padding: 22px;
}

.ai-container {
  width: 100%;
  max-width: 1450px;
  margin: 0 auto;
}

/* HEADER */

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #0a0804;
  background:
    linear-gradient(
      135deg,
      #8b641d,
      #e4bb53,
      #fff0ad
    );
  font-size: 15px;
  font-weight: 1000;
  box-shadow:
    0 0 30px
    rgba(221, 177, 67, 0.18);
}

.brand-mini {
  color: #caa348;
  font-size: 10px;
  letter-spacing: 3px;
  font-weight: 900;
}

.ai-header h1 {
  margin: 5px 0 2px;
  font-size: 25px;
}

.ai-header p {
  margin: 0;
  color: #747983;
  font-size: 12px;
  direction: ltr;
  text-align: right;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection {
  padding: 10px 13px;
  border: 1px solid rgba(71, 220, 133, 0.15);
  border-radius: 11px;
  background: rgba(37, 116, 65, 0.08);
  color: #70dd99;
  font-size: 11px;
  font-weight: 800;
  direction: ltr;
}

.connection-dot,
.pulse {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 6px;
  border-radius: 50%;
  background: #4cdc88;
  box-shadow:
    0 0 12px
    rgba(76, 220, 136, 0.8);
}

.refresh-button {
  min-height: 40px;
  border: 1px solid rgba(255,255,255,0.09);
  background: #111214;
  color: #ddd;
  border-radius: 11px;
  padding: 0 15px;
  cursor: pointer;
  font-weight: 800;
}

.refresh-button:hover {
  border-color: rgba(215, 173, 67, 0.5);
}

/* ERROR */

.error-box {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 15px 17px;
  margin-bottom: 16px;
  border-radius: 15px;
  border: 1px solid rgba(255, 86, 86, 0.18);
  background: rgba(88, 22, 22, 0.15);
  color: #ff8b8b;
}

.error-box strong {
  display: block;
}

.error-box p {
  margin: 5px 0 0;
  color: #a78a8a;
  font-size: 12px;
}

/* MARKET */

.market-section {
  border:
    1px solid
    rgba(255,255,255,0.08);
  border-radius: 22px;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      rgba(14,14,15,0.98),
      rgba(8,8,9,0.98)
    );
  box-shadow:
    0 25px 80px
    rgba(0,0,0,0.45);
}

.market-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 17px 20px 13px;
}

.market-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gold-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #dfb44a;
  box-shadow:
    0 0 15px
    rgba(223,180,74,0.75);
}

.market-title strong {
  display: block;
  font-size: 17px;
  direction: ltr;
  text-align: right;
}

.market-title span {
  display: block;
  margin-top: 3px;
  color: #676c75;
  font-size: 9px;
  letter-spacing: 2px;
  direction: ltr;
  text-align: right;
}

.market-live {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #737983;
  font-size: 11px;
}

.market-live strong {
  margin-right: 4px;
  color: #e5bb51;
  font-size: 18px;
  direction: ltr;
}

.timeframes {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 20px 13px;
}

.timeframe {
  border: 1px solid rgba(255,255,255,0.06);
  background: #111214;
  color: #777d86;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
  direction: ltr;
}

.timeframe:hover {
  color: #eee;
}

.timeframe.active {
  color: #090806;
  background:
    linear-gradient(
      135deg,
      #bd8d2c,
      #edc65f
    );
  border-color: #d8ad46;
}

.chart-container {
  height: 520px;
  min-height: 400px;
  position: relative;
  background:
    radial-gradient(
      circle at 50% 50%,
      rgba(212,164,48,0.025),
      transparent 55%
    );
}

.svg-chart {
  width: 100%;
  height: 100%;
}

.svg-chart svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-loading {
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #858a93;
}

.chart-loading strong {
  color: #c9cdd4;
  font-size: 14px;
}

.chart-loading span {
  color: #656a73;
  font-size: 11px;
}

.chart-loader {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border:
    2px solid
    rgba(221,178,67,0.15);
  border-top-color: #dcb149;
  animation:
    chartSpin 0.8s linear infinite;
}

@keyframes chartSpin {
  to {
    transform: rotate(360deg);
  }
}

.chart-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  padding: 10px 18px;
  border-top:
    1px solid
    rgba(255,255,255,0.05);
  color: #5f646d;
  font-size: 9px;
}

.chart-footer span:first-child {
  color: #69db92;
}

/* SECTION */

.signal-section,
.riskfree-section,
.plan-section,
.performance-section,
.history-section,
.settings-section {
  margin-top: 17px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 12px;
}

.section-heading > div:first-child > span {
  color: #bd9131;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
}

.section-heading h2 {
  margin: 5px 0 0;
  font-size: 20px;
}

.section-heading p {
  margin: 5px 0 0;
  color: #666c76;
  font-size: 11px;
}

/* SIGNAL */

.signal-card {
  overflow: hidden;
  border-radius: 21px;
  border:
    1px solid
    rgba(215,173,67,0.2);
  background:
    linear-gradient(
      145deg,
      rgba(29,25,15,0.94),
      rgba(12,12,13,0.98)
    );
  box-shadow:
    0 20px 65px
    rgba(0,0,0,0.35);
}

.signal-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
}

.signal-direction {
  display: flex;
  align-items: center;
  gap: 13px;
}

.direction-large {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 17px;
  font-size: 25px;
}

.buy-bg {
  color: #4ee18d;
  background: rgba(55, 194, 111, 0.09);
  border:
    1px solid
    rgba(72,215,132,0.17);
}

.sell-bg {
  color: #ff7272;
  background: rgba(235, 80, 80, 0.08);
  border:
    1px solid
    rgba(235,80,80,0.17);
}

.signal-direction span,
.signal-score > span {
  color: #6d727b;
  font-size: 9px;
  letter-spacing: 1.5px;
}

.signal-direction h3 {
  margin: 5px 0;
  font-size: 25px;
}

.signal-direction small {
  color: #747983;
  font-size: 10px;
  direction: ltr;
}

.signal-score {
  width: 180px;
}

.signal-score > strong {
  display: block;
  margin: 5px 0;
  color: #e7bf55;
  font-size: 25px;
}

.signal-score > strong small {
  color: #777d86;
  font-size: 10px;
}

.score-line {
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: #242428;
}

.score-line i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #8b651f,
      #e8c15a
    );
}

.signal-levels {
  display: grid;
  grid-template-columns:
    repeat(5, 1fr);
  gap: 8px;
  padding: 0 14px 14px;
}

.signal-level {
  min-height: 105px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.025);
  border:
    1px solid
    rgba(255,255,255,0.055);
}

.signal-level > span {
  display: block;
  color: #707680;
  font-size: 9px;
  letter-spacing: .7px;
  direction: ltr;
  text-align: right;
}

.signal-level strong {
  display: block;
  margin: 13px 0 7px;
  color: #eee;
  font-size: 21px;
  direction: ltr;
  text-align: right;
}

.signal-level small {
  color: #747b84;
  font-size: 10px;
}

.signal-level.sl {
  border-color:
    rgba(239,101,101,0.18);
}

.signal-level.sl strong {
  color: #ff7474;
}

.signal-level.tp {
  border-color:
    rgba(215,173,67,0.14);
}

.signal-level.tp strong {
  color: #e8bf56;
}

.signal-level.entry strong {
  color: #f1f1f1;
}

.signal-bottom {
  display: grid;
  grid-template-columns:
    repeat(5, 1fr);
  border-top:
    1px solid
    rgba(255,255,255,0.06);
}

.signal-bottom > div {
  padding: 13px 16px;
  border-left:
    1px solid
    rgba(255,255,255,0.05);
}

.signal-bottom > div:last-child {
  border-left: 0;
}

.signal-bottom span {
  display: block;
  color: #686e77;
  font-size: 9px;
}

.signal-bottom strong {
  display: block;
  margin-top: 6px;
  color: #ddd;
  font-size: 12px;
}

/* NO SIGNAL */

.no-signal {
  min-height: 185px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border:
    1px dashed
    rgba(255,255,255,0.08);
  border-radius: 19px;
  background: rgba(255,255,255,0.015);
}

.no-signal-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: 5px;
  border-radius: 15px;
  color: #c89d3d;
  background: rgba(200,157,61,0.07);
  font-size: 23px;
}

.no-signal strong {
  font-size: 14px;
}

.no-signal span {
  color: #666c75;
  font-size: 11px;
}

/* STATUS */

.signal-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #707680;
  border:
    1px solid
    rgba(255,255,255,0.06);
  border-radius: 9px;
  padding: 8px 11px;
  font-size: 10px;
}

.signal-status span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5d626b;
}

.signal-status.active {
  color: #6fe199;
  border-color:
    rgba(75,215,132,0.15);
  background:
    rgba(52,169,94,0.05);
}

.signal-status.active span {
  background: #50dc8a;
  box-shadow:
    0 0 12px
    rgba(80,220,138,0.8);
}

.safe-badge,
.settings-status {
  padding: 8px 11px;
  border-radius: 9px;
  color: #66dc91;
  background:
    rgba(54,180,98,0.07);
  border:
    1px solid
    rgba(54,180,98,0.13);
  font-size: 9px;
}

/* RISK FREE */

.risk-grid {
  display: grid;
  grid-template-columns:
    1fr 35px 1fr 35px 1fr;
  align-items: stretch;
  gap: 8px;
}

.risk-step {
  display: flex;
  gap: 12px;
  padding: 17px;
  border:
    1px solid
    rgba(255,255,255,0.06);
  border-radius: 16px;
  background: #0b0c0e;
}

.risk-step.highlight {
  border-color:
    rgba(215,173,67,0.18);
  background:
    rgba(215,173,67,0.035);
}

.risk-step.safe {
  border-color:
    rgba(70,211,129,0.17);
  background:
    rgba(70,211,129,0.035);
}

.step-number {
  color: #c69b3c;
  font-size: 11px;
  font-weight: 900;
  direction: ltr;
}

.risk-step strong {
  display: block;
  font-size: 13px;
}

.risk-step p {
  margin: 7px 0 0;
  color: #737983;
  font-size: 11px;
  line-height: 1.9;
}

.risk-step p b {
  margin: 0 4px;
  color: #e7bd54;
}

.risk-arrow {
  display: grid;
  place-items: center;
  color: #6b7078;
  font-size: 17px;
}

/* PLAN */

.total-lot {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #696f78;
  font-size: 10px;
}

.total-lot strong {
  color: #dfb34b;
  font-size: 17px;
}

.plan-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 10px;
}

.profit-card,
.total-profit {
  min-height: 180px;
  padding: 17px;
  border-radius: 17px;
  background: #0b0c0e;
  border:
    1px solid
    rgba(255,255,255,0.06);
}

.profit-card.tp1 {
  border-color:
    rgba(217,175,65,0.16);
}

.profit-card.tp2 {
  border-color:
    rgba(69,194,122,0.12);
}

.profit-card.tp3 {
  border-color:
    rgba(79,137,218,0.13);
}

.profit-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profit-top span {
  color: #646a73;
  font-size: 10px;
}

.profit-top strong {
  color: #d6a944;
  font-size: 12px;
}

.profit-main {
  margin: 24px 0 17px;
  color: #e7bd54;
  font-size: 30px;
  font-weight: 900;
  direction: ltr;
  text-align: right;
}

.profit-details {
  display: flex;
  justify-content: space-between;
  color: #626873;
  font-size: 9px;
}

.profit-details b {
  color: #d6d9de;
}

.profit-progress {
  height: 4px;
  margin-top: 17px;
  overflow: hidden;
  border-radius: 99px;
  background: #1d1e21;
}

.profit-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #79571a,
      #e1b64e
    );
}

.profit-card small {
  display: block;
  margin-top: 7px;
  color: #555b64;
  font-size: 8px;
}

.total-profit {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background:
    radial-gradient(
      circle at center,
      rgba(215,173,67,0.08),
      transparent 70%
    );
}

.total-profit span {
  color: #777d86;
  font-size: 9px;
  letter-spacing: 2px;
  direction: ltr;
}

.total-profit strong {
  margin: 12px 0 3px;
  color: #e9c35e;
  font-size: 36px;
  direction: ltr;
}

.total-profit small {
  color: #676d76;
  font-size: 10px;
}

.plan-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  padding: 13px 15px;
  border-radius: 13px;
  background: rgba(215,173,67,0.035);
  border:
    1px solid
    rgba(215,173,67,0.08);
}

.plan-note > span {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  color: #0a0906;
  background: #d4a943;
  font-size: 10px;
  font-weight: 900;
}

.plan-note p {
  margin: 0;
  color: #787e87;
  font-size: 10px;
  line-height: 1.9;
}

/* PERFORMANCE */

.performance-section {
  padding: 20px;
  border-radius: 20px;
  border:
    1px solid
    rgba(255,255,255,0.07);
  background: #0b0c0e;
}

.period-tabs {
  display: flex;
  gap: 5px;
}

.period {
  border:
    1px solid
    rgba(255,255,255,0.05);
  background: #121316;
  color: #70757e;
  border-radius: 8px;
  padding: 7px 11px;
  cursor: pointer;
  font-size: 9px;
}

.period.active {
  color: #0a0804;
  background: #d8ad45;
  border-color: #d8ad45;
}

.performance-grid {
  display: grid;
  grid-template-columns:
    repeat(6, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.metric {
  position: relative;
  min-height: 120px;
  padding: 14px;
  border-radius: 14px;
  background: #111215;
  border:
    1px solid
    rgba(255,255,255,0.045);
}

.metric-icon {
  position: absolute;
  top: 13px;
  left: 13px;
  color: #777d86;
  font-size: 12px;
}

.metric > span {
  color: #666c75;
  font-size: 9px;
}

.metric > strong {
  display: block;
  margin-top: 17px;
  font-size: 25px;
}

.metric small {
  display: block;
  margin-top: 4px;
  color: #646a73;
  font-size: 9px;
  direction: ltr;
  text-align: right;
}

.performance-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.winrate-card,
.net-profit-card {
  min-height: 155px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px;
  border-radius: 15px;
  background: #111215;
  border:
    1px solid
    rgba(255,255,255,0.045);
}

.winrate-ring {
  width: 105px;
  height: 105px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    conic-gradient(
      #d9ae46 0deg,
      #d9ae46 calc(var(--winrate, 0) * 3.6deg),
      #242529 calc(var(--winrate, 0) * 3.6deg),
      #242529 360deg
    );
  position: relative;
}

.winrate-ring::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #111215;
}

.winrate-ring > div {
  position: relative;
  z-index: 1;
  text-align: center;
}

.winrate-ring strong {
  display: block;
  color: #e4bd58;
  font-size: 21px;
  direction: ltr;
}

.winrate-ring span {
  color: #626872;
  font-size: 8px;
  direction: ltr;
}

.winrate-info span {
  display: block;
  color: #666c75;
  font-size: 10px;
}

.winrate-info strong {
  display: block;
  margin-top: 9px;
  color: #61dc8e;
  font-size: 16px;
}

.winrate-info small {
  display: block;
  margin-top: 5px;
  color: #ef7474;
  font-size: 10px;
}

.net-profit-card {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.net-profit-card span {
  color: #676d76;
  font-size: 9px;
  letter-spacing: 2px;
  direction: ltr;
}

.net-profit-card strong {
  margin-top: 12px;
  font-size: 36px;
  direction: ltr;
}

.net-profit-card small {
  color: #757b84;
  font-size: 11px;
}

/* HISTORY */

.history-section {
  padding: 20px;
  border-radius: 20px;
  border:
    1px solid
    rgba(255,255,255,0.07);
  background: #0b0c0e;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.history-row {
  display: grid;
  grid-template-columns:
    1.5fr
    1fr
    1fr
    1fr;
  gap: 10px;
  align-items: center;
  padding: 13px;
  border-radius: 12px;
  background: #111215;
  border:
    1px solid
    rgba(255,255,255,0.04);
}

.history-direction {
  display: flex;
  align-items: center;
  gap: 10px;
}

.direction {
  min-width: 48px;
  padding: 6px;
  text-align: center;
  border-radius: 7px;
  font-size: 8px;
  font-weight: 900;
  direction: ltr;
}

.direction.buy {
  color: #61df91;
  background: rgba(68,207,126,0.08);
}

.direction.sell {
  color: #f27878;
  background: rgba(232,86,86,0.08);
}

.history-row span {
  display: block;
  color: #5f646d;
  font-size: 8px;
}

.history-row strong {
  display: block;
  margin-top: 5px;
  color: #d9dce1;
  font-size: 11px;
}

.history-row small {
  display: block;
  margin-top: 3px;
  color: #5e636c;
  font-size: 8px;
}

.history-result {
  text-align: left;
}

.history-empty {
  padding: 35px;
  text-align: center;
  color: #626872;
  font-size: 11px;
}

/* SETTINGS */

.settings-section {
  padding: 20px;
  border-radius: 20px;
  border:
    1px solid
    rgba(255,255,255,0.07);
  background: #0b0c0e;
}

.settings-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);
  gap: 8px;
}

.setting {
  position: relative;
  min-height: 75px;
  padding: 13px;
  border-radius: 13px;
  background: #111215;
  border:
    1px solid
    rgba(255,255,255,0.04);
}

.setting span {
  display: block;
  color: #656a73;
  font-size: 8px;
}

.setting strong {
  display: block;
  margin-top: 9px;
  color: #d9ae48;
  font-size: 12px;
  direction: ltr;
  text-align: right;
}

.setting i {
  position: absolute;
  top: 13px;
  left: 13px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #53d987;
  box-shadow:
    0 0 8px
    rgba(83,217,135,0.65);
}

/* TELEGRAM */

.telegram-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 17px;
  padding: 17px 19px;
  border-radius: 17px;
  border:
    1px solid
    rgba(69,159,224,0.13);
  background:
    linear-gradient(
      135deg,
      rgba(31,91,132,0.09),
      rgba(11,14,17,0.98)
    );
}

.telegram-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 13px;
  color: #62b8e8;
  background: rgba(66,166,221,0.08);
  font-size: 20px;
}

.telegram-content {
  flex: 1;
}

.telegram-content > span {
  color: #4b99c7;
  font-size: 8px;
  letter-spacing: 2px;
}

.telegram-content h3 {
  margin: 5px 0;
  font-size: 13px;
}

.telegram-content p {
  margin: 0;
  color: #676e78;
  font-size: 10px;
  line-height: 1.8;
}

.telegram-state {
  color: #67d990;
  font-size: 10px;
}

.telegram-state span {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 5px;
  border-radius: 50%;
  background: #58dc8b;
}

/* DISCLAIMER */

.disclaimer {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-top: 17px;
  padding: 14px 16px;
  border-radius: 13px;
  background: rgba(216,174,69,0.025);
  border:
    1px solid
    rgba(216,174,69,0.06);
}

.disclaimer strong {
  color: #b99137;
  white-space: nowrap;
  font-size: 10px;
}

.disclaimer span {
  color: #606670;
  font-size: 9px;
  line-height: 1.9;
}

.page-footer {
  padding: 20px 0 10px;
  text-align: center;
  color: #3f434a;
  font-size: 8px;
  letter-spacing: 2px;
  direction: ltr;
}

/* COLORS */

.success-text {
  color: #62df90 !important;
}

.danger-text {
  color: #f17474 !important;
}

.gold-text {
  color: #e0b64e !important;
}

.muted-text {
  color: #666c75 !important;
}

/* RESPONSIVE */

@media (max-width: 1050px) {

  .signal-levels {
    grid-template-columns:
      repeat(3, 1fr);
  }

  .signal-bottom {
    grid-template-columns:
      repeat(3, 1fr);
  }

  .signal-bottom > div:nth-child(4),
  .signal-bottom > div:nth-child(5) {
    border-top:
      1px solid
      rgba(255,255,255,0.05);
  }

  .plan-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .performance-grid {
    grid-template-columns:
      repeat(3, 1fr);
  }

  .settings-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .risk-grid {
    grid-template-columns: 1fr;
  }

  .risk-arrow {
    transform: rotate(-90deg);
    height: 15px;
  }

}

@media (max-width: 700px) {

  .ai-root {
    padding: 10px;
  }

  .ai-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-status {
    width: 100%;
  }

  .connection,
  .refresh-button {
    flex: 1;
    text-align: center;
  }

  .market-top {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .chart-container {
    height: 390px;
    min-height: 330px;
  }

  .chart-footer {
    gap: 8px;
    flex-wrap: wrap;
  }

  .signal-main {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .signal-score {
    width: 100%;
  }

  .signal-levels {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .signal-bottom {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .signal-bottom > div {
    border-top:
      1px solid
      rgba(255,255,255,0.05);
  }

  .plan-grid {
    grid-template-columns: 1fr;
  }

  .performance-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .performance-bottom {
    grid-template-columns: 1fr;
  }

  .winrate-card {
    justify-content: center;
  }

  .history-row {
    grid-template-columns:
      1fr 1fr;
  }

  .history-result {
    text-align: right;
  }

  .telegram-section {
    align-items: flex-start;
  }

}

@media (max-width: 430px) {

  .brand-icon {
    width: 43px;
    height: 43px;
  }

  .ai-header h1 {
    font-size: 21px;
  }

  .timeframes {
    overflow-x: auto;
  }

  .timeframe {
    flex: 0 0 auto;
  }

  .chart-container {
    height: 330px;
  }

  .signal-levels {
    grid-template-columns: 1fr 1fr;
  }

  .signal-bottom {
    grid-template-columns: 1fr 1fr;
  }

  .performance-grid {
    grid-template-columns:
      1fr 1fr;
  }

  .settings-grid {
    grid-template-columns:
      1fr 1fr;
  }

  .disclaimer {
    flex-direction: column;
  }

}
`;
