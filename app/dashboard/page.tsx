import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type SignalRow = {
  id: string;
  symbol: string;
  timeframe: string | null;
  direction: string;
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  riskReward: number | null;
  score: number | null;
  confidence: number | null;
  status: string;
  createdAt: Date;
};

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function directionLabel(direction: string) {
  const value = String(direction).toUpperCase();

  if (value === "BUY" || value === "LONG") {
    return {
      text: "BUY",
      className: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      icon: "↗",
    };
  }

  if (value === "SELL" || value === "SHORT") {
    return {
      text: "SELL",
      className: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      icon: "↘",
    };
  }

  return {
    text: value,
    className: "text-yellow-300",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: "•",
  };
}

function statusLabel(status: string) {
  const value = String(status).toUpperCase();

  switch (value) {
    case "ACTIVE":
      return {
        text: "فعال",
        className: "text-emerald-400",
      };

    case "TP1_HIT":
      return {
        text: "TP1",
        className: "text-emerald-400",
      };

    case "TP2_HIT":
      return {
        text: "TP2",
        className: "text-emerald-400",
      };

    case "TP3_HIT":
      return {
        text: "TP3",
        className: "text-emerald-400",
      };

    case "STOP_LOSS":
      return {
        text: "حد ضرر",
        className: "text-red-400",
      };

    case "CLOSED":
      return {
        text: "بسته",
        className: "text-zinc-400",
      };

    case "EXPIRED":
      return {
        text: "منقضی",
        className: "text-zinc-500",
      };

    case "WAITING":
      return {
        text: "در انتظار",
        className: "text-yellow-400",
      };

    default:
      return {
        text: value,
        className: "text-zinc-400",
      };
  }
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

  const [signals, activeBots, totalBots, activeSignals, totalSignals] =
    await Promise.all([
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
          takeProfit: true,
          stopLoss: true,
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

  const typedSignals = signals as SignalRow[];

  const buySignals = typedSignals.filter(
    (signal) =>
      String(signal.direction).toUpperCase() === "BUY" ||
      String(signal.direction).toUpperCase() === "LONG",
  ).length;

  const sellSignals = typedSignals.filter(
    (signal) =>
      String(signal.direction).toUpperCase() === "SELL" ||
      String(signal.direction).toUpperCase() === "SHORT",
  ).length;

  const completedSignals = typedSignals.filter((signal) =>
    ["TP1_HIT", "TP2_HIT", "TP3_HIT", "STOP_LOSS", "CLOSED"].includes(
      String(signal.status).toUpperCase(),
    ),
  );

  const winningSignals = typedSignals.filter((signal) =>
    ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(
      String(signal.status).toUpperCase(),
    ),
  );

  const winRate =
    completedSignals.length > 0
      ? Math.round((winningSignals.length / completedSignals.length) * 100)
      : 0;

  const firstName =
    user.name?.trim()?.split(" ")?.[0] || "کاربر";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#070b10] text-white"
    >
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(212,175,55,0.08),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(0,180,255,0.06),transparent_25%)]">
        <div className="mx-auto flex min-h-screen max-w-[1600px]">

          {/* ================= SIDEBAR ================= */}

          <aside className="hidden w-[270px] shrink-0 border-l border-white/[0.07] bg-[#090e14]/95 p-5 lg:block">
            <div className="sticky top-5">

              {/* LOGO */}
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-300/20 to-yellow-600/5 shadow-[0_0_30px_rgba(212,175,55,0.12)]">
                  <span className="text-xl font-black text-yellow-300">
                    T
                  </span>
                </div>

                <div>
                  <div className="text-lg font-black tracking-tight">
                    TRADING AI
                  </div>
                  <div className="text-[10px] tracking-[0.3em] text-zinc-500">
                    SMART TRADING PLATFORM
                  </div>
                </div>
              </div>

              {/* PROFILE */}
              <div className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-400/30 bg-gradient-to-br from-yellow-300/20 to-zinc-800">
                    <span className="font-bold text-yellow-300">
                      {firstName.slice(0, 1).toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {user.name || "کاربر"}
                    </div>

                    <div className="truncate text-[11px] text-zinc-500">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* MENU */}
              <nav className="space-y-1">

                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-xl border border-yellow-400/15 bg-yellow-400/[0.08] px-4 py-3 text-sm font-bold text-yellow-300"
                >
                  <span>⌂</span>
                  <span>خانه</span>
                </Link>

                <Link
                  href="/market"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>◈</span>
                  <span>بازار زنده</span>
                </Link>

                <Link
                  href="/signals"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>⌁</span>
                  <span>سیگنال‌ها</span>
                </Link>

                <Link
                  href="/bots"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>◉</span>
                  <span>ربات‌های معاملاتی</span>
                </Link>

                <Link
                  href="/performance"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>↗</span>
                  <span>عملکرد</span>
                </Link>

                <Link
                  href="/trades"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>▣</span>
                  <span>معاملات</span>
                </Link>

                <div className="my-5 h-px bg-white/[0.06]" />

                <Link
                  href="/news"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>◫</span>
                  <span>اخبار</span>
                </Link>

                <Link
                  href="/economic"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>▦</span>
                  <span>تقویم اقتصادی</span>
                </Link>

                <Link
                  href="/broker"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>↔</span>
                  <span>اتصال به بروکر</span>
                </Link>

                <Link
                  href="/metatrader"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>◉</span>
                  <span>اتصال به متاتریدر</span>
                </Link>

                <Link
                  href="/telegram"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>✈</span>
                  <span>تلگرام و اعلان‌ها</span>
                </Link>

                <Link
                  href="/subscriptions"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>♢</span>
                  <span>اشتراک‌ها</span>
                </Link>

                <Link
                  href="/support"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>?</span>
                  <span>پشتیبانی</span>
                </Link>

                <div className="my-5 h-px bg-white/[0.06]" />

                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>♙</span>
                  <span>پروفایل</span>
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span>⚙</span>
                  <span>تنظیمات</span>
                </Link>

                <Link
                  href="/api/auth/logout"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                >
                  <span>↪</span>
                  <span>خروج</span>
                </Link>

              </nav>

              {/* SUPPORT */}
              <div className="mt-6 rounded-2xl border border-yellow-400/10 bg-gradient-to-br from-yellow-400/[0.07] to-transparent p-4">
                <div className="mb-2 text-xs text-zinc-500">
                  پشتیبانی
                </div>

                <div className="mb-3 text-sm font-bold">
                  سوالی دارید؟
                </div>

                <Link
                  href="/support"
                  className="block rounded-xl border border-yellow-400/20 bg-yellow-400/[0.08] px-3 py-2 text-center text-xs font-bold text-yellow-300"
                >
                  ایجاد تیکت جدید
                </Link>
              </div>
            </div>
          </aside>

          {/* ================= MAIN ================= */}

          <section className="min-w-0 flex-1">

            {/* TOPBAR */}
            <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070b10]/90 px-4 py-4 backdrop-blur-xl md:px-7">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <div className="text-lg font-black md:text-xl">
                    سلام، {firstName} 👋
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">
                    به پنل هوشمند Trading AI خوش آمدید
                  </div>
                </div>

                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    className="hidden h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs text-zinc-300 sm:block"
                  >
                    فارسی 🇮🇷
                  </button>

                  <Link
                    href="/settings"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300"
                  >
                    ⚙
                  </Link>

                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07]">
                    🔔
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-yellow-400" />
                  </div>

                </div>
              </div>
            </header>

            <div className="space-y-5 p-4 md:p-7">

              {/* ANNOUNCEMENT */}
              <section className="rounded-3xl border border-yellow-400/10 bg-gradient-to-r from-yellow-400/[0.08] via-white/[0.025] to-transparent p-5 shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-yellow-300">📢</span>
                      <span className="text-xs font-bold text-yellow-300">
                        اطلاعیه مهم
                      </span>
                    </div>

                    <div className="text-sm font-bold">
                      سیستم تحلیل و مدیریت سیگنال‌ها فعال است.
                    </div>

                    <p className="mt-2 text-xs leading-6 text-zinc-500">
                      وضعیت ربات‌ها، سیگنال‌های واقعی ثبت‌شده و عملکرد
                      حساب خود را از همین داشبورد مشاهده کنید.
                    </p>
                  </div>

                  <Link
                    href="/signals"
                    className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.08] px-5 py-3 text-center text-xs font-bold text-yellow-300"
                  >
                    مشاهده سیگنال‌ها
                  </Link>
                </div>
              </section>

              {/* STAT CARDS */}
              <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      ربات‌های فعال
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                      ◉
                    </span>
                  </div>

                  <div className="text-2xl font-black">
                    {activeBots}
                  </div>

                  <div className="mt-1 text-[11px] text-zinc-600">
                    از {totalBots} ربات
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      سیگنال‌های فعال
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      ↗
                    </span>
                  </div>

                  <div className="text-2xl font-black">
                    {activeSignals}
                  </div>

                  <div className="mt-1 text-[11px] text-zinc-600">
                    در حال پیگیری
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      کل سیگنال‌ها
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      ◇
                    </span>
                  </div>

                  <div className="text-2xl font-black">
                    {totalSignals}
                  </div>

                  <div className="mt-1 text-[11px] text-zinc-600">
                    ثبت‌شده در حساب
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      نرخ موفقیت
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-300">
                      %
                    </span>
                  </div>

                  <div className="text-2xl font-black text-yellow-300">
                    {winRate}%
                  </div>

                  <div className="mt-1 text-[11px] text-zinc-600">
                    بر اساس سیگنال‌های تکمیل‌شده
                  </div>
                </div>

              </section>

              {/* LIVE MARKET */}
              <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">

                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black">
                      بازار زنده
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-600">
                      اتصال داده بازار از بخش Live Market
                    </div>
                  </div>

                  <Link
                    href="/market"
                    className="text-xs text-yellow-300"
                  >
                    مشاهده بازار ←
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

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
                      className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
                    >
                      <div className="text-xs font-bold text-zinc-300">
                        {symbol}
                      </div>

                      <div className="mt-3 text-sm font-black text-zinc-500">
                        —
                      </div>

                      <div className="mt-1 text-[10px] text-zinc-600">
                        در انتظار داده زنده
                      </div>
                    </div>
                  ))}

                </div>
              </section>

              {/* MAIN GRID */}
              <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">

                {/* SIGNALS */}
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black">
                        آخرین سیگنال‌ها
                      </div>

                      <div className="mt-1 text-[11px] text-zinc-600">
                        آخرین سیگنال‌های ثبت‌شده برای حساب شما
                      </div>
                    </div>

                    <Link
                      href="/signals"
                      className="text-xs text-yellow-300"
                    >
                      همه سیگنال‌ها ←
                    </Link>
                  </div>

                  {typedSignals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
                      <div className="text-3xl opacity-30">
                        ◇
                      </div>

                      <div className="mt-3 text-sm font-bold">
                        هنوز سیگنالی ثبت نشده است
                      </div>

                      <div className="mt-2 text-xs leading-6 text-zinc-600">
                        وقتی موتور تحلیل یک سیگنال معتبر ایجاد کند،
                        اینجا نمایش داده می‌شود.
                      </div>

                      <Link
                        href="/signals"
                        className="mt-5 inline-block rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] px-5 py-3 text-xs font-bold text-yellow-300"
                      >
                        ورود به سیگنال‌ها
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {typedSignals.map((signal) => {
                        const direction = directionLabel(signal.direction);
                        const status = statusLabel(signal.status);

                        return (
                          <div
                            key={signal.id}
                            className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 transition hover:border-yellow-400/15"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-lg">
                                  {direction.icon}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black">
                                      {signal.symbol}
                                    </span>

                                    <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[9px] text-zinc-500">
                                      {signal.timeframe || "—"}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-[10px] text-zinc-600">
                                    {formatDate(signal.createdAt)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-black ${direction.bg} ${direction.className}`}
                                >
                                  {direction.text}
                                </span>

                                <span
                                  className={`rounded-lg bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold ${status.className}`}
                                >
                                  {status.text}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">

                              <div className="rounded-xl bg-white/[0.025] p-3">
                                <div className="text-[9px] text-zinc-600">
                                  ورود
                                </div>

                                <div className="mt-1 text-xs font-black">
                                  {formatNumber(signal.entry)}
                                </div>
                              </div>

                              <div className="rounded-xl bg-white/[0.025] p-3">
                                <div className="text-[9px] text-zinc-600">
                                  حد ضرر
                                </div>

                                <div className="mt-1 text-xs font-black text-red-400">
                                  {formatNumber(signal.stopLoss)}
                                </div>
                              </div>

                              <div className="rounded-xl bg-white/[0.025] p-3">
                                <div className="text-[9px] text-zinc-600">
                                  حد سود
                                </div>

                                <div className="mt-1 text-xs font-black text-emerald-400">
                                  {formatNumber(signal.takeProfit)}
                                </div>
                              </div>

                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">

                              <div className="text-[10px] text-zinc-600">
                                Score:{" "}
                                <span className="font-bold text-zinc-300">
                                  {signal.score ?? "—"}
                                </span>
                              </div>

                              <div className="text-[10px] text-zinc-600">
                                RR:{" "}
                                <span className="font-bold text-yellow-300">
                                  {signal.riskReward
                                    ? `${formatNumber(signal.riskReward)}R`
                                    : "—"}
                                </span>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PERFORMANCE */}
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">

                  <div className="mb-6">
                    <div className="text-sm font-black">
                      عملکرد حساب
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-600">
                      خلاصه عملکرد سیگنال‌های ثبت‌شده
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-4">
                    <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-[14px] border-white/[0.05]">
                      <div className="absolute inset-[-14px] rounded-full border-[14px] border-transparent border-t-emerald-400 border-r-emerald-400 rotate-45" />

                      <div className="text-center">
                        <div className="text-4xl font-black text-emerald-400">
                          {winRate}%
                        </div>

                        <div className="mt-1 text-[10px] text-zinc-600">
                          Win Rate
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                      <div className="text-[10px] text-zinc-600">
                        BUY
                      </div>

                      <div className="mt-2 text-xl font-black text-emerald-400">
                        {buySignals}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4">
                      <div className="text-[10px] text-zinc-600">
                        SELL
                      </div>

                      <div className="mt-2 text-xl font-black text-red-400">
                        {sellSignals}
                      </div>
                    </div>

                  </div>

                  <Link
                    href="/performance"
                    className="mt-4 block rounded-xl border border-yellow-400/15 bg-yellow-400/[0.06] px-4 py-3 text-center text-xs font-bold text-yellow-300"
                  >
                    مشاهده عملکرد کامل
                  </Link>

                </div>

              </section>

              {/* QUICK ACCESS */}
              <section>
                <div className="mb-3 text-sm font-black">
                  دسترسی سریع
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

                  <Link
                    href="/signals"
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/20"
                  >
                    <div className="mb-4 text-xl text-yellow-300">
                      ◇
                    </div>

                    <div className="text-xs font-bold">
                      سیگنال‌ها
                    </div>
                  </Link>

                  <Link
                    href="/bots"
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/20"
                  >
                    <div className="mb-4 text-xl text-purple-400">
                      ◉
                    </div>

                    <div className="text-xs font-bold">
                      ربات‌ها
                    </div>
                  </Link>

                  <Link
                    href="/trades"
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/20"
                  >
                    <div className="mb-4 text-xl text-blue-400">
                      ▣
                    </div>

                    <div className="text-xs font-bold">
                      معاملات
                    </div>
                  </Link>

                  <Link
                    href="/market"
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/20"
                  >
                    <div className="mb-4 text-xl text-emerald-400">
                      ↗
                    </div>

                    <div className="text-xs font-bold">
                      بازار زنده
                    </div>
                  </Link>

                  <Link
                    href="/broker"
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/20"
                  >
                    <div className="mb-4 text-xl text-cyan-400">
                      ↔
                    </div>

                    <div className="text-xs font-bold">
                      بروکر
                    </div>
                  </Link>

                  <Link
                    href="/telegram"
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/20"
                  >
                    <div className="mb-4 text-xl text-sky-400">
                      ✈
                    </div>

                    <div className="text-xs font-bold">
                      تلگرام
                    </div>
                  </Link>

                </div>
              </section>

              {/* BOTTOM */}
              <section className="grid gap-5 lg:grid-cols-2">

                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="mb-5">
                    <div className="text-sm font-black">
                      وضعیت سیستم
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-600">
                      وضعیت فعلی سرویس‌های حساب
                    </div>
                  </div>

                  <div className="space-y-3">

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.025] p-4">
                      <span className="text-xs text-zinc-400">
                        حساب کاربری
                      </span>

                      <span className="text-xs font-bold text-emerald-400">
                        فعال
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.025] p-4">
                      <span className="text-xs text-zinc-400">
                        موتور سیگنال
                      </span>

                      <span className="text-xs font-bold text-emerald-400">
                        آماده
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.025] p-4">
                      <span className="text-xs text-zinc-400">
                        Telegram
                      </span>

                      <Link
                        href="/telegram"
                        className="text-xs font-bold text-yellow-300"
                      >
                        مدیریت اتصال
                      </Link>
                    </div>

                  </div>
                </div>

                <div className="rounded-3xl border border-yellow-400/10 bg-gradient-to-br from-yellow-400/[0.06] to-transparent p-5">

                  <div className="text-sm font-black">
                    اشتراک و دسترسی
                  </div>

                  <div className="mt-2 text-xs leading-6 text-zinc-500">
                    پلن فعلی حساب شما:
                  </div>

                  <div className="mt-4 rounded-2xl border border-yellow-400/10 bg-black/20 p-4">
                    <div className="text-xl font-black text-yellow-300">
                      {user.plan || "FREE"}
                    </div>

                    <div className="mt-1 text-[10px] text-zinc-600">
                      وضعیت اشتراک حساب
                    </div>
                  </div>

                  <Link
                    href="/subscriptions"
                    className="mt-4 block rounded-xl border border-yellow-400/20 bg-yellow-400/[0.08] px-4 py-3 text-center text-xs font-bold text-yellow-300"
                  >
                    مدیریت اشتراک
                  </Link>

                </div>

              </section>

              <footer className="border-t border-white/[0.05] pt-5 text-center text-[10px] text-zinc-700">
                © Trading AI Platform — Smart Trading System
              </footer>

            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
