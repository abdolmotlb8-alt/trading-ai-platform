import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type IconName =
  | "dashboard"
  | "signals"
  | "bots"
  | "market"
  | "wallet"
  | "settings"
  | "bell"
  | "chart"
  | "trade"
  | "shield"
  | "news"
  | "support"
  | "arrow"
  | "menu"
  | "spark"
  | "user"
  | "activity"
  | "refresh";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
      );

    case "signals":
      return (
        <svg {...common}>
          <path
            d="M4 17L9 12L13 15L20 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 7H20V11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "bots":
      return (
        <svg {...common}>
          <rect
            x="5"
            y="6"
            width="14"
            height="12"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 3V6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <path
            d="M9 15H15"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case "market":
      return (
        <svg {...common}>
          <path
            d="M4 19V5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M4 19H21"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M7 15L10 11L13 13L18 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path
            d="M4 7.5C4 6.12 5.12 5 6.5 5H19V19H6.5C5.12 19 4 17.88 4 16.5V7.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M4 8H18" stroke="currentColor" strokeWidth="1.7" />
          <path d="M16 13H20" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="16" cy="13" r="1" fill="currentColor" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="3.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M19 13.5L21 14.7L19.1 18L17.1 16.8C16.5 17.3 15.8 17.6 15 17.9V20H9V17.9C8.2 17.6 7.5 17.3 6.9 16.8L4.9 18L3 14.7L5 13.5C4.8 13 4.7 12.5 4.7 12C4.7 11.5 4.8 11 5 10.5L3 9.3L4.9 6L6.9 7.2C7.5 6.7 8.2 6.4 9 6.1V4H15V6.1C15.8 6.4 16.5 6.7 17.1 7.2L19.1 6L21 9.3L19 10.5C19.2 11 19.3 11.5 19.3 12C19.3 12.5 19.2 13 19 13.5Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path
            d="M18 9.5C18 6.2 15.8 4 12 4C8.2 4 6 6.2 6 9.5C6 14 4.5 16 4.5 16H19.5C19.5 16 18 14 18 9.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M10 19C10.5 20 11.2 20.5 12 20.5C12.8 20.5 13.5 20 14 19"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path
            d="M4 19V5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M4 19H21"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M7 15L10 12L13 14L18 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "trade":
      return (
        <svg {...common}>
          <path
            d="M5 7H19"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M5 12H15"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M5 17H12"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle
            cx="18"
            cy="17"
            r="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path
            d="M12 3L19 6V11.5C19 16 16.2 19.3 12 21C7.8 19.3 5 16 5 11.5V6L12 3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M9 12L11 14L15 9.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "news":
      return (
        <svg {...common}>
          <path
            d="M5 4H19V20H5C4.45 20 4 19.55 4 19V5C4 4.45 4.45 4 5 4Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M8 8H16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M8 12H16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M8 16H13"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path
            d="M5 13V11C5 7.13 8.13 4 12 4C15.87 4 19 7.13 19 11V13"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M5 13H8V18H6.5C5.67 18 5 17.33 5 16.5V13Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M19 13H16V18H17.5C18.33 18 19 17.33 19 16.5V13Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M16 19C15 20 13.8 20.5 12 20.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path
            d="M5 12H19"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M13 6L19 12L13 18"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path
            d="M4 7H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 12H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 17H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path
            d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3.2"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M5 20C5.7 16.5 8 14.5 12 14.5C16 14.5 18.3 16.5 19 20"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path
            d="M3 12H7L9.5 6L14 18L16.5 12H21"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path
            d="M20 11A8 8 0 0 0 6.4 5.2L4 7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M4 4V7.5H7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 13A8 8 0 0 0 17.6 18.8L20 16.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M20 20V16.5H16.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value)} $`;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function directionLabel(direction: string) {
  const value = direction.toUpperCase();

  if (value === "BUY" || value === "LONG") return "خرید";
  if (value === "SELL" || value === "SHORT") return "فروش";

  return direction;
}

function directionClass(direction: string) {
  const value = direction.toUpperCase();

  if (value === "BUY" || value === "LONG") return "buy";
  if (value === "SELL" || value === "SHORT") return "sell";

  return "neutral";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    WAITING: "در انتظار",
    ACTIVE: "فعال",
    OPEN: "باز",
    CLOSED: "بسته",
    COMPLETED: "تکمیل‌شده",
    EXPIRED: "منقضی",
    CANCELLED: "لغو شده",
    CANCELED: "لغو شده",
  };

  return map[status.toUpperCase()] || status;
}

function buildChart(
  values: number[],
  width = 900,
  height = 300,
  padding = 26
) {
  if (values.length < 2) {
    return {
      line: "",
      area: "",
      min: 0,
      max: 0,
    };
  }

  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);

  const range = maxValue - minValue || 1;

  const points = values.map((value, index) => {
    const x =
      padding +
      (index / Math.max(values.length - 1, 1)) *
        (width - padding * 2);

    const y =
      height -
      padding -
      ((value - minValue) / range) *
        (height - padding * 2);

    return {
      x,
      y,
    };
  });

  const line = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(
        2
      )} ${point.y.toFixed(2)}`;
    })
    .join(" ");

  const area =
    `${line} ` +
    `L ${points[points.length - 1].x.toFixed(2)} ${
      height - padding
    } ` +
    `L ${points[0].x.toFixed(2)} ${height - padding} Z`;

  return {
    line,
    area,
    min: minValue,
    max: maxValue,
  };
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
    botsCount,
    activeBotsCount,
    signalsCount,
    tradesCount,
    openTradesCount,
    closedTradesCount,
    winningTradesCount,
    losingTradesCount,
    recentSignals,
    recentClosedTrades,
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
        closedAt: {
          not: null,
        },
      },
    }),

    prisma.trade.count({
      where: {
        userId: user.id,
        closedAt: {
          not: null,
        },
        profitLoss: {
          gt: 0,
        },
      },
    }),

    prisma.trade.count({
      where: {
        userId: user.id,
        closedAt: {
          not: null,
        },
        profitLoss: {
          lt: 0,
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
      take: 8,
      select: {
        id: true,
        symbol: true,
        timeframe: true,
        direction: true,
        entry: true,
        takeProfit: true,
        stopLoss: true,
        riskReward: true,
        score: true,
        confidence: true,
        status: true,
        source: true,
        createdAt: true,
      },
    }),

    prisma.trade.findMany({
      where: {
        userId: user.id,
        closedAt: {
          not: null,
        },
        profitLoss: {
          not: null,
        },
      },
      orderBy: {
        closedAt: "asc",
      },
      take: 60,
      select: {
        id: true,
        profitLoss: true,
        closedAt: true,
      },
    }),
  ]);

  const totalProfitLoss = recentClosedTrades.reduce(
    (sum, trade) => sum + Number(trade.profitLoss ?? 0),
    0
  );

  const chartValues: number[] = [];
  let runningPnl = 0;

  for (const trade of recentClosedTrades) {
    runningPnl += Number(trade.profitLoss ?? 0);
    chartValues.push(runningPnl);
  }

  const chart = buildChart(chartValues);

  const winRate =
    closedTradesCount > 0
      ? (winningTradesCount / closedTradesCount) * 100
      : 0;

  const firstName =
    user.name?.trim()?.split(" ")[0] || "کاربر";

  const initial =
    firstName.charAt(0).toUpperCase() || "U";

  const isAdmin = user.role === "ADMIN";

  return (
    <main dir="rtl" className="trading-shell">
      <style>{`
        :root {
          --gold: #d6ad55;
          --gold-2: #f2d27c;
          --gold-3: #8b6827;

          --black: #030303;
          --black-2: #080808;

          --panel: rgba(15,15,15,.88);
          --panel-2: rgba(10,10,10,.94);

          --border: rgba(214,173,85,.19);
          --border-soft: rgba(255,255,255,.075);

          --text: #f5f1e7;
          --muted: #969188;
          --muted-2: #6f6a61;

          --green: #48d597;
          --red: #ff6868;
          --blue: #72a9ff;
        }

        * {
          box-sizing: border-box;
        }

        html {
          background: #030303;
        }

        body {
          margin: 0;
          background: #030303;
          color: var(--text);
          font-family:
            Tahoma,
            Arial,
            "Segoe UI",
            sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .trading-shell {
          min-height: 100vh;
          width: 100%;
          background:
            radial-gradient(
              circle at 82% 0%,
              rgba(214,173,85,.11),
              transparent 28rem
            ),
            radial-gradient(
              circle at 8% 32%,
              rgba(214,173,85,.045),
              transparent 24rem
            ),
            #030303;
          overflow-x: hidden;
        }

        .page {
          width: min(1440px, calc(100% - 36px));
          margin: 0 auto;
          padding: 18px 0 45px;
        }

        .topbar {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 11px 16px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: rgba(10,10,10,.84);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 22px 80px rgba(0,0,0,.48),
            inset 0 1px 0 rgba(255,255,255,.035);
          position: sticky;
          top: 12px;
          z-index: 50;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 220px;
        }

        .brand-mark {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #080808;
          background:
            linear-gradient(
              145deg,
              #f5d986,
              #c39234
            );
          box-shadow:
            0 0 28px rgba(214,173,85,.23),
            inset 0 1px 0 rgba(255,255,255,.62);
          font-weight: 950;
          font-size: 16px;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 950;
          letter-spacing: .6px;
        }

        .brand-sub {
          color: var(--muted);
          font-size: 9px;
          margin-top: 4px;
          letter-spacing: .4px;
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 12px;
          border-radius: 12px;
          color: #aaa69d;
          font-size: 12px;
          white-space: nowrap;
          transition: .2s ease;
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--gold-2);
          background: rgba(214,173,85,.085);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-button {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #cec8b9;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.08);
        }

        .icon-button:hover {
          color: var(--gold-2);
          border-color: var(--border);
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 7px 5px 5px;
          border: 1px solid rgba(214,173,85,.16);
          border-radius: 15px;
          background: rgba(255,255,255,.025);
        }

        .avatar {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #080808;
          font-weight: 950;
          background:
            linear-gradient(
              145deg,
              #f4d780,
              #a97925
            );
        }

        .profile-text {
          display: flex;
          flex-direction: column;
          min-width: 80px;
        }

        .profile-name {
          font-size: 11px;
          font-weight: 850;
        }

        .profile-plan {
          color: var(--muted);
          font-size: 9px;
          margin-top: 2px;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          margin-right: 6px;
          padding: 3px 6px;
          border-radius: 6px;
          color: var(--gold-2);
          background: rgba(214,173,85,.08);
          border: 1px solid rgba(214,173,85,.15);
          font-size: 8px;
        }

        .mobile-nav {
          display: none;
        }

        .hero {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1.42fr .78fr;
          gap: 16px;
        }

        .hero-main,
        .hero-side,
        .glass-card {
          border: 1px solid var(--border);
          background:
            linear-gradient(
              145deg,
              rgba(23,23,23,.92),
              rgba(7,7,7,.94)
            );
          box-shadow:
            0 22px 70px rgba(0,0,0,.43),
            inset 0 1px 0 rgba(255,255,255,.035);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .hero-main {
          min-height: 300px;
          border-radius: 25px;
          padding: 34px;
          position: relative;
          overflow: hidden;
        }

        .hero-main:after {
          content: "";
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: rgba(214,173,85,.07);
          filter: blur(45px);
          left: -150px;
          bottom: -190px;
          pointer-events: none;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--gold-2);
          font-size: 12px;
          font-weight: 850;
          margin-bottom: 14px;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold);
          box-shadow: 0 0 14px rgba(214,173,85,.75);
        }

        .hero-title {
          font-size: clamp(28px, 4vw, 48px);
          line-height: 1.28;
          margin: 0;
          max-width: 760px;
          font-weight: 950;
          letter-spacing: -.8px;
        }

        .hero-title span {
          color: var(--gold-2);
        }

        .hero-description {
          max-width: 700px;
          margin: 16px 0 0;
          color: #aaa69e;
          line-height: 2;
          font-size: 13px;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .primary-button,
        .secondary-button {
          min-height: 45px;
          padding: 0 18px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 850;
          transition: .2s ease;
        }

        .primary-button {
          color: #090909;
          background:
            linear-gradient(
              135deg,
              #f1d37d,
              #b98127
            );
          box-shadow: 0 12px 30px rgba(214,173,85,.16);
        }

        .primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(214,173,85,.25);
        }

        .secondary-button {
          color: #ded8c9;
          border: 1px solid rgba(214,173,85,.20);
          background: rgba(255,255,255,.025);
        }

        .secondary-button:hover {
          color: var(--gold-2);
          border-color: rgba(214,173,85,.42);
        }

        .hero-side {
          border-radius: 25px;
          padding: 22px;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-title {
          margin: 0;
          font-size: 16px;
          font-weight: 950;
        }

        .section-caption {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.7;
        }

        .system-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #8fe6bd;
          font-size: 10px;
          white-space: nowrap;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 12px rgba(72,213,151,.65);
        }

        .mini-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .mini-stat {
          min-height: 100px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          border-radius: 16px;
          padding: 14px;
        }

        .mini-stat-label {
          color: #98938a;
          font-size: 10px;
        }

        .mini-stat-value {
          margin-top: 12px;
          font-size: 24px;
          font-weight: 950;
          color: #f2eee5;
        }

        .mini-stat-note {
          margin-top: 4px;
          color: #706c64;
          font-size: 9px;
        }

        .stats {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
        }

        .stat-card {
          min-height: 148px;
          padding: 18px;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: var(--gold-2);
          border: 1px solid rgba(214,173,85,.17);
          background: rgba(214,173,85,.07);
        }

        .stat-label {
          margin-top: 17px;
          color: #9b978d;
          font-size: 11px;
        }

        .stat-value {
          margin-top: 5px;
          font-size: 28px;
          font-weight: 950;
        }

        .stat-description {
          color: #69655d;
          font-size: 9px;
          margin-top: 4px;
        }

        .workspace {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1.38fr .62fr;
          gap: 16px;
        }

        .card {
          border-radius: 22px;
          padding: 20px;
        }

        .chart-box {
          height: 300px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(214,173,85,.11);
          border-radius: 17px;
          background:
            linear-gradient(
              rgba(214,173,85,.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(214,173,85,.035) 1px,
              transparent 1px
            ),
            rgba(0,0,0,.24);
          background-size: 45px 45px;
        }

        .chart-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .chart-empty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
        }

        .chart-empty-inner {
          max-width: 420px;
          padding: 20px 25px;
          border-radius: 18px;
          background: rgba(5,5,5,.72);
          border: 1px solid rgba(214,173,85,.13);
          backdrop-filter: blur(12px);
        }

        .chart-empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: var(--gold-2);
          background: rgba(214,173,85,.07);
          border: 1px solid rgba(214,173,85,.13);
        }

        .chart-empty strong {
          display: block;
          color: var(--gold-2);
          font-size: 15px;
        }

        .chart-empty span {
          display: block;
          margin-top: 8px;
          color: #77736b;
          font-size: 11px;
          line-height: 1.9;
        }

        .chart-summary {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }

        .chart-summary-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .chart-summary-label {
          color: var(--muted);
          font-size: 9px;
        }

        .chart-summary-value {
          font-size: 17px;
          font-weight: 950;
        }

        .positive {
          color: var(--green);
        }

        .negative {
          color: var(--red);
        }

        .quick-list {
          display: grid;
          gap: 9px;
        }

        .quick-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 64px;
          padding: 10px 12px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(255,255,255,.018);
          transition: .2s ease;
        }

        .quick-item:hover {
          border-color: rgba(214,173,85,.25);
          background: rgba(214,173,85,.035);
        }

        .quick-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: var(--gold-2);
          background: rgba(214,173,85,.07);
          border: 1px solid rgba(214,173,85,.12);
        }

        .quick-text {
          flex: 1;
        }

        .quick-title {
          font-size: 11px;
          font-weight: 850;
        }

        .quick-sub {
          color: #716d65;
          font-size: 9px;
          margin-top: 4px;
        }

        .quick-arrow {
          color: #666158;
        }

        .recent {
          margin-top: 16px;
        }

        .recent-card {
          border-radius: 22px;
          padding: 20px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.055);
        }

        .signal-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .signal-table th {
          text-align: right;
          color: #77736a;
          font-size: 10px;
          font-weight: 700;
          padding: 13px 14px;
          background: rgba(255,255,255,.018);
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .signal-table td {
          padding: 14px;
          font-size: 11px;
          color: #ddd8ce;
          border-bottom: 1px solid rgba(255,255,255,.045);
          white-space: nowrap;
        }

        .signal-table tr:last-child td {
          border-bottom: 0;
        }

        .signal-table tbody tr:hover {
          background: rgba(214,173,85,.025);
        }

        .symbol {
          font-weight: 950;
          color: #f1eadc;
        }

        .direction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 54px;
          padding: 6px 9px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 900;
        }

        .direction.buy {
          color: var(--green);
          background: rgba(72,213,151,.08);
          border: 1px solid rgba(72,213,151,.16);
        }

        .direction.sell {
          color: var(--red);
          background: rgba(255,104,104,.08);
          border: 1px solid rgba(255,104,104,.16);
        }

        .direction.neutral {
          color: var(--gold-2);
          background: rgba(214,173,85,.08);
          border: 1px solid rgba(214,173,85,.15);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 9px;
          border-radius: 8px;
          color: #c9c3b7;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.07);
          font-size: 9px;
        }

        .score {
          color: var(--gold-2);
          font-weight: 900;
        }

        .bottom-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .feature-card {
          min-height: 145px;
          border-radius: 20px;
          padding: 19px;
          transition: .2s ease;
        }

        .feature-card:hover {
          transform: translateY(-3px);
          border-color: rgba(214,173,85,.36);
        }

        .feature-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .feature-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: var(--gold-2);
          border: 1px solid rgba(214,173,85,.16);
          background: rgba(214,173,85,.065);
        }

        .feature-arrow {
          color: #5f5a51;
        }

        .feature-title {
          margin: 18px 0 0;
          font-size: 13px;
          font-weight: 900;
        }

        .feature-description {
          margin: 7px 0 0;
          color: #77736b;
          line-height: 1.8;
          font-size: 10px;
        }

        .footer {
          margin-top: 22px;
          padding: 18px 5px 0;
          border-top: 1px solid rgba(255,255,255,.055);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          color: #59564f;
          font-size: 9px;
        }

        .footer-status {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .gold {
          color: var(--gold-2);
        }

        .empty-small {
          padding: 28px 15px;
          text-align: center;
          color: #77736b;
          font-size: 11px;
        }

        @media (max-width: 1150px) {
          .nav-link {
            padding: 10px 8px;
            font-size: 10px;
          }

          .brand {
            min-width: 175px;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .workspace {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 780px) {
          .page {
            width: calc(100% - 14px);
            padding-top: 8px;
          }

          .topbar {
            position: relative;
            top: 0;
            padding: 10px;
            border-radius: 18px;
          }

          .nav {
            display: none;
          }

          .header-actions .icon-button {
            display: none;
          }

          .profile-text {
            display: none;
          }

          .profile {
            padding: 4px;
            border: 0;
            background: transparent;
          }

          .mobile-nav {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-top: 8px;
            padding: 7px;
            border: 1px solid var(--border);
            border-radius: 17px;
            background: rgba(10,10,10,.84);
          }

          .mobile-nav a {
            min-height: 52px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            border-radius: 11px;
            color: #858179;
            font-size: 9px;
          }

          .mobile-nav a:first-child {
            color: var(--gold-2);
            background: rgba(214,173,85,.08);
          }

          .hero {
            margin-top: 9px;
          }

          .hero-main {
            min-height: auto;
            padding: 23px 18px;
            border-radius: 20px;
          }

          .hero-title {
            font-size: 27px;
          }

          .hero-description {
            font-size: 12px;
          }

          .hero-buttons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primary-button,
          .secondary-button {
            width: 100%;
          }

          .hero-side {
            padding: 17px;
            border-radius: 20px;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .stat-card {
            min-height: 135px;
            padding: 14px;
            border-radius: 17px;
          }

          .stat-label {
            font-size: 10px;
          }

          .stat-value {
            font-size: 23px;
          }

          .workspace {
            margin-top: 10px;
          }

          .card,
          .recent-card {
            padding: 15px;
            border-radius: 19px;
          }

          .chart-box {
            height: 235px;
          }

          .bottom-grid {
            margin-top: 10px;
            grid-template-columns: 1fr;
          }

          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 430px) {
          .brand-name {
            font-size: 13px;
          }

          .brand-sub {
            font-size: 8px;
          }

          .brand-mark {
            width: 40px;
            height: 40px;
          }

          .mini-stats {
            grid-template-columns: 1fr 1fr;
          }

          .mini-stat {
            min-height: 92px;
          }

          .mini-stat-value {
            font-size: 20px;
          }

          .hero-title {
            font-size: 24px;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .stat-value {
            font-size: 20px;
          }

          .chart-summary {
            gap: 15px;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <Link href="/dashboard" className="brand">
            <div className="brand-mark">AI</div>

            <div>
              <div className="brand-name">TRADING AI</div>
              <div className="brand-sub">
                SMART TRADING PLATFORM
              </div>
            </div>
          </Link>

          <nav className="nav">
            <Link
              className="nav-link active"
              href="/dashboard"
            >
              <Icon name="dashboard" size={17} />
              داشبورد
            </Link>

            <Link className="nav-link" href="/signals">
              <Icon name="signals" size={17} />
              سیگنال‌ها
            </Link>

            <Link className="nav-link" href="/bots">
              <Icon name="bots" size={17} />
              ربات‌ها
            </Link>

            <Link className="nav-link" href="/market">
              <Icon name="market" size={17} />
              بازار
            </Link>

            <Link className="nav-link" href="/payments">
              <Icon name="wallet" size={17} />
              کیف پول
            </Link>

            <Link className="nav-link" href="/settings">
              <Icon name="settings" size={17} />
              تنظیمات
            </Link>
          </nav>

          <div className="header-actions">
            <Link
              href="/notifications"
              className="icon-button"
              aria-label="اعلان‌ها"
            >
              <Icon name="bell" size={18} />
            </Link>

            <Link href="/profile" className="profile">
              <div className="avatar">{initial}</div>

              <div className="profile-text">
                <span className="profile-name">
                  {firstName}

                  {isAdmin && (
                    <span className="admin-badge">
                      ADMIN
                    </span>
                  )}
                </span>

                <span className="profile-plan">
                  پلن {user.plan || "FREE"}
                </span>
              </div>
            </Link>
          </div>
        </header>

        <nav className="mobile-nav">
          <Link href="/dashboard">
            <Icon name="dashboard" size={18} />
            داشبورد
          </Link>

          <Link href="/signals">
            <Icon name="signals" size={18} />
            سیگنال‌ها
          </Link>

          <Link href="/bots">
            <Icon name="bots" size={18} />
            ربات‌ها
          </Link>

          <Link href="/market">
            <Icon name="market" size={18} />
            بازار
          </Link>
        </nav>

        <section className="hero">
          <div className="hero-main">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              پنل هوشمند معاملات
            </div>

            <h1 className="hero-title">
              سلام {firstName}،
              <br />
              <span>
                داشبورد معاملاتی شما آماده است.
              </span>
            </h1>

            <p className="hero-description">
              این مرکز کنترل Trading AI است؛
              سیگنال‌ها، ربات‌های معاملاتی، معاملات،
              عملکرد واقعی و وضعیت سیستم را از یک
              محیط حرفه‌ای مدیریت کنید.
            </p>

            <div className="hero-buttons">
              <Link
                href="/ai-analysis"
                className="primary-button"
              >
                <Icon name="spark" size={17} />
                شروع تحلیل هوشمند
              </Link>

              <Link
                href="/signals"
                className="secondary-button"
              >
                مشاهده سیگنال‌ها
                <Icon name="arrow" size={16} />
              </Link>

              <Link
                href="/bots"
                className="secondary-button"
              >
                مدیریت ربات‌ها
              </Link>
            </div>
          </div>

          <aside className="hero-side">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  وضعیت سیستم
                </h2>

                <p className="section-caption">
                  آمار واقعی ثبت‌شده در حساب
                </p>
              </div>

              <span className="system-status">
                <span className="status-dot" />
                آنلاین
              </span>
            </div>

            <div className="mini-stats">
              <div className="mini-stat">
                <div className="mini-stat-label">
                  ربات‌ها
                </div>

                <div className="mini-stat-value">
                  {formatNumber(botsCount)}
                </div>

                <div className="mini-stat-note">
                  {formatNumber(activeBotsCount)} ربات فعال
                </div>
              </div>

              <div className="mini-stat">
                <div className="mini-stat-label">
                  سیگنال‌ها
                </div>

                <div className="mini-stat-value">
                  {formatNumber(signalsCount)}
                </div>

                <div className="mini-stat-note">
                  ثبت‌شده در دیتابیس
                </div>
              </div>

              <div className="mini-stat">
                <div className="mini-stat-label">
                  معاملات
                </div>

                <div className="mini-stat-value">
                  {formatNumber(tradesCount)}
                </div>

                <div className="mini-stat-note">
                  {formatNumber(openTradesCount)} معامله باز
                </div>
              </div>

              <div className="mini-stat">
                <div className="mini-stat-label">
                  نرخ برد
                </div>

                <div className="mini-stat-value">
                  {new Intl.NumberFormat("fa-IR", {
                    maximumFractionDigits: 1,
                  }).format(winRate)}
                  ٪
                </div>

                <div className="mini-stat-note">
                  از معاملات بسته‌شده
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="stats">
          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="signals" size={20} />
            </div>

            <div className="stat-label">
              کل سیگنال‌های حساب
            </div>

            <div className="stat-value">
              {formatNumber(signalsCount)}
            </div>

            <div className="stat-description">
              رکورد واقعی TradingSignal
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="bots" size={20} />
            </div>

            <div className="stat-label">
              ربات‌های فعال
            </div>

            <div className="stat-value">
              {formatNumber(activeBotsCount)}
            </div>

            <div className="stat-description">
              از {formatNumber(botsCount)} ربات ثبت‌شده
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="trade" size={20} />
            </div>

            <div className="stat-label">
              معاملات بسته‌شده
            </div>

            <div className="stat-value">
              {formatNumber(closedTradesCount)}
            </div>

            <div className="stat-description">
              {formatNumber(winningTradesCount)} مثبت ·{" "}
              {formatNumber(losingTradesCount)} منفی
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="chart" size={20} />
            </div>

            <div className="stat-label">
              P/L ثبت‌شده
            </div>

            <div
              className={`stat-value ${
                totalProfitLoss > 0
                  ? "positive"
                  : totalProfitLoss < 0
                  ? "negative"
                  : ""
              }`}
            >
              {formatMoney(totalProfitLoss)}
            </div>

            <div className="stat-description">
              بر اساس معاملات دارای P/L
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="glass-card card">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  عملکرد واقعی حساب
                </h2>

                <p className="section-caption">
                  نمودار تجمعی P/L معاملات بسته‌شده
                </p>
              </div>

              <Link
                href="/trades"
                className="secondary-button"
                style={{ minHeight: 36 }}
              >
                مشاهده معاملات
              </Link>
            </div>

            <div className="chart-summary">
              <div className="chart-summary-item">
                <span className="chart-summary-label">
                  P/L
                </span>

                <span
                  className={`chart-summary-value ${
                    totalProfitLoss > 0
                      ? "positive"
                      : totalProfitLoss < 0
                      ? "negative"
                      : ""
                  }`}
                >
                  {formatMoney(totalProfitLoss)}
                </span>
              </div>

              <div className="chart-summary-item">
                <span className="chart-summary-label">
                  معاملات بسته
                </span>

                <span className="chart-summary-value">
                  {formatNumber(closedTradesCount)}
                </span>
              </div>

              <div className="chart-summary-item">
                <span className="chart-summary-label">
                  برد
                </span>

                <span className="chart-summary-value positive">
                  {formatNumber(winningTradesCount)}
                </span>
              </div>

              <div className="chart-summary-item">
                <span className="chart-summary-label">
                  باخت
                </span>

                <span className="chart-summary-value negative">
                  {formatNumber(losingTradesCount)}
                </span>
              </div>
            </div>

            <div className="chart-box">
              {chartValues.length >= 2 ? (
                <svg
                  className="chart-svg"
                  viewBox="0 0 900 300"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="realGoldArea"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#d6ad55"
                        stopOpacity=".25"
                      />

                      <stop
                        offset="100%"
                        stopColor="#d6ad55"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d={chart.area}
                    fill="url(#realGoldArea)"
                  />

                  <path
                    d={chart.line}
                    fill="none"
                    stroke="#d6ad55"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <div className="chart-empty">
                  <div className="chart-empty-inner">
                    <div className="chart-empty-icon">
                      <Icon name="chart" size={23} />
                    </div>

                    <strong>
                      هنوز داده کافی برای نمودار وجود ندارد
                    </strong>

                    <span>
                      این نمودار فقط از P/L واقعی معاملات
                      بسته‌شده ساخته می‌شود. هیچ داده یا خط
                      ساختگی در این قسمت نمایش داده نمی‌شود.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card card">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  دسترسی سریع
                </h2>

                <p className="section-caption">
                  ابزارهای اصلی پلتفرم
                </p>
              </div>
            </div>

            <div className="quick-list">
              <Link
                href="/signals"
                className="quick-item"
              >
                <div className="quick-icon">
                  <Icon name="signals" size={18} />
                </div>

                <div className="quick-text">
                  <div className="quick-title">
                    سیگنال‌های معاملاتی
                  </div>

                  <div className="quick-sub">
                    مشاهده و مدیریت سیگنال‌ها
                  </div>
                </div>

                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>

              <Link
                href="/bots"
                className="quick-item"
              >
                <div className="quick-icon">
                  <Icon name="bots" size={18} />
                </div>

                <div className="quick-text">
                  <div className="quick-title">
                    ربات‌های معاملاتی
                  </div>

                  <div className="quick-sub">
                    مدیریت استراتژی و ربات‌ها
                  </div>
                </div>

                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>

              <Link
                href="/market"
                className="quick-item"
              >
                <div className="quick-icon">
                  <Icon name="market" size={18} />
                </div>

                <div className="quick-text">
                  <div className="quick-title">
                    بازار
                  </div>

                  <div className="quick-sub">
                    داده بازار و تحلیل تکنیکال
                  </div>
                </div>

                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>

              <Link
                href="/news"
                className="quick-item"
              >
                <div className="quick-icon">
                  <Icon name="news" size={18} />
                </div>

                <div className="quick-text">
                  <div className="quick-title">
                    اخبار اقتصادی
                  </div>

                  <div className="quick-sub">
                    اخبار و رویدادهای بازار
                  </div>
                </div>

                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="recent glass-card recent-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                آخرین سیگنال‌ها
              </h2>

              <p className="section-caption">
                آخرین رکوردهای واقعی TradingSignal
              </p>
            </div>

            <Link
              href="/signals"
              className="secondary-button"
              style={{ minHeight: 38 }}
            >
              همه سیگنال‌ها
            </Link>
          </div>

          {recentSignals.length === 0 ? (
            <div className="empty-small">
              هنوز هیچ سیگنالی برای این حساب ثبت نشده است.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="signal-table">
                <thead>
                  <tr>
                    <th>نماد</th>
                    <th>جهت</th>
                    <th>تایم‌فریم</th>
                    <th>ورود</th>
                    <th>حد سود</th>
                    <th>حد ضرر</th>
                    <th>امتیاز</th>
                    <th>وضعیت</th>
                    <th>زمان</th>
                  </tr>
                </thead>

                <tbody>
                  {recentSignals.map((signal) => (
                    <tr key={signal.id}>
                      <td>
                        <span className="symbol">
                          {signal.symbol}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`direction ${directionClass(
                            signal.direction
                          )}`}
                        >
                          {directionLabel(
                            signal.direction
                          )}
                        </span>
                      </td>

                      <td>
                        {signal.timeframe || "—"}
                      </td>

                      <td>
                        {signal.entry !== null &&
                        signal.entry !== undefined
                          ? String(signal.entry)
                          : "—"}
                      </td>

                      <td>
                        {signal.takeProfit !== null &&
                        signal.takeProfit !== undefined
                          ? String(signal.takeProfit)
                          : "—"}
                      </td>

                      <td>
                        {signal.stopLoss !== null &&
                        signal.stopLoss !== undefined
                          ? String(signal.stopLoss)
                          : "—"}
                      </td>

                      <td>
                        <span className="score">
                          {signal.score !== null &&
                          signal.score !== undefined
                            ? `${signal.score}%`
                            : "—"}
                        </span>
                      </td>

                      <td>
                        <span className="status-pill">
                          {statusLabel(signal.status)}
                        </span>
                      </td>

                      <td>
                        {formatDate(signal.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bottom-grid">
          <Link
            href="/ai-analysis"
            className="glass-card feature-card"
          >
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="spark" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">
              تحلیل هوش مصنوعی
            </h3>

            <p className="feature-description">
              بررسی ساختار بازار، روند، نقاط مهم و
              داده‌های تحلیلی.
            </p>
          </Link>

          <Link
            href="/bots"
            className="glass-card feature-card"
          >
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="bots" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">
              مدیریت ربات‌ها
            </h3>

            <p className="feature-description">
              تنظیم ریسک، حد ضرر، حد سود، فیلتر خبر
              و شرایط اجرای ربات.
            </p>
          </Link>

          <Link
            href="/signals"
            className="glass-card feature-card"
          >
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="shield" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">
              مرکز سیگنال‌ها
            </h3>

            <p className="feature-description">
              سیگنال‌های واقعی ثبت‌شده توسط سیستم و
              وضعیت پردازش آن‌ها.
            </p>
          </Link>

          <Link
            href="/economic"
            className="glass-card feature-card"
          >
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="news" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">
              تقویم اقتصادی
            </h3>

            <p className="feature-description">
              رویدادهای اقتصادی مهم و ابزارهای فیلتر
              خبر برای معاملات.
            </p>
          </Link>

          <Link
            href="/broker"
            className="glass-card feature-card"
          >
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="wallet" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">
              اتصال بروکر
            </h3>

            <p className="feature-description">
              مدیریت اتصال حساب معاملاتی و سرویس‌های
              اجرای سفارش.
            </p>
          </Link>

          <Link
            href="/support"
            className="glass-card feature-card"
          >
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="support" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">
              پشتیبانی
            </h3>

            <p className="feature-description">
              ایجاد و پیگیری تیکت‌های پشتیبانی حساب
              کاربری.
            </p>
          </Link>
        </section>

        <footer className="footer">
          <div>
            © {new Date().getFullYear()} Trading AI —
            Smart Trading Platform
          </div>

          <div className="footer-status">
            <span className="status-dot" />
            سیستم احراز هویت فعال
          </div>

          <div>
            <span className="gold">SECURE</span>
            {" · "}
            Session Protected
          </div>
        </footer>
      </div>
    </main>
  );
}
