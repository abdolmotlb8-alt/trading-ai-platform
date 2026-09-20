"use client";

import { useEffect, useMemo, useState } from "react";

type Importance = "HIGH" | "MEDIUM" | "LOW";
type NewsStatus = "UPCOMING" | "RELEASED";

type EconomicEvent = {
  id: number;
  time: string;
  date: string;
  country: string;
  currency: string;
  flag: string;
  title: string;
  description: string;
  importance: Importance;
  status: NewsStatus;
  previous: string;
  forecast: string;
  actual: string;
  affected: string[];
};

const EVENTS: EconomicEvent[] = [
  {
    id: 1,
    time: "14:30",
    date: "امروز",
    country: "United States",
    currency: "USD",
    flag: "🇺🇸",
    title: "CPI - تورم مصرف‌کننده آمریکا",
    description:
      "شاخص مهم تورم مصرف‌کننده آمریکا که می‌تواند روی دلار، طلا و بازارهای مالی اثرگذار باشد.",
    importance: "HIGH",
    status: "UPCOMING",
    previous: "2.7%",
    forecast: "2.6%",
    actual: "—",
    affected: ["XAUUSD", "EURUSD", "USDJPY"],
  },
  {
    id: 2,
    time: "16:00",
    date: "امروز",
    country: "Euro Area",
    currency: "EUR",
    flag: "🇪🇺",
    title: "GDP - تولید ناخالص داخلی",
    description:
      "گزارش رشد اقتصادی منطقه یورو و یکی از داده‌های مهم برای ارزیابی وضعیت اقتصاد اروپا.",
    importance: "HIGH",
    status: "UPCOMING",
    previous: "0.3%",
    forecast: "0.4%",
    actual: "—",
    affected: ["EURUSD", "XAUUSD"],
  },
  {
    id: 3,
    time: "17:30",
    date: "امروز",
    country: "United Kingdom",
    currency: "GBP",
    flag: "🇬🇧",
    title: "نرخ بیکاری بریتانیا",
    description:
      "داده اشتغال بریتانیا که برای ارزیابی وضعیت بازار کار و سیاست پولی اهمیت دارد.",
    importance: "MEDIUM",
    status: "UPCOMING",
    previous: "4.3%",
    forecast: "4.2%",
    actual: "—",
    affected: ["GBPUSD", "EURGBP"],
  },
  {
    id: 4,
    time: "18:00",
    date: "امروز",
    country: "United States",
    currency: "USD",
    flag: "🇺🇸",
    title: "Initial Jobless Claims",
    description:
      "آمار مدعیان بیکاری اولیه آمریکا و یکی از داده‌های مورد توجه بازار کار.",
    importance: "MEDIUM",
    status: "UPCOMING",
    previous: "228K",
    forecast: "225K",
    actual: "—",
    affected: ["XAUUSD", "USDJPY", "EURUSD"],
  },
  {
    id: 5,
    time: "19:00",
    date: "امروز",
    country: "United States",
    currency: "USD",
    flag: "🇺🇸",
    title: "سخنرانی عضو فدرال رزرو",
    description:
      "سخنرانی یک مقام فدرال رزرو که ممکن است شامل اظهارنظر درباره سیاست پولی باشد.",
    importance: "LOW",
    status: "UPCOMING",
    previous: "—",
    forecast: "—",
    actual: "—",
    affected: ["XAUUSD", "EURUSD"],
  },
  {
    id: 6,
    time: "10:00",
    date: "فردا",
    country: "Japan",
    currency: "JPY",
    flag: "🇯🇵",
    title: "Consumer Confidence",
    description:
      "شاخص اعتماد مصرف‌کننده ژاپن.",
    importance: "LOW",
    status: "UPCOMING",
    previous: "36.7",
    forecast: "37.0",
    actual: "—",
    affected: ["USDJPY"],
  },
  {
    id: 7,
    time: "12:00",
    date: "فردا",
    country: "United Kingdom",
    currency: "GBP",
    flag: "🇬🇧",
    title: "Retail Sales",
    description:
      "آمار خرده‌فروشی بریتانیا.",
    importance: "MEDIUM",
    status: "UPCOMING",
    previous: "0.4%",
    forecast: "0.3%",
    actual: "—",
    affected: ["GBPUSD", "EURGBP"],
  },
  {
    id: 8,
    time: "15:30",
    date: "فردا",
    country: "United States",
    currency: "USD",
    flag: "🇺🇸",
    title: "Core Retail Sales",
    description:
      "داده خرده‌فروشی هسته آمریکا، بدون برخی اقلام پرنوسان.",
    importance: "HIGH",
    status: "UPCOMING",
    previous: "0.5%",
    forecast: "0.4%",
    actual: "—",
    affected: ["XAUUSD", "EURUSD", "USDJPY"],
  },
];

