import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const faPlan: Record<string, string> = {
  FREE: "رایگان",
  BASIC: "پایه",
  PRO: "حرفه‌ای",
  PREMIUM: "پریمیوم",
};

const faStatus: Record<string, string> = {
  OPEN: "باز",
  CLOSED: "بسته",
  WAITING: "در انتظار",
  ACTIVE: "فعال",
  STOPPED: "متوقف",
};

function dateText(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const [
    totalBots,
    activeBots,
    totalSignals,
    openTrades,
    totalTrades,
    latestTrades,
  ] = await Promise.all([
    prisma.tradingBot.count({
      where: {
        userId: user.id,
      },
    }),

    prisma.tradingBot.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
      },
    }),

    prisma.trade.count({
      where: {
        userId: user.id,
        status: "OPEN",
      },
    }),

    prisma.trade.count({
      where: {
        userId: user.id,
      },
    }),

    prisma.trade.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        openedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        symbol: true,
        direction: true,
        status: true,
        source: true,
        profitLoss: true,
        openedAt: true,
      },
    }),
  ]);

  const firstLetter =
    user.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <main dir="rtl" className="dashboard-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #07111f;
          color: #edf6ff;
          font-family: Tahoma, Arial, sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .dashboard-page {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(
              circle at top right,
              rgba(0, 211, 255, 0.12),
              transparent 35%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(76, 68, 255, 0.12),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              #050c18 0%,
              #0a1628 50%,
              #10182c 100%
            );
        }

        .dashboard-layout {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          gap: 18px;
          direction: ltr;
        }

        .sidebar,
        .topbar,
        .hero,
        .dashboard-card {
          background: rgba(11, 27, 47, 0.86);
          border: 1px solid rgba(153, 220, 255, 0.14);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .sidebar {
          direction: rtl;
          height: max-content;
          position: sticky;
          top: 18px;
          padding: 16px;
          border-radius: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 4px 18px;
          margin-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .brand-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          font-size: 16px;
          font-weight: 900;
          color: white;
          background: linear-gradient(
            135deg,
            #18d9ed,
            #3c65ff
          );
          box-shadow: 0 8px 25px rgba(26, 205, 240, 0.25);
        }

        .brand-title {
          font-size: 14px;
          font-weight: 900;
          color: #ffffff;
        }

        .brand-subtitle {
          margin-top: 5px;
          color: #7f9bb5;
          font-size: 10px;
        }

        .navigation {
          display: grid;
          gap: 6px;
        }

        .navigation a {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border: 1px solid transparent;
          border-radius: 12px;
          color: #9db6cc;
          font-size: 12px;
          transition: 0.2s ease;
        }

        .navigation a:hover,
        .navigation a.active {
          color: #ffffff;
          border-color: rgba(40, 215, 239, 0.2);
          background: rgba(34, 204, 233, 0.1);
        }

        .sidebar-footer {
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: #66839d;
          font-size: 10px;
          line-height: 2;
        }

        .content {
          min-width: 0;
          direction: rtl;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          padding: 16px 20px;
          border-radius: 20px;
        }

        .topbar-title {
          margin: 0 0 7px;
          font-size: 25px;
          line-height: 1.5;
        }

        .muted {
          color: #91a9bf;
          font-size: 12px;
          line-height: 1.9;
        }

        .user-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          color: white;
          font-size: 16px;
          font-weight: 900;
          background: linear-gradient(
            135deg,
            #1bd9ed,
            #5b61ff
          );
        }

        .hero {
          margin-bottom: 18px;
          padding: 30px;
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(20, 52, 81, 0.92),
              rgba(11, 27, 47, 0.9)
            );
        }

        .hero-label {
          color: #2cdbed;
          font-size: 12px;
          font-weight: bold;
        }

        .hero-title {
          margin: 12px 0;
          font-size: clamp(22px, 4vw, 36px);
          line-height: 1.8;
        }

        .hero-description {
          max-width: 750px;
          margin: 0;
          color: #a0b6c9;
          font-size: 13px;
          line-height: 2.2;
        }

        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 12px 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: #eaf8ff;
          background: rgba(255, 255, 255, 0.04);
          font-size: 12px;
          font-weight: bold;
          transition: 0.2s ease;
        }

        .button:hover {
          transform: translateY(-2px);
          border-color: rgba(40, 215, 239, 0.4);
        }

        .button-primary {
          border: none;
          color: #04111d;
          background: linear-gradient(
            135deg,
            #1bd4eb,
            #416bff
          );
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 25px 0 12px;
        }

        .section-heading h2,
        .section-heading h3 {
          margin: 0;
          color: #ffffff;
          font-size: 17px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboard-card {
          padding: 18px;
          border-radius: 20px;
        }

        .stat-label {
          margin-bottom: 15px;
          color: #91a9bf;
          font-size: 11px;
        }

        .stat-value {
          color: #ffffff;
          font-size: 27px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .stat-footer {
          margin-top: 9px;
          color: #6f8ba5;
          font-size: 10px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 14px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .quick-link {
          display: block;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.03);
          transition: 0.2s ease;
        }

        .quick-link:hover {
          transform: translateY(-2px);
          border-color: rgba(36, 214, 238, 0.3);
          background: rgba(36, 214, 238, 0.07);
        }

        .quick-link strong {
          display: block;
          margin-bottom: 8px;
          color: #ffffff;
          font-size: 12px;
        }

        .quick-link span {
          color: #8fa8bf;
          font-size: 11px;
          line-height: 1.9;
        }

        .account-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          font-size: 12px;
        }

        .account-row:last-child {
          border-bottom: none;
        }

        .account-row span {
          color: #8fa8bf;
        }

        .account-row strong {
          max-width: 65%;
          color: #ffffff;
          text-align: left;
          overflow-wrap: anywhere;
        }

        .table-container {
          width: 100%;
          overflow-x: auto;
        }

        .trades-table {
          width: 100%;
          min-width: 620px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .trades-table th,
        .trades-table td {
          padding: 14px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          text-align: right;
          white-space: nowrap;
        }

        .trades-table th {
          color: #7895ad;
          font-weight: normal;
        }

        .trades-table td {
          color: #d9e9f5;
        }

        .status-badge {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 99px;
          color: #b8e9f4;
          background: rgba(255, 255, 255, 0.07);
          font-size: 10px;
        }

        .empty-state {
          padding: 28px 15px;
          color: #8fa8bf;
          text-align: center;
          font-size: 12px;
          line-height: 2;
        }

        .bottom-note {
          margin: 20px 0 4px;
          color: #58748d;
          text-align: center;
          font-size: 10px;
        }

        @media (max-width: 1150px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 780px) {
          .dashboard-page {
            padding: 9px;
          }

          .dashboard-layout {
            display: block;
          }

          .sidebar {
            position: static;
            margin-bottom: 10px;
            padding: 10px;
          }

          .navigation {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding-bottom: 3px;
          }

          .navigation a {
            flex: 0 0 auto;
            white-space: nowrap;
          }

          .sidebar-footer {
            display: none;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
            padding: 16px;
          }

          .topbar-title {
            font-size: 21px;
          }

          .hero {
            padding: 22px 17px;
          }

          .hero-title {
            font-size: 23px;
          }

          .stats-grid {
            gap: 8px;
          }

          .dashboard-card {
            padding: 14px;
          }

          .stat-value {
            font-size: 22px;
          }

          .button-group {
            flex-direction: column;
          }

          .button {
            width: 100%;
          }

          .quick-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .user-box {
            width: 100%;
          }

          .hero-title {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">AI</div>

            <div>
              <div className="brand-title">
                Trading AI
              </div>

              <div className="brand-subtitle">
                پلتفرم هوشمند معاملات
              </div>
            </div>
          </div>

          <nav className="navigation">
            <Link className="active" href="/dashboard">
              🏠 داشبورد
            </Link>

            <Link href="/market">
              ◈ بازارها
            </Link>

            <Link href="/bots">
              🤖 ربات‌ها
            </Link>

            <Link href="/signals">
              ⌁ سیگنال‌ها
            </Link>

            <Link href="/ai-analysis">
              ✦ تحلیل هوشمند
            </Link>

            <Link href="/news">
              📰 اخبار
            </Link>

            <Link href="/economic">
              ◷ تقویم اقتصادی
            </Link>

            <Link href="/broker">
              ⇄ اتصال بروکر
            </Link>

            <Link href="/payments">
              ▣ پرداخت‌ها
            </Link>

            <Link href="/settings">
              ⚙ تنظیمات
            </Link>

            <Link href="/support">
              ❔ پشتیبانی
            </Link>
          </nav>

          <div className="sidebar-footer">
            اطلاعات این صفحه از دیتابیس حساب کاربری شما خوانده می‌شود.
          </div>
        </aside>

        <section className="content">
          <header className="topbar">
            <div>
              <h1 className="topbar-title">
                داشبورد معاملاتی
              </h1>

              <div className="muted">
                نمای کلی حساب، ربات‌ها، سیگنال‌ها و معاملات
              </div>
            </div>

            <div className="user-box">
              <div className="avatar">
                {firstLetter}
              </div>

              <div>
                <strong>
                  {user.name}
                </strong>

                <div className="muted">
                  {user.role === "ADMIN"
                    ? "مدیر سیستم"
                    : "کاربر"}{" "}
                  ·{" "}
                  {faPlan[user.plan] ?? user.plan}
                </div>
              </div>
            </div>
          </header>

          <section className="hero">
            <div className="hero-label">
              ✦ خوش آمدید به Trading AI
            </div>

            <h2 className="hero-title">
              {user.name} عزیز، آماده تحلیل بازار هستید؟
            </h2>

            <p className="hero-description">
              از این بخش می‌توانید وضعیت حساب، ربات‌ها،
              سیگنال‌ها و معاملات خود را مشاهده و مدیریت کنید.
            </p>

            <div className="button-group">
              <Link
                className="button button-primary"
                href="/ai-analysis"
              >
                شروع تحلیل هوشمند
              </Link>

              <Link
                className="button"
                href="/bots"
              >
                مدیریت ربات‌ها
              </Link>

              <Link
                className="button"
                href="/broker"
              >
                اتصال بروکر
              </Link>
            </div>
          </section>

          <div className="section-heading">
            <h2>
              نمای کلی حساب
            </h2>

            <span className="muted">
              اطلاعات واقعی دیتابیس
            </span>
          </div>

          <section className="stats-grid">
            <div className="dashboard-card">
              <div className="stat-label">
                کل ربات‌ها
              </div>

              <div className="stat-value">
                {totalBots}
              </div>

              <div className="stat-footer">
                {activeBots} ربات فعال
              </div>
            </div>

            <div className="dashboard-card">
              <div className="stat-label">
                کل سیگنال‌ها
              </div>

              <div className="stat-value">
                {totalSignals}
              </div>

              <div className="stat-footer">
                سیگنال‌های ثبت‌شده حساب شما
              </div>
            </div>

            <div className="dashboard-card">
              <div className="stat-label">
                معاملات باز
              </div>

              <div className="stat-value">
                {openTrades}
              </div>

              <div className="stat-footer">
                {totalTrades} معامله در مجموع
              </div>
            </div>

            <div className="dashboard-card">
              <div className="stat-label">
                پلن حساب
              </div>

              <div className="stat-value">
                {faPlan[user.plan] ?? user.plan}
              </div>

              <div className="stat-footer">
                سطح دسترسی فعلی
              </div>
            </div>
          </section>

          <div className="section-heading">
            <h2>
              دسترسی سریع
            </h2>

            <span className="muted">
              مسیرهای سایت
            </span>
          </div>

          <div className="main-grid">
            <section className="dashboard-card">
              <div className="section-heading">
                <h3>
                  ابزارهای معاملاتی
                </h3>
              </div>

              <div className="quick-grid">
                <Link
                  className="quick-link"
                  href="/market"
                >
                  <strong>
                    ◈ بازارهای مالی
                  </strong>

                  <span>
                    مشاهده بازارها و نمادهای معاملاتی
                  </span>
                </Link>

                <Link
                  className="quick-link"
                  href="/ai-analysis"
                >
                  <strong>
                    ✦ تحلیل هوشمند
                  </strong>

                  <span>
                    بررسی شرایط و داده‌های بازار
                  </span>
                </Link>

                <Link
                  className="quick-link"
                  href="/signals"
                >
                  <strong>
                    ⌁ سیگنال‌ها
                  </strong>

                  <span>
                    مشاهده سیگنال‌های حساب شما
                  </span>
                </Link>

                <Link
                  className="quick-link"
                  href="/economic"
                >
                  <strong>
                    ◷ تقویم اقتصادی
                  </strong>

                  <span>
                    مشاهده رویدادهای اقتصادی مهم
                  </span>
                </Link>
              </div>
            </section>

            <section className="dashboard-card">
              <div className="section-heading">
                <h3>
                  اطلاعات حساب
                </h3>
              </div>

              <div className="account-row">
                <span>
                  نام
                </span>

                <strong>
                  {user.name}
                </strong>
              </div>

              <div className="account-row">
                <span>
                  ایمیل
                </span>

                <strong>
                  {user.email}
                </strong>
              </div>

              <div className="account-row">
                <span>
                  نقش
                </span>

                <strong>
                  {user.role === "ADMIN"
                    ? "مدیر سیستم"
                    : "کاربر"}
                </strong>
              </div>

              <div className="account-row">
                <span>
                  تاریخ عضویت
                </span>

                <strong>
                  {dateText(user.createdAt)}
                </strong>
              </div>

              <div className="button-group">
                <Link
                  className="button"
                  href="/profile"
                >
                  پروفایل
                </Link>

                <Link
                  className="button"
                  href="/settings"
                >
                  تنظیمات
                </Link>
              </div>
            </section>
          </div>

          <div className="section-heading">
            <h2>
              آخرین معاملات
            </h2>

            <span className="muted">
              پنج معامله آخر
            </span>
          </div>

          <section className="dashboard-card">
            {latestTrades.length === 0 ? (
              <div className="empty-state">
                هنوز معامله‌ای برای حساب شما ثبت نشده است.
              </div>
            ) : (
              <div className="table-container">
                <table className="trades-table">
                  <thead>
                    <tr>
                      <th>
                        نماد
                      </th>

                      <th>
                        جهت
                      </th>

                      <th>
                        وضعیت
                      </th>

                      <th>
                        منبع
                      </th>

                      <th>
                        سود / زیان
                      </th>

                      <th>
                        زمان
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {latestTrades.map((trade) => (
                      <tr key={trade.id}>
                        <td>
                          {trade.symbol}
                        </td>

                        <td>
                          {trade.direction}
                        </td>

                        <td>
                          <span className="status-badge">
                            {faStatus[trade.status] ??
                              trade.status}
                          </span>
                        </td>

                        <td>
                          {trade.source}
                        </td>

                        <td>
                          {trade.profitLoss === null ||
                          trade.profitLoss === undefined
                            ? "—"
                            : trade.profitLoss.toLocaleString(
                                "en-US",
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                        </td>

                        <td>
                          {dateText(trade.openedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="bottom-note">
            این داشبورد آمار را از حساب کاربری جاری دریافت می‌کند
            و داده ساختگی تولید نمی‌کند.
          </div>
        </section>
      </div>
    </main>
  );
}
