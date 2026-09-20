import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

type IconName =
  | "user"
  | "shield"
  | "bell"
  | "plug"
  | "save"
  | "lock"
  | "logout"
  | "settings"
  | "mail"
  | "activity"
  | "chart"
  | "bot"
  | "news"
  | "wallet"
  | "support"
  | "check"
  | "arrow";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, ReactNode> = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1-4 3.5-6 8-6s7 2 8 6" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    plug: (
      <>
        <path d="m8 12 8-8" />
        <path d="m6 14-2 2a4 4 0 0 0 6 6l2-2" />
        <path d="m18 10 2-2a4 4 0 0 0-6-6l-2 2" />
      </>
    ),

    save: (
      <>
        <path d="M5 3h12l4 4v14H3V3h14" />
        <path d="M7 3v6h10V3M7 21v-8h10v8" />
      </>
    ),

    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M13 4h6v16h-6" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V22h-2.6v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6h-.2a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),

    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),

    activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,

    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 4-5 3 3 5-7" />
      </>
    ),

    bot: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
      </>
    ),

    news: (
      <>
        <path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" />
      </>
    ),

    wallet: (
      <>
        <path d="M4 7h16v13H4zM4 7V4h13v3" />
        <path d="M16 13h4" />
      </>
    ),

    support: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0v5H4z" />
        <path d="M4 15H2v-2M20 15h2v-2M9 21h6" />
      </>
    ),

    check: <path d="m5 12 4 4L19 6" />,

    arrow: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const navigation = [
  ["/dashboard", "داشبورد", "activity"],
  ["/market", "بازار و نمودار", "chart"],
  ["/bots", "ربات‌های معاملاتی", "bot"],
  ["/ai-analysis", "تحلیل هوشمند AI", "activity"],
  ["/news", "اخبار بازار", "news"],
  ["/broker", "اتصال بروکر", "plug"],
  ["/economic", "تقویم اقتصادی", "activity"],
  ["/payments", "کیف پول و پرداخت", "wallet"],
  ["/support", "پشتیبانی", "support"],
  ["/settings", "تنظیمات", "settings"],
] as const;

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
    },
    include: {
      newsSetting: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  async function updateProfile(formData: FormData) {
    "use server";

    const activeUser = await getCurrentUser();

    if (!activeUser) {
      redirect("/login");
    }

    const name = String(formData.get("name") ?? "").trim();

    if (name.length < 2 || name.length > 80) {
      redirect("/settings?error=name");
    }

    await prisma.user.update({
      where: {
        id: activeUser.id,
      },
      data: {
        name,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    redirect("/settings?saved=profile");
  }

  async function updateNotifications(formData: FormData) {
    "use server";

    const activeUser = await getCurrentUser();

    if (!activeUser) {
      redirect("/login");
    }

    const value = (key: string) => {
      return formData.get(key) === "on";
    };

    await prisma.newsSetting.upsert({
      where: {
        userId: activeUser.id,
      },

      create: {
        userId: activeUser.id,
        highImpact: value("highImpact"),
        mediumImpact: value("mediumImpact"),
        lowImpact: value("lowImpact"),
        telegramEnabled: value("telegramEnabled"),
        newsFilterEnabled: value("newsFilterEnabled"),
        marketRiskEnabled: value("marketRiskEnabled"),
      },

      update: {
        highImpact: value("highImpact"),
        mediumImpact: value("mediumImpact"),
        lowImpact: value("lowImpact"),
        telegramEnabled: value("telegramEnabled"),
        newsFilterEnabled: value("newsFilterEnabled"),
        marketRiskEnabled: value("marketRiskEnabled"),
      },
    });

    revalidatePath("/settings");

    redirect("/settings?saved=notifications");
  }

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const settings = user.newsSetting;

  return (
    <main dir="rtl" className="settings-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        :root {
          color-scheme: dark;
        }

        .settings-page {
          min-height: 100vh;
          padding: 20px;
          color: #edf6ff;
          background:
            radial-gradient(
              circle at 85% 0%,
              #123d5c 0,
              transparent 28%
            ),
            radial-gradient(
              circle at 0% 80%,
              #24245b 0,
              transparent 30%
            ),
            #050b17;
          font-family: Tahoma, Arial, sans-serif;
        }

        .shell {
          width: min(1500px, 100%);
          margin: auto;
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 20px;
          direction: ltr;
        }

        .sidebar,
        .content {
          direction: rtl;
          min-width: 0;
        }

        .sidebar,
        .topbar,
        .hero,
        .panel,
        .footer-note {
          border: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(7, 18, 34, 0.76);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(22px);
        }

        .sidebar {
          height: max-content;
          position: sticky;
          top: 20px;
          padding: 19px;
          border-radius: 27px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          padding: 3px 3px 21px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.13);
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          font-weight: 900;
          background: linear-gradient(135deg, #06b6d4, #6366f1);
          box-shadow: 0 12px 35px #0891b233;
        }

        .brand strong {
          font-size: 17px;
        }

        .brand small {
          display: block;
          margin-top: 5px;
          color: #71839b;
          font-size: 10px;
        }

        .nav-title {
          margin: 25px 8px 12px;
          color: #60748d;
          font-size: 10px;
          font-weight: 900;
        }

        .nav {
          display: grid;
          gap: 6px;
        }

        .nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 45px;
          padding: 0 11px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: #90a4bc;
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
          transition: 0.2s;
        }

        .nav a:hover,
        .nav a.active {
          color: #7dd3fc;
          background: linear-gradient(
            135deg,
            #0e74901c,
            #4f46e51c
          );
          border-color: #38bdf82b;
        }

        .nav a svg {
          flex: none;
        }

        .side-card {
          margin-top: 24px;
          padding: 15px;
          border: 1px solid #38bdf821;
          border-radius: 18px;
          background: linear-gradient(
            135deg,
            #0891b01b,
            #4f46e51a
          );
        }

        .side-card strong {
          font-size: 12px;
        }

        .side-card p {
          color: #7f93ab;
          font-size: 10px;
          line-height: 2;
          margin: 9px 0 13px;
        }

        .side-card a {
          display: block;
          padding: 10px;
          border: 1px solid #38bdf82b;
          border-radius: 11px;
          color: #7dd3fc;
          text-align: center;
          text-decoration: none;
          font-size: 10px;
          font-weight: 800;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 22px;
          border-radius: 23px;
        }

        .eyebrow {
          color: #67e8f9;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .topbar h1 {
          margin: 8px 0 0;
          font-size: clamp(24px, 3vw, 36px);
        }

        .topbar p {
          margin: 7px 0 0;
          color: #7f95ae;
          font-size: 11px;
          line-height: 1.9;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .top-actions a {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 13px;
          border: 1px solid #94a3b824;
          border-radius: 12px;
          color: #c4d2e1;
          text-decoration: none;
          font-size: 10px;
          font-weight: 800;
        }

        .avatar {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 15px;
          background: linear-gradient(135deg, #0e7490, #4f46e5);
          font-weight: 900;
        }

        .hero {
          position: relative;
          overflow: hidden;
          margin-top: 18px;
          padding: 27px;
          border-radius: 26px;
          background: linear-gradient(
            135deg,
            #08304acc,
            #071322e8
          );
        }

        .hero::after {
          content: "";
          position: absolute;
          left: -80px;
          top: -130px;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: #22d3ee12;
          filter: blur(20px);
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .hero h2 {
          margin: 13px 0 8px;
          font-size: clamp(22px, 3vw, 33px);
        }

        .hero p {
          max-width: 760px;
          margin: 0;
          color: #9bb0c5;
          font-size: 12px;
          line-height: 2.2;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
          margin-top: 18px;
        }

        .metric {
          padding: 16px;
          border-radius: 18px;
          background: #ffffff05;
          border: 1px solid #94a3b817;
        }

        .metric-label {
          color: #71859d;
          font-size: 10px;
        }

        .metric-value {
          margin-top: 8px;
          font-size: 19px;
          font-weight: 900;
        }

        .cyan {
          color: #67e8f9;
        }

        .green {
          color: #86efac;
        }

        .violet {
          color: #c4b5fd;
        }

        .columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
        }

        .panel {
          padding: 22px;
          margin-bottom: 18px;
          border-radius: 23px;
        }

        .panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .heading {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .heading-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          flex: none;
          border-radius: 14px;
          color: #67e8f9;
          background: #22d3ee12;
          border: 1px solid #22d3ee20;
        }

        .heading h3 {
          margin: 0;
          font-size: 15px;
        }

        .heading p {
          margin: 6px 0 0;
          color: #70859e;
          font-size: 10px;
          line-height: 1.8;
        }

        .badge {
          padding: 7px 10px;
          border: 1px solid #22d3ee24;
          border-radius: 999px;
          color: #67e8f9;
          background: #22d3ee0b;
          font-size: 9px;
          white-space: nowrap;
        }

        .field {
          margin-top: 14px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          color: #a9bdd0;
          font-size: 10px;
          font-weight: 800;
        }

        .field input {
          width: 100%;
          padding: 13px 14px;
          border: 1px solid #94a3b824;
          border-radius: 13px;
          outline: none;
          background: #02081799;
          color: #f8fafc;
          font: inherit;
          font-size: 11px;
          transition: 0.2s;
        }

        .field input:focus {
          border-color: #22d3ee88;
          box-shadow: 0 0 0 3px #22d3ee0d;
        }

        .field input[readonly] {
          color: #8196ad;
          cursor: not-allowed;
        }

        .note {
          margin: 13px 0;
          color: #647b95;
          font-size: 10px;
          line-height: 2;
        }

        .primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          margin-top: 16px;
          padding: 13px;
          border: 1px solid #22d3ee40;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #0891b0,
            #4338ca
          );
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 12px 30px #0891b01c;
        }

        .primary:hover {
          filter: brightness(1.1);
        }

        .switch-list {
          display: grid;
          gap: 9px;
        }

        .switch-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border: 1px solid #94a3b812;
          border-radius: 15px;
          background: #ffffff04;
        }

        .switch-row input {
          width: 17px;
          height: 17px;
          flex: none;
          accent-color: #06b6d4;
        }

        .switch-row label {
          cursor: pointer;
        }

        .switch-row strong {
          display: block;
          font-size: 11px;
        }

        .switch-row span {
          display: block;
          margin-top: 5px;
          color: #71859d;
          font-size: 9px;
          line-height: 1.8;
        }

        .link-list {
          display: grid;
          gap: 10px;
        }

        .service-link {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border: 1px solid #94a3b817;
          border-radius: 15px;
          background: #ffffff04;
          color: #eef6ff;
          text-decoration: none;
          transition: 0.2s;
        }

        .service-link:hover {
          border-color: #22d3ee4c;
          transform: translateY(-2px);
        }

        .service-icon {
          display: grid;
          place-items: center;
          width: 39px;
          height: 39px;
          flex: none;
          border-radius: 12px;
          background: #22d3ee0d;
          color: #67e8f9;
        }

        .service-copy {
          min-width: 0;
          flex: 1;
        }

        .service-copy strong {
          display: block;
          font-size: 11px;
        }

        .service-copy span {
          display: block;
          margin-top: 5px;
          color: #71859d;
          font-size: 9px;
        }

        .service-link > svg {
          color: #71859d;
          transform: rotate(180deg);
        }

        .footer-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
          padding: 15px 18px;
          border-radius: 17px;
          color: #7890a9;
          font-size: 10px;
          line-height: 2;
        }

        .footer-note svg {
          color: #4ade80;
          flex: none;
        }

        @media (max-width: 1100px) {
          .shell {
            grid-template-columns: 220px minmax(0, 1fr);
          }

          .columns {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 780px) {
          .settings-page {
            padding: 10px;
          }

          .shell {
            display: block;
          }

          .sidebar {
            display: none;
          }

          .topbar {
            padding: 15px;
            border-radius: 18px;
          }

          .top-actions a {
            display: none;
          }

          .avatar {
            width: 40px;
            height: 40px;
          }

          .hero {
            padding: 22px;
            border-radius: 20px;
          }

          .metrics {
            grid-template-columns: 1fr;
          }

          .panel {
            padding: 17px;
            border-radius: 19px;
          }

          .columns {
            gap: 0;
            margin-top: 14px;
          }

          .topbar h1 {
            font-size: 24px;
          }

          .hero h2 {
            font-size: 24px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="shell">
        <aside className="sidebar">
          <Link href="/" className="brand">
            <div className="brand-mark">AI</div>

            <div>
              <strong>Trading AI</strong>
              <small>Smart Trading Platform</small>
            </div>
          </Link>

          <div className="nav-title">منوی اصلی</div>

          <nav className="nav">
            {navigation.map(([href, label, icon]) => (
              <Link
                key={href}
                href={href}
                className={href === "/settings" ? "active" : ""}
              >
                <Icon name={icon as IconName} size={17} />
                {label}
              </Link>
            ))}
          </nav>

          <div className="side-card">
            <strong>مرکز پشتیبانی</strong>

            <p>
              برای دریافت راهنمایی یا ثبت درخواست،
              وارد مرکز پشتیبانی شوید.
            </p>

            <Link href="/support">
              ورود به پشتیبانی
            </Link>
          </div>
        </aside>

        <section className="content">
          <header className="topbar">
            <div>
              <div className="eyebrow">
                ACCOUNT CONTROL CENTER
              </div>

              <h1>تنظیمات حساب</h1>

              <p>
                مدیریت امن و حرفه‌ای پروفایل، اعلان‌ها
                و سرویس‌های Trading AI
              </p>
            </div>

            <div className="top-actions">
              <Link href="/dashboard">
                بازگشت به داشبورد
                <Icon name="arrow" size={14} />
              </Link>

              <div className="avatar">
                {initials}
              </div>
            </div>
          </header>

          <section className="hero">
            <div className="hero-content">
              <div className="eyebrow">
                PERSONAL WORKSPACE
              </div>

              <h2>
                همه‌چیز تحت کنترل شماست ✦
              </h2>

              <p>
                اطلاعات حساب و تنظیمات اعلان‌ها را
                از یک پنل مدرن مدیریت کنید. تغییرات
                فرم‌ها مستقیماً در پایگاه داده Prisma
                ذخیره می‌شوند.
              </p>
            </div>
          </section>

          <section className="metrics">
            <div className="metric">
              <div className="metric-label">
                وضعیت حساب
              </div>

              <div className="metric-value green">
                فعال
              </div>
            </div>

            <div className="metric">
              <div className="metric-label">
                پلن فعلی
              </div>

              <div className="metric-value cyan">
                {user.plan}
              </div>
            </div>

            <div className="metric">
              <div className="metric-label">
                سطح دسترسی
              </div>

              <div className="metric-value violet">
                {user.role}
              </div>
            </div>
          </section>

          <div className="columns">
            <div>
              <form
                action={updateProfile}
                className="panel"
              >
                <div className="panel-head">
                  <div className="heading">
                    <div className="heading-icon">
                      <Icon name="user" />
                    </div>

                    <div>
                      <h3>پروفایل کاربری</h3>

                      <p>
                        اطلاعات قابل ویرایش حساب
                      </p>
                    </div>
                  </div>

                  <span className="badge">
                    قابل ذخیره
                  </span>
                </div>

                <div className="field">
                  <label htmlFor="name">
                    نام نمایشی
                  </label>

                  <input
                    id="name"
                    name="name"
                    defaultValue={user.name}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="email">
                    ایمیل حساب
                  </label>

                  <input
                    id="email"
                    value={user.email}
                    readOnly
                  />
                </div>

                <div className="field">
                  <label htmlFor="role">
                    سطح دسترسی
                  </label>

                  <input
                    id="role"
                    value={user.role}
                    readOnly
                  />
                </div>

                <div className="field">
                  <label htmlFor="plan">
                    پلن فعلی
                  </label>

                  <input
                    id="plan"
                    value={user.plan}
                    readOnly
                  />
                </div>

                <p className="note">
                  ایمیل، نقش و پلن فقط از دیتابیس
                  خوانده می‌شوند و در این صفحه
                  قابل تغییر نیستند.
                </p>

                <button
                  className="primary"
                  type="submit"
                >
                  <Icon name="save" size={16} />
                  ذخیره پروفایل
                </button>
              </form>

              <section className="panel">
                <div className="panel-head">
                  <div className="heading">
                    <div className="heading-icon">
                      <Icon name="shield" />
                    </div>

                    <div>
                      <h3>امنیت حساب</h3>

                      <p>
                        دسترسی سریع به ابزارهای امنیتی
                      </p>
                    </div>
                  </div>
                </div>

                <div className="link-list">
                  <Link
                    href="/settings/security"
                    className="service-link"
                  >
                    <div className="service-icon">
                      <Icon name="lock" size={18} />
                    </div>

                    <div className="service-copy">
                      <strong>
                        تغییر رمز عبور
                      </strong>

                      <span>
                        مدیریت رمز و نشست‌های ورود
                      </span>
                    </div>

                    <Icon name="arrow" size={16} />
                  </Link>

                  <Link
                    href="/logout"
                    className="service-link"
                  >
                    <div className="service-icon">
                      <Icon name="logout" size={18} />
                    </div>

                    <div className="service-copy">
                      <strong>
                        خروج از حساب
                      </strong>

                      <span>
                        خروج از نشست فعلی
                      </span>
                    </div>

                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </section>
            </div>

            <div>
              <form
                action={updateNotifications}
                className="panel"
              >
                <div className="panel-head">
                  <div className="heading">
                    <div className="heading-icon">
                      <Icon name="bell" />
                    </div>

                    <div>
                      <h3>مرکز اعلان‌ها</h3>

                      <p>
                        انتخاب هشدارهای مورد نیاز شما
                      </p>
                    </div>
                  </div>

                  <span className="badge">
                    ذخیره مستقیم
                  </span>
                </div>

                <div className="switch-list">
                  <div className="switch-row">
                    <input
                      type="checkbox"
                      id="highImpact"
                      name="highImpact"
                      defaultChecked={
                        settings?.highImpact ?? true
                      }
                    />

                    <label htmlFor="highImpact">
                      <strong>
                        رویدادهای با اهمیت بالا
                      </strong>

                      <span>
                        هشدار اخبار مهم اقتصادی و بازار
                      </span>
                    </label>
                  </div>

                  <div className="switch-row">
                    <input
                      type="checkbox"
                      id="mediumImpact"
                      name="mediumImpact"
                      defaultChecked={
                        settings?.mediumImpact ?? true
                      }
                    />

                    <label htmlFor="mediumImpact">
                      <strong>
                        رویدادهای با اهمیت متوسط
                      </strong>

                      <span>
                        نمایش رویدادهای متوسط بازار
                      </span>
                    </label>
                  </div>

                  <div className="switch-row">
                    <input
                      type="checkbox"
                      id="lowImpact"
                      name="lowImpact"
                      defaultChecked={
                        settings?.lowImpact ?? false
                      }
                    />

                    <label htmlFor="lowImpact">
                      <strong>
                        رویدادهای کم‌اهمیت
                      </strong>

                      <span>
                        دریافت اخبار کم‌اهمیت اقتصادی
                      </span>
                    </label>
                  </div>

                  <div className="switch-row">
                    <input
                      type="checkbox"
                      id="newsFilterEnabled"
                      name="newsFilterEnabled"
                      defaultChecked={
                        settings?.newsFilterEnabled ?? true
                      }
                    />

                    <label htmlFor="newsFilterEnabled">
                      <strong>
                        فیلتر اخبار معاملاتی
                      </strong>

                      <span>
                        استفاده از اخبار در منطق ربات‌ها
                      </span>
                    </label>
                  </div>

                  <div className="switch-row">
                    <input
                      type="checkbox"
                      id="marketRiskEnabled"
                      name="marketRiskEnabled"
                      defaultChecked={
                        settings?.marketRiskEnabled ?? true
                      }
                    />

                    <label htmlFor="marketRiskEnabled">
                      <strong>
                        هشدار ریسک بازار
                      </strong>

                      <span>
                        کنترل ریسک مرتبط با رویدادها
                      </span>
                    </label>
                  </div>

                  <div className="switch-row">
                    <input
                      type="checkbox"
                      id="telegramEnabled"
                      name="telegramEnabled"
                      defaultChecked={
                        settings?.telegramEnabled ?? false
                      }
                    />

                    <label htmlFor="telegramEnabled">
                      <strong>
                        اعلان تلگرام
                      </strong>

                      <span>
                        ذخیره فعال یا غیرفعال بودن
                        اعلان تلگرام
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  className="primary"
                  type="submit"
                >
                  <Icon name="save" size={16} />
                  ذخیره اعلان‌ها
                </button>
              </form>

              <section className="panel">
                <div className="panel-head">
                  <div className="heading">
                    <div className="heading-icon">
                      <Icon name="plug" />
                    </div>

                    <div>
                      <h3>سرویس‌های متصل</h3>

                      <p>
                        مدیریت بخش‌های مرتبط با حساب
                      </p>
                    </div>
                  </div>
                </div>

                <div className="link-list">
                  <Link
                    href="/broker"
                    className="service-link"
                  >
                    <div className="service-icon">
                      <Icon name="plug" size={18} />
                    </div>

                    <div className="service-copy">
                      <strong>
                        اتصال بروکر
                      </strong>

                      <span>
                        مدیریت اتصال حساب معاملاتی
                      </span>
                    </div>

                    <Icon name="arrow" size={16} />
                  </Link>

                  <Link
                    href="/news"
                    className="service-link"
                  >
                    <div className="service-icon">
                      <Icon name="news" size={18} />
                    </div>

                    <div className="service-copy">
                      <strong>
                        اخبار و هشدارها
                      </strong>

                      <span>
                        مشاهده رویدادهای اقتصادی
                      </span>
                    </div>

                    <Icon name="arrow" size={16} />
                  </Link>

                  <Link
                    href="/support"
                    className="service-link"
                  >
                    <div className="service-icon">
                      <Icon name="support" size={18} />
                    </div>

                    <div className="service-copy">
                      <strong>
                        پشتیبانی
                      </strong>

                      <span>
                        ثبت و پیگیری درخواست‌ها
                      </span>
                    </div>

                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </section>
            </div>
          </div>

          <div className="footer-note">
            <Icon name="check" size={15} />

            تغییرات پروفایل و اعلان‌ها با Server Action
            در Prisma ذخیره می‌شوند. برای عملکرد تغییر
            رمز، مسیر /settings/security باید در پروژه
            وجود داشته باشد.
          </div>
        </section>
      </div>
    </main>
  );
}
