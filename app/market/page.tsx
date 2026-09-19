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
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.width = "100%";
    widget.style.height = "100%";

    container.appendChild(widget);

    const script = document.createElement("script");

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "exchange",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      withdateranges: true,
      save_image: true,
      calendar: false,
      details: false,
      hotlist: false,
      watchlist: [
        "OANDA:XAUUSD",
        "BINANCE:BTCUSDT",
        "BINANCE:ETHUSDT",
        "OANDA:EURUSD",
      ],
      studies: [
        "Volume@tv-basicstudies",
        "MASimple@tv-basicstudies",
        "MACD@tv-basicstudies",
        "RSI@tv-basicstudies",
        "BB@tv-basicstudies",
      ],
      show_popup_button: true,
      popup_width: "1200",
      popup_height: "800",
      support_host: "https://www.tradingview.com",
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
    />
  );
}

export default function MarketPage() {
  const [selectedMarket, setSelectedMarket] = useState<Market>(markets[0]);
  const [selectedInterval, setSelectedInterval] = useState("15");

  return (
    <main dir="rtl" className="market-page">
      <style jsx>{`
        .market-page {
          min-height: 100vh;
          padding: 24px;
          background: #020817;
          color: #e5eef8;
        }

        .container {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .title-area h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
        }

        .title-area p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .live-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          border: 1px solid rgba(34, 211, 238, 0.25);
          border-radius: 12px;
          background: rgba(8, 47, 73, 0.35);
          color: #67e8f9;
          font-size: 13px;
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
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 18px;
        }

        .watchlist {
          padding: 14px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.85);
          height: fit-content;
          position: sticky;
          top: 15px;
        }

        .watchlist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 4px;
        }

        .watchlist-header h2 {
          margin: 0;
          font-size: 16px;
        }

        .watchlist-header span {
          color: #64748b;
          font-size: 11px;
        }

        .market-item {
          width: 100%;
          margin-bottom: 7px;
          padding: 13px;
          border: 1px solid transparent;
          border-radius: 13px;
          background: transparent;
          color: white;
          cursor: pointer;
          text-align: right;
        }

        .market-item:hover {
          background: rgba(30, 41, 59, 0.7);
        }

        .market-item.active {
          border-color: rgba(34, 211, 238, 0.35);
          background: rgba(8, 145, 178, 0.15);
        }

        .market-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          border-radius: 10px;
          background: #1e293b;
          color: #67e8f9;
          font-size: 10px;
          font-weight: 800;
        }

        .market-text strong {
          display: block;
          font-size: 13px;
        }

        .market-text span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .live-pill {
          padding: 4px 7px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 6px;
          color: #67e8f9;
          background: rgba(8, 145, 178, 0.12);
          font-size: 8px;
          font-weight: 800;
        }

        .chart-card {
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 18px;
          background: #0f172a;
        }

        .chart-header {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .selected-symbol {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .symbol-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .symbol-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 13px;
          background: rgba(8, 145, 178, 0.15);
          color: #67e8f9;
          font-size: 12px;
          font-weight: 900;
        }

        .symbol-title h2 {
          margin: 0;
          font-size: 20px;
        }

        .symbol-title p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .live-price {
          text-align: left;
        }

        .live-price strong {
          display: block;
          color: #67e8f9;
          font-size: 17px;
        }

        .live-price span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .timeframes {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 16px;
        }

        .timeframe {
          padding: 8px 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          background: #1e293b;
          color: #94a3b8;
          cursor: pointer;
          font-size: 10px;
        }

        .timeframe:hover {
          color: white;
        }

        .timeframe.active {
          border-color: rgba(34, 211, 238, 0.35);
          background: rgba(8, 145, 178, 0.2);
          color: #67e8f9;
        }

        .chart-wrapper {
          width: 100%;
          height: 760px;
          background: #07111f;
        }

        .tradingview-widget-container {
          width: 100%;
          height: 100%;
        }

        .chart-note {
          display: flex;
          justify-content: space-between;
          padding: 10px 18px;
          border-top: 1px solid rgba(148, 163, 184, 0.08);
          color: #64748b;
          font-size: 10px;
        }

        .chart-note strong {
          color: #94a3b8;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
        }

        .info-card,
        .alert-card {
          padding: 18px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.85);
        }

        .card-title {
          margin: 0 0 14px;
          font-size: 15px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .info-item {
          padding: 13px;
          border-radius: 11px;
          background: rgba(30, 41, 59, 0.55);
        }

        .info-item span {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 10px;
        }

        .info-item strong {
          font-size: 12px;
        }

        .alert-content {
          padding: 14px;
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.55);
        }

        .alert-content p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.9;
        }

        .alert-button {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 10px;
          background: rgba(8, 145, 178, 0.12);
          color: #67e8f9;
          cursor: pointer;
        }

        @media (max-width: 1000px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .watchlist {
            position: static;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .watchlist-header {
            grid-column: 1 / -1;
          }

          .market-item {
            margin-bottom: 0;
          }
        }

        @media (max-width: 650px) {
          .market-page {
            padding: 10px;
          }

          .top-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .title-area h1 {
            font-size: 25px;
          }

          .selected-symbol {
            flex-direction: column;
            align-items: flex-start;
          }

          .live-price {
            text-align: right;
          }

          .chart-wrapper {
            height: 680px;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 430px) {
          .watchlist {
            grid-template-columns: 1fr;
          }

          .watchlist-header {
            grid-column: auto;
          }

          .chart-wrapper {
            height: 620px;
          }

          .chart-header {
            padding: 14px;
          }
        }
      `}</style>

      <div className="container">
        <header className="top-header">
          <div className="title-area">
            <h1>بازارهای مالی</h1>
            <p>
              نمودار حرفه‌ای بازار با ابزارهای تحلیل تکنیکال
            </p>
          </div>

          <div className="live-status">
            <span className="live-dot" />
            اتصال TradingView فعال
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

          <section>
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
                    <span>داده زنده TradingView</span>
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
                      onClick={() =>
                        setSelectedInterval(item.value)
                      }
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
                  منبع: <strong>TradingView</strong>
                </span>

                <span>
                  نماد: <strong>{selectedMarket.symbol}</strong>
                </span>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="info-card">
                <h3 className="card-title">
                  امکانات نمودار
                </h3>

                <div className="info-grid">
                  <div className="info-item">
                    <span>نمودار</span>
                    <strong>کندلی</strong>
                  </div>

                  <div className="info-item">
                    <span>ابزار رسم</span>
                    <strong>فعال</strong>
                  </div>

                  <div className="info-item">
                    <span>اندیکاتورها</span>
                    <strong>فعال</strong>
                  </div>

                  <div className="info-item">
                    <span>تایم‌فریم</span>
                    <strong>قابل تغییر</strong>
                  </div>
                </div>
              </div>

              <div className="alert-card">
                <h3 className="card-title">
                  تحلیل هوشمند
                </h3>

                <div className="alert-content">
                  <p>
                    در مرحله بعد می‌توانیم سیگنال‌های Trading AI،
                    نقاط ورود، حد سود و حد ضرر ربات را مستقیماً
                    روی همین نمودار نمایش دهیم.
                  </p>

                  <button
                    type="button"
                    className="alert-button"
                  >
                    تحلیل هوشمند — به‌زودی
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
