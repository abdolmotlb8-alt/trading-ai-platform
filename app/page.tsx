// مسیر فایل:
// app/page.tsx

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Cpu,
  Globe2,
  KeyRound,
  LineChart,
  LockKeyhole,
  Menu,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  WalletCards,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "Trading AI | پلتفرم هوشمند معاملات",
  description:
    "تحلیل هوشمند بازار، مدیریت ریسک و ابزارهای حرفه‌ای معاملاتی با Trading AI",
};

const features = [
  {
    icon: BrainCircuit,
    title: "تحلیل هوشمند بازار",
    description:
      "تحلیل ساختار بازار، روندها، حمایت و مقاومت با ابزارهای هوشمند.",
  },
  {
    icon: Bot,
    title: "ربات‌های معاملاتی",
    description:
      "ساخت، مدیریت و کنترل ربات‌های معاملاتی با تنظیمات حرفه‌ای.",
  },
  {
    icon: ShieldCheck,
    title: "مدیریت ریسک",
    description:
      "کنترل ریسک، حد ضرر، حد سود و مدیریت سرمایه برای معاملات.",
  },
  {
    icon: LineChart,
    title: "سیگنال‌های تحلیلی",
    description:
      "بررسی فرصت‌های بازار بر اساس چندین فاکتور و تأیید تحلیلی.",
  },
  {
    icon: Globe2,
    title: "بازارهای جهانی",
    description:
      "دسترسی به اطلاعات بازارهای فارکس، طلا، ارزهای دیجیتال و شاخص‌ها.",
  },
  {
    icon: Clock3,
    title: "دسترسی ۲۴ ساعته",
    description:
      "مدیریت حساب و بررسی اطلاعات معاملاتی در هر زمان و هر مکان.",
  },
];

const steps = [
  {
    number: "01",
    title: "ساخت حساب کاربری",
    description: "در چند مرحله کوتاه حساب خود را ایجاد کنید.",
  },
  {
    number: "02",
    title: "انتخاب ابزار موردنظر",
    description: "بازار، ربات، تحلیل یا سرویس معاملاتی خود را انتخاب کنید.",
  },
  {
    number: "03",
    title: "شروع فعالیت",
    description: "تنظیمات خود را انجام دهید و فعالیت‌ها را مدیریت کنید.",
  },
];

