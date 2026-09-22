"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SignalSide = "BUY" | "SELL";
type SignalStatus =
  | "ACTIVE"
  | "PENDING"
  | "RUNNING"
  | "HIT_TP"
  | "HIT_SL"
  | "CLOSED"
  | "EXPIRED"
  | "CANCELLED"
  | string;

type Signal = {
  id: string;
  symbol: string;
  market: string;
  type: SignalSide | string;

  entry: number | null;
  stop: number | null;

  target: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  confidence: number | null;
  signalScore: number | null;
  confirmations: number | null;

  status: SignalStatus;

  timeframe: string | null;
  createdAt: string | null;
  expiresAt: string | null;

  riskReward: number | null;

  analysis: string | null;
  reason: string | null;

  botName: string | null;
};

type ApiResponse = {
  success?: boolean;
  signals?: Signal[];
  data?: Signal[];
  error?: string;
};

const SYMBOL_CONFIG: Record<
  string,
  {
    title: string;
    short: string;
    market: string;
    icon: "gold" | "bitcoin" | "euro" | "pound" | "yen" | "generic";
  }
> = {
  XAUUSD: {
    title: "طلا",
    short: "XAU/USD",
    market: "Gold",
    icon: "gold",
  },

  "XAU/USD": {
    title: "طلا",
    short: "XAU/USD",
    market: "Gold",
    icon: "gold",
  },

  BTCUSDT: {
    title: "بیت‌کوین",
    short: "BTC/USDT",
    market: "Crypto",
    icon: "bitcoin",
  },

  "BTC/USDT": {
    title: "بیت‌کوین",
    short: "BTC/USDT",
    market: "Crypto",
    icon: "bitcoin",
  },

  EURUSD: {
    title: "یورو / دلار",
    short: "EUR/USD",
    market: "Forex",
    icon: "euro",
  },

  "EUR/USD": {
    title: "یورو / دلار",
    short: "EUR/USD",
    market: "Forex",
    icon: "euro",
  },

  GBPUSD: {
    title: "پوند / دلار",
    short: "GBP/USD",
    market: "Forex",
    icon: "pound",
  },

  "GBP/USD": {
    title: "پوند / دلار",
    short: "GBP/USD",
    market: "Forex",
    icon: "pound",
  },

  USDJPY: {
    title: "دلار / ین",
    short: "USD/JPY",
    market: "Forex",
    icon: "yen",
  },

  "USD/JPY": {
    title: "دلار / ین",
    short: "USD/JPY",
    market: "Forex",
    icon: "yen",
  },
};

function normalizeSymbol(symbol: string) {
  return symbol.replace(/[\s/_-]/g, "").toUpperCase();
}

