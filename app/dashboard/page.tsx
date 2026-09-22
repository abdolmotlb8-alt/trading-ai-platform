import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatCardProps = {
  icon: string;
  title: string;
  value: string | number;
  description: string;
  accent?: "gold" | "green" | "red";
};

function StatCard({
  icon,
  title,
  value,
  description,
  accent = "gold",
}: StatCardProps) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        <span>{title}</span>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-description">{description}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="feature-card">
      <div className="feature-icon">{icon}</div>

      <div className="feature-title">{title}</div>

      <div className="feature-description">{description}</div>

      <span className="feature-arrow">←</span>
    </Link>
  );
}

function MarketCard({
  symbol,
  icon,
}: {
  symbol: string;
  icon: string;
}) {
  return (
    <div className="market-card">
      <div className="market-icon">{icon}</div>

      <div className="market-info">
        <strong>{symbol}</strong>
        <span>داده زنده</span>
      </div>

      <div className="market-price">
        <strong>--</strong>
        <span>در انتظار داده</span>
      </div>

      <div className="mini-chart">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function EmptySignals() {
  return (
    <div className="empty-signals">
      <div className="empty-icon">⌁</div>

      <h3>هنوز سیگنال فعالی وجود ندارد</h3>

      <p>
        سیگنال‌های واقعی پس از اتصال موتور تحلیل و دریافت داده بازار در این بخش
        نمایش داده می‌شوند.
      </p>

      <Link href="/ai-analysis" className="gold-button small">
        شروع تحلیل بازار
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  let botsCount = 0;
  let signalsCount = 0;
  let tradesCount = 0;

  try {
    botsCount = await prisma.tradingBot.count({
      where: {
        userId: user.id,
      },
    });

    signalsCount = await prisma.tradingSignal.count({
      where: {
        userId: user.id,
      },
    });

    tradesCount = await prisma.trade.count({
      where: {
        userId: user.id,
      },
    });
  } catch {
    botsCount = 0;
    signalsCount = 0;
    tradesCount = 0;
  }

  const userName = user.name || "کاربر";

  const initial =
    userName
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  return (
    <main className="dashboard-page" dir="rtl">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* ================= HEADER ================= */}

      <header className="top-header">
        <div className="header-inner">
          <Link href="/dashboard" className="brand">
            <div className="brand-logo">
              <span>♛</span>
            </div>

            <div className="brand-text">
              <strong>TRADING AI</strong>
              <small>SMART TRADING PLATFORM</small>
            </div>
          </Link>

          <nav className="desktop-navigation">
            <Link href="/dashboard" className="nav-link active">
              <span>⌂</span>
              <small>داشبورد</small>
            </Link>

            <Link href="/signals" className="nav-link">
              <span>◈</span>
              <small>سیگنال‌ها</small>
            </Link>

            <Link href="/bots" className="nav-link">
              <span>♙</span>
              <small>ربات‌ها</small>
            </Link>

            <Link href="/market" className="nav-link">
              <span>▥</span>
              <small>بازارها</small>
            </Link>

            <Link href="/broker" className="nav-link">
              <span>▣</span>
              <small>کیف پول</small>
            </Link>

            <Link href="/settings" className="nav-link">
              <span>⚙</span>
              <small>تنظیمات</small>
            </Link>
          </nav>

          <div className="header-actions">
            <button className="notification-button" aria-label="اعلان‌ها">
              ♧
              <span />
            </button>

            <div className="profile-avatar">
              {initial}
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <div className="dashboard-container">

        {/* ================= HERO ================= */}

        <section className="hero-section">

          <div className="hero-content">

            <div className="hero-badge">
              <span className="live-dot" />
              سیستم تحلیل بازار فعال است
            </div>

            <h1>
              هوش مصنوعی
              <br />
              <span>تحلیل بازار</span>
            </h1>

            <p>
              تحلیل هوشمند بازارهای مالی با استفاده از داده‌های واقعی،
              مدیریت ریسک و الگوریتم‌های پیشرفته معاملاتی.
            </p>

            <div className="hero-actions">
              <Link href="/signals" className="gold-button">
                مشاهده سیگنال‌ها
                <span>←</span>
              </Link>

              <Link href="/ai-analysis" className="outline-button">
                تحلیل جدید
              </Link>
            </div>
          </div>

          <div className="hero-visual">

            <div className="gold-grid" />

            <div className="chart-background">
              <span style={{ height: "25%" }} />
              <span style={{ height: "40%" }} />
              <span style={{ height: "32%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "45%" }} />
              <span style={{ height: "66%" }} />
              <span style={{ height: "58%" }} />
              <span style={{ height: "75%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "88%" }} />
            </div>

            <div className="bull">
              ♞
            </div>

            <div className="hero-glow" />
          </div>

          <div className="hero-stat-grid">

            <div className="hero-stat">
              <span>ربات‌های فعال</span>
              <strong>{botsCount}</strong>
              <small>ربات متصل به حساب</small>
            </div>

            <div className="hero-stat">
              <span>کل سیگنال‌ها</span>
              <strong>{signalsCount}</strong>
              <small>سیگنال ثبت‌شده</small>
            </div>

            <div className="hero-stat">
              <span>معاملات</span>
              <strong>{tradesCount}</strong>
              <small>معاملات ثبت‌شده</small>
            </div>

            <div className="hero-stat">
              <span>وضعیت حساب</span>
              <strong className="green-text">فعال</strong>
              <small>سیستم آنلاین</small>
            </div>

          </div>
        </section>

        {/* ================= MARKET TICKERS ================= */}

        <section className="market-section">

          <div className="section-heading">
            <div>
              <span>MARKET OVERVIEW</span>
              <h2>بازارهای زنده</h2>
            </div>

            <Link href="/market">
              مشاهده بازارها ←
            </Link>
          </div>

          <div className="market-grid">

            <MarketCard
              symbol="BTC / USDT"
              icon="₿"
            />

            <MarketCard
              symbol="ETH / USDT"
              icon="Ξ"
            />

            <MarketCard
              symbol="XAU / USD"
              icon="Au"
            />

            <MarketCard
              symbol="EUR / USD"
              icon="€"
            />

            <MarketCard
              symbol="GBP / USD"
              icon="£"
            />

          </div>
        </section>

        {/* ================= DASHBOARD GRID ================= */}

        <section className="main-grid">

          {/* SIGNALS */}

          <div className="panel signals-panel">

            <div className="panel-header">

              <div>
                <span>AI SIGNAL ENGINE</span>
                <h2>سیگنال‌های معاملاتی</h2>
              </div>

              <Link href="/signals" className="panel-link">
                مشاهده همه
              </Link>

            </div>

            <div className="signals-table">

              <div className="signal-head">
                <span>نماد</span>
                <span>جهت</span>
                <span>قدرت</span>
                <span>وضعیت</span>
                <span>زمان</span>
              </div>

              <EmptySignals />

            </div>
          </div>

          {/* PERFORMANCE */}

          <div className="panel performance-panel">

            <div className="panel-header">

              <div>
                <span>ACCOUNT ANALYTICS</span>
                <h2>عملکرد سیستم</h2>
              </div>

              <span className="period-badge">
                ۳۰ روز
              </span>

            </div>

            <div className="performance-chart">

              <div className="chart-lines">
                <i />
                <i />
                <i />
                <i />
              </div>

              <svg
                viewBox="0 0 500 220"
                preserveAspectRatio="none"
                className="performance-svg"
              >
                <defs>
                  <linearGradient
                    id="goldArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="rgba(214,164,45,0.42)"
                    />
                    <stop
                      offset="100%"
                      stopColor="rgba(214,164,45,0)"
                    />
                  </linearGradient>
                </defs>

                <path
                  d="M0 185
                  L45 160
                  L90 170
                  L130 125
                  L175 142
                  L215 105
                  L260 120
                  L300 82
                  L340 96
                  L385 62
                  L425 78
                  L465 42
                  L500 28
                  L500 220
                  L0 220 Z"
                  fill="url(#goldArea)"
                />

                <path
                  d="M0 185
                  L45 160
                  L90 170
                  L130 125
                  L175 142
                  L215 105
                  L260 120
                  L300 82
                  L340 96
                  L385 62
                  L425 78
                  L465 42
                  L500 28"
                  fill="none"
                  stroke="#d9a72e"
                  strokeWidth="4"
                />
              </svg>

            </div>

            <div className="performance-number">
              <span>بازدهی حساب</span>
              <strong>--</strong>
              <small>
                پس از ثبت معاملات واقعی محاسبه می‌شود
              </small>
            </div>

            <div className="period-buttons">
              <button>۷ روز</button>
              <button className="selected">۳۰ روز</button>
              <button>۹۰ روز</button>
            </div>

          </div>

        </section>

        {/* ================= FEATURES ================= */}

        <section className="features-section">

          <div className="section-heading">
            <div>
              <span>TRADING TOOLS</span>
              <h2>ابزارهای حرفه‌ای</h2>
            </div>
          </div>

          <div className="features-grid">

            <FeatureCard
              icon="✦"
              title="تحلیل هوش مصنوعی"
              description="تحلیل پیشرفته بازار با AI"
              href="/ai-analysis"
            />

            <FeatureCard
              icon="♙"
              title="ربات‌های معاملاتی"
              description="مدیریت و اجرای ربات‌ها"
              href="/bots"
            />

            <FeatureCard
              icon="◇"
              title="مدیریت ریسک"
              description="کنترل سرمایه و ریسک"
              href="/risk"
            />

            <FeatureCard
              icon="▤"
              title="اخبار بازار"
              description="اخبار و تحلیل لحظه‌ای"
              href="/news"
            />

            <FeatureCard
              icon="▱"
              title="آموزش"
              description="آموزش تخصصی معامله‌گری"
              href="/courses"
            />

            <FeatureCard
              icon="♧"
              title="پشتیبانی"
              description="پشتیبانی و ارتباط با تیم"
              href="/support"
            />

          </div>
        </section>

        {/* ================= BOTTOM GRID ================= */}

        <section className="bottom-grid">

          {/* SIGNAL DISTRIBUTION */}

          <div className="panel bottom-panel">

            <div className="panel-header">

              <div>
                <span>SIGNAL ANALYTICS</span>
                <h2>توزیع سیگنال‌ها</h2>
              </div>

            </div>

            <div className="donut-area">

              <div
                className="donut"
                style={{
                  background:
                    "conic-gradient(#d9a72e 0deg 0deg, #161616 0deg 360deg)",
                }}
              >
                <div className="donut-center">
                  <strong>{signalsCount}</strong>
                  <span>کل سیگنال‌ها</span>
                </div>
              </div>

              <div className="legend">

                <div>
                  <i className="green-dot" />
                  <span>خرید</span>
                  <strong>--</strong>
                </div>

                <div>
                  <i className="red-dot" />
                  <span>فروش</span>
                  <strong>--</strong>
                </div>

                <div>
                  <i className="gray-dot" />
                  <span>خنثی</span>
                  <strong>--</strong>
                </div>

              </div>

            </div>

          </div>

          {/* TOP PERFORMANCE */}

          <div className="panel bottom-panel">

            <div className="panel-header">

              <div>
                <span>PERFORMANCE</span>
                <h2>بهترین عملکرد</h2>
              </div>

            </div>

            <div className="ranking-list">

              <div className="ranking-empty">
                <div>♛</div>
                <p>
                  پس از ثبت معاملات واقعی،
                  عملکرد نمادها در این بخش نمایش داده می‌شود.
                </p>
              </div>

            </div>

          </div>

          {/* ACTIVITY */}

          <div className="panel bottom-panel">

            <div className="panel-header">

              <div>
                <span>ACTIVITY</span>
                <h2>آخرین فعالیت‌ها</h2>
              </div>

            </div>

            <div className="activity-list">

              <div className="activity-item">
                <span>◈</span>
                <div>
                  <strong>سیستم آماده است</strong>
                  <small>
                    داشبورد با موفقیت بارگذاری شد
                  </small>
                </div>
              </div>

              <div className="activity-item">
                <span>◇</span>
                <div>
                  <strong>اتصال موتور تحلیل</strong>
                  <small>
                    وضعیت اتصال از backend بررسی می‌شود
                  </small>
                </div>
              </div>

              <div className="activity-item">
                <span>♙</span>
                <div>
                  <strong>ربات‌های معاملاتی</strong>
                  <small>
                    {botsCount} ربات در حساب شما ثبت شده است
                  </small>
                </div>
              </div>

              <div className="activity-item">
                <span>▤</span>
                <div>
                  <strong>سیگنال‌ها</strong>
                  <small>
                    {signalsCount} سیگنال در حساب ثبت شده است
                  </small>
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* ================= ACCOUNT ================= */}

        <section className="account-section">

          <div className="account-user">

            <div className="large-avatar">
              {initial}
            </div>

            <div>
              <span>حساب کاربری</span>
              <h3>{userName}</h3>
              <small>
                پلن {user.plan || "FREE"}
              </small>
            </div>

          </div>

          <div className="account-status">

            <div className="status-indicator">
              <span />
              سیستم آنلاین
            </div>

            <div className="security">
              <strong>SSL</strong>
              <span>اتصال امن</span>
            </div>

          </div>

        </section>

      </div>

      {/* ================= MOBILE NAV ================= */}

      <nav className="mobile-navigation">

        <Link href="/dashboard" className="mobile-nav-item active">
          <span>⌂</span>
          <small>داشبورد</small>
        </Link>

        <Link href="/signals" className="mobile-nav-item">
          <span>◈</span>
          <small>سیگنال</small>
        </Link>

        <Link href="/bots" className="mobile-nav-item">
          <span>♙</span>
          <small>ربات‌ها</small>
        </Link>

        <Link href="/market" className="mobile-nav-item">
          <span>▥</span>
          <small>بازار</small>
        </Link>

        <Link href="/settings" className="mobile-nav-item">
          <span>⚙</span>
          <small>تنظیمات</small>
        </Link>

      </nav>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(190, 142, 31, 0.09),
              transparent 32%
            ),
            #030303;
          color: #f4f0e8;
          font-family:
            Arial,
            Tahoma,
            sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        .background-glow {
          position: fixed;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          filter: blur(130px);
          pointer-events: none;
          opacity: 0.07;
          z-index: 0;
        }

        .glow-one {
          background: #d5a52f;
          top: 10%;
          right: -250px;
        }

        .glow-two {
          background: #9b7118;
          bottom: 10%;
          left: -250px;
        }

        .top-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 3, 3, 0.94);
          border-bottom: 1px solid rgba(210, 164, 42, 0.17);
          backdrop-filter: blur(18px);
        }

        .header-inner {
          width: min(1450px, calc(100% - 42px));
          margin: auto;
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          min-width: 240px;
        }

        .brand-logo {
          width: 52px;
          height: 52px;
          border: 1px solid #c99a25;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e4b637;
          font-size: 30px;
          box-shadow:
            0 0 25px rgba(215, 165, 45, 0.15),
            inset 0 0 20px rgba(215, 165, 45, 0.07);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .brand-text strong {
          color: #e1ae32;
          font-size: 20px;
          letter-spacing: 1px;
        }

        .brand-text small {
          color: #8d8a83;
          font-size: 8px;
          margin-top: 5px;
          letter-spacing: 1px;
          direction: ltr;
        }

        .desktop-navigation {
          display: flex;
          align-items: stretch;
          height: 92px;
          gap: 5px;
        }

        .nav-link {
          min-width: 82px;
          padding: 12px 10px;
          color: #89857d;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          position: relative;
          transition: 0.25s;
        }

        .nav-link span {
          font-size: 21px;
          color: #aaa59b;
        }

        .nav-link small {
          font-size: 12px;
        }

        .nav-link:hover {
          color: #e4b637;
        }

        .nav-link.active {
          color: #e4b637;
        }

        .nav-link.active span {
          color: #e4b637;
        }

        .nav-link.active::after {
          content: "";
          position: absolute;
          bottom: 0;
          width: 55%;
          height: 2px;
          background: #e1ac2f;
          box-shadow: 0 0 12px #dca92f;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .notification-button {
          width: 42px;
          height: 42px;
          border: 0;
          background: transparent;
          color: #d9a72e;
          font-size: 24px;
          position: relative;
          cursor: pointer;
        }

        .notification-button span {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e1b039;
          top: 5px;
          right: 7px;
          box-shadow: 0 0 10px #e1b039;
        }

        .profile-avatar,
        .large-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #b98c24;
          background:
            radial-gradient(
              circle at 35% 25%,
              #e7b638,
              #62480e 70%
            );
          color: white;
          font-weight: 800;
          box-shadow: 0 0 20px rgba(218, 168, 44, 0.12);
        }

        .profile-avatar {
          width: 47px;
          height: 47px;
          border-radius: 50%;
        }

        .dashboard-container {
          position: relative;
          z-index: 1;
          width: min(1450px, calc(100% - 42px));
          margin: 28px auto 80px;
        }

        /* HERO */

        .hero-section {
          min-height: 370px;
          border: 1px solid rgba(218, 170, 44, 0.38);
          border-radius: 22px;
          background:
            linear-gradient(
              110deg,
              rgba(10, 10, 10, 0.98),
              rgba(16, 14, 9, 0.88)
            );
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.05fr 1fr 0.9fr;
          position: relative;
          box-shadow:
            inset 0 0 60px rgba(212, 163, 40, 0.025),
            0 15px 70px rgba(0, 0, 0, 0.5);
        }

        .hero-content {
          padding: 50px 45px;
          position: relative;
          z-index: 3;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #aaa59c;
          font-size: 12px;
          border: 1px solid rgba(205, 163, 48, 0.18);
          border-radius: 50px;
          padding: 8px 13px;
          background: rgba(255,255,255,0.02);
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #43c477;
          box-shadow: 0 0 10px #43c477;
        }

        .hero-content h1 {
          font-size: clamp(32px, 4vw, 60px);
          line-height: 1.08;
          margin: 28px 0 12px;
          font-weight: 900;
        }

        .hero-content h1 span {
          color: #dca92f;
          text-shadow: 0 0 30px rgba(220,169,47,0.16);
        }

        .hero-content p {
          color: #98948d;
          max-width: 480px;
          line-height: 2;
          font-size: 14px;
          margin-bottom: 25px;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .gold-button,
        .outline-button {
          border-radius: 10px;
          min-height: 47px;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-decoration: none;
          cursor: pointer;
          transition: 0.25s;
          font-size: 13px;
        }

        .gold-button {
          color: #0b0b0b;
          background: linear-gradient(
            135deg,
            #f1c64f,
            #bb8415
          );
          border: 1px solid #e2b439;
          box-shadow:
            0 8px 25px rgba(208, 158, 36, 0.17);
          font-weight: 800;
        }

        .gold-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 12px 30px rgba(208, 158, 36, 0.25);
        }

        .gold-button.small {
          min-height: 40px;
          font-size: 12px;
        }

        .outline-button {
          color: #d4a72e;
          border: 1px solid rgba(211, 167, 44, 0.4);
          background: rgba(211, 167, 44, 0.04);
        }

        .hero-visual {
          position: relative;
          overflow: hidden;
          min-height: 370px;
        }

        .hero-glow {
          position: absolute;
          width: 350px;
          height: 350px;
          border-radius: 50%;
          background: rgba(217, 166, 42, 0.08);
          filter: blur(60px);
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .gold-grid {
          position: absolute;
          inset: 0;
          opacity: 0.13;
          background-image:
            linear-gradient(
              rgba(211, 167, 44, 0.18) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(211, 167, 44, 0.18) 1px,
              transparent 1px
            );
          background-size: 35px 35px;
          transform: perspective(500px) rotateX(50deg) scale(1.5);
          transform-origin: center bottom;
        }

        .chart-background {
          position: absolute;
          inset: 55px 35px;
          display: flex;
          align-items: end;
          justify-content: center;
          gap: 10px;
          opacity: 0.85;
        }

        .chart-background span {
          width: 13px;
          background:
            linear-gradient(
              to top,
              #76550d,
              #e4b73a
            );
          box-shadow:
            0 0 12px rgba(218, 168, 43, 0.2);
          position: relative;
        }

        .chart-background span::before {
          content: "";
          position: absolute;
          width: 1px;
          height: 20px;
          background: #e6bd4d;
          top: -20px;
          left: 50%;
        }

        .bull {
          position: absolute;
          font-size: 145px;
          color: rgba(220, 170, 43, 0.74);
          text-shadow:
            0 0 35px rgba(218, 167, 42, 0.28);
          left: 50%;
          top: 52%;
          transform: translate(-50%, -50%);
          z-index: 2;
          opacity: 0.9;
        }

        .hero-stat-grid {
          padding: 50px 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-content: center;
          position: relative;
          z-index: 3;
        }

        .hero-stat {
          min-height: 110px;
          border: 1px solid rgba(213, 166, 46, 0.27);
          background: rgba(10, 10, 10, 0.75);
          border-radius: 13px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .hero-stat span {
          color: #918d85;
          font-size: 11px;
        }

        .hero-stat strong {
          color: #f4f0e8;
          font-size: 27px;
          margin: 8px 0;
        }

        .hero-stat small {
          color: #77736c;
          font-size: 9px;
        }

        .green-text {
          color: #4fc780 !important;
        }

        /* SECTION */

        .market-section,
        .features-section {
          margin-top: 38px;
        }

        .section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          margin-bottom: 15px;
          gap: 15px;
        }

        .section-heading span,
        .panel-header span {
          display: block;
          color: #8d8a83;
          font-size: 9px;
          letter-spacing: 1.5px;
          direction: ltr;
          margin-bottom: 7px;
        }

        .section-heading h2,
        .panel-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .section-heading a,
        .panel-link {
          color: #cda02a;
          text-decoration: none;
          font-size: 11px;
        }

        .market-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }

        .market-card {
          min-height: 94px;
          border: 1px solid rgba(206, 161, 42, 0.25);
          border-radius: 13px;
          background:
            linear-gradient(
              145deg,
              rgba(21,21,21,0.96),
              rgba(7,7,7,0.96)
            );
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }

        .market-card::before {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          background: rgba(214, 164, 41, 0.05);
          border-radius: 50%;
          left: -45px;
          top: -45px;
        }

        .market-icon {
          width: 39px;
          height: 39px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(218, 169, 44, 0.35);
          color: #ddb13b;
          font-size: 14px;
          font-weight: 900;
          background: #111;
        }

        .market-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .market-info strong {
          font-size: 10px;
          direction: ltr;
        }

        .market-info span {
          color: #66635d;
          font-size: 8px;
        }

        .market-price {
          margin-right: auto;
          display: flex;
          flex-direction: column;
          align-items: end;
          gap: 4px;
        }

        .market-price strong {
          font-size: 13px;
        }

        .market-price span {
          font-size: 7px;
          color: #716e67;
        }

        .mini-chart {
          position: absolute;
          bottom: 8px;
          left: 7px;
          display: flex;
          gap: 3px;
          align-items: end;
          opacity: 0.6;
        }

        .mini-chart span {
          width: 2px;
          background: #d8a72e;
        }

        .mini-chart span:nth-child(1) { height: 8px; }
        .mini-chart span:nth-child(2) { height: 14px; }
        .mini-chart span:nth-child(3) { height: 10px; }
        .mini-chart span:nth-child(4) { height: 19px; }
        .mini-chart span:nth-child(5) { height: 15px; }
        .mini-chart span:nth-child(6) { height: 25px; }

        /* MAIN GRID */

        .main-grid {
          display: grid;
          grid-template-columns: 1.45fr 0.75fr;
          gap: 15px;
          margin-top: 38px;
        }

        .panel {
          border: 1px solid rgba(208, 163, 42, 0.25);
          background:
            linear-gradient(
              145deg,
              rgba(14,14,14,0.98),
              rgba(7,7,7,0.98)
            );
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            inset 0 0 35px rgba(220, 170, 40, 0.018);
        }

        .panel-header {
          min-height: 74px;
          padding: 17px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.055);
        }

        .panel-header h2 {
          font-size: 17px;
        }

        .period-badge {
          border: 1px solid rgba(213, 166, 43, 0.28);
          padding: 6px 10px;
          border-radius: 7px;
          color: #cda02b !important;
          font-size: 9px !important;
          margin: 0 !important;
          letter-spacing: 0 !important;
        }

        .signals-table {
          min-height: 325px;
        }

        .signal-head {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 0.8fr 1fr 0.8fr;
          padding: 15px 20px;
          color: #6e6b64;
          font-size: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.035);
        }

        .empty-signals {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
        }

        .empty-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(216, 166, 43, 0.35);
          color: #d9a82f;
          font-size: 27px;
          margin-bottom: 15px;
          background: rgba(215, 165, 44, 0.03);
        }

        .empty-signals h3 {
          margin: 0 0 8px;
          font-size: 15px;
        }

        .empty-signals p {
          color: #77736c;
          font-size: 11px;
          line-height: 1.9;
          max-width: 400px;
          margin-bottom: 18px;
        }

        .performance-panel {
          min-height: 400px;
        }

        .performance-chart {
          height: 210px;
          position: relative;
          margin: 15px 18px 0;
          overflow: hidden;
        }

        .chart-lines {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .chart-lines i {
          display: block;
          height: 1px;
          background: rgba(255,255,255,0.045);
        }

        .performance-svg {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .performance-number {
          padding: 10px 20px 0;
          display: flex;
          flex-direction: column;
        }

        .performance-number span {
          color: #7d7972;
          font-size: 10px;
        }

        .performance-number strong {
          font-size: 34px;
          color: #dca82d;
          margin: 4px 0;
        }

        .performance-number small {
          color: #66635d;
          font-size: 9px;
        }

        .period-buttons {
          display: flex;
          gap: 7px;
          padding: 20px;
        }

        .period-buttons button {
          flex: 1;
          border: 1px solid rgba(255,255,255,0.08);
          background: #0b0b0b;
          color: #77736c;
          border-radius: 7px;
          padding: 9px;
          font-size: 9px;
        }

        .period-buttons button.selected {
          border-color: #bd8e21;
          color: #dcb03b;
          background: rgba(203, 156, 36, 0.06);
        }

        /* FEATURES */

        .features-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .feature-card {
          position: relative;
          min-height: 160px;
          padding: 20px 15px;
          border-radius: 13px;
          border: 1px solid rgba(209, 163, 41, 0.27);
          background:
            linear-gradient(
              150deg,
              rgba(18,18,18,0.98),
              rgba(6,6,6,0.98)
            );
          text-decoration: none;
          color: white;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: 0.25s;
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(222, 175, 48, 0.65);
          box-shadow:
            0 15px 35px rgba(0,0,0,0.35);
        }

        .feature-icon {
          width: 45px;
          height: 45px;
          border: 1px solid rgba(216, 168, 45, 0.45);
          color: #dca92f;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 14px;
          background: rgba(218, 167, 41, 0.035);
        }

        .feature-title {
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .feature-description {
          color: #69665f;
          font-size: 9px;
        }

        .feature-arrow {
          position: absolute;
          left: 10px;
          bottom: 9px;
          color: #ad8320;
          font-size: 12px;
        }

        /* BOTTOM */

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }

        .bottom-panel {
          min-height: 310px;
        }

        .donut-area {
          min-height: 235px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          padding: 20px;
        }

        .donut {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .donut::after {
          content: "";
          position: absolute;
          inset: 15px;
          background: #0a0a0a;
          border-radius: 50%;
        }

        .donut-center {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .donut-center strong {
          font-size: 27px;
        }

        .donut-center span {
          color: #68645d;
          font-size: 8px;
          margin-top: 3px;
        }

        .legend {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .legend div {
          display: grid;
          grid-template-columns: 10px auto auto;
          gap: 8px;
          align-items: center;
          min-width: 100px;
        }

        .legend i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .green-dot {
          background: #3ebc72;
        }

        .red-dot {
          background: #c94a43;
        }

        .gray-dot {
          background: #777;
        }

        .legend span {
          color: #77736c;
          font-size: 10px;
        }

        .legend strong {
          font-size: 10px;
        }

        .ranking-list {
          padding: 15px;
        }

        .ranking-empty {
          min-height: 220px;
          border: 1px dashed rgba(210, 163, 41, 0.18);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
          padding: 25px;
        }

        .ranking-empty div {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 1px solid rgba(210, 163, 41, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d7a62e;
          font-size: 23px;
          margin-bottom: 13px;
        }

        .ranking-empty p {
          color: #77736c;
          font-size: 10px;
          line-height: 1.8;
          max-width: 230px;
        }

        .activity-list {
          padding: 10px 15px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px 7px;
          border-bottom: 1px solid rgba(255,255,255,0.045);
        }

        .activity-item:last-child {
          border-bottom: 0;
        }

        .activity-item > span {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d8a62d;
          border: 1px solid rgba(213, 165, 43, 0.25);
          background: rgba(214, 165, 43, 0.03);
        }

        .activity-item div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .activity-item strong {
          font-size: 10px;
        }

        .activity-item small {
          color: #66635d;
          font-size: 8px;
        }

        /* ACCOUNT */

        .account-section {
          margin-top: 15px;
          border: 1px solid rgba(207, 161, 41, 0.22);
          background: #080808;
          min-height: 105px;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .account-user {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .large-avatar {
          width: 55px;
          height: 55px;
          border-radius: 14px;
        }

        .account-user > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .account-user span {
          color: #706c65;
          font-size: 9px;
        }

        .account-user h3 {
          margin: 0;
          font-size: 15px;
        }

        .account-user small {
          color: #d5a62e;
          font-size: 9px;
        }

        .account-status {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #52bf7a;
          font-size: 10px;
        }

        .status-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4dc379;
          box-shadow: 0 0 10px #4dc379;
        }

        .security {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(213, 166, 43, 0.25);
          border-radius: 9px;
          padding: 9px 12px;
        }

        .security strong {
          width: 27px;
          height: 27px;
          border-radius: 50%;
          border: 1px solid #c79825;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ddb13b;
          font-size: 8px;
        }

        .security span {
          color: #77736c;
          font-size: 8px;
        }

        .mobile-navigation {
          display: none;
        }

        /* ================= TABLET ================= */

        @media (max-width: 1150px) {

          .desktop-navigation {
            gap: 0;
          }

          .nav-link {
            min-width: 66px;
          }

          .hero-section {
            grid-template-columns: 1fr 0.8fr;
          }

          .hero-visual {
            display: none;
          }

          .hero-stat-grid {
            padding: 35px 25px;
          }

          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .market-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .market-card:nth-child(4),
          .market-card:nth-child(5) {
            display: none;
          }

        }

        /* ================= MOBILE ================= */

        @media (max-width: 760px) {

          .dashboard-page {
            padding-bottom: 80px;
          }

          .top-header {
            position: relative;
          }

          .header-inner {
            width: calc(100% - 24px);
            min-height: 72px;
          }

          .brand {
            min-width: 0;
          }

          .brand-logo {
            width: 43px;
            height: 43px;
            font-size: 24px;
          }

          .brand-text strong {
            font-size: 16px;
          }

          .brand-text small {
            font-size: 6px;
          }

          .desktop-navigation {
            display: none;
          }

          .notification-button {
            display: none;
          }

          .profile-avatar {
            width: 41px;
            height: 41px;
          }

          .dashboard-container {
            width: calc(100% - 20px);
            margin-top: 14px;
            margin-bottom: 30px;
          }

          .hero-section {
            display: block;
            min-height: auto;
            border-radius: 17px;
          }

          .hero-content {
            padding: 25px 20px 22px;
          }

          .hero-badge {
            font-size: 9px;
          }

          .hero-content h1 {
            font-size: 34px;
            margin-top: 20px;
          }

          .hero-content p {
            font-size: 11px;
            line-height: 1.9;
          }

          .hero-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .gold-button,
          .outline-button {
            min-height: 44px;
            font-size: 10px;
            padding: 0 10px;
          }

          .hero-stat-grid {
            padding: 0 15px 15px;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .hero-stat {
            min-height: 87px;
            padding: 12px;
          }

          .hero-stat span {
            font-size: 8px;
          }

          .hero-stat strong {
            font-size: 20px;
          }

          .hero-stat small {
            font-size: 7px;
          }

          .section-heading {
            margin-bottom: 10px;
          }

          .section-heading h2,
          .panel-header h2 {
            font-size: 15px;
          }

          .section-heading span,
          .panel-header span {
            font-size: 7px;
          }

          .market-section,
          .features-section {
            margin-top: 25px;
          }

          .market-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .market-card {
            min-height: 78px;
            padding: 10px;
          }

          .market-card:nth-child(4),
          .market-card:nth-child(5) {
            display: flex;
          }

          .market-card:nth-child(5) {
            grid-column: span 2;
          }

          .market-icon {
            width: 32px;
            height: 32px;
            font-size: 10px;
          }

          .market-info strong {
            font-size: 8px;
          }

          .market-info span,
          .market-price span {
            font-size: 6px;
          }

          .market-price strong {
            font-size: 10px;
          }

          .mini-chart {
            display: none;
          }

          .main-grid {
            display: flex;
            flex-direction: column;
            margin-top: 25px;
            gap: 10px;
          }

          .panel-header {
            min-height: 63px;
            padding: 12px 14px;
          }

          .signals-table {
            min-height: 275px;
          }

          .signal-head {
            grid-template-columns: 1fr 1fr 1fr;
            padding: 12px 13px;
            font-size: 8px;
          }

          .signal-head span:nth-child(4),
          .signal-head span:nth-child(5) {
            display: none;
          }

          .empty-signals {
            min-height: 210px;
            padding: 20px;
          }

          .empty-icon {
            width: 48px;
            height: 48px;
            font-size: 22px;
          }

          .empty-signals h3 {
            font-size: 12px;
          }

          .empty-signals p {
            font-size: 9px;
            line-height: 1.8;
          }

          .performance-panel {
            min-height: 350px;
          }

          .performance-chart {
            height: 170px;
          }

          .performance-number strong {
            font-size: 27px;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .feature-card {
            min-height: 130px;
            padding: 15px 8px;
          }

          .feature-icon {
            width: 38px;
            height: 38px;
            font-size: 18px;
            margin-bottom: 9px;
          }

          .feature-title {
            font-size: 10px;
          }

          .feature-description {
            font-size: 7px;
          }

          .bottom-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .bottom-panel {
            min-height: 275px;
          }

          .donut-area {
            min-height: 210px;
            gap: 20px;
          }

          .donut {
            width: 125px;
            height: 125px;
          }

          .donut::after {
            inset: 13px;
          }

          .donut-center strong {
            font-size: 22px;
          }

          .account-section {
            padding: 14px;
            min-height: auto;
            flex-direction: column;
            align-items: stretch;
          }

          .account-status {
            justify-content: space-between;
          }

          .security {
            padding: 7px 9px;
          }

          .mobile-navigation {
            position: fixed;
            display: flex;
            bottom: 0;
            left: 0;
            right: 0;
            height: 68px;
            background: rgba(7,7,7,0.96);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(211, 164, 42, 0.25);
            z-index: 100;
            justify-content: space-around;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-nav-item {
            flex: 1;
            text-decoration: none;
            color: #77736c;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
          }

          .mobile-nav-item span {
            font-size: 18px;
          }

          .mobile-nav-item small {
            font-size: 8px;
          }

          .mobile-nav-item.active {
            color: #ddb039;
          }

          .mobile-nav-item.active span {
            text-shadow: 0 0 12px rgba(220, 168, 42, 0.5);
          }

        }

        @media (max-width: 390px) {

          .hero-content h1 {
            font-size: 29px;
          }

          .brand-text strong {
            font-size: 14px;
          }

          .hero-actions {
            grid-template-columns: 1fr;
          }

          .market-grid {
            grid-template-columns: 1fr 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr 1fr;
          }

          .donut-area {
            flex-direction: column;
          }

        }

      `}</style>
    </main>
  );
}
