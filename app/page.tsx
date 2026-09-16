import Link from "next/link";

export default function HomePage() {
  return (
    <main dir="rtl" className="site">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #07111f;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
        }

        .site {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 30%),
            radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.10), transparent 30%),
            #07111f;
        }

        .container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(16px);
          background: rgba(7, 17, 31, 0.88);
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }

        .nav {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          font-size: 22px;
          font-weight: 800;
        }

        .logoIcon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #06b6d4, #2563eb);
          box-shadow: 0 10px 30px rgba(6, 182, 212, 0.25);
        }

        .links {
          display: flex;
          align-items: center;
          gap: 26px;
        }

        .links a {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 14px;
          transition: 0.2s;
        }

        .links a:hover {
          color: #22d3ee;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          transition: 0.2s;
        }

        .buttonPrimary {
          color: #02111d;
          background: #22d3ee;
        }

        .buttonPrimary:hover {
          background: #67e8f9;
          transform: translateY(-1px);
        }

        .buttonSecondary {
          color: white;
          border: 1px solid #334155;
          background: rgba(15, 23, 42, 0.7);
        }

        .buttonSecondary:hover {
          border-color: #22d3ee;
        }

        .hero {
          padding: 100px 0 70px;
          text-align: center;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.08);
          border: 1px solid rgba(34, 211, 238, 0.22);
          color: #67e8f9;
          font-size: 13px;
          margin-bottom: 22px;
        }

        .hero h1 {
          margin: 0 auto;
          max-width: 850px;
          font-size: clamp(38px, 7vw, 72px);
          line-height: 1.15;
          letter-spacing: -2px;
        }

        .gradientText {
          color: #22d3ee;
        }

        .hero p {
          max-width: 720px;
          margin: 24px auto 0;
          color: #94a3b8;
          font-size: 18px;
          line-height: 2;
        }

        .heroButtons {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 32px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 70px;
        }

        .stat {
          padding: 24px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.58);
        }

        .stat strong {
          display: block;
          font-size: 30px;
          color: white;
        }

        .stat span {
          display: block;
          margin-top: 8px;
          color: #94a3b8;
          font-size: 13px;
        }

        .section {
          padding: 80px 0;
        }

        .sectionTitle {
          text-align: center;
          margin-bottom: 40px;
        }

        .sectionTitle h2 {
          margin: 0;
          font-size: 34px;
        }

        .sectionTitle p {
          margin-top: 12px;
          color: #94a3b8;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .card {
          padding: 28px;
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(15, 23, 42, 0.68);
        }

        .icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(34, 211, 238, 0.1);
          color: #22d3ee;
          font-size: 22px;
          margin-bottom: 18px;
        }

        .card h3 {
          margin: 0 0 10px;
          font-size: 20px;
        }

        .card p {
          margin: 0;
          color: #94a3b8;
          line-height: 1.9;
          font-size: 14px;
        }

        .cta {
          padding: 55px 30px;
          border-radius: 24px;
          text-align: center;
          border: 1px solid rgba(34, 211, 238, 0.18);
          background: linear-gradient(
            135deg,
            rgba(8, 47, 73, 0.75),
            rgba(15, 23, 42, 0.9)
          );
        }

        .cta h2 {
          margin: 0;
          font-size: 32px;
        }

        .cta p {
          color: #94a3b8;
          margin: 14px auto 26px;
        }

        .footer {
          margin-top: 80px;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
          padding: 28px 0;
          color: #64748b;
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 800px) {
          .links {
            display: none;
          }

          .stats,
          .cards {
            grid-template-columns: 1fr;
          }

          .hero {
            padding-top: 70px;
          }

          .hero p {
            font-size: 15px;
          }

          .actions .buttonSecondary {
            display: none;
          }
        }
      `}</style>

      <header className="header">
        <div className="container nav">
          <Link href="/" className="logo">
            <span className="logoIcon">AI</span>
            <span>Trading AI</span>
          </Link>

          <nav className="links">
            <Link href="/">خانه</Link>
            <Link href="/dashboard">داشبورد</Link>
            <Link href="/market">بازار</Link>
            <Link href="/ai-analysis">تحلیل هوشمند</Link>
            <Link href="/news">اخبار</Link>
          </nav>

          <div className="actions">
            <Link href="/login" className="button buttonSecondary">
              ورود
            </Link>

            <Link href="/register" className="button buttonPrimary">
              ثبت‌نام
            </Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="badge">
            ✦ پلتفرم هوشمند تحلیل و معاملات
          </div>

          <h1>
            تصمیم‌های بهتر در بازار
            <br />
            با <span className="gradientText">هوش مصنوعی</span>
          </h1>

          <p>
            Trading AI یک پلتفرم یکپارچه برای مشاهده بازار،
            تحلیل داده‌ها، مدیریت معاملات، ساخت ربات و استفاده
            از ابزارهای هوشمند معاملاتی است.
          </p>

          <div className="heroButtons">
            <Link href="/register" className="button buttonPrimary">
              شروع کار با Trading AI
            </Link>

            <Link href="/ai-analysis" className="button buttonSecondary">
              مشاهده تحلیل‌ها
            </Link>
          </div>

          <div className="stats">
            <div className="stat">
              <strong>AI</strong>
              <span>تحلیل هوشمند بازار</span>
            </div>

            <div className="stat">
              <strong>24/7</strong>
              <span>دسترسی به پلتفرم</span>
            </div>

            <div className="stat">
              <strong>Secure</strong>
              <span>مدیریت امن حساب کاربری</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionTitle">
            <h2>امکانات Trading AI</h2>
            <p>
              ابزارهای اصلی پلتفرم در یک محیط ساده و حرفه‌ای
            </p>
          </div>

          <div className="cards">
            <div className="card">
              <div className="icon">◈</div>
              <h3>تحلیل هوشمند</h3>
              <p>
                بررسی داده‌های بازار و ارائه اطلاعات تحلیلی
                برای کمک به تصمیم‌گیری بهتر.
              </p>
            </div>

            <div className="card">
              <div className="icon">⌁</div>
              <h3>ربات‌های معاملاتی</h3>
              <p>
                ساخت و مدیریت ربات‌های معاملاتی و آماده‌سازی
                زیرساخت اتصال به سرویس‌های معاملاتی.
              </p>
            </div>

            <div className="card">
              <div className="icon">◉</div>
              <h3>مرکز معاملات</h3>
              <p>
                مدیریت اطلاعات حساب، بازار، معاملات و ابزارهای
                مورد نیاز در یک داشبورد یکپارچه.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta">
            <h2>آماده شروع هستید؟</h2>

            <p>
              حساب خود را بسازید و وارد داشبورد Trading AI شوید.
            </p>

            <Link href="/register" className="button buttonPrimary">
              ساخت حساب جدید
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          © 2026 Trading AI — تمامی حقوق محفوظ است.
        </div>
      </footer>
    </main>
  );
}
