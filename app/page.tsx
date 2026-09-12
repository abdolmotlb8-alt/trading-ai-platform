import Link from "next/link";

export default function HomePage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-black text-white"
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute right-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-yellow-500/10 blur-[120px]" />
        <div className="absolute bottom-[-200px] left-[-180px] h-[450px] w-[450px] rounded-full bg-yellow-600/5 blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "45px 45px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_30px_rgba(234,179,8,0.08)]">
              <span className="text-xl font-black text-yellow-400">
                AI
              </span>
            </div>

            <div>
              <div className="text-base font-black tracking-wide text-white sm:text-lg">
                Trading AI
              </div>

              <div className="text-[10px] text-gray-500 sm:text-xs">
                پلتفرم هوشمند معامله‌گری
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 lg:flex">
            <NavItem href="/market" title="بازارها" />
            <NavItem href="/ai-analysis" title="تحلیل AI" />
            <NavItem href="/signals" title="سیگنال‌ها" />
            <NavItem href="/bots" title="ربات‌ها" />
            <NavItem href="/courses" title="آموزش" />
            <NavItem href="/support" title="پشتیبانی" />
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-gray-300 transition hover:border-yellow-400/30 hover:bg-yellow-400/5 hover:text-yellow-400 sm:px-5 sm:text-sm"
            >
              ورود
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-yellow-400/30 bg-yellow-400 px-3 py-2.5 text-xs font-black text-black shadow-[0_0_25px_rgba(234,179,8,0.12)] transition hover:bg-yellow-300 sm:px-5 sm:text-sm"
            >
              ثبت‌نام
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/[0.06] px-4 py-2 text-xs font-bold text-yellow-400 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
              سیستم هوشمند تحلیل بازار
            </div>

            <h1 className="text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              تصمیم‌های معاملاتی
              <br />
              <span className="text-yellow-400">
                هوشمندتر و دقیق‌تر
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-gray-400 sm:text-base sm:leading-9 lg:text-lg">
              بازار را با ابزارهای هوشمند، تحلیل‌های AI، سیگنال‌ها،
              ربات‌های معاملاتی و گزارش‌های حرفه‌ای در یک محیط یکپارچه
              بررسی و مدیریت کنید.
            </p>

            {/* Hero Actions */}
            <div className="mx-auto mt-9 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/register"
                className="rounded-2xl border border-yellow-400/30 bg-yellow-400 px-6 py-4 text-sm font-black text-black shadow-[0_0_40px_rgba(234,179,8,0.12)] transition hover:-translate-y-0.5 hover:bg-yellow-300"
              >
                شروع رایگان
              </Link>

              <Link
                href="/ai-analysis"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-yellow-400/30 hover:bg-yellow-400/5"
              >
                مشاهده تحلیل AI
              </Link>
            </div>
          </div>

          {/* Market Preview */}
          <div className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-3">
            <MarketCard
              symbol="BTC / USDT"
              price="$67,842"
              change="+2.84%"
              status="صعودی"
            />

            <MarketCard
              symbol="ETH / USDT"
              price="$3,482"
              change="+1.72%"
              status="مثبت"
            />

            <MarketCard
              symbol="XAU / USD"
              price="$2,684"
              change="+0.91%"
              status="پایدار"
            />
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="border-y border-white/5 bg-white/[0.015] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          
          <SectionTitle
            eyebrow="امکانات اصلی"
            title="همه ابزارهای موردنیاز در یک محیط"
            description="هر بخش به‌صورت مستقل طراحی شده تا اطلاعات را سریع، واضح و حرفه‌ای در اختیار شما قرار دهد."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="🧠"
              title="تحلیل هوشمند AI"
              description="تحلیل بازار و بررسی سناریوهای احتمالی با ابزارهای هوشمند."
              href="/ai-analysis"
            />

            <FeatureCard
              icon="📡"
              title="سیگنال‌های معاملاتی"
              description="مشاهده سیگنال‌ها، وضعیت بازار و اطلاعات ورود و خروج."
              href="/signals"
            />

            <FeatureCard
              icon="🤖"
              title="ربات‌های معاملاتی"
              description="ساخت، مدیریت و بررسی عملکرد ربات‌های معاملاتی."
              href="/bots"
            />

            <FeatureCard
              icon="📊"
              title="بازارها"
              description="بررسی بازارها و دارایی‌های مختلف در یک محیط یکپارچه."
              href="/market"
            />

            <FeatureCard
              icon="📈"
              title="گزارش عملکرد"
              description="بررسی عملکرد معاملات، سود و زیان و نتایج استراتژی‌ها."
              href="/performance"
            />

            <FeatureCard
              icon="🛡️"
              title="مدیریت ریسک"
              description="کنترل ریسک و بررسی وضعیت سرمایه و معاملات."
              href="/risk"
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          
          <SectionTitle
            eyebrow="خدمات"
            title="یک پلتفرم، چندین ابزار حرفه‌ای"
            description="امکانات جانبی برای مدیریت بهتر حساب و تجربه کامل‌تر."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ServiceCard
              icon="🏦"
              title="اتصال کارگزاری"
              href="/broker"
            />

            <ServiceCard
              icon="✈️"
              title="تلگرام"
              href="/telegram"
            />

            <ServiceCard
              icon="💎"
              title="اشتراک"
              href="/subscription"
            />

            <ServiceCard
              icon="🎓"
              title="آموزش"
              href="/courses"
            />
          </div>
        </div>
      </section>

      {/* Glass CTA */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[28px] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.08] via-white/[0.025] to-transparent p-7 shadow-2xl backdrop-blur-2xl sm:p-10 lg:p-14">
            
            <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-yellow-400/10 blur-[80px]" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-3 text-xs font-bold text-yellow-400">
                  شروع کار
                </div>

                <h2 className="text-2xl font-black sm:text-3xl lg:text-4xl">
                  آماده ورود به دنیای معامله‌گری هوشمند هستید؟
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                  حساب خود را ایجاد کنید و ابزارهای پلتفرم را در محیطی
                  حرفه‌ای و یکپارچه تجربه کنید.
                </p>
              </div>

              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-7 py-4 text-sm font-black text-black transition hover:bg-yellow-300"
              >
                ایجاد حساب
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950/70 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            
            <div>
              <div className="text-lg font-black text-yellow-400">
                Trading AI
              </div>

              <p className="mt-3 text-sm leading-7 text-gray-500">
                پلتفرم هوشمند برای تحلیل، مدیریت و بررسی معاملات.
              </p>
            </div>

            <FooterColumn
              title="پلتفرم"
              links={[
                ["بازارها", "/market"],
                ["تحلیل AI", "/ai-analysis"],
                ["سیگنال‌ها", "/signals"],
                ["ربات‌ها", "/bots"],
              ]}
            />

            <FooterColumn
              title="خدمات"
              links={[
                ["کارگزاری", "/broker"],
                ["اشتراک", "/subscription"],
                ["آموزش", "/courses"],
                ["تلگرام", "/telegram"],
              ]}
            />

            <FooterColumn
              title="حساب"
              links={[
                ["ورود", "/login"],
                ["ثبت‌نام", "/register"],
                ["پشتیبانی", "/support"],
                ["پنل کاربری", "/panel"],
              ]}
            />
          </div>

          <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Trading AI — تمامی حقوق محفوظ است.
          </div>
        </div>
      </footer>
    </main>
  );
}

