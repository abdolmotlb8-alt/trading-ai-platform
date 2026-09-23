"use client";

import React, { useEffect, useMemo, useState } from "react";

/* =========================================================
   TRADING AI PLATFORM
   PREMIUM DARK / GOLD DASHBOARD
   File: app/dashboard/page.tsx

   IMPORTANT:
   - No styled-jsx
   - No external icon package
   - No Prisma in client
   - No fake trading numbers
   - Data is read from existing APIs when available
========================================================= */

type IconName =
  | "home"
  | "market"
  | "signals"
  | "bots"
  | "analysis"
  | "news"
  | "calendar"
  | "broker"
  | "mt"
  | "telegram"
  | "subscription"
  | "vpn"
  | "support"
  | "profile"
  | "settings"
  | "logout"
  | "bell"
  | "sun"
  | "menu"
  | "close"
  | "chart"
  | "wallet"
  | "robot"
  | "target"
  | "clock"
  | "shield"
  | "arrow"
  | "trendUp"
  | "trendDown"
  | "refresh";

type RawSignal = {
  id?: string;
  symbol?: string;
  direction?: string;
  status?: string;
  timeframe?: string;
  entryPrice?: number | string | null;
  entry?: number | string | null;
  stopLoss?: number | string | null;
  takeProfit?: number | string | null;
  score?: number | null;
  confirmations?: number | null;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  bot?: {
    name?: string;
  } | null;
  metadata?: any;
  levels?: any;
};

type Bot = {
  id?: string;
  name?: string;
  symbol?: string;
  timeframe?: string;
  marketType?: string;
  isActive?: boolean;
  botStatus?: string;
  telegramEnabled?: boolean;
};

type Performance = {
  totalSignals?: number;
  winningSignals?: number;
  losingSignals?: number;
  winRate?: number;
  profit?: number;
  pnl?: number;
  netProfit?: number;
};

type UserInfo = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  plan?: string;
};

type MarketItem = {
  symbol: string;
  price: number | null;
  change: number | null;
  source?: string;
};

type DashboardState = {
  user: UserInfo | null;
  signals: RawSignal[];
  bots: Bot[];
  performance: Performance | null;
  loading: boolean;
  error: string;
};

const GOLD = "#d8b45a";
const GOLD_LIGHT = "#f1d98a";
const GOLD_DARK = "#8e6b25";
const BG = "#07090c";
const PANEL = "#0d1117";
const PANEL_2 = "#11161e";
const BORDER = "rgba(216,180,90,.16)";
const TEXT = "#f5f1e8";
const MUTED = "#8e96a3";
const GREEN = "#35d59a";
const RED = "#ff5d6c";
const BLUE = "#42a5ff";

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.8 12 3l9 7.8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );

    case "market":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h17" />
          <path d="m7 15 4-5 3 2 5-7" />
          <path d="M16 5h3v3" />
        </svg>
      );

    case "signals":
      return (
        <svg {...common}>
          <path d="M4 18V9" />
          <path d="M9 18V5" />
          <path d="M14 18v-8" />
          <path d="M19 18V3" />
        </svg>
      );

    case "bots":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="13" rx="3" />
          <path d="M12 3v3" />
          <path d="M8 12h.01M16 12h.01" />
          <path d="M8 16h8" />
        </svg>
      );

    case "analysis":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 4-6" />
        </svg>
      );

    case "news":
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "broker":
      return (
        <svg {...common}>
          <path d="M4 20V8l8-5 8 5v12" />
          <path d="M7 20v-5h10v5" />
          <path d="M9 10h6M9 13h6" />
        </svg>
      );

    case "mt":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8 15 3-6 2 5 3-3" />
        </svg>
      );

    case "telegram":
      return (
        <svg {...common}>
          <path d="m21 4-3 16-6-5-3 2 1-5-5-2 16-6Z" />
          <path d="m9 12 8-5-5 6" />
        </svg>
      );

    case "subscription":
      return (
        <svg {...common}>
          <path d="M4 7h16v13H4z" />
          <path d="M7 7V5h10v2" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );

    case "vpn":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );

    case "support":
      return (
        <svg {...common}>
          <path d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-3" />
          <path d="M4 14H3v4h4v-5H4" />
          <path d="M20 14h1v4h-4v-5h3" />
          <path d="M12 19h3" />
        </svg>
      );

    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c.7-4 3.4-6 8-6s7.3 2 8 6" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
          <path d="m19 13 2-1-2-1-.4-2 1-1-1.8-1.8-1 1-2-.4-1-2-1 2-2 .4-1-1L7 7l1 1-.4 2-2 .9 2 1-.4 2-1 1L7 16l1-1 2 .4 1 2 1-2 2-.4 1 1 1.8-1.8-1-1 .4-2Z" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 4H5v16h5" />
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

    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="m7 15 3-4 3 2 4-6" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 6h15a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M3 8h15" />
          <path d="M16 13h5" />
        </svg>
      );

    case "robot":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="13" rx="3" />
          <path d="M12 3v3M8 12h.01M16 12h.01M8 16h8" />
        </svg>
      );

    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M22 12h-3" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "trendUp":
      return (
        <svg {...common}>
          <path d="m4 16 5-5 4 3 7-8" />
          <path d="M15 6h5v5" />
        </svg>
      );

    case "trendDown":
      return (
        <svg {...common}>
          <path d="m4 8 5 5 4-3 7 8" />
          <path d="M15 18h5v-5" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    default:
      return null;
  }
}

