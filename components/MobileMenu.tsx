"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileMenu() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return (
    <div>
      <button>
        ☰ منو
      </button>

      <div>
        <Link href="/">خانه</Link>
        <Link href="/dashboard">داشبورد</Link>
        <Link href="/bots">ربات‌ها</Link>
        <Link href="/ai-analysis">تحلیل AI</Link>
        <Link href="/assistant">دستیار AI</Link>
        <Link href="/market">بازار</Link>
        <Link href="/news">اخبار</Link>
        <Link href="/courses">آموزش</Link>
      </div>
    </div>
  );
}
