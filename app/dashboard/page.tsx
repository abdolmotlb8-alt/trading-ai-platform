import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const nf = (n: number) =>
  new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(n);

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
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
    bots,
    activeBots,
    openTrades,
    signals,
    closedTrades,
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

    prisma.trade.count({
      where: {
        userId: user.id,
        status: "OPEN",
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
      },
    }),

    prisma.trade.findMany({
      where: {
        userId: user.id,
        status: "CLOSED",
        profitLoss: {
          not: null,
        },
      },
      select: {
        profitLoss: true,
      },
    }),
  ]);

  const pnl = closedTrades.reduce(
    (sum, trade) => sum + (trade.profitLoss ?? 0),
    0
  );

  const formattedJoinDate = new Intl.DateTimeFormat("fa-IR").format(
    user.createdAt
  );

  return (
    <main dir="rtl" className="ta">
      <style>{css}</style>

      <div className="shell">
        <aside className="side">
          <Link href="/" className="brand">
            <b>AI</b>

            <span>
              <strong>Trading AI</strong>
              <small>Smart Trading Platform</small>
            </span>
          </Link>

          <p className="caption">منوی اصلی</p>

          <nav>
            {[
              ["/dashboard", "⌂", "داشبورد"],
              ["/market", "▦", "بازار و نمودار"],
              ["/bots", "◈", "ربات‌های معاملاتی"],
              ["/ai-analysis", "✦", "تحلیل هوشمند AI"],
              ["/news", "▤", "اخبار بازار"],
              ["/broker", "⌘", "اتصال بروکر"],
              ["/economic", "◎", "تقویم اقتصادی"],
              ["/courses", "▣", "آموزش"],
              ["/payments", "▤", "کیف پول و پرداخت"],
              ["/support", "◉", "پشتیبانی"],
              ["/settings", "⚙", "تنظیمات"],
            ].map(([href, icon, label]) => (
              <Link
                key={href}
                href={href}
                className={href === "/dashboard" ? "active" : ""}
              >
                <i>{icon}</i>
                {label}
              </Link>
            ))}
          </nav>

          <div className="help">
            <strong>مرکز پشتیبانی</strong>

            <p>
              برای دریافت راهنمایی و حل مشکلات خود
              با تیم پشتیبانی در ارتباط باشید.
            </p>

            <Link href="/support" className="btn">
              ورود به پشتیبانی
            </Link>
          </div>
        </aside>

        <section className="content">
          <header className="top">
            <div>
              <strong>داشبورد Trading AI</strong>
              <small>
                مرکز مدیریت حساب و ابزارهای معاملاتی
              </small>
            </div>

            <Link href="/settings" className="avatar">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </Link>
          </header>

          <section className="hero">
            <span>✦ حساب شما فعال است</span>

            <h1>سلام {user.name} 👋</h1>

            <p>
              به پنل حرفه‌ای Trading AI خوش آمدید.
              وضعیت ربات‌ها، سیگنال‌ها، معاملات و
              ابزارهای معاملاتی خود را از اینجا مدیریت کنید.
            </p>

            <div className="actions">
              <Link href="/ai-analysis" className="btn">
                شروع تحلیل هوشمند
              </Link>

              <Link href="/bots" className="btn ghost">
                مدیریت ربات‌ها
              </Link>

              <Link href="/settings" className="btn ghost">
                تنظیمات حساب
              </Link>

              <Link href="/market" className="btn ghost">
                مشاهده بازار
              </Link>
            </div>
          </section>

          <section className="stats">
            <Card
              icon="✓"
              label="وضعیت حساب"
              value="فعال"
              color="green"
            />

            <Card
              icon="◆"
              label="پلن فعلی"
              value={user.plan}
              color="cyan"
            />

            <Card
              icon="◈"
              label="ربات‌های فعال"
              value={`${nf(activeBots)} / ${nf(bots)}`}
            />

            <Card
              icon="↗"
              label="سود/زیان ثبت‌شده"
              value={nf(pnl)}
              color={pnl >= 0 ? "green" : "amber"}
            />
          </section>

          <section className="mini-stats">
            <div>
              <span>معاملات باز</span>
              <strong>{nf(openTrades)}</strong>
            </div>

            <div>
              <span>سیگنال‌های ثبت‌شده</span>
              <strong>{nf(signals)}</strong>
            </div>

            <div>
              <span>ربات‌های ثبت‌شده</span>
              <strong>{nf(bots)}</strong>
            </div>

            <div>
              <span>سطح دسترسی</span>
              <strong>{user.role}</strong>
            </div>
          </section>

          <h2>دسترسی سریع</h2>

          <p className="muted">
            ابزارهای اصلی پلتفرم را با یک کلیک باز کنید.
          </p>

          <section className="cards">
            <Quick
              href="/market"
              icon="▦"
              title="بازار و نمودار"
              text="مشاهده بازارها، قیمت‌ها و نمودارهای معاملاتی"
              foot="ورود به بازار ←"
            />

            <Quick
              href="/bots"
              icon="◈"
              title="ربات‌های معاملاتی"
              text="ساخت، پیکربندی و مدیریت ربات‌های هوشمند"
              foot={`${nf(bots)} ربات ثبت شده ←`}
            />

            <Quick
              href="/ai-analysis"
              icon="✦"
              title="تحلیل هوشمند AI"
              text="بررسی ساختار بازار و دریافت تحلیل‌های هوشمند"
              foot={`${nf(signals)} سیگنال ثبت شده ←`}
            />

            <Quick
              href="/news"
              icon="▤"
              title="اخبار بازار"
              text="پیگیری اخبار اقتصادی و رویدادهای مهم بازار"
              foot="مشاهده اخبار ←"
            />

            <Quick
              href="/economic"
              icon="◎"
              title="تقویم اقتصادی"
              text="بررسی رویدادهای اقتصادی و اخبار تأثیرگذار"
              foot="مشاهده تقویم ←"
            />

            <Quick
              href="/broker"
              icon="⌘"
              title="اتصال بروکر"
              text="مدیریت و بررسی وضعیت اتصال حساب معاملاتی"
              foot="مدیریت بروکر ←"
            />

            <Quick
              href="/payments"
              icon="▤"
              title="کیف پول و پرداخت"
              text="مدیریت پلن، پرداخت‌ها و وضعیت اشتراک"
              foot="مشاهده پرداخت‌ها ←"
            />

            <Quick
              href="/settings"
              icon="⚙"
              title="تنظیمات پیشرفته"
              text="مدیریت اطلاعات حساب، امنیت و تنظیمات شخصی"
              foot="باز کردن تنظیمات ←"
            />
          </section>

          <section className="lower">
            <Panel title="اطلاعات حساب">
              <div className="account">
                <div>
                  <small>نام کاربر</small>
                  <strong>{user.name}</strong>
                </div>

                <div>
                  <small>ایمیل</small>
                  <strong>{user.email}</strong>
                </div>

                <div>
                  <small>نوع حساب</small>
                  <strong>{user.plan}</strong>
                </div>

                <div>
                  <small>سطح دسترسی</small>
                  <strong>{user.role}</strong>
                </div>

                <div>
                  <small>معاملات باز</small>
                  <strong>{nf(openTrades)}</strong>
                </div>

                <div>
                  <small>تاریخ عضویت</small>
                  <strong>{formattedJoinDate}</strong>
                </div>
              </div>

              <div className="panel-actions">
                <Link href="/settings" className="btn">
                  ویرایش حساب
                </Link>

                <Link href="/support" className="btn ghost">
                  تماس با پشتیبانی
                </Link>
              </div>
            </Panel>

            <Panel title="وضعیت امکانات">
              <div className="features">
                <Feature
                  icon="📈"
                  title="بازار و داده‌ها"
                  text="قابل استفاده از مسیر بازار"
                />

                <Feature
                  icon="◈"
                  title="ربات‌های معاملاتی"
                  text={`${nf(activeBots)} ربات فعال`}
                />

                <Feature
                  icon="✦"
                  title="تحلیل هوشمند AI"
                  text={`${nf(signals)} سیگنال ثبت‌شده`}
                />

                <Feature
                  icon="⌘"
                  title="اتصال بروکر"
                  text="نیازمند پیاده‌سازی اتصال اختصاصی"
                />

                <Feature
                  icon="🔐"
                  title="امنیت حساب"
                  text="مدیریت رمز عبور از تنظیمات"
                />
              </div>
            </Panel>
          </section>

          <section className="info-section">
            <div className="info-header">
              <div>
                <h2>راهنمای سریع</h2>
                <p>
                  برای شروع کار با امکانات Trading AI
                  یکی از گزینه‌های زیر را انتخاب کنید.
                </p>
              </div>

              <span className="live-badge">
                سیستم آنلاین
              </span>
            </div>

            <div className="info-grid">
              <Link href="/bots" className="info-card">
                <strong>🤖 مدیریت ربات‌ها</strong>
                <span>
                  مشاهده، ایجاد و مدیریت ربات‌های معاملاتی
                </span>
              </Link>

              <Link href="/broker" className="info-card">
                <strong>🔗 اتصال بروکر</strong>
                <span>
                  مدیریت اتصال حساب معاملاتی
                </span>
              </Link>

              <Link href="/support" className="info-card">
                <strong>🎧 پشتیبانی</strong>
                <span>
                  ارسال درخواست و دریافت راهنمایی
                </span>
              </Link>

              <Link href="/settings" className="info-card">
                <strong>⚙ تنظیمات پیشرفته</strong>
                <span>
                  تنظیمات امنیتی و شخصی حساب
                </span>
              </Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Card({
  icon,
  label,
  value,
  color = "",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="stat">
      <b>{icon}</b>
      <small>{label}</small>
      <strong className={color}>{value}</strong>
    </div>
  );
}

function Quick({
  href,
  icon,
  title,
  text,
  foot,
}: {
  href: string;
  icon: string;
  title: string;
  text: string;
  foot: string;
}) {
  return (
    <Link href={href} className="quick">
      <b>{icon}</b>
      <h3>{title}</h3>
      <p>{text}</p>
      <strong>{foot}</strong>
    </Link>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="feature">
      <b>{icon}</b>

      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}

const css = `
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: #050b16;
}

a {
  text-decoration: none;
}

.ta {
  min-height: 100vh;
  padding: 22px;
  color: #f8fafc;
  font-family: Tahoma, Arial, sans-serif;
  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(8, 145, 178, .14),
      transparent 30%
    ),
    radial-gradient(
      circle at 0% 100%,
      rgba(79, 70, 229, .12),
      transparent 30%
    ),
    #050b16;
}

.shell {
  width: min(1540px, 100%);
  margin: auto;
  display: grid;
  grid-template-columns: 255px minmax(0, 1fr);
  gap: 20px;
  direction: ltr;
}

.side,
.content {
  direction: rtl;
}

.side {
  position: sticky;
  top: 22px;
  height: calc(100vh - 44px);
  overflow-y: auto;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, .14);
  border-radius: 28px;
  background:
    linear-gradient(
      145deg,
      rgba(15, 31, 51, .97),
      rgba(5, 15, 29, .97)
    );
  box-shadow:
    0 25px 80px rgba(0, 0, 0, .28),
    inset 0 1px 0 rgba(255, 255, 255, .03);
  backdrop-filter: blur(24px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  color: white;
  border-bottom: 1px solid rgba(148, 163, 184, .13);
}

.brand b {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 15px;
  color: white;
  background:
    linear-gradient(135deg, #06b6d4, #4f46e5);
  box-shadow:
    0 12px 30px rgba(6, 182, 212, .22);
}

.brand strong {
  display: block;
  font-size: 15px;
}

.brand small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 10px;
}

.caption {
  margin: 25px 8px 11px;
  color: #64748b;
  font-size: 10px;
  font-weight: bold;
}

.side nav {
  display: grid;
  gap: 6px;
}

.side nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: bold;
  transition:
    transform .2s ease,
    background .2s ease,
    color .2s ease,
    border-color .2s ease;
}

.side nav a:hover {
  color: white;
  background: rgba(34, 211, 238, .06);
  border-color: rgba(34, 211, 238, .13);
  transform: translateX(-3px);
}

.side nav a.active {
  color: #67e8f9;
  background:
    linear-gradient(
      135deg,
      rgba(6, 182, 212, .14),
      rgba(79, 70, 229, .12)
    );
  border-color: rgba(34, 211, 238, .25);
  box-shadow: 0 8px 25px rgba(6, 182, 212, .07);
}

.side nav i {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  border-radius: 9px;
  color: #67e8f9;
  background: rgba(255, 255, 255, .04);
  font-style: normal;
}

.help {
  margin-top: 22px;
  padding: 16px;
  border: 1px solid rgba(34, 211, 238, .16);
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      rgba(8, 145, 178, .15),
      rgba(79, 70, 229, .09)
    );
}

.help strong {
  font-size: 12px;
}

.help p {
  color: #94a3b8;
  font-size: 10px;
  line-height: 2;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 11px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: white;
  background:
    linear-gradient(135deg, #0891b2, #4f46e5);
  font-size: 11px;
  font-weight: bold;
  transition:
    transform .2s ease,
    box-shadow .2s ease,
    opacity .2s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(6, 182, 212, .16);
}

.btn.ghost {
  color: #cbd5e1;
  border-color: rgba(255, 255, 255, .1);
  background: rgba(255, 255, 255, .04);
}

.content {
  min-width: 0;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 17px 20px;
  border: 1px solid rgba(148, 163, 184, .14);
  border-radius: 22px;
  background: rgba(8, 18, 33, .9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025);
  backdrop-filter: blur(24px);
}

.top strong {
  display: block;
  font-size: 20px;
}

.top small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 10px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid rgba(103, 232, 249, .15);
  border-radius: 14px;
  color: white;
  background:
    linear-gradient(135deg, #0e7490, #4338ca);
  font-weight: bold;
  box-shadow: 0 8px 25px rgba(30, 64, 175, .2);
}

.hero {
  position: relative;
  overflow: hidden;
  margin-top: 18px;
  padding: 30px;
  border: 1px solid rgba(34, 211, 238, .2);
  border-radius: 28px;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(6, 182, 212, .1),
      transparent 35%
    ),
    linear-gradient(
      135deg,
      rgba(8, 47, 73, .9),
      rgba(8, 18, 33, .97)
    );
  box-shadow:
    0 25px 80px rgba(0, 0, 0, .16),
    inset 0 1px 0 rgba(255, 255, 255, .03);
}

.hero::before {
  content: "";
  position: absolute;
  width: 280px;
  height: 280px;
  left: -140px;
  top: -150px;
  border-radius: 50%;
  background: rgba(34, 211, 238, .08);
  filter: blur(25px);
}

.hero > * {
  position: relative;
  z-index: 1;
}

.hero > span {
  display: inline-flex;
  padding: 8px 12px;
  border: 1px solid rgba(34, 211, 238, .16);
  border-radius: 999px;
  color: #67e8f9;
  background: rgba(34, 211, 238, .07);
  font-size: 10px;
  font-weight: bold;
}

.hero h1 {
  margin: 18px 0 10px;
  color: #f8fafc;
  font-size: clamp(25px, 3vw, 39px);
  line-height: 1.5;
}

.hero p {
  max-width: 800px;
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 2.1;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.stat {
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, .13);
  border-radius: 20px;
  background: rgba(8, 18, 33, .9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025);
  transition:
    transform .2s ease,
    border-color .2s ease;
}

.stat:hover {
  transform: translateY(-3px);
  border-color: rgba(34, 211, 238, .22);
}

.stat > b {
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  border-radius: 13px;
  color: #67e8f9;
  background: rgba(34, 211, 238, .08);
  font-size: 20px;
}

.stat small {
  display: block;
  margin-top: 15px;
  color: #64748b;
  font-size: 10px;
}

.stat > strong {
  display: block;
  margin-top: 8px;
  overflow-wrap: anywhere;
  font-size: 22px;
}

.green {
  color: #4ade80;
}

.cyan {
  color: #22d3ee;
}

.amber {
  color: #fbbf24;
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.mini-stats > div {
  padding: 15px;
  border: 1px solid rgba(148, 163, 184, .1);
  border-radius: 16px;
  background: rgba(255, 255, 255, .025);
}

.mini-stats span {
  display: block;
  color: #64748b;
  font-size: 10px;
}

.mini-stats strong {
  display: block;
  margin-top: 8px;
  color: #e2e8f0;
  font-size: 15px;
}

h2 {
  margin: 28px 2px 7px;
  color: #f8fafc;
  font-size: 17px;
}

.muted {
  margin: 0;
  color: #64748b;
  font-size: 11px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.quick {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 215px;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, .13);
  border-radius: 20px;
  color: white;
  background: rgba(8, 18, 33, .9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025);
  transition:
    transform .2s ease,
    border-color .2s ease,
    background .2s ease;
}

.quick:hover {
  transform: translateY(-4px);
  border-color: rgba(34, 211, 238, .32);
  background: rgba(11, 28, 47, .98);
}

.quick > b {
  display: grid;
  place-items: center;
  width: 47px;
  height: 47px;
  border-radius: 15px;
  color: #67e8f9;
  background: rgba(34, 211, 238, .08);
  font-size: 21px;
}

.quick h3 {
  margin: 17px 0 8px;
  font-size: 14px;
  line-height: 1.6;
}

.quick p {
  margin: 0;
  color: #718198;
  font-size: 10px;
  line-height: 2;
}

.quick > strong {
  margin-top: auto;
  padding-top: 18px;
  color: #67e8f9;
  font-size: 10px;
}

.lower {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 14px;
  margin-top: 18px;
}

.panel {
  min-width: 0;
  padding: 22px;
  border: 1px solid rgba(148, 163, 184, .13);
  border-radius: 22px;
  background: rgba(8, 18, 33, .9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025);
}

.panel h2 {
  margin: 0 0 17px;
  font-size: 16px;
}

.account {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.account div {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 14px;
  background: rgba(255, 255, 255, .025);
}

.account small,
.feature small {
  display: block;
  color: #64748b;
  font-size: 9px;
}

.account strong {
  display: block;
  margin-top: 8px;
  overflow-wrap: anywhere;
  color: #e2e8f0;
  font-size: 12px;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.features {
  display: grid;
  gap: 10px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, .06);
  border-radius: 14px;
  background: rgba(255, 255, 255, .025);
}

.feature > b {
  font-size: 18px;
}

.feature strong {
  display: block;
  font-size: 11px;
}

.feature small {
  margin-top: 4px;
  line-height: 1.8;
}

.info-section {
  margin-top: 18px;
  padding: 22px;
  border: 1px solid rgba(34, 211, 238, .14);
  border-radius: 22px;
  background:
    linear-gradient(
      135deg,
      rgba(6, 182, 212, .07),
      rgba(79, 70, 229, .05)
    );
}

.info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.info-header h2 {
  margin: 0;
}

.info-header p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 10px;
  line-height: 2;
}

.live-badge {
  flex-shrink: 0;
  padding: 8px 11px;
  border: 1px solid rgba(34, 197, 94, .15);
  border-radius: 10px;
  color: #86efac;
  background: rgba(34, 197, 94, .07);
  font-size: 9px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.info-card {
  min-width: 0;
  padding: 15px;
  border: 1px solid rgba(148, 163, 184, .08);
  border-radius: 15px;
  color: white;
  background: rgba(5, 15, 28, .65);
  transition:
    transform .2s ease,
    border-color .2s ease;
}

.info-card:hover {
  transform: translateY(-3px);
  border-color: rgba(34, 211, 238, .25);
}

.info-card strong {
  display: block;
  font-size: 11px;
}

.info-card span {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 9px;
  line-height: 1.9;
}

@media (max-width: 1250px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1150px) {
  .shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .stats,
  .mini-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lower {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .ta {
    padding: 10px;
  }

  .shell {
    display: block;
  }

  .side {
    display: none;
  }

  .top {
    padding: 15px;
    border-radius: 18px;
  }

  .top strong {
    font-size: 16px;
  }

  .hero {
    padding: 23px;
    border-radius: 22px;
  }

  .hero h1 {
    font-size: 26px;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .actions .btn {
    width: 100%;
  }

  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .stats,
  .mini-stats,
  .cards,
  .account,
  .info-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    grid-template-columns: 1fr;
  }

  .hero h1 {
    font-size: 23px;
  }

  .hero p {
    font-size: 11px;
  }

  .stat {
    padding: 18px;
  }

  .panel,
  .info-section {
    padding: 17px;
  }

  .info-header {
    flex-direction: column;
  }

  .live-badge {
    align-self: flex-start;
  }
}
`;