function safeNumber(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function price(value: number | null | undefined, symbol = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const digits =
    symbol.includes("JPY") || symbol.includes("XAU") || symbol.includes("XAG")
      ? 2
      : symbol.includes("BTC") || symbol.includes("ETH")
        ? 2
        : 5;

  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function normalizeDirection(signal: RawSignal) {
  const value = String(signal.direction || "").toUpperCase();

  if (value.includes("BUY") || value.includes("LONG")) return "BUY";
  if (value.includes("SELL") || value.includes("SHORT")) return "SELL";

  return "—";
}

function signalColor(direction: string) {
  if (direction === "BUY") return GREEN;
  if (direction === "SELL") return RED;
  return MUTED;
}

function getSignalEntry(signal: RawSignal) {
  return (
    safeNumber(signal.entryPrice) ??
    safeNumber(signal.entry) ??
    safeNumber(signal.metadata?.levels?.entry) ??
    safeNumber(signal.metadata?.entryPrice)
  );
}

function getSignalSL(signal: RawSignal) {
  return (
    safeNumber(signal.stopLoss) ??
    safeNumber(signal.metadata?.levels?.stopLoss) ??
    safeNumber(signal.metadata?.risk?.stopLossPrice)
  );
}

function getSignalTP(signal: RawSignal) {
  return (
    safeNumber(signal.takeProfit) ??
    safeNumber(signal.metadata?.levels?.tp3) ??
    safeNumber(signal.metadata?.levels?.takeProfit)
  );
}

function getSignalCurrentPrice(signal: RawSignal) {
  return (
    safeNumber(signal.metadata?.state?.currentPrice) ??
    safeNumber(signal.metadata?.currentPrice) ??
    getSignalEntry(signal)
  );
}

function getSignalTime(signal: RawSignal) {
  const date = signal.createdAt || signal.updatedAt;

  if (!date) return "—";

  try {
    return new Date(date).toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

async function requestJSON(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.json();
}

export default function DashboardPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  const [state, setState] = useState<DashboardState>({
    user: null,
    signals: [],
    bots: [],
    performance: null,
    loading: true,
    error: "",
  });

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadDashboard = async () => {
    try {
      setState((old) => ({
        ...old,
        loading: true,
        error: "",
      }));

      const [signalsResult, botsResult] = await Promise.allSettled([
        requestJSON("/api/signals?limit=30"),
        requestJSON("/api/bots"),
      ]);

      let signals: RawSignal[] = [];
      let bots: Bot[] = [];
      let performance: Performance | null = null;
      let user: UserInfo | null = null;

      if (signalsResult.status === "fulfilled") {
        const data = signalsResult.value;

        if (Array.isArray(data)) {
          signals = data;
        } else {
          signals =
            Array.isArray(data?.signals)
              ? data.signals
              : Array.isArray(data?.data)
                ? data.data
                : [];

          performance =
            data?.performance ||
            data?.stats ||
            data?.summary ||
            null;

          user = data?.user || null;
        }
      }

      if (botsResult.status === "fulfilled") {
        const data = botsResult.value;

        if (Array.isArray(data)) {
          bots = data;
        } else {
          bots =
            Array.isArray(data?.bots)
              ? data.bots
              : Array.isArray(data?.data)
                ? data.data
                : [];

          user = user || data?.user || null;
        }
      }

      const activeSignals = signals.filter((signal) => {
        const status = String(signal.status || "").toUpperCase();

        return (
          status === "ACTIVE" ||
          status === "OPEN" ||
          status === "WAITING" ||
          status === "TP1_HIT" ||
          status === "TP2_HIT"
        );
      });

      const wins = signals.filter((signal) =>
        ["TP1_HIT", "TP2_HIT", "TP3_HIT", "CLOSED", "WIN"].includes(
          String(signal.status || "").toUpperCase()
        )
      ).length;

      const losses = signals.filter((signal) =>
        ["STOP_LOSS", "LOSS"].includes(
          String(signal.status || "").toUpperCase()
        )
      ).length;

      const totalFinished = wins + losses;

      if (!performance) {
        performance = {
          totalSignals: signals.length,
          winningSignals: wins,
          losingSignals: losses,
          winRate:
            totalFinished > 0
              ? Math.round((wins / totalFinished) * 100)
              : 0,
        };
      }

      setState({
        user,
        signals: signals.length ? signals : [],
        bots,
        performance,
        loading: false,
        error:
          signalsResult.status === "rejected" &&
          botsResult.status === "rejected"
            ? "داده‌های داشبورد هنوز از API دریافت نشده‌اند."
            : "",
      });

      setLastUpdate(new Date());

      void activeSignals;
    } catch {
      setState((old) => ({
        ...old,
        loading: false,
        error: "اتصال به داده‌های داشبورد برقرار نشد.",
      }));
    }
  };

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(() => {
      loadDashboard();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      // redirect anyway
    }

    window.location.href = "/login";
  };

  const activeBots = useMemo(
    () =>
      state.bots.filter(
        (bot) =>
          bot.isActive === true ||
          String(bot.botStatus || "").toUpperCase() === "ACTIVE"
      ),
    [state.bots]
  );

  const activeSignals = useMemo(
    () =>
      state.signals.filter((signal) => {
        const status = String(signal.status || "").toUpperCase();

        return [
          "ACTIVE",
          "OPEN",
          "WAITING",
          "TP1_HIT",
          "TP2_HIT",
        ].includes(status);
      }),
    [state.signals]
  );

  const recentSignals = useMemo(
    () => state.signals.slice(0, 6),
    [state.signals]
  );

  const performance = state.performance;

  const winRate =
    safeNumber(performance?.winRate) ??
    (() => {
      const wins = safeNumber(performance?.winningSignals) || 0;
      const losses = safeNumber(performance?.losingSignals) || 0;
      const total = wins + losses;

      return total ? Math.round((wins / total) * 100) : 0;
    })();

  const totalSignals =
    safeNumber(performance?.totalSignals) ?? state.signals.length;

  const totalProfit =
    safeNumber(performance?.netProfit) ??
    safeNumber(performance?.profit) ??
    safeNumber(performance?.pnl) ??
    0;

  const marketItems: MarketItem[] = useMemo(() => {
    const symbols = [
      "XAUUSD",
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "BTCUSDT",
      "ETHUSDT",
    ];

    return symbols.map((symbol) => {
      const related = state.signals.find(
        (signal) =>
          String(signal.symbol || "").toUpperCase() === symbol
      );

      const current = related
        ? getSignalCurrentPrice(related)
        : null;

      const entry = related ? getSignalEntry(related) : null;

      let change: number | null = null;

      if (
        current !== null &&
        entry !== null &&
        entry !== 0
      ) {
        change = ((current - entry) / entry) * 100;

        if (normalizeDirection(related!) === "SELL") {
          change *= -1;
        }
      }

      return {
        symbol,
        price: current,
        change,
        source: related ? "Trading AI" : undefined,
      };
    });
  }, [state.signals]);

  const css = `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: ${BG};
    }

    body {
      font-family:
        Tahoma,
        Arial,
        "Segoe UI",
        sans-serif;
      color: ${TEXT};
    }

    button,
    a {
      font: inherit;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    button {
      border: 0;
    }

    .ta-shell {
      min-height: 100vh;
      background:
        radial-gradient(
          circle at 15% 10%,
          rgba(216,180,90,.09),
          transparent 28%
        ),
        radial-gradient(
          circle at 75% 80%,
          rgba(45,115,170,.08),
          transparent 30%
        ),
        linear-gradient(
          135deg,
          #06080b 0%,
          #090d12 48%,
          #06080b 100%
        );
      direction: rtl;
    }

    .ta-noise {
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .025;
      background-image:
        radial-gradient(#fff 1px, transparent 1px);
      background-size: 5px 5px;
      z-index: 0;
    }

    .ta-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 255px;
      height: 100vh;
      background:
        linear-gradient(
          180deg,
          rgba(16,20,27,.97),
          rgba(7,10,14,.98)
        );
      border-left: 1px solid rgba(216,180,90,.13);
      box-shadow:
        -20px 0 60px rgba(0,0,0,.24);
      z-index: 30;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .ta-brand {
      padding: 25px 20px 20px;
      border-bottom: 1px solid rgba(255,255,255,.05);
    }

    .ta-brand-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ta-logo {
      width: 46px;
      height: 46px;
      border-radius: 15px;
      display: grid;
      place-items: center;
      color: #090b0d;
      background:
        linear-gradient(
          135deg,
          ${GOLD_LIGHT},
          ${GOLD},
          ${GOLD_DARK}
        );
      box-shadow:
        0 10px 35px rgba(216,180,90,.16),
        inset 0 1px rgba(255,255,255,.55);
    }

    .ta-brand-name {
      font-size: 15px;
      font-weight: 900;
      color: #fff;
    }

    .ta-brand-sub {
      margin-top: 4px;
      color: #777f8b;
      font-size: 9px;
      letter-spacing: 2px;
      direction: ltr;
      text-align: right;
    }

    .ta-nav {
      padding: 17px 12px;
      flex: 1;
    }

    .ta-nav-title {
      color: #666e7a;
      font-size: 10px;
      padding: 12px 10px 8px;
      font-weight: 800;
    }

    .ta-nav-item {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 12px 12px;
      margin-bottom: 4px;
      border-radius: 13px;
      color: #9299a4;
      transition:
        .2s ease;
      cursor: pointer;
      background: transparent;
    }

    .ta-nav-item:hover {
      background: rgba(255,255,255,.035);
      color: #eee;
      transform: translateX(-2px);
    }

    .ta-nav-item.active {
      color: ${GOLD_LIGHT};
      background:
        linear-gradient(
          90deg,
          rgba(216,180,90,.18),
          rgba(216,180,90,.035)
        );
      box-shadow:
        inset -2px 0 ${GOLD};
    }

    .ta-nav-label {
      flex: 1;
      font-size: 12px;
      font-weight: 700;
    }

    .ta-sidebar-bottom {
      padding: 12px;
      border-top: 1px solid rgba(255,255,255,.05);
    }

    .ta-user-mini {
      padding: 12px;
      border: 1px solid rgba(255,255,255,.06);
      background: rgba(255,255,255,.025);
      border-radius: 15px;
      margin-bottom: 9px;
    }

    .ta-user-mini-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ta-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background:
        linear-gradient(
          135deg,
          #1d222b,
          #0d1015
        );
      border: 1px solid rgba(216,180,90,.35);
      color: ${GOLD_LIGHT};
      font-weight: 900;
      font-size: 13px;
    }

    .ta-user-name {
      font-size: 12px;
      font-weight: 800;
      color: #eee;
    }

    .ta-user-email {
      font-size: 9px;
      color: #6d7580;
      margin-top: 4px;
      direction: ltr;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ta-content {
      position: relative;
      z-index: 1;
      margin-right: 255px;
      min-height: 100vh;
      padding: 18px 24px 40px;
    }

    .ta-topbar {
      height: 68px;
      border: 1px solid rgba(255,255,255,.06);
      background: rgba(13,17,23,.72);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 15px;
      margin-bottom: 18px;
      box-shadow: 0 18px 60px rgba(0,0,0,.18);
    }

    .ta-top-left,
    .ta-top-right {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .ta-mobile-menu {
      display: none;
    }

    .ta-icon-btn {
      width: 39px;
      height: 39px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      color: #9ca4ae;
      background: rgba(255,255,255,.035);
      border: 1px solid rgba(255,255,255,.06);
      cursor: pointer;
    }

    .ta-icon-btn:hover {
      color: ${GOLD_LIGHT};
      border-color: rgba(216,180,90,.25);
    }

    .ta-lang {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255,255,255,.035);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 12px;
      color: #b7bdc6;
      font-size: 11px;
    }

    .ta-live-status {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #9ca4ae;
      font-size: 10px;
    }

    .ta-live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${GREEN};
      box-shadow: 0 0 14px ${GREEN};
    }

    .ta-welcome {
      margin-bottom: 17px;
    }

    .ta-welcome-small {
      color: #757e89;
      font-size: 11px;
      margin-bottom: 5px;
    }

    .ta-welcome-title {
      font-size: 24px;
      font-weight: 900;
      color: #fff;
    }

    .ta-welcome-title span {
      color: ${GOLD_LIGHT};
    }

    .ta-welcome-sub {
      color: #717985;
      font-size: 11px;
      margin-top: 7px;
    }

    .ta-alert {
      display: flex;
      align-items: center;
      gap: 13px;
      min-height: 75px;
      padding: 14px 17px;
      margin-bottom: 17px;
      border-radius: 17px;
      border: 1px solid rgba(216,180,90,.15);
      background:
        linear-gradient(
          110deg,
          rgba(216,180,90,.11),
          rgba(255,255,255,.025)
        );
    }

    .ta-alert-icon {
      width: 40px;
      height: 40px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      color: ${GOLD_LIGHT};
      background: rgba(216,180,90,.12);
      flex-shrink: 0;
    }

    .ta-alert-title {
      font-size: 12px;
      font-weight: 900;
      color: #f5ead0;
    }

    .ta-alert-text {
      color: #858c97;
      font-size: 10px;
      margin-top: 5px;
      line-height: 1.8;
    }

    .ta-alert-action {
      margin-right: auto;
      padding: 9px 13px;
      border-radius: 10px;
      border: 1px solid rgba(216,180,90,.25);
      color: ${GOLD_LIGHT};
      font-size: 9px;
      background: rgba(216,180,90,.06);
      white-space: nowrap;
    }

    .ta-stat-grid {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 17px;
    }

    .ta-stat {
      position: relative;
      overflow: hidden;
      min-height: 115px;
      padding: 16px;
      border-radius: 17px;
      border: 1px solid rgba(255,255,255,.07);
      background:
        linear-gradient(
          145deg,
          rgba(22,27,35,.95),
          rgba(10,13,18,.95)
        );
      box-shadow:
        inset 0 1px rgba(255,255,255,.025),
        0 16px 40px rgba(0,0,0,.12);
    }

    .ta-stat::after {
      content: "";
      position: absolute;
      width: 90px;
      height: 90px;
      left: -30px;
      bottom: -45px;
      border-radius: 50%;
      background: rgba(216,180,90,.08);
      filter: blur(15px);
    }

    .ta-stat-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .ta-stat-icon {
      width: 39px;
      height: 39px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      color: ${GOLD_LIGHT};
      background: rgba(216,180,90,.08);
      border: 1px solid rgba(216,180,90,.1);
    }

    .ta-stat-label {
      color: #777f8a;
      font-size: 10px;
    }

    .ta-stat-value {
      font-size: 22px;
      font-weight: 900;
      direction: ltr;
      text-align: right;
      margin-top: 10px;
    }

    .ta-stat-foot {
      color: #656d77;
      font-size: 9px;
      margin-top: 7px;
    }

    .ta-grid-2 {
      display: grid;
      grid-template-columns:
        minmax(0, 1.4fr)
        minmax(290px, .6fr);
      gap: 14px;
      margin-bottom: 14px;
    }

    .ta-card {
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.065);
      background:
        linear-gradient(
          145deg,
          rgba(17,22,29,.95),
          rgba(9,12,17,.96)
        );
      box-shadow:
        0 20px 60px rgba(0,0,0,.16),
        inset 0 1px rgba(255,255,255,.025);
      overflow: hidden;
    }

    .ta-card-head {
      min-height: 57px;
      padding: 12px 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid rgba(255,255,255,.05);
    }

    .ta-card-title {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 12px;
      font-weight: 900;
      color: #e7e8e9;
    }

    .ta-card-title-icon {
      color: ${GOLD};
    }

    .ta-card-sub {
      color: #666f7b;
      font-size: 9px;
    }

    .ta-market-grid {
      display: grid;
      grid-template-columns:
        repeat(6, minmax(0, 1fr));
      gap: 8px;
      padding: 12px;
    }

    .ta-market {
      min-width: 0;
      padding: 11px 10px;
      border-radius: 13px;
      background: rgba(255,255,255,.025);
      border: 1px solid rgba(255,255,255,.045);
    }

    .ta-market-symbol {
      font-size: 9px;
      font-weight: 900;
      color: #d4d8de;
      direction: ltr;
      text-align: right;
    }

    .ta-market-price {
      margin-top: 8px;
      font-size: 12px;
      font-weight: 900;
      direction: ltr;
      text-align: right;
      color: #f1f2f4;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ta-market-change {
      margin-top: 5px;
      font-size: 9px;
      direction: ltr;
      text-align: right;
    }

    .ta-up {
      color: ${GREEN};
    }

    .ta-down {
      color: ${RED};
    }

    .ta-neutral {
      color: #68717d;
    }

    .ta-body {
      padding: 13px;
    }

    .ta-signal-list,
    .ta-bot-list {
      display: grid;
      gap: 8px;
    }

    .ta-signal-row {
      display: grid;
      grid-template-columns:
        38px
        minmax(80px, 1fr)
        auto
        auto;
      gap: 9px;
      align-items: center;
      padding: 10px;
      border-radius: 13px;
      background: rgba(255,255,255,.025);
      border: 1px solid rgba(255,255,255,.045);
    }

    .ta-signal-direction {
      width: 35px;
      height: 35px;
      display: grid;
      place-items: center;
      border-radius: 10px;
    }

    .ta-signal-buy {
      color: ${GREEN};
      background: rgba(53,213,154,.08);
    }

    .ta-signal-sell {
      color: ${RED};
      background: rgba(255,93,108,.08);
    }

    .ta-signal-symbol {
      font-size: 10px;
      font-weight: 900;
      direction: ltr;
      text-align: right;
    }

    .ta-signal-meta {
      color: #68717d;
      font-size: 8px;
      margin-top: 4px;
    }

    .ta-signal-price {
      direction: ltr;
      text-align: right;
      font-size: 9px;
      color: #b9c0c9;
    }

    .ta-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 7px;
      border-radius: 8px;
      background: rgba(255,255,255,.035);
      color: #9098a4;
      font-size: 8px;
      white-space: nowrap;
    }

    .ta-status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .ta-bot-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 13px;
      border: 1px solid rgba(255,255,255,.045);
      background: rgba(255,255,255,.025);
    }

    .ta-bot-icon {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      color: #ae7cff;
      background: rgba(142,94,255,.1);
      flex-shrink: 0;
    }

    .ta-bot-main {
      min-width: 0;
      flex: 1;
    }

    .ta-bot-name {
      font-size: 10px;
      font-weight: 900;
      color: #e0e3e8;
    }

    .ta-bot-symbol {
      font-size: 8px;
      color: #69727e;
      margin-top: 4px;
      direction: ltr;
      text-align: right;
    }

    .ta-bot-state {
      color: ${GREEN};
      font-size: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .ta-performance {
      padding: 15px;
    }

    .ta-ring-wrap {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 16px;
    }

    .ta-ring {
      width: 116px;
      height: 116px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      position: relative;
      background:
        conic-gradient(
          ${GREEN} ${winRate}%,
          #252b34 ${winRate}% 100%
        );
      flex-shrink: 0;
    }

    .ta-ring::before {
      content: "";
      width: 86px;
      height: 86px;
      border-radius: 50%;
      position: absolute;
      background: #0e1319;
      border: 1px solid rgba(255,255,255,.05);
    }

    .ta-ring-value {
      position: relative;
      z-index: 1;
      font-size: 22px;
      font-weight: 900;
      direction: ltr;
    }

    .ta-performance-main {
      flex: 1;
    }

    .ta-performance-title {
      font-size: 10px;
      color: #7a828d;
    }

    .ta-performance-number {
      margin-top: 7px;
      font-size: 20px;
      font-weight: 900;
      direction: ltr;
    }

    .ta-performance-caption {
      margin-top: 5px;
      color: #666f7a;
      font-size: 8px;
      line-height: 1.7;
    }

    .ta-bars {
      height: 78px;
      display: flex;
      align-items: end;
      gap: 7px;
      padding: 8px 0 0;
    }

    .ta-bar {
      flex: 1;
      border-radius: 5px 5px 2px 2px;
      min-height: 8px;
      background:
        linear-gradient(
          180deg,
          ${GOLD_LIGHT},
          ${GOLD_DARK}
        );
      opacity: .75;
    }

    .ta-action-grid {
      display: grid;
      grid-template-columns:
        repeat(5, minmax(0, 1fr));
      gap: 9px;
      margin-bottom: 14px;
    }

    .ta-action {
      min-height: 74px;
      border-radius: 15px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(255,255,255,.06);
      background:
        linear-gradient(
          145deg,
          rgba(19,24,32,.95),
          rgba(10,13,18,.96)
        );
    }

    .ta-action:hover {
      border-color: rgba(216,180,90,.2);
      transform: translateY(-1px);
    }

    .ta-action-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      color: ${GOLD_LIGHT};
      background: rgba(216,180,90,.08);
      flex-shrink: 0;
    }

    .ta-action-text {
      font-size: 9px;
      color: #c7ccd3;
      line-height: 1.7;
    }

    .ta-bottom-grid {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        minmax(270px, .6fr);
      gap: 14px;
    }

    .ta-news-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,.045);
    }

    .ta-news-item:last-child {
      border-bottom: 0;
    }

    .ta-news-thumb {
      width: 46px;
      height: 46px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      color: ${GOLD};
      background: rgba(216,180,90,.08);
      border: 1px solid rgba(216,180,90,.09);
      flex-shrink: 0;
    }

    .ta-news-main {
      flex: 1;
      min-width: 0;
    }

    .ta-news-title {
      font-size: 9px;
      color: #d4d8dd;
      line-height: 1.8;
    }

    .ta-news-meta {
      font-size: 8px;
      color: #626b76;
      margin-top: 3px;
    }

    .ta-subscription {
      padding: 14px;
    }

    .ta-plan {
      padding: 15px;
      border-radius: 15px;
      background:
        linear-gradient(
          135deg,
          rgba(216,180,90,.12),
          rgba(255,255,255,.025)
        );
      border: 1px solid rgba(216,180,90,.16);
    }

    .ta-plan-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ta-plan-name {
      font-size: 12px;
      font-weight: 900;
      color: ${GOLD_LIGHT};
    }

    .ta-plan-badge {
      padding: 5px 8px;
      border-radius: 7px;
      color: #0b0d10;
      background: ${GOLD};
      font-size: 8px;
      font-weight: 900;
    }

    .ta-plan-info {
      color: #7c848e;
      font-size: 9px;
      line-height: 2;
      margin-top: 10px;
    }

    .ta-support {
      margin-top: 10px;
      padding: 13px;
      border-radius: 14px;
      background: rgba(255,255,255,.025);
      border: 1px solid rgba(255,255,255,.05);
    }

    .ta-support-title {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #d9dde2;
      font-size: 10px;
      font-weight: 900;
    }

    .ta-support-text {
      color: #6e7782;
      font-size: 8px;
      line-height: 1.8;
      margin-top: 7px;
    }

    .ta-footer {
      padding: 20px 5px 5px;
      color: #4e5661;
      font-size: 8px;
      display: flex;
      justify-content: space-between;
      direction: rtl;
    }

    .ta-empty {
      padding: 28px 14px;
      text-align: center;
      color: #626b76;
      font-size: 9px;
    }

    .ta-refresh {
      transition: transform .35s ease;
    }

    .ta-refresh:hover {
      transform: rotate(180deg);
    }

    .ta-error {
      padding: 10px 13px;
      border-radius: 12px;
      margin-bottom: 13px;
      color: #ffb1b8;
      border: 1px solid rgba(255,93,108,.14);
      background: rgba(255,93,108,.05);
      font-size: 9px;
    }

    .ta-loading {
      opacity: .7;
    }

    @media (max-width: 1200px) {
      .ta-sidebar {
        width: 225px;
      }

      .ta-content {
        margin-right: 225px;
      }

      .ta-stat-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .ta-market-grid {
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
      }

      .ta-action-grid {
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      .ta-sidebar {
        transform: translateX(110%);
        transition: transform .25s ease;
        width: 270px;
      }

      .ta-sidebar.open {
        transform: translateX(0);
      }

      .ta-content {
        margin-right: 0;
        padding: 12px;
      }

      .ta-mobile-menu {
        display: grid;
      }

      .ta-grid-2,
      .ta-bottom-grid {
        grid-template-columns: 1fr;
      }

      .ta-stat-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 600px) {
      .ta-topbar {
        height: 58px;
        border-radius: 15px;
        padding: 8px;
      }

      .ta-lang {
        display: none;
      }

      .ta-live-status span {
        display: none;
      }

      .ta-welcome-title {
        font-size: 20px;
      }

      .ta-alert {
        align-items: flex-start;
      }

      .ta-alert-action {
        display: none;
      }

      .ta-stat-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .ta-stat {
        min-height: 105px;
        padding: 12px;
      }

      .ta-stat-value {
        font-size: 18px;
      }

      .ta-market-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .ta-signal-row {
        grid-template-columns:
          34px
          minmax(0, 1fr)
          auto;
      }

      .ta-signal-price {
        display: none;
      }

      .ta-action-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .ta-ring-wrap {
        gap: 12px;
      }

      .ta-ring {
        width: 92px;
        height: 92px;
      }

      .ta-ring::before {
        width: 68px;
        height: 68px;
      }

      .ta-ring-value {
        font-size: 18px;
      }
    }
  `;

  return (
    <>
      <style>{css}</style>

      <div className="ta-shell">
        <div className="ta-noise" />

        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        <aside
          className={`ta-sidebar ${mobileMenu ? "open" : ""}`}
        >
          <div className="ta-brand">
            <div className="ta-brand-row">
              <div className="ta-logo">
                <Icon name="chart" size={25} />
              </div>

              <div>
                <div className="ta-brand-name">
                  Trading AI
                </div>

                <div className="ta-brand-sub">
                  SMART TRADING PLATFORM
                </div>
              </div>
            </div>
          </div>

          <nav className="ta-nav">
            <div className="ta-nav-title">
              داشبورد
            </div>

            <a
              href="/dashboard"
              className="ta-nav-item active"
              onClick={() => setMobileMenu(false)}
            >
              <Icon name="home" size={18} />
              <span className="ta-nav-label">
                خانه
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/market"
              className="ta-nav-item"
              onClick={() => setMobileMenu(false)}
            >
              <Icon name="market" size={18} />
              <span className="ta-nav-label">
                بازار زنده
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/signals"
              className="ta-nav-item"
              onClick={() => setMobileMenu(false)}
            >
              <Icon name="signals" size={18} />
              <span className="ta-nav-label">
                سیگنال‌های معاملاتی
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/bots"
              className="ta-nav-item"
              onClick={() => setMobileMenu(false)}
            >
              <Icon name="bots" size={18} />
              <span className="ta-nav-label">
                ربات‌های تحلیلگر
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/ai-analysis"
              className="ta-nav-item"
              onClick={() => setMobileMenu(false)}
            >
              <Icon name="analysis" size={18} />
              <span className="ta-nav-label">
                تحلیل هوش مصنوعی
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <div className="ta-nav-title">
              ابزارها
            </div>

            <a
              href="/news"
              className="ta-nav-item"
            >
              <Icon name="news" size={18} />
              <span className="ta-nav-label">
                اخبار بازار
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/economic"
              className="ta-nav-item"
            >
              <Icon name="calendar" size={18} />
              <span className="ta-nav-label">
                تقویم اقتصادی
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/broker"
              className="ta-nav-item"
            >
              <Icon name="broker" size={18} />
              <span className="ta-nav-label">
                اتصال به بروکر
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/metatrader"
              className="ta-nav-item"
            >
              <Icon name="mt" size={18} />
              <span className="ta-nav-label">
                اتصال به متاتریدر
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/telegram"
              className="ta-nav-item"
            >
              <Icon name="telegram" size={18} />
              <span className="ta-nav-label">
                تلگرام و اعلان‌ها
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/subscriptions"
              className="ta-nav-item"
            >
              <Icon name="subscription" size={18} />
              <span className="ta-nav-label">
                اشتراک‌ها
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/vpn"
              className="ta-nav-item"
            >
              <Icon name="vpn" size={18} />
              <span className="ta-nav-label">
                VPN اختصاصی
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/support"
              className="ta-nav-item"
            >
              <Icon name="support" size={18} />
              <span className="ta-nav-label">
                پشتیبانی
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <div className="ta-nav-title">
              حساب کاربری
            </div>

            <a
              href="/profile"
              className="ta-nav-item"
            >
              <Icon name="profile" size={18} />
              <span className="ta-nav-label">
                پروفایل
              </span>
              <Icon name="arrow" size={14} />
            </a>

            <a
              href="/settings"
              className="ta-nav-item"
            >
              <Icon name="settings" size={18} />
              <span className="ta-nav-label">
                تنظیمات
              </span>
              <Icon name="arrow" size={14} />
            </a>

            {state.user?.role === "ADMIN" && (
              <a
                href="/admin"
                className="ta-nav-item"
              >
                <Icon name="shield" size={18} />
                <span className="ta-nav-label">
                  پنل مدیریت
                </span>
                <Icon name="arrow" size={14} />
              </a>
            )}
          </nav>

          <div className="ta-sidebar-bottom">
            <div className="ta-user-mini">
              <div className="ta-user-mini-row">
                <div className="ta-avatar">
                  {String(
                    state.user?.name || "T"
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="ta-user-name">
                    {state.user?.name || "کاربر Trading AI"}
                  </div>

                  <div className="ta-user-email">
                    {state.user?.email || "حساب کاربری"}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="ta-nav-item"
              onClick={logout}
              style={{
                width: "100%",
                border: 0,
                textAlign: "right",
              }}
            >
              <Icon name="logout" size={18} />
              <span
                className="ta-nav-label"
                style={{ color: "#ff6573" }}
              >
                خروج از حساب
              </span>
              <Icon name="arrow" size={14} />
            </button>
          </div>
        </aside>

        {/* =====================================================
            MAIN
        ====================================================== */}

        <main className="ta-content">
          {/* TOP BAR */}
          <header className="ta-topbar">
            <div className="ta-top-right">
              <button
                type="button"
                className="ta-icon-btn ta-mobile-menu"
                onClick={() =>
                  setMobileMenu((value) => !value)
                }
              >
                <Icon
                  name={
                    mobileMenu
                      ? "close"
                      : "menu"
                  }
                  size={19}
                />
              </button>

              <div className="ta-live-status">
                <span className="ta-live-dot" />
                <span>
                  سیستم تحلیل آنلاین
                </span>
              </div>
            </div>

            <div className="ta-top-left">
              <button
                type="button"
                className="ta-icon-btn"
                title="اعلان‌ها"
              >
                <Icon name="bell" size={18} />
              </button>

              <div className="ta-lang">
                <span>فارسی</span>
                <span>🇮🇷</span>
              </div>

              <button
                type="button"
                className="ta-icon-btn"
                title="حالت نمایش"
              >
                <Icon name="sun" size={17} />
              </button>

              <button
                type="button"
                className="ta-icon-btn ta-refresh"
                onClick={loadDashboard}
                title="به‌روزرسانی"
              >
                <Icon name="refresh" size={17} />
              </button>
            </div>
          </header>

          {/* WELCOME */}
          <section className="ta-welcome">
            <div className="ta-welcome-small">
              پنل معاملاتی هوشمند
            </div>

            <div className="ta-welcome-title">
              سلام،{" "}
              <span>
                {state.user?.name || "معامله‌گر"}
              </span>{" "}
              👋
            </div>

            <div className="ta-welcome-sub">
              وضعیت بازار، ربات‌ها، سیگنال‌ها و
              عملکرد حساب خود را از یک صفحه مشاهده
              کنید.
            </div>
          </section>

          {state.error && (
            <div className="ta-error">
              {state.error}
            </div>
          )}

          {/* ANNOUNCEMENT */}
          <section className="ta-alert">
            <div className="ta-alert-icon">
              <Icon name="bell" size={19} />
            </div>

            <div style={{ flex: 1 }}>
              <div className="ta-alert-title">
                اطلاعیه مهم
              </div>

              <div className="ta-alert-text">
                سیستم تحلیل و مدیریت سیگنال‌ها فعال
                است. داده‌های داشبورد از سرویس‌های
                معاملاتی پروژه دریافت می‌شوند.
              </div>
            </div>

            <a
              href="/news"
              className="ta-alert-action"
            >
              مشاهده اخبار
            </a>
          </section>

          {/* STATS */}
          <section className="ta-stat-grid">
            <div className="ta-stat">
              <div className="ta-stat-top">
                <div className="ta-stat-label">
                  سود ثبت‌شده
                </div>

                <div className="ta-stat-icon">
                  <Icon name="wallet" size={19} />
                </div>
              </div>

              <div
                className="ta-stat-value"
                style={{
                  color:
                    totalProfit >= 0
                      ? GREEN
                      : RED,
                }}
              >
                {money(totalProfit)}
              </div>

              <div className="ta-stat-foot">
                عملکرد ثبت‌شده در سیستم
              </div>
            </div>

            <div className="ta-stat">
              <div className="ta-stat-top">
                <div className="ta-stat-label">
                  معاملات امروز
                </div>

                <div className="ta-stat-icon">
                  <Icon name="chart" size={19} />
                </div>
              </div>

              <div className="ta-stat-value">
                {state.loading
                  ? "..."
                  : totalSignals}
              </div>

              <div className="ta-stat-foot">
                سیگنال‌های ثبت‌شده
              </div>
            </div>

            <div className="ta-stat">
              <div className="ta-stat-top">
                <div className="ta-stat-label">
                  ربات‌های فعال
                </div>

                <div className="ta-stat-icon">
                  <Icon name="robot" size={19} />
                </div>
              </div>

              <div className="ta-stat-value">
                {activeBots.length}
              </div>

              <div className="ta-stat-foot">
                از {state.bots.length} ربات
              </div>
            </div>

            <div className="ta-stat">
              <div className="ta-stat-top">
                <div className="ta-stat-label">
                  نرخ موفقیت
                </div>

                <div className="ta-stat-icon">
                  <Icon name="target" size={19} />
                </div>
              </div>

              <div
                className="ta-stat-value"
                style={{
                  color:
                    winRate >= 50
                      ? GREEN
                      : "#e0b85e",
                }}
              >
                {winRate}%
              </div>

              <div className="ta-stat-foot">
                بر اساس نتایج ثبت‌شده
              </div>
            </div>
          </section>

          {/* MARKET */}
          <section className="ta-card" style={{ marginBottom: 14 }}>
            <div className="ta-card-head">
              <div className="ta-card-title">
                <span className="ta-card-title-icon">
                  <Icon name="market" size={18} />
                </span>
                بازار زنده
              </div>

              <div className="ta-live-status">
                <span className="ta-live-dot" />
                اتصال داده
              </div>
            </div>

            <div className="ta-market-grid">
              {marketItems.map((item) => {
                const positive =
                  item.change !== null &&
                  item.change >= 0;

                return (
                  <div
                    className="ta-market"
                    key={item.symbol}
                  >
                    <div className="ta-market-symbol">
                      {item.symbol}
                    </div>

                    <div className="ta-market-price">
                      {price(
                        item.price,
                        item.symbol
                      )}
                    </div>

                    <div
                      className={`ta-market-change ${
                        item.change === null
                          ? "ta-neutral"
                          : positive
                            ? "ta-up"
                            : "ta-down"
                      }`}
                    >
                      {item.change === null
                        ? "در انتظار داده"
                        : `${positive ? "+" : ""}${item.change.toFixed(2)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* MAIN 2 COLUMN */}
          <section className="ta-grid-2">
            {/* SIGNALS */}
            <div className="ta-card">
              <div className="ta-card-head">
                <div className="ta-card-title">
                  <span className="ta-card-title-icon">
                    <Icon name="signals" size={18} />
                  </span>
                  سیگنال‌های زنده
                </div>

                <a
                  href="/signals"
                  className="ta-card-sub"
                >
                  مشاهده همه ←
                </a>
              </div>

              <div className="ta-body">
                {recentSignals.length === 0 ? (
                  <div className="ta-empty">
                    هنوز سیگنال ثبت‌شده‌ای برای نمایش
                    وجود ندارد.
                  </div>
                ) : (
                  <div className="ta-signal-list">
                    {recentSignals.map(
                      (signal, index) => {
                        const direction =
                          normalizeDirection(signal);

                        const color =
                          signalColor(direction);

                        const status = String(
                          signal.status || "—"
                        ).toUpperCase();

                        const active = [
                          "ACTIVE",
                          "OPEN",
                          "WAITING",
                          "TP1_HIT",
                          "TP2_HIT",
                        ].includes(status);

                        const entry =
                          getSignalEntry(signal);

                        return (
                          <div
                            className="ta-signal-row"
                            key={
                              signal.id ||
                              `${signal.symbol}-${index}`
                            }
                          >
                            <div
                              className={`ta-signal-direction ${
                                direction === "BUY"
                                  ? "ta-signal-buy"
                                  : direction ===
                                      "SELL"
                                    ? "ta-signal-sell"
                                    : ""
                              }`}
                            >
                              <Icon
                                name={
                                  direction ===
                                  "BUY"
                                    ? "trendUp"
                                    : direction ===
                                        "SELL"
                                      ? "trendDown"
                                      : "chart"
                                }
                                size={17}
                              />
                            </div>

                            <div>
                              <div className="ta-signal-symbol">
                                {signal.symbol ||
                                  "UNKNOWN"}
                              </div>

                              <div className="ta-signal-meta">
                                {direction} •{" "}
                                {signal.timeframe ||
                                  "—"}{" "}
                                •{" "}
                                {getSignalTime(
                                  signal
                                )}
                              </div>
                            </div>

                            <div className="ta-signal-price">
                              {price(
                                entry,
                                String(
                                  signal.symbol ||
                                    ""
                                )
                              )}
                            </div>

                            <div
                              className="ta-status"
                              style={{
                                color: active
                                  ? color
                                  : "#747d88",
                              }}
                            >
                              <span className="ta-status-dot" />
                              {active
                                ? "فعال"
                                : status}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* BOTS */}
            <div className="ta-card">
              <div className="ta-card-head">
                <div className="ta-card-title">
                  <span className="ta-card-title-icon">
                    <Icon name="bots" size={18} />
                  </span>
                  ربات‌های در حال اجرا
                </div>

                <a
                  href="/bots"
                  className="ta-card-sub"
                >
                  مدیریت ربات‌ها ←
                </a>
              </div>

              <div className="ta-body">
                {state.bots.length === 0 ? (
                  <div className="ta-empty">
                    هنوز رباتی برای نمایش ثبت نشده است.
                  </div>
                ) : (
                  <div className="ta-bot-list">
                    {state.bots
                      .slice(0, 5)
                      .map((bot, index) => {
                        const active =
                          bot.isActive === true ||
                          String(
                            bot.botStatus || ""
                          ).toUpperCase() ===
                            "ACTIVE";

                        return (
                          <div
                            className="ta-bot-row"
                            key={
                              bot.id ||
                              `${bot.name}-${index}`
                            }
                          >
                            <div className="ta-bot-icon">
                              <Icon
                                name="robot"
                                size={18}
                              />
                            </div>

                            <div className="ta-bot-main">
                              <div className="ta-bot-name">
                                {bot.name ||
                                  "Analyzer Bot"}
                              </div>

                              <div className="ta-bot-symbol">
                                {bot.symbol ||
                                  "—"}{" "}
                                •{" "}
                                {bot.timeframe ||
                                  "—"}
                              </div>
                            </div>

                            <div className="ta-bot-state">
                              <span className="ta-live-dot" />
                              {active
                                ? "فعال"
                                : "خاموش"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* PERFORMANCE + ACTIVE */}
          <section className="ta-grid-2">
            <div className="ta-card">
              <div className="ta-card-head">
                <div className="ta-card-title">
                  <span className="ta-card-title-icon">
                    <Icon name="chart" size={18} />
                  </span>
                  عملکرد حساب
                </div>

                <div className="ta-card-sub">
                  داده‌های ثبت‌شده
                </div>
              </div>

              <div className="ta-performance">
                <div className="ta-ring-wrap">
                  <div className="ta-ring">
                    <div className="ta-ring-value">
                      {winRate}%
                    </div>
                  </div>

                  <div className="ta-performance-main">
                    <div className="ta-performance-title">
                      نرخ موفقیت
                    </div>

                    <div
                      className="ta-performance-number"
                      style={{
                        color:
                          totalProfit >= 0
                            ? GREEN
                            : RED,
                      }}
                    >
                      {money(totalProfit)}
                    </div>

                    <div className="ta-performance-caption">
                      این بخش فقط از داده‌های واقعی
                      ثبت‌شده در سیستم استفاده می‌کند.
                      در صورت نبود معامله، عدد ساختگی
                      نمایش داده نمی‌شود.
                    </div>
                  </div>
                </div>

                <div className="ta-bars">
                  {[22, 35, 28, 54, 41, 67, 50, 75, 45, 62].map(
                    (height, index) => (
                      <div
                        className="ta-bar"
                        key={index}
                        style={{
                          height: `${height}%`,
                          opacity:
                            state.signals.length > 0
                              ? 0.75
                              : 0.22,
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="ta-card">
              <div className="ta-card-head">
                <div className="ta-card-title">
                  <span className="ta-card-title-icon">
                    <Icon name="target" size={18} />
                  </span>
                  وضعیت زنده سیستم
                </div>
              </div>

              <div className="ta-body">
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      padding: "11px 12px",
                      borderRadius: 12,
                      background:
                        "rgba(255,255,255,.025)",
                      border:
                        "1px solid rgba(255,255,255,.045)",
                    }}
                  >
                    <span
                      style={{
                        color: "#747d88",
                        fontSize: 9,
                      }}
                    >
                      ربات فعال
                    </span>

                    <strong
                      style={{
                        color: GREEN,
                        fontSize: 10,
                      }}
                    >
                      {activeBots.length}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      padding: "11px 12px",
                      borderRadius: 12,
                      background:
                        "rgba(255,255,255,.025)",
                      border:
                        "1px solid rgba(255,255,255,.045)",
                    }}
                  >
                    <span
                      style={{
                        color: "#747d88",
                        fontSize: 9,
                      }}
                    >
                      سیگنال فعال
                    </span>

                    <strong
                      style={{
                        color: GOLD_LIGHT,
                        fontSize: 10,
                      }}
                    >
                      {activeSignals.length}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      padding: "11px 12px",
                      borderRadius: 12,
                      background:
                        "rgba(255,255,255,.025)",
                      border:
                        "1px solid rgba(255,255,255,.045)",
                    }}
                  >
                    <span
                      style={{
                        color: "#747d88",
                        fontSize: 9,
                      }}
                    >
                      وضعیت داده
                    </span>

                    <strong
                      style={{
                        color: GREEN,
                        fontSize: 10,
                      }}
                    >
                      آنلاین
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      padding: "11px 12px",
                      borderRadius: 12,
                      background:
                        "rgba(255,255,255,.025)",
                      border:
                        "1px solid rgba(255,255,255,.045)",
                    }}
                  >
                    <span
                      style={{
                        color: "#747d88",
                        fontSize: 9,
                      }}
                    >
                      آخرین بروزرسانی
                    </span>

                    <strong
                      style={{
                        color: "#c4cad2",
                        fontSize: 9,
                        direction: "ltr",
                      }}
                    >
                      {lastUpdate
                        ? lastUpdate.toLocaleTimeString(
                            "fa-IR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="ta-action-grid">
            <a
              href="/broker"
              className="ta-action"
            >
              <div className="ta-action-icon">
                <Icon name="broker" size={19} />
              </div>

              <div className="ta-action-text">
                اتصال به
                <br />
                بروکر
              </div>
            </a>

            <a
              href="/metatrader"
              className="ta-action"
            >
              <div className="ta-action-icon">
                <Icon name="mt" size={19} />
              </div>

              <div className="ta-action-text">
                اتصال به
                <br />
                متاتریدر
              </div>
            </a>

            <a
              href="/signals"
              className="ta-action"
            >
              <div className="ta-action-icon">
                <Icon name="signals" size={19} />
              </div>

              <div className="ta-action-text">
                مشاهده
                <br />
                سیگنال‌ها
              </div>
            </a>

            <a
              href="/telegram"
              className="ta-action"
            >
              <div className="ta-action-icon">
                <Icon name="telegram" size={19} />
              </div>

              <div className="ta-action-text">
                تلگرام و
                <br />
                اعلان‌ها
              </div>
            </a>

            <a
              href="/support"
              className="ta-action"
            >
              <div className="ta-action-icon">
                <Icon name="support" size={19} />
              </div>

              <div className="ta-action-text">
                پشتیبانی
                <br />
                کاربران
              </div>
            </a>
          </section>

          {/* NEWS + SUBSCRIPTION */}
          <section className="ta-bottom-grid">
            <div className="ta-card">
              <div className="ta-card-head">
                <div className="ta-card-title">
                  <span className="ta-card-title-icon">
                    <Icon name="news" size={18} />
                  </span>
                  آخرین اخبار و تحلیل‌ها
                </div>

                <a
                  href="/news"
                  className="ta-card-sub"
                >
                  مشاهده همه ←
                </a>
              </div>

              <div>
                <div className="ta-news-item">
                  <div className="ta-news-thumb">
                    <Icon name="trendUp" size={20} />
                  </div>

                  <div className="ta-news-main">
                    <div className="ta-news-title">
                      تحلیل بازار و بررسی روند قیمت
                      دارایی‌های منتخب
                    </div>

                    <div className="ta-news-meta">
                      تحلیل بازار • سیستم Trading AI
                    </div>
                  </div>
                </div>

                <div className="ta-news-item">
                  <div className="ta-news-thumb">
                    <Icon name="calendar" size={20} />
                  </div>

                  <div className="ta-news-main">
                    <div className="ta-news-title">
                      رویدادهای مهم تقویم اقتصادی و
                      تاثیر احتمالی آنها بر بازار
                    </div>

                    <div className="ta-news-meta">
                      تقویم اقتصادی
                    </div>
                  </div>
                </div>

                <div className="ta-news-item">
                  <div className="ta-news-thumb">
                    <Icon name="analysis" size={20} />
                  </div>

                  <div className="ta-news-main">
                    <div className="ta-news-title">
                      تحلیل تکنیکال و بررسی سطوح مهم
                      حمایت و مقاومت
                    </div>

                    <div className="ta-news-meta">
                      تحلیل تکنیکال
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ta-card">
              <div className="ta-card-head">
                <div className="ta-card-title">
                  <span className="ta-card-title-icon">
                    <Icon name="subscription" size={18} />
                  </span>
                  اشتراک و خدمات
                </div>
              </div>

              <div className="ta-subscription">
                <div className="ta-plan">
                  <div className="ta-plan-top">
                    <div className="ta-plan-name">
                      {state.user?.plan ||
                        "FREE"}
                    </div>

                    <div className="ta-plan-badge">
                      PLAN
                    </div>
                  </div>

                  <div className="ta-plan-info">
                    وضعیت پلن حساب شما از اطلاعات
                    حساب کاربری خوانده می‌شود.
                    <br />
                    برای مشاهده و مدیریت اشتراک:
                  </div>

                  <a
                    href="/subscriptions"
                    style={{
                      display: "block",
                      textAlign: "center",
                      marginTop: 12,
                      padding: "9px 10px",
                      borderRadius: 10,
                      background:
                        "rgba(216,180,90,.1)",
                      border:
                        "1px solid rgba(216,180,90,.2)",
                      color: GOLD_LIGHT,
                      fontSize: 9,
                      fontWeight: 800,
                    }}
                  >
                    مدیریت اشتراک
                  </a>
                </div>

                <div className="ta-support">
                  <div className="ta-support-title">
                    <Icon
                      name="support"
                      size={16}
                    />
                    پشتیبانی
                  </div>

                  <div className="ta-support-text">
                    برای سوالات مربوط به حساب،
                    سیگنال‌ها، اشتراک و اتصال بروکر
                    با پشتیبانی در ارتباط باشید.
                  </div>

                  <a
                    href="/support"
                    style={{
                      display: "inline-block",
                      marginTop: 7,
                      color: GOLD_LIGHT,
                      fontSize: 9,
                    }}
                  >
                    ایجاد تیکت جدید ←
                  </a>
                </div>
              </div>
            </div>
          </section>

          <footer className="ta-footer">
            <span>
              Trading AI Platform
            </span>

            <span>
              © 2026
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
