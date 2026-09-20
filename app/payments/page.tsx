import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

type IconName =
  | "wallet"
  | "check"
  | "star"
  | "shield"
  | "rocket"
  | "chart"
  | "bot"
  | "brain"
  | "telegram"
  | "support"
  | "arrow"
  | "lock"
  | "crown"
  | "clock"
  | "headset"
  | "sparkles"
  | "credit";

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

  const icons: Record<IconName, React.ReactNode> = {
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 9h18" />
        <path d="M16 14h3" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    rocket: (
      <>
        <path d="M14 4c3-2 6-1 6-1s1 3-1 6l-7 7-4-4 6-8Z" />
        <path d="m8 12-4 1-1 4 4-1" />
        <path d="m12 16-1 4 4-1 1-4" />
        <circle cx="16" cy="8" r="1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h17" />
        <path d="m7 15 4-5 3 2 5-7" />
      </>
    ),
    bot: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
        <path d="M2 11v5M22 11v5" />
      </>
    ),
    brain: (
      <>
        <path d="M9 4a3 3 0 0 0-5 2 3 3 0 0 0 0 5 3 3 0 0 0 2 5 3 3 0 0 0 5 3" />
        <path d="M15 4a3 3 0 0 1 5 2 3 3 0 0 1 0 5 3 3 0 0 1-2 5 3 3 0 0 1-5 3" />
        <path d="M12 4v16M8 8h4M12 12h4M8 16h4" />
      </>
    ),
    telegram: (
      <>
        <path d="m21 3-7.5 18-4-7-7-4L21 3Z" />
        <path d="m9.5 14 4-4" />
      </>
    ),
    support: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v-6h4" />
        <path d="M4 13H2v6h4v-6" />
        <path d="M9 21h6" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    crown: (
      <>
        <path d="m3 7 4 4 5-7 5 7 4-4-2 13H5L3 7Z" />
        <path d="M5 17h14" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    headset: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="2" y="13" width="5" height="7" rx="2" />
        <rect x="17" y="13" width="5" height="7" rx="2" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </>
    ),
    credit: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
}

const plans = [
  {
    id: "FREE",
    name: "رایگان",
    subtitle: "شروع هوشمندانه",
    price: "۰",
    period: "همیشه رایگان",
    icon: "shield" as IconName,
    color: "slate",
    description: "مناسب برای آشنایی با امکانات پایه پلتفرم",
    features: [
      "دسترسی به داشبورد اصلی",
      "مشاهده اطلاعات پایه بازار",
      "دسترسی به آموزش‌های عمومی",
      "پشتیبانی عمومی کاربران",
    ],
    button: "پلن فعلی شما",
    disabled: true,
  },
  {
    id: "VIP",
    name: "VIP",
    subtitle: "برای معامله‌گران حرفه‌ای",
    price: "تماس",
    period: "برای دریافت قیمت",
    icon: "crown" as IconName,
    color: "cyan",
    popular: true,
    description: "امکانات حرفه‌ای برای تحلیل و مدیریت معاملات",
    features: [
      "تمام امکانات پلن رایگان",
      "تحلیل پیشرفته AI",
      "دسترسی به ربات‌های معاملاتی",
      "سیگنال‌ها و هشدارهای هوشمند",
      "امکان اتصال به تلگرام",
      "پشتیبانی تخصصی",
    ],
    button: "درخواست خرید VIP",
    disabled: false,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    subtitle: "تجربه کامل Trading AI",
    price: "تماس",
    period: "برای دریافت قیمت",
    icon: "rocket" as IconName,
    color: "purple",
    description: "راهکار کامل برای استفاده گسترده از ابزارهای پلتفرم",
    features: [
      "تمام امکانات پلن VIP",
      "ابزارهای پیشرفته مدیریت ربات",
      "تنظیمات تخصصی تحلیل بازار",
      "اولویت در پشتیبانی",
      "امکانات توسعه‌یافته آینده",
      "بررسی اختصاصی نیازهای کاربر",
    ],
    button: "درخواست ارتقای حساب",
    disabled: false,
  },
];

