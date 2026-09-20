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
  message?: string;
  user?: UserData;
};

export default function AuthForm() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [loading, setLoading] = useState(false);

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setName("");
    setPassword("");
    clearMessage();
  }

  function validateForm() {
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "register" && name.trim().length < 2) {
      return "لطفاً نام معتبر وارد کنید.";
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return "لطفاً ایمیل معتبر وارد کنید.";
    }

    if (!password) {
      return "رمز عبور را وارد کنید.";
    }

    if (mode === "register" && password.length < 8) {
      return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    clearMessage();

    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    setLoading(true);

    const url =
      mode === "register"
        ? "/api/register"
        : "/api/auth/login";

    const body =
      mode === "register"
        ? {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
            rememberMe,
          };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type");

      let data: ApiResponse = {};

      if (contentType?.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        setMessage(
          data.message ||
            `عملیات انجام نشد. کد خطا: ${response.status}`
        );
        setMessageType("error");
        return;
      }

      if (mode === "register") {
        setMessage(
          "ثبت‌نام با موفقیت انجام شد. اکنون وارد حساب خود شوید."
        );
        setMessageType("success");
        setMode("login");
        setPassword("");
        return;
      }

      if (response.ok && data.user) {
        setMessage("ورود با موفقیت انجام شد.");
        setMessageType("success");

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage("پاسخ نامعتبر از سرور دریافت شد.");
      setMessageType("error");
    } catch (error) {
      console.error("AUTH FORM ERROR:", error);

      setMessage(
        "ارتباط با سرور برقرار نشد. وضعیت سرور و دیتابیس را بررسی کنید."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section dir="rtl" className="auth-page">
      <style>{`
        .auth-page {
          width: 100%;
          color: #f8fafc;
          font-family: Arial, Tahoma, sans-serif;
        }

        .auth-card {
          width: 100%;
          padding: 30px;
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(8, 30, 52, .96),
              rgba(3, 15, 30, .99)
            );
          border: 1px solid rgba(34, 211, 238, .18);
          box-shadow:
            0 25px 80px rgba(0, 0, 0, .35),
            0 0 35px rgba(6, 182, 212, .04);
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          padding: 5px;
          margin-bottom: 28px;
          border-radius: 15px;
          background: rgba(255, 255, 255, .04);
        }

        .auth-tab {
          min-height: 45px;
          border: 0;
          border-radius: 11px;
          color: #64748b;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
        }

        .auth-tab.active {
          color: #fff;
          background: linear-gradient(135deg, #06b6d4, #2563eb);
          box-shadow: 0 8px 22px rgba(6, 182, 212, .18);
        }

        .form-header {
          margin-bottom: 24px;
        }

        .form-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          border-radius: 14px;
          color: #22d3ee;
          background: rgba(6, 182, 212, .09);
          border: 1px solid rgba(34, 211, 238, .13);
          font-size: 22px;
        }

        .form-header h1 {
          margin: 0;
          font-size: 23px;
          line-height: 1.8;
        }

        .form-header p {
          margin: 6px 0 0;
          color: #718198;
          font-size: 11px;
          line-height: 2;
        }

        .auth-form {
          display: grid;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field label {
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
        }

        .input-wrapper {
          position: relative;
        }

        .field-icon {
          position: absolute;
          top: 50%;
          right: 15px;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 16px;
          pointer-events: none;
        }

        .auth-input {
          width: 100%;
          height: 54px;
          padding: 0 45px 0 48px;
          border: 1px solid rgba(148, 163, 184, .15);
          border-radius: 14px;
          outline: none;
          color: #fff;
          background: rgba(255, 255, 255, .035);
          font: inherit;
          font-size: 12px;
          direction: rtl;
          transition: .2s;
        }

        .auth-input:focus {
          border-color: rgba(34, 211, 238, .65);
          background: rgba(6, 182, 212, .04);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, .07);
        }

        .auth-input::placeholder {
          color: #475569;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          left: 13px;
          transform: translateY(-50%);
          padding: 5px;
          border: 0;
          color: #94a3b8;
          background: transparent;
          cursor: pointer;
          font-size: 15px;
        }

        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .remember-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 10px;
          cursor: pointer;
        }

        .remember-label input {
          width: 14px;
          height: 14px;
          accent-color: #06b6d4;
          cursor: pointer;
        }

        .forgot-link {
          color: #22d3ee;
          font-size: 10px;
          text-decoration: none;
          opacity: .65;
          cursor: not-allowed;
        }

        .submit-button {
          width: 100%;
          min-height: 55px;
          margin-top: 3px;
          border: 0;
          border-radius: 15px;
          color: #02111f;
          background: linear-gradient(135deg, #22d3ee, #0ea5e9);
          box-shadow: 0 14px 32px rgba(34, 211, 238, .15);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          transition: .2s;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 38px rgba(34, 211, 238, .22);
        }

        .submit-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .message {
          min-height: 20px;
          margin: 0;
          text-align: center;
          font-size: 11px;
          line-height: 1.9;
        }

        .message.success {
          color: #4ade80;
        }

        .message.error {
          color: #fb7185;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 8px;
          color: #64748b;
          font-size: 9px;
        }

        .switch-box {
          margin-top: 20px;
          padding: 16px;
          border: 1px solid rgba(34, 211, 238, .08);
          border-radius: 16px;
          text-align: center;
          background: rgba(6, 182, 212, .035);
        }

        .switch-box p {
          margin: 0 0 9px;
          color: #64748b;
          font-size: 10px;
        }

        .switch-button {
          border: 0;
          color: #22d3ee;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
        }

        @media (max-width: 600px) {
          .auth-card {
            padding: 21px;
            border-radius: 23px;
          }

          .form-header h1 {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === "login"
                ? "auth-tab active"
                : "auth-tab"
            }
            onClick={() => changeMode("login")}
            disabled={loading}
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
            onClick={() => changeMode("register")}
            disabled={loading}
          >
            ثبت‌نام
          </button>
        </div>

        <div className="form-header">
          <div className="form-icon">
            {mode === "login" ? "🔐" : "✦"}
          </div>

          <h1>
            {mode === "login"
              ? "ورود به حساب کاربری"
              : "ساخت حساب جدید"}
          </h1>

          <p>
            {mode === "login"
              ? "برای ورود به پنل Trading AI اطلاعات خود را وارد کنید."
              : "برای شروع کار با Trading AI حساب کاربری بسازید."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="auth-name">نام کاربر</label>

              <div className="input-wrapper">
                <span className="field-icon">👤</span>

                <input
                  id="auth-name"
                  className="auth-input"
                  type="text"
                  name="name"
                  placeholder="نام خود را وارد کنید"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="auth-email">ایمیل</label>

            <div className="input-wrapper">
              <span className="field-icon">✉️</span>

              <input
                id="auth-email"
                className="auth-input"
                type="email"
                name="email"
                placeholder="example@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={loading}
                required
                dir="ltr"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="auth-password">رمز عبور</label>

            <div className="input-wrapper">
              <span className="field-icon">🔒</span>

              <input
                id="auth-password"
                className="auth-input"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="رمز عبور خود را وارد کنید"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                disabled={loading}
                required
                dir="ltr"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword
                    ? "مخفی کردن رمز عبور"
                    : "نمایش رمز عبور"
                }
                disabled={loading}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="form-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                  disabled={loading}
                />

                مرا به خاطر بسپار
              </label>

              <span className="forgot-link" title="به‌زودی فعال می‌شود">
                فراموشی رمز عبور
              </span>
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading
              ? "در حال پردازش..."
              : mode === "login"
              ? "ورود به حساب ←"
              : "ساخت حساب ←"}
          </button>

          <p
            className={`message ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        </form>

        <div className="security-note">
          🛡️ اطلاعات حساب شما از طریق اتصال امن ارسال می‌شود.
        </div>

        <div className="switch-box">
          <p>
            {mode === "login"
              ? "هنوز حساب کاربری ندارید؟"
              : "قبلاً حساب ساخته‌اید؟"}
          </p>

          <button
            type="button"
            className="switch-button"
            onClick={() =>
              changeMode(mode === "login" ? "register" : "login")
            }
            disabled={loading}
          >
            {mode === "login"
              ? "ساخت حساب جدید →"
              : "ورود به حساب →"}
          </button>
        </div>
      </div>
    </section>
  );
}
