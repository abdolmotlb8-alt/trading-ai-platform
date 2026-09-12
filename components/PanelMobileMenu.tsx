"use client";

import Link from "next/link";
import { useState } from "react";

export default function PanelMobileMenu() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Open Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن منوی پنل"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-xl text-gray-300 transition hover:border-yellow-500/40 hover:text-yellow-400 lg:hidden"
      >
        ☰
      </button>

      {/* Overlay */}
      {open && (
        <button
          type="button"
          aria-label="بستن منو"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Menu */}
      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-[280px] max-w-[85vw] border-l border-yellow-500/20 bg-zinc-950 shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 p-5">

            <div>
              <p className="text-xl font-black text-yellow-400">
                Trading AI
              </p>

              <p className="mt-1 text-xs text-gray-500">
                پنل هوشمند معامله‌گری
              </p>
            </div>

            <button
              type="button"
              onClick={closeMenu}
              aria-label="بستن منو"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-lg text-gray-400 hover:border-yellow-500/40 hover:text-yellow-400"
            >
              ✕
            </button>

          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">

            <div className="mb-3 px-3 text-xs font-bold text-gray-600">
              اصلی
            </div>

            <MobileLink
              href="/panel"
              icon="⌂"
              title="داشبورد"
              onClick={closeMenu}
            />

            <MobileLink
              href="/market"
              icon="📊"
              title="بازارها"
              onClick={closeMenu}
            />

            <MobileLink
              href="/ai-analysis"
              icon="🧠"
              title="تحلیل AI"
              onClick={closeMenu}
            />

            <MobileLink
              href="/signals"
              icon="📡"
              title="سیگنال‌ها"
              onClick={closeMenu}
            />

            <div className="mb-3 mt-7 px-3 text-xs font-bold text-gray-600">
              معامله‌گری
            </div>

            <MobileLink
              href="/bots"
              icon="🤖"
              title="ربات‌ها"
              onClick={closeMenu}
            />

            <MobileLink
              href="/bot-builder"
              icon="⚙️"
              title="ساخت ربات"
              onClick={closeMenu}
            />

            <MobileLink
              href="/trades"
              icon="💹"
              title="معاملات"
              onClick={closeMenu}
            />

            <MobileLink
              href="/performance"
              icon="📈"
              title="عملکرد"
              onClick={closeMenu}
            />

            <MobileLink
              href="/reports"
              icon="📋"
              title="گزارش‌ها"
              onClick={closeMenu}
            />

            <MobileLink
              href="/risk"
              icon="🛡️"
              title="مدیریت ریسک"
              onClick={closeMenu}
            />

            <div className="mb-3 mt-7 px-3 text-xs font-bold text-gray-600">
              خدمات
            </div>

            <MobileLink
              href="/broker"
              icon="🏦"
              title="کارگزاری"
              onClick={closeMenu}
            />

            <MobileLink
              href="/telegram"
              icon="✈️"
              title="تلگرام"
              onClick={closeMenu}
            />

            <MobileLink
              href="/subscription"
              icon="💎"
              title="اشتراک"
              onClick={closeMenu}
            />

            <MobileLink
              href="/wallet"
              icon="💰"
              title="کیف پول"
              onClick={closeMenu}
            />

            <MobileLink
              href="/courses"
              icon="🎓"
              title="آموزش"
              onClick={closeMenu}
            />

            <MobileLink
              href="/support"
              icon="🎧"
              title="پشتیبانی"
              onClick={closeMenu}
            />

          </nav>

          {/* Footer */}
          <div className="border-t border-zinc-800 p-4">

            <Link
              href="/profile"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                👤
              </div>

              <div>
                <p className="text-sm font-bold text-gray-300">
                  حساب کاربری
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  پروفایل و تنظیمات
                </p>
              </div>
            </Link>

          </div>

        </div>
      </aside>
    </>
  );
}


/* Mobile Navigation Link */

function MobileLink({
  href,
  icon,
  title,
  onClick,
}: {
  href: string;
  icon: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-400 transition hover:bg-yellow-500/10 hover:text-yellow-400"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-base">
        {icon}
      </span>

      <span>{title}</span>
    </Link>
  );
}
