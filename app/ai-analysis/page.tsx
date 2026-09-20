"use client";

import { useEffect, useMemo, useState } from "react";

type Market = {
  symbol: string;
  label: string;
  short: string;
};

type Timeframe = {
  value: string;
  label: string;
  tv: string;
};

type AnalysisItem = {
  title: string;
  value: string;
  description: string;
  active: boolean;
};

const MARKETS: Market[] = [
  {
    symbol: "OANDA:XAUUSD",
    label: "طلا / XAUUSD",
    short: "XAU",
  },
  {
    symbol: "BINANCE:BTCUSDT",
    label: "بیت‌کوین / BTCUSDT",
    short: "BTC",
  },
  {
    symbol: "BINANCE:ETHUSDT",
    label: "اتریوم / ETHUSDT",
    short: "ETH",
  },
  {
    symbol: "OANDA:EURUSD",
    label: "یورو / EURUSD",
    short: "EUR",
  },
];

const TIMEFRAMES: Timeframe[] = [
  {
    value: "1m",
    label: "1 دقیقه",
    tv: "1",
  },
  {
    value: "5m",
    label: "5 دقیقه",
    tv: "5",
  },
  {
    value: "15m",
    label: "15 دقیقه",
    tv: "15",
  },
  {
    value: "1h",
    label: "1 ساعت",
    tv: "60",
  },
  {
    value: "4h",
    label: "4 ساعت",
    tv: "240",
  },
  {
    value: "1D",
    label: "روزانه",
    tv: "D",
  },
];

const DEFAULT_FILTERS = {
  marketStructure: true,
  liquidity: true,
  supportResistance: true,
  pullback: true,
  fakeBreakout: true,
  candlestick: true,
  volume: true,
  multiTimeframe: true,
  volatility: true,
  news: true,
};

