import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getInitial(name?: string | null) {
  if (!name) return "U";
  return name.trim().charAt(0).toUpperCase();
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const [
    botsCount,
    activeBotsCount,
    signalsCount,
    tradesCount,
    openTradesCount,
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
    }).catch(() => 0),
  ]);

  const userName = user.name || "کاربر";
  const initial = getInitial(user.name);

  const navigation = [
    {
      href: "/dashboard",
      icon: "⌂",
      title: "داشبورد",
    },
    {
      href: "/signals",
      icon: "⌁",
      title: "سیگنال‌ها",
    },
    {
      href: "/bots",
      icon: "♙",
      title: "ربات‌ها",
    },
    {
      href: "/market",
      icon: "◈",
      title: "بازارها",
    },
    {
      href: "/broker",
      icon: "▣",
      title: "اتصال بروکر",
    },
    {
      href: "/payments",
      icon: "◉",
      title: "کیف پول",
    },
    {
      href: "/settings",
      icon: "⚙",
      title: "تنظیمات",
    },
  ];

  const quickActions = [
    {
      href: "/ai-analysis",
      icon: "✦",
      title: "تحلیل هوش مصنوعی",
      description: "تحلیل بازار با موتور AI",
    },
    {
      href: "/signals",
      icon: "↗",
      title: "سیگنال‌های معاملاتی",
      description: "مشاهده سیگنال‌های واقعی",
    },
    {
      href: "/bots",
      icon: "♙",
      title: "مدیریت ربات‌ها",
      description: "کنترل و تنظیم ربات‌ها",
    },
    {
      href: "/market",
      icon: "◈",
      title: "بازار",
      description: "بررسی وضعیت بازار",
    },
    {
      href: "/news",
      icon: "▤",
      title: "اخبار اقتصادی",
      description: "اخبار و رویدادهای بازار",
    },
    {
      href: "/support",
      icon: "◌",
      title: "پشتیبانی",
      description: "ارتباط با تیم پشتیبانی",
    },
  ];

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#030303] text-white"
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#030303]">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#b88918]/[0.07] blur-[150px]" />
        <div className="absolute right-[-180px] top-[420px] h-[500px] w-[500px] rounded-full bg-[#8a6512]/[0.045] blur-[140px]" />
        <div className="absolute bottom-[-250px] left-[-180px] h-[500px] w-[500px] rounded-full bg-[#d09a24]/[0.035] blur-[140px]" />
      </div>

      <div className="mx-auto min-h-screen max-w-[1450px] px-3 py-3 sm:px-5 lg:px-8 lg:py-6">
        {/* Main shell */}
        <div className="overflow-hidden rounded-[24px] border border-[#3a2a0d] bg-[#070707]/95 shadow-[0_0_80px_rgba(0,0,0,0.55)]">

          {/* Header */}
          <header className="border-b border-[#241b0b] bg-[#080808]">
            <div className="flex min-h-[82px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

              {/* Logo */}
              <Link
                href="/dashboard"
                className="group flex min-w-0 items-center gap-3"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#80601a] bg-gradient-to-br from-[#211707] via-[#0c0c0c] to-[#161006] shadow-[0_0_30px_rgba(210,155,35,0.12)]">
                  <div className="absolute inset-[5px] rounded-xl border border-[#5f4715]" />
                  <span className="relative text-xl text-[#e0ad38]">♛</span>
                </div>

                <div className="hidden sm:block">
                  <div className="text-[17px] font-black tracking-[0.08em] text-[#e6b943]">
                    TRADING AI
                  </div>
                  <div className="mt-1 text-[9px] tracking-[0.18em] text-[#777]">
                    SMART TRADING PLATFORM
                  </div>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden items-center gap-1 xl:flex">
                {navigation.map((item) => {
                  const active = item.href === "/dashboard";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "group relative flex items-center gap-2 rounded-xl px-3 py-3 text-sm transition",
                        active
                          ? "bg-[#1a1306] text-[#e4b43f]"
                          : "text-[#858585] hover:bg-[#111] hover:text-[#e4b43f]",
                      ].join(" ")}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.title}</span>

                      {active && (
                        <span className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[#d7a52e] shadow-[0_0_12px_rgba(215,165,46,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-2">
                <Link
                  href="/notifications"
                  className="hidden h-11 w-11 items-center justify-center rounded-xl border border-[#28200f] bg-[#0c0c0c] text-[#a7894b] transition hover:border-[#725619] hover:text-[#e5b83f] sm:flex"
                  aria-label="اعلان‌ها"
                >
                  ♧
                </Link>

                <Link
                  href="/settings"
                  className="hidden h-11 w-11 items-center justify-center rounded-xl border border-[#28200f] bg-[#0c0c0c] text-[#a7894b] transition hover:border-[#725619] hover:text-[#e5b83f] sm:flex"
                  aria-label="تنظیمات"
                >
                  ⚙
                </Link>

                <div className="flex h-11 min-w-11 items-center justify-center rounded-full border border-[#765818] bg-[#0d0d0d] px-3 text-sm font-bold text-[#d9ab38]">
                  {initial}
                </div>
              </div>
            </div>

            {/* Mobile nav */}
            <div className="border-t border-[#19140b] px-3 py-3 xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {navigation.map((item) => {
                  const active = item.href === "/dashboard";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition",
                        active
                          ? "border-[#745617] bg-[#211805] text-[#e5b83f]"
                          : "border-[#211a0d] bg-[#0b0b0b] text-[#898989]",
                      ].join(" ")}
                    >
                      <span>{item.icon}</span>
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Content */}
          <section className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">

            {/* Hero */}
            <div className="relative overflow-hidden rounded-[22px] border border-[#4a3712] bg-gradient-to-br from-[#171106] via-[#090909] to-[#050505] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-7 lg:p-9">

              <div className="pointer-events-none absolute right-[-100px] top-[-130px] h-[350px] w-[350px] rounded-full bg-[#c08b22]/[0.08] blur-[80px]" />

              <div className="pointer-events-none absolute bottom-[-180px] left-[20%] h-[350px] w-[500px] rounded-full bg-[#9d7219]/[0.05] blur-[100px]" />

              <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

                {/* Hero text */}
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4b3814] bg-[#120e07] px-3 py-1.5 text-xs text-[#b99751]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#36b86b] shadow-[0_0_8px_#36b86b]" />
                    سیستم آنلاین و متصل
                  </div>

                  <h1 className="max-w-2xl text-3xl font-black leading-[1.35] text-white sm:text-4xl lg:text-5xl">
                    هوش مصنوعی
                    <br />
                    <span className="bg-gradient-to-l from-[#f3c954] via-[#c99727] to-[#806018] bg-clip-text text-transparent">
                      تحلیل بازار
                    </span>
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-[#858585] sm:text-base">
                    {userName} عزیز، به پنل هوشمند Trading AI خوش آمدید.
                    وضعیت ربات‌ها، سیگنال‌ها و فعالیت معاملاتی خود را از اینجا مدیریت کنید.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/ai-analysis"
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#e4b53d] to-[#a87513] px-6 text-sm font-black text-[#080808] shadow-[0_8px_30px_rgba(200,145,30,0.18)] transition hover:-translate-y-0.5 hover:brightness-110"
                    >
                      ✦ شروع تحلیل هوشمند
                    </Link>

                    <Link
                      href="/signals"
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-[#4a3815] bg-[#0b0b0b] px-6 text-sm font-bold text-[#c6a653] transition hover:border-[#8a671d] hover:bg-[#151108]"
                    >
                      مشاهده سیگنال‌ها
                    </Link>
                  </div>
                </div>

                {/* Hero visual */}
                <div className="relative mx-auto flex w-full max-w-[430px] items-center justify-center">
                  <div className="relative h-[250px] w-full overflow-hidden rounded-2xl border border-[#3e2d10] bg-[#050505]">
                    <div className="absolute inset-0 opacity-50">
                      <div className="absolute inset-x-0 top-[25%] border-t border-[#493914]" />
                      <div className="absolute inset-x-0 top-[50%] border-t border-[#493914]" />
                      <div className="absolute inset-x-0 top-[75%] border-t border-[#493914]" />
                      <div className="absolute left-[20%] inset-y-0 border-l border-[#493914]" />
                      <div className="absolute left-[40%] inset-y-0 border-l border-[#493914]" />
                      <div className="absolute left-[60%] inset-y-0 border-l border-[#493914]" />
                      <div className="absolute left-[80%] inset-y-0 border-l border-[#493914]" />
                    </div>

                    <div className="absolute bottom-[34px] left-[8%] right-[8%] h-[2px] rotate-[-10deg] bg-gradient-to-r from-transparent via-[#e0ad36] to-transparent shadow-[0_0_15px_rgba(224,173,54,0.65)]" />

                    <div className="absolute bottom-[55px] left-[13%] h-10 w-3 rounded-sm bg-[#9c7420]" />
                    <div className="absolute bottom-[65px] left-[25%] h-16 w-3 rounded-sm bg-[#d7aa35]" />
                    <div className="absolute bottom-[48px] left-[38%] h-9 w-3 rounded-sm bg-[#886419]" />
                    <div className="absolute bottom-[76px] left-[51%] h-20 w-3 rounded-sm bg-[#e4b43d]" />
                    <div className="absolute bottom-[94px] left-[64%] h-24 w-3 rounded-sm bg-[#c69327]" />
                    <div className="absolute bottom-[108px] left-[77%] h-28 w-3 rounded-sm bg-[#efc34b]" />

                    <div className="absolute bottom-4 right-4 rounded-lg border border-[#4d3a15] bg-[#0a0a0a]/90 px-3 py-2 text-right">
                      <div className="text-[10px] text-[#777]">
                        AI MARKET ENGINE
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#dcae35]">
                        ACTIVE
                      </div>
                    </div>

                    <div className="absolute left-4 top-4 rounded-lg border border-[#4d3a15] bg-[#0a0a0a]/90 px-3 py-2">
                      <div className="text-[10px] text-[#777]">
                        MARKET
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#e4b43d]">
                        LIVE
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <StatCard
                label="کل سیگنال‌ها"
                value={formatNumber(signalsCount)}
                icon="↗"
                description="سیگنال ثبت‌شده در حساب"
              />

              <StatCard
                label="ربات‌ها"
                value={formatNumber(botsCount)}
                icon="♙"
                description={`${formatNumber(activeBotsCount)} ربات فعال`}
              />

              <StatCard
                label="معاملات"
                value={formatNumber(tradesCount)}
                icon="◈"
                description={`${formatNumber(openTradesCount)} معامله باز`}
              />

              <StatCard
                label="پلن حساب"
                value={String(user.plan || "FREE")}
                icon="♛"
                description="وضعیت اشتراک حساب"
              />
            </div>

            {/* Market strip */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MarketMini symbol="BTC/USDT" value="—" />
              <MarketMini symbol="ETH/USDT" value="—" />
              <MarketMini symbol="XAU/USD" value="—" />
              <MarketMini symbol="EUR/USD" value="—" />
              <MarketMini symbol="GBP/USD" value="—" />
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">

              {/* Signals */}
              <section className="overflow-hidden rounded-[20px] border border-[#30240f] bg-[#080808]">
                <div className="flex items-center justify-between border-b border-[#211a0d] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-black text-white sm:text-lg">
                      سیگنال‌های معاملاتی
                    </h2>
                    <p className="mt-1 text-[11px] text-[#696969]">
                      اطلاعات واقعی ذخیره‌شده در سیستم
                    </p>
                  </div>

                  <Link
                    href="/signals"
                    className="rounded-lg border border-[#463612] bg-[#120f08] px-3 py-2 text-xs text-[#d2a93c] transition hover:border-[#76591c]"
                  >
                    مشاهده همه
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[650px]">
                    <div className="grid grid-cols-5 border-b border-[#17130c] px-5 py-3 text-[10px] text-[#666]">
                      <div>وضعیت</div>
                      <div>دارایی</div>
                      <div>سیگنال</div>
                      <div>وضعیت</div>
                      <div>اطلاعات</div>
                    </div>

                    <div className="px-5">
                      <EmptyRow
                        title="هنوز سیگنالی ثبت نشده است"
                        description="سیگنال‌های واقعی پس از ایجاد توسط موتور تحلیل یا ربات در این بخش نمایش داده می‌شوند."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* System performance */}
              <section className="rounded-[20px] border border-[#30240f] bg-[#080808] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-white">
                      وضعیت سیستم
                    </h2>
                    <p className="mt-1 text-[11px] text-[#696969]">
                      وضعیت سرویس‌های اصلی
                    </p>
                  </div>

                  <span className="flex items-center gap-2 rounded-full border border-[#173923] bg-[#09150e] px-3 py-1.5 text-[10px] text-[#4ed47f]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#35c970]" />
                    آنلاین
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <SystemRow title="Trading AI" status="فعال" />
                  <SystemRow title="Database" status="متصل" />
                  <SystemRow title="Signal Engine" status="آماده" />
                  <SystemRow title="Trading Bots" status={`${activeBotsCount} فعال`} />
                </div>

                <Link
                  href="/ai-analysis"
                  className="mt-5 flex h-11 items-center justify-center rounded-xl border border-[#4c3913] bg-[#110d06] text-xs font-bold text-[#d9ae3d] transition hover:bg-[#181208]"
                >
                  اجرای تحلیل بازار
                </Link>
              </section>
            </div>

            {/* Quick services */}
            <div className="mt-7">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    ابزارهای Trading AI
                  </h2>
                  <p className="mt-1 text-xs text-[#696969]">
                    دسترسی سریع به امکانات پلتفرم
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {quickActions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-[#30240f] bg-[#080808] p-4 transition duration-200 hover:-translate-y-1 hover:border-[#755719] hover:bg-[#0d0c09]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#4b3915] bg-[#120e07] text-lg text-[#d7aa37] transition group-hover:border-[#9a711e] group-hover:shadow-[0_0_20px_rgba(209,157,38,0.12)]">
                      {item.icon}
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-[#e1e1e1]">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-[10px] leading-5 text-[#696969]">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom panels */}
            <div className="mt-7 grid gap-5 md:grid-cols-3">

              <BottomPanel
                title="تحلیل هوشمند"
                icon="✦"
                description="موتور تحلیل می‌تواند داده‌های بازار را برای تولید تحلیل بررسی کند."
                href="/ai-analysis"
                button="شروع تحلیل"
              />

              <BottomPanel
                title="مدیریت ربات‌ها"
                icon="♙"
                description="ربات‌های معاملاتی حساب خود را مشاهده و تنظیم کنید."
                href="/bots"
                button="مدیریت ربات‌ها"
              />

              <BottomPanel
                title="اتصال بروکر"
                icon="▣"
                description="برای اجرای معاملات واقعی، اتصال بروکر خود را مدیریت کنید."
                href="/broker"
                button="اتصال بروکر"
              />
            </div>

            {/* Footer */}
            <footer className="mt-8 border-t border-[#1d170b] pt-5">
              <div className="flex flex-col gap-4 text-xs text-[#5e5e5e] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  © {new Date().getFullYear()} Trading AI
                  <span className="mx-2 text-[#30240f]">•</span>
                  Smart Trading Platform
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href="/support"
                    className="transition hover:text-[#cba237]"
                  >
                    پشتیبانی
                  </Link>

                  <Link
                    href="/terms"
                    className="transition hover:text-[#cba237]"
                  >
                    قوانین
                  </Link>

                  <span className="flex items-center gap-2 text-[#5b9a70]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3bc66d]" />
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

/* ----------------------------- */
/* Components                     */
/* ----------------------------- */

function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: string;
  icon: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-[#2c220e] bg-[#080808] p-4 transition hover:border-[#6d5218]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#696969]">{label}</p>

          <div className="mt-3 text-2xl font-black text-white">
            {value}
          </div>

          <p className="mt-1 text-[10px] text-[#5e5e5e]">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#443411] bg-[#110d06] text-[#d6a936]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MarketMini({
  symbol,
  value,
}: {
  symbol: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#2c220f] bg-[#080808] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#bcbcbc]">
          {symbol}
        </span>

        <span className="h-2 w-2 rounded-full bg-[#8d681d]" />
      </div>

      <div className="mt-2 text-xs text-[#777]">
        {value}
      </div>
    </div>
  );
}

function EmptyRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4a3814] bg-[#110d06] text-xl text-[#c99d2d]">
        ↗
      </div>

      <h3 className="mt-4 text-sm font-bold text-[#d7d7d7]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-6 text-[#666]">
        {description}
      </p>
    </div>
  );
}

function SystemRow({
  title,
  status,
}: {
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#211a0d] bg-[#0b0b0b] px-3 py-3">
      <span className="text-xs text-[#999]">{title}</span>

      <span className="flex items-center gap-2 text-[10px] text-[#5ec47e]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#3bc66d]" />
        {status}
      </span>
    </div>
  );
}

function BottomPanel({
  title,
  icon,
  description,
  href,
  button,
}: {
  title: string;
  icon: string;
  description: string;
  href: string;
  button: string;
}) {
  return (
    <div className="rounded-2xl border border-[#30240f] bg-[#080808] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#493712] bg-[#110d06] text-[#d5a633]">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-black text-white">
        {title}
      </h3>

      <p className="mt-2 min-h-[48px] text-xs leading-6 text-[#686868]">
        {description}
      </p>

      <Link
        href={href}
        className="mt-4 flex h-10 items-center justify-center rounded-xl border border-[#4b3813] bg-[#110d06] text-xs font-bold text-[#d5aa39] transition hover:bg-[#181208]"
      >
        {button}
      </Link>
    </div>
  );
}