function Logo() {
  return (
    <Link href="/" className="brand" aria-label="صفحه اصلی Trading AI">
      <span className="brand-mark">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="14"
            fill="url(#logoGradient)"
          />
          <path
            d="M12 30L19 23L25 28L36 15"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M29 15H36V22"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="logoGradient"
              x1="4"
              y1="4"
              x2="44"
              y2="44"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#22D3EE" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </svg>
      </span>

      <span className="brand-text">
        <strong>Trading</strong>
        <b> AI</b>
      </span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <main dir="rtl" className="site-shell">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <header className="header">
        <div className="container header-inner">
          <Logo />

          <nav className="desktop-nav" aria-label="منوی اصلی">
            <Link href="#features">امکانات</Link>
            <Link href="#how-it-works">نحوه کار</Link>
            <Link href="#markets">بازارها</Link>
            <Link href="/economic">تقویم اقتصادی</Link>
            <Link href="/support">پشتیبانی</Link>
          </nav>

          <div className="header-actions">
            <Link href="/login" className="login-link">
              ورود
            </Link>

            <Link href="/register" className="register-button">
              <UserPlus size={17} />
              ثبت‌نام رایگان
            </Link>

            <button
              type="button"
              className="mobile-menu-button"
              aria-label="باز کردن منو"
            >
              <Menu size={23} />
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              <Sparkles size={16} />
              پلتفرم هوشمند تحلیل و معاملات
            </div>

            <h1>
              تصمیم‌های بهتر،
              <br />
              <span>معاملات هوشمندتر</span>
            </h1>

            <p className="hero-description">
              با Trading AI بازار را دقیق‌تر بررسی کنید، ریسک معاملات خود را
              مدیریت کنید و با ابزارهای حرفه‌ای، کنترل بیشتری روی فعالیت‌های
              معاملاتی خود داشته باشید.
            </p>

            <div className="hero-actions">
              <Link href="/register" className="primary-button">
                شروع رایگان
                <ArrowLeft size={19} />
              </Link>

              <Link href="/ai-analysis" className="secondary-button">
                مشاهده تحلیل‌ها
                <BarChart3 size={18} />
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-item">
                <CheckCircle2 size={17} />
                <span>شروع با پلن رایگان</span>
              </div>

              <div className="trust-item">
                <ShieldCheck size={17} />
                <span>مدیریت امن حساب</span>
              </div>

              <div className="trust-item">
                <Zap size={17} />
                <span>دسترسی سریع</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="dashboard-preview">
              <div className="preview-topbar">
                <div className="preview-brand">
                  <span className="mini-logo">
                    <Cpu size={15} />
                  </span>
                  <span>Trading AI</span>
                </div>

                <span className="live-status">
                  <i />
                  آنلاین
                </span>
              </div>

              <div className="preview-heading">
                <div>
                  <span>نمای کلی بازار</span>
                  <h3>داشبورد هوشمند</h3>
                </div>

                <div className="preview-date">امروز</div>
              </div>

              <div className="preview-stats">
                <div className="preview-stat">
                  <span>وضعیت بازار</span>
                  <strong className="positive">صعودی</strong>
                  <small>
                    <TrendingUp size={13} />
                    تحلیل لحظه‌ای
                  </small>
                </div>

                <div className="preview-stat">
                  <span>امتیاز تحلیل</span>
                  <strong>87.4%</strong>
                  <small>اعتماد تحلیلی</small>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <span>نمودار عملکرد</span>
                  <span className="chart-period">1D</span>
                </div>

                <svg
                  className="market-chart"
                  viewBox="0 0 440 190"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="نمودار نمونه رابط کاربری"
                >
                  <defs>
                    <linearGradient
                      id="chartFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 155H440M0 110H440M0 65H440M0 20H440"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeDasharray="4 5"
                  />

                  <path
                    d="M0 155 L30 140 L58 147 L88 108 L116 118 L145 82 L173 98 L202 62 L230 75 L258 42 L286 55 L315 25 L343 48 L370 18 L400 32 L440 8 L440 190 L0 190Z"
                    fill="url(#chartFill)"
                  />

                  <path
                    d="M0 155 L30 140 L58 147 L88 108 L116 118 L145 82 L173 98 L202 62 L230 75 L258 42 L286 55 L315 25 L343 48 L370 18 L400 32 L440 8"
                    stroke="#22D3EE"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  <circle cx="440" cy="8" r="5" fill="#22D3EE" />
                </svg>

                <div className="chart-bottom">
                  <span>شروع</span>
                  <span>اکنون</span>
                </div>
              </div>

              <div className="preview-bottom">
                <div className="preview-bottom-item">
                  <span className="preview-icon cyan">
                    <BrainCircuit size={16} />
                  </span>
                  <div>
                    <strong>تحلیل هوشمند</strong>
                    <small>فعال</small>
                  </div>
                </div>

                <div className="preview-bottom-item">
                  <span className="preview-icon purple">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <strong>مدیریت ریسک</strong>
                    <small>محافظت‌شده</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-card floating-card-top">
              <span className="floating-icon">
                <TrendingUp size={18} />
              </span>
              <div>
                <strong>تحلیل بازار</strong>
                <small>به‌روزرسانی شده</small>
              </div>
              <CheckCircle2 className="floating-check" size={18} />
            </div>

            <div className="floating-card floating-card-bottom">
              <span className="floating-icon purple-bg">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>امنیت حساب</strong>
                <small>فعال و محافظت‌شده</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="numbers-section">
        <div className="container numbers-grid">
          <div className="number-item">
            <strong>
              <Sparkles size={23} />
              AI
            </strong>
            <span>تحلیل هوشمند بازار</span>
          </div>

          <div className="number-item">
            <strong>24/7</strong>
            <span>دسترسی به پلتفرم</span>
          </div>

          <div className="number-item">
            <strong>
              <ShieldCheck size={23} />
              Secure
            </strong>
            <span>تمرکز بر امنیت حساب</span>
          </div>

          <div className="number-item">
            <strong>
              <Zap size={23} />
              Fast
            </strong>
            <span>رابط کاربری سریع</span>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-heading">
            <div className="section-tag">
              <Sparkles size={15} />
              امکانات پلتفرم
            </div>

            <h2>
              همه ابزارهای موردنیاز،
              <br />
              <span>در یک محیط حرفه‌ای</span>
            </h2>

            <p>
              ابزارهای کاربردی Trading AI برای تحلیل بهتر، مدیریت معاملات و
              کنترل فعالیت‌های شما طراحی شده‌اند.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="feature-card" key={feature.title}>
                  <div className="feature-icon">
                    <Icon size={24} />
                  </div>

                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>

                  <Link href="/register" className="feature-link">
                    شروع استفاده
                    <ChevronLeft size={17} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="markets" className="market-section">
        <div className="container market-grid">
          <div className="market-content">
            <div className="section-tag">
              <Globe2 size={15} />
              بازارهای جهانی
            </div>

            <h2>
              بازار را بهتر بشناسید،
              <br />
              <span>آگاهانه‌تر تصمیم بگیرید</span>
            </h2>

            <p>
              اطلاعات بازار و ابزارهای تحلیلی خود را در یک محیط یکپارچه
              مشاهده و مدیریت کنید.
            </p>

            <Link href="/market" className="primary-button">
              مشاهده بازارها
              <ArrowLeft size={18} />
            </Link>
          </div>

          <div className="market-list">
            <div className="market-row">
              <div className="market-symbol">
                <span className="symbol-icon gold">Au</span>
                <div>
                  <strong>Gold / USD</strong>
                  <small>طلا</small>
                </div>
              </div>

              <div className="market-value">
                <strong>بازار جهانی</strong>
                <span className="positive">قابل بررسی</span>
              </div>
            </div>

            <div className="market-row">
              <div className="market-symbol">
                <span className="symbol-icon blue">₿</span>
                <div>
                  <strong>BTC / USD</strong>
                  <small>ارز دیجیتال</small>
                </div>
              </div>

              <div className="market-value">
                <strong>بازار جهانی</strong>
                <span className="positive">قابل بررسی</span>
              </div>
            </div>

            <div className="market-row">
              <div className="market-symbol">
                <span className="symbol-icon purple">FX</span>
                <div>
                  <strong>EUR / USD</strong>
                  <small>فارکس</small>
                </div>
              </div>

              <div className="market-value">
                <strong>بازار جهانی</strong>
                <span className="positive">قابل بررسی</span>
              </div>
            </div>

            <div className="market-row">
              <div className="market-symbol">
                <span className="symbol-icon green">SP</span>
                <div>
                  <strong>SPX / USD</strong>
                  <small>شاخص بازار</small>
                </div>
              </div>

              <div className="market-value">
                <strong>بازار جهانی</strong>
                <span className="positive">قابل بررسی</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-heading">
            <div className="section-tag">
              <Rocket size={15} />
              شروع کار
            </div>

            <h2>
              شروع کار با Trading AI
              <br />
              <span>ساده و سریع</span>
            </h2>

            <p>
              بدون پیچیدگی اضافی، حساب خود را ایجاد کنید و امکانات موردنظر را
              بررسی کنید.
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>

          <div className="cta-box">
            <div className="cta-icon">
              <Rocket size={29} />
            </div>

            <div className="cta-content">
              <h3>آماده شروع هستید؟</h3>
              <p>
                همین حالا حساب خود را ایجاد کنید و محیط Trading AI را بررسی
                کنید.
              </p>
            </div>

            <Link href="/register" className="primary-button">
              ساخت حساب
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Logo />

            <p>
              Trading AI؛ محیطی برای تحلیل بازار، مدیریت معاملات و استفاده از
              ابزارهای هوشمند معاملاتی.
            </p>

            <div className="footer-security">
              <LockKeyhole size={15} />
              امنیت و حریم خصوصی کاربران
            </div>
          </div>

          <div className="footer-column">
            <h3>دسترسی سریع</h3>
            <Link href="/market">بازارها</Link>
            <Link href="/ai-analysis">تحلیل هوشمند</Link>
            <Link href="/bots">ربات‌های معاملاتی</Link>
            <Link href="/economic">تقویم اقتصادی</Link>
          </div>

          <div className="footer-column">
            <h3>حساب کاربری</h3>
            <Link href="/login">ورود به حساب</Link>
            <Link href="/register">ثبت‌نام</Link>
            <Link href="/forgot-password">فراموشی رمز عبور</Link>
            <Link href="/settings">تنظیمات حساب</Link>
          </div>

          <div className="footer-column">
            <h3>پشتیبانی</h3>
            <Link href="/support">
              <CircleHelp size={16} />
              مرکز پشتیبانی
            </Link>
            <Link href="/support">ارسال درخواست</Link>
            <Link href="/terms">قوانین و شرایط</Link>
            <Link href="/privacy">حریم خصوصی</Link>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Trading AI. تمامی حقوق محفوظ است.
          </span>

          <span className="footer-bottom-status">
            <i />
            سیستم در حال توسعه و بهبود
          </span>
        </div>
      </footer>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap");

        :root {
          --background: #050b18;
          --surface: #0b1426;
          --surface-light: #101d34;
          --border: rgba(148, 163, 184, 0.15);
          --text: #f8fafc;
          --muted: #94a3b8;
          --cyan: #22d3ee;
          --blue: #3b82f6;
          --purple: #8b5cf6;
          --green: #34d399;
        }

        * {
          box-sizing: border-box;
          scroll-behavior: smooth;
        }

        html {
          background: var(--background);
        }

        body {
          margin: 0;
          color: var(--text);
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(37, 99, 235, 0.12),
              transparent 35%
            ),
            var(--background);
          font-family: "Vazirmatn", sans-serif;
          overflow-x: hidden;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .site-shell {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }

        .container {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .background-glow {
          position: absolute;
          width: 480px;
          height: 480px;
          border-radius: 999px;
          filter: blur(120px);
          pointer-events: none;
          opacity: 0.12;
        }

        .glow-one {
          background: #2563eb;
          top: 180px;
          right: -250px;
        }

        .glow-two {
          background: #7c3aed;
          top: 750px;
          left: -280px;
        }

        .header {
          position: relative;
          z-index: 20;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(5, 11, 24, 0.75);
          backdrop-filter: blur(22px);
        }

        .header-inner {
          min-height: 86px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          direction: ltr;
          flex-shrink: 0;
        }

        .brand-mark {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
        }

        .brand-mark svg {
          width: 100%;
          height: 100%;
        }

        .brand-text {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.7px;
          white-space: nowrap;
        }

        .brand-text b {
          color: var(--cyan);
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 27px;
          margin-right: auto;
          margin-left: auto;
        }

        .desktop-nav a {
          color: #aab8ce;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.2s ease;
          white-space: nowrap;
        }

        .desktop-nav a:hover {
          color: var(--cyan);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 17px;
        }

        .login-link {
          color: #dbeafe;
          font-size: 14px;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .login-link:hover {
          color: var(--cyan);
        }

        .register-button,
        .primary-button,
        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 13px;
          font-size: 13px;
          font-weight: 700;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .register-button {
          padding: 12px 17px;
          color: #04111f;
          background: linear-gradient(135deg, #67e8f9, #22d3ee);
          box-shadow: 0 8px 25px rgba(34, 211, 238, 0.12);
        }

        .register-button:hover,
        .primary-button:hover,
        .secondary-button:hover {
          transform: translateY(-2px);
        }

        .mobile-menu-button {
          display: none;
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.7);
          color: white;
          border-radius: 10px;
          width: 42px;
          height: 42px;
          place-items: center;
        }

        .hero {
          position: relative;
          padding: 92px 0 90px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 0.95fr;
          align-items: center;
          gap: 65px;
        }

        .hero-content {
          min-width: 0;
        }

        .eyebrow,
        .section-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: #67e8f9;
          border: 1px solid rgba(34, 211, 238, 0.2);
          background: rgba(34, 211, 238, 0.06);
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 11px;
          font-weight: 600;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          background: var(--cyan);
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(34, 211, 238, 0.8);
        }

        .hero h1 {
          font-size: clamp(38px, 4.6vw, 66px);
          line-height: 1.35;
          letter-spacing: -2px;
          margin: 24px 0 23px;
          font-weight: 900;
        }

        .hero h1 span,
        .section-heading h2 span,
        .market-content h2 span {
          background: linear-gradient(90deg, #22d3ee, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-description {
          color: #9caec5;
          font-size: 15px;
          line-height: 2.3;
          max-width: 570px;
          margin: 0;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 31px;
        }

        .primary-button {
          min-height: 49px;
          padding: 0 22px;
          color: #03111f;
          background: linear-gradient(135deg, #67e8f9, #22d3ee 60%, #38bdf8);
          box-shadow: 0 12px 35px rgba(34, 211, 238, 0.13);
        }

        .secondary-button {
          min-height: 49px;
          padding: 0 21px;
          color: #dbeafe;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.55);
        }

        .hero-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 27px;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8193ad;
          font-size: 10px;
        }

        .trust-item svg {
          color: var(--green);
        }

        .hero-visual {
          min-height: 520px;
          position: relative;
          display: grid;
          place-items: center;
        }

        .visual-orbit {
          position: absolute;
          border: 1px solid rgba(34, 211, 238, 0.09);
          border-radius: 50%;
          pointer-events: none;
        }

        .orbit-one {
          width: 520px;
          height: 520px;
        }

        .orbit-two {
          width: 390px;
          height: 390px;
          border-color: rgba(139, 92, 246, 0.12);
        }

        .dashboard-preview {
          position: relative;
          width: min(100%, 460px);
          padding: 20px;
          border-radius: 25px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background:
            linear-gradient(
              145deg,
              rgba(21, 38, 66, 0.94),
              rgba(7, 16, 32, 0.97)
            );
          box-shadow:
            0 35px 90px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transform: perspective(1200px) rotateY(-5deg) rotateX(3deg);
          z-index: 3;
        }

        .preview-topbar,
        .preview-heading,
        .chart-header,
        .chart-bottom,
        .preview-bottom,
        .preview-bottom-item {
          display: flex;
          align-items: center;
        }

        .preview-topbar,
        .preview-heading,
        .chart-header,
        .chart-bottom {
          justify-content: space-between;
        }

        .preview-topbar {
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }

        .preview-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          direction: ltr;
          font-size: 12px;
          font-weight: 700;
        }

        .mini-logo {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          color: #04111f;
          background: var(--cyan);
          border-radius: 8px;
        }

        .live-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #86efac;
          font-size: 10px;
        }

        .live-status i,
        .footer-bottom-status i {
          width: 6px;
          height: 6px;
          background: #34d399;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(52, 211, 153, 0.7);
        }

        .preview-heading {
          margin-top: 23px;
        }

        .preview-heading span {
          color: #8da1bc;
          font-size: 10px;
        }

        .preview-heading h3 {
          margin: 7px 0 0;
          font-size: 18px;
        }

        .preview-date {
          color: #93a4bd;
          font-size: 10px;
          padding: 7px 11px;
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .preview-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .preview-stat {
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.6);
          border-radius: 13px;
          padding: 14px;
        }

        .preview-stat span {
          display: block;
          color: #8193ad;
          font-size: 10px;
        }

        .preview-stat strong {
          display: block;
          font-size: 21px;
          margin: 8px 0;
          direction: ltr;
          text-align: right;
        }

        .preview-stat small {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #7186a3;
          font-size: 9px;
        }

        .positive {
          color: #34d399 !important;
        }

        .chart-card {
          margin-top: 12px;
          padding: 15px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: rgba(15, 23, 42, 0.42);
        }

        .chart-header {
          color: #a5b4c8;
          font-size: 10px;
        }

        .chart-period {
          color: var(--cyan);
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(34, 211, 238, 0.09);
        }

        .market-chart {
          width: 100%;
          height: 170px;
          margin-top: 12px;
          color: white;
          overflow: visible;
        }

        .chart-bottom {
          color: #64748b;
          font-size: 9px;
          direction: ltr;
        }

        .preview-bottom {
          gap: 10px;
          margin-top: 12px;
        }

        .preview-bottom-item {
          flex: 1;
          gap: 8px;
          padding: 11px;
          border: 1px solid var(--border);
          border-radius: 12px;
          min-width: 0;
        }

        .preview-bottom-item strong,
        .preview-bottom-item small {
          display: block;
        }

        .preview-bottom-item strong {
          color: #cbd5e1;
          font-size: 9px;
          white-space: nowrap;
        }

        .preview-bottom-item small {
          color: #7186a3;
          font-size: 8px;
          margin-top: 4px;
        }

        .preview-icon,
        .floating-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 9px;
        }

        .preview-icon.cyan,
        .floating-icon {
          color: var(--cyan);
          background: rgba(34, 211, 238, 0.1);
        }

        .preview-icon.purple,
        .purple-bg {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.13);
        }

        .floating-card {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 15px;
          background: rgba(10, 22, 41, 0.9);
          backdrop-filter: blur(18px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        }

        .floating-card strong,
        .floating-card small {
          display: block;
        }

        .floating-card strong {
          color: #e2e8f0;
          font-size: 10px;
          white-space: nowrap;
        }

        .floating-card small {
          color: #7186a3;
          font-size: 9px;
          margin-top: 4px;
        }

        .floating-check {
          color: var(--green);
          margin-right: 4px;
        }

        .floating-card-top {
          top: 35px;
          right: -25px;
        }

        .floating-card-bottom {
          bottom: 42px;
          left: -28px;
        }

        .numbers-section {
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.3);
        }

        .numbers-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .number-item {
          text-align: center;
          padding: 28px 15px;
          border-left: 1px solid var(--border);
        }

        .number-item:last-child {
          border-left: 0;
        }

        .number-item strong {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          direction: ltr;
          font-size: 24px;
          letter-spacing: -0.5px;
        }

        .number-item span {
          display: block;
          color: #8193ad;
          font-size: 11px;
          margin-top: 8px;
        }

        .section {
          padding: 110px 0;
        }

        .section-heading {
          max-width: 650px;
          margin: 0 auto 52px;
          text-align: center;
        }

        .section-heading .section-tag {
          margin: 0 auto;
        }

        .section-heading h2,
        .market-content h2 {
          margin: 20px 0 18px;
          font-size: clamp(29px, 3.2vw, 43px);
          line-height: 1.6;
          letter-spacing: -1.1px;
        }

        .section-heading p,
        .market-content p {
          color: #8ea0b9;
          font-size: 13px;
          line-height: 2.2;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 17px;
        }

        .feature-card {
          padding: 28px;
          border: 1px solid var(--border);
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 30, 53, 0.8),
              rgba(7, 16, 31, 0.65)
            );
          transition:
            transform 0.25s ease,
            border-color 0.25s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(34, 211, 238, 0.3);
        }

        .feature-icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          color: var(--cyan);
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            rgba(34, 211, 238, 0.15),
            rgba(59, 130, 246, 0.08)
          );
          border: 1px solid rgba(34, 211, 238, 0.12);
        }

        .feature-card h3 {
          margin: 23px 0 11px;
          font-size: 17px;
        }

        .feature-card p {
          min-height: 65px;
          color: #8193ad;
          font-size: 12px;
          line-height: 2.2;
          margin: 0;
        }

        .feature-link {
          display: flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          color: var(--cyan);
          font-size: 11px;
          font-weight: 700;
          margin-top: 20px;
        }

        .market-section {
          padding: 105px 0;
          background:
            radial-gradient(
              circle at 15% 50%,
              rgba(59, 130, 246, 0.1),
              transparent 35%
            ),
            rgba(10, 20, 37, 0.6);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .market-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 80px;
          align-items: center;
        }

        .market-content h2 {
          font-size: clamp(29px, 3.2vw, 43px);
        }

        .market-content p {
          margin: 0 0 27px;
          max-width: 450px;
        }

        .market-list {
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: rgba(7, 16, 31, 0.6);
        }

        .market-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 16px;
          border-bottom: 1px solid var(--border);
        }

        .market-row:last-child {
          border-bottom: 0;
        }

        .market-symbol,
        .market-value {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .market-symbol strong,
        .market-symbol small,
        .market-value strong,
        .market-value span {
          display: block;
        }

        .market-symbol strong {
          font-size: 12px;
          direction: ltr;
          text-align: right;
        }

        .market-symbol small {
          color: #7186a3;
          font-size: 10px;
          margin-top: 5px;
        }

        .symbol-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          font-size: 13px;
          font-weight: 800;
        }

        .symbol-icon.gold {
          color: #fcd34d;
          background: rgba(251, 191, 36, 0.12);
        }

        .symbol-icon.blue {
          color: #93c5fd;
          background: rgba(59, 130, 246, 0.12);
        }

        .symbol-icon.purple {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.12);
        }

        .symbol-icon.green {
          color: #6ee7b7;
          background: rgba(16, 185, 129, 0.12);
        }

        .market-value {
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .market-value strong {
          font-size: 11px;
          color: #cbd5e1;
        }

        .market-value span {
          font-size: 10px;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .step-card {
          position: relative;
          padding: 31px;
          border: 1px solid var(--border);
          border-radius: 21px;
          background: rgba(11, 23, 42, 0.55);
        }

        .step-number {
          color: var(--cyan);
          font-size: 28px;
          font-weight: 900;
          direction: ltr;
        }

        .step-card h3 {
          font-size: 17px;
          margin: 20px 0 12px;
        }

        .step-card p {
          color: #8193ad;
          font-size: 12px;
          line-height: 2.2;
          margin: 0;
        }

        .cta-box {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 65px;
          padding: 28px 32px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 23px;
          background:
            linear-gradient(
              100deg,
              rgba(34, 211, 238, 0.09),
              rgba(59, 130, 246, 0.05)
            );
        }

        .cta-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          color: var(--cyan);
          border-radius: 17px;
          background: rgba(34, 211, 238, 0.1);
          flex-shrink: 0;
        }

        .cta-content {
          flex: 1;
        }

        .cta-content h3 {
          margin: 0 0 7px;
          font-size: 18px;
        }

        .cta-content p {
          color: #8193ad;
          font-size: 12px;
          margin: 0;
        }

        .footer {
          border-top: 1px solid var(--border);
          background: rgba(3, 9, 20, 0.8);
          padding-top: 65px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 45px;
          padding-bottom: 55px;
        }

        .footer-brand p {
          max-width: 310px;
          color: #7186a3;
          font-size: 12px;
          line-height: 2.2;
          margin: 20px 0;
        }

        .footer-security {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 10px;
        }

        .footer-security svg {
          color: var(--green);
        }

        .footer-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 15px;
        }

        .footer-column h3 {
          margin: 0 0 8px;
          font-size: 13px;
          color: #e2e8f0;
        }

        .footer-column a {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #7186a3;
          font-size: 11px;
          transition: color 0.2s ease;
        }

        .footer-column a:hover {
          color: var(--cyan);
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 0;
          border-top: 1px solid var(--border);
          color: #53657e;
          font-size: 10px;
        }

        .footer-bottom-status {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        @media (max-width: 1050px) {
          .desktop-nav {
            gap: 15px;
          }

          .hero-grid {
            gap: 30px;
          }

          .floating-card-top {
            right: -8px;
          }

          .floating-card-bottom {
            left: -8px;
          }

          .market-grid {
            gap: 40px;
          }
        }

        @media (max-width: 850px) {
          .container {
            width: min(100% - 34px, 600px);
          }

          .header-inner {
            min-height: 75px;
          }

          .desktop-nav,
          .login-link {
            display: none;
          }

          .mobile-menu-button {
            display: grid;
          }

          .register-button {
            padding: 10px 13px;
            font-size: 11px;
          }

          .hero {
            padding: 58px 0 60px;
          }

          .hero-grid {
            grid-template-columns: 1fr;
            gap: 60px;
          }

          .hero-content {
            text-align: center;
          }

          .eyebrow {
            margin: 0 auto;
          }

          .hero h1 {
            font-size: clamp(35px, 8vw, 50px);
            letter-spacing: -1px;
          }

          .hero-description {
            margin: 0 auto;
            font-size: 13px;
          }

          .hero-actions,
          .hero-trust {
            justify-content: center;
          }

          .hero-visual {
            min-height: 450px;
          }

          .dashboard-preview {
            transform: none;
          }

          .numbers-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .number-item:nth-child(2) {
            border-left: 0;
          }

          .number-item:nth-child(-n + 2) {
            border-bottom: 1px solid var(--border);
          }

          .section,
          .market-section {
            padding: 75px 0;
          }

          .features-grid,
          .steps-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .market-grid {
            grid-template-columns: 1fr;
          }

          .market-content {
            text-align: center;
          }

          .market-content .section-tag {
            margin: 0 auto;
          }

          .market-content p {
            margin-left: auto;
            margin-right: auto;
          }

          .primary-button {
            margin-left: auto;
            margin-right: auto;
          }

          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 35px;
          }
        }

        @media (max-width: 520px) {
          .container {
            width: calc(100% - 28px);
          }

          .brand-text {
            font-size: 19px;
          }

          .brand-mark {
            width: 37px;
            height: 37px;
          }

          .header-actions {
            gap: 8px;
          }

          .register-button svg {
            display: none;
          }

          .hero h1 {
            font-size: 34px;
            line-height: 1.55;
          }

          .hero-description {
            font-size: 12px;
            line-height: 2.3;
          }

          .hero-actions {
            flex-direction: column;
            width: 100%;
          }

          .hero-actions a {
            width: 100%;
          }

          .hero-trust {
            gap: 10px;
          }

          .trust-item {
            font-size: 9px;
          }

          .hero-visual {
            min-height: 380px;
          }

          .dashboard-preview {
            padding: 12px;
            border-radius: 19px;
          }

          .preview-stat {
            padding: 10px;
          }

          .preview-stat strong {
            font-size: 17px;
          }

          .market-chart {
            height: 130px;
          }

          .floating-card {
            padding: 9px;
            gap: 7px;
          }

          .floating-card-top {
            top: 5px;
            right: -4px;
          }

          .floating-card-bottom {
            bottom: 10px;
            left: -4px;
          }

          .floating-card strong {
            font-size: 8px;
          }

          .floating-card small {
            font-size: 7px;
          }

          .floating-check {
            display: none;
          }

          .orbit-one {
            width: 350px;
            height: 350px;
          }

          .orbit-two {
            width: 280px;
            height: 280px;
          }

          .number-item {
            padding: 23px 8px;
          }

          .number-item strong {
            font-size: 20px;
          }

          .number-item span {
            font-size: 9px;
          }

          .section-heading {
            margin-bottom: 32px;
          }

          .section-heading h2,
          .market-content h2 {
            font-size: 27px;
            line-height: 1.7;
          }

          .section-heading p,
          .market-content p {
            font-size: 11px;
          }

          .features-grid,
          .steps-grid {
            grid-template-columns: 1fr;
          }

          .feature-card {
            padding: 23px;
          }

          .feature-card p {
            min-height: auto;
          }

          .market-row {
            padding: 16px 8px;
          }

          .market-symbol strong {
            font-size: 10px;
          }

          .market-value strong {
            font-size: 9px;
          }

          .cta-box {
            flex-direction: column;
            text-align: center;
            padding: 27px 18px;
          }

          .cta-content p {
            line-height: 2;
          }

          .cta-box .primary-button {
            width: 100%;
          }

          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 35px 20px;
          }

          .footer-brand {
            grid-column: 1 / -1;
          }

          .footer-column h3 {
            font-size: 12px;
          }

          .footer-column a {
            font-size: 10px;
          }

          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            line-height: 1.8;
          }
        }
      `}</style>
    </main>
  );
}
