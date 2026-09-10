import Link from "next/link";

export default function Navbar() {
  return (
    <nav>

      <h2>
        Trading AI
      </h2>


      <div>

        <Link href="/">
          خانه
        </Link>


        <Link href="/dashboard">
          داشبورد
        </Link>


        <Link href="/signals">
          سیگنال‌ها
        </Link>


        <Link href="/trades">
          معاملات
        </Link>


        <Link href="/bots">
          ربات‌ها
        </Link>


        <Link href="/ai-analysis">
          تحلیل AI
        </Link>


        <Link href="/assistant">
          دستیار AI
        </Link>


        <Link href="/market">
          بازار
        </Link>


        <Link href="/news">
          اخبار
        </Link>


        <Link href="/courses">
          آموزش
        </Link>


        <Link href="/wallet">
          کیف پول
        </Link>


        <Link href="/profile">
          پروفایل
        </Link>


        <Link href="/settings">
          تنظیمات
        </Link>


        <Link href="/login">
          ورود
        </Link>


      </div>


    </nav>
  );
}
