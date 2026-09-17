import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export default async function AIAnalysisPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,.14), transparent 35%), #06101e",
          color: "#f8fafc",
          padding: "70px 20px",
          fontFamily: "Arial, Tahoma, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "45px 30px",
            textAlign: "center",
            borderRadius: "28px",
            background: "rgba(15,23,42,.75)",
            border: "1px solid rgba(148,163,184,.14)",
          }}
        >
          <div style={{ fontSize: "55px", marginBottom: "20px" }}>🔐</div>

          <h1 style={{ fontSize: "32px", marginBottom: "15px" }}>
            ورود به تحلیل هوشمند
          </h1>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 2,
              marginBottom: "28px",
            }}
          >
            برای استفاده از ابزارهای تحلیل هوشمند ابتدا وارد حساب کاربری خود
            شوید.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 28px",
              borderRadius: "14px",
              background: "#22d3ee",
              color: "#04121e",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ورود به حساب
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(34,211,238,.12), transparent 30%), radial-gradient(circle at bottom left, rgba(37,99,235,.12), transparent 30%), #06101e",
        color: "#f8fafc",
        padding: "28px 16px 70px",
        fontFamily: "Arial, Tahoma, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>

        {/* Header */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            padding: "25px",
            borderRadius: "24px",
            background: "rgba(15,23,42,.72)",
            border: "1px solid rgba(148,163,184,.13)",
            marginBottom: "22px",
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
                marginBottom: "12px",
              }}
            >
              ✦ AI MARKET INTELLIGENCE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 5vw, 46px)",
                lineHeight: 1.3,
              }}
            >
              تحلیل هوشمند بازار
            </h1>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: 1.9,
                margin: "10px 0 0",
              }}
            >
              بررسی وضعیت بازار با ابزارهای هوشمند Trading AI
            </p>
          </div>

          <div
            style={{
              minWidth: "180px",
              padding: "16px 18px",
              borderRadius: "18px",
              background: "rgba(6,182,212,.07)",
              border: "1px solid rgba(34,211,238,.14)",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                marginBottom: "7px",
              }}
            >
              کاربر
            </div>

            <strong style={{ fontSize: "17px" }}>{user.name}</strong>

            <div
              style={{
                color: "#22d3ee",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              پلن {user.plan}
            </div>
          </div>
        </section>

        {/* Market overview */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
            marginBottom: "22px",
          }}
        >
          {[
            {
              title: "Gold",
              symbol: "XAU/USD",
              price: "$2,450.00",
              change: "+0.82%",
              icon: "🥇",
            },
            {
              title: "Bitcoin",
              symbol: "BTC/USDT",
              price: "$62,000.00",
              change: "+1.42%",
              icon: "₿",
            },
            {
              title: "Ethereum",
              symbol: "ETH/USDT",
              price: "$3,200.00",
              change: "+0.91%",
              icon: "Ξ",
            },
            {
              title: "Euro / Dollar",
              symbol: "EUR/USD",
              price: "1.0850",
              change: "-0.30%",
              icon: "€",
            },
          ].map((market) => (
            <div
              key={market.symbol}
              style={{
                padding: "20px",
                borderRadius: "20px",
                background: "rgba(15,23,42,.72)",
                border: "1px solid rgba(148,163,184,.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "17px" }}>
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

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
              >
                {market.price}
              </div>

              <div
                style={{
                  color: market.change.startsWith("-")
                    ? "#fb7185"
                    : "#4ade80",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {market.change}
              </div>
            </div>
          ))}
        </section>

        {/* Main analysis */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, .8fr)",
            gap: "20px",
            marginBottom: "22px",
          }}
        >
          {/* Chart */}
          <div
            style={{
              padding: "24px",
              borderRadius: "26px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                marginBottom: "22px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  تحلیل XAU/USD
                </h2>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  تحلیل نمونه بازار — اتصال داده زنده در مرحله بعد
                </p>
              </div>

              <span
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "rgba(34,197,94,.08)",
                  color: "#4ade80",
                  fontSize: "12px",
                }}
              >
                ● بازار فعال
              </span>
            </div>

            <div
              style={{
                height: "310px",
                borderRadius: "20px",
                border: "1px solid rgba(148,163,184,.08)",
                background:
                  "linear-gradient(rgba(148,163,184,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.045) 1px, transparent 1px), #081523",
                backgroundSize: "52px 52px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <svg
                viewBox="0 0 900 310"
                preserveAspectRatio="none"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <polyline
                  points="0,235 70,210 130,225 190,175 250,195 315,130 380,155 445,105 510,145 575,88 640,115 705,70 770,92 835,42 900,65"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <polyline
                  points="0,250 70,225 130,240 190,190 250,210 315,145 380,170 445,120 510,160 575,103 640,130 705,85 770,107 835,57 900,80"
                  fill="none"
                  stroke="rgba(34,211,238,.16)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                style={{
                  position: "absolute",
                  top: "18px",
                  right: "18px",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  background: "rgba(7,17,31,.82)",
                  color: "#94a3b8",
                  fontSize: "11px",
                }}
              >
                نمودار نمایشی
              </div>
            </div>
          </div>

          {/* AI signal */}
          <div
            style={{
              padding: "24px",
              borderRadius: "26px",
              background:
                "linear-gradient(145deg, rgba(8,47,73,.72), rgba(15,23,42,.82))",
              border: "1px solid rgba(34,211,238,.16)",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background: "rgba(34,211,238,.1)",
                fontSize: "25px",
                marginBottom: "18px",
              }}
            >
              🧠
            </div>

            <h2 style={{ margin: "0 0 10px", fontSize: "22px" }}>
              نتیجه تحلیل AI
            </h2>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                lineHeight: 1.9,
              }}
            >
              این بخش برای نمایش نتیجه تحلیل الگوریتم هوشمند طراحی شده و در
              مرحله اتصال موتور تحلیل، داده واقعی در آن نمایش داده خواهد شد.
            </p>

            <div
              style={{
                marginTop: "22px",
                padding: "18px",
                borderRadius: "18px",
                background: "rgba(15,23,42,.65)",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                وضعیت فعلی
              </div>

              <strong
                style={{
                  fontSize: "23px",
                  color: "#22d3ee",
                }}
              >
                آماده تحلیل
              </strong>
            </div>

            <button
              type="button"
              style={{
                width: "100%",
                marginTop: "15px",
                minHeight: "48px",
                border: 0,
                borderRadius: "14px",
                background: "#22d3ee",
                color: "#04121e",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              شروع تحلیل
            </button>
          </div>
        </section>

        {/* Indicators */}
        <section
          style={{
            padding: "24px",
            borderRadius: "26px",
            background: "rgba(15,23,42,.72)",
            border: "1px solid rgba(148,163,184,.12)",
            marginBottom: "22px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "23px" }}>
              شاخص‌های تحلیل
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              ساختار آماده برای اتصال اندیکاتورها و موتور تحلیل
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            {[
              ["RSI", "56.4", "متعادل", "#22d3ee"],
              ["MACD", "+0.18", "مثبت", "#4ade80"],
              ["Trend", "Bullish", "صعودی", "#4ade80"],
              ["Volatility", "Medium", "متوسط", "#facc15"],
            ].map(([name, value, status, color]) => (
              <div
                key={name}
                style={{
                  padding: "18px",
                  borderRadius: "18px",
                  background: "#0b1929",
                  border: "1px solid rgba(148,163,184,.09)",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginBottom: "10px",
                  }}
                >
                  {name}
                </div>

                <strong style={{ fontSize: "21px" }}>{value}</strong>

                <div
                  style={{
                    color,
                    fontSize: "12px",
                    marginTop: "8px",
                  }}
                >
                  {status}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "16px",
          }}
        >
          <Link
            href="/market"
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>📊</div>

            <h3 style={{ margin: "0 0 8px" }}>بازار و نمودار</h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              مشاهده بازارها و نمودارهای معاملاتی
            </p>
          </Link>

          <Link
            href="/bots"
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🤖</div>

            <h3 style={{ margin: "0 0 8px" }}>ربات‌های معاملاتی</h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              مدیریت ربات‌ها و مشاهده عملکرد آن‌ها
            </p>
          </Link>

          <Link
            href="/broker"
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(148,163,184,.12)",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🔗</div>

            <h3 style={{ margin: "0 0 8px" }}>اتصال بروکر</h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              آماده‌سازی اتصال حساب معاملاتی به پلتفرم
            </p>
          </Link>
        </section>

      </div>
    </main>
  );
}