function TradingViewChart({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  useEffect(() => {
    const container = document.getElementById("trading-ai-chart");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      save_image: false,
      studies: [
        "Volume@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "BB@tv-basicstudies",
      ],
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div className="chart-shell">
      <div
        id="trading-ai-chart"
        className="tradingview-widget-container"
      >
        <div className="tradingview-widget-container__widget" />
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>

        <h2>{title}</h2>

        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

function StatusDot({ active = false }: { active?: boolean }) {
  return (
    <span
      className={`status-dot ${active ? "status-dot-active" : ""}`}
    />
  );
}

function FilterRow({
  title,
  description,
  enabled,
  onClick,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`filter-row ${enabled ? "filter-enabled" : ""}`}
      onClick={onClick}
    >
      <div className="filter-text">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <div className={`switch ${enabled ? "switch-on" : ""}`}>
        <div className="switch-knob" />
      </div>
    </button>
  );
}

function BotCard({
  icon,
  title,
  subtitle,
  description,
}: {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <div className="bot-card">
      <div className="bot-icon">{icon}</div>

      <div className="bot-content">
        <div className="bot-heading">
          <h3>{title}</h3>

          <span className="ready-badge">
            آماده تحلیل
          </span>
        </div>

        <div className="bot-subtitle">{subtitle}</div>

        <p>{description}</p>

        <div className="bot-footer">
          <span>
            <StatusDot />
            منتظر اتصال موتور داده
          </span>

          <span className="bot-mode">
            فقط تحلیل
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AIAnalysisPage() {
  const [market, setMarket] = useState(MARKETS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[2]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [analysisRunning, setAnalysisRunning] =
    useState(false);

  const [lastUpdate, setLastUpdate] = useState(
    "در انتظار اتصال موتور داده"
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  const toggleFilter = (
    key: keyof typeof DEFAULT_FILTERS
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const startAnalysis = () => {
    setAnalysisRunning(true);
    setLastUpdate("موتور تحلیل آماده دریافت داده است");

    window.setTimeout(() => {
      setAnalysisRunning(false);
    }, 1200);
  };

  const selectedMarketIndex = MARKETS.findIndex(
    (item) => item.symbol === market.symbol
  );

  const analysisItems: AnalysisItem[] = [
    {
      title: "Market Structure",
      value: "در انتظار داده",
      description: "HH / HL / LH / LL / BOS / CHoCH",
      active: filters.marketStructure,
    },
    {
      title: "Liquidity",
      value: "در انتظار داده",
      description: "Liquidity Sweep / Equal High / Equal Low",
      active: filters.liquidity,
    },
    {
      title: "Support & Resistance",
      value: "در انتظار داده",
      description: "نواحی کلیدی و واکنش‌های قیمتی",
      active: filters.supportResistance,
    },
    {
      title: "Pullback",
      value: "در انتظار داده",
      description: "پولبک به سطح و تأیید بازگشت",
      active: filters.pullback,
    },
    {
      title: "Fake Breakout",
      value: "در انتظار داده",
      description: "شکست جعلی و برگشت به محدوده",
      active: filters.fakeBreakout,
    },
    {
      title: "Candlestick",
      value: "در انتظار داده",
      description: "Engulfing / Pin Bar / Rejection / Doji",
      active: filters.candlestick,
    },
    {
      title: "Volume",
      value: "در انتظار داده",
      description: "بررسی حجم و تأیید حرکت",
      active: filters.volume,
    },
    {
      title: "Multi-Timeframe",
      value: "در انتظار داده",
      description: "4H → 1H → 15M → 5M",
      active: filters.multiTimeframe,
    },
  ];

  return (
    <main dir="rtl" className="page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <div className="container">
        {/* HEADER */}
        <header className="header">
          <div>
            <div className="brand-line">
              <span className="brand-icon">◈</span>

              <span>Trading AI</span>
            </div>

            <h1>مرکز تحلیل هوشمند بازار</h1>

            <p>
              تحلیل چندلایه بازار، شناسایی موقعیت‌ها و
              مدیریت هوشمند NO TRADE
            </p>
          </div>

          <div className="engine-status">
            <StatusDot active />

            <div>
              <strong>Analysis Engine</strong>
              <span>سیستم آماده است</span>
            </div>
          </div>
        </header>

        {/* MARKET CONTROL */}
        <section className="control-card">
          <div className="control-top">
            <div>
              <div className="eyebrow">
                MARKET CONTROL
              </div>

              <h2>بازار و تایم‌فریم</h2>
            </div>

            <div className="live-label">
              <StatusDot active />
              Live Market
            </div>
          </div>

          <div className="market-grid">
            {MARKETS.map((item, index) => {
              const active = item.symbol === market.symbol;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  className={`market-button ${
                    active ? "market-active" : ""
                  }`}
                  onClick={() => setMarket(item)}
                >
                  <span className="market-number">
                    {index + 1}
                  </span>

                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.symbol}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="timeframe-row">
            {TIMEFRAMES.map((item) => {
              const active =
                item.value === timeframe.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`time-button ${
                    active ? "time-active" : ""
                  }`}
                  onClick={() => setTimeframe(item)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ENGINE SUMMARY */}
        <section className="summary-grid">
          <div className="summary-card">
            <span>بازار انتخابی</span>
            <strong>{market.short}</strong>
            <small>{market.label}</small>
          </div>

          <div className="summary-card">
            <span>تایم‌فریم</span>
            <strong>{timeframe.label}</strong>
            <small>Market Structure</small>
          </div>

          <div className="summary-card">
            <span>تأییدیه‌ها</span>
            <strong>{activeFilterCount}</strong>
            <small>فیلتر فعال</small>
          </div>

          <div className="summary-card summary-warning">
            <span>وضعیت سیگنال</span>
            <strong>NO TRADE</strong>
            <small>تا زمانی که داده واقعی کافی نباشد</small>
          </div>
        </section>

        {/* CHART */}
        <section className="section">
          <SectionTitle
            eyebrow="LIVE CHART"
            title={`نمودار ${market.label}`}
            description="چارت در یک ستون کامل نمایش داده می‌شود تا در موبایل و دسکتاپ خوانا باشد."
          />

          <div className="chart-card">
            <TradingViewChart
              symbol={market.symbol}
              interval={timeframe.tv}
            />
          </div>
        </section>

        {/* CURRENT ANALYSIS */}
        <section className="section">
          <SectionTitle
            eyebrow="AI MARKET STATUS"
            title="وضعیت تحلیل فعلی"
            description="سیستم تا دریافت داده واقعی و عبور از تمام شروط، سیگنال معاملاتی تولید نمی‌کند."
          />

          <div className="analysis-main">
            <div className="analysis-status-card">
              <div className="status-header">
                <div>
                  <span className="eyebrow">
                    CURRENT DECISION
                  </span>

                  <h3>NO TRADE</h3>
                </div>

                <div className="large-status-icon">
                  ⏳
                </div>
              </div>

              <p>
                هنوز داده کافی از موتور تحلیل دریافت نشده
                است. پس از اتصال دیتای واقعی، سیستم باید
                ابتدا ساختار بازار، نقدینگی، حمایت و مقاومت،
                پولبک و تأییدیه‌ها را بررسی کند.
              </p>

              <div className="decision-list">
                <div>
                  <span>Market</span>
                  <strong>{market.short}</strong>
                </div>

                <div>
                  <span>Timeframe</span>
                  <strong>{timeframe.label}</strong>
                </div>

                <div>
                  <span>Filters</span>
                  <strong>
                    {activeFilterCount} / 10
                  </strong>
                </div>

                <div>
                  <span>Engine</span>
                  <strong>READY</strong>
                </div>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={startAnalysis}
                disabled={analysisRunning}
              >
                {analysisRunning
                  ? "در حال آماده‌سازی..."
                  : "آماده‌سازی تحلیل"}
              </button>

              <div className="last-update">
                {lastUpdate}
              </div>
            </div>

            <div className="logic-card">
              <div className="logic-header">
                <div>
                  <span className="eyebrow">
                    SIGNAL LOGIC
                  </span>

                  <h3>ترتیب تصمیم‌گیری</h3>
                </div>

                <span className="logic-badge">
                  Multi Confirmation
                </span>
              </div>

              <div className="logic-steps">
                <div className="logic-step">
                  <span>01</span>
                  <div>
                    <strong>ساختار بازار</strong>
                    <small>
                      روند، HH/HL، LH/LL، BOS و CHoCH
                    </small>
                  </div>
                </div>

                <div className="logic-step">
                  <span>02</span>
                  <div>
                    <strong>نقدینگی</strong>
                    <small>
                      Sweep، Equal High/Low و Stop Hunt
                    </small>
                  </div>
                </div>

                <div className="logic-step">
                  <span>03</span>
                  <div>
                    <strong>سطوح مهم</strong>
                    <small>
                      حمایت، مقاومت و نواحی واکنشی
                    </small>
                  </div>
                </div>

                <div className="logic-step">
                  <span>04</span>
                  <div>
                    <strong>پولبک و شکست</strong>
                    <small>
                      Breakout، Fake Break و Retest
                    </small>
                  </div>
                </div>

                <div className="logic-step">
                  <span>05</span>
                  <div>
                    <strong>تأیید نهایی</strong>
                    <small>
                      کندل، حجم، MTF، نوسان و اخبار
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ANALYSIS BOTS */}
        <section className="section">
          <SectionTitle
            eyebrow="ANALYSIS ENGINES"
            title="ربات‌های تحلیلگر"
            description="هر تحلیلگر فقط وظیفه تحلیل دارد و بدون تأیید جداگانه نباید معامله‌ای اجرا کند."
          />

          <div className="bots-grid">
            <BotCard
              icon="🕯️"
              title="تحلیل کندلی"
              subtitle="Candlestick Analyzer"
              description="شناسایی الگوهای کندلی، rejection، engulfing، pin bar، inside bar و ترکیب‌های چندکندلی."
            />

            <BotCard
              icon="🧠"
              title="تحلیل Dynamic"
              subtitle="Dynamic Market Analyzer"
              description="بررسی همزمان روند، ساختار، شکست‌ها، پولبک‌ها، نوسان و رفتار قیمت."
            />

            <BotCard
              icon="📊"
              title="Footprint / Order Flow"
              subtitle="Order Flow Analyzer"
              description="برای مرحله اتصال دیتای مناسب، بررسی فشار خرید و فروش و رفتار حجم."
            />

            <BotCard
              icon="🔗"
              title="Confirmation Engine"
              subtitle="Multi Confirmation Engine"
              description="ترکیب خروجی تحلیلگرها و جلوگیری از ارسال موقعیت‌هایی که تأیید کافی ندارند."
            />
          </div>
        </section>

        {/* FILTERS */}
        <section className="section">
          <SectionTitle
            eyebrow="CONFIRMATION ENGINE"
            title="فیلترها و تأییدیه‌های تحلیل"
            description="هر فیلتر را می‌توان مستقل روشن یا خاموش کرد."
          />

          <div className="filters-grid">
            <FilterRow
              title="Market Structure"
              description="ساختار، BOS و CHoCH"
              enabled={filters.marketStructure}
              onClick={() =>
                toggleFilter("marketStructure")
              }
            />

            <FilterRow
              title="Liquidity"
              description="Sweep و Equal High/Low"
              enabled={filters.liquidity}
              onClick={() => toggleFilter("liquidity")}
            />

            <FilterRow
              title="Support / Resistance"
              description="سطوح و نواحی واکنش"
              enabled={filters.supportResistance}
              onClick={() =>
                toggleFilter("supportResistance")
              }
            />

            <FilterRow
              title="Pullback"
              description="Retest و Pullback"
              enabled={filters.pullback}
              onClick={() => toggleFilter("pullback")}
            />

            <FilterRow
              title="Fake Breakout"
              description="شکست جعلی و برگشت"
              enabled={filters.fakeBreakout}
              onClick={() =>
                toggleFilter("fakeBreakout")
              }
            />

            <FilterRow
              title="Candlestick"
              description="الگوهای کندلی"
              enabled={filters.candlestick}
              onClick={() =>
                toggleFilter("candlestick")
              }
            />

            <FilterRow
              title="Volume"
              description="تأیید حجم"
              enabled={filters.volume}
              onClick={() => toggleFilter("volume")}
            />

            <FilterRow
              title="Multi-Timeframe"
              description="4H / 1H / 15M / 5M"
              enabled={filters.multiTimeframe}
              onClick={() =>
                toggleFilter("multiTimeframe")
              }
            />

            <FilterRow
              title="Volatility"
              description="ATR و شرایط نوسان"
              enabled={filters.volatility}
              onClick={() =>
                toggleFilter("volatility")
              }
            />

            <FilterRow
              title="News Filter"
              description="رویدادهای مهم اقتصادی"
              enabled={filters.news}
              onClick={() => toggleFilter("news")}
            />
          </div>
        </section>

        {/* ANALYSIS MATRIX */}
        <section className="section">
          <SectionTitle
            eyebrow="ANALYSIS MATRIX"
            title="ماتریس بررسی بازار"
            description="خروجی هر بخش باید قبل از تصمیم نهایی بررسی شود."
          />

          <div className="matrix">
            {analysisItems.map((item) => (
              <div
                key={item.title}
                className={`matrix-item ${
                  item.active
                    ? "matrix-active"
                    : "matrix-disabled"
                }`}
              >
                <div className="matrix-top">
                  <strong>{item.title}</strong>

                  <StatusDot active={false} />
                </div>

                <div className="matrix-value">
                  {item.value}
                </div>

                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ZONES */}
        <section className="section">
          <SectionTitle
            eyebrow="SMART ZONES"
            title="نواحی مهم بازار"
            description="این قسمت بعد از اتصال موتور واقعی برای شناسایی خودکار نواحی فعال استفاده می‌شود."
          />

          <div className="zones-grid">
            <div className="zone-card resistance">
              <div className="zone-icon">↘</div>

              <div>
                <span>Resistance</span>
                <strong>در انتظار داده</strong>
                <small>
                  مقاومت‌های مهم و نواحی واکنش
                </small>
              </div>
            </div>

            <div className="zone-card support">
              <div className="zone-icon">↗</div>

              <div>
                <span>Support</span>
                <strong>در انتظار داده</strong>
                <small>
                  حمایت‌های مهم و نواحی واکنش
                </small>
              </div>
            </div>

            <div className="zone-card liquidity">
              <div className="zone-icon">◉</div>

              <div>
                <span>Liquidity Zone</span>
                <strong>در انتظار داده</strong>
                <small>
                  High / Low و نواحی نقدینگی
                </small>
              </div>
            </div>

            <div className="zone-card reaction">
              <div className="zone-icon">✦</div>

              <div>
                <span>Reaction Zone</span>
                <strong>در انتظار داده</strong>
                <small>
                  محل‌های واکنش تاریخی قیمت
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* TELEGRAM */}
        <section className="section">
          <SectionTitle
            eyebrow="TELEGRAM SIGNAL ENGINE"
            title="مرکز ارسال هشدار و سیگنال"
            description="سیگنال‌ها باید بعد از عبور از Confirmation Engine ارسال شوند."
          />

          <div className="telegram-card">
            <div className="telegram-main">
              <div className="telegram-icon">
                ✈️
              </div>

              <div>
                <h3>Telegram Signal Channel</h3>

                <p>
                  سیستم برای ارسال موقعیت‌های معتبر،
                  هشدار حمایت و مقاومت، شکست‌ها، پولبک‌ها
                  و تغییرات مهم بازار طراحی می‌شود.
                </p>
              </div>
            </div>

            <div className="telegram-status">
              <StatusDot />

              <div>
                <strong>اتصال کانال</strong>
                <span>در انتظار راه‌اندازی موتور ارسال</span>
              </div>
            </div>

            <div className="telegram-types">
              <span>سیگنال معاملاتی</span>
              <span>هشدار حمایت</span>
              <span>هشدار مقاومت</span>
              <span>Fake Break</span>
              <span>Pullback</span>
              <span>Liquidity Sweep</span>
              <span>Market Alert</span>
            </div>
          </div>
        </section>

        {/* IMPORTANT */}
        <section className="notice">
          <div className="notice-icon">⚠️</div>

          <div>
            <strong>
              موتور تحلیل هنوز به دیتای واقعی متصل نشده است
            </strong>

            <p>
              این صفحه عمداً سیگنال ساختگی تولید نمی‌کند.
              مرحله بعدی اتصال دیتای واقعی بازار، موتور
              محاسبه اندیکاتورها، Confirmation Engine،
              ذخیره سیگنال در دیتابیس و ارسال خودکار به
              Telegram است.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div>
            <strong>Trading AI</strong>

            <span>
              Intelligent Market Analysis Platform
            </span>
          </div>

          <div>
            {selectedMarketIndex >= 0
              ? `${MARKETS[selectedMarketIndex].short} • ${timeframe.label}`
              : ""}
          </div>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #06101d;
        }

        body {
          font-family:
            Arial,
            Tahoma,
            sans-serif;
          color: #e7f1fb;
        }

        button {
          font-family: inherit;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(16, 185, 129, 0.08),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 20%,
              rgba(34, 211, 238, 0.08),
              transparent 28%
            ),
            #06101d;
          position: relative;
          overflow-x: hidden;
          padding: 28px 18px 60px;
        }

        .background-glow {
          position: fixed;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.08;
          pointer-events: none;
          z-index: 0;
        }

        .glow-one {
          top: 10%;
          right: -140px;
          background: #22d3ee;
        }

        .glow-two {
          bottom: 5%;
          left: -150px;
          background: #10b981;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .brand-line {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #67e8f9;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .brand-icon {
          font-size: 20px;
        }

        .header h1 {
          margin: 0;
          font-size: clamp(24px, 4vw, 38px);
          line-height: 1.3;
          letter-spacing: -0.7px;
        }

        .header p {
          margin: 9px 0 0;
          color: #8293a8;
          line-height: 1.9;
          max-width: 720px;
        }

        .engine-status {
          min-width: 190px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 15px;
          border-radius: 16px;
          background: rgba(8, 25, 42, 0.9);
          border: 1px solid rgba(50, 76, 101, 0.55);
        }

        .engine-status strong,
        .engine-status span {
          display: block;
        }

        .engine-status strong {
          font-size: 13px;
        }

        .engine-status span {
          color: #72859a;
          font-size: 11px;
          margin-top: 5px;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
          background: #64748b;
          box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.08);
          flex: 0 0 auto;
        }

        .status-dot-active {
          background: #22c55e;
          box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.08),
            0 0 14px rgba(34, 197, 94, 0.5);
        }

        .control-card,
        .chart-card,
        .analysis-status-card,
        .logic-card,
        .bot-card,
        .telegram-card,
        .notice {
          background:
            linear-gradient(
              145deg,
              rgba(10, 28, 47, 0.96),
              rgba(7, 20, 35, 0.96)
            );
          border: 1px solid rgba(45, 72, 98, 0.55);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .control-card {
          border-radius: 22px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .control-top,
        .section-title,
        .logic-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .eyebrow {
          color: #4fd1e8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
        }

        .control-top h2,
        .section-title h2 {
          margin: 0;
          font-size: 20px;
        }

        .section-title p {
          color: #71849a;
          margin: 7px 0 0;
          font-size: 13px;
          line-height: 1.8;
        }

        .live-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9aaabd;
          font-size: 12px;
        }

        .market-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .market-button {
          border: 1px solid #1c344b;
          background: #091a2c;
          color: #c9d7e5;
          border-radius: 15px;
          padding: 13px;
          text-align: right;
          cursor: pointer;
          transition: 0.2s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .market-button:hover,
        .market-active {
          border-color: #229db6;
          background: #0c263b;
          transform: translateY(-1px);
        }

        .market-number {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #102a41;
          color: #67e8f9;
          font-size: 11px;
          font-weight: 800;
        }

        .market-button strong,
        .market-button small {
          display: block;
        }

        .market-button strong {
          font-size: 13px;
        }

        .market-button small {
          color: #71849a;
          font-size: 10px;
          margin-top: 4px;
          direction: ltr;
          text-align: right;
        }

        .timeframe-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .time-button {
          border: 1px solid #1d3449;
          background: transparent;
          color: #7f91a5;
          border-radius: 11px;
          padding: 9px 13px;
          cursor: pointer;
          font-size: 12px;
        }

        .time-button:hover,
        .time-active {
          color: #d9fbff;
          background: #0b3346;
          border-color: #1b91aa;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }

        .summary-card {
          background: #08192b;
          border: 1px solid #172e44;
          border-radius: 17px;
          padding: 16px;
          min-height: 105px;
        }

        .summary-card span,
        .summary-card small {
          display: block;
          color: #71849a;
        }

        .summary-card span {
          font-size: 11px;
        }

        .summary-card strong {
          display: block;
          font-size: 21px;
          margin: 10px 0 4px;
          color: #e9f8ff;
        }

        .summary-card small {
          font-size: 10px;
        }

        .summary-warning strong {
          color: #facc15;
          font-size: 17px;
        }

        .section {
          margin-top: 38px;
        }

        .chart-card {
          border-radius: 22px;
          padding: 6px;
          margin-top: 14px;
          overflow: hidden;
        }

        .chart-shell {
          width: 100%;
          height: 610px;
          min-height: 420px;
          overflow: hidden;
          border-radius: 17px;
          background: #050b12;
        }

        .tradingview-widget-container,
        .tradingview-widget-container__widget {
          width: 100%;
          height: 100%;
        }

        .analysis-main {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          gap: 14px;
          margin-top: 14px;
        }

        .analysis-status-card,
        .logic-card {
          border-radius: 22px;
          padding: 22px;
        }

        .status-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .status-header h3 {
          margin: 5px 0 0;
          font-size: 34px;
          color: #facc15;
        }

        .large-status-icon {
          width: 58px;
          height: 58px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: #19243a;
          font-size: 25px;
        }

        .analysis-status-card > p {
          color: #8798aa;
          line-height: 2;
          font-size: 13px;
        }

        .decision-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 9px;
          margin: 18px 0;
        }

        .decision-list div {
          background: #08192a;
          border: 1px solid #172e44;
          border-radius: 13px;
          padding: 11px;
        }

        .decision-list span,
        .decision-list strong {
          display: block;
        }

        .decision-list span {
          color: #64788e;
          font-size: 10px;
        }

        .decision-list strong {
          margin-top: 5px;
          font-size: 13px;
        }

        .primary-button {
          width: 100%;
          border: 0;
          border-radius: 14px;
          padding: 14px;
          color: #04202a;
          background: linear-gradient(
            135deg,
            #67e8f9,
            #22d3ee
          );
          font-weight: 900;
          cursor: pointer;
        }

        .primary-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .last-update {
          text-align: center;
          color: #566a7f;
          font-size: 10px;
          margin-top: 10px;
        }

        .logic-badge,
        .ready-badge,
        .bot-mode {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          font-size: 9px;
          padding: 6px 9px;
          color: #8fefff;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(45, 212, 191, 0.15);
        }

        .logic-steps {
          margin-top: 17px;
        }

        .logic-step {
          display: flex;
          gap: 11px;
          align-items: flex-start;
          padding: 12px 0;
          border-bottom: 1px solid #14283b;
        }

        .logic-step:last-child {
          border-bottom: 0;
        }

        .logic-step > span {
          width: 31px;
          height: 31px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #102a40;
          color: #67e8f9;
          font-size: 10px;
          font-weight: 900;
        }

        .logic-step strong,
        .logic-step small {
          display: block;
        }

        .logic-step strong {
          font-size: 12px;
        }

        .logic-step small {
          color: #697d92;
          margin-top: 4px;
          line-height: 1.6;
          font-size: 10px;
        }

        .bots-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 13px;
          margin-top: 14px;
        }

        .bot-card {
          border-radius: 20px;
          padding: 17px;
          display: flex;
          gap: 13px;
        }

        .bot-icon {
          width: 50px;
          height: 50px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: #10253a;
          font-size: 23px;
        }

        .bot-content {
          flex: 1;
          min-width: 0;
        }

        .bot-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .bot-heading h3 {
          margin: 0;
          font-size: 15px;
        }

        .bot-subtitle {
          color: #64798e;
          direction: ltr;
          text-align: right;
          font-size: 10px;
          margin-top: 4px;
        }

        .bot-content p {
          color: #7e90a4;
          line-height: 1.8;
          font-size: 11px;
          margin: 10px 0;
        }

        .bot-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .bot-footer > span:first-child {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #687b90;
          font-size: 9px;
        }

        .bot-mode {
          color: #8b9bae;
          background: #0b1c2e;
          border-color: #1b3146;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .filter-row {
          width: 100%;
          border: 1px solid #172e44;
          background: #08192a;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          color: #dce9f5;
          text-align: right;
          cursor: pointer;
        }

        .filter-enabled {
          border-color: #21485d;
          background: #0a2033;
        }

        .filter-text strong,
        .filter-text span {
          display: block;
        }

        .filter-text strong {
          font-size: 12px;
        }

        .filter-text span {
          color: #697d91;
          font-size: 10px;
          margin-top: 5px;
        }

        .switch {
          width: 42px;
          height: 23px;
          border-radius: 999px;
          padding: 3px;
          background: #243447;
          flex: 0 0 auto;
          transition: 0.2s ease;
        }

        .switch-knob {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #8090a2;
          transition: 0.2s ease;
        }

        .switch-on {
          background: #0b7285;
        }

        .switch-on .switch-knob {
          transform: translateX(-19px);
          background: #67e8f9;
        }

        .matrix {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .matrix-item {
          border-radius: 16px;
          padding: 15px;
          background: #08182a;
          border: 1px solid #172d43;
        }

        .matrix-active {
          border-color: #1d4254;
        }

        .matrix-disabled {
          opacity: 0.45;
        }

        .matrix-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .matrix-top strong {
          font-size: 11px;
        }

        .matrix-value {
          margin-top: 15px;
          font-size: 13px;
          color: #f2f7fb;
        }

        .matrix-item p {
          color: #61758b;
          line-height: 1.7;
          font-size: 9px;
          margin: 6px 0 0;
        }

        .zones-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .zone-card {
          border-radius: 17px;
          padding: 15px;
          background: #08192a;
          border: 1px solid #172e44;
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .zone-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #10263a;
          color: #67e8f9;
          font-weight: 900;
        }

        .zone-card span,
        .zone-card strong,
        .zone-card small {
          display: block;
        }

        .zone-card span {
          color: #71869a;
          font-size: 9px;
        }

        .zone-card strong {
          margin-top: 7px;
          font-size: 12px;
        }

        .zone-card small {
          margin-top: 5px;
          color: #5f7388;
          font-size: 9px;
          line-height: 1.6;
        }

        .telegram-card {
          margin-top: 14px;
          border-radius: 22px;
          padding: 20px;
        }

        .telegram-main {
          display: flex;
          gap: 13px;
          align-items: center;
        }

        .telegram-icon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          border-radius: 17px;
          background: #102d43;
          font-size: 25px;
        }

        .telegram-main h3 {
          margin: 0;
          font-size: 17px;
        }

        .telegram-main p {
          color: #71859a;
          line-height: 1.8;
          font-size: 11px;
          margin: 6px 0 0;
        }

        .telegram-status {
          margin-top: 17px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #172e44;
          background: #071728;
          border-radius: 14px;
          padding: 12px;
        }

        .telegram-status strong,
        .telegram-status span {
          display: block;
        }

        .telegram-status strong {
          font-size: 11px;
        }

        .telegram-status span {
          color: #61758a;
          font-size: 9px;
          margin-top: 4px;
        }

        .telegram-types {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .telegram-types span {
          border: 1px solid #1a344b;
          background: #0a1b2c;
          color: #8497aa;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 9px;
        }

        .notice {
          margin-top: 28px;
          border-radius: 18px;
          padding: 17px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border-color: rgba(234, 179, 8, 0.2);
          background:
            linear-gradient(
              145deg,
              rgba(51, 39, 7, 0.55),
              rgba(15, 27, 35, 0.95)
            );
        }

        .notice-icon {
          font-size: 20px;
        }

        .notice strong {
          font-size: 12px;
          color: #facc15;
        }

        .notice p {
          color: #8c8975;
          font-size: 10px;
          line-height: 1.9;
          margin: 7px 0 0;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 30px;
          padding: 18px 4px;
          color: #53677b;
          font-size: 9px;
        }

        .footer strong,
        .footer span {
          display: block;
        }

        .footer strong {
          color: #8da1b5;
          font-size: 11px;
          margin-bottom: 4px;
        }

        @media (max-width: 900px) {
          .market-grid,
          .summary-grid,
          .zones-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .matrix {
            grid-template-columns: repeat(2, 1fr);
          }

          .analysis-main {
            grid-template-columns: 1fr;
          }

          .chart-shell {
            height: 560px;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 18px 10px 45px;
          }

          .header {
            flex-direction: column;
          }

          .engine-status {
            width: 100%;
          }

          .control-card,
          .analysis-status-card,
          .logic-card,
          .telegram-card {
            padding: 15px;
          }

          .market-grid,
          .summary-grid,
          .bots-grid,
          .filters-grid,
          .matrix,
          .zones-grid {
            grid-template-columns: 1fr;
          }

          .chart-card {
            padding: 3px;
            border-radius: 18px;
          }

          .chart-shell {
            height: 500px;
            min-height: 500px;
            border-radius: 14px;
          }

          .section {
            margin-top: 30px;
          }

          .section-title h2 {
            font-size: 18px;
          }

          .section-title p {
            font-size: 11px;
          }

          .status-header h3 {
            font-size: 29px;
          }

          .decision-list {
            grid-template-columns: 1fr 1fr;
          }

          .bot-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .bot-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .footer {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
