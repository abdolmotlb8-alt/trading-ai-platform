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
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
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
          <rect x="5" y="6" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 3V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <path d="M9 15H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case "market":
      return (
        <svg {...common}>
          <path d="M4 19V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M4 19H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
          <path
            d="M12 8.2A3.8 3.8 0 1 0 12 15.8A3.8 3.8 0 0 0 12 8.2Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M19.4 13.5L21 14.4L19.4 17.1L17.8 16.2C17.3 16.7 16.7 17.1 16 17.4V19.2H12.8V17.4C12.5 17.4 12.2 17.4 12 17.4C11.8 17.4 11.5 17.4 11.2 17.4V19.2H8V17.4C7.3 17.1 6.7 16.7 6.2 16.2L4.6 17.1L3 14.4L4.6 13.5C4.5 13 4.5 12.5 4.5 12C4.5 11.5 4.5 11 4.6 10.5L3 9.6L4.6 6.9L6.2 7.8C6.7 7.3 7.3 6.9 8 6.6V4.8H11.2V6.6C11.5 6.6 11.8 6.6 12 6.6C12.2 6.6 12.5 6.6 12.8 6.6V4.8H16V6.6C16.7 6.9 17.3 7.3 17.8 7.8L19.4 6.9L21 9.6L19.4 10.5C19.5 11 19.5 11.5 19.5 12C19.5 12.5 19.5 13 19.4 13.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
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
          <path d="M10 19C10.5 20 11.2 20.5 12 20.5C12.8 20.5 13.5 20 14 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M4 19H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M7 15L10 12L13 14L18 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "trade":
      return (
        <svg {...common}>
          <path d="M5 7H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M5 12H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M5 17H12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.7" />
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
          <path d="M9 12L11 14L15 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "news":
      return (
        <svg {...common}>
          <path d="M5 4H19V20H5C4.45 20 4 19.55 4 19V5C4 4.45 4.45 4 5 4Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 8H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M8 12H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M8 16H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path d="M5 13V11C5 7.13 8.13 4 12 4C15.87 4 19 7.13 19 11V13" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 13H8V18H6.5C5.67 18 5 17.33 5 16.5V13Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M19 13H16V18H17.5C18.33 18 19 17.33 19 16.5V13Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M16 19C15 20 13.8 20.5 12 20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 20C5.7 16.5 8 14.5 12 14.5C16 14.5 18.3 16.5 19 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12H7L9.5 6L14 18L16.5 12H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11A8 8 0 0 0 6.4 5.2L4 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M4 4V7.5H7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 13A8 8 0 0 0 17.6 18.8L20 16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M20 20V16.5H16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
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

  const [botsCount, signalsCount, tradesCount] = await Promise.all([
    prisma.tradingBot.count({
      where: {
        userId: user.id,
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
  ]);

  const firstName = user.name?.trim()?.split(" ")[0] || "کاربر";
  const initial = firstName.charAt(0).toUpperCase();

  const isAdmin = user.role === "ADMIN";

  return (
    <main dir="rtl" className="trading-shell">
      <style>{`
        :root {
          --gold: #d6ad55;
          --gold-2: #f2d27c;
          --gold-3: #8b6827;
          --black: #050505;
          --black-2: #090909;
          --panel: rgba(17,17,17,.78);
          --panel-2: rgba(11,11,11,.9);
          --border: rgba(214,173,85,.20);
          --text: #f4f1e9;
          --muted: #99958b;
          --green: #48d597;
          --red: #ff6868;
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
            radial-gradient(circle at 80% 0%, rgba(214,173,85,.10), transparent 26rem),
            radial-gradient(circle at 10% 30%, rgba(214,173,85,.035), transparent 24rem),
            #030303;
          overflow-x: hidden;
        }

        .page {
          width: min(1440px, calc(100% - 40px));
          margin: 0 auto;
          padding: 22px 0 40px;
        }

        .topbar {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 12px 18px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: rgba(10,10,10,.82);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          box-shadow:
            0 20px 70px rgba(0,0,0,.45),
            inset 0 1px 0 rgba(255,255,255,.035);
          position: sticky;
          top: 14px;
          z-index: 50;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 210px;
        }

        .brand-mark {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #080808;
          background:
            linear-gradient(145deg, #f5d986, #c39234);
          box-shadow:
            0 0 28px rgba(214,173,85,.22),
            inset 0 1px 0 rgba(255,255,255,.6);
          font-weight: 900;
          font-size: 17px;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: .5px;
        }

        .brand-sub {
          color: var(--muted);
          font-size: 10px;
          margin-top: 3px;
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 12px;
          border-radius: 12px;
          color: #aaa69c;
          font-size: 12px;
          transition: .2s ease;
          white-space: nowrap;
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--gold-2);
          background: rgba(214,173,85,.08);
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
          color: #cfc8b7;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.08);
        }

        .icon-button:hover {
          color: var(--gold-2);
          border-color: var(--border);
          background: rgba(214,173,85,.06);
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
          font-weight: 900;
          background: linear-gradient(145deg, #f4d780, #a97925);
        }

        .profile-text {
          display: flex;
          flex-direction: column;
          min-width: 80px;
        }

        .profile-name {
          font-size: 11px;
          font-weight: 800;
        }

        .profile-plan {
          color: var(--muted);
          font-size: 9px;
          margin-top: 2px;
        }

        .mobile-nav {
          display: none;
        }

        .hero {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1.4fr .9fr;
          gap: 18px;
        }

        .hero-main,
        .hero-side,
        .glass-card {
          border: 1px solid var(--border);
          background:
            linear-gradient(145deg, rgba(22,22,22,.90), rgba(7,7,7,.92));
          box-shadow:
            0 22px 70px rgba(0,0,0,.42),
            inset 0 1px 0 rgba(255,255,255,.035);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .hero-main {
          min-height: 315px;
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
          gap: 7px;
          color: var(--gold-2);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .4px;
          margin-bottom: 15px;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold);
          box-shadow: 0 0 14px rgba(214,173,85,.7);
        }

        .hero-title {
          font-size: clamp(28px, 4vw, 48px);
          line-height: 1.25;
          margin: 0;
          max-width: 720px;
          font-weight: 950;
          letter-spacing: -.8px;
        }

        .hero-title span {
          color: var(--gold-2);
        }

        .hero-description {
          max-width: 690px;
          margin: 15px 0 0;
          color: #aaa69e;
          line-height: 2;
          font-size: 13px;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 25px;
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
          font-weight: 800;
          transition: .2s ease;
        }

        .primary-button {
          color: #090909;
          background: linear-gradient(135deg, #f1d37d, #b98127);
          box-shadow: 0 12px 30px rgba(214,173,85,.15);
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
          border-color: rgba(214,173,85,.42);
          color: var(--gold-2);
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
          font-size: 15px;
          font-weight: 900;
        }

        .section-caption {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 10px;
        }

        .system-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #8fe6bd;
          font-size: 10px;
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
          color: #8f8b82;
          font-size: 10px;
        }

        .mini-stat-value {
          margin-top: 12px;
          font-size: 25px;
          font-weight: 900;
          color: #f2eee5;
        }

        .mini-stat-note {
          margin-top: 4px;
          color: #6f6b63;
          font-size: 9px;
        }

        .stats {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .stat-card {
          min-height: 135px;
          padding: 18px;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: var(--gold-2);
          border: 1px solid rgba(214,173,85,.17);
          background: rgba(214,173,85,.07);
        }

        .stat-label {
          margin-top: 18px;
          color: #9b978d;
          font-size: 10px;
        }

        .stat-value {
          margin-top: 5px;
          font-size: 27px;
          font-weight: 950;
        }

        .stat-description {
          color: #66635c;
          font-size: 9px;
          margin-top: 3px;
        }

        .workspace {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1.35fr .65fr;
          gap: 18px;
        }

        .card {
          border-radius: 22px;
          padding: 20px;
        }

        .chart-box {
          height: 260px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(214,173,85,.10);
          border-radius: 17px;
          background:
            linear-gradient(rgba(214,173,85,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(214,173,85,.035) 1px, transparent 1px),
            rgba(0,0,0,.23);
          background-size: 45px 45px;
        }

        .chart-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .chart-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;
        }

        .chart-placeholder-inner {
          padding: 16px 22px;
          border-radius: 16px;
          background: rgba(5,5,5,.68);
          border: 1px solid rgba(214,173,85,.13);
          backdrop-filter: blur(10px);
        }

        .chart-placeholder strong {
          display: block;
          color: var(--gold-2);
          font-size: 13px;
        }

        .chart-placeholder span {
          display: block;
          margin-top: 6px;
          color: #77736b;
          font-size: 10px;
        }

        .quick-list {
          display: grid;
          gap: 9px;
        }

        .quick-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 62px;
          padding: 10px 12px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(255,255,255,.018);
        }

        .quick-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
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
          font-weight: 800;
        }

        .quick-sub {
          color: #716d65;
          font-size: 9px;
          margin-top: 3px;
        }

        .quick-arrow {
          color: #666158;
        }

        .bottom-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
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
          font-size: 9px;
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

        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-right: 6px;
          padding: 4px 7px;
          border-radius: 7px;
          color: var(--gold-2);
          background: rgba(214,173,85,.08);
          border: 1px solid rgba(214,173,85,.16);
          font-size: 8px;
        }

        @media (max-width: 1120px) {
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
            width: min(100% - 20px, 650px);
            padding-top: 10px;
          }

          .topbar {
            position: relative;
            top: 0;
            padding: 11px;
            border-radius: 18px;
          }

          .nav {
            display: none;
          }

          .header-actions .icon-button:nth-child(1) {
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
            margin-top: 9px;
            padding: 7px;
            border: 1px solid var(--border);
            border-radius: 17px;
            background: rgba(10,10,10,.84);
          }

          .mobile-nav a {
            min-height: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border-radius: 11px;
            color: #858179;
            font-size: 8px;
          }

          .mobile-nav a:first-child {
            color: var(--gold-2);
            background: rgba(214,173,85,.08);
          }

          .hero {
            margin-top: 10px;
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
            font-size: 11px;
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
            min-height: 125px;
            padding: 14px;
            border-radius: 17px;
          }

          .stat-value {
            font-size: 23px;
          }

          .workspace,
          .bottom-grid {
            margin-top: 10px;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 15px;
            border-radius: 19px;
          }

          .chart-box {
            height: 220px;
          }

          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 430px) {
          .page {
            width: calc(100% - 12px);
          }

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
            min-height: 90px;
          }

          .mini-stat-value {
            font-size: 21px;
          }

          .hero-title {
            font-size: 24px;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .stat-label {
            font-size: 9px;
          }

          .stat-value {
            font-size: 20px;
          }

          .stat-description {
            font-size: 8px;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <Link href="/dashboard" className="brand">
            <div className="brand-mark">AI</div>

            <div>
              <div className="brand-name">TRADING AI</div>
              <div className="brand-sub">SMART TRADING PLATFORM</div>
            </div>
          </Link>

          <nav className="nav">
            <Link className="nav-link active" href="/dashboard">
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
            <Link href="/notifications" className="icon-button" aria-label="اعلان‌ها">
              <Icon name="bell" size={18} />
            </Link>

            <Link href="/profile" className="profile">
              <div className="avatar">{initial}</div>

              <div className="profile-text">
                <span className="profile-name">
                  {firstName}
                  {isAdmin && <span className="admin-badge">ADMIN</span>}
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
              <span>داشبورد معاملاتی شما آماده است.</span>
            </h1>

            <p className="hero-description">
              اینجا مرکز کنترل Trading AI است؛ سیگنال‌ها، ربات‌های معاملاتی،
              وضعیت حساب و ابزارهای تحلیل خود را از یک محیط حرفه‌ای مدیریت کنید.
            </p>

            <div className="hero-buttons">
              <Link href="/ai-analysis" className="primary-button">
                <Icon name="spark" size={17} />
                شروع تحلیل هوشمند
              </Link>

              <Link href="/signals" className="secondary-button">
                مشاهده سیگنال‌ها
                <Icon name="arrow" size={16} />
              </Link>

              <Link href="/bots" className="secondary-button">
                مدیریت ربات‌ها
              </Link>
            </div>
          </div>

          <aside className="hero-side">
            <div className="section-head">
              <div>
                <h2 className="section-title">وضعیت سیستم</h2>
                <p className="section-caption">
                  اطلاعات ثبت‌شده در حساب شما
                </p>
              </div>

              <span className="system-status">
                <span className="status-dot" />
                آنلاین
              </span>
            </div>

            <div className="mini-stats">
              <div className="mini-stat">
                <div className="mini-stat-label">ربات‌های معاملاتی</div>
                <div className="mini-stat-value">
                  {formatNumber(botsCount)}
                </div>
                <div className="mini-stat-note">
                  ثبت‌شده در حساب
                </div>
              </div>

              <div className="mini-stat">
                <div className="mini-stat-label">سیگنال‌ها</div>
                <div className="mini-stat-value">
                  {formatNumber(signalsCount)}
                </div>
                <div className="mini-stat-note">
                  ثبت‌شده در دیتابیس
                </div>
              </div>

              <div className="mini-stat">
                <div className="mini-stat-label">معاملات</div>
                <div className="mini-stat-value">
                  {formatNumber(tradesCount)}
                </div>
                <div className="mini-stat-note">
                  ثبت‌شده در حساب
                </div>
              </div>

              <div className="mini-stat">
                <div className="mini-stat-label">سطح دسترسی</div>
                <div className="mini-stat-value" style={{ fontSize: 18 }}>
                  {user.role || "USER"}
                </div>
                <div className="mini-stat-note">
                  پلن {user.plan || "FREE"}
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
            <div className="stat-label">کل سیگنال‌های حساب</div>
            <div className="stat-value">{formatNumber(signalsCount)}</div>
            <div className="stat-description">
              داده واقعی از TradingSignal
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="bots" size={20} />
            </div>
            <div className="stat-label">ربات‌های معاملاتی</div>
            <div className="stat-value">{formatNumber(botsCount)}</div>
            <div className="stat-description">
              ربات‌های متصل به حساب
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="trade" size={20} />
            </div>
            <div className="stat-label">کل معاملات</div>
            <div className="stat-value">{formatNumber(tradesCount)}</div>
            <div className="stat-description">
              سوابق معاملاتی ثبت‌شده
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Icon name="shield" size={20} />
            </div>
            <div className="stat-label">امنیت حساب</div>
            <div className="stat-value" style={{ fontSize: 19 }}>
              فعال
            </div>
            <div className="stat-description">
              Session authentication
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="glass-card card">
            <div className="section-head">
              <div>
                <h2 className="section-title">عملکرد سیستم</h2>
                <p className="section-caption">
                  نمای تحلیلی عملکرد حساب
                </p>
              </div>

              <Link href="/trades" className="secondary-button" style={{ minHeight: 36 }}>
                معاملات
              </Link>
            </div>

            <div className="chart-box">
              <svg
                className="chart-svg"
                viewBox="0 0 900 300"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="goldArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d6ad55" stopOpacity=".24" />
                    <stop offset="100%" stopColor="#d6ad55" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <path
                  d="M0 245
                     C55 235 70 220 120 226
                     S180 180 225 194
                     S280 160 330 175
                     S385 125 430 145
                     S500 110 545 126
                     S605 90 650 112
                     S710 75 755 95
                     S820 55 900 68
                     L900 300
                     L0 300 Z"
                  fill="url(#goldArea)"
                />

                <path
                  d="M0 245
                     C55 235 70 220 120 226
                     S180 180 225 194
                     S280 160 330 175
                     S385 125 430 145
                     S500 110 545 126
                     S605 90 650 112
                     S710 75 755 95
                     S820 55 900 68"
                  fill="none"
                  stroke="#d6ad55"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

              <div className="chart-placeholder">
                <div className="chart-placeholder-inner">
                  <strong>نمودار آماده اتصال به داده‌های واقعی</strong>
                  <span>
                    برای جلوگیری از نمایش اطلاعات ساختگی، قیمت و P/L از دیتابیس/API
                    واقعی خوانده خواهد شد.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card card">
            <div className="section-head">
              <div>
                <h2 className="section-title">دسترسی سریع</h2>
                <p className="section-caption">
                  ابزارهای اصلی پلتفرم
                </p>
              </div>
            </div>

            <div className="quick-list">
              <Link href="/signals" className="quick-item">
                <div className="quick-icon">
                  <Icon name="signals" size={18} />
                </div>
                <div className="quick-text">
                  <div className="quick-title">سیگنال‌های معاملاتی</div>
                  <div className="quick-sub">مشاهده و مدیریت سیگنال‌ها</div>
                </div>
                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>

              <Link href="/bots" className="quick-item">
                <div className="quick-icon">
                  <Icon name="bots" size={18} />
                </div>
                <div className="quick-text">
                  <div className="quick-title">ربات‌های معاملاتی</div>
                  <div className="quick-sub">مدیریت استراتژی و ربات‌ها</div>
                </div>
                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>

              <Link href="/market" className="quick-item">
                <div className="quick-icon">
                  <Icon name="market" size={18} />
                </div>
                <div className="quick-text">
                  <div className="quick-title">بازار</div>
                  <div className="quick-sub">داده بازار و تحلیل تکنیکال</div>
                </div>
                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>

              <Link href="/news" className="quick-item">
                <div className="quick-icon">
                  <Icon name="news" size={18} />
                </div>
                <div className="quick-text">
                  <div className="quick-title">اخبار اقتصادی</div>
                  <div className="quick-sub">اخبار و رویدادهای بازار</div>
                </div>
                <span className="quick-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <Link href="/ai-analysis" className="glass-card feature-card">
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="spark" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">تحلیل هوش مصنوعی</h3>
            <p className="feature-description">
              بررسی ساختار بازار، روند، نقاط مهم و داده‌های تحلیلی.
            </p>
          </Link>

          <Link href="/bots" className="glass-card feature-card">
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="bots" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">مدیریت ربات‌ها</h3>
            <p className="feature-description">
              تنظیم ریسک، حد ضرر، حد سود، فیلتر خبر و شرایط اجرای ربات.
            </p>
          </Link>

          <Link href="/signals" className="glass-card feature-card">
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="shield" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">مرکز سیگنال‌ها</h3>
            <p className="feature-description">
              سیگنال‌های واقعی ثبت‌شده توسط سیستم و وضعیت پردازش آن‌ها.
            </p>
          </Link>

          <Link href="/economic" className="glass-card feature-card">
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="news" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">تقویم اقتصادی</h3>
            <p className="feature-description">
              رویدادهای اقتصادی مهم و ابزارهای فیلتر خبر برای معاملات.
            </p>
          </Link>

          <Link href="/broker" className="glass-card feature-card">
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="wallet" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">اتصال بروکر</h3>
            <p className="feature-description">
              مدیریت اتصال حساب معاملاتی و سرویس‌های اجرای سفارش.
            </p>
          </Link>

          <Link href="/support" className="glass-card feature-card">
            <div className="feature-top">
              <div className="feature-icon">
                <Icon name="support" size={21} />
              </div>

              <span className="feature-arrow">
                <Icon name="arrow" size={17} />
              </span>
            </div>

            <h3 className="feature-title">پشتیبانی</h3>
            <p className="feature-description">
              ایجاد و پیگیری تیکت‌های پشتیبانی حساب کاربری.
            </p>
          </Link>
        </section>

        <footer className="footer">
          <div>
            © {new Date().getFullYear()} Trading AI — Smart Trading Platform
          </div>

          <div className="footer-status">
            <span className="status-dot" />
            سیستم احراز هویت فعال
          </div>

          <div>
            <span className="gold">SECURE</span> · Session Protected
          </div>
        </footer>
      </div>
    </main>
  );
}
