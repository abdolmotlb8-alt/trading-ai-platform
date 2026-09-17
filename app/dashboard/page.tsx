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
          background:
            radial-gradient(circle at 90% 0%, rgba(6,182,212,.12), transparent 28%),
            radial-gradient(circle at 0% 100%, rgba(37,99,235,.12), transparent 30%),
            #07111f;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
          padding: 24px;
        }

        .dashboard-wrapper {
          width: min(1450px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 24px;
          direction: ltr;
        }

        .sidebar,
        .main-content {
          direction: rtl;
        }

        .sidebar {
          background: rgba(10, 20, 35, .88);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 24px;
          padding: 20px;
          min-height: calc(100vh - 48px);
          position: sticky;
          top: 24px;
          height: fit-content;
          box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 4px 24px;
          border-bottom: 1px solid rgba(148,163,184,.1);
        }

        .brand-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg,#06b6d4,#2563eb);
          font-weight: 900;
          box-shadow: 0 10px 30px rgba(6,182,212,.25);
        }

        .brand-title {
          font-size: 18px;
          font-weight: 900;
        }

        .brand-subtitle {
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .menu-title {
          color: #64748b;
          font-size: 11px;
          margin: 24px 8px 10px;
        }

        .menu {
          display: grid;
          gap: 7px;
        }

        .menu a {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 46px;
          padding: 0 13px;
          border-radius: 13px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          transition: .2s;
        }

        .menu a:hover {
          background: rgba(255,255,255,.05);
          color: #fff;
        }

        .menu a.active {
          background: rgba(34,211,238,.1);
          color: #22d3ee;
          border: 1px solid rgba(34,211,238,.12);
        }

        .support-box {
          margin-top: 24px;
          padding: 16px;
          border-radius: 18px;
          background: linear-gradient(135deg,rgba(6,182,212,.1),rgba(37,99,235,.06));
          border: 1px solid rgba(34,211,238,.1);
        }

        .support-box strong {
          display: block;
          font-size: 13px;
        }

        .support-box p {
          color: #64748b;
          font-size: 11px;
          line-height: 1.9;
          margin: 8px 0 12px;
        }

        .coming {
          display: block;
          text-align: center;
          padding: 8px;
          border-radius: 10px;
          background: rgba(255,255,255,.04);
          color: #64748b;
          font-size: 10px;
        }

        .main-content {
          min-width: 0;
        }

        .topbar {
          min-height: 74px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background: rgba(10,20,35,.82);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 22px;
          margin-bottom: 20px;
        }

        .top-title {
          font-size: 19px;
          font-weight: 900;
        }

        .top-subtitle {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 12px;
          background: rgba(34,197,94,.07);
          color: #86efac;
          font-size: 11px;
          font-weight: 700;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: linear-gradient(135deg,#0e7490,#1d4ed8);
          font-weight: 900;
        }

        .welcome {
          position: relative;
          overflow: hidden;
          padding: 28px;
          border-radius: 26px;
          border: 1px solid rgba(34,211,238,.12);
          background:
            linear-gradient(135deg,rgba(8,47,73,.8),rgba(10,20,35,.92));
          margin-bottom: 20px;
        }

        .welcome::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          left: -100px;
          top: -110px;
          border-radius: 50%;
          background: rgba(34,211,238,.08);
          filter: blur(20px);
        }

        .welcome-content {
          position: relative;
          z-index: 1;
        }

        .welcome-label {
          display: inline-block;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(34,211,238,.08);
          color: #67e8f9;
          border: 1px solid rgba(34,211,238,.13);
          font-size: 10px;
          font-weight: 700;
        }

        .welcome h1 {
          margin: 15px 0 8px;
          font-size: clamp(25px,3vw,36px);
        }

        .welcome p {
          margin: 0;
          max-width: 720px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 2;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat {
          padding: 20px;
          border-radius: 20px;
          background: rgba(10,20,35,.82);
          border: 1px solid rgba(148,163,184,.11);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(34,211,238,.08);
          color: #22d3ee;
          font-size: 18px;
          margin-bottom: 16px;
        }

        .stat-label {
          color: #64748b;
          font-size: 11px;
        }

        .stat-value {
          margin-top: 6px;
          font-size: 20px;
          font-weight: 900;
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

        .section-title {
          margin: 25px 0 13px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 18px;
        }

        .section-title p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 15px;
        }

        .quick-card {
          padding: 20px;
          border-radius: 20px;
          background: rgba(10,20,35,.82);
          border: 1px solid rgba(148,163,184,.11);
          text-decoration: none;
          color: white;
          transition: .2s;
        }

        .quick-card:hover {
          transform: translateY(-3px);
          border-color: rgba(34,211,238,.3);
          background: rgba(14,28,47,.95);
        }

        .quick-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(34,211,238,.08);
          color: #22d3ee;
          font-size: 19px;
        }

        .quick-card h3 {
          margin: 15px 0 6px;
          font-size: 14px;
        }

        .quick-card p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.8;
        }

        .quick-arrow {
          margin-top: 13px;
          color: #22d3ee;
          font-size: 11px;
          font-weight: 700;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 15px;
          margin-top: 20px;
        }

        .panel {
          padding: 22px;
          border-radius: 22px;
          background: rgba(10,20,35,.82);
          border: 1px solid rgba(148,163,184,.11);
        }

        .panel h2 {
          margin: 0;
          font-size: 16px;
        }

        .panel-description {
          margin: 6px 0 18px;
          color: #64748b;
          font-size: 11px;
        }

        .account-grid {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 10px;
        }

        .account-item {
          padding: 14px;
          border-radius: 14px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.05);
        }

        .account-item span {
          display: block;
          color: #64748b;
          font-size: 10px;
        }

        .account-item strong {
          display: block;
          margin-top: 7px;
          font-size: 13px;
          word-break: break-word;
        }

        .feature-list {
          display: grid;
          gap: 10px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border-radius: 14px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.05);
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(34,211,238,.07);
          font-size: 15px;
        }

        .feature strong {
          display: block;
          font-size: 11px;
        }

        .feature span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        @media (max-width: 1100px) {
          .dashboard-wrapper {
            grid-template-columns: 210px minmax(0,1fr);
          }

          .stats,
          .quick-grid {
            grid-template-columns: repeat(2,1fr);
          }
        }

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
            border-radius: 18px;
          }

          .status {
            display: none;
          }

          .welcome {
            padding: 22px;
            border-radius: 20px;
          }

          .stats,
          .quick-grid {
            grid-template-columns: repeat(2,1fr);
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .stats,
          .quick-grid,
          .account-grid {
            grid-template-columns: 1fr;
          }

          .top-title {
            font-size: 16px;
          }

          .welcome h1 {
            font-size: 24px;
          }

          .stat,
          .quick-card,
          .panel {
            padding: 17px;
          }
        }
      `}</style>

      <div className="dashboard-wrapper">

        {/* Sidebar */}
        <aside className="sidebar">

          <Link href="/" className="brand">
            <div className="brand-icon">AI</div>

            <div>
              <div className="brand-title">Trading AI</div>
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
              🏠
              <span>داشبورد</span>
            </Link>

            <Link href="/market">
              📊
              <span>بازار و نمودار</span>
            </Link>

            <Link href="/bots">
              🤖
              <span>ربات‌های معاملاتی</span>
            </Link>

            <Link href="/ai-analysis">
              🧠
              <span>تحلیل هوشمند AI</span>
            </Link>

            <Link href="/broker">
              🔗
              <span>اتصال بروکر</span>
            </Link>

            <Link href="/news">
              📰
              <span>اخبار بازار</span>
            </Link>

            <Link href="/courses">
              🎓
              <span>آموزش</span>
            </Link>

            <Link href="/economic">
              🌍
              <span>تقویم اقتصادی</span>
            </Link>

            <Link href="/payments">
              💳
              <span>کیف پول و پرداخت</span>
            </Link>

          </nav>

          <div className="support-box">
            <strong>🎧 پشتیبانی</strong>

            <p>
              مرکز پشتیبانی Trading AI به‌زودی برای کاربران فعال خواهد شد.
            </p>

            <span className="coming">
              به‌زودی
            </span>
          </div>

        </aside>

        {/* Main Content */}
        <section className="main-content">

          {/* Topbar */}
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

          {/* Welcome */}
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
                از اینجا می‌توانید بازار، ربات‌ها، تحلیل هوشمند
                و اتصال بروکر خود را مدیریت کنید.
              </p>

            </div>

          </section>

          {/* Stats */}
          <section className="stats">

            <div className="stat">
              <div className="stat-icon">✓</div>
              <div className="stat-label">وضعیت حساب</div>
              <div className="stat-value green">فعال</div>
            </div>

            <div className="stat">
              <div className="stat-icon">◆</div>
              <div className="stat-label">پلن فعلی</div>
              <div className="stat-value cyan">{user.plan}</div>
            </div>

            <div className="stat">
              <div className="stat-icon">🤖</div>
              <div className="stat-label">ربات‌های فعال</div>
              <div className="stat-value">0</div>
            </div>

            <div className="stat">
              <div className="stat-icon">🔗</div>
              <div className="stat-label">اتصال بروکر</div>
              <div className="stat-value orange">متصل نیست</div>
            </div>

          </section>

          {/* Quick Actions */}
          <div className="section-title">
            <h2>دسترسی سریع</h2>
            <p>
              بخش‌های اصلی پلتفرم را از اینجا مدیریت کنید.
            </p>
          </div>

          <section className="quick-grid">

            <Link href="/market" className="quick-card">
              <div className="quick-icon">📊</div>
              <h3>بازار و نمودار</h3>
              <p>
                مشاهده بازارها، قیمت‌ها و نمودارهای معاملاتی
              </p>
              <div className="quick-arrow">
                ورود به بازار ←
              </div>
            </Link>

            <Link href="/bots" className="quick-card">
              <div className="quick-icon">🤖</div>
              <h3>ربات‌های معاملاتی</h3>
              <p>
                ساخت و مدیریت ربات‌های هوشمند معاملاتی
              </p>
              <div className="quick-arrow">
                مدیریت ربات‌ها ←
              </div>
            </Link>

            <Link href="/ai-analysis" className="quick-card">
              <div className="quick-icon">🧠</div>
              <h3>تحلیل هوشمند</h3>
              <p>
                بررسی بازار با ابزارهای تحلیل هوش مصنوعی
              </p>
              <div className="quick-arrow">
                مشاهده تحلیل ←
              </div>
            </Link>

            <Link href="/broker" className="quick-card">
              <div className="quick-icon">🔗</div>
              <h3>اتصال بروکر</h3>
              <p>
                اتصال حساب معاملاتی و مدیریت ارتباط با بروکر
              </p>
              <div className="quick-arrow">
                اتصال بروکر ←
              </div>
            </Link>

          </section>

          {/* Bottom */}
          <section className="bottom-grid">

            <div className="panel">

              <h2>اطلاعات حساب</h2>

              <p className="panel-description">
                مشخصات حساب کاربری شما
              </p>

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

              <h2>امکانات در حال توسعه</h2>

              <p className="panel-description">
                قابلیت‌های جدید به‌تدریج فعال می‌شوند.
              </p>

              <div className="feature-list">

                <div className="feature">
                  <div className="feature-icon">📈</div>
                  <div>
                    <strong>چارت واقعی بازار</strong>
                    <span>در مرحله توسعه</span>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">🤖</div>
                  <div>
                    <strong>ربات خودکار</strong>
                    <span>در مرحله توسعه</span>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">🔗</div>
                  <div>
                    <strong>اتصال بروکر</strong>
                    <span>در مرحله توسعه</span>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">🧠</div>
                  <div>
                    <strong>تحلیل پیشرفته AI</strong>
                    <span>در مرحله توسعه</span>
                  </div>
                </div>

              </div>

            </div>

          </section>

        </section>

      </div>
    </main>
  );
}
