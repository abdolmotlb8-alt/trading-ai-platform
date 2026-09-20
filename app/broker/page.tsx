"use client";

import { FormEvent, useEffect, useState } from "react";

type BrokerStatus = {
  connected: boolean;
  broker: string | null;
  platform: "MT4" | "MT5" | null;
  accountNumber: string | null;
  server: string | null;
  accountName: string | null;
  balance: number | null;
  equity: number | null;
  currency: string | null;
  lastSync: string | null;
};

type ToastType = "success" | "error" | "info";

type Toast = {
  type: ToastType;
  message: string;
};

const BROKERS = [
  {
    id: "metaquotes",
    name: "MetaTrader",
    description: "اتصال به حساب‌های MT4 و MT5",
    icon: "M",
  },
  {
    id: "icmarkets",
    name: "IC Markets",
    description: "اتصال به حساب معاملاتی IC Markets",
    icon: "IC",
  },
  {
    id: "xm",
    name: "XM",
    description: "اتصال به حساب معاملاتی XM",
    icon: "XM",
  },
  {
    id: "exness",
    name: "Exness",
    description: "اتصال به حساب معاملاتی Exness",
    icon: "EX",
  },
  {
    id: "other",
    name: "بروکر دیگر",
    description: "ثبت دستی مشخصات بروکر",
    icon: "+",
  },
];

