"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  {
    href: "/dashboard",
    label: "داشبورد",
    icon: "⌂",
  },
  {
    href: "/ai-analysis",
    label: "تحلیل هوش مصنوعی",
    icon: "◈",
  },
  {
    href: "/signals",
    label: "سیگنال‌ها",
    icon: "⚡",
  },
  {
    href: "/bots",
    label: "ربات‌ها",
    icon: "◉",
  },
  {
    href: "/market",
    label: "بازار",
    icon: "◌",
  },
  {
    href: "/news",
    label: "اخبار",
    icon: "▣",
  },
  {
    href: "/economic",
    label: "تقویم اقتصادی",
    icon: "▤",
  },
  {
    href: "/support",
    label: "پشتیبانی",
    icon: "◍",
  },
];

export default function Header() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header
        dir="rtl"
        className={[
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b border-[#d6a83c]/20 bg-[#070807]/95 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            : "border-b border-white/[0.06] bg-[#070807]/90 backdrop-blur-xl",
        ].join(" ")}
      >
        <div className="mx-auto flex h-[74px] w-full max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:border-[#d6a83c]/40 hover:bg-[#d6a83c]/10 lg:hidden"
          >
            <span className="flex flex-col gap-1.5">
              <span
                className={[
                  "block h-[2px] w-5 bg-current transition",
                  menuOpen ? "translate-y-[4px] rotate-45" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "block h-[2px] w-5 bg-current transition",
                  menuOpen ? "opacity-0" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "block h-[2px] w-5 bg-current transition",
                  menuOpen ? "-translate-y-[4px] -rotate-45" : "",
                ].join(" ")}
              />
            </span>
          </button>

          {/* Logo */}
          <Link
            href="/dashboard"
            className="group flex min-w-0 shrink-0 items-center gap-3"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#d6a83c]/40 bg-gradient-to-br from-[#f1c75b]/20 via-[#b98727]/10 to-transparent shadow-[0_0_25px_rgba(214,168,60,0.12)]">
              <div className="absolute inset-[4px] rounded-[10px] border border-[#d6a83c]/20" />

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative"
              >
                <path
                  d="M4 16.5L8.2 12.3L11.1 15.2L18.8 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#f1c75b]"
                />
                <path
                  d="M15.5 7.5H18.8V10.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#f1c75b]"
                />
              </svg>
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-black tracking-wide text-white">
                  Trading
                </span>
                <span className="text-[16px] font-black tracking-wide text-[#d6a83c]">
                  AI
                </span>
              </div>

              <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.25em] text-white/35">
                Smart Trading Platform
              </div>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group relative flex h-10 items-center gap-2 rounded-xl px-3 text-[12px] font-bold transition-all duration-200",
                    active
                      ? "bg-[#d6a83c]/10 text-[#f1c75b]"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-6 w-6 items-center justify-center rounded-lg text-[13px]",
                      active
                        ? "bg-[#d6a83c]/15 text-[#f1c75b]"
                        : "bg-white/[0.04] text-white/45 group-hover:text-white",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>

                  {active && (
                    <span className="absolute bottom-[-1px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#d6a83c] to-transparent" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="mr-auto flex shrink-0 items-center gap-2">
            {/* System status */}
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 xl:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              <span className="text-[10px] font-bold text-emerald-300">
                سیستم فعال
              </span>
            </div>

            {/* Notifications */}
            <Link
              href="/signals"
              aria-label="سیگنال‌ها"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/65 transition hover:border-[#d6a83c]/30 hover:bg-[#d6a83c]/10 hover:text-[#f1c75b]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 8C18 5.79086 16.2091 4 14 4H10C7.79086 4 6 5.79086 6 8V11.8C6 13.03 5.55 14.22 4.73 15.14L3.8 16.2C3.37 16.69 3.72 17.47 4.37 17.47H19.63C20.28 17.47 20.63 16.69 20.2 16.2L19.27 15.14C18.45 14.22 18 13.03 18 11.8V8Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M9.5 20H14.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>

              <span className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#d6a83c]" />
            </Link>

            {/* User */}
            <Link
              href="/dashboard"
              className="flex h-10 items-center gap-2 rounded-xl border border-[#d6a83c]/15 bg-[#d6a83c]/[0.04] px-2.5 transition hover:border-[#d6a83c]/35 hover:bg-[#d6a83c]/[0.08]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#f1c75b] to-[#9b6b17] text-[11px] font-black text-black">
                AI
              </div>

              <div className="hidden text-right md:block">
                <div className="text-[10px] font-bold text-white/75">
                  حساب کاربری
                </div>
                <div className="text-[8px] text-white/35">
                  پنل معاملاتی
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="بستن منو"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
          />

          <aside
            dir="rtl"
            className="fixed right-0 top-[74px] z-50 h-[calc(100vh-74px)] w-[min(88vw,360px)] overflow-y-auto border-l border-[#d6a83c]/15 bg-[#080a09] p-4 shadow-2xl lg:hidden"
          >
            <div className="mb-4 rounded-2xl border border-[#d6a83c]/15 bg-gradient-to-br from-[#d6a83c]/10 to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a83c]/30 bg-[#d6a83c]/10">
                  <span className="text-lg text-[#f1c75b]">◈</span>
                </div>

                <div>
                  <div className="font-black text-white">
                    Trading <span className="text-[#f1c75b]">AI</span>
                  </div>

                  <div className="mt-1 text-[9px] text-white/35">
                    پنل هوشمند معاملات
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                <span className="text-[10px] font-bold text-emerald-300">
                  موتور سیستم فعال است
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "flex min-h-[48px] items-center gap-3 rounded-xl px-3 transition",
                      active
                        ? "border border-[#d6a83c]/15 bg-[#d6a83c]/10 text-[#f1c75b]"
                        : "border border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-lg text-sm",
                        active
                          ? "bg-[#d6a83c]/15 text-[#f1c75b]"
                          : "bg-white/[0.04] text-white/45",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>

                    <span className="text-[12px] font-bold">
                      {item.label}
                    </span>

                    {active && (
                      <span className="mr-auto h-1.5 w-1.5 rounded-full bg-[#d6a83c]" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <Link
                href="/support"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[11px] font-bold text-white/60 transition hover:border-[#d6a83c]/20 hover:text-[#f1c75b]"
              >
                پشتیبانی و ارتباط با ما
              </Link>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
