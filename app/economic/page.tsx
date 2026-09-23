"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Impact = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

type EconomicEvent = {
  id?: string;
  externalId?: string | null;

  event?: string | null;
  title?: string | null;
  name?: string | null;

  country?: string | null;
  currency?: string | null;
  category?: string | null;

  importance?: number | null;

  eventTime?: string | null;
  time?: string | null;
  date?: string | null;
  time_utc?: string | null;

  previous?: string | null;
  forecast?: string | null;
  actual?: string | null;
  unit?: string | null;

  status?: string | null;

  source?: string | null;
  sourceUrl?: string | null;
};

type NewsSettings = {
  highImpact: boolean;
  mediumImpact: boolean;
  lowImpact: boolean;

  currencies: string[];
  alertMinutes: number[];

  telegramEnabled: boolean;
  newsFilterEnabled: boolean;
  marketRiskEnabled: boolean;
};

type CalendarResponse = {
  ok?: boolean;
  error?: string;
  events?: EconomicEvent[];
  source?: {
    name?: string;
    url?: string;
  };
};

type SettingsResponse = {
  ok?: boolean;
  error?: string;
  settings?: NewsSettings;
};

const DEFAULT_SETTINGS: NewsSettings = {
  highImpact: true,
  mediumImpact: true,
  lowImpact: false,
  currencies: [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "CAD",
    "CHF",
    "NZD",
    "CNY",
  ],
  alertMinutes: [120],
  telegramEnabled: true,
  newsFilterEnabled: true,
  marketRiskEnabled: true,
};

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "CNY",
];

function eventTitle(event: EconomicEvent): string {
  return (
    event.event?.trim() ||
    event.title?.trim() ||
    event.name?.trim() ||
    "Economic Event"
  );
}

function eventTimeValue(event: EconomicEvent): string | null {
  return (
    event.eventTime ||
    event.time_utc ||
    event.time ||
    event.date ||
    null
  );
}

function getImportance(event: EconomicEvent): number {
  const value = Number(event.importance);

  if (Number.isFinite(value)) {
    return value;
  }

  return 0;
}

function getImpact(event: EconomicEvent): Impact {
  const importance = getImportance(event);

  if (importance >= 3) {
    return "HIGH";
  }

  if (importance === 2) {
    return "MEDIUM";
  }

  if (importance === 1) {
    return "LOW";
  }

  return "UNKNOWN";
}

function impactText(impact: Impact): string {
  if (impact === "HIGH") return "اهمیت بالا";
  if (impact === "MEDIUM") return "اهمیت متوسط";
  if (impact === "LOW") return "اهمیت پایین";
  return "نامشخص";
}

function impactIcon(impact: Impact): string {
  if (impact === "HIGH") return "🔴";
  if (impact === "MEDIUM") return "🟠";
  if (impact === "LOW") return "🟢";
  return "⚪";
}

