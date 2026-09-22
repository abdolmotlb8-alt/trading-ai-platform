"use client";

import { useEffect, useState } from "react";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  bio?: string | null;
  createdAt?: string | null;
};

type ProfileResponse = {
  success?: boolean;
  message?: string;
  user?: ProfileUser;
  subscription?: {
    plan?: string | null;
    status?: string | null;
    startedAt?: string | null;
    expiresAt?: string | null;
    remainingDays?: number | null;
  };
};

function UserIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.1 3.5-6 8-6s7.2 1.9 8 6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 20 6v5c0 5.2-3.2 8.7-8 10-4.8-1.3-8-4.8-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 3h11l3 3v15H5V3Z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 21v-7h8v7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 8 6-8 12L4 9l8-6Z" />
      <path d="m4 9 8 3 8-3M12 3v9" />
    </svg>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getPlanName(plan?: string | null) {
  const value = String(plan || "FREE").toUpperCase();

  if (value === "PRO") {
    return "PRO";
  }

  if (value === "VIP") {
    return "VIP";
  }

  if (value === "PREMIUM") {
    return "PREMIUM";
  }

  return "رایگان";
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [subscription, setSubscription] =
    useState<ProfileResponse["subscription"]>(null);

  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: ProfileResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        throw new Error(
          data.message ||
            "دریافت اطلاعات پروفایل انجام نشد."
        );
      }

      if (!data.user) {
        throw new Error(
          "اطلاعات کاربر دریافت نشد."
        );
      }

      setUser(data.user);
      setName(data.user.name || "");
      setSubscription(data.subscription || null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطایی در دریافت پروفایل رخ داد."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setError("");
    setSuccess("");

    const cleanName = name.trim();

    if (!cleanName) {
      setError("نام کاربری نمی‌تواند خالی باشد.");
      return;
    }

    if (cleanName.length < 2) {
      setError(
        "نام کاربری باید حداقل ۲ کاراکتر باشد."
      );
      return;
    }

    if (cleanName.length > 80) {
      setError(
        "نام کاربری نمی‌تواند بیشتر از ۸۰ کاراکتر باشد."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      const data: ProfileResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "ذخیره اطلاعات انجام نشد."
        );
      }

      if (data.user) {
        setUser(data.user);
        setName(data.user.name);
      }

      if (data.subscription) {
        setSubscription(data.subscription);
      }

      setSuccess(
        "اطلاعات پروفایل با موفقیت ذخیره شد."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "ذخیره اطلاعات انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  function goDashboard() {
    window.location.href = "/dashboard";
  }

  if (loading) {
    return (
      <>
        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #030712;
          }

          body {
            font-family:
              Tahoma,
              Arial,
              sans-serif;
          }

          .profile-loading {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 80% 10%,
                rgba(124, 58, 237, 0.16),
                transparent 30%
              ),
              radial-gradient(
                circle at 10% 80%,
                rgba(14, 165, 233, 0.1),
                transparent 30%
              ),
              #030712;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            direction: rtl;
          }

          .loading-box {
            width: min(380px, calc(100% - 32px));
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(10, 18, 32, 0.8);
            border-radius: 28px;
            text-align: center;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
          }

          .loading-logo {
            width: 58px;
            height: 58px;
            margin: 0 auto 20px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(
              135deg,
              #7c3aed,
              #2563eb
            );
            font-size: 18px;
            font-weight: 900;
          }

          .loading-text {
            color: #94a3b8;
            font-size: 13px;
          }
        `}</style>

        <main className="profile-loading">
          <div className="loading-box">
            <div className="loading-logo">AI</div>
            <div className="loading-text">
              در حال دریافت پروفایل...
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #030712;
          }

          body {
            font-family:
              Tahoma,
              Arial,
              sans-serif;
          }

          .error-page {
            min-height: 100vh;
            direction: rtl;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #030712;
            color: white;
          }

          .error-card {
            width: min(460px, 100%);
            padding: 30px;
            border-radius: 26px;
            border: 1px solid rgba(239, 68, 68, 0.18);
            background: rgba(10, 18, 32, 0.9);
            text-align: center;
          }

          .error-card h1 {
            margin: 0 0 10px;
            font-size: 22px;
          }

          .error-card p {
            color: #94a3b8;
            font-size: 13px;
            line-height: 2;
          }

          .error-card button {
            border: 0;
            border-radius: 12px;
            padding: 12px 20px;
            background: linear-gradient(
              135deg,
              #7c3aed,
              #2563eb
            );
            color: white;
            font-weight: 700;
            cursor: pointer;
          }
        `}</style>

        <main className="error-page">
          <div className="error-card">
            <h1>پروفایل پیدا نشد</h1>
            <p>
              نشست کاربری شما معتبر نیست یا اطلاعات حساب
              قابل دریافت نیست.
            </p>

            <button onClick={() => (window.location.href = "/login")}>
              ورود به حساب
            </button>
          </div>
        </main>
      </>
    );
  }

  const planName = getPlanName(
    subscription?.plan || user.plan
  );

  const isFree =
    String(user.plan || "FREE").toUpperCase() ===
    "FREE";

  const remainingDays =
    typeof subscription?.remainingDays === "number"
      ? subscription.remainingDays
      : null;

  const avatar =
    user.avatarUrl ||
    user.avatarEmoji ||
    "👤";

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          background: #030712;
        }

        body {
          margin: 0;
          padding: 0;
          background: #030712;
          color: #f8fafc;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        button,
        input {
          font-family: inherit;
        }

        .profile-page {
          min-height: 100vh;
          direction: rtl;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(124, 58, 237, 0.15),
              transparent 27%
            ),
            radial-gradient(
              circle at 5% 55%,
              rgba(14, 165, 233, 0.08),
              transparent 25%
            ),
            #030712;
          padding: 18px;
        }

        .profile-container {
          width: min(980px, 100%);
          margin: 0 auto;
        }

        .topbar {
          height: 64px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(7, 16, 30, 0.76);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          margin-bottom: 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: white;
          text-decoration: none;
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #2563eb
          );
          box-shadow:
            0 10px 30px rgba(124, 58, 237, 0.2);
          font-size: 12px;
          font-weight: 900;
        }

        .brand-name {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .brand-sub {
          margin-top: 2px;
          color: #64748b;
          font-size: 8px;
          letter-spacing: 1.8px;
          direction: ltr;
        }

        .back-button {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: #cbd5e1;
          height: 40px;
          padding: 0 13px;
          border-radius: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .back-button:hover {
          background: rgba(124, 58, 237, 0.1);
          border-color: rgba(124, 58, 237, 0.25);
          color: white;
        }

        .page-heading {
          margin-bottom: 18px;
        }

        .page-heading h1 {
          margin: 0;
          font-size: clamp(27px, 5vw, 38px);
          font-weight: 900;
          letter-spacing: -0.8px;
        }

        .page-heading p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .notice {
          border-radius: 14px;
          padding: 12px 15px;
          margin-bottom: 16px;
          font-size: 12px;
        }

        .notice.success {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.18);
          color: #6ee7b7;
        }

        .notice.error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
          color: #fca5a5;
        }

        .profile-card {
          border: 1px solid rgba(255, 255, 255, 0.075);
          background: rgba(7, 16, 30, 0.78);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border-radius: 28px;
          overflow: hidden;
          box-shadow:
            0 25px 70px rgba(0, 0, 0, 0.25);
        }

        .profile-head {
          padding: 26px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .avatar {
          width: 88px;
          height: 88px;
          min-width: 88px;
          border-radius: 25px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background:
            linear-gradient(
              145deg,
              rgba(124, 58, 237, 0.18),
              rgba(37, 99, 235, 0.13)
            );
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 15px 35px rgba(0, 0, 0, 0.2);
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-emoji {
          font-size: 42px;
          line-height: 1;
        }

        .identity {
          min-width: 0;
        }

        .identity-name {
          margin: 0;
          color: white;
          font-size: 23px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .identity-email {
          margin-top: 7px;
          color: #64748b;
          font-size: 12px;
          direction: ltr;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .identity-badges {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .badge {
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 9px;
          font-weight: 800;
        }

        .badge-role {
          background: rgba(59, 130, 246, 0.09);
          border: 1px solid rgba(59, 130, 246, 0.17);
          color: #93c5fd;
        }

        .badge-plan {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
        }

        .profile-body {
          padding: 26px;
        }

        .section-title {
          margin: 0 0 5px;
          font-size: 15px;
          font-weight: 900;
        }

        .section-description {
          margin: 0 0 22px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.9;
        }

        .field {
          margin-bottom: 18px;
        }

        .field-label {
          display: block;
          margin-bottom: 8px;
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 800;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          display: flex;
        }

        .profile-input {
          width: 100%;
          height: 50px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          outline: none;
          background: rgba(2, 8, 23, 0.72);
          color: white;
          padding: 0 45px 0 14px;
          font-size: 12px;
          transition: 0.2s ease;
        }

        .profile-input:focus {
          border-color: rgba(139, 92, 246, 0.55);
          box-shadow:
            0 0 0 4px rgba(139, 92, 246, 0.07);
        }

        .profile-input.readonly {
          color: #64748b;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.025);
        }

        .email-note {
          margin-top: 7px;
          color: #475569;
          font-size: 9px;
        }

        .save-button {
          width: 100%;
          height: 50px;
          border: 0;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #4f46e5 55%,
              #2563eb
            );
          color: white;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow:
            0 15px 35px rgba(79, 70, 229, 0.18);
          transition: 0.2s ease;
        }

        .save-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .bottom-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .mini-card {
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(7, 16, 30, 0.7);
          border-radius: 22px;
          padding: 20px;
        }

        .mini-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }

        .mini-title {
          font-size: 12px;
          font-weight: 900;
        }

        .mini-icon {
          width: 35px;
          height: 35px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.12);
        }

        .data-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.045);
        }

        .data-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .data-label {
          color: #64748b;
          font-size: 10px;
        }

        .data-value {
          color: #e2e8f0;
          font-size: 10px;
          font-weight: 800;
          text-align: left;
        }

        .plan-value {
          color: #a78bfa;
        }

        .active-value {
          color: #34d399;
        }

        .dashboard-link {
          margin-top: 16px;
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          color: #cbd5e1;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .dashboard-link:hover {
          background: rgba(124, 58, 237, 0.08);
          border-color: rgba(124, 58, 237, 0.2);
          color: white;
        }

        .footer {
          text-align: center;
          padding: 22px 0 8px;
          color: #334155;
          font-size: 9px;
        }

        @media (max-width: 650px) {
          .profile-page {
            padding: 10px;
          }

          .topbar {
            margin-bottom: 20px;
            height: 58px;
            border-radius: 17px;
            padding: 0 12px;
          }

          .brand-sub {
            display: none;
          }

          .brand-name {
            font-size: 11px;
          }

          .brand-logo {
            width: 36px;
            height: 36px;
          }

          .back-button span {
            display: none;
          }

          .page-heading {
            padding: 0 4px;
          }

          .page-heading h1 {
            font-size: 28px;
          }

          .profile-head {
            padding: 20px;
            gap: 14px;
          }

          .avatar {
            width: 70px;
            height: 70px;
            min-width: 70px;
            border-radius: 21px;
          }

          .avatar-emoji {
            font-size: 33px;
          }

          .identity-name {
            font-size: 18px;
          }

          .identity-email {
            font-size: 10px;
          }

          .profile-body {
            padding: 20px;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="profile-page">
        <div className="profile-container">
          <header className="topbar">
            <button
              type="button"
              className="back-button"
              onClick={goDashboard}
            >
              <ArrowIcon />
              <span>بازگشت به داشبورد</span>
            </button>

            <div className="brand">
              <div className="brand-logo">
                AI
              </div>

              <div>
                <div className="brand-name">
                  TRADING AI
                </div>

                <div className="brand-sub">
                  SMART TRADING PLATFORM
                </div>
              </div>
            </div>
          </header>

          <section className="page-heading">
            <h1>پروفایل</h1>

            <p>
              اطلاعات حساب خود را مشاهده و مدیریت کنید.
            </p>
          </section>

          {success && (
            <div className="notice success">
              {success}
            </div>
          )}

          {error && (
            <div className="notice error">
              {error}
            </div>
          )}

          <section className="profile-card">
            <div className="profile-head">
              <div className="avatar">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="تصویر پروفایل"
                  />
                ) : (
                  <span className="avatar-emoji">
                    {avatar}
                  </span>
                )}
              </div>

              <div className="identity">
                <h2 className="identity-name">
                  {user.name}
                </h2>

                <div className="identity-email">
                  {user.email}
                </div>

                <div className="identity-badges">
                  <span className="badge badge-role">
                    {user.role === "ADMIN"
                      ? "مدیر سیستم"
                      : "کاربر"}
                  </span>

                  <span className="badge badge-plan">
                    {planName}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-body">
              <h3 className="section-title">
                اطلاعات حساب
              </h3>

              <p className="section-description">
                فقط اطلاعاتی که در حال حاضر به‌صورت واقعی
                توسط سیستم پشتیبانی می‌شوند در این صفحه
                قرار گرفته‌اند.
              </p>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="profile-name"
                >
                  نام کاربری
                </label>

                <div className="input-wrap">
                  <span className="input-icon">
                    <UserIcon />
                  </span>

                  <input
                    id="profile-name"
                    className="profile-input"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    maxLength={80}
                    placeholder="نام کاربری"
                  />
                </div>
              </div>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="profile-email"
                >
                  ایمیل حساب
                </label>

                <div className="input-wrap">
                  <span className="input-icon">
                    <MailIcon />
                  </span>

                  <input
                    id="profile-email"
                    className="profile-input readonly"
                    value={user.email}
                    readOnly
                  />
                </div>

                <div className="email-note">
                  ایمیل از این بخش قابل تغییر نیست.
                </div>
              </div>

              <button
                type="button"
                className="save-button"
                onClick={saveProfile}
                disabled={saving}
              >
                <SaveIcon />

                {saving
                  ? "در حال ذخیره..."
                  : "ذخیره تغییرات"}
              </button>
            </div>
          </section>

          <div className="bottom-grid">
            <section className="mini-card">
              <div className="mini-card-header">
                <div className="mini-title">
                  وضعیت اشتراک
                </div>

                <div className="mini-icon">
                  <DiamondIcon />
                </div>
              </div>

              <div className="data-row">
                <span className="data-label">
                  پلن فعلی
                </span>

                <span className="data-value plan-value">
                  {planName}
                </span>
              </div>

              <div className="data-row">
                <span className="data-label">
                  وضعیت
                </span>

                <span className="data-value active-value">
                  {isFree
                    ? "رایگان"
                    : "فعال"}
                </span>
              </div>

              <div className="data-row">
                <span className="data-label">
                  باقی‌مانده
                </span>

                <span className="data-value">
                  {remainingDays === null
                    ? "—"
                    : `${remainingDays} روز`}
                </span>
              </div>
            </section>

            <section className="mini-card">
              <div className="mini-card-header">
                <div className="mini-title">
                  اطلاعات حساب
                </div>

                <div className="mini-icon">
                  <ShieldIcon />
                </div>
              </div>

              <div className="data-row">
                <span className="data-label">
                  شناسه کاربر
                </span>

                <span className="data-value">
                  {user.id.slice(0, 10)}...
                </span>
              </div>

              <div className="data-row">
                <span className="data-label">
                  نوع حساب
                </span>

                <span className="data-value">
                  {user.role === "ADMIN"
                    ? "ADMIN"
                    : "USER"}
                </span>
              </div>

              <div className="data-row">
                <span className="data-label">
                  عضویت از
                </span>

                <span className="data-value">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </section>
          </div>

          <button
            type="button"
            className="dashboard-link"
            onClick={goDashboard}
          >
            رفتن به داشبورد
            <ArrowIcon />
          </button>

          <footer className="footer">
            TRADING AI • SMART TRADING PLATFORM
          </footer>
        </div>
      </main>
    </>
  );
}