const CURRENCIES = ["ALL", "USD", "EUR", "GBP", "JPY"];

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function importanceLabel(value: Importance) {
  if (value === "HIGH") return "اهمیت بالا";
  if (value === "MEDIUM") return "اهمیت متوسط";
  return "اهمیت کم";
}

function importanceClass(value: Importance) {
  if (value === "HIGH") return "high";
  if (value === "MEDIUM") return "medium";
  return "low";
}

export default function NewsPage() {
  const [selectedImportance, setSelectedImportance] =
    useState<"ALL" | Importance>("ALL");

  const [selectedCurrency, setSelectedCurrency] =
    useState("ALL");

  const [search, setSearch] = useState("");

  const [selectedEvent, setSelectedEvent] =
    useState<EconomicEvent | null>(null);

  const [newsFilter, setNewsFilter] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(false);
  const [marketRisk, setMarketRisk] = useState(true);

  const [alert15, setAlert15] = useState(true);
  const [alert30, setAlert30] = useState(true);
  const [alert60, setAlert60] = useState(false);
  const [alert180, setAlert180] = useState(false);

  const [countdown, setCountdown] = useState(2 * 3600 + 45 * 60 + 17);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value <= 0) return 0;
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return EVENTS.filter((event) => {
      const matchesImportance =
        selectedImportance === "ALL" ||
        event.importance === selectedImportance;

      const matchesCurrency =
        selectedCurrency === "ALL" ||
        event.currency === selectedCurrency;

      const matchesSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.currency.toLowerCase().includes(query) ||
        event.country.toLowerCase().includes(query);

      return (
        matchesImportance &&
        matchesCurrency &&
        matchesSearch
      );
    });
  }, [selectedImportance, selectedCurrency, search]);

  const nextImportantEvent =
    EVENTS.find((event) => event.importance === "HIGH") ??
    EVENTS[0];

  return (
    <main dir="rtl" className="news-page">
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
            Arial,
            Tahoma,
            sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .news-page {
          min-height: 100vh;
          color: #f8fafc;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(14, 165, 233, 0.14),
              transparent 28%
            ),
            radial-gradient(
              circle at 15% 30%,
              rgba(99, 102, 241, 0.09),
              transparent 25%
            ),
            linear-gradient(
              135deg,
              #020617 0%,
              #07111f 48%,
              #020617 100%
            );
          padding: 22px;
        }

        .news-shell {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .topbar {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 15px 18px;
          margin-bottom: 18px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 24px;
          background: rgba(7, 15, 28, 0.78);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 210px;
        }

        .brand-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(34, 211, 238, 0.2),
              rgba(59, 130, 246, 0.12)
            );
          border: 1px solid rgba(34, 211, 238, 0.3);
          box-shadow: 0 0 25px rgba(34, 211, 238, 0.08);
          font-size: 22px;
        }

        .brand strong {
          display: block;
          font-size: 17px;
          letter-spacing: 0.2px;
        }

        .brand span {
          display: block;
          color: #64748b;
          font-size: 11px;
          margin-top: 4px;
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex: 1;
        }

        .nav-button {
          border: 0;
          color: #94a3b8;
          background: transparent;
          padding: 10px 13px;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .nav-button:hover,
        .nav-button.active {
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .icon-button {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          border: 1px solid rgba(148, 163, 184, 0.13);
          background: rgba(15, 23, 42, 0.7);
          color: #cbd5e1;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .icon-button:hover {
          border-color: rgba(34, 211, 238, 0.35);
          color: #67e8f9;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border-radius: 13px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.18);
          color: #86efac;
          font-size: 12px;
          white-space: nowrap;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.85fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .hero-main,
        .next-event {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.92),
              rgba(5, 15, 29, 0.9)
            );
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.25);
        }

        .hero-main {
          padding: 30px;
        }

        .hero-main::before {
          content: "";
          position: absolute;
          width: 300px;
          height: 300px;
          left: -120px;
          top: -170px;
          background: rgba(34, 211, 238, 0.1);
          filter: blur(70px);
          border-radius: 50%;
        }

        .eyebrow {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.08);
          color: #67e8f9;
          border: 1px solid rgba(34, 211, 238, 0.17);
          font-size: 12px;
          font-weight: 700;
        }

        .hero-title {
          position: relative;
          margin: 17px 0 9px;
          font-size: clamp(25px, 3vw, 38px);
          line-height: 1.3;
          letter-spacing: -0.7px;
        }

        .hero-description {
          position: relative;
          max-width: 720px;
          color: #94a3b8;
          line-height: 1.9;
          font-size: 14px;
          margin: 0;
        }

        .market-summary {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 25px;
        }

        .summary-card {
          min-height: 88px;
          padding: 14px;
          border-radius: 17px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(15, 23, 42, 0.6);
        }

        .summary-label {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 10px;
        }

        .summary-value {
          font-weight: 800;
          font-size: 16px;
        }

        .summary-green {
          color: #4ade80;
        }

        .summary-yellow {
          color: #facc15;
        }

        .next-event {
          padding: 24px;
          background:
            radial-gradient(
              circle at 90% 10%,
              rgba(239, 68, 68, 0.13),
              transparent 38%
            ),
            linear-gradient(
              145deg,
              rgba(30, 41, 59, 0.95),
              rgba(8, 15, 29, 0.96)
            );
        }

        .event-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .danger-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .event-country {
          color: #94a3b8;
          font-size: 12px;
        }

        .next-event h2 {
          margin: 22px 0 8px;
          font-size: 21px;
          line-height: 1.5;
        }

        .event-subtitle {
          color: #64748b;
          font-size: 12px;
          line-height: 1.8;
          min-height: 44px;
        }

        .countdown {
          margin: 20px 0;
          padding: 17px;
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.55);
          border: 1px solid rgba(239, 68, 68, 0.12);
          text-align: center;
        }

        .countdown-label {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 7px;
        }

        .countdown-value {
          direction: ltr;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #f8fafc;
        }

        .event-meta {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .tag {
          padding: 6px 9px;
          border-radius: 8px;
          background: rgba(148, 163, 184, 0.08);
          color: #cbd5e1;
          font-size: 11px;
        }

        .tag.high {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }

        .tag.currency {
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
        }

        .control-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .panel {
          border: 1px solid rgba(148, 163, 184, 0.11);
          border-radius: 24px;
          background: rgba(8, 17, 31, 0.8);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.18);
        }

        .control-panel {
          padding: 19px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .panel-title h3 {
          margin: 0;
          font-size: 15px;
        }

        .panel-title span {
          color: #64748b;
          font-size: 11px;
        }

        .search-box {
          position: relative;
        }

        .search-box input {
          width: 100%;
          height: 44px;
          border-radius: 13px;
          border: 1px solid rgba(148, 163, 184, 0.13);
          outline: none;
          background: rgba(15, 23, 42, 0.7);
          color: #f8fafc;
          padding: 0 43px 0 13px;
        }

        .search-box input:focus {
          border-color: rgba(34, 211, 238, 0.4);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.05);
        }

        .search-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .filter-button {
          padding: 8px 11px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.11);
          color: #94a3b8;
          background: rgba(15, 23, 42, 0.65);
          cursor: pointer;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .filter-button:hover,
        .filter-button.active {
          color: #67e8f9;
          border-color: rgba(34, 211, 238, 0.3);
          background: rgba(34, 211, 238, 0.08);
        }

        .toggle-list {
          display: grid;
          gap: 9px;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 11px;
          border-radius: 13px;
          background: rgba(15, 23, 42, 0.52);
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .toggle-info strong {
          display: block;
          font-size: 12px;
        }

        .toggle-info span {
          display: block;
          color: #64748b;
          font-size: 10px;
          margin-top: 4px;
        }

        .switch {
          position: relative;
          width: 43px;
          height: 24px;
          flex: 0 0 auto;
        }

        .switch input {
          display: none;
        }

        .slider {
          position: absolute;
          inset: 0;
          cursor: pointer;
          border-radius: 999px;
          background: #1e293b;
          transition: 0.2s ease;
          border: 1px solid rgba(148, 163, 184, 0.14);
        }

        .slider::before {
          content: "";
          position: absolute;
          width: 17px;
          height: 17px;
          top: 2px;
          right: 3px;
          border-radius: 50%;
          background: #94a3b8;
          transition: 0.2s ease;
        }

        .switch input:checked + .slider {
          background: rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.35);
        }

        .switch input:checked + .slider::before {
          transform: translateX(-18px);
          background: #4ade80;
          box-shadow: 0 0 12px rgba(74, 222, 128, 0.5);
        }

        .calendar-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(290px, 0.75fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .calendar-panel {
          overflow: hidden;
        }

        .calendar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.09);
        }

        .calendar-title h2 {
          margin: 0;
          font-size: 18px;
        }

        .calendar-title p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .date-controls {
          display: flex;
          gap: 7px;
        }

        .date-button {
          padding: 8px 11px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          color: #94a3b8;
          background: rgba(15, 23, 42, 0.65);
          cursor: pointer;
          font-size: 11px;
        }

        .date-button.active {
          color: #67e8f9;
          border-color: rgba(34, 211, 238, 0.25);
          background: rgba(34, 211, 238, 0.07);
        }

        .events {
          display: grid;
        }

        .event-row {
          display: grid;
          grid-template-columns: 74px 48px minmax(180px, 1.6fr) 85px 80px 90px;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.06);
          transition: 0.2s ease;
        }

        .event-row:hover {
          background: rgba(34, 211, 238, 0.025);
        }

        .event-time {
          direction: ltr;
          color: #e2e8f0;
          font-weight: 800;
          font-size: 13px;
        }

        .event-flag {
          font-size: 23px;
          text-align: center;
        }

        .event-name strong {
          display: block;
          font-size: 13px;
          line-height: 1.6;
        }

        .event-name span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .impact {
          display: inline-flex;
          width: fit-content;
          padding: 6px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
        }

        .impact.high {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }

        .impact.medium {
          color: #fde68a;
          background: rgba(245, 158, 11, 0.1);
        }

        .impact.low {
          color: #86efac;
          background: rgba(34, 197, 94, 0.08);
        }

        .forecast {
          color: #cbd5e1;
          font-size: 11px;
          direction: ltr;
        }

        .event-action {
          display: flex;
          justify-content: flex-start;
        }

        .details-button {
          border: 1px solid rgba(34, 211, 238, 0.16);
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.05);
          border-radius: 9px;
          padding: 7px 9px;
          cursor: pointer;
          font-size: 10px;
        }

        .side-stack {
          display: grid;
          gap: 18px;
        }

        .risk-panel {
          padding: 21px;
        }

        .risk-score {
          display: flex;
          align-items: center;
          gap: 17px;
          margin: 18px 0;
        }

        .risk-circle {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              #07111f 56%,
              transparent 57%
            ),
            conic-gradient(
              #f59e0b 0deg,
              #f59e0b 155deg,
              #1e293b 155deg,
              #1e293b 360deg
            );
          box-shadow: 0 0 30px rgba(245, 158, 11, 0.08);
        }

        .risk-circle strong {
          font-size: 21px;
        }

        .risk-circle span {
          font-size: 9px;
          color: #64748b;
          display: block;
          text-align: center;
        }

        .risk-text strong {
          display: block;
          font-size: 16px;
        }

        .risk-text span {
          display: block;
          margin-top: 5px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.7;
        }

        .risk-bars {
          display: grid;
          gap: 11px;
        }

        .risk-bar-row {
          display: grid;
          grid-template-columns: 60px 1fr 38px;
          gap: 9px;
          align-items: center;
          font-size: 10px;
          color: #94a3b8;
        }

        .bar {
          height: 7px;
          border-radius: 999px;
          background: #172033;
          overflow: hidden;
        }

        .bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
        }

        .bar-yellow {
          width: 72%;
          background: #f59e0b;
        }

        .bar-red {
          width: 52%;
          background: #ef4444;
        }

        .bar-green {
          width: 34%;
          background: #22c55e;
        }

        .impact-panel {
          padding: 20px;
        }

        .impact-list {
          display: grid;
          gap: 13px;
        }

        .impact-item {
          display: grid;
          grid-template-columns: 68px 1fr 42px;
          align-items: center;
          gap: 10px;
        }

        .impact-symbol {
          font-size: 11px;
          font-weight: 800;
          color: #cbd5e1;
        }

        .impact-track {
          height: 8px;
          border-radius: 999px;
          background: #172033;
          overflow: hidden;
        }

        .impact-fill {
          height: 100%;
          border-radius: inherit;
        }

        .fill-red {
          width: 88%;
          background: linear-gradient(
            90deg,
            #f97316,
            #ef4444
          );
        }

        .fill-orange {
          width: 64%;
          background: #f59e0b;
        }

        .fill-green {
          width: 31%;
          background: #22c55e;
        }

        .impact-value {
          color: #94a3b8;
          font-size: 10px;
          text-align: left;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .recent-panel,
        .week-panel,
        .settings-panel {
          padding: 20px;
        }

        .recent-list,
        .week-list {
          display: grid;
          gap: 8px;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px;
          border-radius: 13px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.07);
        }

        .recent-flag {
          font-size: 19px;
        }

        .recent-content {
          flex: 1;
          min-width: 0;
        }

        .recent-content strong {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 11px;
        }

        .recent-content span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 9px;
        }

        .recent-time {
          direction: ltr;
          color: #94a3b8;
          font-size: 10px;
        }

        .week-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.5);
        }

        .week-item strong {
          font-size: 11px;
        }

        .week-item span {
          color: #64748b;
          font-size: 9px;
          margin-top: 4px;
          display: block;
        }

        .week-count {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
          font-size: 11px;
          font-weight: 800;
        }

        .settings-list {
          display: grid;
          gap: 9px;
        }

        .setting-item {
          padding: 11px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.52);
          border: 1px solid rgba(148, 163, 184, 0.07);
        }

        .setting-item strong {
          display: block;
          font-size: 11px;
        }

        .setting-item span {
          display: block;
          color: #64748b;
          font-size: 9px;
          margin-top: 4px;
        }

        .footer-status {
          padding: 16px 18px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border: 1px solid rgba(148, 163, 184, 0.09);
          background: rgba(8, 17, 31, 0.72);
          color: #64748b;
          font-size: 10px;
        }

        .footer-online {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #86efac;
        }

        .empty {
          padding: 45px 20px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.75);
          backdrop-filter: blur(10px);
        }

        .modal {
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          overflow: auto;
          border-radius: 25px;
          border: 1px solid rgba(34, 211, 238, 0.18);
          background:
            linear-gradient(
              145deg,
              #0b1728,
              #050b15
            );
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.55);
        }

        .modal-header {
          padding: 20px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 19px;
          line-height: 1.5;
        }

        .modal-header p {
          color: #64748b;
          font-size: 11px;
          margin: 5px 0 0;
        }

        .close-button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          color: #94a3b8;
          background: rgba(15, 23, 42, 0.7);
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-description {
          color: #94a3b8;
          line-height: 1.9;
          font-size: 13px;
          margin: 0 0 18px;
        }

        .data-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
          margin-bottom: 18px;
        }

        .data-card {
          padding: 13px;
          border-radius: 13px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .data-card span {
          display: block;
          color: #64748b;
          font-size: 9px;
          margin-bottom: 7px;
        }

        .data-card strong {
          direction: ltr;
          display: block;
          font-size: 13px;
        }

        .affected-title {
          font-size: 12px;
          margin-bottom: 9px;
        }

        .affected-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .affected {
          padding: 7px 9px;
          border-radius: 9px;
          background: rgba(34, 211, 238, 0.07);
          border: 1px solid rgba(34, 211, 238, 0.12);
          color: #67e8f9;
          font-size: 10px;
          direction: ltr;
        }

        @media (max-width: 1100px) {
          .hero,
          .calendar-layout {
            grid-template-columns: 1fr;
          }

          .control-grid,
          .bottom-grid {
            grid-template-columns: 1fr 1fr;
          }

          .bottom-grid .recent-panel {
            grid-column: span 2;
          }

          .nav {
            display: none;
          }
        }

        @media (max-width: 780px) {
          .news-page {
            padding: 10px;
          }

          .topbar {
            border-radius: 18px;
            padding: 11px;
          }

          .brand {
            min-width: auto;
          }

          .brand span,
          .status-pill {
            display: none;
          }

          .top-actions {
            margin-right: auto;
          }

          .hero-main,
          .next-event {
            padding: 19px;
            border-radius: 20px;
          }

          .market-summary {
            grid-template-columns: 1fr;
          }

          .control-grid,
          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .bottom-grid .recent-panel {
            grid-column: auto;
          }

          .event-row {
            grid-template-columns: 52px 34px minmax(0, 1fr) 70px;
            gap: 8px;
            padding: 14px 12px;
          }

          .event-row > .forecast,
          .event-row > .event-action {
            display: none;
          }

          .event-name strong {
            font-size: 11px;
          }

          .event-name span {
            font-size: 9px;
          }

          .calendar-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 16px;
          }

          .date-controls {
            width: 100%;
            overflow-x: auto;
          }

          .date-button {
            white-space: nowrap;
          }

          .footer-status {
            flex-direction: column;
            align-items: flex-start;
          }

          .data-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="news-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">◈</div>

            <div>
              <strong>
                Trading <span style={{ color: "#22d3ee" }}>AI</span>
              </strong>
              <span>
                Economic Intelligence Center
              </span>
            </div>
          </div>

          <nav className="nav">
            <button className="nav-button">
              داشبورد
            </button>

            <button className="nav-button">
              ربات‌ها
            </button>

            <button className="nav-button">
              تحلیل AI
            </button>

            <button className="nav-button active">
              اخبار
            </button>

            <button className="nav-button">
              معاملات
            </button>

            <button className="nav-button">
              پشتیبانی
            </button>
          </nav>

          <div className="top-actions">
            <div className="status-pill">
              <span className="status-dot" />
              سیستم آنلاین
            </div>

            <button className="icon-button">
              🔔
            </button>

            <button className="icon-button">
              ⚙
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-main">
            <div className="eyebrow">
              ◉ تقویم اقتصادی هوشمند
            </div>

            <h1 className="hero-title">
              اخبار و تقویم اقتصادی
            </h1>

            <p className="hero-description">
              رویدادهای اقتصادی مهم بازار را در یک مرکز حرفه‌ای
              دنبال کنید. اخبار مهم، سطح اهمیت، زمان انتشار،
              پیش‌بینی و تأثیر احتمالی بر بازار را یکجا مشاهده کنید.
            </p>

            <div className="market-summary">
              <div className="summary-card">
                <div className="summary-label">
                  وضعیت بازار
                </div>

                <div className="summary-value summary-yellow">
                  نوسان متوسط
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-label">
                  سشن فعال
                </div>

                <div className="summary-value summary-green">
                  London / New York
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-label">
                  وضعیت News Filter
                </div>

                <div className="summary-value summary-green">
                  {newsFilter
                    ? "فعال"
                    : "غیرفعال"}
                </div>
              </div>
            </div>
          </div>

          <div className="next-event">
            <div className="event-label">
              <span className="danger-badge">
                ⚠ مهم‌ترین خبر بعدی
              </span>

              <span className="event-country">
                {nextImportantEvent.flag}{" "}
                {nextImportantEvent.currency}
              </span>
            </div>

            <h2>
              {nextImportantEvent.title}
            </h2>

            <div className="event-subtitle">
              {nextImportantEvent.description}
            </div>

            <div className="countdown">
              <div className="countdown-label">
                زمان باقی‌مانده تا انتشار
              </div>

              <div className="countdown-value">
                {formatCountdown(countdown)}
              </div>
            </div>

            <div className="event-meta">
              <span className="tag high">
                HIGH
              </span>

              <span className="tag currency">
                {nextImportantEvent.currency}
              </span>

              <span className="tag">
                {nextImportantEvent.time}
              </span>
            </div>
          </div>
        </section>

        <section className="control-grid">
          <div className="panel control-panel">
            <div className="panel-title">
              <h3>جستجو و فیلتر اخبار</h3>
              <span>
                {filteredEvents.length} رویداد
              </span>
            </div>

            <div className="search-box">
              <span className="search-icon">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="جستجوی خبر، ارز یا کشور..."
              />
            </div>

            <div
              style={{
                marginTop: 12,
                marginBottom: 9,
                color: "#64748b",
                fontSize: 10,
              }}
            >
              سطح اهمیت
            </div>

            <div className="filter-row">
              <button
                className={`filter-button ${
                  selectedImportance === "ALL"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedImportance("ALL")
                }
              >
                همه
              </button>

              <button
                className={`filter-button ${
                  selectedImportance === "HIGH"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedImportance("HIGH")
                }
              >
                🔴 بالا
              </button>

              <button
                className={`filter-button ${
                  selectedImportance === "MEDIUM"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedImportance("MEDIUM")
                }
              >
                🟠 متوسط
              </button>

              <button
                className={`filter-button ${
                  selectedImportance === "LOW"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedImportance("LOW")
                }
              >
                🟢 کم
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                marginBottom: 9,
                color: "#64748b",
                fontSize: 10,
              }}
            >
              ارز
            </div>

            <div className="filter-row">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency}
                  className={`filter-button ${
                    selectedCurrency === currency
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCurrency(currency)
                  }
                >
                  {currency === "ALL"
                    ? "همه ارزها"
                    : currency}
                </button>
              ))}
            </div>
          </div>

          <div className="panel control-panel">
            <div className="panel-title">
              <h3>فیلترهای هوشمند</h3>
              <span>Risk Control</span>
            </div>

            <div className="toggle-list">
              <Toggle
                title="News Filter"
                description="کنترل معاملات در زمان اخبار مهم"
                checked={newsFilter}
                onChange={setNewsFilter}
              />

              <Toggle
                title="Market Risk"
                description="محاسبه ریسک بر اساس رویدادهای مهم"
                checked={marketRisk}
                onChange={setMarketRisk}
              />

              <Toggle
                title="Telegram Alerts"
                description="ارسال هشدارهای خبری به تلگرام"
                checked={telegramAlerts}
                onChange={setTelegramAlerts}
              />
            </div>
          </div>

          <div className="panel control-panel">
            <div className="panel-title">
              <h3>زمان‌بندی هشدار</h3>
              <span>Alerts</span>
            </div>

            <div className="toggle-list">
              <Toggle
                title="۱۵ دقیقه قبل"
                description="هشدار نزدیک به انتشار"
                checked={alert15}
                onChange={setAlert15}
              />

              <Toggle
                title="۳۰ دقیقه قبل"
                description="هشدار اولیه"
                checked={alert30}
                onChange={setAlert30}
              />

              <Toggle
                title="۱ ساعت قبل"
                description="آماده‌سازی زودتر"
                checked={alert60}
                onChange={setAlert60}
              />

              <Toggle
                title="۳ ساعت قبل"
                description="هشدار اولیه رویداد"
                checked={alert180}
                onChange={setAlert180}
              />
            </div>
          </div>
        </section>

        <section className="calendar-layout">
          <div className="panel calendar-panel">
            <div className="calendar-header">
              <div className="calendar-title">
                <h2>تقویم اقتصادی</h2>

                <p>
                  رویدادهای اقتصادی و داده‌های مهم بازار
                </p>
              </div>

              <div className="date-controls">
                <button className="date-button active">
                  امروز
                </button>

                <button className="date-button">
                  فردا
                </button>

                <button className="date-button">
                  این هفته
                </button>
              </div>
            </div>

            <div className="events">
              {filteredEvents.length === 0 ? (
                <div className="empty">
                  هیچ رویدادی با فیلترهای انتخاب‌شده پیدا نشد.
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    className="event-row"
                    key={event.id}
                  >
                    <div className="event-time">
                      {event.time}
                    </div>

                    <div className="event-flag">
                      {event.flag}
                    </div>

                    <div className="event-name">
                      <strong>
                        {event.title}
                      </strong>

                      <span>
                        {event.country} •{" "}
                        {event.currency}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`impact ${importanceClass(
                          event.importance
                        )}`}
                      >
                        {importanceLabel(
                          event.importance
                        )}
                      </span>
                    </div>

                    <div className="forecast">
                      {event.forecast}
                    </div>

                    <div className="event-action">
                      <button
                        className="details-button"
                        onClick={() =>
                          setSelectedEvent(event)
                        }
                      >
                        جزئیات
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="side-stack">
            <div className="panel risk-panel">
              <div className="panel-title">
                <h3>ریسک خبری بازار</h3>
                <span>Market Risk</span>
              </div>

              <div className="risk-score">
                <div className="risk-circle">
                  <div>
                    <strong>58</strong>
                    <span>از 100</span>
                  </div>
                </div>

                <div className="risk-text">
                  <strong>نوسان متوسط</strong>

                  <span>
                    چند رویداد مهم در ساعات آینده
                    وجود دارد. کنترل News Filter
                    توصیه می‌شود.
                  </span>
                </div>
              </div>

              <div className="risk-bars">
                <div className="risk-bar-row">
                  <span>USD</span>

                  <div className="bar">
                    <span className="bar-yellow" />
                  </div>

                  <span>72%</span>
                </div>

                <div className="risk-bar-row">
                  <span>EUR</span>

                  <div className="bar">
                    <span className="bar-red" />
                  </div>

                  <span>52%</span>
                </div>

                <div className="risk-bar-row">
                  <span>JPY</span>

                  <div className="bar">
                    <span className="bar-green" />
                  </div>

                  <span>34%</span>
                </div>
              </div>
            </div>

            <div className="panel impact-panel">
              <div className="panel-title">
                <h3>تأثیر احتمالی بر بازار</h3>
                <span>Watchlist</span>
              </div>

              <div className="impact-list">
                <Impact
                  symbol="XAUUSD"
                  value="بالا"
                  className="fill-red"
                />

                <Impact
                  symbol="EURUSD"
                  value="متوسط"
                  className="fill-orange"
                />

                <Impact
                  symbol="GBPUSD"
                  value="متوسط"
                  className="fill-orange"
                />

                <Impact
                  symbol="USDJPY"
                  value="کم"
                  className="fill-green"
                />

                <Impact
                  symbol="AUDUSD"
                  value="کم"
                  className="fill-green"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel recent-panel">
            <div className="panel-title">
              <h3>اخبار مهم اخیر</h3>
              <span>Recent News</span>
            </div>

            <div className="recent-list">
              {EVENTS.slice(0, 5).map((event) => (
                <div
                  className="recent-item"
                  key={event.id}
                >
                  <div className="recent-flag">
                    {event.flag}
                  </div>

                  <div className="recent-content">
                    <strong>
                      {event.title}
                    </strong>

                    <span>
                      {event.currency} •{" "}
                      {importanceLabel(
                        event.importance
                      )}
                    </span>
                  </div>

                  <div className="recent-time">
                    {event.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel week-panel">
            <div className="panel-title">
              <h3>تقویم هفتگی</h3>
              <span>Weekly Overview</span>
            </div>

            <div className="week-list">
              <WeekDay
                title="امروز"
                date="رویدادهای مهم"
                count="8"
              />

              <WeekDay
                title="فردا"
                date="رویدادهای مهم"
                count="7"
              />

              <WeekDay
                title="چهارشنبه"
                date="رویدادهای مهم"
                count="6"
              />

              <WeekDay
                title="پنج‌شنبه"
                date="رویدادهای مهم"
                count="5"
              />

              <WeekDay
                title="جمعه"
                date="رویدادهای مهم"
                count="3"
              />
            </div>
          </div>

          <div className="panel settings-panel">
            <div className="panel-title">
              <h3>وضعیت تنظیمات اخبار</h3>
              <span>Settings</span>
            </div>

            <div className="settings-list">
              <div className="setting-item">
                <strong>
                  News Filter
                </strong>

                <span>
                  {newsFilter
                    ? "فعال • کنترل ریسک خبری روشن است"
                    : "غیرفعال"}
                </span>
              </div>

              <div className="setting-item">
                <strong>
                  هشدار تلگرام
                </strong>

                <span>
                  {telegramAlerts
                    ? "فعال • ارسال اعلان روشن است"
                    : "غیرفعال"}
                </span>
              </div>

              <div className="setting-item">
                <strong>
                  هشدارهای فعال
                </strong>

                <span>
                  {[
                    alert15,
                    alert30,
                    alert60,
                    alert180,
                  ].filter(Boolean).length}{" "}
                  زمان هشدار فعال
                </span>
              </div>

              <div className="setting-item">
                <strong>
                  وضعیت ریسک
                </strong>

                <span>
                  {marketRisk
                    ? "محاسبه ریسک فعال"
                    : "محاسبه ریسک خاموش"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer-status">
          <div className="footer-online">
            <span className="status-dot" />
            موتور تحلیل اخبار آماده است
          </div>

          <div>
            Trading AI • Economic Intelligence
          </div>
        </footer>
      </div>

      {selectedEvent && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setSelectedEvent(null)
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {selectedEvent.flag}{" "}
                  {selectedEvent.title}
                </h2>

                <p>
                  {selectedEvent.country} •{" "}
                  {selectedEvent.currency} •{" "}
                  {selectedEvent.time}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedEvent(null)
                }
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                {selectedEvent.description}
              </p>

              <div className="data-grid">
                <div className="data-card">
                  <span>Previous</span>
                  <strong>
                    {selectedEvent.previous}
                  </strong>
                </div>

                <div className="data-card">
                  <span>Forecast</span>
                  <strong>
                    {selectedEvent.forecast}
                  </strong>
                </div>

                <div className="data-card">
                  <span>Actual</span>
                  <strong>
                    {selectedEvent.actual}
                  </strong>
                </div>
              </div>

              <div className="affected-title">
                نمادهای تحت تأثیر
              </div>

              <div className="affected-list">
                {selectedEvent.affected.map(
                  (symbol) => (
                    <span
                      className="affected"
                      key={symbol}
                    >
                      {symbol}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
        />

        <span className="slider" />
      </label>
    </div>
  );
}

function Impact({
  symbol,
  value,
  className,
}: {
  symbol: string;
  value: string;
  className: string;
}) {
  return (
    <div className="impact-item">
      <div className="impact-symbol">
        {symbol}
      </div>

      <div className="impact-track">
        <div
          className={`impact-fill ${className}`}
        />
      </div>

      <div className="impact-value">
        {value}
      </div>
    </div>
  );
}

function WeekDay({
  title,
  date,
  count,
}: {
  title: string;
  date: string;
  count: string;
}) {
  return (
    <div className="week-item">
      <div>
        <strong>{title}</strong>
        <span>{date}</span>
      </div>

      <div className="week-count">
        {count}
      </div>
    </div>
  );
}
