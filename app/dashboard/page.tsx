import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

  const isAdmin = user.role === "ADMIN";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#06101f] text-white"
    >
      {/* Background */}
      <div className="fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute right-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-[-180px] bottom-[-180px] h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px]">

        {/* SIDEBAR */}
        <aside className="hidden w-[270px] shrink-0 border-l border-white/10 bg-[#081525]/95 p-5 lg:block">

          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black shadow-lg shadow-cyan-500/20">
              AI
            </div>

            <div>
              <h1 className="text-lg font-black">
                Trading AI
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                پنل هوشمند معاملاتی
              </p>
            </div>
          </div>

          {/* User */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-bold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {user.name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-400">
                  {user.email}
                </p>
              </div>

            </div>
          </div>

          {/* Menu */}
          <div className="mb-3 px-2 text-xs font-bold text-slate-500">
            منوی اصلی
          </div>

          <nav className="space-y-2">

            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/15"
            >
              <span>⌂</span>
              <span>داشبورد</span>
            </Link>

            <Link
              href="/bots"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>🤖</span>
              <span>ربات‌های معاملاتی</span>
            </Link>

            <Link
              href="/ai-analysis"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>🧠</span>
              <span>تحلیل هوش مصنوعی</span>
            </Link>

            <Link
              href="/market"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>📈</span>
              <span>بازار</span>
            </Link>

            <Link
              href="/broker"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>🔗</span>
              <span>اتصال بروکر</span>
            </Link>

            <Link
              href="/courses"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>🎓</span>
              <span>آموزش</span>
            </Link>

          </nav>

          {/* Management */}
          <div className="mb-3 mt-8 px-2 text-xs font-bold text-slate-500">
            حساب و مدیریت
          </div>

          <nav className="space-y-2">

            <Link
              href="/panel"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>👤</span>
              <span>حساب کاربری</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-400/10 px-4 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-400/15"
              >
                <span>🛡️</span>
                <span>مدیریت سایت</span>
              </Link>
            )}

          </nav>

          {/* Bottom */}
          <div className="mt-10 rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 p-4">
            <p className="text-sm font-bold">
              Trading AI
            </p>

            <p className="mt-2 text-xs leading-6 text-slate-400">
              مرکز مدیریت معاملات، تحلیل بازار و ربات‌های هوشمند
            </p>
          </div>

        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">

          {/* Mobile Header */}
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a1729]/90 p-4 lg:hidden">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-black">
                AI
              </div>

              <div>
                <p className="font-bold">
                  Trading AI
                </p>

                <p className="text-xs text-slate-400">
                  پنل کاربری
                </p>
              </div>

            </div>

            <Link
              href="/panel"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5"
            >
              👤
            </Link>

          </div>

          {/* Welcome */}
          <div className="mb-6 overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#0b1b30] via-[#0a1728] to-[#081321] p-6 shadow-2xl shadow-black/20 sm:p-8">

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div>
                <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                  پنل مدیریت Trading AI
                </div>

                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                  خوش آمدید، {user.name} 👋
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  از اینجا می‌توانید وضعیت حساب، ربات‌های معاملاتی،
                  تحلیل‌های هوش مصنوعی و سرویس‌های Trading AI را مدیریت کنید.
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-xs text-slate-500">
                  پلن فعلی
                </p>

                <p className="mt-1 text-lg font-black text-cyan-300">
                  {user.plan}
                </p>
              </div>

            </div>

          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title="وضعیت حساب"
              value="فعال"
              description="حساب شما فعال است"
              icon="✓"
              accent="cyan"
            />

            <StatCard
              title="پلن فعلی"
              value={user.plan}
              description="سطح حساب کاربری"
              icon="◆"
              accent="blue"
            />

            <StatCard
              title="ربات‌های متصل"
              value="۰"
              description="هنوز رباتی متصل نشده"
              icon="⚡"
              accent="purple"
            />

            <StatCard
              title="بروکر"
              value="متصل نیست"
              description="آماده اتصال"
              icon="↗"
              accent="amber"
            />

          </div>

          {/* Main Grid */}
          <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">

            {/* Services */}
            <section className="rounded-3xl border border-white/10 bg-[#0a1728]/90 p-5 shadow-xl shadow-black/10 sm:p-6">

              <div className="mb-6 flex items-center justify-between gap-4">

                <div>
                  <h3 className="text-xl font-black">
                    مرکز معامله‌گری
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    سرویس‌های اصلی پلتفرم
                  </p>
                </div>

                <span className="rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300">
                  Trading AI
                </span>

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <ServiceCard
                  href="/bots"
                  icon="🤖"
                  title="ربات‌های معاملاتی"
                  description="ساخت، مدیریت و اجرای ربات‌های معاملاتی"
                />

                <ServiceCard
                  href="/ai-analysis"
                  icon="🧠"
                  title="تحلیل هوش مصنوعی"
                  description="تحلیل هوشمند بازار و دارایی‌ها"
                />

                <ServiceCard
                  href="/market"
                  icon="📊"
                  title="بازار"
                  description="مشاهده اطلاعات و وضعیت بازار"
                />

                <ServiceCard
                  href="/broker"
                  icon="🔗"
                  title="اتصال بروکر"
                  description="اتصال حساب معاملاتی به پلتفرم"
                />

              </div>

            </section>

            {/* Account */}
            <section className="rounded-3xl border border-white/10 bg-[#0a1728]/90 p-5 shadow-xl shadow-black/10 sm:p-6">

              <div className="mb-6">
                <h3 className="text-xl font-black">
                  اطلاعات حساب
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  وضعیت فعلی حساب شما
                </p>
              </div>

              <div className="space-y-3">

                <AccountRow
                  label="نام کاربر"
                  value={user.name}
                />

                <AccountRow
                  label="ایمیل"
                  value={user.email}
                />

                <AccountRow
                  label="نقش"
                  value={user.role}
                />

                <AccountRow
                  label="پلن"
                  value={user.plan}
                />

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-4">
                  <span className="text-sm text-slate-400">
                    وضعیت
                  </span>

                  <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                    فعال
                  </span>
                </div>

              </div>

              <Link
                href="/panel"
                className="mt-5 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                مشاهده حساب کاربری
              </Link>

            </section>

          </div>

          {/* Coming Soon */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0a1728]/90 p-5 sm:p-6">

            <div className="mb-5">
              <h3 className="text-xl font-black">
                امکانات پلتفرم
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                بخش‌هایی که در مراحل بعدی فعال می‌شوند
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <ComingSoon
                icon="⚡"
                title="اجرای ربات"
                text="اتصال و اجرای ربات‌های معاملاتی"
              />

              <ComingSoon
                icon="💬"
                title="پشتیبانی"
                text="سیستم پشتیبانی و مدیریت درخواست‌ها"
              />

              <ComingSoon
                icon="🛡️"
                title="مدیریت سایت"
                text="مدیریت کاربران، ربات‌ها و سرویس‌ها"
              />

            </div>

          </section>

          {/* Footer */}
          <footer className="py-8 text-center text-xs text-slate-500">
            Trading AI • پنل هوشمند معاملات
          </footer>

        </section>

      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  accent: "cyan" | "blue" | "purple" | "amber";
}) {
  const styles = {
    cyan: "border-cyan-400/10 bg-cyan-400/5 text-cyan-300",
    blue: "border-blue-400/10 bg-blue-400/5 text-blue-300",
    purple: "border-purple-400/10 bg-purple-400/5 text-purple-300",
    amber: "border-amber-400/10 bg-amber-400/5 text-amber-300",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0a1728]/90 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-sm text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-xl font-black text-white">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${styles[accent]}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}

function ServiceCard({
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
      className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-cyan-400/[0.04]"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/15 to-blue-500/15 text-xl">
        {icon}
      </div>

      <h4 className="font-bold text-white transition group-hover:text-cyan-300">
        {title}
      </h4>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-4 text-xs font-bold text-cyan-400">
        ورود به بخش ←
      </div>
    </Link>
  );
}

function AccountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="max-w-[60%] truncate text-left text-sm font-bold text-slate-200">
        {value}
      </span>
    </div>
  );
}

function ComingSoon({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-lg">
        {icon}
      </div>

      <h4 className="font-bold">
        {title}
      </h4>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        {text}
      </p>

      <span className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-slate-500">
        به‌زودی
      </span>
    </div>
  );
}
