import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );

    case "chart":
      return (
        <svg {...props}>
          <path d="M4 19V5" />
          <path d="M4 19h17" />
          <path d="m7 15 3-4 3 2 5-7" />
          <path d="M18 6h3v3" />
        </svg>
      );

    case "bot":
      return (
        <svg {...props}>
          <rect x="4" y="7" width="16" height="13" rx="3" />
          <path d="M12 3v4" />
          <circle cx="12" cy="2.5" r=".7" fill="currentColor" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
          <path d="M8 17h8" />
        </svg>
      );

    case "brain":
      return (
        <svg {...props}>
          <path d="M9 4.5A3 3 0 0 0 6 7.5c0 .4.1.8.2 1.1A3.2 3.2 0 0 0 4 11.5 3.5 3.5 0 0 0 7.5 15H9v3.5A2.5 2.5 0 0 0 11.5 21" />
          <path d="M15 4.5A3 3 0 0 1 18 7.5c0 .4-.1.8-.2 1.1a3.2 3.2 0 0 1 2.2 2.9 3.5 3.5 0 0 1-3.5 3.5H15v3.5a2.5 2.5 0 0 1-2.5 2.5" />
          <path d="M12 4v17" />
          <path d="M9 9h2v3H9M15 9h-2v3h2" />
        </svg>
      );

    case "signal":
      return (
        <svg {...props}>
          <path d="M4 18V9" />
          <path d="M9 18V5" />
          <path d="M14 18v-8" />
          <path d="M19 18V3" />
          <path d="M3 18h18" />
        </svg>
      );

    case "news":
      return (
        <svg {...props}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M8 14h2M12 14h2M16 14h1M8 17h2M12 17h2" />
        </svg>
      );

    case "link":
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
          <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 7 20l1.1-1.1" />
        </svg>
      );

    case "telegram":
      return (
        <svg {...props}>
          <path d="m21 3-7.2 18-3.8-7L3 10l18-7Z" />
          <path d="m10 14 4-4" />
        </svg>
      );

    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 20 6v5c0 5-3.2 8.7-8 10-4.8-1.3-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "support":
      return (
        <svg {...props}>
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M4 13v4a2 2 0 0 0 2 2h2v-6H4ZM20 13v4a2 2 0 0 1-2 2h-2v-6h4Z" />
          <path d="M12 20h3" />
        </svg>
      );

    case "user":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1A1.7 1.7 0 0 0 6.5 8l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "logout":
      return (
        <svg {...props}>
          <path d="M10 5H5v14h5" />
          <path d="m14 8 4 4-4 4" />
          <path d="M9 12h9" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...props}>
          <path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" />
          <path d="M16 13h5" />
          <circle cx="16" cy="13" r=".8" fill="currentColor" />
        </svg>
      );

    case "menu":
      return (
        <svg {...props}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "bell":
      return (
        <svg {...props}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  }).format(value);
}

function signalStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "فعال";
    case "TP1_HIT":
      return "TP1";
    case "TP2_HIT":
      return "TP2";
    case "TP3_HIT":
      return "TP3";
    case "STOP_LOSS":
      return "حد ضرر";
    case "CLOSED":
      return "بسته";
    case "EXPIRED":
      return "منقضی";
    default:
      return status || "در انتظار";
  }
}

function direction(signal: string) {
  const value = signal.toUpperCase();

  if (value === "BUY" || value === "LONG") {
    return {
      label: "BUY",
      className: "buy",
    };
  }

  return {
    label: "SELL",
    className: "sell",
  };
}

