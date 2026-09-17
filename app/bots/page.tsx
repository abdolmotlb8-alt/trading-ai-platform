import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export default async function BotsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main dir="rtl" className="bots-page">
        <style>{`
          * {
            box-sizing: border-box;
          }

          .bots-page {
            min-height: 100vh;
            padding: 40px 20px;
            background:
              radial-gradient(circle at top right, rgba(6,182,212,.12), transparent 30%),
              #07111f;
            color: #f8fafc;
            font-family: Arial, Tahoma, sans-serif;
          }

          .login-box {
            width: min(520px, 100%);
            margin: 100px auto;
            padding: 35px;
            text-align: center;
            border-radius: 24px;
            background: rgba(10,20,35,.9);
            border: 1px solid rgba(148,163,184,.12);
          }

          .login-icon {
            width: 65px;
            height: 65px;
            margin: 0 auto 20px;
            display: grid;
            place-items: center;
            border-radius: 20px;
            background: rgba(34,211,238,.1);
            font-size: 28px;
          }

          .login-box h1 {
            margin: 0;
            font-size: 25px;
          }

          .login-box p {
            color: #64748b;
            line-height: 2;
            font-size: 13px;
          }

          .login-link {
            display: inline-flex;
            margin-top: 15px;
            padding: 12px 22px;
            border-radius: 12px;
            background: #22d3ee;
            color: #03131d;
            font-weight: 800;
            text-decoration: none;
          }
        `}</style>

        <div className="login-box">
          <div className="login-icon">🔐</div>

          <h1>ورود لازم است</h1>

          <p>
            برای مشاهده و مدیریت ربات‌های معاملاتی
            ابتدا وارد حساب کاربری خود شوید.
          </p>

          <Link href="/login" className="login-link">
            ورود به حساب
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="bots-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .bots-page {
          min-height: 100vh;
          padding: 28px;
          background:
            radial-gradient(circle at 90% 0%, rgba(6,182,212,.13), transparent 28%),
            radial-gradient(circle at 0% 100%, rgba(37,99,235,.12), transparent 30%),
            #07111f;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
        }

        .bots-container {
          width: min(1400px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .title-area h1 {
          margin: 0;
          font-size: clamp(27px, 5vw, 40px);
          font-weight: 900;
        }

        .title-area p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.9;
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 13px;
          border-radius: 15px;
          background: rgba(10,20,35,.8);
          border: 1px solid rgba(148,163,184,.1);
        }

        .avatar {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: linear-gradient(135deg,#06b6d4,#2563eb);
          color: white;
          font-weight: 900;
        }

        .user-name {
          font-size: 12px;
          font-weight: 800;
        }

        .user-plan {
          margin-top: 4px;
          color: #64748b;
          font-size: 9px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
          margin-bottom: 22px;
        }

        .summary-card {
          padding: 18px;
          border-radius: 20px;
          background: rgba(10,20,35,.82);
          border: 1px solid rgba(148,163,184,.09);
        }

        .summary-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(34,211,238,.08);
          font-size: 19px;
          margin-bottom: 13px;
        }

        .summary-label {
          color: #64748b;
          font-size: 10px;
        }

        .summary-value {
          margin-top: 7px;
          font-size: 20px;
          font-weight: 900;
        }

        .green {
          color: #4ade80;
        }

        .cyan {
          color: #22d3ee;
        }

        .yellow {
          color: #facc15;
        }

        .main-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .bot-card {
          position: relative;
          overflow: hidden;
          padding: 23px;
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(12,32,52,.95),
              rgba(8,18,32,.94)
            );
          border: 1px solid rgba(148,163,184,.1);
          transition: .2s;
        }

        .bot-card:hover {
          transform: translateY(-2px);
          border-color: rgba(34,211,238,.2);
        }

        .bot-card::before {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          right: -80px;
          top: -90px;
          border-radius: 50%;
          background: rgba(34,211,238,.06);
          filter: blur(25px);
        }

        .bot-top {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .bot-title {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .bot-icon {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(34,211,238,.08);
          font-size: 24px;
        }

        .bot-title h2 {
          margin: 0;
          font-size: 17px;
        }

        .bot-title p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 10px;
        }

        .status {
          padding: 7px 10px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 800;
        }

        .status-ready {
          color: #facc15;
          background: rgba(250,204,21,.08);
        }

        .status-off {
          color: #94a3b8;
          background: rgba(148,163,184,.08);
        }

        .bot-description {
          position: relative;
          margin: 20px 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 2;
        }

        .bot-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .bot-stat {
          padding: 12px;
          border-radius: 13px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(148,163,184,.06);
        }

        .bot-stat span {
          display: block;
          color: #64748b;
          font-size: 8px;
        }

        .bot-stat strong {
          display: block;
          margin-top: 6px;
          font-size: 11px;
        }

        .bot-actions {
          display: flex;
          gap: 9px;
          margin-top: 17px;
        }

        .bot-button {
          flex: 1;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          text-decoration: none;
          font-size: 10px;
          font-weight: 800;
        }

        .primary-button {
          background: #22d3ee;
          color: #03131d;
        }

        .secondary-button {
          color: #cbd5e1;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(148,163,184,.09);
        }

        .performance {
          grid-column: 1 / -1;
          padding: 23px;
          border-radius: 24px;
          background: rgba(10,20,35,.84);
          border: 1px solid rgba(148,163,184,.09);
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 18px;
        }

        .section-title span {
          color: #64748b;
          font-size: 9px;
        }

        .performance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 11px;
        }

        .performance-box {
          padding: 16px;
          border-radius: 15px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(148,163,184,.06);
        }

        .performance-box span {
          display: block;
          color: #64748b;
          font-size: 9px;
        }

        .performance-box strong {
          display: block;
          margin-top: 8px;
          font-size: 16px;
        }

        .notice {
          grid-column: 1 / -1;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(34,211,238,.1);
          background: linear-gradient(
            135deg,
            rgba(6,182,212,.07),
            rgba(37,99,235,.05)
          );
        }

        .notice h3 {
          margin: 0;
          font-size: 14px;
        }

        .notice p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.9;
        }

        @media (max-width: 1000px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .performance,
          .notice {
            grid-column: auto;
          }

          .performance-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .bots-page {
            padding: 15px;
          }

          .topbar {
            align-items: flex-start;
          }

          .user-card {
            display: none;
          }

          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .summary-card {
            padding: 15px;
          }

          .bot-card,
          .performance,
          .notice {
            padding: 17px;
            border-radius: 20px;
          }

          .bot-stats {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
      `}</style>

      <div className="bots-container">

        {/* Header */}
        <header className="topbar">
          <div className="title-area">
            <h1>ربات‌های معاملاتی</h1>
            <p>
              ساخت، مدیریت و آماده‌سازی ربات‌های هوشمند Trading AI
            </p>
          </div>

          <div className="user-card">
            <div className="avatar">
              {user.name?.charAt(0) || "U"}
            </div>

            <div>
              <div className="user-name">
                {user.name}
              </div>

              <div className="user-plan">
                پلن {user.plan}
              </div>
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="summary-grid">

          <div className="summary-card">
            <div className="summary-icon">🤖</div>
            <div className="summary-label">
              ربات‌های من
            </div>
            <div className="summary-value">
              0
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">🟢</div>
            <div className="summary-label">
              ربات فعال
            </div>
            <div className="summary-value green">
              0
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">📊</div>
            <div className="summary-label">
              معاملات
            </div>
            <div className="summary-value cyan">
              0
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">💰</div>
            <div className="summary-label">
              سود و زیان
            </div>
            <div className="summary-value yellow">
              $0.00
            </div>
          </div>

        </section>

        {/* Bots */}
        <section className="main-grid">

          {/* Analysis Bot */}
          <article className="bot-card">

            <div className="bot-top">

              <div className="bot-title">
                <div className="bot-icon">
                  🧠
                </div>

                <div>
                  <h2>
                    ربات تحلیلگر
                  </h2>

                  <p>
                    AI Market Analyzer
                  </p>
                </div>
              </div>

              <span className="status status-ready">
                آماده
              </span>

            </div>

            <p className="bot-description">
              این ربات برای بررسی بازار، شناسایی شرایط
              معاملاتی و آماده‌سازی تحلیل هوشمند طراحی شده است.
            </p>

            <div className="bot-stats">

              <div className="bot-stat">
                <span>بازار</span>
                <strong>متصل نیست</strong>
              </div>

              <div className="bot-stat">
                <span>سیگنال</span>
                <strong>0</strong>
              </div>

              <div className="bot-stat">
                <span>وضعیت</span>
                <strong className="yellow">
                  آماده
                </strong>
              </div>

            </div>

            <div className="bot-actions">

              <Link
                href="/ai-analysis"
                className="bot-button primary-button"
              >
                مشاهده تحلیل
              </Link>

              <Link
                href="/bot-builder"
                className="bot-button secondary-button"
              >
                تنظیمات
              </Link>

            </div>

          </article>

          {/* Trading Bot */}
          <article className="bot-card">

            <div className="bot-top">

              <div className="bot-title">
                <div className="bot-icon">
                  ⚡
                </div>

                <div>
                  <h2>
                    ربات معامله‌گر
                  </h2>

                  <p>
                    AI Trading Bot
                  </p>
                </div>
              </div>

              <span className="status status-off">
                متوقف
              </span>

            </div>

            <p className="bot-description">
              ربات معامله‌گر پس از اتصال امن به بروکر یا صرافی
              و انجام تست‌های لازم آماده استفاده خواهد شد.
            </p>

            <div className="bot-stats">

              <div className="bot-stat">
                <span>بروکر</span>
                <strong>متصل نیست</strong>
              </div>

              <div className="bot-stat">
                <span>معامله</span>
                <strong>0</strong>
              </div>

              <div className="bot-stat">
                <span>وضعیت</span>
                <strong>
                  متوقف
                </strong>
              </div>

            </div>

            <div className="bot-actions">

              <Link
                href="/broker"
                className="bot-button primary-button"
              >
                اتصال بروکر
              </Link>

              <Link
                href="/bot-builder"
                className="bot-button secondary-button"
              >
                ساخت ربات
              </Link>

            </div>

          </article>

          {/* Performance */}
          <section className="performance">

            <div className="section-title">
              <h2>
                📈 عملکرد ربات‌ها
              </h2>

              <span>
                Performance
              </span>
            </div>

            <div className="performance-grid">

              <div className="performance-box">
                <span>
                  سود امروز
                </span>

                <strong className="green">
                  $0.00
                </strong>
              </div>

              <div className="performance-box">
                <span>
                  ضرر امروز
                </span>

                <strong>
                  $0.00
                </strong>
              </div>

              <div className="performance-box">
                <span>
                  معاملات امروز
                </span>

                <strong>
                  0
                </strong>
              </div>

              <div className="performance-box">
                <span>
                  نرخ موفقیت
                </span>

                <strong className="cyan">
                  —
                </strong>
              </div>

            </div>

          </section>

          {/* Notice */}
          <section className="notice">

            <h3>
              🚀 مرکز مدیریت ربات‌ها
            </h3>

            <p>
              در مراحل بعدی این بخش به سیستم ساخت ربات،
              تنظیمات مدیریت ریسک، حد سود و حد ضرر،
              اتصال بروکر، اجرای معاملات و گزارش کامل
              عملکرد متصل خواهد شد.
            </p>

          </section>

        </section>

      </div>
    </main>
  );
}
