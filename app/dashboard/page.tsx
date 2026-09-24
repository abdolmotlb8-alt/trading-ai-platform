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

function timeText(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function impactText(value: number) {
  if (value >= 3) return "اهمیت بالا";
  if (value >= 2) return "اهمیت متوسط";
  return "اهمیت کم";
}

function impactClass(value: number) {
  if (value >= 3) return "high";
  if (value >= 2) return "medium";
  return "low";
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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

  const now = new Date();

  const [bots, activeBots, signals, openTrades, allTrades, trades, economicEvents] =
    await Promise.all([
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

      prisma.economicEvent.findMany({
        where: {
          eventTime: {
            gte: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
        },
        orderBy: [
          {
            eventTime: "asc",
          },
          {
            importance: "desc",
          },
        ],
        take: 8,
        select: {
          id: true,
          country: true,
          currency: true,
          event: true,
          category: true,
          importance: true,
          eventTime: true,
          previous: true,
          forecast: true,
          actual: true,
          unit: true,
          status: true,
        },
      }),
    ]);

  return (
    <main dir="rtl" className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #050914;
          color: #edf6ff;
          font-family: Tahoma, Arial, sans-serif;
        }

        .page {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(circle at 0% 0%, #123e58 0, transparent 32%),
            radial-gradient(circle at 100% 20%, #2b1808 0, transparent 28%),
            linear-gradient(135deg, #050914, #0d1423);
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .layout {
          max-width: 1450px;
          margin: auto;
          display: grid;
          grid-template-columns: 235px minmax(0, 1fr);
          gap: 18px;
          direction: ltr;
        }

        .side,
        .top,
        .hero,
        .card {
          background: rgba(10, 23, 40, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(18px);
        }

        .side {
          direction: rtl;
          border-radius: 24px;
          padding: 16px;
          height: max-content;
          position: sticky;
          top: 18px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 6px 20px;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .logoMark {
          width: 45px;
          height: 45px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          font-weight: 900;
          color: #07111f;
          background: linear-gradient(135deg, #d8b45a, #fff0a6);
          box-shadow: 0 8px 25px rgba(216,180,90,.22);
        }

        .logo small {
          display: block;
          color: #89a6bf;
          font-size: 10px;
          margin-top: 5px;
        }

        .nav {
          display: grid;
          gap: 6px;
        }

        .nav a {
          padding: 12px;
          border-radius: 12px;
          color: #a9bfd2;
          font-size: 12px;
          transition: .2s;
        }

        .nav a:hover,
        .nav .selected {
          background: rgba(216,180,90,.12);
          color: #fff;
          border: 1px solid rgba(216,180,90,.25);
        }

        .content {
          direction: rtl;
          min-width: 0;
        }

        .top {
          border-radius: 20px;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .top h1 {
          font-size: 25px;
          margin: 0 0 7px;
        }

        .muted {
          color: #91a9bf;
          font-size: 12px;
        }

        .user {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #111;
          background: linear-gradient(135deg, #d8b45a, #fff0a6);
          font-weight: bold;
        }

        .hero {
          border-radius: 24px;
          padding: 28px;
          margin-bottom: 16px;
        }

        .eyebrow {
          color: #e5c86a;
          font-size: 12px;
        }

        .hero h2 {
          font-size: clamp(22px, 4vw, 36px);
          line-height: 1.7;
          margin: 10px 0;
        }

        .hero p {
          color: #a0b6c9;
          line-height: 2;
          font-size: 13px;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 20px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          font-size: 12px;
          font-weight: bold;
        }

        .primary {
          background: linear-gradient(135deg, #d8b45a, #fff0a6);
          color: #111;
          border: 0;
        }

        .heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 24px 0 12px;
        }

        .heading h3 {
          margin: 0;
          font-size: 17px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .card {
          border-radius: 20px;
          padding: 18px;
        }

        .label {
          color: #91a9bf;
          font-size: 11px;
          margin-bottom: 15px;
        }

        .value {
          font-size: 27px;
          font-weight: 900;
        }

        .foot {
          color: #6f8ba5;
          font-size: 10px;
          margin-top: 9px;
        }

        /* NEWS */

        .newsCard {
          border-radius: 22px;
          overflow: hidden;
          padding: 0;
        }

        .newsHeader {
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background:
            linear-gradient(
              90deg,
              rgba(216,180,90,.09),
              transparent
            );
        }

        .newsTitle {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .newsIcon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: rgba(216,180,90,.12);
          border: 1px solid rgba(216,180,90,.22);
          font-size: 20px;
        }

        .newsTitle h3 {
          margin: 0;
          font-size: 16px;
        }

        .newsTitle span {
          display: block;
          color: #708ba3;
          font-size: 10px;
          margin-top: 5px;
        }

        .newsList {
          display: grid;
        }

        .newsItem {
          display: grid;
          grid-template-columns: 76px minmax(0,1fr) 120px;
          gap: 14px;
          align-items: center;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .newsItem:last-child {
          border-bottom: 0;
        }

        .newsTime {
          text-align: center;
          padding: 9px 6px;
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.06);
        }

        .newsTime strong {
          display: block;
          font-size: 15px;
        }

        .newsTime small {
          display: block;
          color: #708ba3;
          margin-top: 4px;
          font-size: 9px;
        }

        .newsMain {
          min-width: 0;
        }

        .newsMain strong {
          display: block;
          font-size: 13px;
          line-height: 1.8;
        }

        .newsMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 7px;
        }

        .chip {
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.05);
          color: #9eb4c7;
          font-size: 9px;
        }

        .impact {
          justify-self: end;
          min-width: 100px;
          text-align: center;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .impact.high {
          color: #ff8e8e;
          background: rgba(239,68,68,.10);
          border: 1px solid rgba(239,68,68,.20);
        }

        .impact.medium {
          color: #f4c96b;
          background: rgba(234,179,8,.10);
          border: 1px solid rgba(234,179,8,.20);
        }

        .impact.low {
          color: #79d7a4;
          background: rgba(34,197,94,.08);
          border: 1px solid rgba(34,197,94,.16);
        }

        .newsValues {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 5px;
          margin-top: 8px;
        }

        .newsValue {
          padding: 5px 7px;
          border-radius: 7px;
          background: rgba(255,255,255,.025);
          color: #7891a7;
          font-size: 8px;
        }

        .newsValue b {
          display: block;
          color: #c9d7e3;
          margin-top: 3px;
          font-size: 9px;
        }

        .emptyNews {
          padding: 35px 20px;
          text-align: center;
          color: #8299ad;
          font-size: 12px;
          line-height: 2;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 14px;
        }

        .quick {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
        }

        .quick a {
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
        }

        .quick b {
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .quick span {
          font-size: 11px;
          color: #8fa8bf;
          line-height: 1.9;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid rgba(255,255,255,.06);
          font-size: 12px;
        }

        .row:last-child {
          border-bottom: 0;
        }

        .row span {
          color: #8fa8bf;
        }

        .row strong {
          overflow-wrap: anywhere;
          text-align: left;
        }

        .tableWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 520px;
          border-collapse: collapse;
          font-size: 11px;
        }

        th,
        td {
          text-align: right;
          padding: 13px 8px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        th {
          color: #7895ad;
          font-weight: normal;
        }

        .badge {
          padding: 5px 8px;
          border-radius: 99px;
          background: rgba(255,255,255,.05);
          font-size: 10px;
        }

        .empty {
          text-align: center;
          color: #8fa8bf;
          font-size: 12px;
          line-height: 2;
          padding: 25px;
        }

        .note {
          text-align: center;
          color: #58748d;
          font-size: 10px;
          margin: 18px;
        }

        .sideFooter {
          color: #68859d;
          font-size: 10px;
          line-height: 2;
          margin-top: 20px;
          border-top: 1px solid rgba(255,255,255,.06);
          padding-top: 14px;
        }

        @media(max-width:1050px) {
          .stats {
            grid-template-columns: repeat(2,1fr);
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .newsItem {
            grid-template-columns: 70px minmax(0,1fr);
          }

          .impact {
            grid-column: 2;
            justify-self: start;
          }
        }

        @media(max-width:760px) {
          .page {
            padding: 9px;
          }

          .layout {
            display: block;
          }

          .side {
            position: static;
            margin-bottom: 10px;
            padding: 10px;
          }

          .nav {
            display: flex;
            overflow-x: auto;
          }

          .nav a {
            white-space: nowrap;
            flex: 0 0 auto;
          }

          .sideFooter {
            display: none;
          }

          .top {
            align-items: flex-start;
            flex-direction: column;
          }

          .top h1 {
            font-size: 21px;
          }

          .hero {
            padding: 20px 16px;
          }

          .stats {
            gap: 8px;
          }

          .card {
            padding: 14px;
          }

          .value {
            font-size: 22px;
          }

          .quick {
            grid-template-columns: 1fr;
          }

          .btn {
            width: 100%;
          }

          .newsItem {
            grid-template-columns: 62px minmax(0,1fr);
            gap: 10px;
            padding: 13px;
          }

          .newsMain strong {
            font-size: 11px;
          }

          .newsValues {
            grid-template-columns: 1fr;
          }

          .impact {
            grid-column: 2;
          }
        }
      `}</style>

      <div className="layout">
        <aside className="side">
          <div className="logo">
            <div className="logoMark">AI</div>
            <div>
              <strong>Trading AI</strong>
              <small>پلتفرم هوشمند معاملات</small>
            </div>
          </div>

          <nav className="nav">
            <Link className="selected" href="/dashboard">
              ⌂ داشبورد
            </Link>

            <Link href="/market">
              ◈ بازارها
            </Link>

            <Link href="/bots">
              ◉ ربات‌ها
            </Link>

            <Link href="/signals">
              ⌁ سیگنال‌ها
            </Link>

            <Link href="/ai-analysis">
              ✦ تحلیل هوشمند
            </Link>

            <Link href="/news">
              ▤ اخبار
            </Link>

            <Link href="/economic">
              ◷ تقویم اقتصادی
            </Link>

            <Link href="/broker">
              ⇄ بروکر
            </Link>

            <Link href="/payments">
              ▣ پرداخت‌ها
            </Link>

            <Link href="/settings">
              ⚙ تنظیمات
            </Link>

            <Link href="/support">
              ؟ پشتیبانی
            </Link>
          </nav>

          <div className="sideFooter">
            اطلاعات این صفحه از دیتابیس حساب شما خوانده می‌شود.
          </div>
        </aside>

        <section className="content">
          <header className="top">
            <div>
              <h1>داشبورد معاملاتی</h1>
              <div className="muted">
                نمای کلی حساب، بازار، اخبار و معاملات شما
              </div>
            </div>

            <div className="user">
              <div className="avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{user.name}</strong>

                <div className="muted">
                  {user.role === "ADMIN" ? "مدیر سیستم" : "کاربر"} ·{" "}
                  {faPlan[user.plan] ?? user.plan}
                </div>
              </div>
            </div>
          </header>

          <section className="hero">
            <div className="eyebrow">
              ✦ خوش آمدید به Trading AI
            </div>

            <h2>
              {user.name} عزیز، بازار را هوشمندانه دنبال کنید
            </h2>

            <p>
              وضعیت حساب، ربات‌ها، سیگنال‌ها، اخبار اقتصادی و معاملات
              شما در یک نمای واحد نمایش داده می‌شود.
            </p>

            <div className="buttons">
              <Link className="btn primary" href="/ai-analysis">
                شروع تحلیل هوشمند
              </Link>

              <Link className="btn" href="/bots">
                مدیریت ربات‌ها
              </Link>

              <Link className="btn" href="/economic">
                تقویم اقتصادی
              </Link>
            </div>
          </section>

          <div className="heading">
            <h3>نمای کلی حساب</h3>
            <span className="muted">
              اطلاعات واقعی دیتابیس
            </span>
          </div>

          <section className="stats">
            <div className="card">
              <div className="label">کل ربات‌ها</div>
              <div className="value">{bots}</div>
              <div className="foot">
                {activeBots} ربات فعال
              </div>
            </div>

            <div className="card">
              <div className="label">کل سیگنال‌ها</div>
              <div className="value">{signals}</div>
              <div className="foot">
                ثبت‌شده برای شما
              </div>
            </div>

            <div className="card">
              <div className="label">معاملات باز</div>
              <div className="value">{openTrades}</div>
              <div className="foot">
                {allTrades} معامله در مجموع
              </div>
            </div>

            <div className="card">
              <div className="label">پلن حساب</div>
              <div className="value">
                {faPlan[user.plan] ?? user.plan}
              </div>
              <div className="foot">
                سطح دسترسی فعلی
              </div>
            </div>
          </section>

          {/* REAL ECONOMIC NEWS */}

          <div className="heading">
            <h3>اخبار و رویدادهای مهم بازار</h3>
            <span className="muted">
              داده واقعی تقویم اقتصادی
            </span>
          </div>

          <section className="card newsCard">
            <div className="newsHeader">
              <div className="newsTitle">
                <div className="newsIcon">📰</div>

                <div>
                  <h3>Economic Calendar</h3>
                  <span>
                    رویدادهای اقتصادی ثبت‌شده در سیستم
                  </span>
                </div>
              </div>

              <Link className="btn" href="/economic">
                مشاهده تقویم کامل ←
              </Link>
            </div>

            {economicEvents.length === 0 ? (
              <div className="emptyNews">
                <div style={{ fontSize: 28, marginBottom: 8 }}>
                  📭
                </div>

                در حال حاضر رویداد اقتصادی ثبت‌شده‌ای برای نمایش وجود ندارد.
                <br />

                برای دریافت جدیدترین داده‌ها وارد بخش تقویم اقتصادی شوید.
              </div>
            ) : (
              <div className="newsList">
                {economicEvents.map((item) => (
                  <article
                    className="newsItem"
                    key={item.id}
                  >
                    <div className="newsTime">
                      <strong>
                        {timeText(item.eventTime)}
                      </strong>

                      <small>
                        {new Intl.DateTimeFormat("fa-IR", {
                          month: "short",
                          day: "numeric",
                        }).format(item.eventTime)}
                      </small>
                    </div>

                    <div className="newsMain">
                      <strong>
                        {item.event || "Economic Event"}
                      </strong>

                      <div className="newsMeta">
                        {item.currency && (
                          <span className="chip">
                            💱 {item.currency}
                          </span>
                        )}

                        {item.country && (
                          <span className="chip">
                            🌍 {item.country}
                          </span>
                        )}

                        {item.category && (
                          <span className="chip">
                            {item.category}
                          </span>
                        )}

                        {item.status && (
                          <span className="chip">
                            {item.status}
                          </span>
                        )}
                      </div>

                      <div className="newsValues">
                        <div className="newsValue">
                          Previous
                          <b>
                            {item.previous ?? "—"}
                            {item.unit ? ` ${item.unit}` : ""}
                          </b>
                        </div>

                        <div className="newsValue">
                          Forecast
                          <b>
                            {item.forecast ?? "—"}
                            {item.unit ? ` ${item.unit}` : ""}
                          </b>
                        </div>

                        <div className="newsValue">
                          Actual
                          <b>
                            {item.actual ?? "—"}
                            {item.unit ? ` ${item.unit}` : ""}
                          </b>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`impact ${impactClass(
                        item.importance
                      )}`}
                    >
                      {item.importance >= 3
                        ? "🔴"
                        : item.importance >= 2
                        ? "🟠"
                        : "🟢"}{" "}
                      {impactText(item.importance)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="heading">
            <h3>دسترسی سریع</h3>
            <span className="muted">
              مسیرهای واقعی سایت
            </span>
          </div>

          <div className="grid">
            <section className="card">
              <div
                className="heading"
                style={{ marginTop: 0 }}
              >
                <h3>ابزارهای معاملاتی</h3>
              </div>

              <div className="quick">
                <Link href="/market">
                  <b>◈ بازارهای مالی</b>
                  <span>
                    مشاهده بازارها و نمادهای معاملاتی.
                  </span>
                </Link>

                <Link href="/ai-analysis">
                  <b>✦ تحلیل هوشمند</b>
                  <span>
                    بررسی شرایط و داده‌های بازار.
                  </span>
                </Link>

                <Link href="/signals">
                  <b>⌁ سیگنال‌ها</b>
                  <span>
                    مشاهده سیگنال‌های حساب شما.
                  </span>
                </Link>

                <Link href="/economic">
                  <b>◷ تقویم اقتصادی</b>
                  <span>
                    مشاهده رویدادهای واقعی اقتصادی.
                  </span>
                </Link>
              </div>
            </section>

            <section className="card">
              <div
                className="heading"
                style={{ marginTop: 0 }}
              >
                <h3>اطلاعات حساب</h3>
              </div>

              <div className="row">
                <span>نام</span>
                <strong>{user.name}</strong>
              </div>

              <div className="row">
                <span>ایمیل</span>
                <strong>{user.email}</strong>
              </div>

              <div className="row">
                <span>نقش</span>
                <strong>
                  {user.role === "ADMIN"
                    ? "مدیر سیستم"
                    : "کاربر"}
                </strong>
              </div>

              <div className="row">
                <span>تاریخ عضویت</span>
                <strong>
                  {dateText(user.createdAt)}
                </strong>
              </div>

              <div className="buttons">
                <Link
                  className="btn"
                  href="/profile"
                >
                  پروفایل
                </Link>

                <Link
                  className="btn"
                  href="/settings"
                >
                  تنظیمات
                </Link>
              </div>
            </section>
          </div>

          <div className="heading">
            <h3>آخرین معاملات</h3>
            <span className="muted">
              ۵ معامله آخر
            </span>
          </div>

          <section className="card">
            {trades.length === 0 ? (
              <div className="empty">
                هنوز معامله‌ای برای حساب شما ثبت نشده است.
              </div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>نماد</th>
                      <th>جهت</th>
                      <th>وضعیت</th>
                      <th>منبع</th>
                      <th>سود/زیان</th>
                      <th>زمان</th>
                    </tr>
                  </thead>

                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id}>
                        <td>{trade.symbol}</td>

                        <td>{trade.direction}</td>

                        <td>
                          <span className="badge">
                            {faStatus[trade.status] ??
                              trade.status}
                          </span>
                        </td>

                        <td>{trade.source}</td>

                        <td>
                          {trade.profitLoss == null
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

          <div className="note">
            داده‌های اخبار و رویدادهای اقتصادی این صفحه از دیتابیس
            سیستم خوانده می‌شوند و داده ساختگی تولید نمی‌شود.
          </div>
        </section>
      </div>
    </main>
  );
}
