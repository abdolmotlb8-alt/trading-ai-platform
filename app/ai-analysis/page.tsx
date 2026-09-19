"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Market = {
  title: string;
  symbol: string;
  tradingViewSymbol: string;
  icon: string;
};

const markets: Market[] = [
  {
    title: "Gold",
    symbol: "XAU/USD",
    tradingViewSymbol: "OANDA:XAUUSD",
    icon: "🥇",
  },
  {
    title: "Bitcoin",
    symbol: "BTC/USDT",
    tradingViewSymbol: "BINANCE:BTCUSDT",
    icon: "₿",
  },
  {
    title: "Ethereum",
    symbol: "ETH/USDT",
    tradingViewSymbol: "BINANCE:ETHUSDT",
    icon: "Ξ",
  },
  {
    title: "Euro / Dollar",
    symbol: "EUR/USD",
    tradingViewSymbol: "OANDA:EURUSD",
    icon: "€",
  },
];

function TradingViewChart({
  symbol,
}: {
  symbol: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.width = "100%";
    container.style.height = "100%";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.width = "100%";
    widget.style.height = "100%";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      save_image: false,
      withdateranges: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: [
        "Volume@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
      ],
    });

    container.appendChild(widget);
    container.appendChild(script);
    containerRef.current.appendChild(container);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "610px",
        minHeight: "500px",
      }}
    />
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AIAnalysisPage() {
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);
  const [timeframe, setTimeframe] = useState("15");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [analysisStatus, setAnalysisStatus] =
    useState("در انتظار موتور تحلیل");

  useEffect(() => {
    setLastUpdate(new Date());
  }, [selectedMarket, timeframe]);

  const startAnalysis = () => {
    setAnalysisStatus("در حال آماده‌سازی داده...");
    
    setTimeout(() => {
      setAnalysisStatus("موتور تحلیل آماده اتصال به داده زنده");
    }, 900);
  };

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(34,211,238,.13), transparent 30%), radial-gradient(circle at bottom left, rgba(37,99,235,.12), transparent 30%), #06101e",
        color: "#f8fafc",
        padding: "22px 16px 70px",
        fontFamily: "Arial, Tahoma, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1380px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            padding: "24px",
            borderRadius: "24px",
            background: "rgba(15,23,42,.78)",
            border: "1px solid rgba(148,163,184,.13)",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                padding: "7px 13px",
                borderRadius: "999px",
                background: "rgba(34,211,238,.09)",
                border: "1px solid rgba(34,211,238,.18)",
                color: "#67e8f9",
                fontSize: "12px",
                marginBottom: "10px",
              }}
            >
              ✦ LIVE AI MARKET INTELLIGENCE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 44px)",
                lineHeight: 1.3,
              }}
            >
              تحلیل هوشمند بازار
            </h1>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: 1.8,
                margin: "8px 0 0",
              }}
            >
              نمودار زنده + زیرساخت موتور تحلیل Trading AI
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "15px",
              background: "rgba(34,197,94,.07)",
              border: "1px solid rgba(34,197,94,.14)",
            }}
          >
            <span
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 14px rgba(34,197,94,.8)",
              }}
            />

            <div>
              <div
                style={{
                  color: "#4ade80",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                چارت زنده
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  marginTop: "3px",
                }}
              >
                TradingView
              </div>
            </div>
          </div>
        </section>

        {/* Market selector */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          {markets.map((market) => {
            const active =
              market.symbol === selectedMarket.symbol;

            return (
              <button
                key={market.symbol}
                type="button"
                onClick={() => setSelectedMarket(market)}
                style={{
                  textAlign: "right",
                  padding: "17px",
                  borderRadius: "18px",
                  background: active
                    ? "linear-gradient(145deg, rgba(8,47,73,.9), rgba(15,23,42,.9))"
                    : "rgba(15,23,42,.72)",
                  border: active
                    ? "1px solid rgba(34,211,238,.42)"
                    : "1px solid rgba(148,163,184,.12)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 0 25px rgba(34,211,238,.07)"
                    : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize: "17px",
                      }}
                    >
                      {market.title}
                    </strong>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        marginTop: "5px",
                      }}
                    >
                      {market.symbol}
                    </div>
                  </div>

                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "13px",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(34,211,238,.08)",
                      fontSize: "20px",
                    }}
                  >
                    {market.icon}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Main grid */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.65fr) minmax(300px, .75fr)",
            gap: "18px",
            marginBottom: "18px",
          }}
        >
          {/* Real chart */}
          <div
            style={{
              borderRadius: "24px",
              background: "rgba(15,23,42,.78)",
              border: "1px solid rgba(148,163,184,.13)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 22px",
                borderBottom:
                  "1px solid rgba(148,163,184,.09)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                  }}
                >
                  {selectedMarket.symbol}
                </h2>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  نمودار زنده بازار
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["1", "1m"],
                  ["5", "5m"],
                  ["15", "15m"],
                  ["60", "1h"],
                  ["240", "4h"],
                  ["D", "1D"],
                ].map(([value, label]) => {
                  const active = timeframe === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTimeframe(value)}
                      style={{
                        border: active
                          ? "1px solid rgba(34,211,238,.45)"
                          : "1px solid rgba(148,163,184,.12)",
                        background: active
                          ? "rgba(34,211,238,.12)"
                          : "rgba(2,8,23,.35)",
                        color: active
                          ? "#67e8f9"
                          : "#94a3b8",
                        padding: "7px 10px",
                        borderRadius: "9px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <TradingViewChart
              key={`${selectedMarket.tradingViewSymbol}-${timeframe}`}
              symbol={selectedMarket.tradingViewSymbol}
            />
          </div>

          {/* Analysis engine */}
          <aside
            style={{
              borderRadius: "24px",
              background:
                "linear-gradient(145deg, rgba(8,47,73,.72), rgba(15,23,42,.9))",
              border: "1px solid rgba(34,211,238,.17)",
              padding: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                  }}
                >
                  🧠 موتور تحلیل
                </h2>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {selectedMarket.symbol}
                </div>
              </div>

              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: "10px",
                  background: "rgba(250,204,21,.08)",
                  color: "#facc15",
                  fontSize: "11px",
                }}
              >
                در حال آماده‌سازی
              </span>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                background: "rgba(2,8,23,.35)",
                border:
                  "1px solid rgba(148,163,184,.08)",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  marginBottom: "8px",
                }}
              >
                وضعیت سیگنال
              </div>

              <strong
                style={{
                  display: "block",
                  fontSize: "25px",
                  color: "#94a3b8",
                }}
              >
                NO TRADE
              </strong>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  marginTop: "8px",
                  lineHeight: 1.8,
                }}
              >
                تا زمانی که موتور تحلیل داده واقعی و
                تأییدیه‌های لازم را دریافت نکند، هیچ
                سیگنال ساختگی نمایش داده نمی‌شود.
              </div>
            </div>

            {[
              ["Market Structure", "در انتظار داده"],
              ["Liquidity", "در انتظار داده"],
              ["Candlestick", "در انتظار داده"],
              ["Volume", "در انتظار داده"],
              ["Multi-Timeframe", "در انتظار داده"],
              ["News Filter", "در انتظار داده"],
            ].map(([name, value]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "11px 0",
                  borderBottom:
                    "1px solid rgba(148,163,184,.07)",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: "#cbd5e1" }}>
                  {name}
                </span>

                <span style={{ color: "#64748b" }}>
                  {value}
                </span>
              </div>
            ))}

            <button
              type="button"
              onClick={startAnalysis}
              style={{
                width: "100%",
                marginTop: "18px",
                minHeight: "48px",
                border: "1px solid rgba(34,211,238,.3)",
                borderRadius: "14px",
                background: "rgba(34,211,238,.1)",
                color: "#67e8f9",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {analysisStatus}
            </button>

            {lastUpdate && (
              <div
                style={{
                  textAlign: "center",
                  color: "#475569",
                  fontSize: "10px",
                  marginTop: "10px",
                }}
              >
                آخرین بارگذاری رابط:{" "}
                {formatTime(lastUpdate)}
              </div>
            )}
          </aside>
        </section>

        {/* Analysis bots */}
        <section
          style={{
            padding: "22px",
            borderRadius: "24px",
            background: "rgba(15,23,42,.78)",
            border:
              "1px solid rgba(148,163,184,.12)",
            marginBottom: "18px",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              ربات‌های تحلیل‌گر
            </h2>

            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                margin: "7px 0 0",
              }}
            >
              این ربات‌ها در مرحله بعد به موتور تحلیل
              واقعی متصل می‌شوند.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              [
                "🕯️",
                "تحلیل کندلی",
                "Candlestick Analyzer",
              ],
              [
                "🧠",
                "تحلیل Dynamic",
                "Dynamic Candlestick",
              ],
              [
                "📊",
                "Footprint / Order Flow",
                "Order Flow Analyzer",
              ],
              [
                "🔗",
                "تأیید چندگانه",
                "Confirmation Engine",
              ],
            ].map(([icon, title, subtitle]) => (
              <div
                key={title}
                style={{
                  padding: "18px",
                  borderRadius: "18px",
                  background: "#0b1929",
                  border:
                    "1px solid rgba(148,163,184,.09)",
                }}
              >
                <div
                  style={{
                    fontSize: "27px",
                    marginBottom: "12px",
                  }}
                >
                  {icon}
                </div>

                <strong
                  style={{
                    display: "block",
                    fontSize: "15px",
                  }}
                >
                  {title}
                </strong>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: "11px",
                    marginTop: "6px",
                  }}
                >
                  {subtitle}
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    display: "inline-flex",
                    padding: "5px 9px",
                    borderRadius: "8px",
                    background: "rgba(250,204,21,.07)",
                    color: "#facc15",
                    fontSize: "10px",
                  }}
                >
                  در انتظار اتصال داده
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Engine filters */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          {[
            ["ATR", "در انتظار"],
            ["Volatility", "در انتظار"],
            ["Trend", "در انتظار"],
            ["Liquidity", "در انتظار"],
            ["News Filter", "در انتظار"],
            ["Multi-Timeframe", "در انتظار"],
          ].map(([name, value]) => (
            <div
              key={name}
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "rgba(15,23,42,.72)",
                border:
                  "1px solid rgba(148,163,184,.1)",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "10px",
                  marginBottom: "7px",
                }}
              >
                {name}
              </div>

              <strong
                style={{
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                {value}
              </strong>
            </div>
          ))}
        </section>

        {/* Navigation */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <Link
            href="/market"
            style={{
              padding: "20px",
              borderRadius: "20px",
              background: "rgba(15,23,42,.72)",
              border:
                "1px solid rgba(148,163,184,.12)",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "10px",
              }}
            >
              📊
            </div>

            <strong>بازار و نمودار</strong>

            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.8,
                margin: "7px 0 0",
              }}
            >
              مشاهده نمودارها و بازارهای زنده
            </p>
          </Link>

          <Link
            href="/bots"
            style={{
              padding: "20px",
              borderRadius: "20px",
              background: "rgba(15,23,42,.72)",
              border:
                "1px solid rgba(148,163,184,.12)",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "10px",
              }}
            >
              🤖
            </div>

            <strong>ربات‌های تحلیل‌گر</strong>

            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.8,
                margin: "7px 0 0",
              }}
            >
              مدیریت و مشاهده وضعیت ربات‌های تحلیل
            </p>
          </Link>

          <Link
            href="/dashboard"
            style={{
              padding: "20px",
              borderRadius: "20px",
              background: "rgba(15,23,42,.72)",
              border:
                "1px solid rgba(148,163,184,.12)",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "10px",
              }}
            >
              🏠
            </div>

            <strong>داشبورد</strong>

            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.8,
                margin: "7px 0 0",
              }}
            >
              بازگشت به داشبورد اصلی Trading AI
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
