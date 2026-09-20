"use client";

import { useState } from "react";
import Link from "next/link";

type IconName =
  | "arrow"
  | "chart"
  | "shield"
  | "brain"
  | "menu"
  | "close"
  | "check"
  | "lock"
  | "user"
  | "mail"
  | "eye"
  | "eyeOff"
  | "sparkles"
  | "bot"
  | "globe"
  | "zap";

function Icon({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-5 3 3 5-7" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 7v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V7z" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    );
  }

  if (name === "brain") {
    return (
      <svg {...common}>
        <path d="M9 4a3 3 0 0 0-5 2 3 3 0 0 0 0 5 3 3 0 0 0 2 5 3 3 0 0 0 5 3V5a3 3 0 0 0-2-1Z" />
        <path d="M15 4a3 3 0 0 1 5 2 3 3 0 0 1 0 5 3 3 0 0 1-2 5 3 3 0 0 1-5 3V5a3 3 0 0 1 2-1Z" />
        <path d="M4 11h5M15 11h5M8 7v3M16 7v3M8 16v-2M16 16v-2" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg {...common}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "eyeOff") {
    return (
      <svg {...common}>
        <path d="m3 3 18 18" />
        <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.1 3.9" />
        <path d="M6.7 6.7C3.7 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4-.9" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg {...common}>
        <path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5z" />
        <path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7z" />
      </svg>
    );
  }

  if (name === "bot") {
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4M8 13h.01M16 13h.01M8 17h8" />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m13 2-9 12h7l-1 8 9-12h-7z" />
    </svg>
  );
}

