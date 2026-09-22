import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MARKET_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
];

const faPlan: Record<string, string> = {
  FREE: "رایگان",
  BASIC: "پایه",
  PRO: "حرفه‌ای",
  PREMIUM: "پریمیوم",
};

const faDirection: Record<string, string> = {
  BUY: "خرید",
  SELL: "فروش",
  LONG: "خرید",
  SHORT: "فروش",
};

const faSignalStatus: Record<string, string> = {
  WAITING: "در انتظار",
  ACTIVE: "فعال",
  OPEN: "باز",
  CLOSED: "بسته",
  EXPIRED: "منقضی",
  CANCELLED: "لغو شده",
  STOPPED: "متوقف",
};

const faTradeStatus: Record<string, string> = {
  OPEN: "باز",
  CLOSED: "بسته",
  STOPPED: "متوقف",
};

function numberText(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function integerText(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function priceText(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 10000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }

  if (value >= 100) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}

function dateText(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function marketLabel(symbol: string) {
  if (symbol === "BTCUSDT") return "BTC / USDT";
  if (symbol === "ETHUSDT") return "ETH / USDT";
  if (symbol === "XAUUSD") return "XAU / USD";
  if (symbol === "EURUSD") return "EUR / USD";
  if (symbol === "GBPUSD") return "GBP / USD";
  return symbol;
}

function directionLabel(direction: string) {
  return faDirection[direction] || direction;
}

function statusLabel(status: string) {
  return faSignalStatus[status] || faTradeStatus[status] || status;
}

function signalTone(direction: string) {
  const value = direction.toUpperCase();

  if (
    value === "BUY" ||
    value === "LONG"
  ) {
    return "buy";
  }

  return "sell";
}

function buildChartPoints(values: number[]) {
  if (values.length === 0) return "";

  if (values.length === 1) {
    return "50,80";
  }

  const width = 420;
  const height = 150;

  const min = Math.min(...values);
  const max = Math.max(...values);

  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const normalized = (value - min) / range;
      const y = height - normalized * 105 - 15;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  /*
   * IMPORTANT:
   * getSession() in this project returns userId.
   * It does NOT return session.user.
   */
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

  /*
   * Real database statistics
   */
  const [
    botsCount,
    activeBotsCount,
    signalsCount,
    activeSignalsCount,
    buySignalsCount,
    sellSignalsCount,
    tradesCount,
    openTradesCount,
    closedTradesCount,
    recentSignals,
    recentTrades,
    marketRows,
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
          in: ["WAITING", "ACTIVE", "OPEN"],
        },
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
        direction: {
          in: ["BUY", "LONG"],
        },
      },
    }),

    prisma.tradingSignal.count({
      where: {
        userId: user.id,
        direction: {
          in: ["SELL", "SHORT"],
        },
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
        status: "CLOSED",
      },
    }),

    prisma.tradingSignal.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
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
        telegramSent: true,
        createdAt: true,
      },
    }),

    prisma.trade.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        openedAt: "asc",
      },
      take: 12,
      select: {
        id: true,
        symbol: true,
        direction: true,
        entryPrice: true,
        exitPrice: true,
        takeProfit: true,
        stopLoss: true,
        quantity: true,
        profitLoss: true,
        status: true,
        source: true,
        openedAt: true,
        closedAt: true,
      },
    }),

    Promise.all(
      MARKET_SYMBOLS.map(async (symbol) => {
        const candles = await prisma.marketCandle.findMany({
          where: {
            symbol,
          },
          orderBy: {
            openTime: "desc",
          },
          take: 2,
          select: {
            close: true,
            openTime: true,
          },
        });

        const latest = candles[0] || null;
        const previous = candles[1] || null;

        let change = 0;

        if (
          latest &&
          previous &&
          previous.close !== 0
        ) {
          change =
            ((latest.close - previous.close) /
              previous.close) *
            100;
        }

        return {
          symbol,
          latest,
          previous,
          change,
        };
      })
    ),
  ]);

  /*
   * Real P/L chart
   */
  let cumulative = 0;

  const chartValues = recentTrades.map((trade) => {
    const pnl = Number(trade.profitLoss || 0);

    cumulative += Number.isFinite(pnl) ? pnl : 0;

    return cumulative;
  });

  const chartPoints = buildChartPoints(chartValues);

  const totalPnL = recentTrades.reduce(
    (sum, trade) => {
      const value = Number(trade.profitLoss || 0);

      return sum + (Number.isFinite(value) ? value : 0);
    },
    0
  );

  const winningTrades = recentTrades.filter(
    (trade) => Number(trade.profitLoss || 0) > 0
  ).length;

  const losingTrades = recentTrades.filter(
    (trade) => Number(trade.profitLoss || 0) < 0
  ).length;

  const winRate =
    winningTrades + losingTrades > 0
      ? (winningTrades /
          (winningTrades + losingTrades)) *
        100
      : 0;

  const userName = user.name || "کاربر";

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#020202] text-white"
    >
      {/* GLOBAL BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020202]">
        <div className="absolute -right-[180px] -top-[220px] h-[650px] w-[650px] rounded-full bg-[#d09a26]/[0.08] blur-[150px]" />

        <div className="absolute -left-[220px] top-[42%] h-[600px] w-[600px] rounded-full bg-[#8c6418]/[0.045] blur-[160px]" />

        <div className="absolute bottom-[-300px] right-[25%] h-[550px] w-[550px] rounded-full bg-[#d5a633]/[0.035] blur-[160px]" />

        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(#d7a83b_1px,transparent_1px),linear-gradient(90deg,#d7a83b_1px,transparent_1px)] [background-size:60px_60px]" />
      </div>

      <div className="mx-auto max-w-[1500px] px-2 py-2 sm:px-4 sm:py-4 lg:px-7 lg:py-7">

        {/* APP FRAME */}
        <div className="overflow-hidden rounded-[24px] border border-[#35280f] bg-[#050505]/95 shadow-[0_30px_100px_rgba(0,0,0,0.75)]">

          {/* HEADER */}
          <header className="border-b border-[#21190b] bg-[#060606]/95">

            <div className="flex min-h-[78px] items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-7">

              {/* BRAND */}
              <Link
                href="/dashboard"
                className="flex shrink-0 items-center gap-3"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#735719] bg-gradient-to-br from-[#2a1d07] via-[#0d0d0d] to-[#090909] shadow-[0_0_35px_rgba(214,165,51,0.12)]">
                  <div className="absolute inset-[5px] rounded-xl border border-[#4d3912]" />

                  <span className="relative text-xl text-[#e3b83f]">
                    ♛
                  </span>
                </div>

                <div className="hidden sm:block">
                  <div className="text-[17px] font-black tracking-[0.08em] text-[#e7ba43]">
                    TRADING AI
                  </div>

                  <div className="mt-1 text-[8px] tracking-[0.19em] text-[#777]">
                    SMART TRADING PLATFORM
                  </div>
                </div>
              </Link>

              {/* DESKTOP NAV */}
              <nav className="hidden items-center gap-1 xl:flex">
                <NavItem
                  href="/dashboard"
                  icon="⌂"
                  title="داشبورد"
                  active
                />

                <NavItem
                  href="/signals"
                  icon="↗"
                  title="سیگنال‌ها"
                />

                <NavItem
                  href="/bots"
                  icon="♙"
                  title="ربات‌ها"
                />

                <NavItem
                  href="/market"
                  icon="◈"
                  title="بازارها"
                />

                <NavItem
                  href="/broker"
                  icon="▣"
                  title="بروکر"
                />

                <NavItem
                  href="/payments"
                  icon="◇"
                  title="کیف پول"
                />

                <NavItem
                  href="/settings"
                  icon="⚙"
                  title="تنظیمات"
                />
              </nav>

              {/* HEADER ACTIONS */}
              <div className="flex items-center gap-2">

                <Link
                  href="/notifications"
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#2b210e] bg-[#0a0a0a] text-[#9b7930] transition hover:border-[#76591c] hover:text-[#e5b73f] sm:flex"
                >
                  ♧
                </Link>

                <div className="flex h-10 min-w-10 items-center justify-center rounded-full border border-[#80621b] bg-[#0b0b0b] px-3 text-sm font-black text-[#ddb039]">
                  {initial(userName)}
                </div>
              </div>
            </div>

            {/* MOBILE NAV */}
            <div className="border-t border-[#1a140a] px-3 py-3 xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                <MobileNavItem
                  href="/dashboard"
                  title="داشبورد"
                  icon="⌂"
                  active
                />

                <MobileNavItem
                  href="/signals"
                  title="سیگنال‌ها"
                  icon="↗"
                />

                <MobileNavItem
                  href="/bots"
                  title="ربات‌ها"
                  icon="♙"
                />

                <MobileNavItem
                  href="/market"
                  title="بازار"
                  icon="◈"
                />

                <MobileNavItem
                  href="/broker"
                  title="بروکر"
                  icon="▣"
                />

                <MobileNavItem
                  href="/settings"
                  title="تنظیمات"
                  icon="⚙"
                />
              </div>
            </div>
          </header>

          {/* MAIN */}
          <section className="px-3 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-8">

            {/* HERO */}
            <section className="relative overflow-hidden rounded-[24px] border border-[#493612] bg-gradient-to-br from-[#161006] via-[#080808] to-[#040404] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">

              <div className="pointer-events-none absolute right-[-160px] top-[-180px] h-[500px] w-[500px] rounded-full bg-[#d3a332]/[0.08] blur-[110px]" />

              <div className="pointer-events-none absolute bottom-[-220px] left-[15%] h-[450px] w-[600px] rounded-full bg-[#b27f1d]/[0.04] blur-[120px]" />

              <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">

                {/* HERO TEXT */}
                <div className="flex flex-col justify-center">

                  <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#4a3815] bg-[#110d06] px-3 py-2 text-[10px] font-bold text-[#c5a150]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#35c96a] shadow-[0_0_10px_#35c96a]" />
                    سیستم معاملاتی آنلاین
                  </div>

                  <h1 className="text-3xl font-black leading-[1.3] text-white sm:text-4xl lg:text-5xl">
                    هوش مصنوعی
                    <br />

                    <span className="bg-gradient-to-l from-[#f4ce61] via-[#d7a633] to-[#89641b] bg-clip-text text-transparent">
                      تحلیل بازار
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#858585] sm:text-base">
                    {userName} عزیز، پنل حرفه‌ای Trading AI برای مدیریت
                    سیگنال‌ها، ربات‌ها، معاملات و تحلیل بازار آماده است.
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                    <Link
                      href="/ai-analysis"
                      className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#edc34d] to-[#9d7019] px-7 text-sm font-black text-[#080808] shadow-[0_10px_35px_rgba(215,165,48,0.18)] transition hover:-translate-y-0.5 hover:brightness-110"
                    >
                      ✦ شروع تحلیل هوشمند
                    </Link>

                    <Link
                      href="/signals"
                      className="flex h-12 items-center justify-center rounded-xl border border-[#503b14] bg-[#0b0b0b] px-7 text-sm font-bold text-[#d2aa43] transition hover:border-[#8a681f] hover:bg-[#131006]"
                    >
                      مشاهده سیگنال‌ها
                    </Link>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-[#696969]">
                    <span>
                      ● {integerText(activeBotsCount)} ربات فعال
                    </span>

                    <span>
                      ● {integerText(activeSignalsCount)} سیگنال فعال
                    </span>

                    <span>
                      ● {integerText(openTradesCount)} معامله باز
                    </span>
                  </div>
                </div>

                {/* HERO CHART */}
                <div className="relative min-h-[250px] overflow-hidden rounded-2xl border border-[#3b2c11] bg-[#050505]">

                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(206,155,37,0.12),transparent_55%)]" />

                  <div className="absolute left-4 top-4 z-10">
                    <div className="text-[9px] tracking-[0.15em] text-[#6c6c6c]">
                      ACCOUNT PERFORMANCE
                    </div>

                    <div className="mt-1 text-sm font-black text-[#dfb33f]">
                      عملکرد معاملات
                    </div>
                  </div>

                  <div className="absolute right-4 top-4 z-10 rounded-lg border border-[#493713] bg-[#0a0a0a]/90 px-3 py-2">
                    <div className="text-[9px] text-[#6b6b6b]">
                      P/L
                    </div>

                    <div
                      className={[
                        "mt-1 text-sm font-black",
                        totalPnL > 0
                          ? "text-[#47c875]"
                          : totalPnL < 0
                            ? "text-[#e15a5a]"
                            : "text-[#d2a941]",
                      ].join(" ")}
                    >
                      {totalPnL > 0 ? "+" : ""}
                      {numberText(totalPnL)}
                    </div>
                  </div>

                  <div className="absolute inset-x-5 bottom-7 top-20">
                    <div className="absolute inset-0 flex flex-col justify-between opacity-30">
                      <span className="border-t border-[#71551a]" />
                      <span className="border-t border-[#71551a]" />
                      <span className="border-t border-[#71551a]" />
                      <span className="border-t border-[#71551a]" />
                    </div>

                    {chartPoints ? (
                      <svg
                        viewBox="0 0 420 150"
                        preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full overflow-visible"
                      >
                        <defs>
                          <linearGradient
                            id="goldLine"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop
                              offset="0%"
                              stopColor="#8e681b"
                            />

                            <stop
                              offset="55%"
                              stopColor="#dcb341"
                            />

                            <stop
                              offset="100%"
                              stopColor="#f1cf68"
                            />
                          </linearGradient>

                          <linearGradient
                            id="goldArea"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#d5a735"
                              stopOpacity="0.26"
                            />

                            <stop
                              offset="100%"
                              stopColor="#d5a735"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>

                        <polyline
                          points={chartPoints}
                          fill="none"
                          stroke="url(#goldLine)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl text-[#70551c]">
                            ◇
                          </div>

                          <div className="mt-2 text-xs text-[#626262]">
                            هنوز داده معاملاتی کافی نیست
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[8px] text-[#555]">
                    <span>
                      {recentTrades[0]
                        ? shortDate(recentTrades[0].openedAt)
                        : "—"}
                    </span>

                    <span>
                      {recentTrades.length
                        ? shortDate(
                            recentTrades[
                              recentTrades.length - 1
                            ].openedAt
                          )
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* STAT CARDS */}
            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <StatCard
                title="کل سیگنال‌ها"
                value={integerText(signalsCount)}
                description={`${integerText(activeSignalsCount)} سیگنال فعال`}
                icon="↗"
              />

              <StatCard
                title="ربات‌های معاملاتی"
                value={integerText(botsCount)}
                description={`${integerText(activeBotsCount)} ربات فعال`}
                icon="♙"
              />

              <StatCard
                title="کل معاملات"
                value={integerText(tradesCount)}
                description={`${integerText(openTradesCount)} معامله باز`}
                icon="◈"
              />

              <StatCard
                title="پلن حساب"
                value={faPlan[user.plan] || user.plan}
                description={
                  user.role === "ADMIN"
                    ? "دسترسی مدیر سیستم"
                    : "حساب کاربری"
                }
                icon="♛"
              />
            </section>

            {/* MARKET DATA */}
            <section className="mt-5">

              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">
                    بازارهای تحت نظر
                  </h2>

                  <p className="mt-1 text-[10px] text-[#626262]">
                    آخرین داده ثبت‌شده در Market Data
                  </p>
                </div>

                <Link
                  href="/market"
                  className="text-[10px] text-[#c8a13c] transition hover:text-[#f0c94e]"
                >
                  مشاهده بازار →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {marketRows.map((market) => {
                  const hasData = Boolean(market.latest);

                  return (
                    <div
                      key={market.symbol}
                      className="group rounded-2xl border border-[#30240f] bg-[#080808] p-4 transition hover:-translate-y-0.5 hover:border-[#725619]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-[#cfcfcf]">
                          {marketLabel(market.symbol)}
                        </span>

                        <span className="h-2 w-2 rounded-full bg-[#70551b]" />
                      </div>

                      <div className="mt-4 text-lg font-black text-white">
                        {hasData
                          ? priceText(market.latest?.close)
                          : "—"}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
                        <span className="text-[#5d5d5d]">
                          {hasData
                            ? "آخرین قیمت"
                            : "داده موجود نیست"}
                        </span>

                        {hasData && (
                          <span
                            className={
                              market.change > 0
                                ? "text-[#43c675]"
                                : market.change < 0
                                  ? "text-[#e35a5a]"
                                  : "text-[#9a7c2e]"
                            }
                          >
                            {market.change > 0 ? "+" : ""}
                            {market.change.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* MAIN GRID */}
            <section className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">

              {/* SIGNALS */}
              <div className="overflow-hidden rounded-[22px] border border-[#30240f] bg-[#070707]">

                <div className="flex items-center justify-between border-b border-[#211a0d] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-black text-white sm:text-lg">
                      سیگنال‌های معاملاتی
                    </h2>

                    <p className="mt-1 text-[10px] text-[#626262]">
                      آخرین سیگنال‌های ثبت‌شده توسط سیستم
                    </p>
                  </div>

                  <Link
                    href="/signals"
                    className="rounded-lg border border-[#483614] bg-[#120e07] px-3 py-2 text-[10px] font-bold text-[#d2a63a] transition hover:border-[#795b1c]"
                  >
                    همه سیگنال‌ها
                  </Link>
                </div>

                {recentSignals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">

                      <div className="grid grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_0.7fr_0.8fr] border-b border-[#18130a] px-5 py-3 text-[9px] text-[#626262]">
                        <div>دارایی</div>
                        <div>جهت</div>
                        <div>ورود</div>
                        <div>هدف</div>
                        <div>امتیاز</div>
                        <div>وضعیت</div>
                      </div>

                      {recentSignals.map((signal) => {
                        const tone = signalTone(
                          signal.direction
                        );

                        return (
                          <div
                            key={signal.id}
                            className="grid grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_0.7fr_0.8fr] items-center border-b border-[#15110a] px-5 py-4 transition hover:bg-[#0d0b07]"
                          >
                            <div>
                              <div className="text-xs font-black text-[#e2e2e2]">
                                {marketLabel(signal.symbol)}
                              </div>

                              <div className="mt-1 text-[9px] text-[#5e5e5e]">
                                {signal.timeframe || "—"} •{" "}
                                {signal.source || "ANALYSIS"}
                              </div>
                            </div>

                            <div>
                              <span
                                className={[
                                  "inline-flex rounded-lg border px-2.5 py-1.5 text-[9px] font-black",
                                  tone === "buy"
                                    ? "border-[#164a2c] bg-[#09170f] text-[#4ed47e]"
                                    : "border-[#4a1d1d] bg-[#190909] text-[#e56a6a]",
                                ].join(" ")}
                              >
                                {directionLabel(
                                  signal.direction
                                )}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-[#bdbdbd]">
                              {priceText(signal.entry)}
                            </div>

                            <div className="text-xs font-bold text-[#d1a83b]">
                              {priceText(
                                signal.takeProfit
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-black text-[#e0b43d]">
                                {signal.score !== null &&
                                signal.score !== undefined
                                  ? `${Math.round(
                                      signal.score
                                    )}%`
                                  : "—"}
                              </div>

                              <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-[#211b0e]">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#8e671d] to-[#e6bb47]"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        Number(
                                          signal.score || 0
                                        )
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div>
                              <span className="rounded-lg border border-[#332912] bg-[#0d0b07] px-2 py-1.5 text-[9px] text-[#a99154]">
                                {statusLabel(
                                  signal.status
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon="↗"
                    title="هنوز سیگنالی ثبت نشده است"
                    description="وقتی موتور تحلیل یا ربات معاملاتی یک سیگنال واقعی ایجاد کند، اطلاعات آن در این بخش نمایش داده می‌شود."
                    href="/ai-analysis"
                    button="شروع تحلیل"
                  />
                )}
              </div>

              {/* PERFORMANCE */}
              <div className="rounded-[22px] border border-[#30240f] bg-[#070707] p-5">

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-white">
                      عملکرد معاملات
                    </h2>

                    <p className="mt-1 text-[10px] text-[#626262]">
                      براساس معاملات ثبت‌شده
                    </p>
                  </div>

                  <span className="rounded-lg border border-[#3f3010] bg-[#100c06] px-2 py-1 text-[9px] text-[#c7a03a]">
                    REAL DATA
                  </span>
                </div>

                <div className="mt-6">
                  <div className="text-3xl font-black text-white">
                    {totalPnL > 0 ? "+" : ""}
                    {numberText(totalPnL)}
                  </div>

                  <div className="mt-1 text-[10px] text-[#626262]">
                    سود / زیان معاملات اخیر
                  </div>
                </div>

                <div className="mt-6 space-y-3">

                  <ProgressRow
                    label="نرخ معاملات موفق"
                    value={`${winRate.toFixed(1)}%`}
                    percentage={winRate}
                  />

                  <ProgressRow
                    label="معاملات بسته‌شده"
                    value={integerText(closedTradesCount)}
                    percentage={
                      tradesCount
                        ? (closedTradesCount /
                            tradesCount) *
                          100
                        : 0
                    }
                  />

                  <ProgressRow
                    label="خرید"
                    value={integerText(buySignalsCount)}
                    percentage={
                      signalsCount
                        ? (buySignalsCount /
                            signalsCount) *
                          100
                        : 0
                    }
                  />

                  <ProgressRow
                    label="فروش"
                    value={integerText(sellSignalsCount)}
                    percentage={
                      signalsCount
                        ? (sellSignalsCount /
                            signalsCount) *
                          100
                        : 0
                    }
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <MiniMetric
                    title="موفق"
                    value={integerText(winningTrades)}
                    tone="green"
                  />

                  <MiniMetric
                    title="زیان‌ده"
                    value={integerText(losingTrades)}
                    tone="red"
                  />
                </div>
              </div>
            </section>

            {/* TRADE ACTIVITY */}
            <section className="mt-7 rounded-[22px] border border-[#30240f] bg-[#070707]">

              <div className="flex items-center justify-between border-b border-[#211a0d] px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-base font-black text-white sm:text-lg">
                    آخرین معاملات
                  </h2>

                  <p className="mt-1 text-[10px] text-[#626262]">
                    اطلاعات واقعی ثبت‌شده در حساب
                  </p>
                </div>

                <Link
                  href="/trades"
                  className="text-[10px] text-[#c8a13c] hover:text-[#f0c94e]"
                >
                  مشاهده همه →
                </Link>
              </div>

              {recentTrades.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">

                    <div className="grid grid-cols-[1fr_0.7fr_0.8fr_0.9fr_0.8fr_0.8fr] border-b border-[#18130a] px-5 py-3 text-[9px] text-[#626262]">
                      <div>دارایی</div>
                      <div>جهت</div>
                      <div>ورود</div>
                      <div>خروج</div>
                      <div>P/L</div>
                      <div>وضعیت</div>
                    </div>

                    {[...recentTrades]
                      .reverse()
                      .map((trade) => {
                        const pnl = Number(
                          trade.profitLoss || 0
                        );

                        return (
                          <div
                            key={trade.id}
                            className="grid grid-cols-[1fr_0.7fr_0.8fr_0.9fr_0.8fr_0.8fr] items-center border-b border-[#15110a] px-5 py-4"
                          >
                            <div>
                              <div className="text-xs font-black text-[#ddd]">
                                {marketLabel(
                                  trade.symbol
                                )}
                              </div>

                              <div className="mt-1 text-[9px] text-[#575757]">
                                {dateText(
                                  trade.openedAt
                                )}
                              </div>
                            </div>

                            <div className="text-xs font-bold text-[#bfa04c]">
                              {directionLabel(
                                trade.direction
                              )}
                            </div>

                            <div className="text-xs text-[#aaa]">
                              {priceText(
                                trade.entryPrice
                              )}
                            </div>

                            <div className="text-xs text-[#aaa]">
                              {priceText(
                                trade.exitPrice
                              )}
                            </div>

                            <div
                              className={[
                                "text-xs font-black",
                                pnl > 0
                                  ? "text-[#43ca75]"
                                  : pnl < 0
                                    ? "text-[#e05b5b]"
                                    : "text-[#a8893a]",
                              ].join(" ")}
                            >
                              {pnl > 0 ? "+" : ""}
                              {numberText(pnl)}
                            </div>

                            <div>
                              <span className="rounded-lg border border-[#2f2612] bg-[#0c0b08] px-2 py-1.5 text-[9px] text-[#98834b]">
                                {faTradeStatus[
                                  trade.status
                                ] || trade.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon="◈"
                  title="هنوز معامله‌ای ثبت نشده است"
                  description="پس از ثبت معامله توسط سیستم یا ربات، فعالیت معاملاتی اینجا نمایش داده می‌شود."
                  href="/bots"
                  button="مدیریت ربات‌ها"
                />
              )}
            </section>

            {/* QUICK TOOLS */}
            <section className="mt-7">

              <div className="mb-4">
                <h2 className="text-xl font-black text-white">
                  ابزارهای حرفه‌ای
                </h2>

                <p className="mt-1 text-[10px] text-[#626262]">
                  دسترسی سریع به امکانات اصلی پلتفرم
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

                <ToolCard
                  href="/ai-analysis"
                  icon="✦"
                  title="تحلیل AI"
                  description="تحلیل هوشمند بازار"
                />

                <ToolCard
                  href="/signals"
                  icon="↗"
                  title="سیگنال‌ها"
                  description="سیگنال‌های معاملاتی"
                />

                <ToolCard
                  href="/bots"
                  icon="♙"
                  title="ربات‌ها"
                  description="مدیریت ربات‌ها"
                />

                <ToolCard
                  href="/market"
                  icon="◈"
                  title="بازار"
                  description="داده بازار"
                />

                <ToolCard
                  href="/news"
                  icon="▤"
                  title="اخبار"
                  description="اخبار اقتصادی"
                />

                <ToolCard
                  href="/economic"
                  icon="◌"
                  title="تقویم"
                  description="رویدادهای اقتصادی"
                />
              </div>
            </section>

            {/* SYSTEM STATUS */}
            <section className="mt-7 grid gap-5 md:grid-cols-3">

              <StatusCard
                title="Trading AI Engine"
                description="موتور اصلی پلتفرم"
                status="ONLINE"
              />

              <StatusCard
                title="Database"
                description="اتصال پایگاه داده"
                status="CONNECTED"
              />

              <StatusCard
                title="Signal Engine"
                description="موتور پردازش سیگنال"
                status={
                  activeBotsCount > 0
                    ? "READY"
                    : "WAITING"
                }
              />
            </section>

            {/* ACCOUNT */}
            <section className="mt-7 rounded-[22px] border border-[#382a10] bg-gradient-to-r from-[#100d07] via-[#070707] to-[#0d0b07] p-5 sm:p-6">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#765719] bg-[#110d06] text-xl font-black text-[#dfb13b]">
                    {initial(userName)}
                  </div>

                  <div>
                    <div className="text-sm font-black text-white">
                      {userName}
                    </div>

                    <div className="mt-1 text-[10px] text-[#656565]">
                      {user.email}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-lg border border-[#493713] bg-[#100d07] px-2 py-1 text-[9px] text-[#c9a23d]">
                        {faPlan[user.plan] ||
                          user.plan}
                      </span>

                      {user.role === "ADMIN" && (
                        <span className="rounded-lg border border-[#4a3812] bg-[#151006] px-2 py-1 text-[9px] text-[#e2b944]">
                          ADMIN
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/settings"
                    className="flex h-10 items-center justify-center rounded-xl border border-[#4b3814] bg-[#100d07] px-5 text-xs font-bold text-[#d3aa40] transition hover:bg-[#181208]"
                  >
                    تنظیمات حساب
                  </Link>

                  <Link
                    href="/support"
                    className="flex h-10 items-center justify-center rounded-xl border border-[#28200e] bg-[#080808] px-5 text-xs font-bold text-[#858585] transition hover:text-[#d4aa3e]"
                  >
                    پشتیبانی
                  </Link>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer className="mt-8 border-t border-[#1c160b] pt-5">

              <div className="flex flex-col gap-4 text-[10px] text-[#555] sm:flex-row sm:items-center sm:justify-between">

                <div>
                  © {new Date().getFullYear()} Trading AI
                  <span className="mx-2 text-[#33270f]">
                    •
                  </span>
                  Smart Trading Platform
                </div>

                <div className="flex flex-wrap items-center gap-4">

                  <Link
                    href="/support"
                    className="transition hover:text-[#cda73e]"
                  >
                    پشتیبانی
                  </Link>

                  <Link
                    href="/settings"
                    className="transition hover:text-[#cda73e]"
                  >
                    تنظیمات
                  </Link>

                  <span className="flex items-center gap-2 text-[#4a9c67]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#36c96a]" />
                    سیستم فعال
                  </span>
                </div>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ========================================================= */
/* NAVIGATION                                                  */
/* ========================================================= */

function NavItem({
  href,
  icon,
  title,
  active = false,
}: {
  href: string;
  icon: string;
  title: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "relative flex items-center gap-2 rounded-xl px-3 py-3 text-xs transition",
        active
          ? "bg-[#181207] text-[#e3b63e]"
          : "text-[#777] hover:bg-[#0d0d0d] hover:text-[#dfb33f]",
      ].join(" ")}
    >
      <span className="text-base">{icon}</span>

      <span>{title}</span>

      {active && (
        <span className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[#ddb03b] shadow-[0_0_12px_rgba(221,176,59,0.75)]" />
      )}
    </Link>
  );
}

function MobileNavItem({
  href,
  icon,
  title,
  active = false,
}: {
  href: string;
  icon: string;
  title: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold transition",
        active
          ? "border-[#765719] bg-[#1b1407] text-[#e1b53c]"
          : "border-[#21190c] bg-[#090909] text-[#777]",
      ].join(" ")}
    >
      <span>{icon}</span>
      <span>{title}</span>
    </Link>
  );
}

/* ========================================================= */
/* STAT CARD                                                   */
/* ========================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="group rounded-2xl border border-[#30240f] bg-[#080808] p-4 transition hover:-translate-y-0.5 hover:border-[#705419] hover:bg-[#0b0b0b]">
      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">
          <div className="text-[10px] text-[#686868]">
            {title}
          </div>

          <div className="mt-3 truncate text-xl font-black text-white sm:text-2xl">
            {value}
          </div>

          <div className="mt-1 truncate text-[9px] text-[#555]">
            {description}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#483613] bg-[#110d06] text-[#d6a837]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* EMPTY STATE                                                  */
/* ========================================================= */

function EmptyState({
  icon,
  title,
  description,
  href,
  button,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  button: string;
}) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center px-6 py-10 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#493714] bg-[#110d06] text-xl text-[#cda238] shadow-[0_0_30px_rgba(205,162,56,0.07)]">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-black text-[#d9d9d9]">
        {title}
      </h3>

      <p className="mt-2 max-w-lg text-[10px] leading-6 text-[#606060]">
        {description}
      </p>

      <Link
        href={href}
        className="mt-5 rounded-xl border border-[#4a3814] bg-[#120e07] px-5 py-2.5 text-[10px] font-bold text-[#d3a83d] transition hover:border-[#7a5c1c] hover:bg-[#181208]"
      >
        {button}
      </Link>
    </div>
  );
}

/* ========================================================= */
/* PROGRESS                                                     */
/* ========================================================= */

function ProgressRow({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  const safePercentage = Math.min(
    100,
    Math.max(0, percentage)
  );

  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#777]">{label}</span>

        <span className="font-bold text-[#c9a33d]">
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#19150c]">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#f0c74f] to-[#8b641b]"
          style={{
            width: `${safePercentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ========================================================= */
/* MINI METRIC                                                  */
/* ========================================================= */

function MiniMetric({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-[#251d0e] bg-[#0a0a0a] p-3">
      <div className="text-[9px] text-[#5f5f5f]">
        {title}
      </div>

      <div
        className={[
          "mt-2 text-lg font-black",
          tone === "green"
            ? "text-[#43c876]"
            : "text-[#df5e5e]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

/* ========================================================= */
/* TOOL CARD                                                    */
/* ========================================================= */

function ToolCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#30240f] bg-[#080808] p-4 transition duration-200 hover:-translate-y-1 hover:border-[#735719] hover:bg-[#0d0b08]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#483614] bg-[#110d06] text-lg text-[#d6a938] transition group-hover:border-[#8a671e] group-hover:shadow-[0_0_22px_rgba(211,164,51,0.1)]">
        {icon}
      </div>

      <div className="mt-4 text-xs font-black text-[#ddd]">
        {title}
      </div>

      <div className="mt-2 text-[9px] leading-5 text-[#606060]">
        {description}
      </div>
    </Link>
  );
}

/* ========================================================= */
/* STATUS CARD                                                  */
/* ========================================================= */

function StatusCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-[#30240f] bg-[#080808] p-4">

      <div className="flex items-center justify-between gap-3">

        <div>
          <div className="text-xs font-black text-[#ddd]">
            {title}
          </div>

          <div className="mt-1 text-[9px] text-[#5b5b5b]">
            {description}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[#173b24] bg-[#08150d] px-2.5 py-1.5 text-[8px] font-black text-[#4ccc77]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#39ca6c] shadow-[0_0_8px_#39ca6c]" />
          {status}
        </div>
      </div>
    </div>
  );
}
