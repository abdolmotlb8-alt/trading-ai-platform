"use client";

import { useEffect, useState } from "react";

type SubscriptionInfo = {
  plan?: string | null;
  status?: string | null;
  startedAt?: string | null;
  expiresAt?: string | null;
  remainingDays?: number | null;
};

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
  subscription?: SubscriptionInfo | null;
};

function UserIcon() {
  return (
    <svg
      width="22"
      height="22"
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

function formatDate(value: string | null | undefined) {
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

function getPlanName(plan: string | null | undefined) {
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

function getSubscriptionStatus(
  subscription: SubscriptionInfo | null
) {
  if (!subscription) {
    return "رایگان";
  }

  const status = String(
    subscription.status || ""
  ).toUpperCase();

  if (
    status === "ACTIVE" ||
    status === "ACTIVATED"
  ) {
    return "فعال";
  }

  if (
    status === "EXPIRED" ||
    status === "EXPIRE"
  ) {
    return "منقضی شده";
  }

  if (subscription.expiresAt) {
    const expires = new Date(
      subscription.expiresAt
    ).getTime();

    if (!Number.isNaN(expires)) {
      if (expires > Date.now()) {
        return "فعال";
      }

      return "منقضی شده";
    }
  }

  return "فعال";
}

export default function ProfilePage() {
  const [user, setUser] =
    useState<ProfileUser | null>(null);

  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(null);

  const [name, setName] = useState("");

  const [loading, setLoading] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string>("");

  const [success, setSuccess] =
    useState<string>("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/profile",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data: ProfileResponse =
        await response.json().catch(
          () => ({})
        );

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

      setName(
        typeof data.user.name === "string"
          ? data.user.name
          : ""
      );

      setSubscription(
        data.subscription ?? null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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
      setError(
        "نام کاربری نمی‌تواند خالی باشد."
      );
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

      const response = await fetch(
        "/api/profile",
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
          }),
        }
      );

      const data: ProfileResponse =
        await response.json().catch(
          () => ({})
        );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "ذخیره اطلاعات انجام نشد."
        );
      }

      if (data.user) {
        setUser(data.user);

        setName(
          typeof data.user.name === "string"
            ? data.user.name
            : cleanName
        );
      }

      setSubscription(
        data.subscription ?? null
      );

      setSuccess(
        "تغییرات با موفقیت ذخیره شد."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ذخیره اطلاعات انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  function goDashboard() {
    window.location.href =
      "/dashboard";
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
            direction: rtl;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background:
              radial-gradient(
                circle at 85% 5%,
                rgba(124, 58, 237, 0.18),
                transparent 30%
              ),
              radial-gradient(
                circle at 10% 80%,
                rgba(37, 99, 235, 0.1),
                transparent 30%
              ),
              #030712;
          }

          .loading-box {
            width: min(360px, 100%);
            padding: 30px;
            border-radius: 25px;
            border: 1px solid rgba(
              255,
              255,
              255,
              0.08
            );
            background: rgba(
              8,
              17,
              31,
              0.85
            );
            text-align: center;
            color: white;
          }

          .loading-logo {
            width: 55px;
            height: 55px;
            margin: 0 auto 18px;
            border-radius: 17px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(
              135deg,
              #7c3aed,
              #2563eb
            );
            font-size: 14px;
            font-weight: 900;
          }

          .loading-text {
            color: #94a3b8;
            font-size: 12px;
          }
        `}</style>

        <main className="profile-loading">
          <div className="loading-box">
            <div className="loading-logo">
              AI
            </div>

            <div className="loading-text">
              در حال دریافت اطلاعات پروفایل...
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
            padding: 20px;
            background: #030712;
          }

          .error-card {
            width: min(430px, 100%);
            padding: 30px;
            border-radius: 25px;
            border: 1px solid rgba(
              239,
              68,
              68,
              0.2
            );
            background: rgba(
              8,
              17,
              31,
              0.9
            );
            text-align: center;
            color: white;
          }

          .error-card h1 {
            margin: 0 0 10px;
            font-size: 22px;
          }

          .error-card p {
            color: #94a3b8;
            font-size: 12px;
            line-height: 2;
          }

          .error-card button {
            border: 0;
            border-radius: 12px;
            padding: 12px 22px;
            background: linear-gradient(
              135deg,
              #7c3aed,
              #2563eb
            );
            color: white;
            font-weight: 800;
            cursor: pointer;
          }
        `}</style>

        <main className="error-page">
          <div className="error-card">
            <h1>
              پروفایل در دسترس نیست
            </h1>

            <p>
              نشست حساب کاربری شما معتبر نیست
              یا اطلاعات پروفایل دریافت نشد.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/login";
              }}
            >
              ورود به حساب
            </button>
          </div>
        </main>
      </>
    );
  }

  const currentPlan = getPlanName(
    subscription?.plan ?? user.plan
  );

  const subscriptionStatus =
    getSubscriptionStatus(subscription);

  const remainingDays =
    typeof subscription?.remainingDays ===
    "number"
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
          padding: 18px;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(124, 58, 237, 0.15),
              transparent 28%
            ),
            radial-gradient(
              circle at 0% 65%,
              rgba(14, 165, 233, 0.08),
              transparent 25%
            ),
            #030712;
        }

        .profile-container {
          width: min(940px, 100%);
          margin: 0 auto;
        }

        .topbar {
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          margin-bottom: 26px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.07
          );
          border-radius: 19px;
          background: rgba(
            7,
            16,
            30,
            0.78
          );
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
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
          color: white;
          font-size: 12px;
          font-weight: 900;
          box-shadow:
            0 10px 30px rgba(
              124,
              58,
              237,
              0.2
            );
        }

        .brand-name {
          color: #f8fafc;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
          direction: ltr;
        }

        .brand-sub {
          margin-top: 3px;
          color: #475569;
          font-size: 7px;
          letter-spacing: 1.7px;
          direction: ltr;
        }

        .back-button {
          height: 38px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          border-radius: 11px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.08
          );
          background: rgba(
            255,
            255,
            255,
            0.025
          );
          color: #94a3b8;
          font-size: 10px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-button:hover {
          color: white;
          border-color: rgba(
            139,
            92,
            246,
            0.3
          );
          background: rgba(
            139,
            92,
            246,
            0.07
          );
        }

        .page-heading {
          margin-bottom: 17px;
        }

        .page-heading h1 {
          margin: 0;
          color: white;
          font-size: clamp(
            28px,
            5vw,
            38px
          );
          font-weight: 900;
          letter-spacing: -1px;
        }

        .page-heading p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .notice {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 13px;
          font-size: 11px;
        }

        .notice.success {
          color: #6ee7b7;
          background: rgba(
            16,
            185,
            129,
            0.07
          );
          border: 1px solid rgba(
            16,
            185,
            129,
            0.17
          );
        }

        .notice.error {
          color: #fca5a5;
          background: rgba(
            239,
            68,
            68,
            0.07
          );
          border: 1px solid rgba(
            239,
            68,
            68,
            0.17
          );
        }

        .profile-card {
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.075
          );
          background: rgba(
            7,
            16,
            30,
            0.8
          );
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 25px 70px rgba(
              0,
              0,
              0,
              0.25
            );
        }

        .profile-head {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 24px;
          border-bottom: 1px solid rgba(
            255,
            255,
            255,
            0.06
          );
        }

        .avatar {
          width: 82px;
          height: 82px;
          min-width: 82px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 24px;
          border: 1px solid rgba(
            139,
            92,
            246,
            0.3
          );
          background:
            linear-gradient(
              145deg,
              rgba(
                124,
                58,
                237,
                0.18
              ),
              rgba(
                37,
                99,
                235,
                0.13
              )
            );
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-emoji {
          font-size: 39px;
          line-height: 1;
        }

        .identity {
          min-width: 0;
        }

        .identity-name {
          margin: 0;
          color: white;
          font-size: 22px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .identity-email {
          margin-top: 7px;
          color: #64748b;
          font-size: 11px;
          direction: ltr;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .identity-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 11px;
        }

        .badge {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 900;
        }

        .badge-role {
          color: #93c5fd;
          background: rgba(
            59,
            130,
            246,
            0.08
          );
          border: 1px solid rgba(
            59,
            130,
            246,
            0.16
          );
        }

        .badge-plan {
          color: #c4b5fd;
          background: rgba(
            139,
            92,
            246,
            0.09
          );
          border: 1px solid rgba(
            139,
            92,
            246,
            0.17
          );
        }

        .profile-body {
          padding: 24px;
        }

        .section-title {
          margin: 0 0 5px;
          color: white;
          font-size: 14px;
          font-weight: 900;
        }

        .section-description {
          margin: 0 0 21px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.9;
        }

        .field {
          margin-bottom: 17px;
        }

        .field-label {
          display: block;
          margin-bottom: 8px;
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 800;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          top: 50%;
          right: 14px;
          transform: translateY(-50%);
          color: #64748b;
          display: flex;
        }

        .profile-input {
          width: 100%;
          height: 49px;
          padding: 0 44px 0 13px;
          border-radius: 13px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.08
          );
          outline: none;
          background: rgba(
            2,
            8,
            23,
            0.72
          );
          color: white;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .profile-input:focus {
          border-color: rgba(
            139,
            92,
            246,
            0.55
          );
          box-shadow:
            0 0 0 4px rgba(
              139,
              92,
              246,
              0.06
            );
        }

        .profile-input.readonly {
          color: #64748b;
          cursor: not-allowed;
          background: rgba(
            255,
            255,
            255,
            0.02
          );
        }

        .email-note {
          margin-top: 6px;
          color: #475569;
          font-size: 8px;
        }

        .save-button {
          width: 100%;
          height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5 55%,
            #2563eb
          );
          color: white;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 15px 35px rgba(
              79,
              70,
              229,
              0.17
            );
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
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 14px;
        }

        .mini-card {
          padding: 19px;
          border-radius: 21px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.07
          );
          background: rgba(
            7,
            16,
            30,
            0.72
          );
        }

        .mini-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .mini-title {
          color: white;
          font-size: 11px;
          font-weight: 900;
        }

        .mini-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #a78bfa;
          background: rgba(
            139,
            92,
            246,
            0.08
          );
          border: 1px solid rgba(
            139,
            92,
            246,
            0.12
          );
        }

        .data-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(
            255,
            255,
            255,
            0.045
          );
        }

        .data-row:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .data-label {
          color: #64748b;
          font-size: 9px;
        }

        .data-value {
          color: #e2e8f0;
          font-size: 9px;
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
          width: 100%;
          height: 47px;
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.07
          );
          border-radius: 13px;
          background: rgba(
            255,
            255,
            255,
            0.025
          );
          color: #94a3b8;
          font-size: 10px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .dashboard-link:hover {
          color: white;
          border-color: rgba(
            139,
            92,
            246,
            0.22
          );
          background: rgba(
            139,
            92,
            246,
            0.06
          );
        }

        .footer {
          padding: 20px 0 7px;
          text-align: center;
          color: #334155;
          font-size: 8px;
          direction: ltr;
          letter-spacing: 0.8px;
        }

        @media (max-width: 650px) {
          .profile-page {
            padding: 10px;
          }

          .topbar {
            height: 57px;
            padding: 0 11px;
            margin-bottom: 19px;
            border-radius: 17px;
          }

          .brand-logo {
            width: 35px;
            height: 35px;
            border-radius: 11px;
          }

          .brand-name {
            font-size: 10px;
          }

          .brand-sub {
            display: none;
          }

          .back-button {
            padding: 0 10px;
          }

          .back-button span {
            display: none;
          }

          .page-heading {
            padding: 0 3px;
          }

          .page-heading h1 {
            font-size: 28px;
          }

          .profile-head {
            padding: 19px;
            gap: 13px;
          }

          .avatar {
            width: 68px;
            height: 68px;
            min-width: 68px;
            border-radius: 20px;
          }

          .avatar-emoji {
            font-size: 32px;
          }

          .identity-name {
            font-size: 18px;
          }

          .identity-email {
            font-size: 9px;
          }

          .profile-body {
            padding: 19px;
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
              <span>
                بازگشت به داشبورد
              </span>
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
              اطلاعات حساب خود را مشاهده و
              مدیریت کنید.
            </p>
          </section>

          {success ? (
            <div className="notice success">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="notice error">
              {error}
            </div>
          ) : null}

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
                    {currentPlan}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-body">
              <h3 className="section-title">
                اطلاعات حساب
              </h3>

              <p className="section-description">
                اطلاعات حساب فعلی شما از سیستم
                دریافت شده است.
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
                    type="text"
                    value={name}
                    maxLength={80}
                    autoComplete="name"
                    onChange={(event) => {
                      setName(
                        event.target.value
                      );
                      setSuccess("");
                      setError("");
                    }}
                    placeholder="نام خود را وارد کنید"
                  />
                </div>
              </div>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="profile-email"
                >
                  ایمیل
                </label>

                <div className="input-wrap">
                  <span className="input-icon">
                    <MailIcon />
                  </span>

                  <input
                    id="profile-email"
                    className="profile-input readonly"
                    type="email"
                    value={user.email}
                    readOnly
                  />
                </div>

                <div className="email-note">
                  ایمیل حساب در این بخش قابل
                  تغییر نیست.
                </div>
              </div>

              <button
                type="button"
                className="save-button"
                onClick={() => {
                  void saveProfile();
                }}
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
                  {currentPlan}
                </span>
              </div>

              <div className="data-row">
                <span className="data-label">
                  وضعیت
                </span>

                <span
                  className={`data-value ${
                    subscriptionStatus ===
                    "فعال"
                      ? "active-value"
                      : ""
                  }`}
                >
                  {subscriptionStatus}
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

              {subscription?.expiresAt ? (
                <div className="data-row">
                  <span className="data-label">
                    پایان اشتراک
                  </span>

                  <span className="data-value">
                    {formatDate(
                      subscription.expiresAt
                    )}
                  </span>
                </div>
              ) : null}
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
                  شناسه
                </span>

                <span className="data-value">
                  {user.id.length > 12
                    ? `${user.id.slice(
                        0,
                        12
                      )}...`
                    : user.id}
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
                  تاریخ عضویت
                </span>

                <span className="data-value">
                  {formatDate(
                    user.createdAt
                  )}
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

          <div className="footer">
            TRADING AI • SMART TRADING PLATFORM
          </div>
        </div>
      </main>
    </>
  );
}