function formatDate(
  value: string | null | undefined,
  timeZone: string
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

function formatTime(
  value: string | null | undefined,
  timeZone: string
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

function countdown(value: string | null | undefined): string {
  if (!value) return "زمان نامشخص";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "زمان نامشخص";
  }

  const diff = date.getTime() - Date.now();

  if (diff <= 0) {
    return "منتشر شده / در حال انتشار";
  }

  const totalMinutes = Math.floor(diff / 60000);

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} روز و ${hours} ساعت`;
  }

  if (hours > 0) {
    return `${hours} ساعت و ${minutes} دقیقه`;
  }

  return `${minutes} دقیقه`;
}

function eventSortTime(event: EconomicEvent): number {
  const value = eventTimeValue(event);

  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className={`toggle-row ${checked ? "active" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`switch ${checked ? "on" : ""}`}>
        <span />
      </span>

      <span className="toggle-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function EventCard({
  event,
  nowTick,
}: {
  event: EconomicEvent;
  nowTick: number;
}) {
  void nowTick;

  const impact = getImpact(event);
  const time = eventTimeValue(event);

  return (
    <article className={`event-card impact-${impact.toLowerCase()}`}>
      <div className="event-top">
        <div className="event-impact">
          <span>{impactIcon(impact)}</span>

          <div>
            <strong>{impactText(impact)}</strong>
            <small>
              {event.currency || "—"}{" "}
              {event.country ? `• ${event.country}` : ""}
            </small>
          </div>
        </div>

        <div className="event-countdown">
          <small>تا رویداد</small>
          <strong>{countdown(time)}</strong>
        </div>
      </div>

      <div className="event-title">
        {eventTitle(event)}
      </div>

      <div className="event-time-grid">
        <div>
          <span>UTC</span>
          <strong>{formatTime(time, "UTC")}</strong>
        </div>

        <div>
          <span>لندن</span>
          <strong>
            {formatTime(time, "Europe/London")}
          </strong>
        </div>

        <div>
          <span>نیویورک</span>
          <strong>
            {formatTime(time, "America/New_York")}
          </strong>
        </div>

        <div>
          <span>تهران</span>
          <strong>
            {formatTime(time, "Asia/Tehran")}
          </strong>
        </div>
      </div>

      <div className="numbers">
        <div>
          <span>قبلی</span>
          <strong>{event.previous || "—"}</strong>
        </div>

        <div>
          <span>پیش‌بینی</span>
          <strong>{event.forecast || "—"}</strong>
        </div>

        <div>
          <span>Actual</span>
          <strong className={event.actual ? "actual" : ""}>
            {event.actual || "—"}
          </strong>
        </div>
      </div>

      <div className="event-footer">
        <div>
          <span>تاریخ</span>
          <strong>
            {formatDate(time, "Asia/Tehran")}
          </strong>
        </div>

        {event.category ? (
          <span className="category">
            {event.category}
          </span>
        ) : null}
      </div>

      {event.sourceUrl ? (
        <a
          className="source-link"
          href={event.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          مشاهده منبع رویداد ↗
        </a>
      ) : null}
    </article>
  );
}

export default function EconomicPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [settings, setSettings] =
    useState<NewsSettings>(DEFAULT_SETTINGS);

  const [sourceName, setSourceName] =
    useState("Finance Calendar");

  const [sourceUrl, setSourceUrl] = useState(
    "https://www.financecalendar.com"
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [impactFilter, setImpactFilter] =
    useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  const [currencyFilter, setCurrencyFilter] =
    useState("ALL");

  const [search, setSearch] = useState("");

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [nowTick, setNowTick] = useState(Date.now());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [calendarResponse, settingsResponse] =
        await Promise.all([
          fetch("/api/economic-calendar", {
            method: "GET",
            cache: "no-store",
          }),

          fetch("/api/news/settings", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      const calendarData =
        (await calendarResponse.json()) as CalendarResponse;

      const settingsData =
        (await settingsResponse.json()) as SettingsResponse;

      if (!calendarResponse.ok || calendarData.ok === false) {
        throw new Error(
          calendarData.error ||
            "دریافت تقویم اقتصادی انجام نشد."
        );
      }

      setEvents(
        Array.isArray(calendarData.events)
          ? calendarData.events
          : []
      );

      if (calendarData.source?.name) {
        setSourceName(calendarData.source.name);
      }

      if (calendarData.source?.url) {
        setSourceUrl(calendarData.source.url);
      }

      if (
        settingsResponse.ok &&
        settingsData.ok &&
        settingsData.settings
      ) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...settingsData.settings,
          currencies:
            Array.isArray(
              settingsData.settings.currencies
            )
              ? settingsData.settings.currencies
              : DEFAULT_SETTINGS.currencies,
          alertMinutes:
            Array.isArray(
              settingsData.settings.alertMinutes
            )
              ? settingsData.settings.alertMinutes
              : DEFAULT_SETTINGS.alertMinutes,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات تقویم اقتصادی."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const interval = window.setInterval(() => {
      void loadData();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const result = [...events];

    result.sort(
      (a, b) =>
        eventSortTime(a) -
        eventSortTime(b)
    );

    return result.filter((event) => {
      const impact = getImpact(event);
      const currency =
        event.currency?.toUpperCase() || "";

      const title =
        eventTitle(event).toLowerCase();

      const matchesImpact =
        impactFilter === "ALL" ||
        impact === impactFilter;

      const matchesCurrency =
        currencyFilter === "ALL" ||
        currency === currencyFilter;

      const matchesSearch =
        !search.trim() ||
        title.includes(search.trim().toLowerCase()) ||
        currency.includes(
          search.trim().toUpperCase()
        ) ||
        (event.country || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase());

      return (
        matchesImpact &&
        matchesCurrency &&
        matchesSearch
      );
    });
  }, [
    events,
    impactFilter,
    currencyFilter,
    search,
  ]);

  const nextHighImpact = useMemo(() => {
    const now = Date.now();

    return (
      [...events]
        .filter((event) => {
          const time = eventSortTime(event);

          return (
            getImpact(event) === "HIGH" &&
            time > now
          );
        })
        .sort(
          (a, b) =>
            eventSortTime(a) -
            eventSortTime(b)
        )[0] || null
    );
  }, [events, nowTick]);

  const highCount = useMemo(
    () =>
      events.filter(
        (event) =>
          getImpact(event) === "HIGH"
      ).length,
    [events]
  );

  const mediumCount = useMemo(
    () =>
      events.filter(
        (event) =>
          getImpact(event) === "MEDIUM"
      ).length,
    [events]
  );

  const lowCount = useMemo(
    () =>
      events.filter(
        (event) =>
          getImpact(event) === "LOW"
      ).length,
    [events]
  );

  async function saveSettings() {
    try {
      setSaving(true);
      setSaveMessage("");
      setError("");

      const response = await fetch(
        "/api/news/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      const data =
        (await response.json()) as SettingsResponse;

      if (!response.ok || data.ok === false) {
        throw new Error(
          data.error ||
            "ذخیره تنظیمات انجام نشد."
        );
      }

      if (data.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
        });
      }

      setSaveMessage(
        "تنظیمات با موفقیت ذخیره شد."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات."
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleCurrency(currency: string) {
    setSettings((current) => {
      const exists =
        current.currencies.includes(currency);

      const currencies = exists
        ? current.currencies.filter(
            (item) => item !== currency
          )
        : [...current.currencies, currency];

      return {
        ...current,
        currencies,
      };
    });
  }

  function setAlertMinutes(value: number) {
    setSettings((current) => {
      const exists =
        current.alertMinutes.includes(value);

      const alertMinutes = exists
        ? current.alertMinutes.filter(
            (item) => item !== value
          )
        : [...current.alertMinutes, value].sort(
            (a, b) => b - a
          );

      return {
        ...current,
        alertMinutes,
      };
    });
  }

  return (
    <main className="economic-page" dir="rtl">
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .economic-page {
          min-height: 100vh;
          padding: 24px;
          color: #f5f7fb;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(212, 168, 67, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 5% 70%,
              rgba(19, 102, 112, 0.13),
              transparent 30%
            ),
            #05080d;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        .shell {
          width: min(1500px, 100%);
          margin: auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .brand-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 17px;
          border: 1px solid
            rgba(224, 180, 70, 0.32);
          background:
            linear-gradient(
              145deg,
              rgba(224, 180, 70, 0.18),
              rgba(255, 255, 255, 0.035)
            );
          color: #e3b54c;
          font-size: 23px;
          box-shadow:
            0 18px 45px
              rgba(0, 0, 0, 0.35);
        }

        .brand h1 {
          margin: 0;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .brand p {
          margin: 6px 0 0;
          color: #8490a3;
          font-size: 12px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-button,
        .refresh-button {
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.045);
          color: #dce3ed;
          border-radius: 13px;
          min-height: 43px;
          padding: 0 15px;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s;
        }

        .icon-button:hover,
        .refresh-button:hover {
          border-color: rgba(224, 180, 70, 0.35);
          background: rgba(224, 180, 70, 0.08);
        }

        .hero {
          position: relative;
          overflow: hidden;
          padding: 27px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 26px;
          background:
            linear-gradient(
              135deg,
              rgba(24, 28, 34, 0.94),
              rgba(11, 14, 19, 0.9)
            );
          box-shadow:
            0 25px 80px
              rgba(0, 0, 0, 0.3);
        }

        .hero:after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          left: -100px;
          top: -140px;
          border-radius: 50%;
          background: rgba(221, 177, 67, 0.07);
          filter: blur(20px);
        }

        .eyebrow {
          color: #cba449;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .hero h2 {
          margin: 10px 0 8px;
          font-size: clamp(23px, 3vw, 35px);
          line-height: 1.35;
        }

        .hero p {
          max-width: 780px;
          margin: 0;
          color: #8995a7;
          line-height: 1.9;
          font-size: 13px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
          margin: 15px 0;
        }

        .stat {
          min-height: 112px;
          padding: 18px;
          border-radius: 20px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.018)
            );
          backdrop-filter: blur(18px);
        }

        .stat-icon {
          font-size: 18px;
        }

        .stat small {
          display: block;
          margin-top: 13px;
          color: #7e8999;
          font-size: 11px;
        }

        .stat strong {
          display: block;
          margin-top: 6px;
          color: #f3f6fa;
          font-size: 22px;
        }

        .stat.gold strong {
          color: #e3b54c;
        }

        .stat.red strong {
          color: #ff6868;
        }

        .stat.green strong {
          color: #49d99b;
        }

        .next-event {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 15px;
          margin-bottom: 15px;
        }

        .next-card,
        .info-card {
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 22px;
          background: rgba(13, 17, 23, 0.78);
          padding: 20px;
        }

        .next-card {
          border-color: rgba(224, 180, 70, 0.17);
        }

        .next-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .next-head small {
          color: #8490a3;
        }

        .next-title {
          margin-top: 12px;
          font-size: 19px;
          font-weight: 900;
        }

        .next-time {
          margin-top: 9px;
          color: #c7ced8;
          font-size: 12px;
        }

        .countdown-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 105px;
          border-radius: 18px;
          border: 1px solid
            rgba(224, 180, 70, 0.2);
          background: rgba(224, 180, 70, 0.055);
        }

        .countdown-box span {
          color: #7f8a9a;
          font-size: 11px;
        }

        .countdown-box strong {
          margin-top: 9px;
          color: #e2b44d;
          font-size: 19px;
        }

        .filters {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) auto auto;
          gap: 10px;
          margin-bottom: 15px;
          padding: 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 20px;
          background: rgba(10, 14, 20, 0.82);
        }

        .search {
          width: 100%;
          min-height: 46px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.035);
          color: white;
          outline: none;
          padding: 0 14px;
          font-family: inherit;
        }

        .search:focus {
          border-color: rgba(224, 180, 70, 0.45);
        }

        .filter-group {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-button {
          min-height: 42px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          padding: 0 12px;
          color: #8d98a9;
          background: rgba(255, 255, 255, 0.035);
          cursor: pointer;
          font-family: inherit;
        }

        .filter-button.active {
          color: #e4b64e;
          border-color: rgba(224, 180, 70, 0.35);
          background: rgba(224, 180, 70, 0.09);
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .event-card {
          padding: 20px;
          border-radius: 22px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          background:
            linear-gradient(
              145deg,
              rgba(15, 19, 26, 0.93),
              rgba(8, 11, 16, 0.92)
            );
          box-shadow:
            0 15px 50px
              rgba(0, 0, 0, 0.16);
        }

        .event-card.impact-high {
          border-color: rgba(255, 75, 75, 0.2);
        }

        .event-card.impact-medium {
          border-color: rgba(255, 163, 54, 0.17);
        }

        .event-card.impact-low {
          border-color: rgba(65, 208, 142, 0.14);
        }

        .event-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .event-impact {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .event-impact > span {
          font-size: 21px;
        }

        .event-impact strong {
          display: block;
          font-size: 12px;
        }

        .event-impact small {
          display: block;
          margin-top: 4px;
          color: #737f90;
          font-size: 10px;
        }

        .event-countdown {
          text-align: left;
        }

        .event-countdown small {
          display: block;
          color: #697587;
          font-size: 9px;
        }

        .event-countdown strong {
          display: block;
          margin-top: 4px;
          color: #dcb04b;
          font-size: 11px;
        }

        .event-title {
          min-height: 57px;
          margin-top: 18px;
          font-size: 17px;
          line-height: 1.65;
          font-weight: 900;
        }

        .event-time-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin-top: 13px;
        }

        .event-time-grid > div,
        .numbers > div {
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
        }

        .event-time-grid span,
        .numbers span,
        .event-footer span {
          display: block;
          color: #697588;
          font-size: 9px;
        }

        .event-time-grid strong,
        .numbers strong,
        .event-footer strong {
          display: block;
          margin-top: 5px;
          color: #dfe5ec;
          font-size: 11px;
        }

        .numbers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin-top: 8px;
        }

        .numbers strong.actual {
          color: #55dba0;
        }

        .event-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 11px;
        }

        .category {
          padding: 7px 10px;
          border-radius: 9px;
          color: #a7b1c0;
          background: rgba(255, 255, 255, 0.045);
          font-size: 9px;
        }

        .source-link {
          display: inline-block;
          margin-top: 12px;
          color: #d6ab45;
          text-decoration: none;
          font-size: 10px;
        }

        .source-link:hover {
          text-decoration: underline;
        }

        .settings-panel {
          position: fixed;
          z-index: 100;
          inset: 0;
          background: rgba(0, 0, 0, 0.67);
          backdrop-filter: blur(7px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .settings-box {
          width: min(650px, 100%);
          max-height: 90vh;
          overflow: auto;
          padding: 23px;
          border: 1px solid
            rgba(224, 180, 70, 0.2);
          border-radius: 25px;
          background: #0b1018;
          box-shadow:
            0 30px 100px
              rgba(0, 0, 0, 0.5);
        }

        .settings-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .settings-head h3 {
          margin: 0;
          font-size: 20px;
        }

        .close {
          width: 38px;
          height: 38px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          color: #cbd3df;
          cursor: pointer;
          font-size: 18px;
        }

        .toggle-list {
          display: grid;
          gap: 8px;
        }

        .toggle-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          color: white;
          background: rgba(255, 255, 255, 0.025);
          text-align: right;
          cursor: pointer;
          font-family: inherit;
        }

        .toggle-row.active {
          border-color: rgba(224, 180, 70, 0.2);
          background: rgba(224, 180, 70, 0.045);
        }

        .switch {
          position: relative;
          flex: 0 0 auto;
          width: 43px;
          height: 23px;
          border-radius: 99px;
          background: #252c36;
        }

        .switch span {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #87909d;
          transition: 0.2s;
        }

        .switch.on {
          background: #987526;
        }

        .switch.on span {
          right: 23px;
          background: #fff1b7;
        }

        .toggle-copy {
          min-width: 0;
        }

        .toggle-copy strong {
          display: block;
          font-size: 12px;
        }

        .toggle-copy small {
          display: block;
          margin-top: 4px;
          color: #737f90;
          font-size: 10px;
        }

        .setting-section {
          margin-top: 22px;
        }

        .setting-section h4 {
          margin: 0 0 10px;
          color: #d6ad4c;
          font-size: 12px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .chip {
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 8px 11px;
          color: #8995a7;
          background: rgba(255, 255, 255, 0.035);
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
        }

        .chip.active {
          color: #f0c95f;
          border-color: rgba(224, 180, 70, 0.32);
          background: rgba(224, 180, 70, 0.09);
        }

        .save-button {
          width: 100%;
          min-height: 48px;
          margin-top: 22px;
          border: 0;
          border-radius: 13px;
          color: #080a0d;
          background: linear-gradient(
            135deg,
            #e5bc58,
            #a97d25
          );
          font-weight: 900;
          font-family: inherit;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .message,
        .error {
          margin: 13px 0;
          padding: 12px 14px;
          border-radius: 13px;
          font-size: 11px;
        }

        .message {
          color: #65dda4;
          border: 1px solid
            rgba(65, 208, 142, 0.17);
          background: rgba(65, 208, 142, 0.055);
        }

        .error {
          color: #ff8888;
          border: 1px solid
            rgba(255, 75, 75, 0.17);
          background: rgba(255, 75, 75, 0.055);
        }

        .loading,
        .empty {
          grid-column: 1 / -1;
          min-height: 220px;
          display: grid;
          place-items: center;
          padding: 30px;
          text-align: center;
          border: 1px dashed
            rgba(255, 255, 255, 0.09);
          border-radius: 20px;
          color: #798596;
          background: rgba(255, 255, 255, 0.02);
        }

        .loading strong,
        .empty strong {
          display: block;
          margin-bottom: 8px;
          color: #cbd4df;
          font-size: 14px;
        }

        .footer {
          margin-top: 18px;
          padding: 16px;
          text-align: center;
          color: #697587;
          font-size: 10px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .footer a {
          color: #d9ad45;
          text-decoration: none;
        }

        @media (max-width: 1000px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .next-event {
            grid-template-columns: 1fr;
          }

          .events-grid {
            grid-template-columns: 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .economic-page {
            padding: 12px;
          }

          .topbar {
            align-items: flex-start;
          }

          .top-actions {
            flex-direction: column;
          }

          .hero {
            padding: 20px;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .event-time-grid {
            grid-template-columns: 1fr 1fr;
          }

          .numbers {
            grid-template-columns: 1fr;
          }

          .event-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">
              ◷
            </div>

            <div>
              <h1>تقویم اقتصادی</h1>
              <p>
                رویدادهای اقتصادی واقعی و هشدارهای بازار
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="refresh-button"
              onClick={() => void loadData()}
            >
              ↻ بروزرسانی
            </button>

            <button
              type="button"
              className="icon-button"
              onClick={() =>
                setSettingsOpen(true)
              }
            >
              ⚙ تنظیمات اخبار
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="eyebrow">
            REAL ECONOMIC CALENDAR
          </div>

          <h2>
            اخبار مهم بازار را قبل از انتشار ببینید
          </h2>

          <p>
            این بخش داده‌های تقویم اقتصادی را از
            سرویس متصل دریافت می‌کند و رویدادهایی
            مانند NFP، CPI، FOMC، نرخ بهره، GDP و
            سایر اخبار مهم را نمایش می‌دهد. اگر
            سرویس داده در دسترس نباشد، اطلاعات
            ساختگی نمایش داده نمی‌شود.
          </p>
        </section>

        {error ? (
          <div className="error">
            ⚠️ {error}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="message">
            ✓ {saveMessage}
          </div>
        ) : null}

        <section className="stats">
          <div className="stat gold">
            <span className="stat-icon">
              📅
            </span>
            <small>کل رویدادهای دریافت‌شده</small>
            <strong>{events.length}</strong>
          </div>

          <div className="stat red">
            <span className="stat-icon">
              🔴
            </span>
            <small>اهمیت بالا</small>
            <strong>{highCount}</strong>
          </div>

          <div className="stat">
            <span className="stat-icon">
              🟠
            </span>
            <small>اهمیت متوسط</small>
            <strong>{mediumCount}</strong>
          </div>

          <div className="stat green">
            <span className="stat-icon">
              🟢
            </span>
            <small>اهمیت پایین</small>
            <strong>{lowCount}</strong>
          </div>
        </section>

        <section className="next-event">
          <div className="next-card">
            <div className="next-head">
              <small>
                نزدیک‌ترین خبر با اهمیت بالا
              </small>

              {nextHighImpact?.currency ? (
                <strong>
                  {nextHighImpact.currency}
                </strong>
              ) : null}
            </div>

            {nextHighImpact ? (
              <>
                <div className="next-title">
                  {impactIcon(
                    getImpact(nextHighImpact)
                  )}{" "}
                  {eventTitle(nextHighImpact)}
                </div>

                <div className="next-time">
                  زمان تهران:{" "}
                  {formatDate(
                    eventTimeValue(
                      nextHighImpact
                    ),
                    "Asia/Tehran"
                  )}
                </div>
              </>
            ) : (
              <div className="next-title">
                فعلاً رویداد مهم آینده‌ای پیدا نشد.
              </div>
            )}
          </div>

          <div className="countdown-box">
            <span>شمارش معکوس</span>

            <strong>
              {nextHighImpact
                ? countdown(
                    eventTimeValue(
                      nextHighImpact
                    )
                  )
                : "—"}
            </strong>
          </div>
        </section>

        <section className="filters">
          <input
            className="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="جستجوی NFP، CPI، FOMC، USD، کشور و..."
          />

          <div className="filter-group">
            {(
              [
                ["ALL", "همه"],
                ["HIGH", "بالا"],
                ["MEDIUM", "متوسط"],
                ["LOW", "پایین"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter-button ${
                  impactFilter === value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setImpactFilter(value)
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <button
              type="button"
              className={`filter-button ${
                currencyFilter === "ALL"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setCurrencyFilter("ALL")
              }
            >
              همه ارزها
            </button>

            {CURRENCIES.slice(0, 5).map(
              (currency) => (
                <button
                  key={currency}
                  type="button"
                  className={`filter-button ${
                    currencyFilter === currency
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setCurrencyFilter(currency)
                  }
                >
                  {currency}
                </button>
              )
            )}
          </div>
        </section>

        <section className="events-grid">
          {loading ? (
            <div className="loading">
              <div>
                <strong>
                  در حال دریافت تقویم اقتصادی...
                </strong>
                <span>
                  داده ساختگی نمایش داده نمی‌شود.
                </span>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty">
              <div>
                <strong>
                  رویدادی برای نمایش پیدا نشد
                </strong>

                <span>
                  فیلترها را تغییر دهید یا دوباره
                  بروزرسانی کنید.
                </span>
              </div>
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <EventCard
                key={
                  event.id ||
                  event.externalId ||
                  `${eventTitle(event)}-${eventTimeValue(
                    event
                  )}-${index}`
                }
                event={event}
                nowTick={nowTick}
              />
            ))
          )}
        </section>

        <footer className="footer">
          منبع داده:{" "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {sourceName}
          </a>
          {" • "}
          زمان‌ها بر اساس منطقه زمانی واقعی
          رویداد نمایش داده می‌شوند.
        </footer>
      </div>

      {settingsOpen ? (
        <div
          className="settings-panel"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <section className="settings-box">
            <div className="settings-head">
              <div>
                <h3>
                  ⚙ تنظیمات اخبار و هشدار
                </h3>

                <p
                  style={{
                    color: "#737f90",
                    fontSize: "10px",
                    margin: "6px 0 0",
                  }}
                >
                  تنظیم کنید چه اخبار و چه زمانی
                  به Telegram ارسال شود.
                </p>
              </div>

              <button
                type="button"
                className="close"
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="toggle-list">
              <Toggle
                checked={settings.telegramEnabled}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    telegramEnabled: value,
                  }))
                }
                label="هشدار Telegram"
                description="ارسال هشدار رویدادهای اقتصادی به کانال Telegram"
              />

              <Toggle
                checked={settings.newsFilterEnabled}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    newsFilterEnabled: value,
                  }))
                }
                label="فیلتر اخبار برای سیگنال‌ها"
                description="در زمان اخبار پرریسک، موتور سیگنال بتواند معامله را متوقف کند"
              />

              <Toggle
                checked={settings.marketRiskEnabled}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    marketRiskEnabled: value,
                  }))
                }
                label="هشدار ریسک بازار"
                description="رویدادهای مهم قبل از انتشار به عنوان ریسک بازار علامت‌گذاری شوند"
              />

              <Toggle
                checked={settings.highImpact}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    highImpact: value,
                  }))
                }
                label="اخبار اهمیت بالا"
                description="NFP، CPI، FOMC، نرخ بهره و رویدادهای مهم"
              />

              <Toggle
                checked={settings.mediumImpact}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    mediumImpact: value,
                  }))
                }
                label="اخبار اهمیت متوسط"
                description="رویدادهای متوسط اقتصادی"
              />

              <Toggle
                checked={settings.lowImpact}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    lowImpact: value,
                  }))
                }
                label="اخبار اهمیت پایین"
                description="رویدادهای کم‌ریسک‌تر"
              />
            </div>

            <div className="setting-section">
              <h4>
                ارزهای موردنظر
              </h4>

              <div className="chips">
                {CURRENCIES.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    className={`chip ${
                      settings.currencies.includes(
                        currency
                      )
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      toggleCurrency(currency)
                    }
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-section">
              <h4>
                زمان هشدار قبل از انتشار
              </h4>

              <div className="chips">
                {[15, 30, 60, 120, 180].map(
                  (minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={`chip ${
                        settings.alertMinutes.includes(
                          minutes
                        )
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setAlertMinutes(minutes)
                      }
                    >
                      {minutes >= 60
                        ? `${minutes / 60} ساعت قبل`
                        : `${minutes} دقیقه قبل`}
                    </button>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              className="save-button"
              disabled={saving}
              onClick={() => void saveSettings()}
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تنظیمات"}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
