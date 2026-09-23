import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Lang = "fa" | "en";

const faPlan: Record<string, string> = {
  FREE: "رایگان",
  BASIC: "پایه",
  PRO: "حرفه‌ای",
  PREMIUM: "پریمیوم",
};

const enPlan: Record<string, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Professional",
  PREMIUM: "Premium",
};

function nf(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function icon(name: string) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    ),

    news: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),

    bot: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
      </svg>
    ),

    signal: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 4-5 3 3 5-7" />
      </svg>
    ),

    chart: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 19V5M4 19h16" />
        <path d="M7 15l3-4 3 2 4-6" />
      </svg>
    ),

    broker: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 8V5h10v3" />
        <rect x="4" y="8" width="16" height="11" rx="2" />
        <path d="M8 12h8M8 15h5" />
      </svg>
    ),

    mt: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" />
        <path d="M8 15l2-5 2 5 2-5 2 5" />
      </svg>
    ),

    subscription: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16v13H4z" />
        <path d="M4 7l2-4h12l2 4" />
        <path d="M9 12h6M9 15h4" />
      </svg>
    ),

    vpn: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),

    support: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 13a8 8 0 0 1 16 0v5H4z" />
        <path d="M4 15H2v-2M20 15h2v-2M9 21h6" />
      </svg>
    ),

    settings: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .35 1.98l.05.05-1.42 1.42-.05-.05a1.8 1.8 0 0 0-1.98-.35 1.8 1.8 0 0 0-1.08 1.65V20h-2v-.3a1.8 1.8 0 0 0-1.08-1.65 1.8 1.8 0 0 0-1.98.35l-.05.05-1.42-1.42.05-.05A1.8 1.8 0 0 0 9.1 15a1.8 1.8 0 0 0-1.65-1.08H7v-2h.3A1.8 1.8 0 0 0 9.1 10a1.8 1.8 0 0 0-.35-1.98l-.05-.05 1.42-1.42.05.05a1.8 1.8 0 0 0 1.98.35A1.8 1.8 0 0 0 13.23 5.3V5h2v.3a1.8 1.8 0 0 0 1.08 1.65 1.8 1.8 0 0 0 1.98-.35l.05-.05 1.42 1.42-.05.05A1.8 1.8 0 0 0 19.4 10a1.8 1.8 0 0 0 1.65 1.08h.3v2h-.3A1.8 1.8 0 0 0 19.4 15z" />
      </svg>
    ),

    profile: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6" />
      </svg>
    ),

    logout: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4M18 12H9" />
      </svg>
    ),

    live: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  };

  return icons[name] ?? icons.dashboard;
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();

  const savedLanguage =
    cookieStore.get("ta_lang")?.value === "en"
      ? "en"
      : "fa";

  const lang: Lang = savedLanguage;

  async function setLanguage(formData: FormData) {
    "use server";

    const selected =
      String(formData.get("language") || "fa") === "en"
        ? "en"
        : "fa";

    const store = await cookies();

    store.set("ta_lang", selected, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    redirect("/dashboard");
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
    activeSignals,
    openTrades,
    totalTrades,
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

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
        status: {
          in: [
            "ACTIVE",
            "TP1_HIT",
            "TP2_HIT",
          ] as any,
        },
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

  const totalPnl = closedTrades.reduce(
    (sum, trade) =>
      sum + Number(trade.profitLoss || 0),
    0
  );

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const t =
    lang === "en"
      ? {
          dashboard: "Dashboard",
          welcome: "Trading AI Control Center",
          welcomeText:
            "Manage signals, trading bots, market tools and your account from one professional workspace.",

          active: "System Active",
          profile: "Profile",
          settings: "Settings",
          logout: "Logout",

          mainMenu: "MAIN MENU",

          news: "Market News",
          newsText:
            "Latest market announcements and important events",

          bots: "Trading Bots",
          botsText:
            "Configure and manage your trading bots",

          signals: "Trading Signals",
          signalsText:
            "Confirmed signals, entry, SL and TP levels",

          performance: "Performance",
          performanceText:
            "Daily, weekly, monthly and yearly performance",

          broker: "Broker Connection",
          brokerText:
            "Connect your trading account",

          mt: "MetaTrader",
          mtText:
            "MT4 / MT5 connection and execution",

          live: "Live Center",
          liveText:
            "Live bots, signals and market activity",

          ai: "AI Analysis",
          aiText:
            "Multi-timeframe market analysis",

          subscriptions: "Subscriptions",
          subscriptionsText:
            "Manage your plan and access",

          vpn: "VPN & Private Channels",
          vpnText:
            "Subscription channels and private access",

          support: "Support",
          supportText:
            "Open a private support ticket",

          announcements: "Announcements",
          announcementsText:
            "Important messages from platform administration",

          dailyReport: "Daily Trading Report",
          dailyReportText:
            "Transparent daily profit and loss report",

          account: "Account",
          plan: "Current Plan",
          botsCount: "Bots",
          signalsCount: "Signals",
          openTrades: "Open Trades",
          totalTrades: "Total Trades",
          pnl: "Realized P/L",

          noData:
            "No trading data has been recorded yet.",

          view: "Open",

          language: "Language",
          fa: "فارسی",
          en: "English",

          quickAccess: "QUICK ACCESS",

          admin: "Administrator",
          user: "User",

          free: "Free",
          professional: "Professional",
        }
      : {
          dashboard: "داشبورد",
          welcome: "مرکز کنترل Trading AI",
          welcomeText:
            "سیگنال‌ها، ربات‌های معاملاتی، ابزارهای بازار و حساب کاربری خود را از یک محیط حرفه‌ای مدیریت کنید.",

          active: "سیستم فعال است",
          profile: "پروفایل",
          settings: "تنظیمات",
          logout: "خروج",

          mainMenu: "منوی اصلی",

          news: "اخبار بازار",
          newsText:
            "آخرین اخبار، اطلاعیه‌ها و رویدادهای مهم بازار",

          bots: "ربات‌های معامله‌گر",
          botsText:
            "تنظیم و مدیریت ربات‌های معاملاتی",

          signals: "سیگنال‌های معاملاتی",
          signalsText:
            "سیگنال‌های تأییدشده، ورود، حد ضرر و حد سود",

          performance: "کارنامه و عملکرد",
          performanceText:
            "عملکرد روزانه، هفتگی، ماهانه و سالانه",

          broker: "اتصال به بروکر",
          brokerText:
            "اتصال حساب معاملاتی به پلتفرم",

          mt: "متاتریدر",
          mtText:
            "اتصال MT4 / MT5 و اجرای معاملات",

          live: "مرکز زنده",
          liveText:
            "نمایش ربات‌ها، سیگنال‌ها و فعالیت زنده",

          ai: "تحلیل هوشمند AI",
          aiText:
            "تحلیل چندتایم‌فریمی بازار",

          subscriptions: "اشتراک‌ها",
          subscriptionsText:
            "مدیریت پلن و سطح دسترسی",

          vpn: "VPN و کانال‌های خصوصی",
          vpnText:
            "مدیریت کانال‌ها و دسترسی خصوصی",

          support: "پشتیبانی",
          supportText:
            "ثبت تیکت خصوصی برای پشتیبانی",

          announcements: "اطلاعیه‌ها",
          announcementsText:
            "پیام‌ها و اطلاعیه‌های مهم مدیریت سایت",

          dailyReport: "کارنامه روزانه معاملات",
          dailyReportText:
            "گزارش شفاف سود و زیان واقعی روز",

          account: "حساب کاربری",
          plan: "پلن فعلی",
          botsCount: "ربات‌ها",
          signalsCount: "سیگنال‌ها",
          openTrades: "معاملات باز",
          totalTrades: "کل معاملات",
          pnl: "سود/زیان ثبت‌شده",

          noData:
            "هنوز اطلاعات معاملاتی ثبت نشده است.",

          view: "ورود",

          language: "زبان",
          fa: "فارسی",
          en: "English",

          quickAccess: "دسترسی سریع",

          admin: "مدیر",
          user: "کاربر",

          free: "رایگان",
          professional: "حرفه‌ای",
        };

  const planLabel =
    lang === "en"
      ? enPlan[user.plan] || user.plan
      : faPlan[user.plan] || user.plan;

  return (
    <main
      dir={lang === "fa" ? "rtl" : "ltr"}
      className="dashboard-page"
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #05070b;
        }

        body {
          color: #f8fafc;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .dashboard-page {
          min-height: 100vh;
          padding: 20px;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(212, 175, 55, 0.10),
              transparent 28%
            ),
            radial-gradient(
              circle at 10% 20%,
              rgba(255, 255, 255, 0.025),
              transparent 30%
            ),
            #05070b;
        }

        .dashboard-shell {
          width: min(1550px, 100%);
          margin: 0 auto;

          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);

          gap: 18px;

          direction: ltr;
        }

        .sidebar,
        .main {
          direction: rtl;
        }

        .sidebar {
          position: sticky;
          top: 20px;

          height: calc(100vh - 40px);
          overflow: auto;

          padding: 18px;

          border: 1px solid rgba(255,255,255,.08);
          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              rgba(20,20,22,.94),
              rgba(9,10,13,.92)
            );

          box-shadow:
            0 25px 80px rgba(0,0,0,.45),
            inset 0 1px 0 rgba(255,255,255,.035);

          backdrop-filter: blur(22px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;

          padding: 6px 4px 20px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);
        }

        .logo {
          width: 48px;
          height: 48px;

          display: grid;
          place-items: center;

          border-radius: 16px;

          color: #fff;

          font-size: 15px;
          font-weight: 900;

          background:
            linear-gradient(
              135deg,
              #f5d76e,
              #a67c00
            );

          box-shadow:
            0 0 30px
            rgba(212,175,55,.20);
        }

        .brand strong {
          display: block;
          font-size: 14px;
        }

        .brand small {
          display: block;
          margin-top: 5px;

          color: #777;
          font-size: 9px;

          letter-spacing: 1px;
        }

        .menu-title {
          margin: 23px 7px 10px;

          color: #666;

          font-size: 9px;
          font-weight: 800;

          letter-spacing: 1.2px;
        }

        .menu {
          display: grid;
          gap: 6px;
        }

        .menu a {
          min-height: 45px;

          display: flex;
          align-items: center;
          gap: 11px;

          padding: 0 11px;

          border-radius: 13px;

          color: #8f949d;

          font-size: 11px;
          font-weight: 700;

          transition:
            .2s ease;
        }

        .menu a:hover,
        .menu a.active {
          color: #f6df83;

          background:
            rgba(212,175,55,.08);

          border:
            1px solid
            rgba(212,175,55,.13);

          transform: translateX(-2px);
        }

        .menu-icon {
          width: 31px;
          height: 31px;

          display: grid;
          place-items: center;

          flex: none;

          border-radius: 10px;

          color: #d4af37;

          background:
            rgba(255,255,255,.035);
        }

        .menu-icon svg {
          width: 17px;
          height: 17px;

          stroke: currentColor;
          stroke-width: 1.7;

          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sidebar-bottom {
          margin-top: 22px;

          display: grid;
          gap: 8px;
        }

        .mini-link {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 11px;

          border-radius: 13px;

          color: #8b9098;

          font-size: 10px;

          background:
            rgba(255,255,255,.025);

          border:
            1px solid
            rgba(255,255,255,.06);
        }

        .mini-link:hover {
          color: #f4dc7b;
          border-color:
            rgba(212,175,55,.18);
        }

        .main {
          min-width: 0;
        }

        .topbar {
          min-height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;

          padding: 15px 18px;

          border-radius: 22px;

          border:
            1px solid
            rgba(255,255,255,.08);

          background:
            rgba(15,16,19,.82);

          backdrop-filter:
            blur(20px);

          box-shadow:
            0 20px 60px
            rgba(0,0,0,.32);
        }

        .top-title small {
          display: block;

          color: #666;

          font-size: 9px;

          letter-spacing: 1.1px;
        }

        .top-title strong {
          display: block;

          margin-top: 6px;

          font-size: 18px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .top-action {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 13px;

          color: #a5a8ad;

          background:
            rgba(255,255,255,.035);

          border:
            1px solid
            rgba(255,255,255,.07);

          transition: .2s;
        }

        .top-action:hover {
          color: #f5d76e;

          border-color:
            rgba(212,175,55,.24);

          background:
            rgba(212,175,55,.06);
        }

        .top-action svg {
          width: 18px;
          height: 18px;

          stroke: currentColor;
          stroke-width: 1.7;

          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .avatar {
          width: 43px;
          height: 43px;

          display: grid;
          place-items: center;

          border-radius: 14px;

          color: #090909;

          font-size: 12px;
          font-weight: 900;

          background:
            linear-gradient(
              135deg,
              #f8e59a,
              #b78b16
            );

          box-shadow:
            0 0 25px
            rgba(212,175,55,.14);
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 7px;

          padding: 8px 11px;

          border-radius: 11px;

          color: #78e2a2;

          font-size: 9px;

          background:
            rgba(34,197,94,.055);

          border:
            1px solid
            rgba(34,197,94,.12);
        }

        .status-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #4ade80;

          box-shadow:
            0 0 12px
            rgba(74,222,128,.75);
        }

        .welcome {
          margin-top: 18px;

          min-height: 205px;

          position: relative;
          overflow: hidden;

          padding: 30px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 25px;

          border-radius: 27px;

          border:
            1px solid
            rgba(212,175,55,.15);

          background:
            radial-gradient(
              circle at 85% 20%,
              rgba(212,175,55,.13),
              transparent 25%
            ),
            linear-gradient(
              135deg,
              rgba(35,31,19,.95),
              rgba(13,14,17,.96)
            );

          box-shadow:
            0 25px 80px
            rgba(0,0,0,.38);
        }

        .welcome:after {
          content: "";

          position: absolute;

          width: 280px;
          height: 280px;

          right: -130px;
          bottom: -170px;

          border-radius: 50%;

          border:
            1px solid
            rgba(212,175,55,.10);
        }

        .eyebrow {
          color: #b7962e;

          font-size: 9px;
          font-weight: 900;

          letter-spacing: 1.5px;
        }

        .welcome h1 {
          margin: 9px 0 8px;

          font-size: clamp(
            24px,
            3vw,
            37px
          );

          line-height: 1.3;
        }

        .welcome p {
          max-width: 650px;

          margin: 0;

          color: #8c9097;

          font-size: 11px;
          line-height: 2;
        }

        .welcome-badge {
          position: relative;
          z-index: 2;

          min-width: 180px;

          padding: 18px;

          border-radius: 20px;

          background:
            rgba(255,255,255,.035);

          border:
            1px solid
            rgba(255,255,255,.08);

          text-align: center;
        }

        .welcome-badge strong {
          display: block;

          color: #f2d66e;

          font-size: 22px;
        }

        .welcome-badge span {
          display: block;

          margin-top: 5px;

          color: #777;

          font-size: 9px;
        }

        .stats {
          margin-top: 14px;

          display: grid;

          grid-template-columns:
            repeat(5, minmax(0,1fr));

          gap: 12px;
        }

        .stat {
          min-width: 0;

          padding: 18px;

          border-radius: 19px;

          background:
            rgba(16,17,20,.84);

          border:
            1px solid
            rgba(255,255,255,.07);

          box-shadow:
            0 18px 50px
            rgba(0,0,0,.25);

          transition: .2s;
        }

        .stat:hover {
          transform: translateY(-3px);

          border-color:
            rgba(212,175,55,.16);
        }

        .stat-icon {
          width: 37px;
          height: 37px;

          display: grid;
          place-items: center;

          border-radius: 11px;

          color: #d4af37;

          background:
            rgba(212,175,55,.07);
        }

        .stat-icon svg {
          width: 17px;
          height: 17px;

          stroke: currentColor;
          stroke-width: 1.7;

          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .stat small {
          display: block;

          margin-top: 15px;

          color: #70747b;

          font-size: 9px;
        }

        .stat strong {
          display: block;

          margin-top: 7px;

          font-size: 21px;
        }

        .stat .positive {
          color: #58d58b;
        }

        .stat .negative {
          color: #ef7777;
        }

        .section-title {
          margin: 25px 3px 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;
        }

        .section-title h2 {
          margin: 0;

          font-size: 14px;
        }

        .section-title span {
          color: #666;

          font-size: 9px;
        }

        .feature-grid {
          display: grid;

          grid-template-columns:
            repeat(4, minmax(0,1fr));

          gap: 12px;
        }

        .feature {
          min-height: 155px;

          padding: 19px;

          position: relative;
          overflow: hidden;

          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              rgba(24,25,28,.88),
              rgba(11,12,15,.92)
            );

          border:
            1px solid
            rgba(255,255,255,.075);

          transition:
            .22s ease;

          box-shadow:
            0 20px 55px
            rgba(0,0,0,.23);
        }

        .feature:hover {
          transform:
            translateY(-4px);

          border-color:
            rgba(212,175,55,.25);

          box-shadow:
            0 25px 70px
            rgba(0,0,0,.38),
            0 0 35px
            rgba(212,175,55,.045);
        }

        .feature-icon {
          width: 44px;
          height: 44px;

          display: grid;
          place-items: center;

          border-radius: 14px;

          color: #e1c35e;

          background:
            linear-gradient(
              135deg,
              rgba(212,175,55,.13),
              rgba(255,255,255,.025)
            );

          border:
            1px solid
            rgba(212,175,55,.13);
        }

        .feature-icon svg {
          width: 20px;
          height: 20px;

          stroke: currentColor;
          stroke-width: 1.7;

          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .feature h3 {
          margin: 15px 0 7px;

          font-size: 12px;
        }

        .feature p {
          min-height: 37px;

          margin: 0;

          color: #72767e;

          font-size: 9px;
          line-height: 1.9;
        }

        .feature-footer {
          margin-top: 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          color: #b89a35;

          font-size: 9px;
          font-weight: 800;
        }

        .feature-arrow {
          font-size: 15px;
        }

        .bottom-grid {
          margin-top: 14px;

          display: grid;

          grid-template-columns:
            1.35fr
            .65fr;

          gap: 14px;
        }

        .glass-panel {
          min-width: 0;

          padding: 20px;

          border-radius: 21px;

          background:
            rgba(15,16,19,.82);

          border:
            1px solid
            rgba(255,255,255,.075);

          box-shadow:
            0 20px 60px
            rgba(0,0,0,.28);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          margin-bottom: 17px;
        }

        .panel-header h3 {
          margin: 0;

          font-size: 12px;
        }

        .panel-header span {
          color: #686b71;

          font-size: 9px;
        }

        .live-list {
          display: grid;
          gap: 9px;
        }

        .live-row {
          display: grid;

          grid-template-columns:
            40px
            1fr
            auto;

          align-items: center;

          gap: 10px;

          padding: 10px;

          border-radius: 13px;

          background:
            rgba(255,255,255,.025);

          border:
            1px solid
            rgba(255,255,255,.045);
        }

        .live-icon {
          width: 36px;
          height: 36px;

          display: grid;
          place-items: center;

          border-radius: 11px;

          color: #d4af37;

          background:
            rgba(212,175,55,.07);
        }

        .live-row strong {
          display: block;

          font-size: 10px;
        }

        .live-row small {
          display: block;

          margin-top: 4px;

          color: #666;

          font-size: 8px;
        }

        .live-value {
          color: #58d58b;

          font-size: 9px;
          font-weight: 800;
        }

        .notice {
          min-height: 100%;

          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .notice-box {
          padding: 17px;

          border-radius: 16px;

          background:
            linear-gradient(
              135deg,
              rgba(212,175,55,.08),
              rgba(255,255,255,.025)
            );

          border:
            1px solid
            rgba(212,175,55,.12);
        }

        .notice-box strong {
          display: block;

          color: #f2d66e;

          font-size: 11px;
        }

        .notice-box p {
          margin: 9px 0 0;

          color: #777;

          font-size: 9px;
          line-height: 2;
        }

        .language-box {
          margin-top: 15px;

          padding: 13px;

          border-radius: 15px;

          background:
            rgba(255,255,255,.025);

          border:
            1px solid
            rgba(255,255,255,.055);
        }

        .language-box label {
          display: block;

          margin-bottom: 9px;

          color: #777;

          font-size: 9px;
        }

        .language-buttons {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 7px;
        }

        .language-buttons button {
          min-height: 37px;

          border: 0;

          border-radius: 10px;

          cursor: pointer;

          color: #999;

          background:
            rgba(255,255,255,.04);

          border:
            1px solid
            rgba(255,255,255,.05);

          font-family: inherit;

          font-size: 9px;
        }

        .language-buttons button.active {
          color: #101010;

          background:
            linear-gradient(
              135deg,
              #f5df83,
              #b38b20
            );

          border-color:
            transparent;
        }

        .account-bar {
          margin-top: 14px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;

          padding: 15px 18px;

          border-radius: 18px;

          background:
            rgba(255,255,255,.025);

          border:
            1px solid
            rgba(255,255,255,.06);
        }

        .account-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .account-user .mini-avatar {
          width: 38px;
          height: 38px;

          display: grid;
          place-items: center;

          border-radius: 12px;

          color: #0b0b0b;

          background:
            linear-gradient(
              135deg,
              #f5df83,
              #a77d13
            );

          font-size: 10px;
          font-weight: 900;
        }

        .account-user strong {
          display: block;

          font-size: 10px;
        }

        .account-user small {
          display: block;

          margin-top: 4px;

          color: #666;

          font-size: 8px;
        }

        .account-links {
          display: flex;
          gap: 7px;
        }

        .account-links a {
          padding: 9px 11px;

          border-radius: 10px;

          color: #888;

          font-size: 8px;

          background:
            rgba(255,255,255,.035);

          border:
            1px solid
            rgba(255,255,255,.05);
        }

        .account-links a:hover {
          color: #f2d66e;

          border-color:
            rgba(212,175,55,.18);
        }

        @media (max-width: 1200px) {
          .feature-grid {
            grid-template-columns:
              repeat(3, minmax(0,1fr));
          }

          .stats {
            grid-template-columns:
              repeat(3, minmax(0,1fr));
          }
        }

        @media (max-width: 950px) {
          .dashboard-shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .feature-grid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .dashboard-page {
            padding: 10px;
          }

          .topbar {
            border-radius: 18px;
          }

          .status-pill {
            display: none;
          }

          .welcome {
            padding: 22px;

            flex-direction: column;

            align-items: flex-start;
          }

          .welcome-badge {
            width: 100%;
          }

          .stats {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .account-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .account-links {
            width: 100%;
          }

          .account-links a {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>

      <div className="dashboard-shell">
        <aside className="sidebar">
          <Link
            href="/dashboard"
            className="brand"
          >
            <div className="logo">
              TA
            </div>

            <div>
              <strong>
                Trading AI
              </strong>

              <small>
                SMART TRADING PLATFORM
              </small>
            </div>
          </Link>

          <div className="menu-title">
            {t.mainMenu}
          </div>

          <nav className="menu">
            <Link
              href="/dashboard"
              className="active"
            >
              <span className="menu-icon">
                {icon("dashboard")}
              </span>

              {t.dashboard}
            </Link>

            <Link href="/news">
              <span className="menu-icon">
                {icon("news")}
              </span>

              {t.news}
            </Link>

            <Link href="/bots">
              <span className="menu-icon">
                {icon("bot")}
              </span>

              {t.bots}
            </Link>

            <Link href="/signals">
              <span className="menu-icon">
                {icon("signal")}
              </span>

              {t.signals}
            </Link>

            <Link href="/performance">
              <span className="menu-icon">
                {icon("chart")}
              </span>

              {t.performance}
            </Link>

            <Link href="/broker">
              <span className="menu-icon">
                {icon("broker")}
              </span>

              {t.broker}
            </Link>

            <Link href="/metatrader">
              <span className="menu-icon">
                {icon("mt")}
              </span>

              {t.mt}
            </Link>

            <Link href="/ai-analysis">
              <span className="menu-icon">
                {icon("bot")}
              </span>

              {t.ai}
            </Link>

            <Link href="/live">
              <span className="menu-icon">
                {icon("live")}
              </span>

              {t.live}
            </Link>

            <Link href="/subscriptions">
              <span className="menu-icon">
                {icon("subscription")}
              </span>

              {t.subscriptions}
            </Link>

            <Link href="/vpn">
              <span className="menu-icon">
                {icon("vpn")}
              </span>

              {t.vpn}
            </Link>

            <Link href="/support">
              <span className="menu-icon">
                {icon("support")}
              </span>

              {t.support}
            </Link>
          </nav>

          <div className="sidebar-bottom">
            <Link
              href="/profile"
              className="mini-link"
            >
              <span className="menu-icon">
                {icon("profile")}
              </span>

              {t.profile}
            </Link>

            <Link
              href="/settings"
              className="mini-link"
            >
              <span className="menu-icon">
                {icon("settings")}
              </span>

              {t.settings}
            </Link>

            <Link
              href="/logout"
              className="mini-link"
            >
              <span className="menu-icon">
                {icon("logout")}
              </span>

              {t.logout}
            </Link>
          </div>
        </aside>

        <section className="main">
          <header className="topbar">
            <div className="top-title">
              <small>
                TRADING AI / CONTROL CENTER
              </small>

              <strong>
                {t.dashboard}
              </strong>
            </div>

            <div className="top-actions">
              <div className="status-pill">
                <span className="status-dot" />
                {t.active}
              </div>

              <Link
                href="/settings"
                className="top-action"
                aria-label={t.settings}
              >
                {icon("settings")}
              </Link>

              <Link
                href="/profile"
                className="avatar"
                aria-label={t.profile}
              >
                {initials}
              </Link>
            </div>
          </header>

          <section className="welcome">
            <div>
              <div className="eyebrow">
                {t.welcome}
              </div>

              <h1>
                {lang === "en"
                  ? `Welcome, ${user.name}`
                  : `سلام ${user.name} 👋`}
              </h1>

              <p>
                {t.welcomeText}
              </p>
            </div>

            <div className="welcome-badge">
              <strong>
                {planLabel}
              </strong>

              <span>
                {t.plan}
              </span>
            </div>
          </section>

          <section className="stats">
            <div className="stat">
              <div className="stat-icon">
                {icon("bot")}
              </div>

              <small>
                {t.botsCount}
              </small>

              <strong>
                {nf(totalBots)}
              </strong>
            </div>

            <div className="stat">
              <div className="stat-icon">
                {icon("live")}
              </div>

              <small>
                {lang === "en"
                  ? "Active Bots"
                  : "ربات فعال"}
              </small>

              <strong>
                {nf(activeBots)}
              </strong>
            </div>

            <div className="stat">
              <div className="stat-icon">
                {icon("signal")}
              </div>

              <small>
                {t.signalsCount}
              </small>

              <strong>
                {nf(totalSignals)}
              </strong>
            </div>

            <div className="stat">
              <div className="stat-icon">
                {icon("chart")}
              </div>

              <small>
                {t.openTrades}
              </small>

              <strong>
                {nf(openTrades)}
              </strong>
            </div>

            <div className="stat">
              <div className="stat-icon">
                {icon("broker")}
              </div>

              <small>
                {t.pnl}
              </small>

              <strong
                className={
                  totalPnl > 0
                    ? "positive"
                    : totalPnl < 0
                    ? "negative"
                    : ""
                }
              >
                {totalPnl > 0
                  ? "+"
                  : ""}
                ${money(totalPnl)}
              </strong>
            </div>
          </section>

          <div className="section-title">
            <h2>
              {t.quickAccess}
            </h2>

            <span>
              Trading AI Platform
            </span>
          </div>

          <section className="feature-grid">
            <FeatureCard
              href="/news"
              iconName="news"
              title={t.news}
              text={t.newsText}
              view={t.view}
            />

            <FeatureCard
              href="/bots"
              iconName="bot"
              title={t.bots}
              text={t.botsText}
              view={t.view}
            />

            <FeatureCard
              href="/signals"
              iconName="signal"
              title={t.signals}
              text={t.signalsText}
              view={t.view}
            />

            <FeatureCard
              href="/performance"
              iconName="chart"
              title={t.performance}
              text={t.performanceText}
              view={t.view}
            />

            <FeatureCard
              href="/broker"
              iconName="broker"
              title={t.broker}
              text={t.brokerText}
              view={t.view}
            />

            <FeatureCard
              href="/metatrader"
              iconName="mt"
              title={t.mt}
              text={t.mtText}
              view={t.view}
            />

            <FeatureCard
              href="/live"
              iconName="live"
              title={t.live}
              text={t.liveText}
              view={t.view}
            />

            <FeatureCard
              href="/ai-analysis"
              iconName="bot"
              title={t.ai}
              text={t.aiText}
              view={t.view}
            />

            <FeatureCard
              href="/subscriptions"
              iconName="subscription"
              title={t.subscriptions}
              text={t.subscriptionsText}
              view={t.view}
            />

            <FeatureCard
              href="/vpn"
              iconName="vpn"
              title={t.vpn}
              text={t.vpnText}
              view={t.view}
            />

            <FeatureCard
              href="/support"
              iconName="support"
              title={t.support}
              text={t.supportText}
              view={t.view}
            />

            <FeatureCard
              href="/announcements"
              iconName="news"
              title={t.announcements}
              text={t.announcementsText}
              view={t.view}
            />
          </section>

          <section className="bottom-grid">
            <div className="glass-panel">
              <div className="panel-header">
                <h3>
                  {t.live}
                </h3>

                <span>
                  {activeSignals > 0
                    ? `${nf(activeSignals)} ${
                        lang === "en"
                          ? "active"
                          : "فعال"
                      }`
                    : lang === "en"
                    ? "No active signal"
                    : "سیگنال فعالی نیست"}
                </span>
              </div>

              <div className="live-list">
                <div className="live-row">
                  <div className="live-icon">
                    {icon("bot")}
                  </div>

                  <div>
                    <strong>
                      {t.bots}
                    </strong>

                    <small>
                      {lang === "en"
                        ? `${activeBots} active bots`
                        : `${nf(activeBots)} ربات فعال`}
                    </small>
                  </div>

                  <span className="live-value">
                    {activeBots > 0
                      ? "ACTIVE"
                      : "—"}
                  </span>
                </div>

                <div className="live-row">
                  <div className="live-icon">
                    {icon("signal")}
                  </div>

                  <div>
                    <strong>
                      {t.signals}
                    </strong>

                    <small>
                      {lang === "en"
                        ? `${activeSignals} active signals`
                        : `${nf(activeSignals)} سیگنال فعال`}
                    </small>
                  </div>

                  <span className="live-value">
                    {activeSignals > 0
                      ? "LIVE"
                      : "—"}
                  </span>
                </div>

                <div className="live-row">
                  <div className="live-icon">
                    {icon("chart")}
                  </div>

                  <div>
                    <strong>
                      {t.totalTrades}
                    </strong>

                    <small>
                      {lang === "en"
                        ? `${totalTrades} recorded trades`
                        : `${nf(totalTrades)} معامله ثبت‌شده`}
                    </small>
                  </div>

                  <span className="live-value">
                    {nf(totalTrades)}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-panel notice">
              <div>
                <div className="panel-header">
                  <h3>
                    {t.announcements}
                  </h3>

                  <span>
                    Trading AI
                  </span>
                </div>

                <div className="notice-box">
                  <strong>
                    {lang === "en"
                      ? "Platform Announcement Center"
                      : "مرکز اطلاعیه‌های سایت"}
                  </strong>

                  <p>
                    {lang === "en"
                      ? "Official announcements from the administration will appear here. No fake news or placeholder information is displayed."
                      : "اطلاعیه‌های رسمی مدیریت سایت در این بخش نمایش داده می‌شوند. هیچ خبر یا اطلاعات ساختگی نمایش داده نمی‌شود."}
                  </p>

                  <div
                    style={{
                      marginTop: 12,
                    }}
                  >
                    <Link
                      href="/announcements"
                      className="mini-link"
                      style={{
                        justifyContent:
                          "center",
                      }}
                    >
                      {t.view}
                    </Link>
                  </div>
                </div>

                <div className="language-box">
                  <label>
                    {t.language}
                  </label>

                  <form
                    action={
                      setLanguage
                    }
                  >
                    <div className="language-buttons">
                      <button
                        type="submit"
                        name="language"
                        value="fa"
                        className={
                          lang === "fa"
                            ? "active"
                            : ""
                        }
                      >
                        {t.fa}
                      </button>

                      <button
                        type="submit"
                        name="language"
                        value="en"
                        className={
                          lang === "en"
                            ? "active"
                            : ""
                        }
                      >
                        {t.en}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <div className="account-bar">
            <div className="account-user">
              <div className="mini-avatar">
                {initials}
              </div>

              <div>
                <strong>
                  {user.name}
                </strong>

                <small>
                  {user.email}
                </small>
              </div>
            </div>

            <div className="account-links">
              <Link href="/profile">
                {t.profile}
              </Link>

              <Link href="/settings">
                {t.settings}
              </Link>

              <Link href="/support">
                {t.support}
              </Link>

              <Link href="/logout">
                {t.logout}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  href,
  iconName,
  title,
  text,
  view,
}: {
  href: string;
  iconName: string;
  title: string;
  text: string;
  view: string;
}) {
  return (
    <Link
      href={href}
      className="feature"
    >
      <div className="feature-icon">
        {icon(iconName)}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

      <div className="feature-footer">
        <span>
          {view}
        </span>

        <span className="feature-arrow">
          ←
        </span>
      </div>
    </Link>
  );
}
