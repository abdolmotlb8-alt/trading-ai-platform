import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PanelPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black px-4 py-6 text-white md:px-8"
    >
      <div className="mx-auto max-w-7xl">

        {/* Top Header */}
        <header className="mb-6 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-5 shadow-2xl">
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

            <div className="flex flex-wrap gap-3">

              <Link
                href="/profile"
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-gray-300 transition hover:border-yellow-500 hover:text-yellow-400"
              >
                پروفایل
              </Link>

              <Link
                href="/settings"
                className="rounded-xl border border-yellow-500/40 px-5 py-3 text-sm text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
              >
                تنظیمات
              </Link>

            </div>

          </div>
        </header>


        {/* Account Status */}
        <section className="mb-6 grid gap-5 md:grid-cols-3">

          <StatCard
            title="وضعیت حساب"
            value="فعال"
            icon="●"
            positive
          />

          <StatCard
            title="پلن فعلی"
            value={user.plan}
            icon="◆"
          />

          <StatCard
            title="نقش کاربر"
            value={user.role}
            icon="◈"
          />

        </section>


        {/* Account Information */}
        <section className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              حساب کاربری
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              اطلاعات حساب و دسترسی‌های شما
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <Info
