import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main dir="rtl" className="dashboard-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at 85% 0%, rgba(6,182,212,.14), transparent 28%),
            radial-gradient(circle at 5% 80%, rgba(37,99,235,.12), transparent 30%),
            #06111f;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
        }

        .dashboard-wrapper {
          width: min(1480px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 255px minmax(0, 1fr);
          gap: 24px;
          direction: ltr;
        }

        .sidebar,
        .main-content {
          direction: rtl;
        }

        /* ================= SIDEBAR ================= */

        .sidebar {
          min-height: calc(100vh - 48px);
          height: fit-content;
          position: sticky;
          top: 24px;
          padding: 20px;
          border-radius: 26px;
          background: rgba(8, 20, 35, .94);
          border: 1px solid rgba(148,163,184,.12);
          box-shadow: 0 25px 70px rgba(0,0,0,.25);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 4px 22px;
          text-decoration: none;
          color: white;
          border-bottom: 1px solid rgba(148,163,184,.1);
        }

        .brand-icon {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: linear-gradient(135deg,#06b6d4,#2563eb);
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(6,182,212,.22);
        }

        .brand-title {
          font-size: 18px;
          font-weight: 900;
        }

        .brand-subtitle {
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
        }

        .menu-title {
          margin: 25px 8px 12px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .menu {
          display: grid;
          gap: 7px;
        }

        .menu a {
          min-height: 47px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 13px;
          border-radius: 14px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: .2s;
        }

        .menu a:hover {
          color: white;
          background: rgba(255,255,255,.045);
        }

        .menu a.active {
          color: #67e8f9;
          background: linear-gradient(
            135deg,
            rgba(6,182,212,.13),
            rgba(37,99,235,.08)
          );
          border: 1px solid rgba(34,211,238,.16);
          box-shadow: 0 8px 25px rgba(6,182,212,.06);
        }

        .menu-icon {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(255,255,255,.035);
          font-size: 15px;
        }

        .support-box {
          margin-top: 25px;
          padding: 16px;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(6,182,212,.12),
              rgba(37,99,235,.07)
            );
          border: 1px solid rgba(34,211,238,.13);
        }

        .support-box strong {
          display: block;
          font-size: 13px;
        }

        .support-box p {
          margin: 9px 0 13px;
          color: #7f91a8;
          font-size: 10px;
          line-height: 2;
        }

        .support-button {
          display: block;
          padding: 10px;
          border-radius: 11px;
          text-align: center;
          color: #67e8f9;
          background: rgba(34,211,238,.07);
          border: 1px solid rgba(34,211,238,.1);
          font-size: 10px;
          font-weight: 700;
          text-decoration: none;
        }

        /* ================= MAIN ================= */

        .main-content {
          min-width: 0;
        }

        .topbar {
          min-height: 76px;
          margin-bottom: 20px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-radius: 22px;
          background: rgba(8,20,35,.9);
          border: 1px solid rgba(148,163,184,.12);
        }

        .top-title {
          font-size: 20px;
          font-weight: 900;
        }

        .top-subtitle {
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 13px;
          border-radius: 12px;
          background: rgba(34,197,94,.07);
          color: #86efac;
          font-size: 10px;
          font-weight: 700;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px rgba(34,197,94,.7);
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(135deg,#0e7490,#1d4ed8);
          font-weight: 900;
        }

        /* ================= WELCOME ================= */

        .welcome {
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          padding: 30px;
          border-radius: 27px;
          background:
            linear-gradient(
              135deg,
              rgba(8,47,73,.88),
              rgba(8,20,35,.96)
            );
          border: 1px solid rgba(34,211,238,.14);
        }

        .welcome::before {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          left: -100px;
          top: -130px;
          border-radius: 50%;
          background: rgba(34,211,238,.08);
          filter: blur(25px);
        }

        .welcome-content {
          position: relative;
          z-index: 1;
        }

        .welcome-label {
          display: inline-flex;
          padding: 8px 13px;
          border-radius: 999px;
          color: #67e8f9;
          background: rgba(34,211,238,.07);
          border: 1px solid rgba(34,211,238,.13);
          font-size: 10px;
          font-weight: 700;
        }

        .welcome h1 {
          margin: 17px 0 9px;
          font-size: clamp(26px,3vw,38px);
          line-height: 1.4;
        }

        .welcome p {
          max-width: 760px;
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 2.1;
        }

        /* ================= STATS ================= */

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 26px;
        }

        .stat {
          min-width: 0;
          padding: 20px;
          border-radius: 20px;
          background: rgba(8,20,35,.88);
          border: 1px solid rgba(148,163,184,.11);
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          margin-bottom: 16px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(34,211,238,.08);
          color: #22d3ee;
          font-size: 18px;
        }

        .stat-label {
          color: #64748b;
          font-size: 10px;
        }

        .stat-value {
          margin-top: 7px;
          font-size: 19px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .green {
          color: #4ade80;
        }

        .cyan {
          color: #22d3ee;
        }

        .orange {
          color: #fbbf24;
        }

        /* ================= SECTION HEADER ================= */

        .section-header {
          margin: 28px 0 14px;
          padding: 0 3px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .section-header p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.8;
        }

        /* ================= FEATURE CARDS ================= */

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        .quick-card {
          min-width: 0;
          min-height: 205px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          border-radius: 21px;
          background: rgba(8,20,35,.88);
          border: 1px solid rgba(148,163,184,.11);
          text-decoration: none;
          color: white;
          transition: .2s;
        }

        .quick-card:hover {
          transform: translateY(-3px);
          border-color: rgba(34,211,238,.28);
          background: rgba(11,28,47,.96);
        }

        .quick-icon {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(34,211,238,.08);
          color: #22d3ee;
          font-size: 20px;
        }

        .quick-card h3 {
          margin: 17px 0 8px;
          font-size: 14px;
          line-height: 1.6;
        }

        .quick-card p {
          margin: 0;
          color: #718198;
          font-size: 10px;
          line-height: 2;
        }

        .quick-arrow {
          margin-top: auto;
          padding-top: 16px;
          color: #22d3ee;
          font-size: 10px;
          font-weight: 700;
        }

        /* ================= LOWER PANELS ================= */

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 15px;
          margin-top: 20px;
        }

        .panel {
          min-width: 0;
          padding: 23px;
          border-radius: 22px;
          background: rgba(8,20,35,.88);
          border: 1px solid rgba(148,163,184,.11);
        }

        .panel-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .panel h2 {
          margin: 0;
          font-size: 16px;
        }

        .panel-description {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.8;
        }

        .panel-badge {
          flex-shrink: 0;
          padding: 8px 10px;
          border-radius: 10px;
          color: #67e8f9;
          background: rgba(34,211,238,.07);
          font-size: 9px;
        }

        .account-grid {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 11px;
        }

        .account-item {
          min-width: 0;
          padding: 15px;
          border-radius: 15px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.05);
        }

        .account-item span {
          display: block;
          color: #64748b;
          font-size: 9px;
        }

        .account-item strong {
          display: block;
          margin-top: 8px;
          color: #e2e8f0;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .feature-list {
          display: grid;
          gap: 10px;
        }

        .feature {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border-radius: 15px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.05);
        }

        .feature-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: rgba(34,211,238,.07);
          font-size: 15px;
        }

        .feature strong {
          display: block;
          font-size: 11px;
        }

        .feature span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 9px;
        }

        /* ================= QUICK INFO ================= */

        .info-section {
          margin-top: 20px;
          padding: 22px;
          border-radius: 22px;
          background:
            linear-gradient(
              135deg,
              rgba(6,182,212,.07),
              rgba(37,99,235,.04)
            );
          border: 1px solid rgba(34,211,238,.1);
        }

        .info-title {
          margin: 0 0 16px;
          font-size: 15px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 12px;
        }

        .info-card {
          min-width: 0;
          padding: 15px;
          border-radius: 15px;
          background: rgba(5,15,28,.65);
          border: 1px solid rgba(148,163,184,.08);
        }

        .info-card strong {
          display: block;
          font-size: 11px;
        }

        .info-card span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 9px;
          line-height: 1.8;
        }

        /* ================= TABLET ================= */

        @media (max-width: 1150px) {
          .dashboard-wrapper {
            grid-template-columns: 220px minmax(0,1fr);
          }

          .stats,
          .quick-grid {
            grid-template-columns: repeat(2,1fr);
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ================= MOBILE ================= */

        @media (max-width: 800px) {
          .dashboard-page {
            padding: 12px;
          }

          .dashboard-wrapper {
            display: block;
          }

          .sidebar {
            display: none;
          }

          .topbar {
            min-height: auto;
            padding: 15px;
            border-radius: 18px;
          }

          .top-title {
            font-size: 16px;
          }

          .top-subtitle {
            line-height: 1.8;
          }

          .status {
            display: none;
          }

          .user-avatar {
            width: 40px;
            height: 40px;
          }

          .welcome {
            padding: 23px;
            border-radius: 21px;
          }

          .welcome h1 {
            font-size: 25px;
          }

          .stats,
          .quick-grid {
            grid-template-columns: repeat(2,1fr);
          }

          .quick-card {
            min-height: 190px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .stats,
          .quick-grid,
          .account-grid {
            grid-template-columns: 1fr;
          }

          .welcome h1 {
            font-size: 23px;
          }

          .welcome p {
            font-size: 11px;
          }

          .stat {
            padding: 18px;
          }

          .quick-card {
            min-height: 175px;
          }

          .panel,
          .info-section {
            padding: 18px;
          }

          .panel-title-row {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="dashboard-wrapper">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <Link href="/" className="brand">
            <div className="brand-icon">AI</div>

            <div>
              <div className="brand-title">
                Trading AI
              </div>

              <div className="brand-subtitle">
                Smart Trading Platform
              </div>
            </div>
          </Link>

          <div className="menu-title">
            منوی اصلی
          </div>

          <nav className="menu">

            <Link href="/dashboard" className="active">
              <span className="menu-icon">🏠</span>
              <span>داشبورد</span>
            </Link>

            <Link href="/market">
              <span className="menu-icon">📊</span>
              <span>بازار و نمودار</span>
            </Link>

            <Link href="/bots">
              <span className="menu-icon">🤖</span>
              <span>ربات‌های معاملاتی</span>
            </Link>

            <Link href="/ai-analysis">
              <span className="menu-icon">🧠</span>
              <span>تحلیل هوشمند AI</span>
            </Link>

            <Link href="/news">
              <span className="menu-icon">📰</span>
              <span>اخبار بازار</span>
            </Link>

            <Link href="/broker">
              <span className="menu-icon">🔗</span>
              <span>اتصال بروکر</span>
            </Link>

            <Link href="/economic">
              <span className="menu-icon">🌍</span>
              <span>تقویم اقتصادی</span>
            </Link>

            <Link href="/courses">
              <span className="menu-icon">🎓</span>
              <span>آموزش</span>
            </Link>

            <Link href="/payments">
              <span className="menu-icon">💳</span>
              <span>کیف پول و پرداخت</span>
            </Link>

            <Link href="/support">
              <span className="menu-icon">🎧</span>
              <span>پشتیبانی</span>
            </Link>

          </nav>

          <div className="support-box">

            <strong>
              🎧 مرکز پشتیبانی
            </strong>

            <p>
              برای سوالات و مشکلات خود می‌توانید
              از مرکز پشتیبانی Trading AI استفاده کنید.
            </p>

            <Link href="/support" className="support-button">
              ورود به پشتیبانی
            </Link>

          </div>

        </aside>

        {/* MAIN */}

        <section className="main-content">

          {/* TOPBAR */}

          <header className="topbar">

            <div>
              <div className="top-title">
                داشبورد Trading AI
              </div>

              <div className="top-subtitle">
                مرکز مدیریت حساب و ابزارهای معاملاتی
              </div>
            </div>

            <div className="user-area">

              <div className="status">
                <span className="status-dot" />
                سیستم فعال است
              </div>

              <div className="user-avatar">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

            </div>

          </header>

          {/* WELCOME */}

          <section className="welcome">

            <div className="welcome-content">

              <span className="welcome-label">
                ✦ حساب شما فعال است
              </span>

              <h1>
                سلام {user.name} 👋
              </h1>

              <p>
                به پنل حرفه‌ای Trading AI خوش آمدید.
                از اینجا می‌توانید بازار، ربات‌ها،
                تحلیل هوشمند، اخبار و سایر ابزارهای
                معاملاتی خود را مدیریت کنید.
              </p>

            </div>

          </section>

          {/* STATS */}

          <section className="stats">

            <div className="stat">
              <div className="stat-icon">✓</div>
              <div className="stat-label">وضعیت حساب</div>
              <div className="stat-value green">
                فعال
              </div>
            </div>

            <div className="stat">
              <div className="stat-icon">◆</div>
              <div className="stat-label">پلن فعلی</div>
              <div className="stat-value cyan">
                {user.plan}
              </div>
            </div>

            <div className="stat">
              <div className="stat-icon">🤖</div>
              <div className="stat-label">ربات‌های فعال</div>
              <div className="stat-value">
                0
              </div>
            </div>

            <div className="stat">
              <div className="stat-icon">🔗</div>
              <div className="stat-label">اتصال بروکر</div>
              <div className="stat-value orange">
                متصل نیست
              </div>
            </div>

          </section>

          {/* QUICK ACCESS */}

          <div className="section-header">

            <h2>
              دسترسی سریع
            </h2>

            <p>
              مهم‌ترین بخش‌های Trading AI در کارت‌های جداگانه
            </p>

          </div>

          <section className="quick-grid">

            <Link href="/market" className="quick-card">

              <div className="quick-icon">
                📊
              </div>

              <h3>
                بازار و نمودار
              </h3>

              <p>
                مشاهده بازارها، قیمت‌ها و نمودارهای معاملاتی
              </p>

              <div className="quick-arrow">
                ورود به بازار ←
              </div>

            </Link>

            <Link href="/bots" className="quick-card">

              <div className="quick-icon">
                🤖
              </div>

              <h3>
                ربات‌های معاملاتی
              </h3>

              <p>
                ساخت و مدیریت ربات‌های هوشمند معاملاتی
              </p>

              <div className="quick-arrow">
                مدیریت ربات‌ها ←
              </div>

            </Link>

            <Link href="/ai-analysis" className="quick-card">

              <div className="quick-icon">
                🧠
              </div>

              <h3>
                تحلیل هوشمند AI
              </h3>

              <p>
                بررسی بازار با ابزارهای تحلیل هوش مصنوعی
              </p>

              <div className="quick-arrow">
                مشاهده تحلیل ←
              </div>

            </Link>

            <Link href="/news" className="quick-card">

              <div className="quick-icon">
                📰
              </div>

              <h3>
                اخبار بازار
              </h3>

              <p>
                مشاهده اخبار مهم و اطلاعات مرتبط با بازار
              </p>

              <div className="quick-arrow">
                مشاهده اخبار ←
              </div>

            </Link>

          </section>

          {/* ACCOUNT + DEVELOPMENT */}

          <section className="bottom-grid">

            <div className="panel">

              <div className="panel-title-row">

                <div>
                  <h2>
                    اطلاعات حساب
                  </h2>

                  <p className="panel-description">
                    مشخصات حساب کاربری شما
                  </p>
                </div>

                <span className="panel-badge">
                  حساب فعال
                </span>

              </div>

              <div className="account-grid">

                <div className="account-item">
                  <span>نام کاربر</span>
                  <strong>{user.name}</strong>
                </div>

                <div className="account-item">
                  <span>ایمیل</span>
                  <strong>{user.email}</strong>
                </div>

                <div className="account-item">
                  <span>نوع حساب</span>
                  <strong>{user.plan}</strong>
                </div>

                <div className="account-item">
                  <span>سطح دسترسی</span>
                  <strong>{user.role}</strong>
                </div>

              </div>

            </div>

            <div className="panel">

              <div className="panel-title-row">

                <div>
                  <h2>
                    امکانات پلتفرم
                  </h2>

                  <p className="panel-description">
                    وضعیت قابلیت‌های Trading AI
                  </p>
                </div>

              </div>

              <div className="feature-list">

                <div className="feature">
                  <div className="feature-icon">
                    📈
                  </div>

                  <div>
                    <strong>
                      چارت بازار
                    </strong>

                    <span>
                      آماده توسعه
                    </span>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">
                    🤖
                  </div>

                  <div>
                    <strong>
                      ربات خودکار
                    </strong>

                    <span>
                      آماده توسعه
                    </span>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">
                    🔗
                  </div>

                  <div>
                    <strong>
                      اتصال بروکر
                    </strong>

                    <span>
                      آماده توسعه
                    </span>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">
                    🧠
                  </div>

                  <div>
                    <strong>
                      تحلیل پیشرفته AI
                    </strong>

                    <span>
                      آماده توسعه
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </section>

          {/* PLATFORM INFO */}

          <section className="info-section">

            <h2 className="info-title">
              راهنمای سریع
            </h2>

            <div className="info-grid">

              <Link href="/bots" className="info-card">
                <strong>
                  🤖 مدیریت ربات‌ها
                </strong>

                <span>
                  مشاهده و مدیریت ربات‌های معاملاتی
                </span>
              </Link>

              <Link href="/broker" className="info-card">
                <strong>
                  🔗 اتصال بروکر
                </strong>

                <span>
                  مدیریت اتصال حساب معاملاتی
                </span>
              </Link>

              <Link href="/support" className="info-card">
                <strong>
                  🎧 پشتیبانی
                </strong>

                <span>
                  دریافت راهنمایی و ارسال درخواست
                </span>
              </Link>

            </div>

          </section>

        </section>

      </div>
    </main>
  );
}