function NavItem({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-yellow-400/5 hover:text-yellow-400"
    >
      {title}
    </Link>
  );
}

function MarketCard({
  symbol,
  price,
  change,
  status,
}: {
  symbol: string;
  price: string;
  change: string;
  status: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl backdrop-blur-2xl transition hover:-translate-y-1 hover:border-yellow-400/20 hover:bg-yellow-400/[0.03]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">
            بازار
          </div>

          <div className="mt-1 text-sm font-black text-white">
            {symbol}
          </div>
        </div>

        <div className="rounded-xl border border-yellow-400/10 bg-yellow-400/5 px-3 py-1.5 text-xs font-bold text-yellow-400">
          {status}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div className="text-2xl font-black tracking-tight">
          {price}
        </div>

        <div className="text-sm font-bold text-yellow-400">
          {change}
        </div>
      </div>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full w-[72%] rounded-full bg-yellow-400/60" />
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-bold text-yellow-400">
        {eyebrow}
      </div>

      <h2 className="mt-3 text-2xl font-black sm:text-3xl lg:text-4xl">
        {title}
      </h2>

      <p className="mt-4 text-sm leading-7 text-gray-500 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
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
      className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-yellow-400/25 hover:bg-yellow-400/[0.04]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/15 bg-yellow-400/5 text-xl">
        {icon}
      </div>

      <h3 className="mt-5 text-base font-black text-white group-hover:text-yellow-400">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-gray-500">
        {description}
      </p>

      <div className="mt-5 text-xs font-bold text-gray-600 transition group-hover:text-yellow-400">
        مشاهده بیشتر ←
      </div>
    </Link>
  );
}

function ServiceCard({
  icon,
  title,
  href,
}: {
  icon: string;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:border-yellow-400/20 hover:bg-yellow-400/[0.04]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400/5 text-lg">
          {icon}
        </div>

        <div>
          <div className="text-sm font-bold text-gray-300 group-hover:text-yellow-400">
            {title}
          </div>

          <div className="mt-1 text-xs text-gray-600">
            ورود به بخش
          </div>
        </div>
      </div>
    </Link>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <div className="text-sm font-black text-gray-300">
        {title}
      </div>

      <div className="mt-4 space-y-3">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="block text-sm text-gray-600 transition hover:text-yellow-400"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