export default function HomePage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <>
      <main dir="rtl" className="site">
        <header className="header">
          <div className="container headerInner">
            <Link href="/" className="brand">
              <span className="brandIcon">
                <Icon name="brain" size={26} />
              </span>

              <span className="brandText">
                <strong>Trading AI</strong>
                <small>هوش مصنوعی بازار</small>
              </span>
            </Link>

            <nav className={`navigation ${mobileMenu ? "open" : ""}`}>
              <Link href="#features" onClick={() => setMobileMenu(false)}>
                امکانات
              </Link>

              <Link href="#advantages" onClick={() => setMobileMenu(false)}>
                مزایا
              </Link>

              <Link href="#security" onClick={() => setMobileMenu(false)}>
                امنیت
              </Link>

              <Link href="#about" onClick={() => setMobileMenu(false)}>
                درباره ما
              </Link>

              <div className="mobileActions">
                <button
                  className="mobileLogin"
                  onClick={() => {
                    setAuthModal("login");
                    setMobileMenu(false);
                  }}
                >
                  ورود به حساب
                </button>

                <button
                  className="mobileRegister"
                  onClick={() => {
                    setAuthModal("register");
                    setMobileMenu(false);
                  }}
                >
                  ثبت‌نام رایگان
                </button>
              </div>
            </nav>

            <div className="headerActions">
              <button
                className="loginButton"
                onClick={() => setAuthModal("login")}
              >
                ورود
              </button>

              <button
                className="registerButton"
                onClick={() => setAuthModal("register")}
              >
                ثبت‌نام رایگان
                <Icon name="arrow" size={17} />
              </button>
            </div>

            <button
              className="menuButton"
              aria-label="باز کردن منو"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Icon name={mobileMenu ? "close" : "menu"} size={25} />
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="heroGlow glowOne" />
          <div className="heroGlow glowTwo" />

          <div className="container heroGrid">
            <div className="heroContent">
              <div className="eyebrow">
                <span className="eyebrowDot" />
                <Icon name="sparkles" size={17} />
                پلتفرم هوشمند تحلیل بازار
              </div>

              <h1>
                تصمیم‌های بهتر
                <br />
                <span>با هوش مصنوعی</span>
              </h1>

              <p className="heroDescription">
                بازارهای مالی را هوشمندتر بررسی کن. با Trading AI به ابزارهای
                تحلیل، مدیریت ریسک، سیگنال‌ها و ربات‌های معاملاتی دسترسی داشته
                باش.
              </p>

              <div className="heroButtons">
                <button
                  className="primaryButton"
                  onClick={() => setAuthModal("register")}
                >
                  شروع رایگان با Trading AI
                  <Icon name="arrow" size={19} />
                </button>

                <Link href="#features" className="secondaryButton">
                  مشاهده امکانات
                  <Icon name="arrow" size={18} />
                </Link>
              </div>

              <div className="heroTrust">
                <div className="trustItem">
                  <Icon name="shield" size={19} />
                  امنیت حساب
                </div>

                <div className="trustItem">
                  <Icon name="check" size={19} />
                  شروع رایگان
                </div>

                <div className="trustItem">
                  <Icon name="globe" size={19} />
                  دسترسی آنلاین
                </div>
              </div>
            </div>

            <div className="heroVisual">
              <div className="visualOrb">
                <div className="orbRing ringOne" />
                <div className="orbRing ringTwo" />

                <div className="orbCore">
                  <Icon name="brain" size={65} />
                  <strong>AI</strong>
                  <span>Market Intelligence</span>
                </div>
              </div>

              <div className="floatingCard cardTop">
                <span className="floatingIcon blue">
                  <Icon name="chart" size={22} />
                </span>

                <div>
                  <strong>تحلیل هوشمند</strong>
                  <small>بررسی ساختار بازار</small>
                </div>

                <span className="statusDot" />
              </div>

              <div className="floatingCard cardBottom">
                <span className="floatingIcon purple">
                  <Icon name="shield" size={22} />
                </span>

                <div>
                  <strong>مدیریت ریسک</strong>
                  <small>کنترل بهتر معاملات</small>
                </div>

                <span className="statusDot" />
              </div>
            </div>
          </div>
        </section>

        <section className="statsSection">
          <div className="container statsGrid">
            <div className="statCard">
              <span className="statIcon">
                <Icon name="brain" size={25} />
              </span>
              <strong>AI</strong>
              <p>تحلیل هوشمند بازار</p>
            </div>

            <div className="statCard">
              <span className="statIcon">
                <Icon name="globe" size={25} />
              </span>
              <strong>24/7</strong>
              <p>دسترسی آنلاین به پلتفرم</p>
            </div>

            <div className="statCard">
              <span className="statIcon">
                <Icon name="shield" size={25} />
              </span>
              <strong>Secure</strong>
              <p>مدیریت امن حساب کاربری</p>
            </div>

            <div className="statCard">
              <span className="statIcon">
                <Icon name="zap" size={25} />
              </span>
              <strong>Smart</strong>
              <p>ابزارهای کاربردی معاملاتی</p>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <div className="container">
            <div className="sectionHeading">
              <span className="sectionTag">امکانات پلتفرم</span>
              <h2>
                همه ابزارها در یک
                <span> محیط هوشمند</span>
              </h2>
              <p>
                امکانات کاربردی برای بررسی بازار، تحلیل اطلاعات و مدیریت
                بهتر فعالیت‌های معاملاتی.
              </p>
            </div>

            <div className="featuresGrid">
              <article className="featureCard">
                <div className="featureIcon blue">
                  <Icon name="brain" size={29} />
                </div>

                <h3>تحلیل هوشمند بازار</h3>

                <p>
                  بررسی اطلاعات بازار و ساختار قیمت با ابزارهای تحلیلی
                  هوشمند.
                </p>

                <Link href="/ai-analysis" className="featureLink">
                  مشاهده تحلیل
                  <Icon name="arrow" size={17} />
                </Link>
              </article>

              <article className="featureCard">
                <div className="featureIcon purple">
                  <Icon name="chart" size={29} />
                </div>

                <h3>مدیریت معاملات</h3>

                <p>
                  مشاهده و مدیریت اطلاعات معاملات در یک محیط منظم و قابل
                  پیگیری.
                </p>

                <Link href="/market" className="featureLink">
                  بررسی بازار
                  <Icon name="arrow" size={17} />
                </Link>
              </article>

              <article className="featureCard">
                <div className="featureIcon green">
                  <Icon name="shield" size={29} />
                </div>

                <h3>مدیریت ریسک</h3>

                <p>
                  تنظیمات مربوط به کنترل ریسک و بررسی شرایط پیش از انجام
                  معامله.
                </p>

                <Link href="/bots" className="featureLink">
                  مشاهده ربات‌ها
                  <Icon name="arrow" size={17} />
                </Link>
              </article>

              <article className="featureCard">
                <div className="featureIcon orange">
                  <Icon name="bot" size={29} />
                </div>

                <h3>ربات‌های معاملاتی</h3>

                <p>
                  ایجاد و مدیریت تنظیمات ربات‌ها بر اساس امکانات فعال حساب
                  کاربری.
                </p>

                <Link href="/bots" className="featureLink">
                  مدیریت ربات‌ها
                  <Icon name="arrow" size={17} />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section id="advantages" className="section advantagesSection">
          <div className="container advantagesGrid">
            <div className="advantagesContent">
              <span className="sectionTag">چرا Trading AI؟</span>

              <h2>
                طراحی شده برای
                <br />
                <span>تصمیم‌گیری آگاهانه</span>
              </h2>

              <p>
                Trading AI محیطی یکپارچه برای استفاده از ابزارهای تحلیلی و
                مدیریت فعالیت‌های معاملاتی فراهم می‌کند.
              </p>

              <ul className="advantagesList">
                <li>
                  <span>
                    <Icon name="check" size={18} />
                  </span>
                  رابط کاربری ساده و منظم
                </li>

                <li>
                  <span>
                    <Icon name="check" size={18} />
                  </span>
                  سازگار با موبایل و دسکتاپ
                </li>

                <li>
                  <span>
                    <Icon name="check" size={18} />
                  </span>
                  دسترسی به بخش‌های مختلف پلتفرم
                </li>

                <li>
                  <span>
                    <Icon name="check" size={18} />
                  </span>
                  امکان توسعه و اتصال سرویس‌های معاملاتی
                </li>
              </ul>

              <button
                className="primaryButton"
                onClick={() => setAuthModal("register")}
              >
                ساخت حساب کاربری
                <Icon name="arrow" size={18} />
              </button>
            </div>

            <div className="advantagesPanel">
              <div className="panelHeader">
                <div>
                  <span>Trading AI</span>
                  <strong>مرکز کنترل هوشمند</strong>
                </div>

                <div className="panelLogo">
                  <Icon name="brain" size={25} />
                </div>
              </div>

              <div className="panelLine">
                <span>تحلیل بازار</span>
                <strong className="greenText">فعال</strong>
              </div>

              <div className="progress">
                <span style={{ width: "82%" }} />
              </div>

              <div className="panelLine">
                <span>مدیریت ریسک</span>
                <strong className="greenText">قابل استفاده</strong>
              </div>

              <div className="progress">
                <span style={{ width: "72%" }} />
              </div>

              <div className="panelLine">
                <span>ابزارهای معاملاتی</span>
                <strong className="blueText">آماده تنظیم</strong>
              </div>

              <div className="progress">
                <span style={{ width: "64%" }} />
              </div>

              <div className="panelFooter">
                <Icon name="shield" size={18} />
                وضعیت رابط کاربری
                <span>آماده</span>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="securitySection">
          <div className="container securityContent">
            <div className="securityIcon">
              <Icon name="shield" size={35} />
            </div>

            <div>
              <span className="sectionTag">امنیت و حریم خصوصی</span>

              <h2>حساب خود را با دقت مدیریت کن</h2>

              <p>
                برای ورود و ثبت‌نام از صفحات اختصاصی احراز هویت استفاده کن.
                اطلاعات حساب باید از طریق منطق احراز هویت سمت سرور مدیریت شود.
              </p>
            </div>

            <button
              className="secondaryButton"
              onClick={() => setAuthModal("login")}
            >
              ورود امن
              <Icon name="lock" size={18} />
            </button>
          </div>
        </section>

        <section id="about" className="ctaSection">
          <div className="container ctaBox">
            <div>
              <span className="sectionTag">شروع کار</span>

              <h2>آماده‌ای هوشمندتر شروع کنی؟</h2>

              <p>
                حساب خود را ایجاد کن و امکانات موجود پلتفرم را بررسی کن.
              </p>
            </div>

            <button
              className="primaryButton"
              onClick={() => setAuthModal("register")}
            >
              ثبت‌نام رایگان
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </section>

        <footer className="footer">
          <div className="container footerGrid">
            <div className="footerBrand">
              <Link href="/" className="brand">
                <span className="brandIcon">
                  <Icon name="brain" size={24} />
                </span>

                <span className="brandText">
                  <strong>Trading AI</strong>
                  <small>هوش مصنوعی بازار</small>
                </span>
              </Link>

              <p>
                پلتفرم هوشمند برای تحلیل بازار و مدیریت ابزارهای معاملاتی.
              </p>
            </div>

            <div className="footerColumn">
              <h3>دسترسی سریع</h3>
              <Link href="/dashboard">داشبورد</Link>
              <Link href="/market">بازار</Link>
              <Link href="/ai-analysis">تحلیل هوشمند</Link>
              <Link href="/bots">ربات‌ها</Link>
            </div>

            <div className="footerColumn">
              <h3>حساب کاربری</h3>
              <button onClick={() => setAuthModal("login")}>ورود</button>
              <button onClick={() => setAuthModal("register")}>
                ثبت‌نام
              </button>
              <Link href="/settings">تنظیمات</Link>
              <Link href="/support">پشتیبانی</Link>
            </div>
          </div>

          <div className="container footerBottom">
            <span>© {new Date().getFullYear()} Trading AI</span>
            <span>تمام حقوق محفوظ است.</span>
          </div>
        </footer>
      </main>

      {authModal && (
        <div
          className="modalOverlay"
          onClick={() => setAuthModal(null)}
          role="presentation"
        >
          <div
            className="authModal"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <button
              className="modalClose"
              aria-label="بستن"
              onClick={() => setAuthModal(null)}
            >
              <Icon name="close" size={21} />
            </button>

            <div className="authLogo">
              <Icon name="brain" size={30} />
            </div>

            <h2>
              {authModal === "login" ? "خوش آمدید" : "ایجاد حساب جدید"}
            </h2>

            <p className="authDescription">
              {authModal === "login"
                ? "برای ورود، اطلاعات حساب خود را وارد کنید."
                : "برای شروع کار با Trading AI حساب خود را ایجاد کنید."}
            </p>

            <form
              className="authForm"
              action={authModal === "login" ? "/api/auth/login" : "/api/auth/register"}
              method="POST"
            >
              {authModal === "register" && (
                <label>
                  نام کاربری
                  <div className="inputWrapper">
                    <Icon name="user" size={19} />
                    <input
                      type="text"
                      name="name"
                      placeholder="نام خود را وارد کنید"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>
              )}

              <label>
                ایمیل
                <div className="inputWrapper">
                  <Icon name="mail" size={19} />
                  <input
                    type="email"
                    name="email"
                    placeholder="example@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label>
                رمز عبور
                <div className="inputWrapper">
                  <Icon name="lock" size={19} />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="رمز عبور خود را وارد کنید"
                    autoComplete={
                      authModal === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    className="passwordToggle"
                    aria-label="نمایش رمز عبور"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? "eyeOff" : "eye"}
                      size={19}
                    />
                  </button>
                </div>
              </label>

              {authModal === "login" && (
                <div className="formOptions">
                  <label className="rememberOption">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(event.target.checked)
                      }
                    />
                    <span>مرا به خاطر بسپار</span>
                  </label>

                  <Link href="/forgot-password">فراموشی رمز عبور</Link>
                </div>
              )}

              <button type="submit" className="authSubmit">
                {authModal === "login" ? "ورود به حساب" : "ایجاد حساب"}
                <Icon name="arrow" size={18} />
              </button>
            </form>

            <div className="authSwitch">
              {authModal === "login" ? (
                <>
                  حساب کاربری ندارید؟
                  <button onClick={() => setAuthModal("register")}>
                    ثبت‌نام کنید
                  </button>
                </>
              ) : (
                <>
                  قبلاً حساب ساخته‌اید؟
                  <button onClick={() => setAuthModal("login")}>
                    وارد شوید
                  </button>
                </>
              )}
            </div>

            <p className="authNote">
              با ادامه کار، مسئولیت اطلاعات واردشده بر عهده کاربر است.
            </p>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #060d1d;
          color: #f8fafc;
          font-family: Tahoma, Arial, sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        button {
          cursor: pointer;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .site {
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 80% 5%,
              rgba(25, 104, 204, 0.17),
              transparent 30%
            ),
            #060d1d;
        }

        .container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(6, 13, 29, 0.88);
          backdrop-filter: blur(20px);
        }

        .headerInner {
          min-height: 86px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          flex-shrink: 0;
        }

        .brandIcon {
          width: 47px;
          height: 47px;
          display: grid;
          place-items: center;
          color: white;
          border: 1px solid rgba(103, 232, 249, 0.35);
          border-radius: 15px;
          background: linear-gradient(135deg, #13c9df, #3569f1);
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);
        }

        .brandText {
          display: flex;
          flex-direction: column;
          gap: 3px;
          direction: ltr;
        }

        .brandText strong {
          font-size: 21px;
          letter-spacing: -0.7px;
        }

        .brandText small {
          color: #94a3b8;
          font-size: 10px;
          direction: rtl;
        }

        .navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          color: #aebbd0;
          font-size: 13px;
        }

        .navigation a {
          transition: color 0.2s ease;
        }

        .navigation a:hover {
          color: #67e8f9;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .loginButton,
        .registerButton,
        .mobileLogin,
        .mobileRegister {
          border: 0;
          border-radius: 11px;
          padding: 12px 17px;
          font-size: 12px;
          font-weight: bold;
          transition: 0.2s ease;
        }

        .loginButton {
          color: #dbeafe;
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        .registerButton {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #03111e;
          background: #22d3ee;
        }

        .loginButton:hover {
          background: rgba(148, 163, 184, 0.1);
        }

        .registerButton:hover,
        .primaryButton:hover {
          transform: translateY(-2px);
          background: #67e8f9;
        }

        .menuButton {
          display: none;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 10px;
          color: white;
          background: rgba(15, 23, 42, 0.9);
          padding: 10px;
        }

        .mobileActions {
          display: none;
        }

        .hero {
          position: relative;
          padding: 105px 0 90px;
          isolation: isolate;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          gap: 70px;
        }

        .heroGlow {
          position: absolute;
          z-index: -1;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }

        .glowOne {
          width: 420px;
          height: 420px;
          top: -120px;
          right: -100px;
          background: rgba(14, 165, 233, 0.14);
        }

        .glowTwo {
          width: 350px;
          height: 350px;
          bottom: -120px;
          left: 5%;
          background: rgba(124, 58, 237, 0.12);
        }

        .heroContent {
          text-align: right;
        }

        .eyebrow,
        .sectionTag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #67e8f9;
          font-size: 12px;
          font-weight: bold;
        }

        .eyebrow {
          padding: 10px 15px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.07);
        }

        .eyebrowDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 12px #22d3ee;
        }

        .hero h1 {
          margin: 25px 0 20px;
          color: #f8fafc;
          font-size: clamp(37px, 5vw, 65px);
          font-weight: 900;
          line-height: 1.45;
          letter-spacing: -2px;
        }

        .hero h1 span,
        .sectionHeading h2 span,
        .advantagesContent h2 span {
          color: #22d3ee;
        }

        .heroDescription {
          max-width: 580px;
          margin: 0;
          color: #94a3b8;
          font-size: 15px;
          line-height: 2.4;
        }

        .heroButtons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 32px;
        }

        .primaryButton,
        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 53px;
          padding: 0 22px;
          border-radius: 13px;
          font-size: 13px;
          font-weight: bold;
          transition: 0.2s ease;
        }

        .primaryButton {
          border: 1px solid #22d3ee;
          color: #04111f;
          background: #22d3ee;
        }

        .secondaryButton {
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #dbeafe;
          background: rgba(15, 23, 42, 0.55);
        }

        .secondaryButton:hover {
          border-color: #22d3ee;
          color: #67e8f9;
        }

        .heroTrust {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 30px;
          color: #94a3b8;
          font-size: 11px;
        }

        .trustItem {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .trustItem svg {
          color: #22d3ee;
        }

        .heroVisual {
          position: relative;
          min-height: 440px;
          display: grid;
          place-items: center;
        }

        .visualOrb {
          position: relative;
          width: 340px;
          height: 340px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(34, 211, 238, 0.13),
              rgba(37, 99, 235, 0.04) 55%,
              transparent 70%
            );
        }

        .orbRing {
          position: absolute;
          border: 1px solid rgba(34, 211, 238, 0.23);
          border-radius: 50%;
        }

        .ringOne {
          inset: 15px;
          transform: rotate(35deg) scaleY(0.48);
        }

        .ringTwo {
          inset: 15px;
          transform: rotate(-35deg) scaleY(0.48);
        }

        .orbCore {
          position: relative;
          z-index: 2;
          width: 190px;
          height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(103, 232, 249, 0.35);
          border-radius: 50%;
          color: #67e8f9;
          background: radial-gradient(
            circle at 35% 20%,
            #163d67,
            #0a162b 70%
          );
          box-shadow:
            0 0 80px rgba(34, 211, 238, 0.13),
            inset 0 0 50px rgba(59, 130, 246, 0.12);
        }

        .orbCore strong {
          color: white;
          font-size: 29px;
          direction: ltr;
        }

        .orbCore span {
          color: #94a3b8;
          font-size: 9px;
          direction: ltr;
        }

        .floatingCard {
          position: absolute;
          z-index: 5;
          width: 235px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 14px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          background: rgba(13, 27, 49, 0.9);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(18px);
        }

        .cardTop {
          top: 35px;
          right: -10px;
        }

        .cardBottom {
          bottom: 35px;
          left: -10px;
        }

        .floatingIcon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 12px;
        }

        .floatingIcon.blue,
        .featureIcon.blue {
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.13);
        }

        .floatingIcon.purple,
        .featureIcon.purple {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.14);
        }

        .floatingCard div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
        }

        .floatingCard strong {
          color: #f8fafc;
          font-size: 11px;
        }

        .floatingCard small {
          color: #94a3b8;
          font-size: 9px;
        }

        .statusDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.7);
        }

        .statsSection {
          padding: 0 0 90px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .statCard {
          padding: 25px 20px;
          text-align: center;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 20px;
          background: linear-gradient(
            145deg,
            rgba(15, 30, 53, 0.8),
            rgba(10, 20, 37, 0.55)
          );
        }

        .statIcon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin: 0 auto 15px;
          color: #67e8f9;
          border-radius: 14px;
          background: rgba(34, 211, 238, 0.09);
        }

        .statCard strong {
          display: block;
          color: #f8fafc;
          font-size: 28px;
          direction: ltr;
        }

        .statCard p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 11px;
        }

        .section {
          padding: 95px 0;
        }

        .sectionHeading {
          max-width: 620px;
          margin: 0 auto 45px;
          text-align: center;
        }

        .sectionHeading h2 {
          margin: 18px 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.7;
        }

        .sectionHeading p {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 2.3;
        }

        .featuresGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 17px;
        }

        .featureCard {
          padding: 27px 23px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 21px;
          background: linear-gradient(
            145deg,
            rgba(15, 30, 53, 0.82),
            rgba(8, 18, 34, 0.65)
          );
          transition: 0.25s ease;
        }

        .featureCard:hover {
          transform: translateY(-5px);
          border-color: rgba(34, 211, 238, 0.4);
        }

        .featureIcon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin-bottom: 23px;
          border-radius: 17px;
        }

        .featureIcon.green {
          color: #86efac;
          background: rgba(34, 197, 94, 0.12);
        }

        .featureIcon.orange {
          color: #fdba74;
          background: rgba(249, 115, 22, 0.12);
        }

        .featureCard h3 {
          margin: 0 0 13px;
          color: #f8fafc;
          font-size: 15px;
        }

        .featureCard p {
          min-height: 78px;
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 2.2;
        }

        .featureLink {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 24px;
          color: #67e8f9;
          font-size: 11px;
          font-weight: bold;
        }

        .advantagesSection {
          background: rgba(10, 21, 39, 0.5);
          border-top: 1px solid rgba(148, 163, 184, 0.08);
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .advantagesGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 85px;
        }

        .advantagesContent h2 {
          margin: 20px 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.65;
        }

        .advantagesContent > p {
          max-width: 500px;
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 2.4;
        }

        .advantagesList {
          display: grid;
          gap: 17px;
          padding: 0;
          margin: 28px 0 32px;
          list-style: none;
        }

        .advantagesList li {
          display: flex;
          align-items: center;
          gap: 11px;
          color: #cbd5e1;
          font-size: 12px;
        }

        .advantagesList li span {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          color: #4ade80;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.12);
        }

        .advantagesPanel {
          padding: 30px;
          border: 1px solid rgba(103, 232, 249, 0.18);
          border-radius: 25px;
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(37, 99, 235, 0.17),
              transparent 45%
            ),
            #0b172b;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
        }

        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 25px;
          margin-bottom: 25px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.13);
        }

        .panelHeader div:first-child {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .panelHeader span {
          color: #64748b;
          font-size: 10px;
          direction: ltr;
        }

        .panelHeader strong {
          color: white;
          font-size: 16px;
        }

        .panelLogo {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          color: #67e8f9;
          border-radius: 15px;
          background: rgba(34, 211, 238, 0.1);
        }

        .panelLine {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 22px;
          color: #cbd5e1;
          font-size: 12px;
        }

        .greenText {
          color: #4ade80;
          font-size: 10px;
        }

        .blueText {
          color: #67e8f9;
          font-size: 10px;
        }

        .progress {
          height: 7px;
          margin-top: 11px;
          overflow: hidden;
          border-radius: 20px;
          background: #1e293b;
        }

        .progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0891b2, #22d3ee);
        }

        .panelFooter {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 25px;
          margin-top: 30px;
          border-top: 1px solid rgba(148, 163, 184, 0.13);
          color: #94a3b8;
          font-size: 10px;
        }

        .panelFooter svg {
          color: #4ade80;
        }

        .panelFooter span {
          margin-right: auto;
          color: #4ade80;
        }

        .securitySection {
          padding: 60px 0;
        }

        .securityContent {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 25px;
          padding: 35px;
          border: 1px solid rgba(34, 211, 238, 0.18);
          border-radius: 24px;
          background: rgba(13, 29, 49, 0.7);
        }

        .securityIcon {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          color: #67e8f9;
          border-radius: 20px;
          background: rgba(34, 211, 238, 0.1);
        }

        .securityContent h2 {
          margin: 10px 0;
          font-size: 23px;
        }

        .securityContent p {
          max-width: 650px;
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 2.2;
        }

        .ctaSection {
          padding: 65px 0 100px;
        }

        .ctaBox {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 45px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 27px;
          background:
            radial-gradient(
              circle at 10% 20%,
              rgba(37, 99, 235, 0.18),
              transparent 45%
            ),
            #0b172b;
        }

        .ctaBox h2 {
          margin: 15px 0;
          font-size: clamp(25px, 4vw, 36px);
        }

        .ctaBox p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .footer {
          padding: 60px 0 25px;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
          background: #040a16;
        }

        .footerGrid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 60px;
        }

        .footerBrand p {
          max-width: 320px;
          margin-top: 22px;
          color: #64748b;
          font-size: 11px;
          line-height: 2.2;
        }

        .footerColumn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 15px;
        }

        .footerColumn h3 {
          margin: 0 0 8px;
          color: #f8fafc;
          font-size: 13px;
        }

        .footerColumn a,
        .footerColumn button {
          padding: 0;
          border: 0;
          color: #64748b;
          background: transparent;
          font-size: 11px;
        }

        .footerColumn a:hover,
        .footerColumn button:hover {
          color: #67e8f9;
        }

        .footerBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 25px;
          margin-top: 50px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          color: #475569;
          font-size: 10px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(14px);
        }

        .authModal {
          position: relative;
          width: min(100%, 440px);
          max-height: 95vh;
          overflow-y: auto;
          padding: 35px;
          border: 1px solid rgba(103, 232, 249, 0.25);
          border-radius: 25px;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(37, 99, 235, 0.18),
              transparent 40%
            ),
            #0b172b;
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
        }

        .modalClose {
          position: absolute;
          top: 17px;
          left: 17px;
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          background: transparent;
        }

        .modalClose:hover {
          color: white;
          border-color: #22d3ee;
        }

        .authLogo {
          width: 65px;
          height: 65px;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          color: #67e8f9;
          border: 1px solid rgba(34, 211, 238, 0.3);
          border-radius: 20px;
          background: rgba(34, 211, 238, 0.1);
        }

        .authModal h2 {
          margin: 0;
          text-align: center;
          color: white;
          font-size: 25px;
        }

        .authDescription {
          margin: 13px 0 28px;
          color: #94a3b8;
          text-align: center;
          font-size: 11px;
          line-height: 2;
        }

        .authForm {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .authForm label {
          display: flex;
          flex-direction: column;
          gap: 9px;
          color: #cbd5e1;
          font-size: 11px;
          font-weight: bold;
        }

        .inputWrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 49px;
          padding: 0 13px;
          border: 1px solid rgba(148, 163, 184, 0.23);
          border-radius: 12px;
          color: #64748b;
          background: rgba(2, 6, 23, 0.4);
          transition: border-color 0.2s ease;
        }

        .inputWrapper:focus-within {
          border-color: #22d3ee;
        }

        .inputWrapper input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: #f8fafc;
          background: transparent;
          font-size: 12px;
        }

        .inputWrapper input::placeholder {
          color: #475569;
        }

        .passwordToggle {
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          color: #64748b;
          background: transparent;
        }

        .formOptions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
        }

        .rememberOption {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 7px !important;
          color: #94a3b8 !important;
          font-weight: normal !important;
        }

        .rememberOption input {
          accent-color: #22d3ee;
        }

        .formOptions a {
          color: #67e8f9;
        }

        .authSubmit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 52px;
          margin-top: 5px;
          border: 1px solid #22d3ee;
          border-radius: 12px;
          color: #04111f;
          background: #22d3ee;
          font-size: 12px;
          font-weight: bold;
          transition: 0.2s ease;
        }

        .authSubmit:hover {
          background: #67e8f9;
        }

        .authSwitch {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 25px;
          color: #94a3b8;
          font-size: 11px;
        }

        .authSwitch button {
          padding: 0;
          border: 0;
          color: #67e8f9;
          background: transparent;
          font-size: 11px;
          font-weight: bold;
        }

        .authNote {
          margin: 23px 0 0;
          color: #475569;
          text-align: center;
          font-size: 9px;
          line-height: 2;
        }

        @media (max-width: 1050px) {
          .navigation {
            gap: 15px;
          }

          .heroGrid {
            gap: 30px;
          }

          .featuresGrid,
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 820px) {
          .headerInner {
            min-height: 74px;
          }

          .headerActions {
            display: none;
          }

          .menuButton {
            display: grid;
          }

          .navigation {
            position: absolute;
            top: calc(100% + 1px);
            right: 20px;
            left: 20px;
            display: none;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            padding: 15px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 17px;
            background: #0b172b;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          }

          .navigation.open {
            display: flex;
          }

          .navigation > a {
            padding: 15px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          }

          .mobileActions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
          }

          .mobileLogin,
          .mobileRegister {
            flex: 1;
          }

          .mobileLogin {
            color: white;
            border: 1px solid rgba(148, 163, 184, 0.3);
            background: transparent;
          }

          .mobileRegister {
            color: #04111f;
            background: #22d3ee;
          }

          .hero {
            padding: 70px 0;
          }

          .heroGrid,
          .advantagesGrid {
            grid-template-columns: 1fr;
          }

          .heroContent {
            text-align: center;
          }

          .heroDescription {
            margin: auto;
          }

          .heroButtons,
          .heroTrust {
            justify-content: center;
          }

          .heroVisual {
            min-height: 390px;
          }

          .advantagesContent {
            text-align: center;
          }

          .advantagesContent > p {
            margin: auto;
          }

          .advantagesList {
            width: fit-content;
            margin-right: auto;
            margin-left: auto;
            text-align: right;
          }

          .advantagesContent .primaryButton {
            margin: auto;
          }

          .securityContent {
            grid-template-columns: auto 1fr;
          }

          .securityContent .secondaryButton {
            grid-column: 1 / -1;
          }

          .ctaBox {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 560px) {
          .container {
            width: min(100% - 28px, 1180px);
          }

          .brandIcon {
            width: 41px;
            height: 41px;
          }

          .brandText strong {
            font-size: 18px;
          }

          .brandText small {
            font-size: 9px;
          }

          .hero h1 {
            font-size: 37px;
            letter-spacing: -1px;
          }

          .heroDescription {
            font-size: 12px;
          }

          .heroButtons {
            flex-direction: column;
          }

          .heroButtons a,
          .heroButtons button {
            width: 100%;
          }

          .heroVisual {
            min-height: 350px;
            transform: scale(0.86);
          }

          .cardTop {
            right: -20px;
          }

          .cardBottom {
            left: -20px;
          }

          .statsGrid,
          .featuresGrid {
            grid-template-columns: 1fr;
          }

          .section {
            padding: 65px 0;
          }

          .sectionHeading h2,
          .advantagesContent h2 {
            font-size: 29px;
          }

          .featureCard p {
            min-height: auto;
          }

          .securityContent {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 25px;
          }

          .ctaBox {
            padding: 28px;
          }

          .ctaBox h2 {
            font-size: 25px;
          }

          .ctaBox .primaryButton {
            width: 100%;
          }

          .footerGrid {
            grid-template-columns: 1fr 1fr;
            gap: 35px;
          }

          .footerBrand {
            grid-column: 1 / -1;
          }

          .footerBottom {
            flex-direction: column;
            align-items: flex-start;
          }

          .authModal {
            padding: 28px 20px;
          }
        }
      `}</style>
    </>
  );
}
