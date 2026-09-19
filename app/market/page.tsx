"use client";

import { useEffect, useRef, useState } from "react";

type Market = {
  id: string;
  title: string;
  name: string;
  symbol: string;
  tradingViewSymbol: string;
};

const markets: Market[] = [
  {
    id: "gold",
    title: "XAU/USD",
    name: "طلا",
    symbol: "XAUUSD",
    tradingViewSymbol: "OANDA:XAUUSD",
  },
  {
    id: "btc",
    title: "BTC/USDT",
    name: "بیت‌کوین",
    symbol: "BTCUSDT",
    tradingViewSymbol: "BINANCE:BTCUSDT",
  },
  {
    id: "eth",
    title: "ETH/USDT",
    name: "اتریوم",
    symbol: "ETHUSDT",
    tradingViewSymbol: "BINANCE:ETHUSDT",
  },
  {
    id: "eurusd",
    title: "EUR/USD",
    name: "یورو / دلار",
    symbol: "EURUSD",
    tradingViewSymbol: "OANDA:EURUSD",
  },
];

const intervals = [
  { label: "1د", value: "1" },
  { label: "5د", value: "5" },
  { label: "15د", value: "15" },
  { label: "1س", value: "60" },
  { label: "4س", value: "240" },
  { label: "روزانه", value: "D" },
];

function TradingViewChart({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    container.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.width = "100%";
    widgetContainer.style.height = "100%";

    container.appendChild(widgetContainer);

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
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "#07111f",
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{
        width: "100%",
        height: "520px",
      }}
    />
  );
}

