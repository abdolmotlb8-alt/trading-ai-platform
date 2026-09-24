import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[#d6a84f]/10 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-[#9b6b22]/10 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "55px 55px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[82px] max-w-7xl items-center justify-between px-5 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d8ad5a]/40 bg-gradient-to-br from-[#2a210f] via-[#111] to-[#050505] shadow-[0_0_35px_rgba(212,168,75,.12)]">
              <div className="absolute inset-[5px] rounded-[13px] border border-[#d8ad5a]/20" />

              <svg
                width="30"
                height="30"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 23L12.5 13L17 20L22 9L26 23"
                  stroke="#E4B95D"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 25H27"
                  stroke="#A77B2E"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="leading-none">
              <div className="text-[22px] font-black tracking-tight">
                Trading <span className="text-[#e5b95b]">AI</span>
              </div>
              <div className="mt-1 text-[9px] font-medium tracking-[0.35em] text-white/35">
                MARKET INTELLIGENCE
              </div>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-white/55 transition hover:text-[#e6bd65]"
            >
              امکانات
            </Link>

            <Link
              href="#markets"
              className="text-sm text-white/55 transition hover:text-[#e6bd65]"
            >
              بازارها
            </Link>

            <Link
              href="#about"
              className="text-sm text-white/55 transition hover:text-[#e6bd65]"
            >
              درباره پلتفرم
            </Link>
          </nav>

          {/* Header buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white/75 transition hover:bg-white/[0.05] hover:text-white sm:block"
            >
              ورود
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-[#d8ad5a]/40 bg-gradient-to-r from-[#d6a84f] to-[#a97829] px-4 py-2.5 text-sm font-black text-black shadow-[0_8px_30px_rgba(210,165,70,.14)] transition hover:scale-[1.02] hover:shadow-[0_10px_35px_rgba(210,165,70,.25)]"
            >
              ثبت‌نام
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 lg:px-8 lg:pt-20">

        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_.85fr]">

          {/* Hero */}
          <div className="text-center lg:text-right">

            {/* Status */}
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d8ad5a]/20 bg-[#d8ad5a]/[0.06] px-4 py-2 text-xs font-bold text-[#e5bd68]">
              <span className="h-2 w-2 rounded-full bg-[#d8ad5a] shadow-[0_0_12px_#d8ad5a]" />
              پلتفرم هوشمند تحلیل بازار
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.25] tracking-tight sm:text-5xl lg:mx-0 lg:text-6xl">
              با قدرت
              <span className="block bg-gradient-to-l from-[#fff3c7] via-[#e5b95b] to-[#9c6d27] bg-clip-text text-transparent">
                هوش مصنوعی
              </span>
              هوشمندانه معامله کن
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/50 sm:text-lg lg:mx-0">
              Trading AI یک پلتفرم هوشمند برای تحلیل بازار، بررسی روندها،
              شناسایی فرصت‌های معاملاتی و مدیریت بهتر معاملات شماست.
            </p>

            {/* CTA */}
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">

              <Link
                href="/register"
                className="rounded-2xl bg-gradient-to-r from-[#e4bd67] via-[#c99b42] to-[#966522] px-8 py-4 text-base font-black text-black shadow-[0_15px_45px_rgba(211,166,72,.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(211,166,72,.28)]"
              >
                شروع استفاده از Trading AI
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:border-[#d8ad5a]/30 hover:bg-[#d8ad5a]/[0.06]"
              >
                ورود به حساب
              </Link>
            </div>

            {/* Trust */}
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
                <div className="text-lg font-black text-[#e5b95b]">AI</div>
                <div className="mt-1 text-[11px] text-white/40">
                  تحلیل هوشمند
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
                <div className="text-lg font-black text-[#e5b95b]">24/7</div>
                <div className="mt-1 text-[11px] text-white/40">
                  پایش بازار
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
                <div className="text-lg font-black text-[#e5b95b]">LIVE</div>
                <div className="mt-1 text-[11px] text-white/40">
                  اطلاعات بازار
                </div>
              </div>

            </div>
          </div>

          {/* Login card */}
          <div className="relative mx-auto w-full max-w-[470px]">

            <div className="absolute -inset-5 rounded-[40px] bg-[#d8ad5a]/[0.05] blur-3xl" />

            <div className="relative overflow-hidden rounded-[30px] border border-[#d8ad5a]/20 bg-gradient-to-b from-[#11100d]/95 to-[#090909]/95 p-7 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:p-9">

              {/* Gold line */}
              <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d8ad5a] to-transparent" />

              {/* Card logo */}
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8ad5a]/25 bg-[#d8ad5a]/[0.07]">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 23L12.5 13L17 20L22 9L26 23"
                      stroke="#E4B95D"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 25H27"
                      stroke="#A77B2E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div>
                  <div className="text-xl font-black">
                    ورود به <span className="text-[#e5b95b]">Trading AI</span>
                  </div>
                  <div className="mt-1 text-xs text-white/35">
                    به پنل هوشمند معاملات خود وارد شوید
                  </div>
                </div>
              </div>

              {/* Login */}
              <div className="space-y-5">

                <div>
                  <label className="mb-2.5 block text-sm font-bold text-white/75">
                    ایمیل
                  </label>

                  <div className="relative">
                    <input
                      type="email"
                      placeholder="example@email.com"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-left text-sm text-white outline-none placeholder:text-white/20 transition focus:border-[#d8ad5a]/50 focus:bg-[#d8ad5a]/[0.04] focus:ring-2 focus:ring-[#d8ad5a]/10"
                    />
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/20">
                      ✉
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 block text-sm font-bold text-white/75">
                    رمز عبور
                  </label>

                  <div className="relative">
                    <input
                      type="password"
                      placeholder="رمز عبور خود را وارد کنید"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-right text-sm text-white outline-none placeholder:text-white/20 transition focus:border-[#d8ad5a]/50 focus:bg-[#d8ad5a]/[0.04] focus:ring-2 focus:ring-[#d8ad5a]/10"
                    />
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/20">
                      🔒
                    </span>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between gap-3">

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-white/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#d8ad5a]"
                    />
                    مرا بخاطر بسپار
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-bold text-[#d9ad57] transition hover:text-[#f1cf83]"
                  >
                    فراموشی رمز عبور؟
                  </Link>

                </div>

                {/* Real login route */}
                <Link
                  href="/login"
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#e5bd67] via-[#c99a40] to-[#976522] text-base font-black text-black shadow-[0_12px_35px_rgba(213,169,75,.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(213,169,75,.28)]"
                >
                  ورود به حساب
                </Link>

                {/* Register */}
                <div className="pt-2 text-center text-sm text-white/40">
                  حساب کاربری ندارید؟
                  <Link
                    href="/register"
                    className="mr-2 font-black text-[#e3b75c] hover:text-[#f0ce86]"
                  >
                    ثبت‌نام کنید
                  </Link>
                </div>

              </div>

              {/* Security */}
              <div className="mt-7 grid grid-cols-2 gap-3">

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
                  <div className="text-lg">🔐</div>
                  <div className="mt-1 text-[10px] text-white/35">
                    ورود امن
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
                  <div className="text-lg">🛡️</div>
                  <div className="mt-1 text-[10px] text-white/35">
                    حفاظت حساب
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-white/[0.06] bg-[#080808]/80 px-5 py-20"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mb-12 text-center">
            <div className="mb-3 text-sm font-bold text-[#d9ad57]">
              TRADING AI
            </div>

            <h2 className="text-3xl font-black sm:text-4xl">
              ابزارهایی برای یک تجربه حرفه‌ای
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
              تمام بخش‌ها با یک طراحی یکپارچه و ساده ساخته شده‌اند تا اطلاعات
              مهم را سریع و واضح مشاهده کنید.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">

            <Feature
              icon="◈"
              title="تحلیل هوشمند"
              text="بررسی روند بازار و داده‌های معاملاتی با موتور تحلیل Trading AI."
            />

            <Feature
              icon="◉"
              title="سیگنال‌های معاملاتی"
              text="مشاهده فرصت‌ها، نقاط ورود، حد ضرر و اهداف معامله در محیطی منظم."
            />

            <Feature
              icon="◆"
              title="مدیریت معاملات"
              text="کنترل بهتر ریسک، مشاهده عملکرد و بررسی نتیجه معاملات."
            />

          </div>
        </div>
      </section>

      {/* Markets */}
      <section
        id="markets"
        className="border-t border-white/[0.06] px-5 py-20"
      >
        <div className="mx-auto max-w-7xl">

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <Market
              flag="🇺🇸"
              name="فارکس"
              symbol="EUR/USD · GBP/USD · USD/JPY"
            />

            <Market
              flag="🥇"
              name="طلا"
              symbol="XAU/USD"
            />

            <Market
              flag="₿"
              name="ارز دیجیتال"
              symbol="BTC/USDT · ETH/USDT"
            />

            <Market
              flag="🌍"
              name="بازار جهانی"
              symbol="Market Intelligence"
            />

          </div>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="border-t border-white/[0.06] bg-[#070707] px-5 py-20"
      >
        <div className="mx-auto max-w-4xl text-center">

          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[26px] border border-[#d8ad5a]/30 bg-gradient-to-br from-[#2a210f] to-[#090909] shadow-[0_0_50px_rgba(216,173,90,.10)]">

            <svg
              width="48"
              height="48"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 23L12.5 13L17 20L22 9L26 23"
                stroke="#E4B95D"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 25H27"
                stroke="#A77B2E"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

          </div>

          <h2 className="text-3xl font-black sm:text-4xl">
            Trading <span className="text-[#e5b95b]">AI</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-white/40 sm:text-base">
            یک محیط حرفه‌ای برای مشاهده بازار، تحلیل داده‌ها و مدیریت
            هوشمندانه‌تر معاملات.
          </p>

          <Link
            href="/register"
            className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-[#e4bd67] to-[#966522] px-8 py-4 font-black text-black transition hover:-translate-y-0.5"
          >
            ساخت حساب کاربری
          </Link>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">

          <div className="text-sm text-white/35">
            © {new Date().getFullYear()} Trading AI
          </div>

          <div className="flex items-center gap-5 text-xs text-white/30">
            <Link href="/login" className="hover:text-[#d9ad57]">
              ورود
            </Link>

            <Link href="/register" className="hover:text-[#d9ad57]">
              ثبت‌نام
            </Link>

            <Link href="/support" className="hover:text-[#d9ad57]">
              پشتیبانی
            </Link>
          </div>

        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-[26px] border border-white/[0.07] bg-white/[0.025] p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#d8ad5a]/20 hover:bg-[#d8ad5a]/[0.035]">

      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d8ad5a]/20 bg-[#d8ad5a]/[0.07] text-xl text-[#e3b75c]">
        {icon}
      </div>

      <h3 className="text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-white/40">
        {text}
      </p>

    </div>
  );
}

function Market({
  flag,
  name,
  symbol,
}: {
  flag: string;
  name: string;
  symbol: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-xl">

      <div className="flex items-center gap-4">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-black/30 text-2xl">
          {flag}
        </div>

        <div>
          <div className="font-black">{name}</div>
          <div className="mt-1 text-[11px] text-white/30">
            {symbol}
          </div>
        </div>

      </div>

    </div>
  );
}
