import AuthForm from "@/components/AuthForm";

export default function HomePage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#020817] text-white"
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        .trading-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(34, 211, 238, 0.13),
              transparent 35%
            ),
            radial-gradient(
              circle at 0% 100%,
              rgba(37, 99, 235, 0.10),
              transparent 32%
            ),
            #020817;
        }

        .ambient-one,
        .ambient-two,
        .ambient-three {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(1px);
        }

        .ambient-one {
          width: 360px;
          height: 360px;
          top: -190px;
          right: -100px;
          background: rgba(34, 211, 238, 0.08);
          box-shadow: 0 0 120px rgba(34, 211, 238, 0.08);
        }

        .ambient-two {
          width: 300px;
          height: 300px;
          bottom: -170px;
          left: -120px;
          background: rgba(59, 130, 246, 0.08);
          box-shadow: 0 0 110px rgba(59, 130, 246, 0.08);
        }

        .ambient-three {
          width: 180px;
          height: 180px;
          top: 42%;
          left: 42%;
          background: rgba(6, 182, 212, 0.025);
          box-shadow: 0 0 100px rgba(6, 182, 212, 0.04);
        }

        .page-container {
          position: relative;
          z-index: 2;
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 35px 18px;
        }

        .content {
          width: 100%;
          max-width: 1050px;
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(380px, 0.75fr);
          align-items: center;
          gap: 65px;
        }

        .brand-section {
          width: 100%;
          max-width: 500px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 25px;
        }

        .logo {
          width: 62px;
          height: 62px;
          position: relative;
          display: grid;
          place-items: center;
          border-radius: 20px;
          border: 1px solid rgba(103, 232, 249, 0.25);
          background:
            linear-gradient(
              145deg,
              rgba(34, 211, 238, 0.18),
              rgba(37, 99, 235, 0.10)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 15px 45px rgba(6, 182, 212, 0.10);
        }

        .logo::before {
          content: "";
          position: absolute;
          inset: 8px;
          border-radius: 15px;
          border: 1px solid rgba(103, 232, 249, 0.14);
        }

        .logo-symbol {
          position: relative;
          z-index: 2;
          color: #67e8f9;
          font-size: 30px;
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 0 20px rgba(34, 211, 238, 0.45);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .brand-name {
          margin: 0;
          color: #f8fafc;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .brand-subtitle {
          margin: 0;
          color: #64748b;
          font-size: 10px;
          letter-spacing: 2px;
          direction: ltr;
          text-align: right;
        }

        .headline {
          margin: 0;
          max-width: 500px;
          color: #f8fafc;
          font-size: clamp(32px, 5vw, 54px);
          line-height: 1.25;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .headline-highlight {
          display: inline-block;
          color: #67e8f9;
          text-shadow: 0 0 35px rgba(34, 211, 238, 0.15);
        }

        .description {
          max-width: 450px;
          margin: 22px 0 0;
          color: #7c8ca3;
          font-size: 14px;
          line-height: 2.1;
        }

        .features {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .feature {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.10);
          background: rgba(255,255,255,0.025);
          color: #94a3b8;
          font-size: 10px;
        }

        .feature-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.7);
        }

        .auth-wrapper {
          width: 100%;
          max-width: 430px;
          justify-self: end;
        }

        .auth-heading {
          margin-bottom: 12px;
          padding-right: 4px;
        }

        .auth-heading-title {
          margin: 0;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 800;
        }

        .auth-heading-text {
          margin: 4px 0 0;
          color: #475569;
          font-size: 9px;
        }

        .footer {
          position: absolute;
          z-index: 3;
          bottom: 18px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 0 18px;
          pointer-events: none;
        }

        .footer-text {
          color: #334155;
          font-size: 9px;
          text-align: center;
        }

        @media (max-width: 850px) {
          .page-container {
            align-items: flex-start;
            padding-top: 32px;
            padding-bottom: 45px;
          }

          .content {
            grid-template-columns: 1fr;
            gap: 30px;
            max-width: 520px;
          }

          .brand-section {
            max-width: none;
            text-align: center;
          }

          .brand {
            justify-content: center;
          }

          .headline {
            max-width: none;
            font-size: 34px;
          }

          .description {
            margin-left: auto;
            margin-right: auto;
          }

          .features {
            justify-content: center;
          }

          .auth-wrapper {
            max-width: 500px;
            justify-self: center;
          }

          .footer {
            position: relative;
            margin-top: -28px;
          }
        }

        @media (max-width: 520px) {
          .page-container {
            padding: 24px 12px 35px;
          }

          .content {
            gap: 22px;
          }

          .logo {
            width: 55px;
            height: 55px;
            border-radius: 17px;
          }

          .logo-symbol {
            font-size: 27px;
          }

          .brand-name {
            font-size: 22px;
          }

          .headline {
            font-size: 30px;
            letter-spacing: -0.8px;
          }

          .description {
            font-size: 12px;
            line-height: 2;
          }

          .feature {
            font-size: 9px;
            padding: 8px 10px;
          }
        }
      `}</style>

      <div className="trading-page">
        <div className="ambient-one" />
        <div className="ambient-two" />
        <div className="ambient-three" />

        <div className="page-container">
          <div className="content">

            {/* Brand / Introduction */}
            <section className="brand-section">
              <div className="brand">
                <div className="logo" aria-label="Trading AI Logo">
                  <span className="logo-symbol">AI</span>
                </div>

                <div className="brand-text">
                  <h1 className="brand-name">
                    Trading AI
                  </h1>

                  <p className="brand-subtitle">
                    MARKET INTELLIGENCE
                  </p>
                </div>
              </div>

              <h2 className="headline">
                هوشمندانه‌تر
                <br />
                <span className="headline-highlight">
                  معامله کن.
                </span>
              </h2>

              <p className="description">
                به پنل Trading AI وارد شوید و ابزارهای هوشمند
                تحلیل بازار و مدیریت معاملات خود را در یک محیط
                حرفه‌ای و امن مدیریت کنید.
              </p>

              <div className="features">
                <div className="feature">
                  <span className="feature-dot" />
                  امنیت حساب
                </div>

                <div className="feature">
                  <span className="feature-dot" />
                  تحلیل هوشمند
                </div>

                <div className="feature">
                  <span className="feature-dot" />
                  دسترسی آنلاین
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section className="auth-wrapper">
              <div className="auth-heading">
                <h2 className="auth-heading-title">
                  ورود به حساب
                </h2>

                <p className="auth-heading-text">
                  برای ادامه، وارد حساب خود شوید یا حساب جدید بسازید.
                </p>
              </div>

              <AuthForm />
            </section>

          </div>
        </div>

        <footer className="footer">
          <div className="footer-text">
            © {new Date().getFullYear()} Trading AI — تمامی حقوق محفوظ است.
          </div>
        </footer>
      </div>
    </main>
  );
}
