import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type SignalRow = {
  id: string;
  symbol: string;
  direction: string;
  status: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  score: number | null;
  createdAt: Date;
  telegramSent: boolean;
};

function Icon({
  name,
  size = 21,
}: {
  name: string;
  size?: number;
}) {
  const common = {
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
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h17" />
          <path d="m7 15 3-4 3 2 5-7" />
          <path d="M18 6h3v3" />
        </svg>
      );

    case "bot":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="13" rx="3" />
          <path d="M12 3v4" />
          <circle cx="12" cy="2.5" r=".8" fill="currentColor" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
          <path d="M8 17h8" />
        </svg>
      );

    case "brain":
      return (
        <svg {...common}>
          <path d="M9 4.5A3 3 0 0 0 6 7.5c0 .4.1.8.2 1.1A3.2 3.2 0 0 0 4 11.5 3.5 3.5 0 0 0 7.5 15H9v3.5A2.5 2.5 0 0 0 11.5 21" />
          <path d="M15 4.5A3 3 0 0 1 18 7.5c0 .4-.1.8-.2 1.1a3.2 3.2 0 0 1 2.2 2.9 3.5 3.5 0 0 1-3.5 3.5H15v3.5a2.5 2.5 0 0 1-2.5 2.5" />
          <path d="M9 9h2v3H9M15 9h-2v3h2" />
          <path d="M12 4v17" />
        </svg>
      );

    case "signal":
      return (
        <svg {...common}>
          <path d="M4 18V9" />
          <path d="M9 18V5" />
          <path d="M14 18v-8" />
          <path d="M19 18V3" />
          <path d="M3 18h18" />
        </svg>
      );

    case "news":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M8 14h2M12 14h2M16 14h1M8 17h2M12 17h2" />
        </svg>
      );

    case "link":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
          <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 7 20l1.1-1.1" />
        </svg>
      );

    case "telegram":
      return (
        <svg {...common}>
          <path d="m21 3-7.2 18-3.8-7L3 10l18-7Z" />
          <path d="m10 14 4-4" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.2 8.7-8 10-4.8-1.3-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M4 13v4a2 2 0 0 0 2 2h2v-6H4ZM20 13v4a2 2 0 0 1-2 2h-2v-6h4Z" />
          <path d="M12 20h3" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1A1.7 1.7 0 0 0 6.5 8l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5" />
          <path d="m14 8 4 4-4 4" />
          <path d="M9 12h9" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" />
          <path d="M16 13h5" />
          <circle cx="16" cy="13" r=".8" fill="currentColor" />
        </svg>
      );

    case "book":
      return (
        <svg {...common}>
          <path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4 1V4Z" />
          <path d="M9 20V8a4 4 0 0 1 4-4" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  }).format(value);
}

