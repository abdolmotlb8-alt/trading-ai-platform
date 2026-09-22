"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "register";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  user?: UserData;
};

export default function AuthForm() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  function resetMessage() {
    setMessage("");
    setMessageType("");
  }

  function switchMode(nextMode: AuthMode) {
    if (loading) return;

    setMode(nextMode);

    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    resetMessage();
  }

  function validate(): string {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return "لطفاً ایمیل خود را وارد کنید.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return "فرمت ایمیل صحیح نیست.";
    }

    if (!password) {
      return "لطفاً رمز عبور را وارد کنید.";
    }

    if (mode === "register") {
      if (cleanName.length < 2) {
        return "لطفاً نام معتبر وارد کنید.";
      }

      if (password.length < 8) {
        return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
      }

      if (password !== confirmPassword) {
        return "تکرار رمز عبور با رمز عبور یکسان نیست.";
      }
    }

    return "";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    resetMessage();

    const validationError = validate();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const endpoint =
      mode === "login"
        ? "/api/auth/login"
        : "/api/register";

    const body =
      mode === "login"
        ? {
            email: cleanEmail,
            password,
            rememberMe,
          }
        : {
            name: name.trim(),
            email: cleanEmail,
            password,
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(body),
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data: ApiResponse = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        data = {
          message:
            text ||
            `پاسخ نامعتبر از سرور دریافت شد. کد: ${response.status}`,
        };
      }

      if (!response.ok || data.success === false) {
        setMessage(
          data.message ||
            `عملیات انجام نشد. کد خطا: ${response.status}`
        );

        setMessageType("error");
        return;
      }

      /*
       * ثبت‌نام موفق
       */
      if (mode === "register") {
        setMessage(
          "حساب شما با موفقیت ساخته شد. اکنون با ایمیل و رمز عبور وارد شوید."
        );

        setMessageType("success");

        setMode("login");

        setName("");
        setPassword("");
        setConfirmPassword("");

        return;
      }

      /*
       * ورود موفق
       *
       * API ورود role واقعی کاربر را از دیتابیس
       * برمی‌گرداند.
       *
       * ADMIN → /admin
       * USER  → /dashboard
       */
      if (data.user) {
        const userRole = String(
          data.user.role || ""
        )
          .trim()
          .toUpperCase();

        setMessage(
          userRole === "ADMIN"
            ? "ورود مدیر با موفقیت انجام شد. در حال انتقال به پنل مدیریت..."
            : "ورود موفق بود. در حال انتقال..."
        );

        setMessageType("success");

        /*
         * مسیر مقصد بر اساس role واقعی دیتابیس
         */
        const destination =
          userRole === "ADMIN"
            ? "/admin"
            : "/dashboard";

        setTimeout(() => {
          router.replace(destination);
          router.refresh();
        }, 250);

        return;
      }

      setMessage(
        "ورود انجام شد اما اطلاعات حساب از سرور دریافت نشد."
      );

      setMessageType("error");
    } catch (error) {
      console.error("AUTH FORM ERROR:", error);

      setMessage(
        "ارتباط با سرور برقرار نشد. اتصال اینترنت، Render و API را بررسی کنید."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-wrapper" dir="rtl">
      <style jsx>{`
        .auth-wrapper {
          width: 100%;
          min-height: 100%;
          color: #f8fafc;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        .auth-shell {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .brand {
          text-align: center;
          margin-bottom: 28px;
        }

        .logo {
          width: 82px;
          height: 82px;
          margin: 0 auto 14px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 25px;
          border: 1px solid rgba(34, 211, 238, 0.35);
          background:
            radial-gradient(
              circle at 30% 20%,
              rgba(34, 211, 238, 0.25),
              transparent 50%
            ),
            linear-gradient(
              145deg,
              rgba(15, 38, 65, 0.98),
              rgba(5, 17, 35, 0.98)
            );
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.35),
            0 0 40px rgba(34, 211, 238, 0.08);
          overflow: hidden;
        }

        .logo::before {
          content: "";
          position: absolute;
          width: 54px;
          height: 4px;
          background: linear-gradient(
            90deg,
            transparent,
            #22d3ee,
            #60a5fa
          );
          transform: rotate(-35deg);
          box-shadow: 0 0 14px rgba(34, 211, 238, 0.5);
        }

        .logo::after {
          content: "";
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22d3ee;
          right: 17px;
          top: 19px;
          box-shadow: 0 0 16px #22d3ee;
        }

        .logo-text {
          position: relative;
          z-index: 2;
          font-size: 27px;
          font-weight: 950;
          letter-spacing: -2px;
          color: #f8fafc;
        }

        .logo-text span {
          color: #22d3ee;
        }

        .brand-name {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -1px;
        }

        .brand-name span {
          color: #22d3ee;
        }

        .brand-description {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .auth-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .auth-card {
          position: relative;
          padding: 30px;
          border-radius: 26px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background:
            linear-gradient(
              145deg,
              rgba(10, 27, 48, 0.94),
              rgba(4, 16, 32, 0.96)
            );
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
          overflow: hidden;
        }

        .auth-card::before {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          top: -110px;
          right: -80px;
          border-radius: 50%;
          background: rgba(34, 211, 238, 0.08);
          filter: blur(30px);
          pointer-events: none;
        }

        .card-header {
          position: relative;
          margin-bottom: 25px;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin-bottom: 15px;
          border-radius: 15px;
          border: 1px solid rgba(34, 211, 238, 0.2);
          color: #22d3ee;
          background: rgba(34, 211, 238, 0.07);
          font-size: 22px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 22px;
          line-height: 1.7;
          font-weight: 900;
        }

        .card-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 2;
        }

        .form {
          display: grid;
          gap: 15px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field label {
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 800;
        }

        .input-box {
          position: relative;
        }

        .input-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 15px;
          pointer-events: none;
        }

        .input {
          width: 100%;
          height: 52px;
          box-sizing: border-box;
          padding: 0 44px 0 46px;
          border-radius: 13px;
          outline: none;
          border: 1px solid rgba(148, 163, 184, 0.16);
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.035);
          font: inherit;
          font-size: 12px;
          transition:
            border-color 0.2s,
            background 0.2s,
            box-shadow 0.2s;
        }

        .input:focus {
          border-color: rgba(34, 211, 238, 0.65);
          background: rgba(34, 211, 238, 0.035);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.07);
        }

        .input::placeholder {
          color: #475569;
        }

        .password-button {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 8px;
          color: #94a3b8;
          background: transparent;
          cursor: pointer;
          font-size: 15px;
        }

        .password-button:hover {
          color: #22d3ee;
          background: rgba(34, 211, 238, 0.06);
        }

        .options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 1px;
        }

        .remember {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 10px;
          cursor: pointer;
        }

        .remember input {
          width: 15px;
          height: 15px;
          accent-color: #22d3ee;
          cursor: pointer;
        }

        .forgot {
          color: #22d3ee;
          font-size: 10px;
          text-decoration: none;
          opacity: 0.55;
          cursor: not-allowed;
        }

        .submit {
          width: 100%;
          min-height: 53px;
          margin-top: 5px;
          border: 0;
          border-radius: 14px;
          color: #03131f;
          background: linear-gradient(
            135deg,
            #22d3ee,
            #38bdf8
          );
          box-shadow:
            0 15px 35px rgba(34, 211, 238, 0.13);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 950;
          transition:
            transform 0.2s,
            box-shadow 0.2s,
            opacity 0.2s;
        }

        .submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 20px 45px rgba(34, 211, 238, 0.2);
        }

        .submit:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .message {
          min-height: 22px;
          margin: 2px 0 0;
          text-align: center;
          font-size: 10px;
          line-height: 1.9;
        }

        .message.success {
          color: #4ade80;
        }

        .message.error {
          color: #fb7185;
        }

        .switch {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          color: #64748b;
          font-size: 10px;
        }

        .switch button {
          border: 0;
          padding: 0;
          color: #22d3ee;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 900;
        }

        .security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          color: #64748b;
          font-size: 9px;
          text-align: center;
        }

        .security-icon {
          color: #22d3ee;
          font-size: 15px;
        }

        @media (max-width: 850px) {
          .auth-grid {
            grid-template-columns: 1fr;
          }

          .auth-card {
            padding: 25px;
          }
        }

        @media (max-width: 500px) {
          .auth-card {
            padding: 21px;
            border-radius: 22px;
          }

          .brand-name {
            font-size: 26px;
          }

          .logo {
            width: 70px;
            height: 70px;
          }

          .card-header h2 {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="auth-shell">
        <div className="brand">
          <div className="logo" aria-label="Trading AI">
            <div className="logo-text">
              T<span>AI</span>
            </div>
          </div>

          <h1 className="brand-name">
            Trading <span>AI</span>
          </h1>

          <p className="brand-description">
            پلتفرم هوشمند تحلیل و مدیریت معاملات
          </p>
        </div>

        <div className="auth-grid">
          {/* LOGIN */}
          <div className="auth-card">
            <div className="card-header">
              <div className="card-icon">🔐</div>

              <h2>ورود به حساب کاربری</h2>

              <p>
                برای دسترسی به پنل Trading AI وارد حساب خود شوید.
              </p>
            </div>

            <form
              className="form"
              onSubmit={handleSubmit}
            >
              <div className="field">
                <label htmlFor="login-email">
                  ایمیل
                </label>

                <div className="input-box">
                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    id="login-email"
                    className="input"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="example@email.com"
                    autoComplete="email"
                    dir="ltr"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="login-password">
                  رمز عبور
                </label>

                <div className="input-box">
                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="login-password"
                    className="input"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="رمز عبور خود را وارد کنید"
                    autoComplete="current-password"
                    dir="ltr"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="password-button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "مخفی کردن رمز"
                        : "نمایش رمز"
                    }
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="options">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                  />

                  مرا به خاطر بسپار
                </label>

                <span
                  className="forgot"
                  title="این قابلیت بعد از اتصال سرویس ایمیل فعال می‌شود"
                >
                  فراموشی رمز عبور
                </span>
              </div>

              <button
                type="submit"
                className="submit"
                disabled={loading}
              >
                {loading
                  ? "در حال ورود..."
                  : "ورود به حساب ←"}
              </button>

              <p
                className={`message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            </form>

            <div className="switch">
              <span>حساب کاربری ندارید؟</span>

              <button
                type="button"
                onClick={() =>
                  switchMode("register")
                }
                disabled={loading}
              >
                ایجاد حساب جدید
              </button>
            </div>
          </div>

          {/* REGISTER */}
          <div className="auth-card">
            <div className="card-header">
              <div className="card-icon">✦</div>

              <h2>ایجاد حساب کاربری</h2>

              <p>
                اطلاعات خود را وارد کنید تا حساب جدید شما
                ساخته شود.
              </p>
            </div>

            <form
              className="form"
              onSubmit={(event) => {
                setMode("register");
                handleSubmit(event);
              }}
            >
              <div className="field">
                <label htmlFor="register-name">
                  نام کاربر
                </label>

                <div className="input-box">
                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    id="register-name"
                    className="input"
                    type="text"
                    name="name"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="نام کامل خود را وارد کنید"
                    autoComplete="name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="register-email">
                  ایمیل
                </label>

                <div className="input-box">
                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    id="register-email"
                    className="input"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="example@email.com"
                    autoComplete="email"
                    dir="ltr"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="register-password">
                  رمز عبور
                </label>

                <div className="input-box">
                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="register-password"
                    className="input"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="حداقل ۸ کاراکتر"
                    autoComplete="new-password"
                    dir="ltr"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="password-button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "مخفی کردن رمز"
                        : "نمایش رمز"
                    }
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="register-confirm-password">
                  تکرار رمز عبور
                </label>

                <div className="input-box">
                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="register-confirm-password"
                    className="input"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="رمز عبور را دوباره وارد کنید"
                    autoComplete="new-password"
                    dir="ltr"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="password-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showConfirmPassword
                        ? "مخفی کردن رمز"
                        : "نمایش رمز"
                    }
                  >
                    {showConfirmPassword
                      ? "🙈"
                      : "👁"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="submit"
                disabled={loading}
              >
                {loading
                  ? "در حال ساخت حساب..."
                  : "ایجاد حساب کاربری ✦"}
              </button>

              <p
                className={`message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            </form>

            <div className="switch">
              <span>قبلاً حساب دارید؟</span>

              <button
                type="button"
                onClick={() =>
                  switchMode("login")
                }
                disabled={loading}
              >
                ورود به حساب
              </button>
            </div>
          </div>
        </div>

        <div className="security">
          <span className="security-icon">
            🛡
          </span>

          <span>
            اطلاعات حساب شما از طریق اتصال امن به سرور ارسال
            می‌شود.
          </span>
        </div>
      </div>
    </section>
  );
}