export default function MarketPage() {
  const [selectedMarket, setSelectedMarket] = useState<Market>(markets[0]);
  const [selectedInterval, setSelectedInterval] = useState("15");

  return (
    <main dir="rtl" className="market-page">
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .market-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(14, 165, 233, 0.09),
              transparent 28%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(34, 211, 238, 0.06),
              transparent 30%
            ),
            #020817;
          color: #e5eef8;
          padding: 28px;
        }

        .container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 26px;
        }

        .title-area h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .title-area p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .live-status {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 15px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 12px;
          background: rgba(8, 47, 73, 0.25);
          color: #67e8f9;
          font-size: 13px;
          white-space: nowrap;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.8);
        }

        .layout {
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .watchlist,
        .chart-card,
        .info-card,
        .alert-card {
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(15, 23, 42, 0.78);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(14px);
        }

        .watchlist {
          border-radius: 18px;
          padding: 16px;
        }

        .watchlist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .watchlist-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .watchlist-header span {
          color: #64748b;
          font-size: 12px;
        }

        .market-item {
          width: 100%;
          border: 1px solid transparent;
          border-radius: 14px;
          background: transparent;
          padding: 14px;
          margin-bottom: 8px;
          color: inherit;
          cursor: pointer;
          text-align: right;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .market-item:last-child {
          margin-bottom: 0;
        }

        .market-item:hover {
          transform: translateY(-1px);
          background: rgba(30, 41, 59, 0.65);
          border-color: rgba(148, 163, 184, 0.1);
        }

        .market-item.active {
          background: linear-gradient(
            135deg,
            rgba(8, 145, 178, 0.18),
            rgba(15, 23, 42, 0.9)
          );
          border-color: rgba(34, 211, 238, 0.35);
        }

        .market-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .market-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .market-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: rgba(30, 41, 59, 0.9);
          color: #67e8f9;
          font-size: 12px;
          font-weight: 800;
        }

        .market-text strong {
          display: block;
          font-size: 14px;
          font-weight: 800;
        }

        .market-text span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
        }

        .live-pill {
          border: 1px solid rgba(34, 211, 238, 0.22);
          background: rgba(8, 145, 178, 0.1);
          color: #67e8f9;
          padding: 4px 7px;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 800;
        }

        .chart-area {
          min-width: 0;
        }

        .chart-card {
          overflow: hidden;
          border-radius: 18px;
        }

        .chart-header {
          padding: 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .selected-symbol {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .symbol-title {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .symbol-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(8, 145, 178, 0.12);
          border: 1px solid rgba(34, 211, 238, 0.15);
          color: #67e8f9;
          font-weight: 900;
          font-size: 13px;
        }

        .symbol-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 850;
        }

        .symbol-title p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .live-price {
          text-align: left;
        }

        .live-price strong {
          display: block;
          color: #67e8f9;
          font-size: 18px;
          font-weight: 900;
        }

        .live-price span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
        }

        .timeframes {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 18px;
        }

        .timeframe {
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(30, 41, 59, 0.6);
          color: #94a3b8;
          border-radius: 9px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s ease;
        }

        .timeframe:hover {
          color: #e2e8f0;
          border-color: rgba(34, 211, 238, 0.2);
        }

        .timeframe.active {
          color: #67e8f9;
          background: rgba(8, 145, 178, 0.14);
          border-color: rgba(34, 211, 238, 0.3);
        }

        .chart-wrapper {
          width: 100%;
          min-height: 520px;
          background: #07111f;
        }

        .chart-note {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 12px 18px;
          border-top: 1px solid rgba(148, 163, 184, 0.08);
          color: #64748b;
          font-size: 11px;
        }

        .chart-note strong {
          color: #94a3b8;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }

        .info-card,
        .alert-card {
          border-radius: 18px;
          padding: 20px;
        }

        .card-title {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 800;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .info-item {
          padding: 14px;
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.48);
          border: 1px solid rgba(148, 163, 184, 0.06);
        }

        .info-item span {
          display: block;
          color: #64748b;
          font-size: 11px;
          margin-bottom: 7px;
        }

        .info-item strong {
          display: block;
          font-size: 13px;
          color: #dbeafe;
        }

        .alert-content {
          padding: 16px;
          border-radius: 13px;
          background: rgba(30, 41, 59, 0.48);
          border: 1px solid rgba(148, 163, 184, 0.06);
        }

        .alert-content p {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.9;
        }

        .alert-button {
          width: 100%;
          margin-top: 14px;
          border: 1px solid rgba(34, 211, 238, 0.18);
          border-radius: 11px;
          background: rgba(8, 145, 178, 0.1);
          color: #67e8f9;
          padding: 11px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .alert-button:hover {
          background: rgba(8, 145, 178, 0.16);
        }

        @media (max-width: 1050px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .watchlist {
            order: 2;
          }

          .chart-area {
            order: 1;
          }
        }

        @media (max-width: 700px) {
          .market-page {
            padding: 15px;
          }

          .top-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .selected-symbol {
            align-items: flex-start;
            flex-direction: column;
          }

          .live-price {
            text-align: right;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .chart-wrapper {
            min-height: 430px;
          }
        }
      `}</style>

      <div className="container">
        <header className="top-header">
          <div className="title-area">
            <h1>بازارهای مالی</h1>
            <p>
              مشاهده نمودار بازارها با داده‌های ارائه‌شده توسط TradingView
            </p>
          </div>

          <div className="live-status">
            <span className="live-dot" />
            اتصال نمودار فعال
          </div>
        </header>

        <div className="layout">
          <aside className="watchlist">
            <div className="watchlist-header">
              <h2>بازارها</h2>
              <span>{markets.length} نماد</span>
            </div>

            {markets.map((market) => (
              <button
                key={market.id}
                type="button"
                className={`market-item ${
                  selectedMarket.id === market.id ? "active" : ""
                }`}
                onClick={() => setSelectedMarket(market)}
              >
                <div className="market-row">
                  <div className="market-name">
                    <div className="market-icon">
                      {market.id === "gold"
                        ? "XAU"
                        : market.id === "btc"
                          ? "BTC"
                          : market.id === "eth"
                            ? "ETH"
                            : "EUR"}
                    </div>

                    <div className="market-text">
                      <strong>{market.title}</strong>
                      <span>{market.name}</span>
                    </div>
                  </div>

                  <span className="live-pill">LIVE</span>
                </div>
              </button>
            ))}
          </aside>

          <section className="chart-area">
            <div className="chart-card">
              <div className="chart-header">
                <div className="selected-symbol">
                  <div className="symbol-title">
                    <div className="symbol-icon">
                      {selectedMarket.id === "gold"
                        ? "XAU"
                        : selectedMarket.id === "btc"
                          ? "BTC"
                          : selectedMarket.id === "eth"
                            ? "ETH"
                            : "EUR"}
                    </div>

                    <div>
                      <h2>{selectedMarket.title}</h2>
                      <p>{selectedMarket.name}</p>
                    </div>
                  </div>

                  <div className="live-price">
                    <strong>LIVE</strong>
                    <span>قیمت زنده داخل نمودار</span>
                  </div>
                </div>

                <div className="timeframes">
                  {intervals.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`timeframe ${
                        selectedInterval === item.value ? "active" : ""
                      }`}
                      onClick={() => setSelectedInterval(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chart-wrapper">
                <TradingViewChart
                  symbol={selectedMarket.tradingViewSymbol}
                  interval={selectedInterval}
                />
              </div>

              <div className="chart-note">
                <span>
                  منبع نمودار: <strong>TradingView</strong>
                </span>

                <span>
                  نماد: <strong>{selectedMarket.symbol}</strong>
                </span>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="info-card">
                <h3 className="card-title">اطلاعات بازار</h3>

                <div className="info-grid">
                  <div className="info-item">
                    <span>نماد انتخاب‌شده</span>
                    <strong>{selectedMarket.title}</strong>
                  </div>

                  <div className="info-item">
                    <span>منبع داده نمودار</span>
                    <strong>TradingView</strong>
                  </div>

                  <div className="info-item">
                    <span>بازه زمانی</span>
                    <strong>
                      {intervals.find(
                        (item) => item.value === selectedInterval
                      )?.label ?? "15د"}
                    </strong>
                  </div>

                  <div className="info-item">
                    <span>وضعیت</span>
                    <strong>نمودار فعال</strong>
                  </div>
                </div>
              </div>

              <div className="alert-card">
                <h3 className="card-title">هشدار قیمت</h3>

                <div className="alert-content">
                  <p>
                    سیستم هشدار قیمت در حال آماده‌سازی است. در مرحله بعد
                    می‌توانیم هشدارهای شخصی برای طلا، بیت‌کوین و سایر نمادها
                    اضافه کنیم.
                  </p>

                  <button type="button" className="alert-button">
                    افزودن هشدار — به‌زودی
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
