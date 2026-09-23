import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type DashboardSignal = {
  id: string;
  symbol: string;
  timeframe: string | null;
  direction: string;
  entry: unknown;
  stopLoss: unknown;
  takeProfit: unknown;
  riskReward: unknown;
  score: unknown;
  confidence: unknown;
  status: string;
  createdAt: Date;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const n = Number(value);

  if (!Number.isFinite(n)) return null;

  return n;
}

function price(value: unknown, digits = 2) {
  const n = num(value);

  if (n === null) return "—";

  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function integer(value: unknown) {
  const n = num(value);

  if (n === null) return "0";

  return Math.round(n).toLocaleString("en-US");
}

function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function firstName(name: string | null) {
  if (!name) return "کاربر";

  return name.trim().split(/\s+/)[0] || "کاربر";
}

function signalDirection(direction: string) {
  const d = String(direction).toUpperCase();

  if (d === "BUY" || d === "LONG") {
    return {
      label: "BUY",
      className: "buy",
      icon: "↗",
    };
  }

  if (d === "SELL" || d === "SHORT") {
    return {
      label: "SELL",
      className: "sell",
      icon: "↘",
    };
  }

  return {
    label: d,
    className: "neutral",
    icon: "•",
  };
}

function signalStatus(status: string) {
  const s = String(status).toUpperCase();

  if (s === "ACTIVE") {
    return {
      label: "فعال",
      className: "statusActive",
    };
  }

  if (s === "TP1_HIT") {
    return {
      label: "TP1",
      className: "statusActive",
    };
  }

  if (s === "TP2_HIT") {
    return {
      label: "TP2",
      className: "statusActive",
    };
  }

  if (s === "TP3_HIT") {
    return {
      label: "TP3",
      className: "statusActive",
    };
  }

  if (s === "STOP_LOSS") {
    return {
      label: "حد ضرر",
      className: "statusDanger",
    };
  }

  if (s === "EXPIRED") {
    return {
      label: "منقضی",
      className: "statusMuted",
    };
  }

  if (s === "CLOSED") {
    return {
      label: "بسته",
      className: "statusMuted",
    };
  }

  if (s === "WAITING") {
    return {
      label: "در انتظار",
      className: "statusWaiting",
    };
  }

  return {
    label: s,
    className: "statusMuted",
  };
}

function Icon({
  name,
  size = 19,
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

    case "market":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 4-4 3 2 5-6" />
        </svg>
      );

    case "signal":
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M9 19V5" />
          <path d="M14 19v-7" />
          <path d="M19 19V3" />
        </svg>
      );

    case "bot":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="12" rx="3" />
          <path d="M12 3v4" />
          <path d="M8 12h.01" />
          <path d="M16 12h.01" />
          <path d="M8 16h8" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 5-7" />
        </svg>
      );

    case "trade":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
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
          <path d="M7 3v4M17 3v4M3 10h18" />
          <path d="M8 14h2M12 14h2M16 14h1M8 17h2" />
        </svg>
      );

    case "broker":
      return (
        <svg {...common}>
          <circle cx="7" cy="12" r="3" />
          <circle cx="17" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
          <path d="m9.5 10.5 5-2M9.5 13.5l5 2" />
        </svg>
      );

    case "telegram":
      return (
        <svg {...common}>
          <path d="m21 4-3 16-6-5-4 3 1-6L21 4Z" />
          <path d="m9 12 8-5-6 6" />
        </svg>
      );

    case "subscription":
      return (
        <svg {...common}>
          <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0 1 16 0" />
          <path d="M4 12v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Z" />
          <path d="M20 12v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
          <path d="M15 20h2" />
        </svg>
      );

    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v2.6h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5" />
          <path d="M14 8l4 4-4 4" />
          <path d="M8 12h10" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
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

function MenuItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`menuItem ${active ? "menuActive" : ""}`}
    >
      <span className="menuIcon">
        <Icon name={icon} size={18} />
      </span>

      <span>{label}</span>

      {active && <span className="activeDot" />}
    </Link>
  );
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
    },
  });

  if (!user) {
    redirect("/login");
  }

  const [
    signalRows,
    activeBots,
    totalBots,
    activeSignals,
    totalSignals,
  ] = await Promise.all([
    prisma.tradingSignal.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        symbol: true,
        timeframe: true,
        direction: true,
        entry: true,
        stopLoss: true,
        takeProfit: true,
        riskReward: true,
        score: true,
        confidence: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

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
      },
    }),
  ]);

  const signals = signalRows as unknown as DashboardSignal[];

  const buyCount = signals.filter((s) => {
    const d = String(s.direction).toUpperCase();
    return d === "BUY" || d === "LONG";
  }).length;

  const sellCount = signals.filter((s) => {
    const d = String(s.direction).toUpperCase();
    return d === "SELL" || d === "SHORT";
  }).length;

  const completed = signals.filter((s) =>
    [
      "TP1_HIT",
      "TP2_HIT",
      "TP3_HIT",
      "STOP_LOSS",
      "CLOSED",
    ].includes(String(s.status).toUpperCase()),
  );

  const wins = signals.filter((s) =>
    ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(
      String(s.status).toUpperCase(),
    ),
  );

  const winRate =
    completed.length > 0
      ? Math.round((wins.length / completed.length) * 100)
      : 0;

  const name = firstName(user.name);

  return (
    <main dir="rtl" className="dashboardRoot">
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .dashboardRoot {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 82% 4%,
              rgba(218, 181, 72, 0.11),
              transparent 25%
            ),
            radial-gradient(
              circle at 20% 30%,
              rgba(26, 123, 156, 0.08),
              transparent 27%
            ),
            #070b10;
          color: #f6f6f6;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
          overflow-x: hidden;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: row-reverse;
        }

        .sidebar {
          width: 275px;
          flex: 0 0 275px;
          min-height: 100vh;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          border-left: 1px solid rgba(255, 255, 255, 0.07);
          background:
            linear-gradient(
              180deg,
              rgba(12, 17, 23, 0.98),
              rgba(7, 11, 16, 0.98)
            );
          padding: 22px 16px;
        }

        .sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(218, 181, 72, 0.2);
          border-radius: 20px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 4px 7px 24px;
        }

        .brandLogo {
          width: 47px;
          height: 47px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e5c45b;
          border: 1px solid rgba(229, 196, 91, 0.3);
          background:
            linear-gradient(
              135deg,
              rgba(229, 196, 91, 0.18),
              rgba(229, 196, 91, 0.02)
            );
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.08),
            0 12px 35px rgba(0, 0, 0, 0.25);
        }

        .brandLogo span {
          font-size: 22px;
          font-weight: 900;
        }

        .brandTitle {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .brandSub {
          color: #656c75;
          font-size: 8px;
          letter-spacing: 2.2px;
          margin-top: 4px;
          white-space: nowrap;
        }

        .profileMini {
          padding: 13px;
          border-radius: 17px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          background: rgba(255, 255, 255, 0.025);
          margin-bottom: 18px;
        }

        .profileRow {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              145deg,
              rgba(226, 191, 78, 0.35),
              rgba(30, 35, 42, 0.8)
            );
          border: 1px solid rgba(229, 196, 91, 0.28);
          color: #f2d979;
          font-size: 16px;
          font-weight: 900;
        }

        .profileText {
          min-width: 0;
          flex: 1;
        }

        .profileName {
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profileEmail {
          color: #656c75;
          font-size: 9px;
          direction: ltr;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 4px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #4bd996;
          font-size: 9px;
          margin-top: 7px;
        }

        .onlineDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #43d991;
          box-shadow: 0 0 10px rgba(67, 217, 145, 0.7);
        }

        .menuSection {
          color: #4f565f;
          font-size: 9px;
          margin: 18px 9px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menuSection::before {
          content: "";
          height: 1px;
          width: 26px;
          background: rgba(218, 181, 72, 0.35);
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .menuItem {
          min-height: 43px;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          padding: 0 11px;
          border-radius: 13px;
          color: #89909a;
          text-decoration: none;
          font-size: 11px;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .menuItem:hover {
          color: #eee;
          background: rgba(255, 255, 255, 0.035);
          transform: translateX(-2px);
        }

        .menuIcon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #626a74;
        }

        .menuActive {
          color: #e5c45b;
          background:
            linear-gradient(
              90deg,
              rgba(229, 196, 91, 0.12),
              rgba(229, 196, 91, 0.035)
            );
          border: 1px solid rgba(229, 196, 91, 0.12);
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.035),
            0 10px 30px rgba(0, 0, 0, 0.14);
        }

        .menuActive .menuIcon {
          color: #e5c45b;
        }

        .activeDot {
          position: absolute;
          right: 5px;
          width: 3px;
          height: 18px;
          border-radius: 10px;
          background: #e5c45b;
          box-shadow: 0 0 12px rgba(229, 196, 91, 0.7);
        }

        .supportMini {
          margin-top: 17px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(229, 196, 91, 0.1);
          background:
            linear-gradient(
              145deg,
              rgba(229, 196, 91, 0.07),
              rgba(255, 255, 255, 0.015)
            );
        }

        .supportTitle {
          font-size: 11px;
          font-weight: 800;
        }

        .supportText {
          color: #666d76;
          font-size: 9px;
          line-height: 1.8;
          margin: 5px 0 10px;
        }

        .supportButton {
          display: block;
          text-align: center;
          text-decoration: none;
          padding: 9px;
          border-radius: 10px;
          border: 1px solid rgba(229, 196, 91, 0.2);
          background: rgba(229, 196, 91, 0.07);
          color: #e5c45b;
          font-size: 9px;
          font-weight: 800;
        }

        .content {
          min-width: 0;
          flex: 1;
        }

        .topbar {
          height: 76px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.065);
          background: rgba(7, 11, 16, 0.76);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .welcomeSmall {
          color: #626973;
          font-size: 9px;
          margin-bottom: 5px;
        }

        .welcomeTitle {
          font-size: 17px;
          font-weight: 900;
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topButton {
          height: 38px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #9ba1aa;
          text-decoration: none;
          font-size: 9px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          background: rgba(255, 255, 255, 0.025);
          border-radius: 11px;
        }

        .topButton:hover {
          color: #fff;
          border-color: rgba(229, 196, 91, 0.2);
        }

        .notification {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8e959e;
          border: 1px solid rgba(255, 255, 255, 0.075);
          background: rgba(255, 255, 255, 0.025);
          border-radius: 11px;
          text-decoration: none;
        }

        .notificationDot {
          position: absolute;
          width: 6px;
          height: 6px;
          right: 8px;
          top: 7px;
          border-radius: 50%;
          background: #e5c45b;
          box-shadow: 0 0 9px rgba(229, 196, 91, 0.8);
        }

        .mobileMenu {
          display: none;
        }

        .page {
          padding: 25px 28px 32px;
          max-width: 1500px;
          margin: 0 auto;
        }

        .announcement {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(229, 196, 91, 0.12);
          border-radius: 19px;
          padding: 18px 20px;
          background:
            radial-gradient(
              circle at 90% 50%,
              rgba(229, 196, 91, 0.1),
              transparent 25%
            ),
            rgba(255, 255, 255, 0.025);
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.18);
        }

        .announcementInner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .announcementLabel {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e5c45b;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 7px;
        }

        .announcementTitle {
          font-size: 12px;
          font-weight: 800;
        }

        .announcementText {
          color: #666e78;
          font-size: 9px;
          line-height: 2;
          margin-top: 5px;
        }

        .goldButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 135px;
          height: 38px;
          padding: 0 15px;
          border-radius: 11px;
          color: #0b0d10;
          background: linear-gradient(135deg, #e8cb67, #b99331);
          text-decoration: none;
          font-size: 9px;
          font-weight: 900;
          box-shadow: 0 8px 24px rgba(204, 163, 54, 0.15);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 13px;
        }

        .card {
          border: 1px solid rgba(255, 255, 255, 0.065);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            );
          border-radius: 18px;
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.035),
            0 20px 45px rgba(0, 0, 0, 0.14);
        }

        .statCard {
          padding: 15px;
          min-height: 124px;
        }

        .statTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .statLabel {
          color: #727984;
          font-size: 9px;
        }

        .statIcon {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: #e5c45b;
          background: rgba(229, 196, 91, 0.08);
          border: 1px solid rgba(229, 196, 91, 0.09);
        }

        .statValue {
          font-size: 25px;
          font-weight: 900;
          margin-top: 15px;
          letter-spacing: -0.8px;
        }

        .statBottom {
          color: #555d67;
          font-size: 8px;
          margin-top: 3px;
        }

        .section {
          margin-top: 15px;
        }

        .sectionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .sectionTitle {
          font-size: 12px;
          font-weight: 900;
        }

        .sectionSubtitle {
          color: #555d67;
          font-size: 8px;
          margin-top: 4px;
        }

        .sectionLink {
          color: #dcbf61;
          text-decoration: none;
          font-size: 9px;
        }

        .marketCard {
          padding: 14px;
        }

        .marketGrid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 9px;
        }

        .marketItem {
          min-width: 0;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.18);
        }

        .marketSymbol {
          font-size: 9px;
          font-weight: 900;
          color: #cbd0d7;
        }

        .marketPrice {
          font-size: 13px;
          font-weight: 900;
          margin-top: 12px;
          direction: ltr;
          text-align: right;
        }

        .marketWaiting {
          color: #454c55;
          font-size: 8px;
          margin-top: 4px;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(310px, 0.8fr);
          gap: 14px;
          margin-top: 15px;
        }

        .panel {
          padding: 17px;
        }

        .signalList {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .signalRow {
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 14px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.17);
          transition:
            border 0.2s ease,
            background 0.2s ease;
        }

        .signalRow:hover {
          border-color: rgba(229, 196, 91, 0.15);
          background: rgba(255, 255, 255, 0.025);
        }

        .signalMain {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .signalIdentity {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .signalIcon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          font-size: 17px;
          font-weight: 900;
        }

        .signalIcon.buy {
          color: #46dc99;
          background: rgba(70, 220, 153, 0.08);
          border: 1px solid rgba(70, 220, 153, 0.12);
        }

        .signalIcon.sell {
          color: #f06d74;
          background: rgba(240, 109, 116, 0.08);
          border: 1px solid rgba(240, 109, 116, 0.12);
        }

        .signalIcon.neutral {
          color: #d8bc60;
          background: rgba(216, 188, 96, 0.08);
          border: 1px solid rgba(216, 188, 96, 0.12);
        }

        .signalSymbol {
          font-size: 11px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .signalMeta {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          color: #545c66;
          font-size: 8px;
        }

        .timeframe {
          padding: 3px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          color: #737b85;
          direction: ltr;
        }

        .directionBadge {
          padding: 6px 9px;
          border-radius: 8px;
          font-size: 8px;
          font-weight: 900;
          direction: ltr;
        }

        .directionBadge.buy {
          color: #47dc9b;
          background: rgba(71, 220, 155, 0.08);
          border: 1px solid rgba(71, 220, 155, 0.12);
        }

        .directionBadge.sell {
          color: #f06c75;
          background: rgba(240, 108, 117, 0.08);
          border: 1px solid rgba(240, 108, 117, 0.12);
        }

        .directionBadge.neutral {
          color: #dcbf61;
          background: rgba(220, 191, 97, 0.08);
        }

        .signalValues {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 10px;
        }

        .valueBox {
          padding: 8px 9px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
        }

        .valueLabel {
          color: #505862;
          font-size: 7px;
        }

        .valueNumber {
          margin-top: 4px;
          color: #cfd3d8;
          font-size: 9px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .valueNumber.sl {
          color: #ed737b;
        }

        .valueNumber.tp {
          color: #4bd99a;
        }

        .signalBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.045);
          margin-top: 9px;
          padding-top: 8px;
          color: #505862;
          font-size: 8px;
        }

        .goldText {
          color: #e3c45f;
        }

        .statusActive {
          color: #48db9a;
        }

        .statusDanger {
          color: #ef7179;
        }

        .statusMuted {
          color: #717882;
        }

        .statusWaiting {
          color: #d8ba59;
        }

        .empty {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 15px;
          color: #626a74;
        }

        .emptyIcon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: rgba(229, 196, 91, 0.06);
          color: #b69b4c;
          margin-bottom: 10px;
        }

        .emptyTitle {
          color: #b8bdc4;
          font-size: 11px;
          font-weight: 800;
        }

        .emptyText {
          max-width: 320px;
          color: #535b65;
          font-size: 8px;
          line-height: 2;
          margin-top: 6px;
        }

        .performance {
          min-height: 100%;
        }

        .circleWrap {
          display: flex;
          justify-content: center;
          padding: 13px 0 18px;
        }

        .circle {
          width: 174px;
          height: 174px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background:
            conic-gradient(
              #35d49a ${winRate}%,
              rgba(255, 255, 255, 0.055) ${winRate}% 100%
            );
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.22);
        }

        .circle::before {
          content: "";
          position: absolute;
          inset: 11px;
          border-radius: 50%;
          background: #0c1117;
          border: 1px solid rgba(255, 255, 255, 0.045);
        }

        .circleText {
          position: relative;
          text-align: center;
        }

        .circleNumber {
          font-size: 32px;
          font-weight: 900;
          color: #4ade9b;
          direction: ltr;
        }

        .circleLabel {
          color: #5e6670;
          font-size: 8px;
          margin-top: 3px;
        }

        .performanceBoxes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .performanceBox {
          border-radius: 13px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .performanceBoxLabel {
          color: #555d67;
          font-size: 8px;
        }

        .performanceBoxValue {
          margin-top: 6px;
          font-size: 18px;
          font-weight: 900;
          direction: ltr;
          text-align: right;
        }

        .performanceBoxValue.green {
          color: #4ade9b;
        }

        .performanceBoxValue.red {
          color: #ef727b;
        }

        .fullButton {
          margin-top: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 37px;
          border-radius: 10px;
          border: 1px solid rgba(229, 196, 91, 0.14);
          color: #ddc15e;
          background: rgba(229, 196, 91, 0.05);
          text-decoration: none;
          font-size: 8px;
          font-weight: 900;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 9px;
        }

        .quickItem {
          text-decoration: none;
          min-height: 92px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          padding: 13px;
          color: #b9bec5;
          transition:
            transform 0.2s ease,
            border 0.2s ease,
            background 0.2s ease;
        }

        .quickItem:hover {
          transform: translateY(-2px);
          border-color: rgba(229, 196, 91, 0.15);
          background: rgba(255, 255, 255, 0.04);
        }

        .quickIcon {
          width: 33px;
          height: 33px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ddbf5d;
          background: rgba(229, 196, 91, 0.07);
          margin-bottom: 13px;
        }

        .quickTitle {
          font-size: 9px;
          font-weight: 800;
        }

        .bottomGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .serviceList {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .service {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 45px;
          padding: 0 12px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.045);
        }

        .serviceName {
          color: #9ca2aa;
          font-size: 9px;
        }

        .serviceStatus {
          color: #46d998;
          font-size: 8px;
          font-weight: 900;
        }

        .planBox {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(229, 196, 91, 0.09);
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(229, 196, 91, 0.08),
              transparent 40%
            ),
            rgba(255, 255, 255, 0.025);
        }

        .planName {
          font-size: 22px;
          font-weight: 900;
          color: #e5c45b;
          direction: ltr;
          text-align: right;
        }

        .planText {
          color: #555d67;
          font-size: 8px;
          margin-top: 4px;
        }

        .footer {
          color: #3f464f;
          font-size: 8px;
          text-align: center;
          padding: 20px 0 5px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          margin-top: 20px;
        }

        @media (max-width: 1180px) {
          .sidebar {
            width: 245px;
            flex-basis: 245px;
          }

          .page {
            padding: 20px;
          }

          .marketGrid {
            grid-template-columns: repeat(3, 1fr);
          }

          .quickGrid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }

          .mobileMenu {
            display: block;
          }

          .mobileMenu summary {
            list-style: none;
            cursor: pointer;
          }

          .mobileMenu summary::-webkit-details-marker {
            display: none;
          }

          .mobileMenuPanel {
            position: absolute;
            top: 65px;
            right: 12px;
            left: 12px;
            padding: 12px;
            border: 1px solid rgba(229, 196, 91, 0.12);
            border-radius: 17px;
            background: rgba(10, 14, 19, 0.98);
            backdrop-filter: blur(20px);
            z-index: 100;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.5);
          }

          .mobileMenuList {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
          }

          .mobileMenuItem {
            text-decoration: none;
            color: #969da5;
            border-radius: 11px;
            padding: 11px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 9px;
          }

          .mobileMenuItem:hover {
            background: rgba(255, 255, 255, 0.04);
            color: #e5c45b;
          }

          .topbar {
            height: 65px;
            padding: 0 14px;
          }

          .welcomeTitle {
            font-size: 13px;
          }

          .welcomeSmall {
            font-size: 8px;
          }

          .topButton {
            display: none;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .mainGrid {
            grid-template-columns: 1fr;
          }

          .quickGrid {
            grid-template-columns: repeat(3, 1fr);
          }

          .bottomGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 13px 11px 24px;
          }

          .announcement {
            padding: 14px;
          }

          .announcementInner {
            align-items: flex-start;
            flex-direction: column;
          }

          .announcementText {
            max-width: 100%;
          }

          .goldButton {
            width: 100%;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .statCard {
            min-height: 105px;
            padding: 12px;
          }

          .statValue {
            font-size: 21px;
            margin-top: 12px;
          }

          .statIcon {
            width: 31px;
            height: 31px;
          }

          .marketGrid {
            grid-template-columns: 1fr 1fr;
          }

          .panel {
            padding: 12px;
          }

          .signalMain {
            align-items: flex-start;
          }

          .signalValues {
            grid-template-columns: 1fr 1fr 1fr;
          }

          .quickGrid {
            grid-template-columns: 1fr 1fr;
          }

          .quickItem {
            min-height: 82px;
          }

          .circle {
            width: 150px;
            height: 150px;
          }

          .circleNumber {
            font-size: 27px;
          }

          .mobileMenuList {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <div className="app">

        {/* ================= SIDEBAR ================= */}

        <aside className="sidebar">

          <div className="brand">
            <div className="brandLogo">
              <span>TA</span>
            </div>

            <div>
              <div className="brandTitle">
                TRADING AI
              </div>

              <div className="brandSub">
                SMART TRADING PLATFORM
              </div>
            </div>
          </div>

          <div className="profileMini">
            <div className="profileRow">

              <div className="avatar">
                {name.slice(0, 1).toUpperCase()}
              </div>

              <div className="profileText">
                <div className="profileName">
                  {user.name || "کاربر"}
                </div>

                <div className="profileEmail">
                  {user.email}
                </div>

                <div className="online">
                  <span className="onlineDot" />
                  سیستم فعال است
                </div>
              </div>

            </div>
          </div>

          <div className="menuSection">
            اصلی
          </div>

          <nav className="menu">
            <MenuItem
              href="/dashboard"
              icon="home"
              label="خانه"
              active
            />

            <MenuItem
              href="/market"
              icon="market"
              label="بازار زنده"
            />

            <MenuItem
              href="/signals"
              icon="signal"
              label="سیگنال‌ها"
            />

            <MenuItem
              href="/bots"
              icon="bot"
              label="ربات‌های معاملاتی"
            />

            <MenuItem
              href="/performance"
              icon="chart"
              label="عملکرد"
            />

            <MenuItem
              href="/trades"
              icon="trade"
              label="معاملات"
            />
          </nav>

          <div className="menuSection">
            اطلاعات بازار
          </div>

          <nav className="menu">
            <MenuItem
              href="/news"
              icon="news"
              label="اخبار"
            />

            <MenuItem
              href="/economic"
              icon="calendar"
              label="تقویم اقتصادی"
            />
          </nav>

          <div className="menuSection">
            اتصال و خدمات
          </div>

          <nav className="menu">
            <MenuItem
              href="/broker"
              icon="broker"
              label="اتصال به بروکر"
            />

            <MenuItem
              href="/metatrader"
              icon="trade"
              label="اتصال به متاتریدر"
            />

            <MenuItem
              href="/telegram"
              icon="telegram"
              label="تلگرام و اعلان‌ها"
            />

            <MenuItem
              href="/subscriptions"
              icon="subscription"
              label="اشتراک‌ها"
            />

            <MenuItem
              href="/support"
              icon="support"
              label="پشتیبانی"
            />
          </nav>

          <div className="menuSection">
            حساب
          </div>

          <nav className="menu">
            <MenuItem
              href="/profile"
              icon="profile"
              label="پروفایل"
            />

            <MenuItem
              href="/settings"
              icon="settings"
              label="تنظیمات"
            />

            <MenuItem
              href="/api/auth/logout"
              icon="logout"
              label="خروج"
            />
          </nav>

          <div className="supportMini">
            <div className="supportTitle">
              پشتیبانی ۲۴/۷
            </div>

            <div className="supportText">
              اگر در استفاده از پنل یا سیگنال‌ها مشکلی دارید،
              از بخش پشتیبانی تیکت ارسال کنید.
            </div>

            <Link
              href="/support"
              className="supportButton"
            >
              ایجاد تیکت جدید
            </Link>
          </div>

        </aside>

        {/* ================= CONTENT ================= */}

        <section className="content">

          <header className="topbar">

            <div>
              <div className="welcomeSmall">
                پنل مدیریت معاملات هوشمند
              </div>

              <div className="welcomeTitle">
                سلام، {name} 👋
              </div>
            </div>

            <div className="topActions">

              <Link
                href="/settings"
                className="topButton"
              >
                <Icon name="settings" size={15} />
                تنظیمات
              </Link>

              <Link
                href="/profile"
                className="topButton"
              >
                <Icon name="profile" size={15} />
                پروفایل
              </Link>

              <Link
                href="/notifications"
                className="notification"
                aria-label="اعلان‌ها"
              >
                <Icon name="bell" size={17} />
                <span className="notificationDot" />
              </Link>

              <details className="mobileMenu">
                <summary className="notification">
                  <Icon name="menu" size={18} />
                </summary>

                <div className="mobileMenuPanel">

                  <div className="mobileMenuList">

                    <Link
                      href="/dashboard"
                      className="mobileMenuItem"
                    >
                      <Icon name="home" size={15} />
                      خانه
                    </Link>

                    <Link
                      href="/market"
                      className="mobileMenuItem"
                    >
                      <Icon name="market" size={15} />
                      بازار زنده
                    </Link>

                    <Link
                      href="/signals"
                      className="mobileMenuItem"
                    >
                      <Icon name="signal" size={15} />
                      سیگنال‌ها
                    </Link>

                    <Link
                      href="/bots"
                      className="mobileMenuItem"
                    >
                      <Icon name="bot" size={15} />
                      ربات‌ها
                    </Link>

                    <Link
                      href="/news"
                      className="mobileMenuItem"
                    >
                      <Icon name="news" size={15} />
                      اخبار
                    </Link>

                    <Link
                      href="/broker"
                      className="mobileMenuItem"
                    >
                      <Icon name="broker" size={15} />
                      بروکر
                    </Link>

                    <Link
                      href="/telegram"
                      className="mobileMenuItem"
                    >
                      <Icon name="telegram" size={15} />
                      تلگرام
                    </Link>

                    <Link
                      href="/subscriptions"
                      className="mobileMenuItem"
                    >
                      <Icon name="subscription" size={15} />
                      اشتراک
                    </Link>

                    <Link
                      href="/support"
                      className="mobileMenuItem"
                    >
                      <Icon name="support" size={15} />
                      پشتیبانی
                    </Link>

                    <Link
                      href="/profile"
                      className="mobileMenuItem"
                    >
                      <Icon name="profile" size={15} />
                      پروفایل
                    </Link>

                    <Link
                      href="/settings"
                      className="mobileMenuItem"
                    >
                      <Icon name="settings" size={15} />
                      تنظیمات
                    </Link>

                    <Link
                      href="/api/auth/logout"
                      className="mobileMenuItem"
                    >
                      <Icon name="logout" size={15} />
                      خروج
                    </Link>

                  </div>

                </div>
              </details>

            </div>
          </header>

          <div className="page">

            {/* ================= ANNOUNCEMENT ================= */}

            <section className="announcement">

              <div className="announcementInner">

                <div>
                  <div className="announcementLabel">
                    <Icon name="spark" size={14} />
                    اطلاعیه مهم
                  </div>

                  <div className="announcementTitle">
                    موتور تحلیل و مدیریت سیگنال‌ها فعال است
                  </div>

                  <div className="announcementText">
                    آخرین وضعیت ربات‌ها، سیگنال‌های ثبت‌شده و عملکرد
                    حساب خود را از همین داشبورد مشاهده کنید.
                  </div>
                </div>

                <Link
                  href="/signals"
                  className="goldButton"
                >
                  مشاهده سیگنال‌ها
                  <Icon name="arrow" size={14} />
                </Link>

              </div>

            </section>

            {/* ================= STATS ================= */}

            <section className="stats">

              <div className="card statCard">
                <div className="statTop">
                  <span className="statLabel">
                    ربات‌های فعال
                  </span>

                  <span className="statIcon">
                    <Icon name="bot" size={17} />
                  </span>
                </div>

                <div className="statValue">
                  {activeBots}
                </div>

                <div className="statBottom">
                  از {totalBots} ربات ثبت‌شده
                </div>
              </div>

              <div className="card statCard">
                <div className="statTop">
                  <span className="statLabel">
                    سیگنال‌های فعال
                  </span>

                  <span className="statIcon">
                    <Icon name="signal" size={17} />
                  </span>
                </div>

                <div className="statValue">
                  {activeSignals}
                </div>

                <div className="statBottom">
                  در حال پیگیری
                </div>
              </div>

              <div className="card statCard">
                <div className="statTop">
                  <span className="statLabel">
                    کل سیگنال‌ها
                  </span>

                  <span className="statIcon">
                    <Icon name="chart" size={17} />
                  </span>
                </div>

                <div className="statValue">
                  {totalSignals}
                </div>

                <div className="statBottom">
                  ثبت‌شده در حساب
                </div>
              </div>

              <div className="card statCard">
                <div className="statTop">
                  <span className="statLabel">
                    نرخ موفقیت
                  </span>

                  <span className="statIcon">
                    %
                  </span>
                </div>

                <div className="statValue goldText">
                  {winRate}%
                </div>

                <div className="statBottom">
                  بر اساس سیگنال‌های تکمیل‌شده
                </div>
              </div>

            </section>

            {/* ================= LIVE MARKET ================= */}

            <section className="section">

              <div className="card marketCard">

                <div className="sectionHeader">

                  <div>
                    <div className="sectionTitle">
                      بازار زنده
                    </div>

                    <div className="sectionSubtitle">
                      نمایش نمادهای تحت نظر سیستم تحلیل
                    </div>
                  </div>

                  <Link
                    href="/market"
                    className="sectionLink"
                  >
                    مشاهده بازار ←
                  </Link>

                </div>

                <div className="marketGrid">

                  {[
                    "XAUUSD",
                    "EURUSD",
                    "GBPUSD",
                    "USDJPY",
                    "BTCUSDT",
                    "ETHUSDT",
                  ].map((symbol) => (
                    <div
                      key={symbol}
                      className="marketItem"
                    >
                      <div className="marketSymbol">
                        {symbol}
                      </div>

                      <div className="marketPrice">
                        —
                      </div>

                      <div className="marketWaiting">
                        در انتظار داده زنده
                      </div>
                    </div>
                  ))}

                </div>

              </div>

            </section>

            {/* ================= SIGNALS + PERFORMANCE ================= */}

            <section className="mainGrid">

              <div className="card panel">

                <div className="sectionHeader">

                  <div>
                    <div className="sectionTitle">
                      آخرین سیگنال‌ها
                    </div>

                    <div className="sectionSubtitle">
                      آخرین سیگنال‌های ثبت‌شده برای حساب شما
                    </div>
                  </div>

                  <Link
                    href="/signals"
                    className="sectionLink"
                  >
                    مشاهده همه ←
                  </Link>

                </div>

                {signals.length === 0 ? (
                  <div className="empty">

                    <div className="emptyIcon">
                      <Icon name="signal" size={22} />
                    </div>

                    <div className="emptyTitle">
                      هنوز سیگنالی ثبت نشده است
                    </div>

                    <div className="emptyText">
                      وقتی موتور تحلیل یک سیگنال معتبر ایجاد کند،
                      اطلاعات آن در این قسمت نمایش داده خواهد شد.
                    </div>

                    <Link
                      href="/signals"
                      className="fullButton"
                      style={{
                        width: "180px",
                        marginTop: "15px",
                      }}
                    >
                      ورود به بخش سیگنال‌ها
                    </Link>

                  </div>
                ) : (
                  <div className="signalList">

                    {signals.map((signal) => {
                      const direction = signalDirection(
                        signal.direction,
                      );

                      const status = signalStatus(
                        signal.status,
                      );

                      return (
                        <div
                          key={signal.id}
                          className="signalRow"
                        >

                          <div className="signalMain">

                            <div className="signalIdentity">

                              <div
                                className={`signalIcon ${direction.className}`}
                              >
                                {direction.icon}
                              </div>

                              <div>
                                <div className="signalSymbol">
                                  {signal.symbol}
                                </div>

                                <div className="signalMeta">
                                  <span className="timeframe">
                                    {signal.timeframe || "—"}
                                  </span>

                                  <span>
                                    {formatDate(signal.createdAt)}
                                  </span>
                                </div>
                              </div>

                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                className={`directionBadge ${direction.className}`}
                              >
                                {direction.label}
                              </span>

                              <span
                                className={status.className}
                                style={{
                                  fontSize: "8px",
                                  fontWeight: 800,
                                }}
                              >
                                {status.label}
                              </span>
                            </div>

                          </div>

                          <div className="signalValues">

                            <div className="valueBox">
                              <div className="valueLabel">
                                ENTRY
                              </div>

                              <div className="valueNumber">
                                {price(signal.entry)}
                              </div>
                            </div>

                            <div className="valueBox">
                              <div className="valueLabel">
                                STOP LOSS
                              </div>

                              <div className="valueNumber sl">
                                {price(signal.stopLoss)}
                              </div>
                            </div>

                            <div className="valueBox">
                              <div className="valueLabel">
                                TAKE PROFIT
                              </div>

                              <div className="valueNumber tp">
                                {price(signal.takeProfit)}
                              </div>
                            </div>

                          </div>

                          <div className="signalBottom">

                            <span>
                              Score:{" "}
                              <strong className="goldText">
                                {signal.score !== null &&
                                signal.score !== undefined
                                  ? integer(signal.score)
                                  : "—"}
                              </strong>
                            </span>

                            <span>
                              RR:{" "}
                              <strong className="goldText">
                                {num(signal.riskReward) !== null
                                  ? `${price(signal.riskReward)}R`
                                  : "—"}
                              </strong>
                            </span>

                            <span>
                              Confidence:{" "}
                              <strong>
                                {signal.confidence !== null &&
                                signal.confidence !== undefined
                                  ? integer(signal.confidence)
                                  : "—"}
                              </strong>
                            </span>

                          </div>

                        </div>
                      );
                    })}

                  </div>
                )}

              </div>

              {/* PERFORMANCE */}

              <div className="card panel performance">

                <div className="sectionHeader">

                  <div>
                    <div className="sectionTitle">
                      عملکرد حساب
                    </div>

                    <div className="sectionSubtitle">
                      خلاصه عملکرد سیگنال‌های ثبت‌شده
                    </div>
                  </div>

                  <Link
                    href="/performance"
                    className="sectionLink"
                  >
                    جزئیات
                  </Link>

                </div>

                <div className="circleWrap">

                  <div className="circle">

                    <div className="circleText">

                      <div className="circleNumber">
                        {winRate}%
                      </div>

                      <div className="circleLabel">
                        WIN RATE
                      </div>

                    </div>

                  </div>

                </div>

                <div className="performanceBoxes">

                  <div className="performanceBox">
                    <div className="performanceBoxLabel">
                      سیگنال BUY
                    </div>

                    <div className="performanceBoxValue green">
                      {buyCount}
                    </div>
                  </div>

                  <div className="performanceBox">
                    <div className="performanceBoxLabel">
                      سیگنال SELL
                    </div>

                    <div className="performanceBoxValue red">
                      {sellCount}
                    </div>
                  </div>

                </div>

                <Link
                  href="/performance"
                  className="fullButton"
                >
                  مشاهده عملکرد کامل
                </Link>

              </div>

            </section>

            {/* ================= QUICK ACCESS ================= */}

            <section className="section">

              <div className="sectionHeader">
                <div>
                  <div className="sectionTitle">
                    دسترسی سریع
                  </div>

                  <div className="sectionSubtitle">
                    بخش‌های اصلی پلتفرم
                  </div>
                </div>
              </div>

              <div className="quickGrid">

                <Link
                  href="/signals"
                  className="quickItem"
                >
                  <div className="quickIcon">
                    <Icon name="signal" size={17} />
                  </div>

                  <div className="quickTitle">
                    سیگنال‌ها
                  </div>
                </Link>

                <Link
                  href="/bots"
                  className="quickItem"
                >
                  <div className="quickIcon">
                    <Icon name="bot" size={17} />
                  </div>

                  <div className="quickTitle">
                    ربات‌های معاملاتی
                  </div>
                </Link>

                <Link
                  href="/trades"
                  className="quickItem"
                >
                  <div className="quickIcon">
                    <Icon name="trade" size={17} />
                  </div>

                  <div className="quickTitle">
                    معاملات
                  </div>
                </Link>

                <Link
                  href="/market"
                  className="quickItem"
                >
                  <div className="quickIcon">
                    <Icon name="market" size={17} />
                  </div>

                  <div className="quickTitle">
                    بازار زنده
                  </div>
                </Link>

                <Link
                  href="/broker"
                  className="quickItem"
                >
                  <div className="quickIcon">
                    <Icon name="broker" size={17} />
                  </div>

                  <div className="quickTitle">
                    اتصال بروکر
                  </div>
                </Link>

                <Link
                  href="/telegram"
                  className="quickItem"
                >
                  <div className="quickIcon">
                    <Icon name="telegram" size={17} />
                  </div>

                  <div className="quickTitle">
                    Telegram
                  </div>
                </Link>

              </div>

            </section>

            {/* ================= SERVICES ================= */}

            <section className="section bottomGrid">

              <div className="card panel">

                <div className="sectionHeader">
                  <div>
                    <div className="sectionTitle">
                      وضعیت سیستم
                    </div>

                    <div className="sectionSubtitle">
                      وضعیت سرویس‌های حساب
                    </div>
                  </div>
                </div>

                <div className="serviceList">

                  <div className="service">
                    <span className="serviceName">
                      حساب کاربری
                    </span>

                    <span className="serviceStatus">
                      فعال
                    </span>
                  </div>

                  <div className="service">
                    <span className="serviceName">
                      موتور سیگنال
                    </span>

                    <span className="serviceStatus">
                      آماده
                    </span>
                  </div>

                  <div className="service">
                    <span className="serviceName">
                      ربات‌های فعال
                    </span>

                    <span className="serviceStatus">
                      {activeBots} فعال
                    </span>
                  </div>

                  <div className="service">
                    <span className="serviceName">
                      Telegram
                    </span>

                    <Link
                      href="/telegram"
                      className="sectionLink"
                    >
                      مدیریت اتصال
                    </Link>
                  </div>

                </div>

              </div>

              <div className="card panel">

                <div className="sectionHeader">
                  <div>
                    <div className="sectionTitle">
                      اشتراک و دسترسی
                    </div>

                    <div className="sectionSubtitle">
                      وضعیت پلن حساب کاربری
                    </div>
                  </div>

                  <Icon name="subscription" size={18} />
                </div>

                <div className="planBox">

                  <div className="planName">
                    {user.plan || "FREE"}
                  </div>

                  <div className="planText">
                    پلن فعلی حساب شما
                  </div>

                  <Link
                    href="/subscriptions"
                    className="fullButton"
                  >
                    مدیریت اشتراک
                  </Link>

                </div>

              </div>

            </section>

            <footer className="footer">
              © Trading AI Platform — Smart Trading System
            </footer>

          </div>

        </section>

      </div>
    </main>
  );
}
