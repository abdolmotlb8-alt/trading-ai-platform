"use client";

import { useState } from "react";

const markets = [
  {
    name: "XAU/USD",
    title: "Gold",
    icon: "🥇",
    price: "$2,450.00",
    change: "+0.82%",
    positive: true,
  },
  {
    name: "BTC/USDT",
    title: "Bitcoin",
    icon: "₿",
    price: "$62,000.00",
    change: "+1.42%",
    positive: true,
  },
  {
    name: "ETH/USDT",
    title: "Ethereum",
    icon: "Ξ",
    price: "$3,200.00",
    change: "+0.91%",
    positive: true,
  },
  {
    name: "EUR/USD",
    title: "Euro / Dollar",
    icon: "€",
    price: "1.0850",
    change: "-0.30%",
    positive: false,
  },
];

export default function MarketPage() {
  const [selectedMarket, setSelectedMarket] = useState("XAU/USD");

  const selected =
    markets.find((market) => market.name === selectedMarket) || markets[0];

  return (
    <main dir="rtl" className="market-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .market-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(6, 182, 212, 0.13),
              transparent 28%
            ),
            radial-gradient(
              circle at 0% 100%,
              rgba(37, 99, 235, 0.12),
              transparent 30%
            ),
            #07111f;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
          padding: 28px;
        }

        .market-container {
          width: min(1450px, 100%);
          margin: 0 auto;
        }

        .market-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .header-title h1 {
          margin: 0;
          font-size: clamp(27px, 4vw, 40px);
          font-weight: 900;
        }

        .header-title p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.9;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(34, 197, 94, 0.07);
          border: 1px solid rgba(34, 197, 94, 0.14);
          color: #86efac;
          font-size: 11px;
          font-weight: 700;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
        }

        .market-grid {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          gap: 20px;
          direction: ltr;
        }

        .watchlist,
        .chart-panel {
          direction: rtl;
        }

        .panel {
          background: rgba(10, 20, 35, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.11);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.16);
        }

        .watchlist {
          padding: 18px;
        }

        .panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 15px;
        }

        .panel-heading h2 {
          margin: 0;
          font-size: 17px;
        }

        .panel-heading span {
          color: #64748b;
          font-size: 10px;
        }

        .market-list {
          display: grid;
          gap: 9px;
        }

        .market-card {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.08);
          background: rgba(255, 255, 255, 0.025);
          border-radius: 17px;
          padding: 14px;
          color: white;
          text-align: right;
          cursor: pointer;
          transition: 0.2s;
        }

        .market-card:hover {
          border-color: rgba(34, 211, 238, 0.25);
          background: rgba(34, 211, 238, 0.045);
          transform: translateY(-1px);
        }

        .market-card.selected {
          border-color: rgba(34, 211, 238, 0.4);
          background: linear-gradient(
            135deg,
            rgba(6, 182, 212, 0.1),
            rgba(37, 99, 235, 0.06)
          );
        }

        .market-top {
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
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(34, 211, 238, 0.08);
          color: #22d3ee;
          font-size: 18px;
          font-weight: 900;
        }

        .market-title {
          font-size: 13px;
          font-weight: 800;
        }

        .market-symbol {
          margin-top: 4px;
          color: #64748b;
          font-size: 9px;
          direction: ltr;
          text-align: right;
        }

        .change {
          padding: 6px 8px;
          border-radius: 9px;
          font-size: 9px;
          font-weight: 800;
        }

        .positive {
          color: #4ade80;
          background: rgba(34, 197, 94, 0.08);
        }

        .negative {
          color: #fb7185;
          background: rgba(244, 63, 94, 0.08);
        }

        .market-price {
          margin-top: 14px;
          font-size: 17px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .chart-panel {
          padding: 20px;
          min-width: 0;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .selected-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selected-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            rgba(6, 182, 212, 0.18),
            rgba(37, 99, 235, 0.16)
          );
          color: #67e8f9;
          font-size: 21px;
          font-weight: 900;
        }

        .selected-title {
          font-size: 19px;
          font-weight: 900;
        }

        .selected-symbol {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
          direction: ltr;
          text-align: right;
        }

        .selected-price {
          text-align: left;
          direction: ltr;
        }

        .selected-price strong {
          display: block;
          font-size: 22px;
        }

        .selected-price span {
          display: block;
          margin-top: 5px;
          color: #4ade80;
          font-size: 10px;
          font-weight: 700;
        }

        .timeframes {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 14px;
        }

        .timeframe {
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(255, 255, 255, 0.025);
          color: #64748b;
          border-radius: 9px;
          padding: 7px 11px;
          font-size: 9px;
          cursor: pointer;
        }

        .timeframe.active {
          color: #22d3ee;
          border-color: rgba(34, 211, 238, 0.25);
          background: rgba(34, 211, 238, 0.08);
        }

        .chart-placeholder {
          position: relative;
          min-height: 430px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.08);
          background:
            linear-gradient(
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            ),
            #081321;
          background-size: 55px 55px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-line {
          position: absolute;
          left: 5%;
          right: 5%;
          top: 50%;
          height: 180px;
          transform: translateY(-50%);
        }

        .chart-line svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .chart-message {
          position: relative;
          z-index: 2;
          padding: 18px 22px;
          border-radius: 15px;
          background: rgba(7, 17, 31, 0.86);
          border: 1px solid rgba(34, 211, 238, 0.12);
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .chart-message strong {
          display: block;
          font-size: 13px;
        }

        .chart-message span {
          display: block;
          margin-top: 7px;
          color: #64748b;
          font-size: 10px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 15px;
        }

        .info-box {
          padding: 15px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(148, 163, 184, 0.07);
        }

        .info-box span {
          display: block;
          color: #64748b;
          font-size: 9px;
        }

        .info-box strong {
          display: block;
          margin-top: 7px;
          font-size: 12px;
        }

        .alerts {
          margin-top: 20px;
          padding: 20px;
        }

        .alert-box {
          margin-top: 13px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(148, 163, 184, 0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .alert-box strong {
          display: block;
          font-size: 12px;
        }

        .alert-box p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.8;
        }

        .alert-button {
          border: 0;
          border-radius: 10px;
          padding: 9px 13px;
          background: rgba(34, 211, 238, 0.08);
          color: #22d3ee;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        @media (max-width: 1050px) {
          .market-grid {
            grid-template-columns: 1fr;
          }

          .watchlist {
            order: 2;
          }

          .chart-panel {
            order: 1;
          }

          .market-list {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .market-page {
            padding: 14px;
          }

          .market-header {
            align-items: flex-start;
          }

          .live-badge {
            display: none;
          }

          .chart-panel,
          .watchlist,
          .alerts {
            padding: 15px;
            border-radius: 20px;
          }

          .chart-header {
            align-items: flex-start;
          }

          .selected-price strong {
            font-size: 17px;
          }

          .chart-placeholder {
            min-height: 330px;
          }

          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .market-list {
            grid-template-columns: 1fr;
          }

          .market-header {
            display: block;
          }

          .header-title h1 {
            font-size: 27px;
          }

          .chart-header {
            display: block;
          }

          .selected-price {
            margin-top: 13px;
            text-align: right;
          }

          .info-grid {
            grid-template-columns: 1fr 1fr;
          }

          .alert-box {
            display: block;
          }

          .alert-button {
            margin-top: 10px;
          }
        }
      `}</style>

      <div className="market-container">

        {/* Header */}
        <header className="market-header">
          <div className="header-title">
            <h1>بازار و نمودار</h1>
            <p>
              وضعیت بازارهای مالی، قیمت‌ها و ابزارهای تحلیل Trading AI
            </p>
          </div>

          <div className="live-badge">
            <span className="live-dot" />
            وضعیت بازار
          </div>
        </header>

        {/* Main Market Area */}
        <section className="market-grid">

          {/* Watchlist */}
          <aside className="panel watchlist">

            <div className="panel-heading">
              <h2>بازارها</h2>
              <span>Watchlist</span>
            </div>

            <div className="market-list">

              {markets.map((market) => (
                <button
                  key={market.name}
                  type="button"
                  className={`market-card ${
                    selectedMarket === market.name ? "selected" : ""
                  }`}
                  onClick={() => setSelectedMarket(market.name)}
                >
                  <div className="market-top">

                    <div className="market-name">

                      <div className="market-icon">
                        {market.icon}
                      </div>

                      <div>
                        <div className="market-title">
                          {market.title}
                        </div>

                        <div className="market-symbol">
                          {market.name}
                        </div>
                      </div>

                    </div>

                    <span
                      className={`change ${
                        market.positive ? "positive" : "negative"
                      }`}
                    >
                      {market.change}
                    </span>

                  </div>

                  <div className="market-price">
                    {market.price}
                  </div>

                </button>
              ))}

            </div>

          </aside>

          {/* Chart */}
          <section className="panel chart-panel">

            <div className="chart-header">

              <div className="selected-info">

                <div className="selected-icon">
                  {selected.icon}
                </div>

                <div>
                  <div className="selected-title">
                    {selected.title}
                  </div>

                  <div className="selected-symbol">
                    {selected.name}
                  </div>
                </div>

              </div>

              <div className="selected-price">
                <strong>{selected.price}</strong>
                <span>{selected.change} امروز</span>
              </div>

            </div>

            {/* Timeframes */}
            <div className="timeframes">

              <button className="timeframe">
                1m
              </button>

              <button className="timeframe active">
                5m
              </button>

              <button className="timeframe">
                15m
              </button>

              <button className="timeframe">
                1H
              </button>

              <button className="timeframe">
                4H
              </button>

              <button className="timeframe">
                1D
              </button>

            </div>

            {/* Chart Placeholder */}
            <div className="chart-placeholder">

              <div className="chart-line">

                <svg
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points="
                      0,220
                      70,205
                      130,225
                      190,170
                      245,185
                      310,135
                      370,155
                      430,105
                      500,125
                      555,75
                      620,115
                      680,90
                      735,135
                      790,80
                      850,100
                      910,55
                      1000,25
                    "
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <polyline
                    points="
                      0,245
                      70,230
                      130,250
                      190,195
                      245,210
                      310,160
                      370,180
                      430,130
                      500,150
                      555,100
                      620,140
                      680,115
                      735,160
                      790,105
                      850,125
                      910,80
                      1000,50
                    "
                    fill="none"
                    stroke="rgba(34,211,238,0.15)"
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

              </div>

              <div className="chart-message">
                <strong>نمودار بازار</strong>
                <span>
                  اتصال داده زنده در مرحله بعد فعال می‌شود
                </span>
              </div>

            </div>

            {/* Market Information */}
            <div className="info-grid">

              <div className="info-box">
                <span>قیمت</span>
                <strong>{selected.price}</strong>
              </div>

              <div className="info-box">
                <span>تغییر روزانه</span>
                <strong
                  className={
                    selected.positive ? "positive" : "negative"
                  }
                >
                  {selected.change}
                </strong>
              </div>

              <div className="info-box">
                <span>وضعیت</span>
                <strong className="positive">
                  بازار فعال
                </strong>
              </div>

              <div className="info-box">
                <span>نماد</span>
                <strong>{selected.name}</strong>
              </div>

            </div>

          </section>

        </section>

        {/* Price Alerts */}
        <section className="panel alerts">

          <div className="panel-heading">
            <h2>🔔 هشدار قیمت</h2>
            <span>Price Alerts</span>
          </div>

          <div className="alert-box">

            <div>
              <strong>
                تنظیم هشدار برای بازار
              </strong>

              <p>
                در مرحله بعد می‌توانید برای طلا، بیت‌کوین،
                اتریوم و سایر نمادها هشدار قیمت تنظیم کنید.
              </p>
            </div>

            <button className="alert-button" type="button">
              به‌زودی فعال می‌شود
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}
