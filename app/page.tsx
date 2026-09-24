import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #050505;
          color: #fff;
          font-family:
            Arial,
            Tahoma,
            "Segoe UI",
            sans-serif;
        }

        body {
          overflow-x: hidden;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .ta-page {
          min-height: 100vh;
          direction: rtl;
          background:
            radial-gradient(circle at 85% 5%, rgba(202,160,69,.13), transparent 28%),
            radial-gradient(circle at 10% 80%, rgba(122,82,20,.09), transparent 30%),
            #050505;
          position: relative;
          overflow: hidden;
        }

        .ta-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .035;
          background-image:
            linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: linear-gradient(to bottom, black, transparent 80%);
        }

        .ta-container {
          width: min(1180px, calc(100% - 36px));
          margin: 0 auto;
        }

        /* HEADER */

        .ta-header {
          position: relative;
          z-index: 10;
          height: 82px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(5,5,5,.78);
          backdrop-filter: blur(20px);
        }

        .ta-header-inner {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .ta-brand {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-shrink: 0;
        }

        .ta-logo {
          width: 49px;
          height: 49px;
          border-radius: 16px;
          border: 1px solid rgba(226,185,91,.42);
          background:
            linear-gradient(145deg, #27200f, #0d0d0d 60%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            inset 0 0 20px rgba(228,185,91,.06),
            0 0 35px rgba(216,173,82,.08);
          position: relative;
        }

        .ta-logo::after {
          content: "";
          position: absolute;
          inset: 5px;
          border: 1px solid rgba(228,185,91,.12);
          border-radius: 12px;
        }

        .ta-logo svg {
          position: relative;
          z-index: 2;
        }

        .ta-brand-title {
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .ta-brand-title span {
          color: #e3b95d;
        }

        .ta-brand-sub {
          margin-top: 6px;
          font-size: 8px;
          letter-spacing: 3px;
          color: rgba(255,255,255,.32);
          direction: ltr;
        }

        .ta-nav {
          display: flex;
          align-items: center;
          gap: 34px;
          margin-right: auto;
          margin-left: auto;
        }

        .ta-nav a {
          font-size: 13px;
          color: rgba(255,255,255,.53);
          transition: .2s;
        }

        .ta-nav a:hover {
          color: #e4bb61;
        }

        .ta-header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .ta-login-link {
          padding: 11px 17px;
          color: rgba(255,255,255,.72);
          font-size: 13px;
          font-weight: 700;
        }

        .ta-register-link {
          padding: 12px 19px;
          border-radius: 12px;
          color: #090806;
          font-size: 13px;
          font-weight: 900;
          background: linear-gradient(135deg,#efd17f,#c99a3e,#8f621f);
          box-shadow: 0 8px 28px rgba(206,160,70,.16);
        }

        /* HERO */

        .ta-hero {
          position: relative;
          z-index: 1;
          padding: 85px 0 100px;
        }

        .ta-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(360px, .92fr);
          gap: 70px;
          align-items: center;
        }

        .ta-hero-content {
          text-align: right;
        }

        .ta-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(224,180,80,.2);
          border-radius: 999px;
          padding: 9px 15px;
          background: rgba(218,169,69,.055);
          color: #dcb45c;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 24px;
        }

        .ta-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e2b858;
          box-shadow: 0 0 12px #e2b858;
        }

        .ta-title {
          margin: 0;
          font-size: clamp(38px, 5vw, 68px);
          line-height: 1.17;
          letter-spacing: -2px;
          font-weight: 950;
          color: #fff;
        }

        .ta-title-gold {
          display: block;
          background: linear-gradient(
            100deg,
            #fff2c4 0%,
            #e5b95e 40%,
            #a56e20 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .ta-description {
          max-width: 650px;
          margin: 25px 0 0;
          color: rgba(255,255,255,.48);
          font-size: 16px;
          line-height: 2;
        }

        .ta-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 32px;
        }

        .ta-primary {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          min-height: 54px;
          padding: 0 25px;
          border-radius: 15px;
          color: #090806;
          font-size: 14px;
          font-weight: 900;
          background: linear-gradient(135deg,#efd17f,#c99a3e,#8e5f1e);
          box-shadow: 0 15px 40px rgba(211,166,70,.15);
          transition: .2s;
        }

        .ta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 48px rgba(211,166,70,.25);
        }

        .ta-secondary {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          min-height: 54px;
          padding: 0 25px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.82);
          font-size: 14px;
          font-weight: 800;
          transition: .2s;
        }

        .ta-secondary:hover {
          border-color: rgba(225,181,83,.3);
          background: rgba(225,181,83,.05);
        }

        .ta-mini-stats {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 10px;
          max-width: 600px;
          margin-top: 34px;
        }

        .ta-stat {
          padding: 15px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(255,255,255,.025);
        }

        .ta-stat-number {
          color: #dfb65a;
          font-size: 17px;
          font-weight: 950;
        }

        .ta-stat-label {
          margin-top: 5px;
          color: rgba(255,255,255,.34);
          font-size: 10px;
        }

        /* LOGIN CARD */

        .ta-login-wrap {
          position: relative;
        }

        .ta-login-glow {
          position: absolute;
          inset: -45px;
          border-radius: 60px;
          background: rgba(205,157,60,.065);
          filter: blur(55px);
          pointer-events: none;
        }

        .ta-login-card {
          position: relative;
          border-radius: 29px;
          border: 1px solid rgba(226,183,88,.18);
          background:
            linear-gradient(145deg,rgba(26,23,17,.96),rgba(10,10,10,.98));
          padding: 31px;
          box-shadow:
            0 35px 100px rgba(0,0,0,.6),
            inset 0 1px 0 rgba(255,255,255,.035);
        }

        .ta-login-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 12%;
          right: 12%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            #dcb15a,
            transparent
          );
        }

        .ta-login-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 26px;
        }

        .ta-login-icon {
          width: 56px;
          height: 56px;
          border-radius: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(224,181,88,.22);
          background: rgba(224,181,88,.055);
        }

        .ta-login-title {
          font-size: 21px;
          font-weight: 950;
        }

        .ta-login-title span {
          color: #dfb75c;
        }

        .ta-login-sub {
          margin-top: 5px;
          color: rgba(255,255,255,.34);
          font-size: 11px;
        }

        .ta-field {
          margin-bottom: 17px;
        }

        .ta-field label {
          display: block;
          margin-bottom: 8px;
          color: rgba(255,255,255,.72);
          font-size: 12px;
          font-weight: 800;
        }

        .ta-input {
          width: 100%;
          height: 55px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 15px;
          outline: none;
          background: rgba(255,255,255,.035);
          color: #fff;
          padding: 0 16px;
          font-size: 13px;
          transition: .2s;
        }

        .ta-input::placeholder {
          color: rgba(255,255,255,.22);
        }

        .ta-input:focus {
          border-color: rgba(222,178,82,.5);
          background: rgba(220,175,78,.035);
          box-shadow: 0 0 0 3px rgba(220,175,78,.07);
        }

        .ta-login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 5px 0 20px;
        }

        .ta-remember {
          display: flex;
          align-items: center;
          gap: 7px;
          color: rgba(255,255,255,.45);
          font-size: 11px;
          cursor: pointer;
        }

        .ta-remember input {
          accent-color: #d8ad56;
          width: 15px;
          height: 15px;
        }

        .ta-forgot {
          color: #dcb25b;
          font-size: 11px;
          font-weight: 800;
        }

        .ta-login-button {
          width: 100%;
          height: 55px;
          border: 0;
          border-radius: 15px;
          cursor: pointer;
          color: #090806;
          font-size: 14px;
          font-weight: 950;
          background: linear-gradient(135deg,#efd17f,#c99a3e,#8f621f);
          box-shadow: 0 13px 32px rgba(210,164,67,.14);
        }

        .ta-register-question {
          margin-top: 19px;
          text-align: center;
          color: rgba(255,255,255,.34);
          font-size: 11px;
        }

        .ta-register-question a {
          color: #dfb65b;
          font-weight: 900;
          margin-right: 5px;
        }

        .ta-security {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 23px;
        }

        .ta-security-item {
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 14px;
          background: rgba(255,255,255,.018);
          text-align: center;
          padding: 12px;
          color: rgba(255,255,255,.32);
          font-size: 10px;
        }

        .ta-security-icon {
          margin-bottom: 5px;
          font-size: 16px;
        }

        /* FEATURES */

        .ta-section {
          position: relative;
          border-top: 1px solid rgba(255,255,255,.055);
          padding: 90px 0;
        }

        .ta-section-head {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 45px;
        }

        .ta-section-label {
          color: #dcb35d;
          font-size: 10px;
          letter-spacing: 3px;
          direction: ltr;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .ta-section-title {
          margin: 0;
          font-size: 32px;
          font-weight: 950;
        }

        .ta-section-text {
          margin-top: 14px;
          color: rgba(255,255,255,.38);
          font-size: 13px;
          line-height: 2;
        }

        .ta-features {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 16px;
        }

        .ta-feature {
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 23px;
          background: rgba(255,255,255,.022);
          padding: 27px;
          transition: .25s;
        }

        .ta-feature:hover {
          transform: translateY(-4px);
          border-color: rgba(218,174,80,.2);
          background: rgba(218,174,80,.035);
        }

        .ta-feature-icon {
          width: 47px;
          height: 47px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(219,174,79,.18);
          background: rgba(219,174,79,.055);
          color: #e0b75c;
          font-size: 20px;
          margin-bottom: 19px;
        }

        .ta-feature h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
        }

        .ta-feature p {
          margin: 10px 0 0;
          color: rgba(255,255,255,.36);
          font-size: 12px;
          line-height: 2;
        }

        /* MARKETS */

        .ta-markets {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 14px;
        }

        .ta-market {
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 21px;
          padding: 20px;
          background: rgba(255,255,255,.022);
        }

        .ta-market-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ta-market-icon {
          width: 43px;
          height: 43px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0c0c0c;
          border: 1px solid rgba(255,255,255,.07);
          font-size: 21px;
        }

        .ta-market-name {
          font-size: 13px;
          font-weight: 900;
        }

        .ta-market-symbol {
          margin-top: 4px;
          direction: ltr;
          text-align: right;
          color: rgba(255,255,255,.28);
          font-size: 9px;
        }

        /* FOOTER */

        .ta-footer {
          border-top: 1px solid rgba(255,255,255,.055);
          padding: 27px 0;
        }

        .ta-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .ta-footer-brand {
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .ta-footer-links {
          display: flex;
          gap: 20px;
          color: rgba(255,255,255,.3);
          font-size: 10px;
        }

        .ta-footer-links a:hover {
          color: #dcb35d;
        }

        /* MOBILE */

        @media (max-width: 900px) {
          .ta-nav {
            display: none;
          }

          .ta-hero {
            padding-top: 55px;
          }

          .ta-hero-grid {
            grid-template-columns: 1fr;
            gap: 45px;
          }

          .ta-hero-content {
            text-align: center;
          }

          .ta-description {
            margin-left: auto;
            margin-right: auto;
          }

          .ta-actions {
            justify-content: center;
          }

          .ta-mini-stats {
            margin-left: auto;
            margin-right: auto;
          }

          .ta-login-wrap {
            width: min(500px,100%);
            margin: auto;
          }

          .ta-features {
            grid-template-columns: 1fr;
          }

          .ta-markets {
            grid-template-columns: repeat(2,1fr);
          }
        }

        @media (max-width: 560px) {
          .ta-container {
            width: min(100% - 24px, 1180px);
          }

          .ta-header {
            height: 70px;
          }

          .ta-brand-sub {
            display: none;
          }

          .ta-brand-title {
            font-size: 17px;
          }

          .ta-logo {
            width: 43px;
            height: 43px;
            border-radius: 14px;
          }

          .ta-login-link {
            display: none;
          }

          .ta-register-link {
            padding: 10px 14px;
            font-size: 11px;
          }

          .ta-hero {
            padding: 42px 0 65px;
          }

          .ta-title {
            font-size: 39px;
            letter-spacing: -1px;
          }

          .ta-description {
            font-size: 13px;
            line-height: 2;
          }

          .ta-actions {
            flex-direction: column;
          }

          .ta-primary,
          .ta-secondary {
            width: 100%;
          }

          .ta-mini-stats {
            gap: 7px;
          }

          .ta-stat {
            padding: 12px 7px;
          }

          .ta-stat-number {
            font-size: 14px;
          }

          .ta-stat-label {
            font-size: 8px;
          }

          .ta-login-card {
            padding: 23px 18px;
            border-radius: 23px;
          }

          .ta-login-title {
            font-size: 18px;
          }

          .ta-section {
            padding: 65px 0;
          }

          .ta-section-title {
            font-size: 26px;
          }

          .ta-markets {
            grid-template-columns: 1fr 1fr;
          }

          .ta-market {
            padding: 15px 12px;
          }

          .ta-market-name {
            font-size: 11px;
          }

          .ta-market-symbol {
            font-size: 8px;
          }

          .ta-footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>

      <div className="ta-page">

        {/* HEADER */}
        <header className="ta-header">
          <div className="ta-container ta-header-inner">

            <Link href="/" className="ta-brand">
              <div className="ta-logo">
                <Logo />
              </div>

              <div>
                <div className="ta-brand-title">
                  Trading <span>AI</span>
                </div>

                <div className="ta-brand-sub">
                  MARKET INTELLIGENCE
                </div>
              </div>
            </Link>

            <nav className="ta-nav">
              <a href="#features">امکانات</a>
              <a href="#markets">بازارها</a>
              <a href="#about">درباره پلتفرم</a>
            </nav>

            <div className="ta-header-actions">
              <Link href="/login" className="ta-login-link">
                ورود
              </Link>

              <Link href="/register" className="ta-register-link">
                ثبت‌نام
              </Link>
            </div>

          </div>
        </header>

        {/* HERO */}
        <main>
          <section className="ta-hero">
            <div className="ta-container ta-hero-grid">

              <div className="ta-hero-content">

                <div className="ta-badge">
                  <span className="ta-badge-dot" />
                  پلتفرم هوشمند تحلیل بازار
                </div>

                <h1 className="ta-title">
                  آینده معامله‌گری
                  <span className="ta-title-gold">
                    با هوش مصنوعی
                  </span>
                </h1>

                <p className="ta-description">
                  Trading AI محیطی حرفه‌ای برای تحلیل بازار،
                  بررسی روندها، شناسایی فرصت‌های معاملاتی و
                  مدیریت بهتر ریسک در اختیار شما قرار می‌دهد.
                </p>

                <div className="ta-actions">
                  <Link href="/register" className="ta-primary">
                    شروع کار با Trading AI
                  </Link>

                  <Link href="/login" className="ta-secondary">
                    ورود به حساب
                  </Link>
                </div>

                <div className="ta-mini-stats">

                  <div className="ta-stat">
                    <div className="ta-stat-number">
                      AI
                    </div>
                    <div className="ta-stat-label">
                      تحلیل هوشمند
                    </div>
                  </div>

                  <div className="ta-stat">
                    <div className="ta-stat-number">
                      24/7
                    </div>
                    <div className="ta-stat-label">
                      پایش بازار
                    </div>
                  </div>

                  <div className="ta-stat">
                    <div className="ta-stat-number">
                      LIVE
                    </div>
                    <div className="ta-stat-label">
                      داده بازار
                    </div>
                  </div>

                </div>
              </div>

              {/* LOGIN */}
              <div className="ta-login-wrap">

                <div className="ta-login-glow" />

                <div className="ta-login-card">

                  <div className="ta-login-head">

                    <div className="ta-login-icon">
                      <Logo size={31} />
                    </div>

                    <div>
                      <div className="ta-login-title">
                        ورود به <span>Trading AI</span>
                      </div>

                      <div className="ta-login-sub">
                        وارد حساب کاربری خود شوید
                      </div>
                    </div>

                  </div>

                  <div className="ta-field">
                    <label>ایمیل</label>
                    <input
                      className="ta-input"
                      type="email"
                      placeholder="example@email.com"
                    />
                  </div>

                  <div className="ta-field">
                    <label>رمز عبور</label>
                    <input
                      className="ta-input"
                      type="password"
                      placeholder="رمز عبور خود را وارد کنید"
                    />
                  </div>

                  <div className="ta-login-options">

                    <label className="ta-remember">
                      <input type="checkbox" />
                      مرا بخاطر بسپار
                    </label>

                    <Link
                      href="/forgot-password"
                      className="ta-forgot"
                    >
                      فراموشی رمز عبور؟
                    </Link>

                  </div>

                  <Link
                    href="/login"
                    className="ta-primary ta-login-button"
                  >
                    ورود به حساب
                  </Link>

                  <div className="ta-register-question">
                    حساب کاربری ندارید؟
                    <Link href="/register">
                      ثبت‌نام کنید
                    </Link>
                  </div>

                  <div className="ta-security">

                    <div className="ta-security-item">
                      <div className="ta-security-icon">
                        🔐
                      </div>
                      ورود امن
                    </div>

                    <div className="ta-security-item">
                      <div className="ta-security-icon">
                        🛡️
                      </div>
                      حفاظت حساب
                    </div>

                  </div>

                </div>
              </div>

            </div>
          </section>

          {/* FEATURES */}
          <section id="features" className="ta-section">
            <div className="ta-container">

              <div className="ta-section-head">
                <div className="ta-section-label">
                  TRADING AI
                </div>

                <h2 className="ta-section-title">
                  یک محیط حرفه‌ای برای معامله‌گری
                </h2>

                <p className="ta-section-text">
                  اطلاعات مهم را بدون شلوغی و پیچیدگی در یک
                  محیط مدرن و منظم مشاهده کنید.
                </p>
              </div>

              <div className="ta-features">

                <Feature
                  icon="◈"
                  title="تحلیل هوشمند"
                  text="بررسی داده‌ها و روند بازار توسط موتور تحلیل Trading AI."
                />

                <Feature
                  icon="◆"
                  title="سیگنال‌های معاملاتی"
                  text="مشاهده نقاط ورود، حد ضرر و اهداف در محیطی واضح و حرفه‌ای."
                />

                <Feature
                  icon="◉"
                  title="مدیریت ریسک"
                  text="بررسی بهتر وضعیت معامله و مدیریت سرمایه قبل و بعد از ورود."
                />

              </div>

            </div>
          </section>

          {/* MARKETS */}
          <section id="markets" className="ta-section">
            <div className="ta-container">

              <div className="ta-section-head">
                <div className="ta-section-label">
                  MARKETS
                </div>

                <h2 className="ta-section-title">
                  بازارهای تحت پوشش
                </h2>
              </div>

              <div className="ta-markets">

                <Market
                  icon="🥇"
                  name="طلا"
                  symbol="XAU / USD"
                />

                <Market
                  icon="🇺🇸"
                  name="فارکس"
                  symbol="EUR/USD · GBP/USD"
                />

                <Market
                  icon="₿"
                  name="ارز دیجیتال"
                  symbol="BTC/USDT · ETH/USDT"
                />

                <Market
                  icon="🌍"
                  name="بازار جهانی"
                  symbol="GLOBAL MARKET"
                />

              </div>

            </div>
          </section>

          {/* ABOUT */}
          <section id="about" className="ta-section">
            <div className="ta-container">

              <div className="ta-section-head">

                <div
                  className="ta-logo"
                  style={{
                    margin: "0 auto 22px",
                    width: 70,
                    height: 70,
                  }}
                >
                  <Logo size={42} />
                </div>

                <div className="ta-section-label">
                  MARKET INTELLIGENCE
                </div>

                <h2 className="ta-section-title">
                  Trading <span style={{ color: "#dfb75c" }}>AI</span>
                </h2>

                <p className="ta-section-text">
                  یک پلتفرم مدرن برای تحلیل بازار و تصمیم‌گیری
                  آگاهانه‌تر در معاملات.
                </p>

                <Link
                  href="/register"
                  className="ta-primary"
                  style={{ marginTop: 24 }}
                >
                  ساخت حساب کاربری
                </Link>

              </div>

            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="ta-footer">
          <div className="ta-container ta-footer-inner">

            <div className="ta-footer-brand">
              © {new Date().getFullYear()} Trading AI
            </div>

            <div className="ta-footer-links">
              <Link href="/login">ورود</Link>
              <Link href="/register">ثبت‌نام</Link>
              <Link href="/support">پشتیبانی</Link>
            </div>

          </div>
        </footer>

      </div>
    </>
  );
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 23.5L11.5 13L16 20L21.5 8.5L26 23.5"
        stroke="#E5B95D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5 26H27"
        stroke="#93651F"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <circle
        cx="21.5"
        cy="8.5"
        r="2"
        fill="#F0CD78"
      />
    </svg>
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
    <div className="ta-feature">
      <div className="ta-feature-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function Market({
  icon,
  name,
  symbol,
}: {
  icon: string;
  name: string;
  symbol: string;
}) {
  return (
    <div className="ta-market">

      <div className="ta-market-top">

        <div className="ta-market-icon">
          {icon}
        </div>

        <div>
          <div className="ta-market-name">
            {name}
          </div>

          <div className="ta-market-symbol">
            {symbol}
          </div>
        </div>

      </div>

    </div>
  );
}