function getSymbolConfig(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  return (
    SYMBOL_CONFIG[normalized] ??
    SYMBOL_CONFIG[symbol.toUpperCase()] ?? {
      title: symbol,
      short: symbol,
      market: "Market",
      icon: "generic" as const,
    }
  );
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (Math.abs(value) >= 100) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (Math.abs(value) >= 10) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 5,
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getConfidence(signal: Signal) {
  const value = signal.confidence ?? signal.signalScore;

  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
}

function getSide(signal: Signal): SignalSide | null {
  const type = String(signal.type ?? "").toUpperCase();

  if (type === "BUY" || type === "LONG") {
    return "BUY";
  }

  if (type === "SELL" || type === "SHORT") {
    return "SELL";
  }

  return null;
}

function statusLabel(status: string) {
  const value = status.toUpperCase();

  switch (value) {
    case "ACTIVE":
      return "فعال";

    case "PENDING":
      return "در انتظار اجرا";

    case "RUNNING":
      return "در حال معامله";

    case "HIT_TP":
      return "سود دریافت شد";

    case "HIT_SL":
      return "حد ضرر فعال شد";

    case "CLOSED":
      return "بسته شده";

    case "EXPIRED":
      return "منقضی شده";

    case "CANCELLED":
      return "لغو شده";

    default:
      return status;
  }
}

function isOpenStatus(status: string) {
  return ["ACTIVE", "PENDING", "RUNNING"].includes(
    status.toUpperCase(),
  );
}

function SymbolIcon({
  type,
  size = 64,
}: {
  type: "gold" | "bitcoin" | "euro" | "pound" | "yen" | "generic";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };

  if (type === "gold") {
    return (
      <svg {...common}>
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="url(#goldGradient)"
          stroke="rgba(255,255,255,.25)"
          strokeWidth="1"
        />
        <path
          d="M18 39L26 23H38L46 39H18Z"
          fill="rgba(255,255,255,.16)"
          stroke="white"
          strokeOpacity=".72"
          strokeWidth="2"
        />
        <path
          d="M24 33H40"
          stroke="white"
          strokeOpacity=".7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M28 28H36"
          stroke="white"
          strokeOpacity=".7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="goldGradient"
            x1="8"
            y1="8"
            x2="56"
            y2="56"
          >
            <stop stopColor="#FFF2A8" />
            <stop offset=".45" stopColor="#F6C84C" />
            <stop offset="1" stopColor="#B77900" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (type === "bitcoin") {
    return (
      <svg {...common}>
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="#F7931A"
        />
        <circle
          cx="32"
          cy="32"
          r="24"
          stroke="white"
          strokeOpacity=".18"
          strokeWidth="2"
        />
        <path
          d="M36.5 20.5C40.7 21.4 42.2 24.1 41.1 27.1C40.5 28.8 39.3 29.7 37.8 30.2C40.1 31.1 41.4 32.9 40.7 35.3C39.7 39.1 36.4 40.4 31.9 39.5L30.6 44L27.7 43.2L29 38.8L26.9 38.2L25.6 42.5L22.7 41.7L24 37.2L21 36.3L22 33L24.2 33.6L27.9 21L25.8 20.4L26.8 17.2L29.8 18.1L31.1 13.7L34 14.5L32.7 18.9L34.8 19.5L36.1 15.1L39 15.9L37.7 20.3L36.5 20.5ZM31.3 22.5L29.9 27.4L33.2 28.3C35.6 29 37.1 27.8 37.5 26.4C37.9 24.8 36.6 23.6 34.7 23.1L31.3 22.5ZM28.9 30.8L27.5 35.8L31.2 36.8C33.5 37.4 35.4 36.6 35.8 34.8C36.3 33 34.8 32 32.8 31.4L28.9 30.8Z"
          fill="white"
        />
      </svg>
    );
  }

  if (type === "euro") {
    return (
      <svg {...common}>
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="#2563EB"
        />
        <circle
          cx="32"
          cy="32"
          r="23"
          stroke="white"
          strokeOpacity=".18"
          strokeWidth="2"
        />
        <path
          d="M42 22C39.7 20.3 37 19.5 34.2 19.5C27.8 19.5 23.2 24.7 22.2 31H19L18.2 34H21.8C21.8 34.6 21.8 35.2 21.9 35.8H19.8L19 38.8H22.7C24.3 44.2 28.8 47 34.4 47C37.4 47 40.1 46.2 42 44.5L40.1 41.2C38.5 42.4 36.6 43 34.6 43C31.6 43 29.4 41.6 28.3 38.8H36.8L37.6 35.8H27.5C27.4 35.2 27.4 34.6 27.4 34H38L38.8 31H27.8C28.8 26.7 31.3 24.5 34.5 24.5C36.4 24.5 38.3 25.1 40 26.5L42 22Z"
          fill="white"
        />
      </svg>
    );
  }

  if (type === "pound") {
    return (
      <svg {...common}>
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="#7C3AED"
        />
        <circle
          cx="32"
          cy="32"
          r="23"
          stroke="white"
          strokeOpacity=".18"
          strokeWidth="2"
        />
        <path
          d="M39 21.5C37.4 19.6 35 18.5 32 18.5C26.8 18.5 23.8 22 23.8 26.7C23.8 28.5 24.1 30 24.9 31.5H21.5V35H26.3C25.5 37.6 23.9 39.2 21 41V44H43V39.8H28.6C30.2 38.1 31 36.7 31.3 35H38V31.5H31.1C30.5 30.1 30.1 28.7 30.1 27.2C30.1 24.8 31.1 23.2 33 23.2C34.3 23.2 35.4 23.9 36.1 25.1L39 21.5Z"
          fill="white"
        />
      </svg>
    );
  }

  if (type === "yen") {
    return (
      <svg {...common}>
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="#DC2626"
        />
        <circle
          cx="32"
          cy="32"
          r="23"
          stroke="white"
          strokeOpacity=".18"
          strokeWidth="2"
        />
        <path
          d="M22 20L29.5 31.5V34H25V38H29.5V43H34.5V38H39V34H34.5V31.5L42 20H36.7L32 28.5L27.3 20H22Z"
          fill="white"
        />
        <path
          d="M27 35H37"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="#0F766E"
      />
      <path
        d="M20 34L27 27L34 34L44 24"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37 24H44V31"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignalCard({
  signal,
}: {
  signal: Signal;
}) {
  const config = getSymbolConfig(signal.symbol);
  const side = getSide(signal);
  const confidence = getConfidence(signal);

  const tp1 =
    signal.takeProfit1 ??
    signal.target ??
    null;

  const tp2 = signal.takeProfit2 ?? null;
  const tp3 = signal.takeProfit3 ?? null;

  const isBuy = side === "BUY";
  const isSell = side === "SELL";

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0a1424]/90 shadow-[0_20px_80px_rgba(0,0,0,.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20">
      <div
        className={`absolute inset-x-0 top-0 h-[2px] ${
          isBuy
            ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            : isSell
              ? "bg-gradient-to-r from-transparent via-rose-400 to-transparent"
              : "bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        }`}
      />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2 shadow-inner">
              <SymbolIcon type={config.icon} size={62} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-white">
                  {config.title}
                </h2>

                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-300">
                  {config.short}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{config.market}</span>

                {signal.timeframe && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>{signal.timeframe}</span>
                  </>
                )}

                {signal.botName && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>{signal.botName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={`shrink-0 rounded-2xl px-3 py-2 text-center ${
              isBuy
                ? "border border-emerald-400/20 bg-emerald-400/10"
                : isSell
                  ? "border border-rose-400/20 bg-rose-400/10"
                  : "border border-cyan-400/20 bg-cyan-400/10"
            }`}
          >
            <div
              className={`text-sm font-black ${
                isBuy
                  ? "text-emerald-300"
                  : isSell
                    ? "text-rose-300"
                    : "text-cyan-300"
              }`}
            >
              {side === "BUY"
                ? "BUY"
                : side === "SELL"
                  ? "SELL"
                  : "—"}
            </div>

            <div className="mt-0.5 text-[10px] text-slate-500">
              Signal
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PriceBox
            label="Entry"
            value={formatPrice(signal.entry)}
            accent="cyan"
          />

          <PriceBox
            label="Stop Loss"
            value={formatPrice(signal.stop)}
            accent="rose"
          />

          <PriceBox
            label="Take Profit 1"
            value={formatPrice(tp1)}
            accent="emerald"
          />

          <PriceBox
            label="Risk / Reward"
            value={
              signal.riskReward !== null &&
              Number.isFinite(signal.riskReward)
                ? `${signal.riskReward.toFixed(2)}R`
                : "—"
            }
            accent="violet"
          />
        </div>

        {(tp2 !== null || tp3 !== null) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {tp2 !== null && (
              <PriceBox
                label="Take Profit 2"
                value={formatPrice(tp2)}
                accent="emerald"
              />
            )}

            {tp3 !== null && (
              <PriceBox
                label="Take Profit 3"
                value={formatPrice(tp3)}
                accent="emerald"
              />
            )}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              قدرت سیگنال
            </span>

            <span className="text-sm font-black text-white">
              {confidence !== null
                ? `${confidence}%`
                : "در دسترس نیست"}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            {confidence !== null && (
              <div
                className={`h-full rounded-full transition-all ${
                  confidence >= 80
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                    : confidence >= 60
                      ? "bg-gradient-to-r from-amber-500 to-yellow-300"
                      : "bg-gradient-to-r from-rose-500 to-orange-400"
                }`}
                style={{
                  width: `${confidence}%`,
                }}
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {signal.confirmations !== null && (
              <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-slate-300">
                {signal.confirmations} تأیید
              </span>
            )}

            <span
              className={`rounded-full border px-3 py-1.5 ${
                isOpenStatus(signal.status)
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-white/[0.07] bg-white/[0.035] text-slate-300"
              }`}
            >
              {statusLabel(signal.status)}
            </span>
          </div>
        </div>

        {(signal.reason || signal.analysis) && (
          <div className="mt-4 rounded-2xl border border-cyan-400/[0.08] bg-cyan-400/[0.025] p-4">
            <div className="mb-2 text-xs font-black text-cyan-300">
              منطق تحلیل
            </div>

            <p className="text-sm leading-7 text-slate-300">
              {signal.reason || signal.analysis}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="text-[11px] text-slate-500">
              ایجاد سیگنال
            </div>
            <div className="mt-1 text-sm font-bold text-slate-200">
              {formatDate(signal.createdAt)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="text-[11px] text-slate-500">
              انقضا
            </div>
            <div className="mt-1 text-sm font-bold text-slate-200">
              {formatDate(signal.expiresAt)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function PriceBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "rose" | "emerald" | "violet";
}) {
  const classes = {
    cyan: "text-cyan-300 border-cyan-400/10",
    rose: "text-rose-300 border-rose-400/10",
    emerald: "text-emerald-300 border-emerald-400/10",
    violet: "text-violet-300 border-violet-400/10",
  };

  return (
    <div
      className={`rounded-2xl border bg-white/[0.025] p-3 ${classes[accent]}`}
    >
      <div className="text-[10px] font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-black">
        {value}
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "BUY" | "SELL" | "ACTIVE"
  >("ALL");

  const loadSignals = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/signals?limit=50",
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          },
        );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok || data.success === false) {
          throw new Error(
            data.error ||
              "دریافت سیگنال‌ها با خطا مواجه شد.",
          );
        }

        const incoming =
          Array.isArray(data.signals)
            ? data.signals
            : Array.isArray(data.data)
              ? data.data
              : [];

        setSignals(incoming);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "دریافت سیگنال‌ها انجام نشد.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSignals();

    const interval = window.setInterval(() => {
      loadSignals(true);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadSignals]);

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      const side = getSide(signal);

      if (filter === "BUY") {
        return side === "BUY";
      }

      if (filter === "SELL") {
        return side === "SELL";
      }

      if (filter === "ACTIVE") {
        return isOpenStatus(signal.status);
      }

      return true;
    });
  }, [signals, filter]);

  const stats = useMemo(() => {
    const active = signals.filter((signal) =>
      isOpenStatus(signal.status),
    ).length;

    const buy = signals.filter(
      (signal) => getSide(signal) === "BUY",
    ).length;

    const sell = signals.filter(
      (signal) => getSide(signal) === "SELL",
    ).length;

    const scores = signals
      .map(getConfidence)
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value),
      );

    const average =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, value) => sum + value, 0) /
              scores.length,
          )
        : null;

    return {
      total: signals.length,
      active,
      buy,
      sell,
      average,
    };
  }, [signals]);

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#040b16] text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute left-[-180px] top-[40%] h-[420px] w-[420px] rounded-full bg-blue-600/[0.06] blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[30%] h-[360px] w-[360px] rounded-full bg-violet-600/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#081321]/90 shadow-[0_25px_100px_rgba(0,0,0,.35)] backdrop-blur-xl">
          <div className="relative p-5 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-bold text-cyan-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  موتور سیگنال Trading AI
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  سیگنال‌های معاملاتی
                  <span className="mr-2 text-cyan-400">
                    AI
                  </span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  این بخش فقط سیگنال‌هایی را نمایش می‌دهد که از
                  backend سیستم دریافت شده‌اند؛ اعداد Entry،
                  Stop Loss و Take Profit در رابط کاربری ساخته
                  نمی‌شوند.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadSignals(true)}
                disabled={refreshing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-black text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className={refreshing ? "animate-spin" : ""}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 11A8.1 8.1 0 0 0 5.5 6.5L4 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 4V8H8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 13A8.1 8.1 0 0 0 18.5 17.5L20 16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20 20V16H16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {refreshing
                  ? "در حال بروزرسانی..."
                  : "بروزرسانی"}
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            title="کل سیگنال‌ها"
            value={stats.total}
            icon="◎"
          />

          <StatCard
            title="سیگنال فعال"
            value={stats.active}
            icon="◉"
          />

          <StatCard
            title="BUY"
            value={stats.buy}
            icon="↗"
          />

          <StatCard
            title="SELL"
            value={stats.sell}
            icon="↘"
          />

          <StatCard
            title="میانگین قدرت"
            value={
              stats.average !== null
                ? `${stats.average}%`
                : "—"
            }
            icon="AI"
          />
        </section>

        <section className="mb-6 flex flex-col gap-3 rounded-[24px] border border-white/[0.07] bg-[#081321]/80 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            >
              همه
            </FilterButton>

            <FilterButton
              active={filter === "ACTIVE"}
              onClick={() => setFilter("ACTIVE")}
            >
              فعال
            </FilterButton>

            <FilterButton
              active={filter === "BUY"}
              onClick={() => setFilter("BUY")}
            >
              BUY
            </FilterButton>

            <FilterButton
              active={filter === "SELL"}
              onClick={() => setFilter("SELL")}
            >
              SELL
            </FilterButton>
          </div>

          <div className="text-xs text-slate-500">
            بروزرسانی خودکار هر ۳۰ ثانیه
          </div>
        </section>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => loadSignals()}
          />
        ) : filteredSignals.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
              />
            ))}
          </section>
        )}

        <footer className="mt-8 rounded-[24px] border border-white/[0.06] bg-[#081321]/60 p-5 text-center">
          <p className="text-xs leading-6 text-slate-500">
            سیگنال‌های این صفحه باید از منبع واقعی backend تولید
            شوند. این رابط کاربری هیچ سیگنال معاملاتی را به‌صورت
            ساختگی تولید نمی‌کند.
          </p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.07] bg-[#081321]/80 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">
          {title}
        </span>

        <span className="rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-1 text-xs font-black text-cyan-300">
          {icon}
        </span>
      </div>

      <div className="mt-3 text-2xl font-black text-white">
        {value}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
        active
          ? "bg-cyan-400 text-[#03101b] shadow-[0_8px_25px_rgba(34,211,238,.18)]"
          : "border border-white/[0.07] bg-white/[0.025] text-slate-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingState() {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[28px] border border-white/[0.07] bg-[#081321]/80 p-6"
        >
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.06]" />
            <div className="flex-1">
              <div className="h-5 w-40 rounded bg-white/[0.06]" />
              <div className="mt-3 h-3 w-24 rounded bg-white/[0.05]" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((box) => (
              <div
                key={box}
                className="h-20 rounded-2xl bg-white/[0.035]"
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[30px] border border-dashed border-white/[0.1] bg-[#081321]/70 px-6 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.05] text-3xl">
        AI
      </div>

      <h2 className="mt-6 text-xl font-black text-white">
        هنوز سیگنال واقعی ثبت نشده است
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
        در حال حاضر هیچ سیگنال واقعی از backend برای نمایش
        وجود ندارد. بعد از اینکه موتور تحلیل یک سیگنال معتبر
        ایجاد و در دیتابیس ثبت کند، اینجا به‌صورت خودکار نمایش
        داده می‌شود.
      </p>
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[30px] border border-rose-400/10 bg-rose-400/[0.035] px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/10 bg-rose-400/[0.06] text-2xl text-rose-300">
        !
      </div>

      <h2 className="mt-5 text-xl font-black text-white">
        دریافت سیگنال‌ها انجام نشد
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-xl bg-rose-400/10 px-5 py-3 text-sm font-black text-rose-300 transition hover:bg-rose-400/15"
      >
        تلاش مجدد
      </button>
    </section>
  );
}
