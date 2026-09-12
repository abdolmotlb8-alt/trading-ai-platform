import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PanelPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">

        {/* Header */}
        <header className="mb-6 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm text-gray-500">
                پنل معامله‌گری هوشمند
              </p>

              <h1 className="mt-2 text-3xl font-black text-yellow-400 md:text-4xl">
                داشبورد
              </h1>

              <p className="mt-2 text-gray-400">
                خوش آمدید، {user.name}
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/profile"
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-gray-300 hover:border-yellow-500 hover:text-yellow-400"
              >
                پروفایل
              </Link>

              <Link
                href="/settings"
                className="rounded-xl border border-yellow-500/40 px-5 py-3 text-sm text-yellow-400 hover:bg-yellow-500 hover:text-black"
              >
                تنظیمات
              </Link>
            </div>

          </div>
        </header>

        {/* Account */}
        <section className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <h2 className="text-2xl font-bold">
            حساب کاربری
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            اطلاعات حساب شما
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <InfoCard
              title="نام"
              value={user.name}
            />

            <InfoCard
              title="ایمیل"
              value={user.email}
            />

            <InfoCard
              title="نقش"
              value={user.role}
            />

          </div>

          <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-black p-5">

            <p className="text-sm text-gray-500">
              پلن فعلی
            </p>

            <div className="mt-2 flex items-center justify-between">

              <span className="text-xl font-bold text-yellow-400">
                {user.plan}
              </span>

              <Link
                href="/subscription"
                className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400"
              >
                ارتقای پلن
              </Link>

            </div>

          </div>

        </section>

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="وضعیت حساب"
            value="فعال"
          />

          <StatCard
            title="ربات فعال"
            value="0"
          />

          <StatCard
            title="معاملات"
            value="0"
          />

          <StatCard
            title="سود و زیان"
            value="0.00"
          />

        </section>

        {/* Platform */}
        <section>

          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              مرکز معامله‌گری
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              بخش‌های اصلی پلتفرم
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            <ModuleCard
              href="/market"
              icon="📊"
              title="بازارها"
              description="مشاهده و بررسی بازارهای مالی"
            />

            <ModuleCard
              href="/ai-analysis"
              icon="🧠"
              title="تحلیل AI"
              description="تحلیل هوشمند بازار با هوش مصنوعی"
            />

            <ModuleCard
              href="/signals"
              icon="📡"
              title="سیگنال‌ها"
              description="مشاهده فرصت‌های معاملاتی"
            />

            <ModuleCard
              href="/bots"
              icon="🤖"
              title="ربات‌ها"
              description="مدیریت ربات‌های معاملاتی"
            />

            <ModuleCard
              href="/bot-builder"
              icon="⚙️"
              title="ساخت ربات"
              description="ساخت و تنظیم ربات معاملاتی"
            />

            <ModuleCard
              href="/trades"
              icon="💹"
              title="معاملات"
              description="مشاهده و مدیریت معاملات"
            />

            <ModuleCard
              href="/performance"
              icon="📈"
              title="عملکرد"
              description="بررسی سود، زیان و عملکرد"
            />

            <ModuleCard
              href="/reports"
              icon="📋"
              title="گزارش‌ها"
              description="گزارش‌های معاملاتی و تحلیلی"
            />

            <ModuleCard
              href="/risk"
              icon="🛡️"
              title="مدیریت ریسک"
              description="کنترل ریسک و مدیریت سرمایه"
            />

            <ModuleCard
              href="/economic"
              icon="📅"
              title="تقویم اقتصادی"
              description="رویدادهای مهم اقتصادی"
            />

            <ModuleCard
              href="/news"
              icon="📰"
              title="اخبار"
              description="آخرین اخبار بازار"
            />

            <ModuleCard
              href="/broker"
              icon="🏦"
              title="کارگزاری"
              description="مدیریت اتصال حساب معاملاتی"
            />

          </div>

        </section>

        {/* Services */}
        <section className="mt-8">

          <h2 className="text-2xl font-bold">
            خدمات
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <SmallCard
              href="/telegram"
              icon="✈️"
              title="تلگرام"
            />

            <SmallCard
              href="/subscription"
              icon="💎"
              title="اشتراک"
            />

            <SmallCard
              href="/courses"
              icon="🎓"
              title="آموزش"
            />

            <SmallCard
              href="/support"
              icon="🎧"
              title="پشتیبانی"
            />

          </div>

        </section>

        {/* Quick Actions */}
        <section className="mt-8 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6">

          <h2 className="text-xl font-bold">
            دسترسی سریع
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/ai-analysis"
              className="rounded-xl bg-yellow-500 px-4 py-3 text-center font-bold text-black hover:bg-yellow-400"
            >
              تحلیل AI
            </Link>

            <Link
              href="/bot-builder"
              className="rounded-xl border border-yellow-500/40 px-4 py-3 text-center text-yellow-400 hover:bg-yellow-500 hover:text-black"
            >
              ساخت ربات
            </Link>

            <Link
              href="/market"
              className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-gray-300 hover:border-yellow-500 hover:text-yellow-400"
            >
              بازار
            </Link>

            <Link
              href="/support"
              className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-gray-300 hover:border-yellow-500 hover:text-yellow-400"
            >
              پشتیبانی
            </Link>

          </div>

        </section>

        <footer className="py-8 text-center text-sm text-gray-600">
          پلتفرم هوش مصنوعی معامله‌گری
        </footer>

      </div>
    </main>
  );
}


/* Information Card */

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-5">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 truncate font-bold text-white">
        {value}
      </p>

    </div>
  );
}


/* Statistics Card */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-black text-yellow-400">
        {value}
      </p>

    </div>
  );
}


/* Main Module */

function ModuleCard({
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
      className="group rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-yellow-500/40 hover:bg-zinc-950"
    >

      <div className="flex items-center justify-between">

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-3xl">
          {icon}
        </div>

        <span className="text-xl text-gray-700 group-hover:text-yellow-400">
          ←
        </span>

      </div>

      <h3 className="mt-5 text-xl font-bold text-yellow-400">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-gray-400">
        {description}
      </p>

    </Link>
  );
}


/* Small Service Card */

function SmallCard({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 hover:border-yellow-500/40 hover:bg-zinc-900"
    >

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-xl">
        {icon}
      </div>

      <span className="font-bold text-gray-300">
        {title}
      </span>

    </Link>
  );
}
