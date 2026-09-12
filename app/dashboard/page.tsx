import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black text-white px-4 py-6 md:px-8"
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="mb-2 text-sm text-gray-500">
              پنل کاربری
            </p>

            <h1 className="text-3xl font-black text-yellow-400 md:text-4xl">
              داشبورد
            </h1>

            <p className="mt-2 text-gray-400">
              خوش آمدید {user.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rounded-xl border border-yellow-500/30 px-5 py-3 text-sm text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
            >
              پروفایل
            </Link>

            <Link
              href="/settings"
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-gray-300 transition hover:border-yellow-500/50 hover:text-yellow-400"
            >
              تنظیمات
            </Link>
          </div>

        </div>


        {/* Account information */}
        <section className="mb-8">

          <div className="rounded-3xl border border-yellow-500/20 bg-zinc-900 p-6 md:p-8">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  اطلاعات حساب
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  وضعیت حساب کاربری شما
                </p>
              </div>

              <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
                ● فعال
              </div>
            </div>


            <div className="grid gap-4 md:grid-cols-3">

              <InfoCard
                title="نام کاربر"
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


            <div className="mt-4">

              <div className="rounded-2xl border border-yellow-500/20 bg-black p-5">

                <p className="text-sm text-gray-500">
                  پلن فعلی
                </p>

                <div className="mt-2 flex items-center justify-between">

                  <span className="text-2xl font-bold text-yellow-400">
                    {user.plan}
                  </span>

                  <Link
                    href="/subscription"
                    className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-400"
                  >
                    ارتقای پلن
                  </Link>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* Main modules */}
        <section>

          <div className="mb-5">

            <h2 className="text-2xl font-bold">
              مرکز معامله‌گری
            </h2>

            <p className="mt-1 text-gray-500">
              بخش‌های اصلی پلتفرم از اینجا در دسترس هستند.
            </p>

          </div>


          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">


            <DashboardModule
              icon="🤖"
              title="ربات‌های معاملاتی"
              description="مدیریت، ایجاد و بررسی عملکرد ربات‌های معاملاتی."
              href="/bots"
            />


            <DashboardModule
              icon="📊"
              title="بازارها"
              description="بررسی بازارها و اطلاعات معاملاتی."
              href="/market"
            />


            <DashboardModule
              icon="🧠"
              title="تحلیل هوش مصنوعی"
              description="دریافت تحلیل و بررسی بازار توسط سیستم هوش مصنوعی."
              href="/ai-analysis"
            />


            <DashboardModule
              icon="📈"
              title="معاملات"
              description="مشاهده معاملات، وضعیت و عملکرد معاملات."
              href="/trades"
            />


            <DashboardModule
              icon="💰"
              title="عملکرد"
              description="بررسی سود، زیان و آمار عملکرد معاملاتی."
              href="/performance"
            />


            <DashboardModule
              icon="📋"
              title="گزارش‌ها"
              description="مشاهده گزارش‌های معاملاتی و تحلیلی."
              href="/reports"
            />


            <DashboardModule
              icon="📡"
              title="سیگنال‌ها"
              description="مشاهده سیگنال‌ها و فرصت‌های معاملاتی."
              href="/signals"
            />


            <DashboardModule
              icon="🛡️"
              title="مدیریت ریسک"
              description="کنترل ریسک و تنظیمات مدیریت سرمایه."
              href="/risk"
            />


            <DashboardModule
              icon="📅"
              title="تقویم اقتصادی"
              description="مشاهده رویدادهای مهم اقتصادی."
              href="/economic"
            />

          </div>

        </section>


        {/* Bottom area */}
        <section className="mt-8 grid gap-5 md:grid-cols-2">


          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-2xl">
                🤖
              </div>

              <div>
                <h3 className="font-bold text-white">
                  وضعیت ربات‌ها
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  هنوز رباتی فعال نشده است.
                </p>
              </div>

            </div>

            <Link
              href="/bot-builder"
              className="mt-5 block rounded-xl border border-yellow-500/30 py-3 text-center text-sm text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
            >
              ساخت ربات جدید
            </Link>

          </div>


          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-2xl">
                🧠
              </div>

              <div>
                <h3 className="font-bold text-white">
                  دستیار هوش مصنوعی
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  تحلیل و راهنمایی هوشمند برای معامله‌گری.
                </p>
              </div>

            </div>

            <Link
              href="/assistant"
              className="mt-5 block rounded-xl bg-yellow-500 py-3 text-center text-sm font-bold text-black transition hover:bg-yellow-400"
            >
              ورود به دستیار AI
            </Link>

          </div>


        </section>


        {/* Footer */}
        <footer className="mt-10 border-t border-zinc-900 py-6 text-center text-sm text-gray-600">
          پلتفرم هوش مصنوعی معامله‌گری
        </footer>

      </div>
    </main>
  );
}


/* ----------------------------- */
/* Information Card               */
/* ----------------------------- */

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

      <p className="mt-2 truncate text-lg font-bold text-white">
        {value}
      </p>

    </div>
  );
}


/* ----------------------------- */
/* Dashboard Module               */
/* ----------------------------- */

function DashboardModule({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition duration-200 hover:-translate-y-1 hover:border-yellow-500/40 hover:bg-zinc-950"
    >

      <div className="flex items-start justify-between">

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-3xl">
          {icon}
        </div>

        <span className="text-gray-600 transition group-hover:text-yellow-400">
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