export default async function PaymentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const currentPlan = String(user.plan || "FREE").toUpperCase();

  return (
    <main dir="rtl" className="payments-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        :root {
          color-scheme: dark;
        }

        body {
          margin: 0;
          background: #050b18;
        }

        .payments-page {
          min-height: 100vh;
          padding: 24px;
          color: #f8fafc;
          font-family: Tahoma, Arial, sans-serif;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(14, 165, 233, .17),
              transparent 30%
            ),
            radial-gradient(
              circle at 0% 75%,
              rgba(124, 58, 237, .15),
              transparent 32%
            ),
            linear-gradient(145deg, #050b18, #091525 55%, #060d1b);
        }

        .payments-container {
          width: min(1450px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 22px;
          margin-bottom: 22px;
          border: 1px solid rgba(148, 163, 184, .14);
          border-radius: 24px;
          background: rgba(10, 23, 42, .72);
          backdrop-filter: blur(22px);
          box-shadow: 0 20px 70px rgba(0, 0, 0, .18);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          text-decoration: none;
        }

        .brand-logo {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          background: linear-gradient(135deg, #06b6d4, #2563eb);
          box-shadow: 0 12px 35px rgba(6, 182, 212, .24);
        }

        .brand-name {
          font-size: 18px;
          font-weight: 900;
        }

        .brand-caption {
          margin-top: 5px;
          color: #71839b;
          font-size: 10px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .top-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border: 1px solid rgba(148, 163, 184, .14);
          border-radius: 13px;
          color: #a9b8cb;
          background: rgba(255, 255, 255, .035);
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
          transition: .2s ease;
        }

        .top-link:hover {
          color: #fff;
          border-color: rgba(34, 211, 238, .35);
          transform: translateY(-2px);
        }

        .user-avatar {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #fff;
          font-weight: 900;
          background: linear-gradient(135deg, #0e7490, #4338ca);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 20px 4px;
          color: #71839b;
          font-size: 11px;
        }

        .breadcrumb a {
          color: #67e8f9;
          text-decoration: none;
        }

        .hero {
          position: relative;
          overflow: hidden;
          padding: 36px;
          margin-bottom: 20px;
          border: 1px solid rgba(34, 211, 238, .17);
          border-radius: 30px;
          background:
            linear-gradient(
              135deg,
              rgba(8, 47, 73, .9),
              rgba(15, 23, 42, .92)
            );
          box-shadow: 0 25px 80px rgba(0, 0, 0, .18);
        }

        .hero::before {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          left: -180px;
          top: -190px;
          border-radius: 50%;
          background: rgba(6, 182, 212, .13);
          filter: blur(35px);
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 850px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border: 1px solid rgba(103, 232, 249, .18);
          border-radius: 999px;
          color: #67e8f9;
          background: rgba(34, 211, 238, .08);
          font-size: 10px;
          font-weight: 700;
        }

        .hero h1 {
          margin: 19px 0 12px;
          color: #fff;
          font-size: clamp(28px, 4vw, 46px);
          line-height: 1.5;
          font-weight: 900;
        }

        .hero p {
          margin: 0;
          color: #a2b2c6;
          font-size: 13px;
          line-height: 2.2;
        }

        .account-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          padding: 19px;
          border: 1px solid rgba(148, 163, 184, .12);
          border-radius: 21px;
          background: rgba(10, 23, 42, .75);
          backdrop-filter: blur(18px);
        }

        .summary-icon {
          width: 45px;
          height: 45px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #67e8f9;
          background: rgba(34, 211, 238, .09);
        }

        .summary-label {
          color: #71839b;
          font-size: 10px;
        }

        .summary-value {
          margin-top: 7px;
          color: #f8fafc;
          font-size: 15px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin: 32px 3px 17px;
        }

        .section-heading h2 {
          margin: 0;
          color: #fff;
          font-size: 21px;
          font-weight: 900;
        }

        .section-heading p {
          margin: 8px 0 0;
          color: #71839b;
          font-size: 11px;
          line-height: 1.8;
        }

        .secure-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 12px;
          color: #86efac;
          background: rgba(34, 197, 94, .07);
          border: 1px solid rgba(34, 197, 94, .12);
          font-size: 10px;
          font-weight: 700;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .plan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 25px;
          border: 1px solid rgba(148, 163, 184, .13);
          border-radius: 26px;
          background: rgba(10, 23, 42, .8);
          box-shadow: 0 20px 60px rgba(0, 0, 0, .13);
          transition: .25s ease;
        }

        .plan-card:hover {
          transform: translateY(-5px);
          border-color: rgba(34, 211, 238, .3);
          box-shadow: 0 25px 75px rgba(0, 0, 0, .24);
        }

        .plan-card.popular {
          border-color: rgba(34, 211, 238, .4);
          background:
            linear-gradient(
              160deg,
              rgba(8, 47, 73, .88),
              rgba(10, 23, 42, .94)
            );
        }

        .popular-label {
          position: absolute;
          top: 17px;
          left: 17px;
          padding: 7px 10px;
          border-radius: 9px;
          color: #082f49;
          background: #67e8f9;
          font-size: 9px;
          font-weight: 900;
        }

        .plan-top {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 21px;
        }

        .plan-icon {
          width: 53px;
          height: 53px;
          display: grid;
          place-items: center;
          border-radius: 17px;
        }

        .plan-icon.slate {
          color: #cbd5e1;
          background: rgba(148, 163, 184, .11);
        }

        .plan-icon.cyan {
          color: #67e8f9;
          background: rgba(34, 211, 238, .11);
        }

        .plan-icon.purple {
          color: #d8b4fe;
          background: rgba(168, 85, 247, .12);
        }

        .plan-name {
          color: #fff;
          font-size: 18px;
          font-weight: 900;
        }

        .plan-subtitle {
          margin-top: 5px;
          color: #71839b;
          font-size: 10px;
        }

        .plan-description {
          min-height: 43px;
          margin: 0 0 21px;
          color: #91a3b8;
          font-size: 11px;
          line-height: 2;
        }

        .price-box {
          padding: 18px;
          margin-bottom: 20px;
          border: 1px solid rgba(148, 163, 184, .09);
          border-radius: 17px;
          background: rgba(255, 255, 255, .025);
        }

        .price {
          color: #fff;
          font-size: 25px;
          font-weight: 900;
        }

        .price-period {
          margin-top: 7px;
          color: #71839b;
          font-size: 10px;
        }

        .features {
          display: grid;
          gap: 13px;
          margin-bottom: 25px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: #b7c4d4;
          font-size: 11px;
          line-height: 1.8;
        }

        .feature-check {
          flex-shrink: 0;
          color: #34d399;
          margin-top: 2px;
        }

        .plan-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 47px;
          margin-top: auto;
          border-radius: 14px;
          color: #fff;
          background: linear-gradient(135deg, #0891b2, #2563eb);
          box-shadow: 0 12px 28px rgba(37, 99, 235, .17);
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          transition: .2s ease;
        }

        .plan-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(37, 99, 235, .3);
        }

        .plan-button.disabled {
          cursor: default;
          color: #86efac;
          background: rgba(34, 197, 94, .08);
          border: 1px solid rgba(34, 197, 94, .14);
          box-shadow: none;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 18px;
          margin-top: 25px;
        }

        .panel {
          min-width: 0;
          padding: 25px;
          border: 1px solid rgba(148, 163, 184, .12);
          border-radius: 24px;
          background: rgba(10, 23, 42, .75);
        }

        .panel h2 {
          margin: 0;
          color: #fff;
          font-size: 17px;
          font-weight: 900;
        }

        .panel-description {
          margin: 8px 0 21px;
          color: #71839b;
          font-size: 11px;
          line-height: 1.9;
        }

        .security-list {
          display: grid;
          gap: 11px;
        }

        .security-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(148, 163, 184, .08);
          border-radius: 15px;
          background: rgba(255, 255, 255, .025);
        }

        .security-item-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 12px;
          color: #67e8f9;
          background: rgba(34, 211, 238, .08);
        }

        .security-item strong {
          display: block;
          color: #e2e8f0;
          font-size: 11px;
        }

        .security-item span {
          display: block;
          margin-top: 5px;
          color: #71839b;
          font-size: 9px;
          line-height: 1.7;
        }

        .faq-list {
          display: grid;
          gap: 11px;
        }

        .faq-item {
          padding: 15px;
          border: 1px solid rgba(148, 163, 184, .08);
          border-radius: 15px;
          background: rgba(255, 255, 255, .025);
        }

        .faq-item strong {
          display: block;
          color: #e2e8f0;
          font-size: 11px;
        }

        .faq-item p {
          margin: 8px 0 0;
          color: #71839b;
          font-size: 10px;
          line-height: 2;
        }

        .support-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 22px;
          padding: 25px;
          border: 1px solid rgba(34, 211, 238, .14);
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(6, 182, 212, .09),
              rgba(37, 99, 235, .06)
            );
        }

        .support-content {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .support-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 15px;
          color: #67e8f9;
          background: rgba(34, 211, 238, .09);
        }

        .support-content strong {
          display: block;
          color: #fff;
          font-size: 14px;
        }

        .support-content p {
          margin: 7px 0 0;
          color: #71839b;
          font-size: 10px;
          line-height: 1.9;
        }

        .support-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 150px;
          padding: 13px 17px;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(135deg, #0891b2, #2563eb);
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 24px 4px 5px;
          color: #52647b;
          font-size: 10px;
        }

        .footer-links {
          display: flex;
          gap: 15px;
        }

        .footer a {
          color: #71839b;
          text-decoration: none;
        }

        .footer a:hover {
          color: #67e8f9;
        }

        @media (max-width: 1100px) {
          .plans-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .plan-card:last-child {
            grid-column: 1 / -1;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .payments-page {
            padding: 12px;
          }

          .topbar {
            padding: 14px;
            border-radius: 19px;
          }

          .brand-name {
            font-size: 15px;
          }

          .brand-caption {
            font-size: 9px;
          }

          .top-link span {
            display: none;
          }

          .top-link {
            padding: 10px;
          }

          .hero {
            padding: 24px;
            border-radius: 22px;
          }

          .hero h1 {
            font-size: 28px;
          }

          .hero p {
            font-size: 11px;
          }

          .account-summary {
            grid-template-columns: 1fr;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .plans-grid {
            grid-template-columns: 1fr;
          }

          .plan-card:last-child {
            grid-column: auto;
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .support-banner {
            align-items: flex-start;
            flex-direction: column;
          }

          .support-button {
            width: 100%;
          }

          .footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 430px) {
          .hero h1 {
            font-size: 24px;
          }

          .panel,
          .plan-card {
            padding: 19px;
          }

          .support-content {
            align-items: flex-start;
          }

          .support-content strong {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="payments-container">
        <header className="topbar">
          <Link href="/dashboard" className="brand">
            <div className="brand-logo">AI</div>

            <div>
              <div className="brand-name">Trading AI</div>
              <div className="brand-caption">
                Smart Trading Platform
              </div>
            </div>
          </Link>

          <div className="top-actions">
            <Link href="/dashboard" className="top-link">
              <Icon name="chart" size={16} />
              <span>داشبورد</span>
            </Link>

            <Link href="/support" className="top-link">
              <Icon name="headset" size={16} />
              <span>پشتیبانی</span>
            </Link>

            <div className="user-avatar">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <div className="breadcrumb">
          <Link href="/dashboard">داشبورد</Link>
          <span>/</span>
          <span>اشتراک و پرداخت</span>
        </div>

        <section className="hero">
          <div className="hero-content">
            <span className="hero-badge">
              <Icon name="sparkles" size={14} />
              مدیریت اشتراک هوشمند
            </span>

            <h1>
              پلن مناسب خودت را
              <br />
              برای معامله حرفه‌ای انتخاب کن
            </h1>

            <p>
              امکانات Trading AI را متناسب با نیاز خودت انتخاب کن.
              برای خرید یا ارتقای پلن، درخواست خود را از طریق
              مرکز پشتیبانی ارسال کن تا مراحل فعال‌سازی و پرداخت
              به صورت امن با شما هماهنگ شود.
            </p>
          </div>
        </section>

        <section className="account-summary">
          <div className="summary-card">
            <div className="summary-icon">
              <Icon name="wallet" size={22} />
            </div>

            <div>
              <div className="summary-label">کاربر حساب</div>
              <div className="summary-value">{user.name}</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <Icon name="crown" size={22} />
            </div>

            <div>
              <div className="summary-label">پلن فعلی</div>
              <div className="summary-value">{currentPlan}</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <Icon name="shield" size={22} />
            </div>

            <div>
              <div className="summary-label">وضعیت حساب</div>
              <div className="summary-value">فعال</div>
            </div>
          </div>
        </section>

        <div className="section-heading">
          <div>
            <h2>انتخاب پلن اشتراک</h2>
            <p>
              پلن موردنظر خود را انتخاب و برای فعال‌سازی درخواست ارسال کنید.
            </p>
          </div>

          <div className="secure-label">
            <Icon name="shield" size={15} />
            ارتباط امن با پشتیبانی
          </div>
        </div>

        <section className="plans-grid">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;

            return (
              <article
                key={plan.id}
                className={`plan-card ${
                  plan.popular ? "popular" : ""
                }`}
              >
                {plan.popular && (
                  <div className="popular-label">
                    پیشنهاد ویژه
                  </div>
                )}

                <div className="plan-top">
                  <div className={`plan-icon ${plan.color}`}>
                    <Icon name={plan.icon} size={25} />
                  </div>

                  <div>
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-subtitle">
                      {plan.subtitle}
                    </div>
                  </div>
                </div>

                <p className="plan-description">
                  {plan.description}
                </p>

                <div className="price-box">
                  <div className="price">{plan.price}</div>
                  <div className="price-period">{plan.period}</div>
                </div>

                <div className="features">
                  {plan.features.map((feature) => (
                    <div className="feature-item" key={feature}>
                      <span className="feature-check">
                        <Icon name="check" size={15} />
                      </span>

                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {isCurrent || plan.disabled ? (
                  <div className="plan-button disabled">
                    <Icon name="check" size={16} />
                    {isCurrent ? "پلن فعلی شما" : plan.button}
                  </div>
                ) : (
                  <Link
                    href={`/support?subject=${encodeURIComponent(
                      `درخواست خرید یا ارتقای پلن ${plan.name}`
                    )}`}
                    className="plan-button"
                  >
                    {plan.button}
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        <section className="bottom-grid">
          <div className="panel">
            <h2>امنیت و شفافیت پرداخت</h2>

            <p className="panel-description">
              پیش از هرگونه پرداخت، جزئیات فعال‌سازی و مبلغ نهایی
              از طریق پشتیبانی با شما هماهنگ خواهد شد.
            </p>

            <div className="security-list">
              <div className="security-item">
                <div className="security-item-icon">
                  <Icon name="shield" size={19} />
                </div>

                <div>
                  <strong>هماهنگی قبل از پرداخت</strong>
                  <span>
                    هیچ مبلغی بدون هماهنگی و تأیید شما دریافت نمی‌شود.
                  </span>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Icon name="lock" size={19} />
                </div>

                <div>
                  <strong>حفاظت از اطلاعات حساب</strong>
                  <span>
                    اطلاعات ورود و رمز عبور خود را برای دیگران ارسال نکنید.
                  </span>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Icon name="credit" size={19} />
                </div>

                <div>
                  <strong>تأیید وضعیت اشتراک</strong>
                  <span>
                    پس از بررسی درخواست، وضعیت پلن توسط پشتیبانی اعلام می‌شود.
                  </span>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Icon name="clock" size={19} />
                </div>

                <div>
                  <strong>پیگیری درخواست</strong>
                  <span>
                    می‌توانید درخواست خرید یا ارتقای خود را از بخش پشتیبانی
                    پیگیری کنید.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>سؤالات متداول</h2>

            <p className="panel-description">
              پاسخ چند سؤال مهم درباره اشتراک و فعال‌سازی حساب
            </p>

            <div className="faq-list">
              <div className="faq-item">
                <strong>چطور پلن خود را ارتقا دهم؟</strong>
                <p>
                  روی گزینه درخواست خرید پلن موردنظر کلیک کنید و درخواست خود
                  را برای پشتیبانی ارسال کنید.
                </p>
              </div>

              <div className="faq-item">
                <strong>آیا پرداخت به صورت خودکار انجام می‌شود؟</strong>
                <p>
                  خیر. در این مرحله درخواست شما از طریق پشتیبانی بررسی و
                  مراحل پرداخت با شما هماهنگ می‌شود.
                </p>
              </div>

              <div className="faq-item">
                <strong>آیا امکان بازگشت به پلن قبلی وجود دارد؟</strong>
                <p>
                  شرایط تغییر پلن باید با توجه به وضعیت حساب از پشتیبانی
                  استعلام شود.
                </p>
              </div>

              <div className="faq-item">
                <strong>برای فعال‌سازی چه کاری انجام دهم؟</strong>
                <p>
                  پس از ارسال درخواست، اطلاعات لازم و مراحل بعدی توسط
                  تیم پشتیبانی اعلام خواهد شد.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="support-banner">
          <div className="support-content">
            <div className="support-icon">
              <Icon name="headset" size={23} />
            </div>

            <div>
              <strong>برای خرید یا ارتقا به کمک نیاز داری؟</strong>

              <p>
                درخواست خود را ارسال کن تا تیم پشتیبانی راهنمایی‌ات کند.
              </p>
            </div>
          </div>

          <Link href="/support" className="support-button">
            ارتباط با پشتیبانی
            <Icon name="arrow" size={16} />
          </Link>
        </section>

        <footer className="footer">
          <span>
            © {new Date().getFullYear()} Trading AI
          </span>

          <div className="footer-links">
            <Link href="/dashboard">داشبورد</Link>
            <Link href="/settings">تنظیمات</Link>
            <Link href="/support">پشتیبانی</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
