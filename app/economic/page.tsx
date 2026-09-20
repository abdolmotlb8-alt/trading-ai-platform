import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

type SearchParams = {
  impact?: string;
  currency?: string;
  status?: string;
};

function Icon({
  children,
  size = 22,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </span>
  );
}

function CalendarIcon() {
  return (
    <Icon>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="M8 14h2M14 14h2M8 18h2" />
      </svg>
    </Icon>
  );
}

function ChartIcon() {
  return (
    <Icon>
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 4-5 3 3 5-7" />
        <path d="M16 6h3v3" />
      </svg>
    </Icon>
  );
}

function BellIcon() {
  return (
    <Icon>
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    </Icon>
  );
}

function FilterIcon() {
  return (
    <Icon>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
    </Icon>
  );
}

function ArrowIcon() {
  return (
    <Icon size={16}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Icon>
  );
}

function getImpactData(importance: number) {
  if (importance >= 3) {
    return {
      label: "زیاد",
      className: "high",
    };
  }

  if (importance === 2) {
    return {
      label: "متوسط",
      className: "medium",
    };
  }

  return {
    label: "کم",
    className: "low",
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export default async function EconomicPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main dir="rtl" className="auth-required">
        <div className="auth-card">
          <div className="auth-icon">🔒</div>
          <h1>ورود به حساب کاربری</h1>
          <p>برای مشاهده تقویم اقتصادی ابتدا وارد حساب خود شوید.</p>
          <Link href="/login" className="primary-button">
            ورود به حساب
          </Link>
        </div>

        <style>{`
          .auth-required {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background: #07111f;
            color: #f8fafc;
            font-family: Arial, Tahoma, sans-serif;
          }

          .auth-card {
            width: min(430px, 100%);
            padding: 35px;
            text-align: center;
            border: 1px solid rgba(148,163,184,.16);
            border-radius: 28px;
            background: rgba(15,23,42,.92);
            box-shadow: 0 25px 80px rgba(0,0,0,.3);
          }

          .auth-icon {
            font-size: 42px;
            margin-bottom: 18px;
          }

          .auth-card h1 {
            margin: 0 0 12px;
            font-size: 25px;
          }

          .auth-card p {
            color: #94a3b8;
            line-height: 2;
          }

          .primary-button {
            display: inline-flex;
            justify-content: center;
            margin-top: 18px;
            padding: 13px 25px;
            border-radius: 13px;
            background: linear-gradient(135deg,#06b6d4,#2563eb);
            color: white;
            text-decoration: none;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  const params = (await searchParams) || {};

  const importanceFilter = Number(params.impact || 0);
  const currencyFilter = params.currency || "";
  const statusFilter = params.status || "SCHEDULED";

  const where = {
    ...(importanceFilter > 0
      ? {
          importance: importanceFilter,
        }
      : {}),
    ...(currencyFilter
      ? {
          currency: currencyFilter,
        }
      : {}),
    ...(statusFilter !== "ALL"
      ? {
          status: statusFilter,
        }
      : {}),
  };

  const events = await prisma.economicEvent.findMany({
    where,
    orderBy: {
      eventTime: "asc",
    },
    take: 100,
  });

  const currencies = await prisma.economicEvent.findMany({
    where: {
      currency: {
        not: null,
      },
    },
    select: {
      currency: true,
    },
    distinct: ["currency"],
    orderBy: {
      currency: "asc",
    },
  });

  const highImpactCount = events.filter(
    (event) => event.importance >= 3
  ).length;

  const mediumImpactCount = events.filter(
    (event) => event.importance === 2
  ).length;

  const lowImpactCount = events.filter(
    (event) => event.importance <= 1
  ).length;

  const today = new Date();

  const todayEvents = events.filter((event) => {
    const eventDate = new Date(event.eventTime);

    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    );
  }).length;

  return (
    <main dir="rtl" className="economic-page">
      <div className="economic-shell">
        <header className="topbar">
          <Link href="/dashboard" className="brand">
            <span className="brand-logo">AI</span>

            <span>
              <strong>Trading AI</strong>
              <small>Smart Market Intelligence</small>
            </span>
          </Link>

          <nav className="top-navigation">
            <Link href="/dashboard">داشبورد</Link>
            <Link href="/market">بازار</Link>
            <Link href="/news">اخبار</Link>
            <Link href="/settings">تنظیمات</Link>
          </nav>

          <Link href="/dashboard" className="back-button">
            بازگشت به داشبورد
          </Link>
        </header>

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <CalendarIcon />
              LIVE ECONOMIC CALENDAR
            </div>

            <h1>تقویم اقتصادی هوشمند</h1>

            <p>
              مشاهده رویدادهای اقتصادی ثبت‌شده، میزان اهمیت،
              زمان انتشار و تأثیر احتمالی آن‌ها بر بازارهای مالی.
            </p>

            <div className="hero-actions">
              <Link href="/economic" className="hero-button">
                <ChartIcon />
                مشاهده همه رویدادها
              </Link>

              <Link href="/settings" className="hero-button secondary">
                <BellIcon />
                تنظیم اعلان‌ها
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-center">
              <ChartIcon />
              <strong>ECONOMIC</strong>
              <span>INTELLIGENCE</span>
            </div>
          </div>
        </section>

        <section className="statistics">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon blue">
                <CalendarIcon />
              </span>
              <span className="stat-status">DATABASE</span>
            </div>

            <span className="stat-label">کل رویدادهای نمایش‌داده‌شده</span>
            <strong>{formatNumber(events.length)}</strong>
            <small>داده‌های موجود در پایگاه داده</small>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon red">
                <BellIcon />
              </span>
              <span className="stat-status red-text">HIGH</span>
            </div>

            <span className="stat-label">رویدادهای با اهمیت زیاد</span>
            <strong>{formatNumber(highImpactCount)}</strong>
            <small>اهمیت سطح بالا</small>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon yellow">
                <ChartIcon />
              </span>
              <span className="stat-status yellow-text">MEDIUM</span>
            </div>

            <span className="stat-label">رویدادهای متوسط</span>
            <strong>{formatNumber(mediumImpactCount)}</strong>
            <small>اهمیت سطح متوسط</small>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon green">
                <CalendarIcon />
              </span>
              <span className="stat-status green-text">TODAY</span>
            </div>

            <span className="stat-label">رویدادهای امروز</span>
            <strong>{formatNumber(todayEvents)}</strong>
            <small>بر اساس تاریخ ثبت‌شده</small>
          </div>
        </section>

        <section className="content-panel">
          <div className="panel-heading">
            <div>
              <span className="heading-label">MARKET EVENTS</span>
              <h2>رویدادهای اقتصادی</h2>
              <p>
                اطلاعات زیر مستقیماً از جدول EconomicEvent خوانده می‌شود.
              </p>
            </div>

            <div className="data-indicator">
              <span />
              داده‌های پایگاه داده
            </div>
          </div>

          <form method="GET" className="filters">
            <div className="filter-field">
              <label htmlFor="impact">اهمیت رویداد</label>

              <select id="impact" name="impact" defaultValue={params.impact || "0"}>
                <option value="0">همه سطوح</option>
                <option value="3">زیاد</option>
                <option value="2">متوسط</option>
                <option value="1">کم</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="currency">ارز</label>

              <select
                id="currency"
                name="currency"
                defaultValue={currencyFilter}
              >
                <option value="">همه ارزها</option>

                {currencies.map((item) => (
                  <option key={item.currency} value={item.currency || ""}>
                    {item.currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="status">وضعیت</label>

              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
              >
                <option value="SCHEDULED">زمان‌بندی‌شده</option>
                <option value="RELEASED">منتشرشده</option>
                <option value="CANCELLED">لغوشده</option>
                <option value="ALL">همه وضعیت‌ها</option>
              </select>
            </div>

            <button type="submit" className="filter-button">
              <FilterIcon />
              اعمال فیلتر
            </button>

            <Link href="/economic" className="reset-button">
              پاک‌کردن
            </Link>
          </form>

          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarIcon />
              </div>

              <h3>رویدادی پیدا نشد</h3>

              <p>
                در حال حاضر رویدادی مطابق فیلترهای انتخاب‌شده
                در پایگاه داده وجود ندارد.
              </p>

              <Link href="/economic" className="primary-button">
                حذف فیلترها
              </Link>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event) => {
                const impact = getImpactData(event.importance);

                return (
                  <article className="event-card" key={event.id}>
                    <div className="event-time">
                      <span className="time-icon">
                        <CalendarIcon />
                      </span>

                      <strong>{formatTime(event.eventTime)}</strong>
                      <small>{formatDate(event.eventTime)}</small>
                    </div>

                    <div className="event-main">
                      <div className="event-header">
                        <span className={`impact-badge ${impact.className}`}>
                          {impact.label}
                        </span>

                        <span className="event-status">
                          {event.status}
                        </span>
                      </div>

                      <h3>{event.event}</h3>

                      <div className="event-details">
                        <span>
                          کشور: {event.country || "نامشخص"}
                        </span>

                        <span>
                          ارز: {event.currency || "نامشخص"}
                        </span>

                        <span>
                          دسته‌بندی: {event.category || "عمومی"}
                        </span>
                      </div>
                    </div>

                    <div className="event-values">
                      <div>
                        <span>قبلی</span>
                        <strong>{event.previous || "—"}</strong>
                      </div>

                      <div>
                        <span>پیش‌بینی</span>
                        <strong>{event.forecast || "—"}</strong>
                      </div>

                      <div>
                        <span>واقعی</span>
                        <strong className={event.actual ? "actual" : ""}>
                          {event.actual || "منتظر انتشار"}
                        </strong>
                      </div>
                    </div>

                    {event.sourceUrl ? (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="source-button"
                      >
                        منبع
                        <ArrowIcon />
                      </a>
                    ) : (
                      <span className="source-disabled">
                        بدون منبع
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="notice-panel">
          <div className="notice-icon">
            <BellIcon />
          </div>

          <div>
            <h2>هشدارهای اقتصادی</h2>
            <p>
              برای ارسال هشدار واقعی باید سرویس زمان‌بندی،
              منبع دریافت داده و سیستم ارسال اعلان در پروژه
              پیاده‌سازی و فعال شده باشد.
            </p>
          </div>

          <Link href="/settings" className="notice-button">
            تنظیمات اعلان
            <ArrowIcon />
          </Link>
        </section>

        <footer className="footer">
          <span>Trading AI Platform</span>
          <span>Economic Calendar</span>
          <span>Database Connected</span>
        </footer>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .economic-page {
          min-height: 100vh;
          padding: 24px;
          color: #e2e8f0;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(6,182,212,.12),
              transparent 30%
            ),
            radial-gradient(
              circle at 0% 70%,
              rgba(37,99,235,.12),
              transparent 30%
            ),
            #050d1a;
          font-family: Arial, Tahoma, sans-serif;
        }

        .economic-shell {
          width: min(1480px, 100%);
          margin: 0 auto;
        }

        .topbar {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          padding: 15px 22px;
          border: 1px solid rgba(148,163,184,.13);
          border-radius: 23px;
          background: rgba(8,20,35,.86);
          backdrop-filter: blur(22px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          direction: ltr;
        }

        .brand-logo {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: white;
          font-size: 17px;
          font-weight: 900;
          background: linear-gradient(135deg,#06b6d4,#2563eb);
          box-shadow: 0 12px 30px rgba(6,182,212,.2);
        }

        .brand strong,
        .brand small {
          display: block;
        }

        .brand strong {
          font-size: 17px;
        }

        .brand small {
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
        }

        .top-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 23px;
        }

        .top-navigation a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: .2s;
        }

        .top-navigation a:hover {
          color: #67e8f9;
        }

        .back-button {
          padding: 11px 14px;
          border-radius: 12px;
          color: #67e8f9;
          border: 1px solid rgba(34,211,238,.18);
          background: rgba(34,211,238,.06);
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
        }

        .hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 35px;
          min-height: 310px;
          margin-top: 22px;
          padding: 42px;
          border: 1px solid rgba(34,211,238,.14);
          border-radius: 30px;
          background:
            linear-gradient(
              125deg,
              rgba(8,47,73,.9),
              rgba(8,20,35,.97)
            );
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 760px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #67e8f9;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .8px;
        }

        .hero h1 {
          margin: 20px 0 13px;
          color: #f8fafc;
          font-size: clamp(28px,4vw,45px);
          line-height: 1.4;
        }

        .hero p {
          max-width: 650px;
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 2.1;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 25px;
        }

        .hero-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 13px 17px;
          border-radius: 13px;
          color: white;
          background: linear-gradient(135deg,#0891b2,#2563eb);
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
        }

        .hero-button.secondary {
          color: #a5f3fc;
          background: rgba(34,211,238,.06);
          border: 1px solid rgba(34,211,238,.18);
        }

        .hero-visual {
          position: relative;
          width: 260px;
          height: 260px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }

        .visual-orbit {
          position: absolute;
          border: 1px solid rgba(34,211,238,.16);
          border-radius: 50%;
        }

        .orbit-one {
          width: 250px;
          height: 250px;
        }

        .orbit-two {
          width: 180px;
          height: 180px;
          border-style: dashed;
          border-color: rgba(59,130,246,.35);
        }

        .visual-center {
          position: relative;
          z-index: 1;
          width: 125px;
          height: 125px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          border-radius: 35px;
          color: #67e8f9;
          background: linear-gradient(145deg,#0e7490,#1d4ed8);
          box-shadow: 0 0 65px rgba(6,182,212,.22);
        }

        .visual-center strong {
          font-size: 10px;
        }

        .visual-center span {
          color: #bfdbfe;
          font-size: 8px;
        }

        .statistics {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 15px;
          margin-top: 20px;
        }

        .stat-card {
          padding: 22px;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 21px;
          background: rgba(8,20,35,.87);
        }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
        }

        .stat-icon.blue {
          color: #67e8f9;
          background: rgba(6,182,212,.1);
        }

        .stat-icon.red {
          color: #fca5a5;
          background: rgba(239,68,68,.1);
        }

        .stat-icon.yellow {
          color: #fde68a;
          background: rgba(245,158,11,.1);
        }

        .stat-icon.green {
          color: #86efac;
          background: rgba(34,197,94,.1);
        }

        .stat-status {
          color: #67e8f9;
          font-size: 8px;
          font-weight: 900;
        }

        .red-text {
          color: #fca5a5;
        }

        .yellow-text {
          color: #fde68a;
        }

        .green-text {
          color: #86efac;
        }

        .stat-label {
          display: block;
          margin-top: 18px;
          color: #94a3b8;
          font-size: 10px;
        }

        .stat-card strong {
          display: block;
          margin-top: 9px;
          color: #f8fafc;
          font-size: 27px;
        }

        .stat-card small {
          display: block;
          margin-top: 9px;
          color: #475569;
          font-size: 9px;
        }

        .content-panel {
          margin-top: 22px;
          padding: 26px;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 25px;
          background: rgba(8,20,35,.87);
        }

        .panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 23px;
        }

        .heading-label {
          color: #22d3ee;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .panel-heading h2 {
          margin: 10px 0 7px;
          color: #f8fafc;
          font-size: 23px;
        }

        .panel-heading p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }

        .data-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 11px;
          color: #86efac;
          background: rgba(34,197,94,.06);
          border: 1px solid rgba(34,197,94,.12);
          font-size: 9px;
          white-space: nowrap;
        }

        .data-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 12px rgba(34,197,94,.7);
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(3,1fr) auto auto;
          align-items: end;
          gap: 12px;
          padding: 18px;
          margin-bottom: 20px;
          border-radius: 17px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.06);
        }

        .filter-field label {
          display: block;
          margin-bottom: 8px;
          color: #94a3b8;
          font-size: 10px;
        }

        .filter-field select {
          width: 100%;
          min-height: 43px;
          padding: 0 12px;
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 11px;
          outline: none;
          color: #e2e8f0;
          background: #0f2034;
          font: inherit;
          font-size: 11px;
        }

        .filter-button,
        .reset-button {
          min-height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 15px;
          border-radius: 11px;
          cursor: pointer;
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
        }

        .filter-button {
          border: 0;
          color: white;
          background: linear-gradient(135deg,#0891b2,#2563eb);
        }

        .reset-button {
          color: #94a3b8;
          border: 1px solid rgba(148,163,184,.15);
          background: rgba(255,255,255,.03);
        }

        .events-list {
          display: grid;
          gap: 12px;
        }

        .event-card {
          display: grid;
          grid-template-columns: 125px minmax(0,1fr) minmax(210px,.8fr) auto;
          align-items: center;
          gap: 22px;
          padding: 20px;
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 19px;
          background: rgba(255,255,255,.025);
          transition: .2s;
        }

        .event-card:hover {
          border-color: rgba(34,211,238,.23);
          background: rgba(34,211,238,.035);
        }

        .event-time {
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 7px;
          padding-left: 18px;
          border-left: 1px solid rgba(148,163,184,.13);
          text-align: center;
        }

        .time-icon {
          color: #22d3ee;
        }

        .event-time strong {
          color: #f8fafc;
          font-size: 20px;
        }

        .event-time small {
          color: #64748b;
          font-size: 9px;
          line-height: 1.8;
        }

        .event-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .impact-badge,
        .event-status {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 700;
        }

        .impact-badge.high {
          color: #fca5a5;
          background: rgba(239,68,68,.1);
        }

        .impact-badge.medium {
          color: #fde68a;
          background: rgba(245,158,11,.1);
        }

        .impact-badge.low {
          color: #86efac;
          background: rgba(34,197,94,.1);
        }

        .event-status {
          color: #94a3b8;
          background: rgba(148,163,184,.08);
        }

        .event-main h3 {
          margin: 13px 0 10px;
          color: #f1f5f9;
          font-size: 14px;
          line-height: 1.8;
        }

        .event-details {
          display: flex;
          flex-wrap: wrap;
          gap: 9px 15px;
          color: #64748b;
          font-size: 9px;
        }

        .event-values {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 8px;
        }

        .event-values div {
          padding: 11px 8px;
          text-align: center;
          border-radius: 11px;
          background: rgba(255,255,255,.035);
        }

        .event-values span,
        .event-values strong {
          display: block;
        }

        .event-values span {
          color: #64748b;
          font-size: 9px;
        }

        .event-values strong {
          margin-top: 8px;
          color: #cbd5e1;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .event-values strong.actual {
          color: #67e8f9;
        }

        .source-button,
        .source-disabled {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 62px;
          padding: 10px 8px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 700;
          text-decoration: none;
        }

        .source-button {
          color: #67e8f9;
          border: 1px solid rgba(34,211,238,.15);
          background: rgba(34,211,238,.05);
        }

        .source-disabled {
          color: #475569;
          border: 1px solid rgba(148,163,184,.08);
        }

        .empty-state {
          padding: 55px 20px;
          text-align: center;
          border-radius: 18px;
          border: 1px dashed rgba(148,163,184,.18);
          background: rgba(255,255,255,.02);
        }

        .empty-icon {
          display: flex;
          justify-content: center;
          color: #64748b;
        }

        .empty-state h3 {
          margin: 15px 0 10px;
          color: #e2e8f0;
          font-size: 18px;
        }

        .empty-state p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 2;
        }

        .primary-button {
          display: inline-flex;
          margin-top: 20px;
          padding: 12px 18px;
          border-radius: 11px;
          color: white;
          background: linear-gradient(135deg,#0891b2,#2563eb);
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
        }

        .notice-panel {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
          padding: 22px;
          border: 1px solid rgba(34,211,238,.12);
          border-radius: 21px;
          background: linear-gradient(
            120deg,
            rgba(6,182,212,.07),
            rgba(37,99,235,.04)
          );
        }

        .notice-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: #67e8f9;
          border-radius: 14px;
          background: rgba(34,211,238,.08);
        }

        .notice-panel h2 {
          margin: 0;
          color: #e2e8f0;
          font-size: 15px;
        }

        .notice-panel p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.9;
        }

        .notice-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-right: auto;
          padding: 11px 13px;
          border-radius: 11px;
          color: #67e8f9;
          border: 1px solid rgba(34,211,238,.15);
          background: rgba(34,211,238,.05);
          text-decoration: none;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 700;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 25px 5px 8px;
          color: #475569;
          font-size: 9px;
        }

        @media (max-width: 1200px) {
          .statistics {
            grid-template-columns: repeat(2,1fr);
          }

          .event-card {
            grid-template-columns: 105px minmax(0,1fr) minmax(180px,.8fr);
          }

          .source-button,
          .source-disabled {
            grid-column: 1 / -1;
            justify-self: start;
          }
        }

        @media (max-width: 900px) {
          .economic-page {
            padding: 12px;
          }

          .topbar {
            flex-wrap: wrap;
          }

          .top-navigation {
            order: 3;
            width: 100%;
          }

          .hero {
            padding: 27px;
          }

          .hero-visual {
            display: none;
          }

          .filters {
            grid-template-columns: repeat(2,1fr);
          }

          .event-card {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .event-time {
            align-items: flex-start;
            padding: 0 0 15px;
            border-left: 0;
            border-bottom: 1px solid rgba(148,163,184,.13);
          }

          .source-button,
          .source-disabled {
            grid-column: auto;
          }
        }

        @media (max-width: 560px) {
          .economic-page {
            padding: 8px;
          }

          .topbar {
            padding: 14px;
          }

          .top-navigation {
            justify-content: space-between;
            gap: 10px;
          }

          .top-navigation a {
            font-size: 10px;
          }

          .back-button {
            display: none;
          }

          .hero {
            padding: 23px;
            border-radius: 22px;
          }

          .hero h1 {
            font-size: 27px;
          }

          .hero p {
            font-size: 11px;
          }

          .statistics {
            grid-template-columns: 1fr;
          }

          .content-panel {
            padding: 17px;
          }

          .panel-heading {
            flex-direction: column;
          }

          .filters {
            grid-template-columns: 1fr;
            padding: 13px;
          }

          .filter-button,
          .reset-button {
            width: 100%;
          }

          .event-values {
            grid-template-columns: 1fr;
          }

          .notice-panel {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .notice-button {
            margin-right: 0;
          }

          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