function Icon({
  name,
  size = 21,
}: {
  name: string;
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

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="m8.5 12 2.3 2.3 4.7-5" />
      </svg>
    );
  }

  if (name === "link") {
    return (
      <svg {...common}>
        <path d="m10 13.5 4-4" />
        <path d="M7.5 14.5 5 17a4 4 0 0 0 5.7 5.7l3-3" />
        <path d="m16.5 9.5 2.5-2.5A4 4 0 0 0 13.3 1.3l-3 3" />
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

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M20 11a8 8 0 0 0-14-5L3 9" />
        <path d="M3 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14 5l3-3" />
        <path d="M21 20v-5h-5" />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg {...common}>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg {...common}>
        <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
        <path d="M4 7h14a2 2 0 0 1 2 2v2H15a2 2 0 0 0 0 4h5" />
        <path d="M16 13h.01" />
      </svg>
    );
  }

  if (name === "server") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
        <path d="M7 6.5h.01M7 17.5h.01" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...common}>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  if (name === "plug") {
    return (
      <svg {...common}>
        <path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5" />
      </svg>
    );
  }

  if (name === "disconnect") {
    return (
      <svg {...common}>
        <path d="m9 7-6 6m0-6 6 6M15 7l6 6m0-6-6 6" />
        <path d="M8 4h8M8 20h8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function formatMoney(
  value: number | null,
  currency: string | null
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)} ${currency || "USD"}`;
}

export default function BrokerPage() {
  const [selectedBroker, setSelectedBroker] = useState("");
  const [platform, setPlatform] = useState<"MT4" | "MT5">("MT5");
  const [accountNumber, setAccountNumber] = useState("");
  const [server, setServer] = useState("");
  const [password, setPassword] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState<BrokerStatus>({
    connected: false,
    broker: null,
    platform: null,
    accountNumber: null,
    server: null,
    accountName: null,
    balance: null,
    equity: null,
    currency: null,
    lastSync: null,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(type: ToastType, message: string) {
    setToast({
      type,
      message,
    });
  }

  async function loadStatus() {
    try {
      setLoading(true);

      const response = await fetch("/api/broker/status", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("خطا در دریافت وضعیت اتصال");
      }

      const data = await response.json();

      setStatus(data.status || data);
    } catch {
      showToast(
        "info",
        "سرویس وضعیت بروکر هنوز در سرور فعال نشده است."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBroker) {
      showToast("error", "لطفاً بروکر خود را انتخاب کنید.");
      return;
    }

    if (!accountNumber.trim()) {
      showToast("error", "شماره حساب را وارد کنید.");
      return;
    }

    if (!server.trim()) {
      showToast("error", "سرور بروکر را وارد کنید.");
      return;
    }

    if (!password.trim()) {
      showToast("error", "رمز عبور حساب را وارد کنید.");
      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      const response = await fetch("/api/broker/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          broker: selectedBroker,
          platform,
          accountNumber: accountNumber.trim(),
          server: server.trim(),
          password,
          investorPassword: investorPassword.trim() || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "اتصال حساب انجام نشد."
        );
      }

      setStatus(data.status || data);

      setPassword("");
      setInvestorPassword("");

      showToast(
        "success",
        "اطلاعات حساب با موفقیت ثبت و اتصال تأیید شد."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "خطا در اتصال حساب."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setToast(null);

    try {
      const response = await fetch("/api/broker/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "تست اتصال ناموفق بود."
        );
      }

      setStatus(data.status || data);

      showToast(
        "success",
        "تست اتصال با موفقیت انجام شد."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "تست اتصال انجام نشد."
      );
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      "آیا از قطع اتصال حساب معاملاتی مطمئن هستید؟"
    );

    if (!confirmed) {
      return;
    }

    setDisconnecting(true);
    setToast(null);

    try {
      const response = await fetch("/api/broker/disconnect", {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "قطع اتصال انجام نشد."
        );
      }

      setStatus({
        connected: false,
        broker: null,
        platform: null,
        accountNumber: null,
        server: null,
        accountName: null,
        balance: null,
        equity: null,
        currency: null,
        lastSync: null,
      });

      showToast(
        "success",
        "اتصال حساب با موفقیت قطع شد."
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "خطا در قطع اتصال."
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <main dir="rtl" className="broker-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .broker-page {
          min-height: 100vh;
          padding: 26px;
          color: #e8f0ff;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(34,211,238,.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 0% 65%,
              rgba(99,102,241,.13),
              transparent 32%
            ),
            #060d1b;
          font-family: Tahoma, Arial, sans-serif;
        }

        .broker-container {
          width: min(1400px, 100%);
          margin: 0 auto;
        }

        .broker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          padding: 24px;
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 26px;
          background: rgba(10,22,40,.8);
          box-shadow: 0 20px 70px rgba(0,0,0,.2);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          color: #67e8f9;
          background:
            linear-gradient(
              135deg,
              rgba(6,182,212,.2),
              rgba(79,70,229,.3)
            );
          border: 1px solid rgba(34,211,238,.2);
        }

        .header-title {
          margin: 0;
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .header-description {
          margin: 9px 0 0;
          color: #8ca0bb;
          font-size: 12px;
          line-height: 2;
        }

        .connection-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 12px 15px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .connection-badge.online {
          color: #86efac;
          background: rgba(34,197,94,.09);
          border: 1px solid rgba(34,197,94,.2);
        }

        .connection-badge.offline {
          color: #fbbf24;
          background: rgba(245,158,11,.08);
          border: 1px solid rgba(245,158,11,.2);
        }

        .status-circle {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 14px currentColor;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(310px, .8fr);
          gap: 22px;
          align-items: start;
        }

        .stack {
          display: grid;
          gap: 22px;
        }

        .panel {
          min-width: 0;
          padding: 25px;
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 25px;
          background: rgba(8,19,35,.84);
          box-shadow: 0 18px 60px rgba(0,0,0,.14);
        }

        .panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 23px;
        }

        .heading-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .heading-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          color: #67e8f9;
          border-radius: 14px;
          background: rgba(34,211,238,.08);
          border: 1px solid rgba(34,211,238,.12);
        }

        .panel-title {
          margin: 0;
          color: #f8fafc;
          font-size: 17px;
          font-weight: 900;
        }

        .panel-subtitle {
          margin: 6px 0 0;
          color: #71839d;
          font-size: 11px;
          line-height: 1.8;
        }

        .small-badge {
          padding: 8px 11px;
          border-radius: 10px;
          color: #a5b4fc;
          background: rgba(99,102,241,.1);
          border: 1px solid rgba(99,102,241,.18);
          font-size: 10px;
          white-space: nowrap;
        }

        .broker-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
        }

        .broker-option {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          padding: 15px;
          color: #dbeafe;
          text-align: right;
          cursor: pointer;
          border: 1px solid rgba(148,163,184,.13);
          border-radius: 17px;
          background: rgba(255,255,255,.025);
          transition: .2s ease;
        }

        .broker-option:hover {
          border-color: rgba(34,211,238,.35);
          background: rgba(34,211,238,.045);
        }

        .broker-option.selected {
          border-color: rgba(34,211,238,.65);
          background:
            linear-gradient(
              135deg,
              rgba(6,182,212,.12),
              rgba(79,70,229,.1)
            );
          box-shadow: 0 0 25px rgba(34,211,238,.05);
        }

        .broker-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .broker-logo {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #67e8f9;
          background: rgba(34,211,238,.08);
          border: 1px solid rgba(34,211,238,.15);
          font-size: 12px;
          font-weight: 900;
        }

        .broker-option strong {
          display: block;
          font-size: 12px;
        }

        .broker-option span {
          display: block;
          margin-top: 5px;
          color: #71839d;
          font-size: 9px;
          line-height: 1.7;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 16px;
          margin-top: 22px;
        }

        .field {
          min-width: 0;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          display: block;
          margin-bottom: 9px;
          color: #b5c4d9;
          font-size: 11px;
          font-weight: 700;
        }

        .field input,
        .field select {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          color: #e2e8f0;
          outline: none;
          border: 1px solid rgba(148,163,184,.17);
          border-radius: 13px;
          background: rgba(2,8,23,.55);
          font: inherit;
          font-size: 12px;
          transition: .2s;
        }

        .field input:focus,
        .field select:focus {
          border-color: rgba(34,211,238,.6);
          box-shadow: 0 0 0 3px rgba(34,211,238,.06);
        }

        .field select option {
          color: #111827;
          background: white;
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper input {
          padding-left: 55px;
        }

        .password-toggle {
          position: absolute;
          left: 8px;
          top: 8px;
          width: 38px;
          height: 32px;
          color: #7dd3fc;
          border: 0;
          border-radius: 9px;
          background: rgba(34,211,238,.07);
          cursor: pointer;
        }

        .form-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 18px;
          padding: 13px;
          color: #8ca0bb;
          border-radius: 13px;
          background: rgba(148,163,184,.04);
          border: 1px solid rgba(148,163,184,.08);
          font-size: 10px;
          line-height: 2;
        }

        .form-note svg {
          flex-shrink: 0;
          color: #67e8f9;
          margin-top: 2px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 22px;
        }

        .button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 17px;
          border: 1px solid transparent;
          border-radius: 13px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: .2s;
        }

        .button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .button-primary {
          color: #03111d;
          background: linear-gradient(135deg,#67e8f9,#38bdf8);
          box-shadow: 0 8px 24px rgba(34,211,238,.12);
        }

        .button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(34,211,238,.2);
        }

        .button-secondary {
          color: #bae6fd;
          background: rgba(34,211,238,.06);
          border-color: rgba(34,211,238,.18);
        }

        .button-danger {
          color: #fda4af;
          background: rgba(244,63,94,.06);
          border-color: rgba(244,63,94,.18);
        }

        .account-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          padding: 16px;
          border-radius: 17px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(148,163,184,.1);
        }

        .status-content {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .status-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #86efac;
          background: rgba(34,197,94,.09);
        }

        .status-icon.offline {
          color: #fbbf24;
          background: rgba(245,158,11,.08);
        }

        .status-content strong {
          display: block;
          font-size: 12px;
        }

        .status-content span {
          display: block;
          margin-top: 5px;
          color: #71839d;
          font-size: 10px;
        }

        .details {
          display: grid;
          gap: 10px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid rgba(148,163,184,.08);
        }

        .detail-row:last-child {
          border-bottom: 0;
        }

        .detail-row span {
          color: #71839d;
          font-size: 11px;
        }

        .detail-row strong {
          max-width: 65%;
          overflow-wrap: anywhere;
          color: #dbeafe;
          font-size: 11px;
          text-align: left;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 11px;
          margin-top: 20px;
        }

        .metric {
          padding: 15px;
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 15px;
          background: rgba(255,255,255,.025);
        }

        .metric span {
          display: block;
          color: #71839d;
          font-size: 10px;
        }

        .metric strong {
          display: block;
          margin-top: 8px;
          color: #67e8f9;
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .feature-list {
          display: grid;
          gap: 11px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border: 1px solid rgba(148,163,184,.09);
          border-radius: 15px;
          background: rgba(255,255,255,.025);
        }

        .feature-check {
          width: 33px;
          height: 33px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: #67e8f9;
          border-radius: 10px;
          background: rgba(34,211,238,.08);
        }

        .feature-item strong {
          display: block;
          color: #dbeafe;
          font-size: 11px;
        }

        .feature-item span {
          display: block;
          margin-top: 4px;
          color: #71839d;
          font-size: 9px;
        }

        .security-box {
          margin-top: 20px;
          padding: 16px;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              rgba(34,197,94,.07),
              rgba(34,211,238,.04)
            );
          border: 1px solid rgba(34,197,94,.13);
        }

        .security-box h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #86efac;
          font-size: 12px;
        }

        .security-box p {
          margin: 9px 0 0;
          color: #8ca0bb;
          font-size: 10px;
          line-height: 2;
        }

        .toast {
          position: fixed;
          left: 24px;
          bottom: 24px;
          z-index: 20;
          max-width: min(390px, calc(100% - 48px));
          padding: 15px 18px;
          border-radius: 15px;
          box-shadow: 0 15px 45px rgba(0,0,0,.3);
          font-size: 11px;
          font-weight: 700;
          line-height: 1.9;
        }

        .toast.success {
          color: #bbf7d0;
          background: #123524;
          border: 1px solid #166534;
        }

        .toast.error {
          color: #fecdd3;
          background: #3b1721;
          border: 1px solid #9f1239;
        }

        .toast.info {
          color: #bae6fd;
          background: #102c42;
          border: 1px solid #075985;
        }

        .loading {
          color: #71839d;
          font-size: 11px;
        }

        @media (max-width: 1050px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .broker-options {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }
        }

        @media (max-width: 700px) {
          .broker-page {
            padding: 12px;
          }

          .broker-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 19px;
            border-radius: 20px;
          }

          .header-icon {
            width: 48px;
            height: 48px;
          }

          .header-description {
            font-size: 10px;
          }

          .panel {
            padding: 18px;
            border-radius: 20px;
          }

          .broker-options {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .actions {
            flex-direction: column;
          }

          .button {
            width: 100%;
          }

          .account-status {
            align-items: flex-start;
            flex-direction: column;
          }

          .detail-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .detail-row strong {
            max-width: 100%;
            text-align: right;
          }
        }

        @media (max-width: 430px) {
          .broker-options {
            grid-template-columns: 1fr;
          }

          .header-content {
            align-items: flex-start;
          }

          .metric-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="broker-container">
        <header className="broker-header">
          <div className="header-content">
            <div className="header-icon">
              <Icon name="link" size={29} />
            </div>

            <div>
              <h1 className="header-title">
                اتصال بروکر و متاتریدر
              </h1>

              <p className="header-description">
                حساب معاملاتی خود را به شکل امن به Trading AI متصل کنید.
              </p>
            </div>
          </div>

          <div
            className={`connection-badge ${
              status.connected ? "online" : "offline"
            }`}
          >
            <span className="status-circle" />

            {status.connected
              ? "حساب متصل است"
              : "حساب متصل نیست"}
          </div>
        </header>

        <div className="layout">
          <div className="stack">
            <section className="panel">
              <div className="panel-heading">
                <div className="heading-left">
                  <div className="heading-icon">
                    <Icon name="server" />
                  </div>

                  <div>
                    <h2 className="panel-title">
                      انتخاب بروکر
                    </h2>

                    <p className="panel-subtitle">
                      بروکر مورد استفاده خود را انتخاب کنید.
                    </p>
                  </div>
                </div>

                <span className="small-badge">
                  مرحله ۱
                </span>
              </div>

              <div className="broker-options">
                {BROKERS.map((broker) => (
                  <label
                    key={broker.id}
                    className={`broker-option ${
                      selectedBroker === broker.id
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="broker"
                      value={broker.id}
                      checked={selectedBroker === broker.id}
                      onChange={() =>
                        setSelectedBroker(broker.id)
                      }
                    />

                    <div className="broker-logo">
                      {broker.icon}
                    </div>

                    <div>
                      <strong>{broker.name}</strong>
                      <span>{broker.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="heading-left">
                  <div className="heading-icon">
                    <Icon name="plug" />
                  </div>

                  <div>
                    <h2 className="panel-title">
                      اطلاعات حساب معاملاتی
                    </h2>

                    <p className="panel-subtitle">
                      اطلاعات حساب MT4 یا MT5 خود را وارد کنید.
                    </p>
                  </div>
                </div>

                <span className="small-badge">
                  مرحله ۲
                </span>
              </div>

              <form onSubmit={handleConnect}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="platform">
                      پلتفرم معاملاتی
                    </label>

                    <select
                      id="platform"
                      value={platform}
                      onChange={(event) =>
                        setPlatform(
                          event.target.value as "MT4" | "MT5"
                        )
                      }
                    >
                      <option value="MT5">MetaTrader 5</option>
                      <option value="MT4">MetaTrader 4</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="accountNumber">
                      شماره حساب
                    </label>

                    <input
                      id="accountNumber"
                      type="text"
                      inputMode="numeric"
                      placeholder="مثلاً 12345678"
                      value={accountNumber}
                      onChange={(event) =>
                        setAccountNumber(event.target.value)
                      }
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="server">
                      نام سرور بروکر
                    </label>

                    <input
                      id="server"
                      type="text"
                      placeholder="مثلاً Broker-MT5Live"
                      value={server}
                      onChange={(event) =>
                        setServer(event.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="password">
                      رمز عبور معاملاتی
                    </label>

                    <div className="password-wrapper">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="رمز عبور حساب"
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        aria-label="نمایش یا مخفی کردن رمز"
                      >
                        {showPassword ? "◉" : "◌"}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="investorPassword">
                      رمز سرمایه‌گذار
                      <span
                        style={{
                          color: "#64748b",
                          marginRight: 5,
                        }}
                      >
                        اختیاری
                      </span>
                    </label>

                    <input
                      id="investorPassword"
                      type="password"
                      placeholder="در صورت وجود"
                      value={investorPassword}
                      onChange={(event) =>
                        setInvestorPassword(event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="form-note">
                  <Icon name="lock" size={17} />

                  <span>
                    اطلاعات حساس باید فقط در سمت سرور و به‌صورت رمزنگاری‌شده
                    ذخیره شوند. برای اتصال واقعی، API سرور باید اطلاعات را
                    اعتبارسنجی و اتصال را از طریق سرویس بروکر تأیید کند.
                  </span>
                </div>

                <div className="actions">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={submitting}
                  >
                    <Icon name="link" size={17} />

                    {submitting
                      ? "در حال اتصال..."
                      : "اتصال و تأیید حساب"}
                  </button>

                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleTestConnection}
                    disabled={testing || !status.connected}
                  >
                    <Icon name="activity" size={17} />

                    {testing
                      ? "در حال بررسی..."
                      : "تست اتصال فعلی"}
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="heading-left">
                  <div className="heading-icon">
                    <Icon name="activity" />
                  </div>

                  <div>
                    <h2 className="panel-title">
                      سرویس‌های قابل استفاده
                    </h2>

                    <p className="panel-subtitle">
                      قابلیت‌ها فقط پس از تأیید اتصال فعال می‌شوند.
                    </p>
                  </div>
                </div>
              </div>

              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="check" size={17} />
                  </div>

                  <div>
                    <strong>تحلیل هوشمند بازار</strong>
                    <span>
                      تحلیل داده‌های واقعی پس از اتصال معتبر
                    </span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="check" size={17} />
                  </div>

                  <div>
                    <strong>مدیریت ریسک</strong>
                    <span>
                      بررسی موجودی و محدودیت‌های حساب
                    </span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="check" size={17} />
                  </div>

                  <div>
                    <strong>گزارش معاملات</strong>
                    <span>
                      دریافت اطلاعات معاملات از سرویس متصل
                    </span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="check" size={17} />
                  </div>

                  <div>
                    <strong>آماده‌سازی ربات معاملاتی</strong>
                    <span>
                      فعال‌سازی فقط بعد از پیاده‌سازی سرویس اجرایی
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="stack">
            <section className="panel">
              <div className="panel-heading">
                <div className="heading-left">
                  <div className="heading-icon">
                    <Icon name="wallet" />
                  </div>

                  <div>
                    <h2 className="panel-title">
                      وضعیت حساب
                    </h2>

                    <p className="panel-subtitle">
                      اطلاعات دریافت‌شده از سرور
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-secondary"
                  style={{
                    minHeight: 35,
                    padding: "0 10px",
                  }}
                  onClick={loadStatus}
                  disabled={loading}
                >
                  <Icon name="refresh" size={15} />
                </button>
              </div>

              <div className="account-status">
                <div className="status-content">
                  <div
                    className={`status-icon ${
                      status.connected ? "" : "offline"
                    }`}
                  >
                    <Icon
                      name={status.connected ? "check" : "alert"}
                      size={20}
                    />
                  </div>

                  <div>
                    <strong>
                      {status.connected
                        ? "اتصال تأیید شده"
                        : "بدون اتصال فعال"}
                    </strong>

                    <span>
                      {loading
                        ? "در حال دریافت وضعیت..."
                        : status.connected
                        ? "حساب برای سرویس‌ها قابل بررسی است"
                        : "برای شروع، حساب خود را متصل کنید"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="details">
                <div className="detail-row">
                  <span>بروکر</span>
                  <strong>
                    {status.broker || "ثبت نشده"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>پلتفرم</span>
                  <strong>
                    {status.platform || "ثبت نشده"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>شماره حساب</span>
                  <strong>
                    {status.accountNumber || "ثبت نشده"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>سرور</span>
                  <strong>
                    {status.server || "ثبت نشده"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>نام حساب</span>
                  <strong>
                    {status.accountName || "ثبت نشده"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>آخرین همگام‌سازی</span>
                  <strong>
                    {status.lastSync || "ثبت نشده"}
                  </strong>
                </div>
              </div>

              <div className="metric-grid">
                <div className="metric">
                  <span>موجودی حساب</span>
                  <strong>
                    {formatMoney(
                      status.balance,
                      status.currency
                    )}
                  </strong>
                </div>

                <div className="metric">
                  <span>ارزش حساب</span>
                  <strong>
                    {formatMoney(
                      status.equity,
                      status.currency
                    )}
                  </strong>
                </div>
              </div>

              {status.connected && (
                <div className="actions">
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    <Icon name="disconnect" size={17} />

                    {disconnecting
                      ? "در حال قطع اتصال..."
                      : "قطع اتصال حساب"}
                  </button>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="heading-left">
                  <div className="heading-icon">
                    <Icon name="shield" />
                  </div>

                  <div>
                    <h2 className="panel-title">
                      امنیت اتصال
                    </h2>

                    <p className="panel-subtitle">
                      نکات مهم امنیتی حساب معاملاتی
                    </p>
                  </div>
                </div>
              </div>

              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="lock" size={16} />
                  </div>

                  <div>
                    <strong>رمزنگاری اطلاعات</strong>
                    <span>
                      اطلاعات حساس نباید در مرورگر ذخیره شوند.
                    </span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="shield" size={16} />
                  </div>

                  <div>
                    <strong>دسترسی محدود</strong>
                    <span>
                      برای تحلیل، از دسترسی سرمایه‌گذار استفاده کنید.
                    </span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-check">
                    <Icon name="activity" size={16} />
                  </div>

                  <div>
                    <strong>ثبت رویدادها</strong>
                    <span>
                      تلاش‌های اتصال باید در سرور ثبت و بررسی شوند.
                    </span>
                  </div>
                </div>
              </div>

              <div className="security-box">
                <h3>
                  <Icon name="shield" size={17} />
                  توصیه امنیتی
                </h3>

                <p>
                  رمز اصلی حساب خود را در اختیار افراد یا سرویس‌های ناشناس
                  قرار ندهید. پیش از فعال‌سازی معاملات خودکار، محدودیت ریسک
                  و سطح دسترسی را در سمت سرور تنظیم کنید.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}
