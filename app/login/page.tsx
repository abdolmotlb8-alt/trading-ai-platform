import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .gold-login-page {
          min-height: 100vh;
          width: 100%;
          direction: rtl;
          background:
            radial-gradient(
              circle at 80% 10%,
              rgba(215, 169, 69, 0.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 15% 85%,
              rgba(161, 111, 29, 0.08),
              transparent 30%
            ),
            #050505;
          color: #fff;
          position: relative;
          overflow-x: hidden;
          font-family:
            Arial,
            Tahoma,
            "Segoe UI",
            sans-serif;
        }

        .gold-login-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.035;
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.8) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.8) 1px,
              transparent 1px
            );
          background-size: 60px 60px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 90%
          );
        }

        .gold-login-header {
          height: 78px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(5,5,5,.82);
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 5;
        }

        .gold-login-header-inner {
          width: min(1160px, calc(100% - 32px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .gold-login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: white;
        }

        .gold-login-logo {
          width: 47px;
          height: 47px;
          border-radius: 15px;
          border: 1px solid rgba(224,181,87,.3);
          background:
            linear-gradient(
              145deg,
              rgba(224,181,87,.12),
              rgba(255,255,255,.02)
            );
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            inset 0 0 20px rgba(224,181,87,.05),
            0 0 30px rgba(224,181,87,.06);
        }

        .gold-login-brand-name {
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -.5px;
        }

        .gold-login-brand-name span {
          color: #dfb65b;
        }

        .gold-login-brand-sub {
          margin-top: 4px;
          color: rgba(255,255,255,.28);
          font-size: 8px;
          letter-spacing: 3px;
          direction: ltr;
        }

        .gold-login-home {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 17px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          transition: .2s;
        }

        .gold-login-home:hover {
          border-color: rgba(224,181,87,.3);
          color: #e1b85d;
          background: rgba(224,181,87,.05);
        }

        .gold-login-main {
          min-height: calc(100vh - 78px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 55px 16px 70px;
          position: relative;
          z-index: 1;
        }

        .gold-login-layout {
          width: min(1050px, 100%);
          display: grid;
          grid-template-columns: 1fr 470px;
          gap: 70px;
          align-items: center;
        }

        .gold-login-intro {
          padding: 15px 0;
        }

        .gold-login-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 15px;
          border-radius: 999px;
          border: 1px solid rgba(224,181,87,.18);
          background: rgba(224,181,87,.045);
          color: #dcb35b;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 22px;
        }

        .gold-login-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e1b75a;
          box-shadow: 0 0 12px #e1b75a;
        }

        .gold-login-heading {
          margin: 0;
          font-size: clamp(38px, 5vw, 62px);
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .gold-login-heading span {
          display: block;
          margin-top: 5px;
          background:
            linear-gradient(
              100deg,
              #fff2c4,
              #e4b75b 45%,
              #95631d
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .gold-login-description {
          max-width: 530px;
          margin: 22px 0 0;
          color: rgba(255,255,255,.4);
          font-size: 14px;
          line-height: 2.1;
        }

        .gold-login-points {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 28px;
          max-width: 560px;
        }

        .gold-login-point {
          padding: 15px 10px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 15px;
          background: rgba(255,255,255,.018);
          text-align: center;
        }

        .gold-login-point strong {
          display: block;
          color: #dfb65b;
          font-size: 15px;
          font-weight: 950;
        }

        .gold-login-point small {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,.3);
          font-size: 9px;
        }

        .gold-login-card-wrap {
          position: relative;
        }

        .gold-login-glow {
          position: absolute;
          inset: -50px;
          border-radius: 70px;
          background: rgba(211,164,65,.065);
          filter: blur(55px);
          pointer-events: none;
        }

        .gold-login-card {
          position: relative;
          border-radius: 28px;
          border: 1px solid rgba(224,181,87,.18);
          background:
            linear-gradient(
              145deg,
              rgba(27,24,18,.98),
              rgba(10,10,10,.99)
            );
          padding: 32px;
          box-shadow:
            0 35px 100px rgba(0,0,0,.65),
            inset 0 1px 0 rgba(255,255,255,.035);
        }

        .gold-login-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              #dcb05a,
              transparent
            );
        }

        .gold-login-card-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 27px;
        }

        .gold-login-card-icon {
          width: 56px;
          height: 56px;
          flex: 0 0 56px;
          border-radius: 17px;
          border: 1px solid rgba(224,181,87,.22);
          background: rgba(224,181,87,.055);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gold-login-card-title {
          font-size: 22px;
          font-weight: 950;
          color: #fff;
        }

        .gold-login-card-title span {
          color: #dfb65b;
        }

        .gold-login-card-subtitle {
          margin-top: 5px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        /*
          ظاهر داخلی AuthForm
          منطق ورود AuthForm دست‌نخورده می‌ماند.
        */

        .gold-login-form {
          width: 100%;
        }

        .gold-login-form input[type="email"],
        .gold-login-form input[type="text"],
        .gold-login-form input[type="password"] {
          width: 100% !important;
          height: 54px !important;
          border-radius: 15px !important;
          border: 1px solid rgba(255,255,255,.09) !important;
          background: rgba(255,255,255,.035) !important;
          color: #fff !important;
          outline: none !important;
          padding: 0 16px !important;
          font-size: 13px !important;
          box-shadow: none !important;
          transition: .2s !important;
        }

        .gold-login-form input::placeholder {
          color: rgba(255,255,255,.22) !important;
        }

        .gold-login-form input:focus {
          border-color: rgba(224,181,87,.5) !important;
          background: rgba(224,181,87,.035) !important;
          box-shadow:
            0 0 0 3px rgba(224,181,87,.06) !important;
        }

        .gold-login-form label {
          color: rgba(255,255,255,.72) !important;
          font-size: 12px !important;
          font-weight: 800 !important;
        }

        .gold-login-form button {
          min-height: 54px !important;
          border-radius: 15px !important;
          border: 0 !important;
          background:
            linear-gradient(
              135deg,
              #efd17f,
              #c99a3e,
              #8f621f
            ) !important;
          color: #090806 !important;
          font-weight: 950 !important;
          font-size: 14px !important;
          box-shadow:
            0 14px 35px rgba(210,164,67,.14) !important;
          transition: .2s !important;
        }

        .gold-login-form button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 17px 40px rgba(210,164,67,.22) !important;
        }

        .gold-login-form a {
          color: #dfb65b !important;
        }

        .gold-login-form p,
        .gold-login-form span {
          color: rgba(255,255,255,.45);
        }

        .gold-login-form input[type="checkbox"] {
          accent-color: #dcb15a;
        }

        .gold-login-security {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 22px;
        }

        .gold-login-security-item {
          padding: 11px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.055);
          background: rgba(255,255,255,.018);
          color: rgba(255,255,255,.3);
          font-size: 9px;
          text-align: center;
        }

        .gold-login-security-item strong {
          display: block;
          margin-bottom: 4px;
          color: #dcb25b;
          font-size: 15px;
        }

        .gold-login-footer {
          margin-top: 18px;
          text-align: center;
          color: rgba(255,255,255,.25);
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .gold-login-layout {
            grid-template-columns: 1fr;
            gap: 42px;
            max-width: 520px;
          }

          .gold-login-intro {
            text-align: center;
          }

          .gold-login-description {
            margin-left: auto;
            margin-right: auto;
          }

          .gold-login-points {
            margin-left: auto;
            margin-right: auto;
          }

          .gold-login-main {
            align-items: flex-start;
          }
        }

        @media (max-width: 560px) {
          .gold-login-header {
            height: 70px;
          }

          .gold-login-header-inner {
            width: calc(100% - 24px);
          }

          .gold-login-brand-sub {
            display: none;
          }

          .gold-login-brand-name {
            font-size: 17px;
          }

          .gold-login-logo {
            width: 42px;
            height: 42px;
            border-radius: 13px;
          }

          .gold-login-home {
            min-height: 38px;
            padding: 0 12px;
            font-size: 10px;
          }

          .gold-login-main {
            min-height: calc(100vh - 70px);
            padding: 38px 12px 55px;
          }

          .gold-login-heading {
            font-size: 39px;
            letter-spacing: -1px;
          }

          .gold-login-description {
            font-size: 12px;
          }

          .gold-login-points {
            gap: 7px;
          }

          .gold-login-point {
            padding: 12px 5px;
          }

          .gold-login-card {
            padding: 23px 17px;
            border-radius: 23px;
          }

          .gold-login-card-title {
            font-size: 18px;
          }
        }
      `}</style>

      <div className="gold-login-page">

        {/* HEADER */}
        <header className="gold-login-header">
          <div className="gold-login-header-inner">

            <a
              href="/"
              className="gold-login-brand"
            >
              <div className="gold-login-logo">
                <TradingLogo />
              </div>

              <div>
                <div className="gold-login-brand-name">
                  Trading <span>AI</span>
                </div>

                <div className="gold-login-brand-sub">
                  MARKET INTELLIGENCE
                </div>
              </div>
            </a>

            <a
              href="/"
              className="gold-login-home"
            >
              ← بازگشت به صفحه اصلی
            </a>

          </div>
        </header>

        {/* MAIN */}
        <main className="gold-login-main">

          <div className="gold-login-layout">

            {/* LEFT SIDE */}
            <section className="gold-login-intro">

              <div className="gold-login-badge">
                <span className="gold-login-dot" />
                ورود امن به پلتفرم
              </div>

              <h1 className="gold-login-heading">
                به Trading AI
                <span>خوش آمدید</span>
              </h1>

              <p className="gold-login-description">
                وارد حساب کاربری خود شوید و به ابزارهای
                تحلیل بازار، سیگنال‌ها و امکانات حرفه‌ای
                Trading AI دسترسی پیدا کنید.
              </p>

              <div className="gold-login-points">

                <div className="gold-login-point">
                  <strong>AI</strong>
                  <small>تحلیل هوشمند</small>
                </div>

                <div className="gold-login-point">
                  <strong>LIVE</strong>
                  <small>داده بازار</small>
                </div>

                <div className="gold-login-point">
                  <strong>24/7</strong>
                  <small>پایش بازار</small>
                </div>

              </div>

            </section>

            {/* LOGIN CARD */}
            <section className="gold-login-card-wrap">

              <div className="gold-login-glow" />

              <div className="gold-login-card">

                <div className="gold-login-card-head">

                  <div className="gold-login-card-icon">
                    <TradingLogo size={31} />
                  </div>

                  <div>
                    <div className="gold-login-card-title">
                      ورود به <span>Trading AI</span>
                    </div>

                    <div className="gold-login-card-subtitle">
                      اطلاعات حساب خود را وارد کنید
                    </div>
                  </div>

                </div>

                {/* AuthForm واقعی پروژه */}
                <div className="gold-login-form">
                  <AuthForm />
                </div>

                <div className="gold-login-security">

                  <div className="gold-login-security-item">
                    <strong>🔐</strong>
                    ورود امن
                  </div>

                  <div className="gold-login-security-item">
                    <strong>🛡️</strong>
                    حفاظت حساب
                  </div>

                </div>

                <div className="gold-login-footer">
                  Trading AI · Market Intelligence
                </div>

              </div>

            </section>

          </div>

        </main>

      </div>
    </>
  );
}

function TradingLogo({
  size = 29,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 29L14 15L20 24L28 9L34 29"
        stroke="#E6BA5C"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M6 33H34"
        stroke="#93651F"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle
        cx="28"
        cy="9"
        r="2.8"
        fill="#F1D17E"
      />
    </svg>
  );
}
