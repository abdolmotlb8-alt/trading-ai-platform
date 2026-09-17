import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function Icon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
      {children}
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 3v4" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 16h8" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3" />
      <path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3" />
      <path d="M9 8h6M9 12h6M9 16h6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
      <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 7 20l1.15-1.15" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" />
      <path d="M16 13h5" />
      <circle cx="16" cy="13" r=".7" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20h-2.7v-.09a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.78 15a1.7 1.7 0 0 0-1.55-1.03H6v-2.7h.09A1.7 1.7 0 0 0 7.64 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.9-1.9.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.55V5h2.7v.09a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.55 1.03H21v2.7h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
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
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#070b14] text-white"
    >
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_28%)]">
        <div className="mx-auto flex min-h-screen max-w-[1600px]">

          {/* Sidebar */}
          <aside className="hidden w-[270px] shrink-0 border-l border-white/10 bg-[#0b1120]/90 p-5 lg:block">
            <div className="sticky top-5">

              {/* Logo */}
              <Link href="/" className="mb-8 flex items-center gap-3 px-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black shadow-lg shadow-cyan-500/20">
                  AI
                </div>

                <div>
                  <div className="text-lg font-black tracking-tight">
                    Trading AI
                  </div>
                  <div className="text-xs text-slate-500">
                    Smart Trading Platform
                  </div>
                </div>
              </Link>

              {/* Menu */}
              <div className="space-y-2">

                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-2xl bg-cyan-400/10 px-4 py-3.5 text-sm font-bold text-cyan-300 ring-1 ring-cyan-400/10"
                >
                  <HomeIcon />
                  داشبورد
                </Link>

                <Link
                  href="/market"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <ChartIcon />
                  بازار و نمودار
                </Link>

                <Link
                  href="/bots"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <BotIcon />
                  ربات‌های معاملاتی
                </Link>

                <Link
                  href="/ai-analysis"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <BrainIcon />
                  تحلیل هوش مصنوعی
                </Link>

                <Link
                  href="/broker"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <LinkIcon />
                  اتصال بروکر
                </Link>

                <Link
                  href="/courses"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-sm">
                    🎓
                  </span>
                  آموزش
                </Link>

                <Link
                  href="/news"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-sm">
                    📰
                  </span>
                  اخبار بازار
                </Link>

                <Link
                  href="/economic"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-sm">
                    🌍
                  </span>
                  تقویم اقتصادی
                </Link>

                <Link
                  href="/payments"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <WalletIcon />
                  کیف پول و پرداخت
                </Link>

              </div>

              {/* Bottom box */}
              <div className="mt-8 rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/10 to-blue-500/5 p-5">
                <div className="mb-3 text-sm font-bold">
                  مرکز پشتیبانی
                </div>

                <p className="mb-4 text-xs leading-6 text-slate-500">
                  برای مدیریت حساب و استفاده از امکانات Trading AI آماده‌ایم.
                </p>

                <div className="rounded-xl bg-white/5 px-3 py-2 text-center text-xs text-slate-400">
                  پشتیبانی به‌زودی فعال می‌شود
                </div>
              </div>

            </div>
          </aside>

          {/* Main */}
          <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">

            {/* Top bar */}
            <header className="mb-7 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0b1120]/80 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              
              <div>
                <div className="text-xs font-medium text-slate-500">
                  پنل کاربری
                </div>
                <div className="mt-1 text-lg font-black">
                  Trading AI Dashboard
                </div>
              </div>

              <div className="flex items-center gap-3">

                <div className="hidden rounded-2xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-2.5 sm:block">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                    سیستم فعال است
                  </div>
                </div>

                <Link
                  href="/"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  صفحه اصلی
                </Link>

              </div>
            </header>

            {/* Welcome */}
            <section className="relative mb-7 overflow-hidden rounded-[30px] border border-cyan-400/10 bg-gradient-to-br from-[#0d1b2e] via-[#0b1322] to-[#0b1120] p-6 shadow-2xl shadow-black/20 sm:p-8">
              
              <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute -bottom-20 right-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1.5 text-xs font-semibold text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    حساب شما فعال است
                  </div>

                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    سلام {user.name} 👋
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                    به پنل Trading AI خوش آمدید. از اینجا می‌توانید بازار،
                    ربات‌های معاملاتی، تحلیل هوش مصنوعی و اتصال بروکر را مدیریت کنید.
                  </p>
                </div>

                <div className="shrink-0 rounded-3xl border border-white/10 bg-black/20 px-6 py-5 backdrop-blur">
                  <div className="text-xs text-slate-500">
                    پلن فعلی
                  </div>

                  <div className="mt-2 text-xl font-black text-cyan-300">
                    {user.plan}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    وضعیت حساب: فعال
                  </div>
                </div>

              </div>
            </section>

            {/* Stats */}
            <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 shadow-xl shadow-black/10">
                <div className="flex items-start justify-between">
                  <Icon>
                    <ChartIcon />
                  </Icon>

                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="mt-5 text-sm text-slate-500">
                  وضعیت حساب
                </div>

                <div className="mt-1 text-xl font-black">
                  فعال
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 shadow-xl shadow-black/10">
                <div className="flex items-start justify-between">
                  <Icon>
                    <WalletIcon />
                  </Icon>

                  <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                    Plan
                  </span>
                </div>

                <div className="mt-5 text-sm text-slate-500">
                  پلن حساب
                </div>

                <div className="mt-1 text-xl font-black">
                  {user.plan}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 shadow-xl shadow-black/10">
                <div className="flex items-start justify-between">
                  <Icon>
                    <BotIcon />
                  </Icon>

                  <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                    Soon
                  </span>
                </div>

                <div className="mt-5 text-sm text-slate-500">
                  ربات‌های فعال
                </div>

                <div className="mt-1 text-xl font-black">
                  0
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 shadow-xl shadow-black/10">
                <div className="flex items-start justify-between">
                  <Icon>
                    <LinkIcon />
                  </Icon>

                  <span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold text-orange-300">
                    Offline
                  </span>
                </div>

                <div className="mt-5 text-sm text-slate-500">
                  اتصال بروکر
                </div>

                <div className="mt-1 text-xl font-black">
                  متصل نیست
                </div>
              </div>

            </section>

            {/* Quick actions */}
            <section className="mb-7">
              <div className="mb-4">
                <h2 className="text-xl font-black">
                  دسترسی سریع
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  مهم‌ترین بخش‌های Trading AI را از اینجا باز کنید.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                <Link
                  href="/market"
                  className="group rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-[#0d1628]"
                >
                  <Icon>
                    <ChartIcon />
                  </Icon>

                  <h3 className="mt-5 font-black">
                    مشاهده بازار
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    مشاهده قیمت‌ها و نمودارهای بازار
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-cyan-300">
                    ورود به بازار
                    <ArrowIcon />
                  </div>
                </Link>

                <Link
                  href="/bots"
                  className="group rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-[#0d1628]"
                >
                  <Icon>
                    <BotIcon />
                  </Icon>

                  <h3 className="mt-5 font-black">
                    ربات‌های معاملاتی
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    مدیریت و ساخت ربات‌های هوشمند
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-cyan-300">
                    مشاهده ربات‌ها
                    <ArrowIcon />
                  </div>
                </Link>

                <Link
                  href="/ai-analysis"
                  className="group rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-[#0d1628]"
                >
                  <Icon>
                    <BrainIcon />
                  </Icon>

                  <h3 className="mt-5 font-black">
                    تحلیل AI
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    بررسی هوشمند وضعیت بازار
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-cyan-300">
                    ورود به تحلیل
                    <ArrowIcon />
                  </div>
                </Link>

                <Link
                  href="/broker"
                  className="group rounded-3xl border border-white/10 bg-[#0b1120]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-[#0d1628]"
                >
                  <Icon>
                    <LinkIcon />
                  </Icon>

                  <h3 className="mt-5 font-black">
                    اتصال بروکر
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    اتصال حساب معاملاتی به پلتفرم
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-cyan-300">
                    مدیریت بروکر
                    <ArrowIcon />
                  </div>
                </Link>

              </div>
            </section>

            {/* Bottom panels */}
            <section className="grid gap-5 xl:grid-cols-3">

              {/* Account */}
              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/80 p-6 xl:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-black">
                      اطلاعات حساب
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      مشخصات حساب کاربری شما
                    </p>
                  </div>

                  <div className="rounded-2xl bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300">
                    {user.role}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                    <div className="text-xs text-slate-500">
                      نام کاربر
                    </div>

                    <div className="mt-2 font-bold">
                      {user.name}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                    <div className="text-xs text-slate-500">
                      ایمیل
                    </div>

                    <div className="mt-2 break-all text-sm font-bold">
                      {user.email}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                    <div className="text-xs text-slate-500">
                      پلن
                    </div>

                    <div className="mt-2 font-bold text-cyan-300">
                      {user.plan}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                    <div className="text-xs text-slate-500">
                      وضعیت
                    </div>

                    <div className="mt-2 flex items-center gap-2 font-bold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      فعال
                    </div>
                  </div>

                </div>
              </div>

              {/* Future features */}
              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/80 p-6">

                <h2 className="font-black">
                  امکانات در حال توسعه
                </h2>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  بخش‌های جدید Trading AI به‌تدریج فعال می‌شوند.
                </p>

                <div className="mt-5 space-y-3">

                  <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">
                    <span className="text-lg">📊</span>
                    <div>
                      <div className="text-sm font-bold">
                        چارت زنده بازار
                      </div>
                      <div className="text-[11px] text-slate-600">
                        در حال توسعه
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">
                    <span className="text-lg">🤖</span>
                    <div>
                      <div className="text-sm font-bold">
                        ربات خودکار
                      </div>
                      <div className="text-[11px] text-slate-600">
                        در حال توسعه
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">
                    <span className="text-lg">🔗</span>
                    <div>
                      <div className="text-sm font-bold">
                        اتصال بروکر
                      </div>
                      <div className="text-[11px] text-slate-600">
                        در حال توسعه
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">
                    <span className="text-lg">🧠</span>
                    <div>
                      <div className="text-sm font-bold">
                        تحلیل پیشرفته AI
                      </div>
                      <div className="text-[11px] text-slate-600">
                        در حال توسعه
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </section>

            {/* Mobile navigation */}
            <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">

              <Link
                href="/market"
                className="rounded-2xl border border-white/10 bg-[#0b1120] p-4 text-center text-sm font-bold text-slate-300"
              >
                📊 بازار
              </Link>

              <Link
                href="/bots"
                className="rounded-2xl border border-white/10 bg-[#0b1120] p-4 text-center text-sm font-bold text-slate-300"
              >
                🤖 ربات‌ها
              </Link>

              <Link
                href="/ai-analysis"
                className="rounded-2xl border border-white/10 bg-[#0b1120] p-4 text-center text-sm font-bold text-slate-300"
              >
                🧠 تحلیل AI
              </Link>

              <Link
                href="/broker"
                className="rounded-2xl border border-white/10 bg-[#0b1120] p-4 text-center text-sm font-bold text-slate-300"
              >
                🔗 بروکر
              </Link>

            </div>

          </section>
        </div>
      </div>
    </main>
  );
}