function dateText(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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
    },
  });

  if (!user) {
    redirect("/login");
  }

  const startOfDay = new Date();

  startOfDay.setHours(0, 0, 0, 0);

  const [
    activeBots,
    totalBots,
    activeSignals,
    todaySignals,
    latestSignals,
  ] = await Promise.all([
    prisma.tradingBot.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    }),

    prisma.tradingBot.count({
      where: {
        userId: user.id,
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: startOfDay,
        },
      },
    }),

    prisma.tradingSignal.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        symbol: true,
        timeframe: true,
        direction: true,
        status: true,

        /*
         * مهم:
         * در schema.prisma فیلد ورود "entry" است
         * نه "entryPrice".
         */
        entry: true,

        stopLoss: true,
        takeProfit: true,
        score: true,
        createdAt: true,
      },
    }),
  ]);

  const firstName =
    user.name?.trim()?.split(" ")[0] ||
    user.email.split("@")[0] ||
    "کاربر";

  const initial =
    user.name?.trim()?.charAt(0) ||
    user.email?.trim()?.charAt(0) ||
    "U";

  const botPercentage =
    totalBots > 0
      ? Math.min(
          100,
          Math.round((activeBots / totalBots) * 100)
        )
      : 0;

  return (
    <main className="dashboard" dir="rtl">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #070a0d;
        }

        body {
          font-family:
            Tahoma,
            Arial,
            "Segoe UI",
            sans-serif;
          color: #f1f1ef;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .dashboard {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 78% 5%,
              rgba(218,174,76,.09),
              transparent 25%
            ),
            radial-gradient(
              circle at 10% 55%,
              rgba(28,109,140,.055),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #080b0f,
              #0b1015 50%,
              #070a0d
            );
        }

        .layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 270px;
        }

        .content {
          grid-column: 1;
          padding: 0 24px 35px;
          min-width: 0;
        }

        .sidebar {
          grid-column: 2;
          min-height: 100vh;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          padding: 17px 13px;
          border-left: 1px solid rgba(255,255,255,.035);
          background:
            linear-gradient(
              180deg,
              #0d1217,
              #080b0f
            );
        }

        .brand {
          height: 62px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 7px 12px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .brand-logo {
          width: 39px;
          height: 39px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dfb655;
          border: 1px solid rgba(220,175,72,.32);
          background:
            linear-gradient(
              145deg,
              rgba(222,177,76,.18),
              rgba(222,177,76,.035)
            );
        }

        .brand-title {
          color: #e1b64e;
          font-size: 15px;
          font-weight: 900;
        }

        .brand-subtitle {
          margin-top: 3px;
          color: #697077;
          font-size: 8px;
          letter-spacing: 2px;
        }

        .nav-title {
          color: #636a71;
          font-size: 9px;
          margin: 16px 8px 7px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-title::after {
          content: "";
          width: 32px;
          height: 1px;
          background: rgba(216,174,80,.4);
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .nav-item {
          min-height: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 11px;
          color: #aeb4b9;
          font-size: 11px;
          border: 1px solid transparent;
          transition: .18s;
        }

        .nav-item svg {
          color: #777e84;
        }

        .nav-item:hover {
          color: #e1b452;
          background: rgba(255,255,255,.035);
        }

        .nav-item:hover svg {
          color: #e1b452;
        }

        .nav-item.active {
          color: #e3b957;
          border-color: rgba(218,174,77,.3);
          background:
            linear-gradient(
              100deg,
              rgba(219,174,72,.18),
              rgba(219,174,72,.035)
            );
        }

        .nav-item.active svg {
          color: #e3b957;
        }

        .sidebar-space {
          height: 22px;
        }

        .support {
          margin-top: 15px;
          padding: 13px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.07);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.05),
              rgba(255,255,255,.015)
            );
        }

        .support-title {
          color: #ddd;
          font-size: 11px;
          font-weight: 900;
        }

        .support-text {
          color: #70777e;
          font-size: 8px;
          line-height: 1.9;
          margin: 6px 0 10px;
        }

        .gold-btn {
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(218,175,76,.4);
          color: #dfb351;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(216,174,80,.055);
          font-size: 9px;
          font-weight: 800;
        }

        .topbar {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 39px;
          height: 39px;
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #6d592d,
              #dbb253
            );
          color: #111;
          font-size: 15px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .online {
          position: absolute;
          width: 9px;
          height: 9px;
          bottom: 0;
          right: 0;
          border-radius: 50%;
          background: #29d673;
          border: 2px solid #080b0f;
        }

        .profile-name {
          color: #ddd;
          font-size: 12px;
          font-weight: 900;
        }

        .profile-email {
          margin-top: 3px;
          color: #6c737a;
          font-size: 9px;
          direction: ltr;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .language,
        .top-action {
          height: 38px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.025);
        }

        .language {
          min-width: 104px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #bbb;
          font-size: 10px;
        }

        .language b {
          color: #dfb452;
        }

        .top-action {
          width: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #969da3;
        }

        .welcome {
          margin: 18px 2px 16px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .welcome h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
        }

        .welcome h1 span {
          color: #dfb453;
        }

        .welcome p {
          margin: 6px 0 0;
          color: #727980;
          font-size: 10px;
        }

        .date {
          color: #626a71;
          font-size: 9px;
        }

        .announcement {
          min-height: 110px;
          padding: 18px 20px;
          border-radius: 17px;
          border: 1px solid rgba(255,255,255,.075);
          background:
            radial-gradient(
              circle at 90% 50%,
              rgba(218,174,76,.11),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              rgba(255,255,255,.055),
              rgba(255,255,255,.015)
            );
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .announcement-title {
          color: #dfb553;
          font-size: 12px;
          font-weight: 900;
        }

        .announcement-text {
          color: #aaaeb2;
          font-size: 10px;
          line-height: 2;
          margin-top: 7px;
        }

        .announcement-link {
          display: inline-flex;
          height: 29px;
          padding: 0 14px;
          align-items: center;
          justify-content: center;
          margin-top: 7px;
          border-radius: 9px;
          border: 1px solid rgba(217,174,78,.35);
          color: #d9ae50;
          font-size: 8px;
        }

        .announcement-date {
          color: #626970;
          font-size: 8px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 11px;
          margin-bottom: 14px;
        }

        .card {
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.065);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.045),
              rgba(255,255,255,.012)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.018);
        }

        .stat {
          min-height: 119px;
          padding: 14px;
        }

        .stat-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .stat-icon {
          width: 39px;
          height: 39px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d9ad4d;
          border: 1px solid rgba(216,174,80,.13);
          background: rgba(216,174,80,.06);
        }

        .stat-icon.green {
          color: #27d46e;
          border-color: rgba(39,212,110,.12);
          background: rgba(39,212,110,.06);
        }

        .stat-icon.blue {
          color: #46a8e6;
          border-color: rgba(70,168,230,.12);
          background: rgba(70,168,230,.06);
        }

        .stat-icon.purple {
          color: #a878f2;
          border-color: rgba(168,120,242,.12);
          background: rgba(168,120,242,.06);
        }

        .stat-label {
          color: #9ca2a7;
          font-size: 9px;
        }

        .stat-value {
          color: #eee;
          font-size: 21px;
          font-weight: 900;
          margin-top: 5px;
          direction: ltr;
          text-align: right;
        }

        .stat-sub {
          color: #616970;
          font-size: 8px;
          margin-top: 3px;
        }

        .progress {
          height: 3px;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255,255,255,.055);
          margin-top: 13px;
        }

        .progress span {
          display: block;
          height: 100%;
          background: #d2a84b;
          border-radius: inherit;
        }

        .section {
          margin-bottom: 14px;
        }

        .section-head {
          height: 49px;
          padding: 0 14px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-title {
          color: #ddd;
          font-size: 11px;
          font-weight: 900;
        }

        .section-link {
          color: #d5aa4c;
          font-size: 8px;
        }

        .market-grid {
          padding: 11px;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }

        .market {
          min-width: 0;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.05);
          background: rgba(0,0,0,.13);
          padding: 10px;
        }

        .market-symbol {
          color: #c8cccf;
          font-size: 9px;
          direction: ltr;
          text-align: left;
        }

        .market-price {
          color: #e5e5e3;
          font-size: 12px;
          font-weight: 900;
          margin-top: 6px;
          direction: ltr;
          text-align: left;
        }

        .market-change {
          color: #646c73;
          font-size: 8px;
          margin-top: 4px;
        }

        .market-bars {
          height: 19px;
          display: flex;
          align-items: flex-end;
          gap: 3px;
          margin-top: 5px;
        }

        .market-bars span {
          width: 4px;
          border-radius: 4px;
          background: #27c96b;
          opacity: .65;
        }

        .market-bars span:nth-child(1){height:6px}
        .market-bars span:nth-child(2){height:11px}
        .market-bars span:nth-child(3){height:8px}
        .market-bars span:nth-child(4){height:15px}
        .market-bars span:nth-child(5){height:10px}
        .market-bars span:nth-child(6){height:17px}
        .market-bars span:nth-child(7){height:13px}
        .market-bars span:nth-child(8){height:19px}

        .columns {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 11px;
          margin-bottom: 14px;
        }

        .list {
          padding: 8px;
        }

        .signal {
          min-height: 59px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .signal:last-child {
          border-bottom: none;
        }

        .direction {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          font-weight: 900;
        }

        .direction.buy {
          color: #27d46f;
          background: rgba(39,212,110,.07);
          border: 1px solid rgba(39,212,110,.12);
        }

        .direction.sell {
          color: #ef6c6c;
          background: rgba(239,108,108,.07);
          border: 1px solid rgba(239,108,108,.12);
        }

        .signal-info {
          flex: 1;
          min-width: 0;
        }

        .signal-symbol {
          color: #d8dadd;
          font-size: 10px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .signal-meta {
          color: #666e75;
          font-size: 7px;
          margin-top: 4px;
        }

        .signal-price {
          color: #8d9499;
          font-size: 8px;
          direction: ltr;
          text-align: left;
        }

        .signal-status {
          color: #2bd673;
          font-size: 7px;
          margin-bottom: 3px;
          text-align: left;
        }

        .empty {
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          padding: 20px;
          color: #626a70;
          font-size: 8px;
          text-align: center;
        }

        .empty strong {
          color: #9ca2a7;
          font-size: 10px;
        }

        .mini-link {
          height: 30px;
          margin: 5px 8px 8px;
          border-radius: 9px;
          border: 1px solid rgba(216,174,80,.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d4aa4d;
          font-size: 8px;
        }

        .bot-row {
          min-height: 57px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .bot-row:last-child {
          border-bottom: none;
        }

        .bot-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d6ac4d;
          background: rgba(216,174,80,.06);
          border: 1px solid rgba(216,174,80,.1);
        }

        .bot-name {
          color: #d6d8da;
          font-size: 9px;
          font-weight: 900;
        }

        .bot-sub {
          color: #646c73;
          font-size: 7px;
          margin-top: 3px;
          direction: ltr;
        }

        .bot-active {
          margin-right: auto;
          color: #28d46f;
          font-size: 7px;
        }

        .performance {
          padding-bottom: 9px;
        }

        .performance-body {
          min-height: 170px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 15px;
        }

        .donut {
          width: 105px;
          height: 105px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              #11161a 56%,
              transparent 57%
            ),
            conic-gradient(
              #2bd579 0deg,
              rgba(255,255,255,.05) 0deg
            );
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .donut-inner {
          text-align: center;
        }

        .donut-number {
          color: #eee;
          font-size: 19px;
          font-weight: 900;
        }

        .donut-text {
          color: #626a71;
          font-size: 7px;
          margin-top: 3px;
        }

        .performance-stats {
          display: grid;
          gap: 10px;
        }

        .performance-stat
