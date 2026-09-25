"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ---------- لوگوی طلایی ---------- */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <svg
        width="42"
        height="42"
        viewBox="0 0 48 48"
        fill="none"
        className="transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5d76e" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
        </defs>

        <circle cx="24" cy="24" r="22" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" opacity="0.4" />

        <rect x="14" y="20" width="3" height="12" rx="1" fill="url(#goldGrad)" />
        <rect x="22.5" y="14" width="3" height="18" rx="1" fill="url(#goldGrad)" />
        <rect x="31" y="18" width="3" height="14" rx="1" fill="url(#goldGrad)" />

        <path
          d="M12 30 L20 22 L28 26 L36 16"
          stroke="url(#goldGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="36" cy="16" r="2.5" fill="#f5d76e" />
      </svg>

      <div className="flex flex-col leading-none">
        <span className="text-2xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
          TradeAI
        </span>
        <span className="text-[10px] text-yellow-600/70 tracking-widest mt-0.5">
          INTELLIGENCE
        </span>
      </div>
    </Link>
  );
}

/* ---------- هدر اصلی ---------- */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-yellow-500/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* لوگو */}
        <Logo />

        {/* منوی دسکتاپ */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-sm text-gray-300 hover:text-yellow-400 transition-colors"
          >
            خانه
          </Link>
          <Link
            href="/#features"
            className="text-sm text-gray-300 hover:text-yellow-400 transition-colors"
          >
            امکانات
          </Link>
          <Link
            href="/#pricing"
            className="text-sm text-gray-300 hover:text-yellow-400 transition-colors"
          >
            تعرفه‌ها
          </Link>
          <Link
            href="/#contact"
            className="text-sm text-gray-300 hover:text-yellow-400 transition-colors"
          >
            تماس
          </Link>
        </nav>

        {/* دکمه‌های ورود/ثبت‌نام */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-300 hover:text-yellow-400 px-4 py-2 transition-colors"
          >
            ورود
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/20"
          >
            ثبت‌نام رایگان
          </Link>
        </div>

        {/* دکمه منوی موبایل */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-yellow-400 p-2"
          aria-label="منو"
        >
          {menuOpen ? (
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* منوی موبایل */}
      {menuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-yellow-500/20">
          <nav className="flex flex-col p-6 gap-4">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-yellow-400 py-2"
            >
              خانه
            </Link>
            <Link
              href="/#features"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-yellow-400 py-2"
            >
              امکانات
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-yellow-400 py-2"
            >
              تعرفه‌ها
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-yellow-400 py-2"
            >
              تماس
            </Link>

            <div className="border-t border-yellow-500/20 pt-4 mt-2 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-center text-gray-300 hover:text-yellow-400 py-3 rounded-lg border border-yellow-500/30"
              >
                ورود
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="text-center font-medium py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
              >
                ثبت‌نام رایگان
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