function statusText(status: string) {
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

function directionText(direction: string) {
  const value = direction.toUpperCase();

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

function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
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
        direction: true,
        status: true,
        entryPrice: true,
        stopLoss: true,
        takeProfit: true,
        score: true,
        createdAt: true,
        telegramSent: true,
      },
    }),
  ]);

  const firstName =
    user.name?.trim()?.split(" ")[0] ||
    user.email.split("@")[0] ||
    "کاربر";

  const userInitial =
    user.name?.trim()?.charAt(0) ||
    user.email?.trim()?.charAt(0) ||
    "U";

  const activeSignalRows = latestSignals.filter(
    (signal) => signal.status === "ACTIVE"
  );

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
          color: #f3f1eb;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .dashboard {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 75% 5%,
              rgba(210, 164, 66, 0.075),
              transparent 27%
            ),
            radial-gradient(
              circle at 15% 60%,
              rgba(33, 115, 145, 0.055),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #080b0f 0%,
              #0b1015 45%,
              #080b0f 100%
            );
          overflow-x: hidden;
        }

        .layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 275px;
        }

        .sidebar {
          grid-column: 2;
          grid-row: 1;
          min-height: 100vh;
          position: sticky;
          top: 0;
          height: 100vh;
          border-left: 1px solid rgba(255,255,255,.035);
          border-right: 1px solid rgba(212,169,77,.08);
          background:
            linear-gradient(
              180deg,
              rgba(13,18,24,.98),
              rgba(8,11,15,.99)
            );
          padding: 18px 14px;
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .content {
          grid-column: 1;
          grid-row: 1;
          min-width: 0;
          padding: 0 24px 35px;
        }

        .topbar {
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.05);
          margin-bottom: 20px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-menu {
          display: none;
          width: 40px;
          height: 40px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.035);
          color: #ddd;
          border-radius: 12px;
          align-items: center;
          justify-content: center;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .avatar {
          width: 39px;
          height: 39px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              145deg,
              #6f5a2c,
              #d4aa51
            );
          color: #111;
          font-weight: 900;
          border: 2px solid rgba(240,201,105,.25);
          box-shadow:
            0 0 0 4px rgba(212,170,81,.04),
            0 8px 25px rgba(0,0,0,.35);
          position: relative;
        }

        .online {
          position: absolute;
          width: 9px;
          height: 9px;
          background: #27d56f;
          border: 2px solid #0a0e12;
          border-radius: 50%;
          bottom: -1px;
          right: -1px;
        }

        .profile-info {
          line-height: 1.4;
        }

        .profile-name {
          font-size: 13px;
          font-weight: 800;
          color: #eee;
        }

        .profile-email {
          font-size: 10px;
          color: #777f88;
          direction: ltr;
          text-align: right;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .top-action {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9fa5aa;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          position: relative;
        }

        .top-action:hover {
          color: #e5bc60;
          border-color: rgba(212,170,81,.28);
        }

        .notification-dot {
          position: absolute;
          top: 5px;
          left: 6px;
          min-width: 14px;
          height: 14px;
          padding: 0 3px;
          border-radius: 10px;
          background: #d9a941;
          color: #14110a;
          font-size: 8px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .language {
          min-width: 112px;
          height: 38px;
          border-radius: 11px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.035);
          color: #ddd;
          font-size: 12px;
        }

        .language span:last-child {
          color: #d5a942;
        }

        .brand {
          padding: 4px 8px 18px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          margin-bottom: 13px;
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background:
            linear-gradient(
              145deg,
              rgba(215,174,79,.20),
              rgba(215,174,79,.04)
            );
          border: 1px solid rgba(215,174,79,.3);
          color: #d8ae50;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-text {
          text-align: right;
        }

        .brand-title {
          font-size: 15px;
          font-weight: 900;
          color: #e7b84e;
          letter-spacing: .2px;
        }

        .brand-subtitle {
          font-size: 8px;
          letter-spacing: 2.5px;
          color: #737980;
          margin-top: 2px;
        }

        .nav-section {
          color: #646b72;
          font-size: 10px;
          margin: 15px 8px 7px;
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-section::after {
          content: "";
          width: 34px;
          height: 1px;
          background: rgba(216,174,80,.35);
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .nav-item {
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 11px;
          border-radius: 11px;
          color: #b7bcc0;
          font-size: 12px;
          border: 1px solid transparent;
          transition: .18s ease;
        }

        .nav-item svg {
          flex: 0 0 auto;
          color: #7f858a;
        }

        .nav-item:hover {
          background: rgba(255,255,255,.035);
          color: #e5bc60;
        }

        .nav-item:hover svg {
          color: #e5bc60;
        }

        .nav-item.active {
          background:
            linear-gradient(
              100deg,
              rgba(221,177,75,.19),
              rgba(221,177,75,.04)
            );
          border-color: rgba(216,174,80,.25);
          color: #e6bc5d;
          box-shadow:
            inset 0 0 24px rgba(218,174,70,.035);
        }

        .nav-item.active svg {
          color: #e6bc5d;
        }

        .sidebar-spacer {
          flex: 1;
        }

        .support-card {
          border: 1px solid rgba(255,255,255,.07);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.045),
              rgba(255,255,255,.015)
            );
          border-radius: 15px;
          padding: 14px;
          margin-top: 12px;
        }

        .support-title {
          font-size: 12px;
          font-weight: 900;
          color: #ddd;
          margin-bottom: 5px;
        }

        .support-text {
          font-size: 9px;
          color: #777e85;
          line-height: 1.8;
          margin-bottom: 10px;
        }

        .gold-button {
          height: 36px;
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(218,176,80,.45);
          background:
            linear-gradient(
              180deg,
              rgba(211,167,68,.16),
              rgba(211,167,68,.055)
            );
          color: #e3b653;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }

        .welcome {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 15px;
          margin: 5px 2px 17px;
        }

        .welcome h1 {
          margin: 0;
          font-size: 25px;
          color: #eee;
          font-weight: 900;
        }

        .welcome h1 span {
          color: #dfb34e;
        }

        .welcome p {
          margin: 7px 0 0;
          color: #7c838a;
          font-size: 11px;
        }

        .date-pill {
          color: #757d84;
          font-size: 10px;
          white-space: nowrap;
        }

        .announcement {
          min-height: 112px;
          border-radius: 17px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(
              circle at 90% 50%,
              rgba(218,174,75,.10),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              rgba(255,255,255,.06),
              rgba(255,255,255,.018)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.025),
            0 18px 55px rgba(0,0,0,.18);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 19px 22px;
          margin-bottom: 15px;
        }

        .announcement-main {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .announcement-title {
          color: #dfb554;
          font-size: 13px;
          font-weight: 900;
        }

        .announcement-text {
          color: #b1b5b8;
          font-size: 11px;
          line-height: 2;
        }

        .announcement-date {
          color: #646b72;
          font-size: 10px;
          align-self: flex-start;
        }

        .announcement-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          padding: 0 16px;
          border-radius: 10px;
          border: 1px solid rgba(217,173,75,.38);
          color: #dcae49;
          font-size: 9px;
          margin-top: 5px;
          width: fit-content;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 15px;
        }

        .stat-card {
          min-height: 126px;
          border-radius: 15px;
          padding: 15px;
          border: 1px solid rgba(255,255,255,.075);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.055),
              rgba(255,255,255,.018)
            );
          position: relative;
          overflow: hidden;
        }

        .stat-card::after {
          content: "";
          position: absolute;
          width: 95px;
          height: 95px;
          border-radius: 50%;
          right: -48px;
          top: -45px;
          background: rgba(218,174,73,.045);
          filter: blur(3px);
        }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(217,172,69,.08);
          border: 1px solid rgba(217,172,69,.13);
          color: #dcb052;
        }

        .stat-icon.green {
          color: #27d56f;
          background: rgba(39,213,111,.075);
          border-color: rgba(39,213,111,.13);
        }

        .stat-icon.blue {
          color: #49a8e7;
          background: rgba(73,168,231,.07);
          border-color: rgba(73,168,231,.12);
        }

        .stat-icon.purple {
          color: #a675f4;
          background: rgba(166,117,244,.07);
          border-color: rgba(166,117,244,.12);
        }

        .stat-label {
          color: #a4a9ad;
          font-size: 10px;
          margin-bottom: 6px;
        }

        .stat-value {
          color: #f0f0ee;
          font-size: 22px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .stat-sub {
          color: #666d74;
          font-size: 9px;
          margin-top: 5px;
        }

        .stat-progress {
          height: 3px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          overflow: hidden;
          margin-top: 13px;
        }

        .stat-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          width: 45%;
          background: #cda84e;
        }

        .section-card {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.043),
              rgba(255,255,255,.014)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.018);
        }

        .section-header {
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ddd;
          font-size: 12px;
          font-weight: 900;
        }

        .section-title .green-dot {
          width: 7px;
          height: 7px;
          background: #2bd673;
          border-radius: 50%;
          box-shadow: 0 0 9px rgba(43,214,115,.7);
        }

        .section-link {
          color: #cda64c;
          font-size: 9px;
        }

        .market {
          margin-bottom: 15px;
        }

        .market-grid {
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
        }

        .market-item {
          min-width: 0;
          padding: 12px 9px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.055);
          background: rgba(0,0,0,.12);
        }

        .market-symbol {
          font-size: 10px;
          color: #c8cbd0;
          direction: ltr;
          text-align: left;
        }

        .market-price {
          font-size: 12px;
          font-weight: 800;
          color: #e7e7e5;
          margin-top: 7px;
          direction: ltr;
          text-align: left;
        }

        .market-change {
          font-size: 9px;
          margin-top: 5px;
        }

        .market-change.muted {
          color: #6d747a;
        }

        .market-chart {
          height: 20px;
          margin-top: 5px;
          display: flex;
          align-items: flex-end;
          gap: 3px;
        }

        .market-chart span {
          width: 4px;
          border-radius: 4px;
          background: #25c76b;
          opacity: .72;
        }

        .market-chart span:nth-child(1){height:7px}
        .market-chart span:nth-child(2){height:13px}
        .market-chart span:nth-child(3){height:9px}
        .market-chart span:nth-child(4){height:16px}
        .market-chart span:nth-child(5){height:11px}
        .market-chart span:nth-child(6){height:19px}
        .market-chart span:nth-child(7){height:14px}
        .market-chart span:nth-child(8){height:20px}

        .main-columns {
          display: grid;
          grid-template-columns: 1.05fr .95fr 1fr;
          gap: 12px;
          margin-bottom: 15px;
        }

        .signals-list,
        .bots-list {
          padding: 9px;
        }

        .signal-row {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 8px;
          border-radius: 10px;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .signal-row:last-child {
          border-bottom: none;
        }

        .direction-dot {
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
        }

        .direction-dot.buy {
          background: rgba(39,213,111,.08);
          color: #25d36c;
          border: 1px solid rgba(39,213,111,.14);
        }

        .direction-dot.sell {
          background: rgba(246,76,76,.08);
          color: #f36c6c;
          border: 1px solid rgba(246,76,76,.14);
        }

        .signal-info {
          flex: 1;
          min-width: 0;
        }

        .signal-symbol {
          font-size: 11px;
          font-weight: 900;
          color: #ddd;
          direction: ltr;
          text-align: right;
        }

        .signal-meta {
          color: #686f76;
          font-size: 8px;
          margin-top: 4px;
        }

        .signal-side {
          text-align: left;
        }

        .signal-status {
          font-size: 8px;
          color: #27d56f;
        }

        .signal-price {
          font-size: 9px;
          color: #8c9398;
          margin-top: 3px;
          direction: ltr;
        }

        .mini-button {
          margin: 7px 9px 9px;
          height: 31px;
          border: 1px solid rgba(216,174,80,.3);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d5ac52;
          font-size: 9px;
          background: rgba(216,174,80,.025);
        }

        .bots-list .bot-row {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 55px;
          border-bottom: 1px solid rgba(255,255,255,.04);
          padding: 7px;
        }

        .bot-row:last-child {
          border-bottom: none;
        }

        .bot-icon {
          width: 33px;
          height: 33px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(216,174,80,.065);
          color: #d9ad4e;
          border: 1px solid rgba(216,174,80,.11);
        }

        .bot-name {
          font-size: 10px;
          font-weight: 800;
          color: #d8dadd;
        }

        .bot-symbol {
          font-size: 8px;
          color: #686f76;
          direction: ltr;
          margin-top: 3px;
        }

        .bot-status {
          margin-right: auto;
          font-size: 8px;
          color: #2dd573;
        }

        .empty-state {
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          color: #626a70;
          font-size: 10px;
          text-align: center;
          padding: 20px;
        }

        .empty-state strong {
          color: #999fa4;
          font-size: 11px;
        }

        .performance {
          padding: 13px;
        }

        .performance-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .select {
          height: 27px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(0,0,0,.18);
          color: #888f95;
          padding: 0 8px;
          font-size: 8px;
        }

        .donut-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          min-height: 130px;
        }

        .donut {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              #11161b 57%,
              transparent 58%
            ),
            conic-gradient(
              #27d37b 0deg,
              #27d37b 0deg,
              rgba(255,255,255,.06) 0deg,
              rgba(255,255,255,.06) 360deg
            );
          border: 1px solid rgba(255,255,255,.04);
        }

        .donut-inner {
          text-align: center;
        }

        .donut-number {
          font-size: 18px;
          font-weight: 900;
          color: #e9e9e8;
        }

        .donut-label {
          color: #697177;
          font-size: 7px;
          margin-top: 3px;
        }

        .performance-stats {
          display: grid;
          gap: 8px;
        }

        .performance-stat {
          font-size: 8px;
          color: #777f86;
        }

        .performance-stat strong {
          display: block;
          color: #ddd;
          font-size: 14px;
          margin-top: 2px;
        }

        .performance-note {
          margin-top: 8px;
          text-align: center;
          font-size: 8px;
          color: #5f676e;
          line-height: 1.8;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .quick-card {
          min-height: 78px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px;
        }

        .quick-icon {
          width: 37px;
          height: 37px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(216,174,80,.055);
          border: 1px solid rgba(216,174,80,.08);
          color: #d7ac4d;
        }

        .quick-label {
          color: #858c92;
          font-size: 8px;
        }

        .quick-title {
          color: #ddd;
          font-size: 11px;
          font-weight: 900;
          margin-top: 3px;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 12px;
          margin-bottom: 25px;
        }

        .service-list {
          padding: 10px;
        }

        .service-row {
          min-height: 60px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          padding: 6px;
        }

        .service-row:last-child {
          border-bottom: none;
        }

        .service-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(216,174,80,.065);
          border: 1px solid rgba(216,174,80,.10);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d7ad50;
        }

        .service-title {
          color: #d5d8da;
          font-size: 10px;
          font-weight: 800;
        }

        .service-sub {
          color: #656d73;
          font-size: 8px;
          margin-top: 3px;
        }

        .news-list {
          padding: 10px;
        }

        .news-row {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 65px;
          border-bottom: 1px solid rgba(255,255,255,.04);
          padding: 7px;
        }

        .news-row:last-child {
          border-bottom: none;
        }

        .news-thumb {
          width: 48px;
          height: 42px;
          border-radius: 9px;
          background:
            linear-gradient(
              145deg,
              rgba(216,174,80,.18),
              rgba(216,174,80,.035)
            );
          border: 1px solid rgba(216,174,80,.09);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #caa149;
          flex: 0 0 auto;
        }

        .news-content {
          min-width: 0;
          flex: 1;
        }

        .news-title {
          color: #d5d8da;
          font-size: 10px;
          line-height: 1.8;
        }

        .news-meta {
          color: #626a70;
          font-size: 8px;
          margin-top: 3px;
        }

        .footer {
          border-top: 1px solid rgba(255,255,255,.05);
          padding: 16px 3px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #555d64;
          font-size: 8px;
        }

        .gold {
          color: #d7ad50;
        }

        @media (max-width: 1200px) {
          .layout {
            grid-template-columns: minmax(0, 1fr) 235px;
          }

          .sidebar {
            padding-left: 10px;
            padding-right: 10px;
          }

          .content {
            padding-left: 16px;
            padding-right: 16px;
          }

          .main-columns {
            grid-template-columns: 1fr 1fr;
          }

          .main-columns .performance {
            grid-column: 1 / -1;
          }

          .market-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .content {
            grid-column: 1;
          }

          .mobile-menu {
            display: flex;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .content {
            padding: 0 10px 20px;
          }

          .topbar {
            height: 64px;
          }

          .profile-info {
            display: none;
          }

          .language {
            min-width: 80px;
          }

          .welcome {
            align-items: flex-start;
            flex-direction: column;
          }

          .welcome h1 {
            font-size: 21px;
          }

          .announcement {
            min-height: 145px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .stat-card {
            min-height: 116px;
            padding: 11px;
          }

          .stat-value {
            font-size: 19px;
          }

          .market-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .main-columns {
            grid-template-columns: 1fr;
          }

          .main-columns .performance {
            grid-column: auto;
          }

          .quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-card:last-child {
            grid-column: 1 / -1;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .footer {
            gap: 10px;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="layout">
        {/* =========================
            SIDEBAR
        ========================== */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Icon name="chart" size={22} />
            </div>

            <div className="brand-text">
              <div className="brand-title">کوین پرو FX</div>
              <div className="brand-subtitle">COINEPRO • DESK</div>
            </div>
          </div>

          <div className="nav-section">اصلی</div>

          <nav className="nav">
            <Link className="nav-item active" href="/dashboard">
              <Icon name="home" />
              <span>خانه</span>
            </Link>

            <Link className="nav-item" href="/market">
              <Icon name="chart" />
              <span>بازار زنده</span>
            </Link>

            <Link className="nav-item" href="/bots">
              <Icon name="bot" />
              <span>ربات‌های معامله‌گر</span>
            </Link>

            <Link className="nav-item" href="/ai-analysis">
              <Icon name="brain" />
              <span>ربات‌های تحلیلگر</span>
            </Link>

            <Link className="nav-item" href="/signals">
              <Icon name="signal" />
              <span>سیگنال‌ها</span>
            </Link>

            <Link className="nav-item" href="/trades">
              <Icon name="calendar" />
              <span>کارنامه معاملات</span>
            </Link>
          </nav>

          <div className="nav-section">اطلاعات</div>

          <nav className="nav">
            <Link className="nav-item" href="/news">
              <Icon name="news" />
              <span>اخبار</span>
            </Link>

            <Link className="nav-item" href="/economic">
              <Icon name="calendar" />
              <span>تقویم اقتصادی</span>
            </Link>
          </nav>

          <div className="nav-section">اتصالات</div>

          <nav className="nav">
            <Link className="nav-item" href="/broker">
              <Icon name="link" />
              <span>اتصال به بروکر</span>
            </Link>

            <Link className="nav-item" href="/metatrader">
              <Icon name="link" />
              <span>اتصال به متاتریدر</span>
            </Link>

            <Link className="nav-item" href="/telegram">
              <Icon name="telegram" />
              <span>تلگرام و اعلان‌ها</span>
            </Link>
          </nav>

          <div className="nav-section">اشتراک</div>

          <nav className="nav">
            <Link className="nav-item" href="/subscriptions">
              <Icon name="wallet" />
              <span>اشتراک‌ها</span>
            </Link>

            <Link className="nav-item" href="/vpn">
              <Icon name="shield" />
              <span>VPN اختصاصی</span>
            </Link>

            <Link className="nav-item" href="/support">
              <Icon name="support" />
              <span>پشتیبانی</span>
            </Link>
          </nav>

          <div className="sidebar-spacer" />

          <nav className="nav">
            <Link className="nav-item" href="/profile">
              <Icon name="user" />
              <span>پروفایل</span>
            </Link>

            <Link className="nav-item" href="/settings">
              <Icon name="settings" />
              <span>تنظیمات</span>
            </Link>

            <Link
              className="nav-item"
              href="/api/auth/logout"
              style={{ color: "#ef5b5b" }}
            >
              <Icon name="logout" />
              <span>خروج</span>
            </Link>
          </nav>

          <div className="support-card">
            <div className="support-title">پشتیبانی ۲۴/۷</div>
            <div className="support-text">
              در صورت وجود مشکل یا سؤال، تیکت جدید خود را ثبت کنید.
            </div>

            <Link className="gold-button" href="/support">
              ایجاد تیکت جدید
            </Link>
          </div>
        </aside>

        {/* =========================
            MAIN
        ========================== */}
        <section className="content">
          <header className="topbar">
            <div className="topbar-right">
              <button className="mobile-menu" aria-label="منو">
                <Icon name="menu" size={19} />
              </button>

              <div className="profile">
                <div className="avatar">
                  {userInitial.toUpperCase()}
                  <span className="online" />
                </div>

                <div className="profile-info">
                  <div className="profile-name">{user.name || "کاربر"}</div>
                  <div className="profile-email">{user.email}</div>
                </div>
              </div>
            </div>

            <div className="top-actions">
              <div className="language">
                <span>فارسی</span>
                <span>🇮🇷</span>
              </div>

              <Link
                href="/notifications"
                className="top-action"
                aria-label="اعلان‌ها"
              >
                <Icon name="bell" size={18} />
                <span className="notification-dot">!</span>
              </Link>

              <Link
                href="/settings"
                className="top-action"
                aria-label="تنظیمات"
              >
                <Icon name="settings" size={18} />
              </Link>
            </div>
          </header>

          {/* Welcome */}
          <div className="welcome">
            <div>
              <h1>
                سلام، <span>{firstName}</span> 👋
              </h1>

              <p>
                به پنل معاملاتی هوشمند خوش آمدید
              </p>
            </div>

            <div className="date-pill">
              {formatDate(new Date())}
            </div>
          </div>

          {/* Announcement */}
          <section className="announcement">
            <div className="announcement-main">
              <div className="announcement-title">
                📣 اطلاعیه مهم
              </div>

              <div className="announcement-text">
                سیستم معاملاتی شما آماده است.
                <br />
                وضعیت ربات‌ها، سیگنال‌ها و فعالیت‌های حساب را از همین پنل
                مشاهده کنید.
              </div>

              <Link
                href="/news"
                className="announcement-button"
              >
                مشاهده اطلاعیه‌ها
              </Link>
            </div>

            <div className="announcement-date">
              {formatDate(new Date())}
            </div>
          </section>

          {/* Stats */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <div>
                  <div className="stat-label">
                    ربات‌های فعال
                  </div>

                  <div className="stat-value">
                    {activeBots}
                  </div>

                  <div className="stat-sub">
                    از {totalBots} ربات ثبت‌شده
                  </div>
                </div>

                <div className="stat-icon purple">
                  <Icon name="bot" size={22} />
                </div>
              </div>

              <div className="stat-progress">
                <span
                  style={{
                    width:
                      totalBots > 0
                        ? `${Math.min(
                            100,
                            Math.round(
                              (activeBots / totalBots) * 100
                            )
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div>
                  <div className="stat-label">
                    سیگنال‌های فعال
                  </div>

                  <div className="stat-value">
                    {activeSignals}
                  </div>

                  <div className="stat-sub">
                    وضعیت لحظه‌ای سیستم
                  </div>
                </div>

                <div className="stat-icon green">
                  <Icon name="signal" size={22} />
                </div>
              </div>

              <div className="stat-progress">
                <span
                  style={{
                    width:
                      activeSignals > 0
                        ? "75%"
                        : "0%",
                    background: "#27d56f",
                  }}
                />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div>
                  <div className="stat-label">
                    معاملات / سیگنال امروز
                  </div>

                  <div className="stat-value">
                    {todaySignals}
                  </div>

                  <div className="stat-sub">
                    از ابتدای امروز
                  </div>
                </div>

                <div className="stat-icon blue">
                  <Icon name="chart" size={22} />
                </div>
              </div>

              <div className="stat-progress">
                <span
                  style={{
                    width:
                      todaySignals > 0
                        ? "60%"
                        : "0%",
                    background: "#3c9edc",
                  }}
                />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div>
                  <div className="stat-label">
                    سود امروز
                  </div>

                  <div className="stat-value">
                    —
                  </div>

                  <div className="stat-sub">
                    پس از ثبت عملکرد واقعی
                  </div>
                </div>

                <div className="stat-icon">
                  <Icon name="wallet" size={22} />
                </div>
              </div>

              <div className="stat-progress">
                <span style={{ width: "0%" }} />
              </div>
            </div>
          </section>

          {/* Market */}
          <section className="section-card market">
            <div className="section-header">
              <div className="section-title">
                <span className="green-dot" />
                بازار زنده
              </div>

              <span className="section-link">
                بروزرسانی لحظه‌ای
              </span>
            </div>

            <div className="market-grid">
              {[
                "XAUUSD",
                "EURUSD",
                "GBPUSD",
                "USDJPY",
                "BTCUSDT",
                "ETHUSDT",
              ].map((symbol) => (
                <div className="market-item" key={symbol}>
                  <div className="market-symbol">
                    {symbol}
                  </div>

                  <div className="market-price">
                    —
                  </div>

                  <div className="market-change muted">
                    منتظر داده بازار
                  </div>

                  <div className="market-chart">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Main columns */}
          <section className="main-columns">
            {/* Signals */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  سیگنال‌های اخیر
                </div>

                <Link
                  href="/signals"
                  className="section-link"
                >
                  همه
                </Link>
              </div>

              <div className="signals-list">
                {latestSignals.length === 0 ? (
                  <div className="empty-state">
                    <Icon name="signal" size={27} />

                    <strong>
                      هنوز سیگنالی ثبت نشده است
                    </strong>

                    <span>
                      پس از ایجاد سیگنال واقعی، اینجا نمایش داده می‌شود.
                    </span>
                  </div>
                ) : (
                  latestSignals.map((signal) => {
                    const direction = directionText(
                      signal.direction
                    );

                    return (
                      <div
                        className="signal-row"
                        key={signal.id}
                      >
                        <div
                          className={`direction-dot ${direction.className}`}
                        >
                          {direction.label}
                        </div>

                        <div className="signal-info">
                          <div className="signal-symbol">
                            {signal.symbol}
                          </div>

                          <div className="signal-meta">
                            {statusText(signal.status)}
                            {" · "}
                            امتیاز{" "}
                            {signal.score ?? "—"}
                          </div>
                        </div>

                        <div className="signal-side">
                          <div className="signal-status">
                            {signal.status === "ACTIVE"
                              ? "فعال"
                              : statusText(signal.status)}
                          </div>

                          <div className="signal-price">
                            {formatPrice(signal.entryPrice)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Link
                href="/signals"
                className="mini-button"
              >
                مشاهده همه سیگنال‌ها
              </Link>
            </div>

            {/* Performance */}
            <div className="section-card performance">
              <div className="performance-top">
                <div className="section-title">
                  عملکرد حساب
                </div>

                <select className="select" defaultValue="7">
                  <option value="7">۷ روز اخیر</option>
                  <option value="30">۳۰ روز اخیر</option>
                  <option value="90">۹۰ روز اخیر</option>
                </select>
              </div>

              <div className="donut-wrap">
                <div className="donut">
                  <div className="donut-inner">
                    <div className="donut-number">
                      —
                    </div>

                    <div className="donut-label">
                      Win Rate
                    </div>
                  </div>
                </div>

                <div className="performance-stats">
                  <div className="performance-stat">
                    کل معاملات
                    <strong>—</strong>
                  </div>

                  <div className="performance-stat">
                    معاملات برد
                    <strong style={{ color: "#27d56f" }}>
                      —
                    </strong>
                  </div>

                  <div className="performance-stat">
                    معاملات باخت
                    <strong style={{ color: "#ed6767" }}>
                      —
                    </strong>
                  </div>
                </div>
              </div>

              <div className="performance-note">
                آمار عملکرد فقط بر اساس معاملات و رویدادهای واقعی
                سیستم محاسبه خواهد شد.
              </div>
            </div>

            {/* Bots */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  ربات‌های در حال اجرا
                </div>

                <Link
                  href="/bots"
                  className="section-link"
                >
                  مدیریت
                </Link>
              </div>

              <div className="bots-list">
                {activeBots === 0 ? (
                  <div className="empty-state">
                    <Icon name="bot" size={27} />

                    <strong>
                      ربات فعالی وجود ندارد
                    </strong>

                    <span>
                      از بخش ربات‌ها، یک ربات را فعال کنید.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="bot-row">
                      <div className="bot-icon">
                        <Icon name="bot" size={18} />
                      </div>

                      <div>
                        <div className="bot-name">
                          ربات‌های فعال
                        </div>

                        <div className="bot-symbol">
                          {activeBots} ACTIVE BOT
                        </div>
                      </div>

                      <div className="bot-status">
                        فعال
                      </div>
                    </div>

                    <div className="bot-row">
                      <div className="bot-icon">
                        <Icon name="brain" size={18} />
                      </div>

                      <div>
                        <div className="bot-name">
                          سیستم تحلیل
                        </div>

                        <div className="bot-symbol">
                          MARKET ANALYSIS
                        </div>
                      </div>

                      <div className="bot-status">
                        فعال
                      </div>
                    </div>

                    <div className="bot-row">
                      <div className="bot-icon">
                        <Icon name="signal" size={18} />
                      </div>

                      <div>
                        <div className="bot-name">
                          Signal Engine
                        </div>

                        <div className="bot-symbol">
                          SIGNAL MONITOR
                        </div>
                      </div>

                      <div className="bot-status">
                        فعال
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Link
                href="/bots"
                className="mini-button"
              >
                مشاهده و مدیریت ربات‌ها
              </Link>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="quick-grid">
            <Link
              href="/ai-analysis"
              className="quick-card"
            >
              <div className="quick-icon">
                <Icon name="brain" size={19} />
              </div>

              <div>
                <div className="quick-label">
                  تحلیل
                </div>

                <div className="quick-title">
                  ربات‌های تحلیلگر
                </div>
              </div>
            </Link>

            <Link
              href="/news"
              className="quick-card"
            >
              <div className="quick-icon">
                <Icon name="news" size={19} />
              </div>

              <div>
                <div className="quick-label">
                  اطلاعات
                </div>

                <div className="quick-title">
                  اخبار و تحلیل
                </div>
              </div>
            </Link>

            <Link
              href="/trades"
              className="quick-card"
            >
              <div className="quick-icon">
                <Icon name="calendar" size={19} />
              </div>

              <div>
                <div className="quick-label">
                  گزارش
                </div>

                <div className="quick-title">
                  کارنامه معاملات
                </div>
              </div>
            </Link>

            <Link
              href="/metatrader"
              className="quick-card"
            >
              <div className="quick-icon">
                <Icon name="link" size={19} />
              </div>

              <div>
                <div className="quick-label">
                  اتصال
                </div>

                <div className="quick-title">
                  متاتریدر
                </div>
              </div>
            </Link>

            <Link
              href="/broker"
              className="quick-card"
            >
              <div className="quick-icon">
                <Icon name="link" size={19} />
              </div>

              <div>
                <div className="quick-label">
                  اتصال
                </div>

                <div className="quick-title">
                  بروکر
                </div>
              </div>
            </Link>
          </section>

          {/* Bottom */}
          <section className="bottom-grid">
            {/* Services */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  اشتراک و خدمات
                </div>

                <Link
                  href="/subscriptions"
                  className="section-link"
                >
                  مدیریت
                </Link>
              </div>

              <div className="service-list">
                <div className="service-row">
                  <div className="service-icon">
                    <Icon name="wallet" size={18} />
                  </div>

                  <div>
                    <div className="service-title">
                      اشتراک حساب
                    </div>

                    <div className="service-sub">
                      پلن فعلی: {user.plan || "FREE"}
                    </div>
                  </div>
                </div>

                <div className="service-row">
                  <div className="service-icon">
                    <Icon name="telegram" size={18} />
                  </div>

                  <div>
                    <div className="service-title">
                      کانال سیگنال
                    </div>

                    <div className="service-sub">
                      وضعیت دسترسی از سیستم اشتراک بررسی می‌شود
                    </div>
                  </div>
                </div>

                <div className="service-row">
                  <div className="service-icon">
                    <Icon name="shield" size={18} />
                  </div>

                  <div>
                    <div className="service-title">
                      VPN اختصاصی
                    </div>

                    <div className="service-sub">
                      مدیریت سرویس VPN
                    </div>
                  </div>
                </div>

                <Link
                  href="/subscriptions"
                  className="mini-button"
                >
                  مدیریت اشتراک
                </Link>
              </div>
            </div>

            {/* News */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  آخرین اخبار و تحلیل‌ها
                </div>

                <Link
                  href="/news"
                  className="section-link"
                >
                  مشاهده همه
                </Link>
              </div>

              <div className="news-list">
                <div className="news-row">
                  <div className="news-thumb">
                    <Icon name="chart" size={21} />
                  </div>

                  <div className="news-content">
                    <div className="news-title">
                      تحلیل بازار و وضعیت فعلی سیستم
                    </div>

                    <div className="news-meta">
                      اطلاعات پس از اتصال منبع اخبار واقعی نمایش داده می‌شود
                    </div>
                  </div>
                </div>

                <div className="news-row">
                  <div className="news-thumb">
                    <Icon name="calendar" size={21} />
                  </div>

                  <div className="news-content">
                    <div className="news-title">
                      رویدادهای اقتصادی مهم
                    </div>

                    <div className="news-meta">
                      مشاهده تقویم اقتصادی
                    </div>
                  </div>
                </div>

                <div className="news-row">
                  <div className="news-thumb">
                    <Icon name="brain" size={21} />
                  </div>

                  <div className="news-content">
                    <div className="news-title">
                      تحلیل هوشمند بازار
                    </div>

                    <div className="news-meta">
                      وضعیت تحلیلگرها از بخش تحلیل قابل مشاهده است
                    </div>
                  </div>
                </div>

                <Link
                  href="/news"
                  className="mini-button"
                >
                  مشاهده همه اخبار
                </Link>
              </div>
            </div>
          </section>

          <footer className="footer">
            <span>
              © {new Date().getFullYear()} COINEPRO FX — تمامی حقوق محفوظ است.
            </span>

            <span className="gold">
              Trading AI Platform
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
