"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="header">

      <div className="container flex items-center justify-between py-5">

        {/* Logo */}
        <Link
          href="/"
          className="text-3xl font-black text-yellow-400"
        >
          ABOK AI
        </Link>


        {/* Menu */}
        <nav>

          <Link href="/">
            خانه
          </Link>

          <Link href="/dashboard">
            داشبورد
          </Link>

          <Link href="/markets">
            بازارها
          </Link>

          <Link href="/ai">
            هوش مصنوعی
          </Link>

        </nav>


        {/* Actions */}
        <div className="flex items-center gap-4">


          <button
            className="btn-secondary"
          >
            🔍
          </button>


          <button
            className="btn-primary"
          >
            ورود
          </button>


          <button
            className="btn-primary"
          >
            ثبت نام
          </button>


        </div>


      </div>

    </header>
  );
}
