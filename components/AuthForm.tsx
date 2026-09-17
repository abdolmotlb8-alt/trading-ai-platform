"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    try {
      setLoading(true);
      setMessage("");

      const url =
        mode === "register"
          ? "/api/register"
          : "/api/auth/login";

      const body =
        mode === "register"
          ? {
              name,
              email,
              password,
            }
          : {
              email,
              password,
            };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      setMessage(data.message || "خطای نامشخص");

      if (response.ok && data.user) {
        setUser(data.user);

        if (mode === "login") {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("AUTH ERROR:", error);

      setMessage("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setMessage("");
    setUser(null);
  }

  return (
    <section dir="rtl" className="auth-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .auth-page {
          width: 100%;
          min-height: calc(100vh - 90px);
          padding: 35px 22px 55px;
          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(6,182,212,.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(37,99,235,.12),
              transparent 32%
            ),
            #020b18;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
        }

        .auth-container {
          width: min(1250px, 100%);
          min-height: 720px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 520px;
          gap: 30px;
          align-items: stretch;
        }

        /* ================= LEFT ================= */

        .auth-intro {
          position: relative;
          overflow: hidden;
          min-width: 0;
          padding: 55px 45px;
          border-radius: 30px;
          border: 1px solid rgba(34,211,238,.12);
          background:
            linear-gradient(
              145deg,
              rgba(7,30,52,.9),
              rgba(3,13,27,.96)
            );
          box-shadow: 0 30px 90px rgba(0,0,0,.28);
        }

        .auth-intro::before {
          content: "";
          position: absolute;
          width: 380px;
          height: 380px;
          left: -170px;
          top: -170px;
          border-radius: 50%;
          background: rgba(6,182,212,.09);
          filter: blur(40px);
        }

        .auth-intro-content {
          position: relative;
          z-index: 2;
        }

        .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 999px;
          color: #67e8f9;
          background: rgba(6,182,212,.08);
          border: 1px solid rgba(34,211,238,.16);
          font-size: 11px;
          font-weight: 700;
        }

        .intro-title {
          margin: 27px 0 15px;
          font-size: clamp(35px, 4vw, 57px);
          line-height: 1.25;
          font-weight: 900;
        }

        .intro-title span {
          color: #22d3ee;
        }

        .intro-text {
          max-width: 590px;
          margin: 0;
          color: #94a3b8;
          font-size: 14px;
          line-height: 2.2;
        }

        .benefits {
          display: grid;
          gap: 15px;
          margin-top: 35px;
        }

        .benefit {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 13px;
          border-radius: 17px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(148,163,184,.07);
        }

        .benefit-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #22d3ee;
          background: rgba(6,182,212,.08);
          border: 1px solid rgba(34,211,238,.12);
          font-size: 21px;
        }

        .benefit strong {
          display: block;
          font-size: 13px;
        }

        .benefit span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.8;
        }

        .robot-area {
          position: absolute;
          left: 10px;
          bottom: -5px;
          width: min(470px, 72%);
          z-index: 1;
          pointer-events: none;
        }

        .robot-area img {
          width: 100%;
          display: block;
          opacity: .9;
          filter:
            drop-shadow(0 0 25px rgba(6,182,212,.15));
        }

        /* ================= FORM CARD ================= */

        .auth-card {
          min-width: 0;
          align-self: center;
          padding: 30px;
          border-radius: 30px;
          background:
            linear-gradient(
              145deg,
              rgba(8,30,52,.94),
              rgba(3,15,30,.98)
            );
          border: 1px solid rgba(34,211,238,.2);
          box-shadow:
            0 30px 90px rgba(0,0,0,.35),
            0 0 45px rgba(6,182,212,.05);
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          padding: 5px;
          margin-bottom: 30px;
          border-radius: 15px;
          background: rgba(255,255,255,.035);
        }

        .auth-tab {
          min-height: 46px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
        }

        .auth-tab.active {
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #06b6d4,
            #2563eb
          );
          box-shadow: 0 8px 25px rgba(6,182,212,.2);
        }

        .form-header {
          margin-bottom: 25px;
        }

        .form-header-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          margin-bottom: 15px;
          border-radius: 14px;
          color: #22d3ee;
          background: rgba(6,182,212,.08);
          border: 1px solid rgba(34,211,238,.12);
          font-size: 21px;
        }

        .form-header h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.6;
        }

        .form-header p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.9;
        }

        .form {
          display: grid;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field label {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 700;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 16px;
          pointer-events: none;
        }

        .input {
          width: 100%;
          height: 54px;
          padding: 0 45px 0 15px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.15);
          outline: none;
          background: rgba(255,255,255,.035);
          color: #ffffff;
          font-family: inherit;
          font-size: 12px;
          transition: .2s;
        }

        .input::placeholder {
          color: #475569;
        }

        .input:focus {
          border-color: rgba(34,211,238,.55);
          background: rgba(6,182,212,.035);
          box-shadow: 0 0 0 3px rgba(34,211,238,.07);
        }

        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: -2px;
        }

        .remember {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 10px;
        }

        .remember input {
          accent-color: #22d3ee;
        }

        .forgot {
          color: #22d3ee;
          font-size: 10px;
          text-decoration: none;
        }

        .submit-button {
          width: 100%;
          height: 55px;
          margin-top: 5px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            #22d3ee,
            #0ea5e9
          );
          color: #02111f;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 15px 35px rgba(34,211,238,.16);
          transition: .2s;
        }

        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(34,211,238,.22);
        }

        .submit-button:disabled {
          opacity: .6;
          cursor: wait;
          transform: none;
        }

        .message {
          min-height: 18px;
          margin: 0;
          text-align: center;
          color: #67e8f9;
          font-size: 10px;
          line-height: 1.8;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
          color: #475569;
          font-size: 10px;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(148,163,184,.1);
        }

        .social-buttons {
          display: grid;
          gap: 10px;
        }

        .social-button {
          height: 47px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 13px;
          color: #cbd5e1;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(148,163,184,.1);
          font-size: 11px;
        }

        .social-button span {
          font-size: 16px;
        }

        .register-box {
          margin-top: 18px;
          padding: 17px;
          border-radius: 16px;
          background: rgba(6,182,212,.035);
          border: 1px solid rgba(34,211,238,.08);
          text-align: center;
        }

        .register-box p {
          margin: 0 0 9px;
          color: #64748b;
          font-size: 10px;
        }

        .switch-button {
          border: 0;
          background: transparent;
          color: #22d3ee;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
        }

        .user-result {
          margin-top: 15px;
          padding: 15px;
          border-radius: 15px;
          background: rgba(34,197,94,.05);
          border: 1px solid rgba(34,197,94,.1);
        }

        .user-result h3 {
          margin: 0 0 8px;
          font-size: 12px;
        }

        .user-result p {
          margin: 4px 0;
          color: #94a3b8;
          font-size: 10px;
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 1000px) {
          .auth-container {
            grid-template-columns: 1fr;
            max-width: 620px;
          }

          .auth-intro {
            min-height: 500px;
            padding: 40px 30px;
          }

          .robot-area {
            width: 330px;
          }
        }

        @media (max-width: 600px) {
          .auth-page {
            min-height: 100vh;
            padding: 18px 12px 35px;
          }

          .auth-container {
            gap: 16px;
          }

          .auth-intro {
            min-height: 450px;
            padding: 28px 22px;
            border-radius: 23px;
          }

          .intro-title {
            font-size: 34px;
          }

          .intro-text {
            font-size: 11px;
          }

          .benefits {
            gap: 9px;
            margin-top: 23px;
          }

          .benefit {
            padding: 9px;
            gap: 10px;
          }

          .benefit-icon {
            width: 40px;
            height: 40px;
            font-size: 17px;
          }

          .benefit strong {
            font-size: 11px;
          }

          .benefit span {
            font-size: 8px;
          }

          .robot-area {
            width: 260px;
            left: -10px;
            bottom: -5px;
          }

          .auth-card {
            padding: 21px;
            border-radius: 23px;
          }

          .auth-tabs {
            margin-bottom: 23px;
          }

          .form-header h1 {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="auth-container">

        {/* INTRODUCTION */}

        <div className="auth-intro">

          <div className="auth-intro-content">

            <div className="brand-badge">
              ✦ پلتفرم هوشمند معاملات
            </div>

            <h2 className="intro-title">
              به <span>Trading AI</span>
              <br />
              خوش آمدید
            </h2>

            <p className="intro-text">
              با قدرت هوش مصنوعی، تحلیل‌های دقیق و
              ابزارهای حرفه‌ای بازار، تجربه‌ای مدرن
              برای مدیریت معاملات خود داشته باشید.
            </p>

            <div className="benefits">

              <div className="benefit">
                <div className="benefit-icon">
                  📈
                </div>

                <div>
                  <strong>
                    تحلیل هوشمند بازار
                  </strong>

                  <span>
                    بررسی داده‌های بازار با ابزارهای هوش مصنوعی
                  </span>
                </div>
              </div>

              <div className="benefit">
                <div className="benefit-icon">
                  🤖
                </div>

                <div>
                  <strong>
                    ربات‌های معاملاتی
                  </strong>

                  <span>
                    مدیریت و توسعه ابزارهای خودکار معاملاتی
                  </span>
                </div>
              </div>

              <div className="benefit">
                <div className="benefit-icon">
                  🛡️
                </div>

                <div>
                  <strong>
                    امنیت حساب
                  </strong>

                  <span>
                    مدیریت امن حساب و اطلاعات کاربری
                  </span>
                </div>
              </div>

              <div className="benefit">
                <div className="benefit-icon">
                  🎓
                </div>

                <div>
                  <strong>
                    آموزش و پشتیبانی
                  </strong>

                  <span>
                    دسترسی به آموزش‌ها و مرکز پشتیبانی
                  </span>
                </div>
              </div>

            </div>

          </div>

          <div className="robot-area">
            <img
              src="/trading-ai-robot.png"
              alt="Trading AI Robot"
            />
          </div>

        </div>

        {/* AUTH CARD */}

        <div className="auth-card">

          <div className="auth-tabs">

            <button
              type="button"
              className={
                mode === "login"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() => {
                setMode("login");
                setMessage("");
                setUser(null);
              }}
            >
              ورود به حساب
            </button>

            <button
              type="button"
              className={
                mode === "register"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() => {
                setMode("register");
                setMessage("");
                setUser(null);
              }}
            >
              ثبت نام
            </button>

          </div>

          <div className="form-header">

            <div className="form-header-icon">
              {mode === "login" ? "♙" : "✦"}
            </div>

            <h1>
              {mode === "login"
                ? "ورود به حساب کاربری"
                : "ساخت حساب جدید"}
            </h1>

            <p>
              {mode === "login"
                ? "برای دسترسی به امکانات Trading AI وارد حساب خود شوید."
                : "حساب خود را بسازید و به امکانات Trading AI دسترسی پیدا کنید."}
            </p>

          </div>

          <div className="form">

            {mode === "register" && (
              <div className="field">

                <label>
                  نام کاربر
                </label>

                <div className="input-wrap">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    className="input"
                    type="text"
                    placeholder="نام خود را وارد کنید"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                  />

                </div>

              </div>
            )}

            <div className="field">

              <label>
                ایمیل
              </label>

              <div className="input-wrap">

                <span className="input-icon">
                  ✉
                </span>

                <input
                  className="input"
                  type="email"
                  placeholder="ایمیل خود را وارد کنید"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />

              </div>

            </div>

            <div className="field">

              <label>
                رمز عبور
              </label>

              <div className="input-wrap">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  className="input"
                  type="password"
                  placeholder="رمز عبور خود را وارد کنید"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

              </div>

            </div>

            {mode === "login" && (
              <div className="form-options">

                <label className="remember">
                  <input type="checkbox" />
                  مرا به خاطر بسپار
                </label>

                <span className="forgot">
                  رمز عبور را فراموش کرده‌اید؟
                </span>

              </div>
            )}

            <button
              type="button"
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "در حال بررسی..."
                : mode === "login"
                ? "ورود به حساب  ←"
                : "ساخت حساب  ←"}
            </button>

            <p className="message">
              {message}
            </p>

            <div className="divider">
              یا
            </div>

            <div className="social-buttons">

              <div className="social-button">
                <span>G</span>
                ورود با گوگل
              </div>

              <div className="social-button">
                <span>✈</span>
                ورود با تلگرام
              </div>

            </div>

            <div className="register-box">

              <p>
                {mode === "login"
                  ? "هنوز حساب کاربری ندارید؟"
                  : "قبلاً حساب ساخته‌اید؟"}
              </p>

              <button
                type="button"
                className="switch-button"
                onClick={switchMode}
              >
                {mode === "login"
                  ? "ساخت حساب جدید  →"
                  : "ورود به حساب  →"}
              </button>

            </div>

          </div>

          {user && (
            <div className="user-result">

              <h3>
                خوش آمدید {user.name}
              </h3>

              <p>
                نقش: {user.role}
              </p>

              <p>
                پلن: {user.plan}
              </p>

            </div>
          )}

        </div>

      </div>

    </section>
  );
}
