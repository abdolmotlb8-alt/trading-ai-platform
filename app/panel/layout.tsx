import Link from "next/link";
import type { ReactNode } from "react";
import PanelMobileMenu from "@/components/PanelMobileMenu";

type PanelLayoutProps = {
  children: ReactNode;
};

export default function PanelLayout({
  children,
}: PanelLayoutProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-black text-white">

      {/* Desktop Sidebar */}
      <aside className="fixed right-0 top-0 hidden h-screen w-64 border-l border-yellow-500/20 bg-zinc-950 lg:block">

        <div className="flex h-full flex-col">

          {/* Logo */}
          <div className="border-b border-zinc-800 p-6">
            <Link href="/panel">
              <div className="text-2xl font-black text-yellow-400">
                Trading AI
              </div>

              <div className="mt-1 text-xs text-gray-500">
                پنل هوشمند معامله‌گری
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">

            <div className="mb-3 px-3 text-xs text-gray-600">
              اصلی
            </div>

            <PanelLink href="/panel" icon="⌂" title="داشبورد" />
            <PanelLink href="/market" icon="📊" title="بازارها" />
            <PanelLink href="/ai-analysis" icon="🧠" title="تحلیل AI" />
            <PanelLink href="/signals" icon="📡" title="سیگنال‌ها" />

            <div className="mb-3 mt-7 px-3 text-xs text-gray-600">
              معامله‌گری
            </div>

            <PanelLink href="/bots" icon="🤖" title="ربات‌ها" />
            <PanelLink href="/bot-builder" icon="⚙️" title="ساخت ربات" />
            <PanelLink href="/trades" icon="💹" title="معاملات" />
            <PanelLink href="/performance" icon="📈" title="عملکرد" />
            <PanelLink href="/reports" icon="📋" title="گزارش‌ها" />
            <PanelLink href="/risk" icon="🛡️" title="مدیریت ریسک" />

            <div className="mb-3 mt-7 px-3 text-xs text-gray-600">
              خدمات
            </div>

            <PanelLink href="/broker" icon="🏦" title="کارگزاری" />
            <PanelLink href="/telegram" icon="✈️" title="تلگرام" />
            <PanelLink href="/subscription" icon="💎" title="اشتراک" />
            <PanelLink href="/wallet" icon="💰" title="کیف پول" />
            <PanelLink href="/courses" icon="🎓" title="آموزش" />
            <PanelLink href="/support" icon="🎧" title="پشتیبانی" />

          </nav>

          {/* Account */}
          <div className="border-t border-zinc-800 p-4">

            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black p-3 transition hover:border-yellow-500/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                👤
              </div>

              <div>
                <div className="text-sm font-bold text-gray-300">
                  حساب کاربری
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  پروفایل و تنظیمات
                </div>
              </div>
            </Link>

          </div>

        </div>

      </aside>

      {/* Main Content */}
      <div className="min-h-screen lg:pr-64">

        {/* Top Header */}
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/95 backdrop-blur">

          <div className="flex h-16 items-center justify-between px-4 md:px-8">

            {/* Mobile Menu */}
            <div className="lg:hidden">
              <PanelMobileMenu />
            </div>

            {/* Desktop Title */}
            <div className="hidden text-sm text-gray-500 md:block">
              پنل کاربری
            </div>

            {/* Header Actions */}
            <div className="mr-auto flex items-center gap-3">

              <Link
                href="/support"
                aria-label="پشتیبانی"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-lg transition hover:border-yellow-500/30 hover:text-yellow-400"
              >
                🎧
              </Link>

              <Link
                href="/settings"
                aria-label="تنظیمات"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-lg transition hover:border-yellow-500/30 hover:text-yellow-400"
              >
                ⚙️
              </Link>

              <Link
                href="/profile"
                aria-label="پروفایل"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/10 transition hover:border-yellow-400/60"
              >
                👤
              </Link>

            </div>

          </div>

        </header>

        {/* Page Content */}
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>

      </div>

    </div>
  );
}


/* Desktop Navigation Link */

function PanelLink({
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
      className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-400 transition hover:bg-yellow-500/10 hover:text-yellow-400"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
        {icon}
      </span>

      <span>{title}</span>
    </Link>
  );
}
