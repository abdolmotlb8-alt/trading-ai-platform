"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type EconomicEvent = {
  id: string;
  country: string | null;
  currency: string | null;
  event: string;
  category: string | null;
  importance: number;
  eventTime: string;
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  unit: string | null;
  status: string;
  source: string;
  sourceUrl: string | null;
};

type Settings = {
  highImpact: boolean;
  mediumImpact: boolean;
  lowImpact: boolean;
  currencies: string[];
  alertMinutes: number[];
  telegramEnabled: boolean;
  newsFilterEnabled: boolean;
  marketRiskEnabled: boolean;
};

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "CNY",
];

function Icon({
  name,
  size = 20,
}: {
  name:
    | "calendar"
    | "bell"
    | "search"
    | "settings"
    | "filter"
    | "telegram"
    | "clock"
    | "shield"
    | "refresh"
    | "check";
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

  const paths: Record<
    string,
    React.ReactNode
  > = {
    calendar: (
      <>
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3"
        />
        <path d="M16 2v4M8 2v4M3 9h18" />
        <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 5 5" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.02 1.56V22h-2.4v-.2a1.7 1.7 0 0 0-1.02-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.02H6.6v-2.4h.24A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6a1.7 1.7 0 0 0 1.02-1.56V4h2.4v.2A1.7 1.7 0 0 0 16.08 5.76a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.32 9a1.7 1.7 0 0 0 1.56 1.02h.24v2.4h-.24A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),

    filter: (
      <>
        <path d="M4 5h16M7 12h10M10 19h4" />
      </>
    ),

    telegram: (
      <>
        <path d="m21 3-8.8 18-3.1-7.1L2 10.8 21 3Z" />
        <path d="m9.1 13.9 4.3-4.3" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.8-4L3 9" />
        <path d="M3 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14.8 4L21 15" />
        <path d="M21 20v-5h-5" />
      </>
    ),

    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
  };

  return (
    <svg {...common}>
      {paths[name]}
    </svg>
  );
}

function impactText(
  importance: number
) {
  if (importance >= 3) return "بالا";
  if (importance >= 2) return "متوسط";
  return "کم";
}

function impactClass(
  importance: number
) {
  if (importance >= 3) return "high";
  if (importance >= 2) return "medium";
  return "low";
}

function formatTime(
  value: string,
  timeZone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "fa-IR",
      {
        timeZone,
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatCountdown(
  value: string
) {
  const diff =
    new Date(value).getTime() -
    Date.now();

  if (diff <= 0) {
    return "منتشر شده";
  }

  const hours = Math.floor(
    diff / 3600000
  );

  const minutes = Math.floor(
    (diff % 3600000) / 60000
  );

  return `${hours}س ${minutes}د`;
}

export default function EconomicPage() {
  const [events, setEvents] =
    useState<EconomicEvent[]>([]);

  const [settings, setSettings] =
    useState<Settings>({
      highImpact: true,
      mediumImpact: true,
      lowImpact: false,
      currencies,
      alertMinutes: [120],
      telegramEnabled: true,
      newsFilterEnabled: true,
      marketRiskEnabled: true,
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [impactFilter, setImpactFilter] =
    useState("ALL");

  const [currencyFilter, setCurrencyFilter] =
    useState("ALL");

  const [showSettings, setShowSettings] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/economic-calendar?days=14",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "خطا در دریافت اخبار"
          );
        }

        setEvents(
          Array.isArray(data.events)
            ? data.events
            : []
        );

        if (data.settings) {
          setSettings({
            highImpact:
              Boolean(
                data.settings.highImpact
              ),
            mediumImpact:
              Boolean(
                data.settings.mediumImpact
              ),
            lowImpact:
              Boolean(
                data.settings.lowImpact
              ),
            currencies:
              Array.isArray(
                data.settings.currencies
              )
                ? data.settings.currencies
                : currencies,
            alertMinutes:
              Array.isArray(
                data.settings.alertMinutes
              )
                ? data.settings.alertMinutes
                : [120],
            telegramEnabled:
              Boolean(
                data.settings
                  .telegramEnabled
              ),
            newsFilterEnabled:
              Boolean(
                data.settings
                  .newsFilterEnabled
              ),
            marketRiskEnabled:
              Boolean(
                data.settings
                  .marketRiskEnabled
              ),
          });
        }

        setLastUpdated(
          new Date()
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "خطای نامشخص"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadData();

    const timer =
      setInterval(
        loadData,
        5 * 60 * 1000
      );

    return () =>
      clearInterval(timer);
  }, [loadData]);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");

      const response =
        await fetch(
          "/api/news/settings",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              settings
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            "ذخیره تنظیمات ناموفق بود"
        );
      }

      setShowSettings(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredEvents =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return events.filter(
        (event) => {
          const impactOK =
            impactFilter === "ALL" ||
            (impactFilter === "HIGH" &&
              event.importance >= 3) ||
            (impactFilter === "MEDIUM" &&
              event.importance === 2) ||
            (impactFilter === "LOW" &&
              event.importance <= 1);

          const currency =
            event.currency ||
            "GLOBAL";

          const currencyOK =
            currencyFilter ===
              "ALL" ||
            currency ===
              currencyFilter;

          const text =
            `${event.event} ${
              event.country ?? ""
            } ${
              event.category ?? ""
            } ${
              event.currency ?? ""
            }`.toLowerCase();

          const searchOK =
            !query ||
            text.includes(query);

          return (
            impactOK &&
            currencyOK &&
            searchOK
          );
        }
      );
    }, [
      events,
      impactFilter,
      currencyFilter,
      search,
    ]);

  const highCount =
    events.filter(
      (event) =>
        event.importance >= 3
    ).length;

  const mediumCount =
    events.filter(
      (event) =>
        event.importance === 2
    ).length;

  const nextHigh =
    events.find(
      (event) =>
        event.importance >= 3
    );

  function toggleCurrency(
    currency: string
  ) {
    setSettings((current) => {
      const exists =
        current.currencies.includes(
          currency
        );

      return {
        ...current,
        currencies: exists
          ? current.currencies.filter(
              (item) =>
                item !== currency
            )
          : [
              ...current.currencies,
              currency,
            ],
      };
    });
  }

  return (
    <main
      dir="rtl"
      className="economic-page"
    >
      <style>{`
        *{
          box-sizing:border-box;
        }

        html,body{
          margin:0;
          padding:0;
          background:#050a13;
        }

        body{
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        .economic-page{
          min-height:100vh;
          color:#f4f7fb;
          padding:22px;
          background:
            radial-gradient(
              circle at 82% 0%,
              rgba(199,154,54,.12),
              transparent 30%
            ),
            radial-gradient(
              circle at 0% 70%,
              rgba(24,84,130,.18),
              transparent 30%
            ),
            #050a13;
        }

        .shell{
          max-width:1450px;
          margin:0 auto;
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin-bottom:20px;
        }

        .brand{
          display:flex;
          align-items:center;
          gap:13px;
        }

        .brand-logo{
          width:48px;
          height:48px;
          border-radius:15px;
          display:grid;
          place-items:center;
          color:#e7c66a;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.10),
              rgba(255,255,255,.025)
            );
          border:1px solid rgba(225,194,110,.30);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            0 12px 40px rgba(0,0,0,.25);
        }

        .brand h1{
          margin:0;
          font-size:20px;
          letter-spacing:-.5px;
        }

        .brand p{
          margin:4px 0 0;
          color:#778398;
          font-size:12px;
        }

        .top-actions{
          display:flex;
          gap:9px;
          align-items:center;
        }

        .icon-btn{
          width:45px;
          height:45px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.035);
          color:#c7d0dc;
          display:grid;
          place-items:center;
          cursor:pointer;
          transition:.2s;
        }

        .icon-btn:hover{
          border-color:rgba(218,180,82,.38);
          color:#e8c96c;
          transform:translateY(-1px);
        }

        .hero{
          position:relative;
          overflow:hidden;
          padding:30px;
          border-radius:25px;
          border:1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(
              135deg,
              rgba(24,35,53,.94),
              rgba(10,17,29,.96)
            );
          box-shadow:
            0 25px 80px rgba(0,0,0,.28),
            inset 0 1px 0 rgba(255,255,255,.04);
          margin-bottom:18px;
        }

        .hero:after{
          content:"";
          position:absolute;
          width:300px;
          height:300px;
          border-radius:50%;
          background:rgba(202,163,65,.08);
          filter:blur(50px);
          left:-80px;
          bottom:-130px;
        }

        .hero-grid{
          position:relative;
          z-index:2;
          display:grid;
          grid-template-columns:1.4fr .8fr;
          gap:25px;
          align-items:center;
        }

        .hero h2{
          margin:0 0 10px;
          font-size:31px;
          letter-spacing:-1px;
        }

        .hero h2 span{
          color:#e2bd59;
        }

        .hero p{
          max-width:700px;
          color:#8793a7;
          line-height:2;
          margin:0;
          font-size:14px;
        }

        .live-badge{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:7px 11px;
          border-radius:999px;
          background:rgba(35,196,120,.08);
          color:#57d99a;
          border:1px solid rgba(35,196,120,.18);
          font-size:12px;
          margin-bottom:14px;
        }

        .live-dot{
          width:7px;
          height:7px;
          border-radius:50%;
          background:#3ddf8e;
          box-shadow:0 0 12px #3ddf8e;
        }

        .next-card{
          padding:22px;
          border-radius:20px;
          background:#080e1b;
          border:1px solid rgba(255,255,255,.07);
        }

        .next-label{
          color:#69768a;
          font-size:12px;
          margin-bottom:8px;
        }

        .next-name{
          font-size:18px;
          font-weight:800;
          margin-bottom:13px;
        }

        .next-time{
          font-size:27px;
          font-weight:900;
          color:#e5c567;
          letter-spacing:1px;
        }

        .stats{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:12px;
          margin-bottom:18px;
        }

        .stat{
          min-height:105px;
          padding:17px;
          border-radius:18px;
          background:rgba(15,24,39,.82);
          border:1px solid rgba(255,255,255,.07);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.03);
        }

        .stat-title{
          color:#738095;
          font-size:12px;
        }

        .stat-value{
          font-size:27px;
          font-weight:900;
          margin-top:10px;
        }

        .stat-gold{
          color:#e5c567;
        }

        .stat-red{
          color:#ff6e79;
        }

        .stat-orange{
          color:#ffb35e;
        }

        .stat-green{
          color:#4cdda0;
        }

        .toolbar{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:15px;
        }

        .search{
          flex:1;
          min-width:240px;
          height:48px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.07);
          background:#090f1b;
          color:#fff;
          padding:0 15px;
          outline:none;
          font-family:inherit;
        }

        .search:focus{
          border-color:rgba(220,183,83,.45);
        }

        .search-wrap{
          flex:1;
          min-width:240px;
          position:relative;
        }

        .search-wrap svg{
          position:absolute;
          right:14px;
          top:14px;
          color:#667388;
        }

        .search{
          padding-right:45px;
        }

        .select{
          height:48px;
          padding:0 14px;
          border-radius:14px;
          background:#090f1b;
          border:1px solid rgba(255,255,255,.07);
          color:#cbd4e1;
          outline:none;
          font-family:inherit;
        }

        .refresh-btn{
          height:48px;
          display:flex;
          align-items:center;
          gap:8px;
          padding:0 15px;
          border-radius:14px;
          color:#e4c568;
          background:rgba(216,179,77,.07);
          border:1px solid rgba(216,179,77,.2);
          cursor:pointer;
          font-family:inherit;
        }

        .events{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:13px;
        }

        .event{
          position:relative;
          overflow:hidden;
          padding:19px;
          border-radius:20px;
          background:
            linear-gradient(
              135deg,
              rgba(17,27,43,.94),
              rgba(9,15,26,.98)
            );
          border:1px solid rgba(255,255,255,.07);
          transition:.2s;
        }

        .event:hover{
          transform:translateY(-2px);
          border-color:rgba(224,189,93,.25);
        }

        .event-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }

        .event-currency{
          display:flex;
          align-items:center;
          gap:8px;
          font-weight:800;
        }

        .currency{
          color:#6bc8ff;
        }

        .impact{
          padding:6px 9px;
          border-radius:9px;
          font-size:11px;
          font-weight:800;
        }

        .impact.high{
          color:#ff737d;
          background:rgba(255,82,94,.09);
          border:1px solid rgba(255,82,94,.16);
        }

        .impact.medium{
          color:#ffbb68;
          background:rgba(255,176,73,.08);
          border:1px solid rgba(255,176,73,.15);
        }

        .impact.low{
          color:#57dda0;
          background:rgba(55,210,137,.07);
          border:1px solid rgba(55,210,137,.15);
        }

        .event h3{
          margin:16px 0 7px;
          font-size:18px;
          line-height:1.7;
        }

        .category{
          color:#6e7c91;
          font-size:11px;
          margin-bottom:17px;
        }

        .event-time-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:7px;
          margin-bottom:14px;
        }

        .time-box{
          padding:9px;
          border-radius:11px;
          background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.045);
        }

        .time-box span{
          display:block;
          color:#657286;
          font-size:10px;
          margin-bottom:4px;
        }

        .time-box strong{
          display:block;
          color:#d9e1eb;
          font-size:11px;
        }

        .event-data{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:7px;
        }

        .data-box{
          padding:11px;
          border-radius:12px;
          background:#080e19;
        }

        .data-box span{
          color:#667389;
          display:block;
          font-size:10px;
          margin-bottom:5px;
        }

        .data-box strong{
          font-size:13px;
          color:#e4e9ef;
        }

        .event-footer{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-top:15px;
          padding-top:13px;
          border-top:1px solid rgba(255,255,255,.05);
        }

        .countdown{
          color:#e4c568;
          font-size:12px;
          font-weight:800;
        }

        .source{
          color:#657286;
          font-size:10px;
          text-decoration:none;
        }

        .settings-panel{
          margin-top:18px;
          padding:23px;
          border-radius:22px;
          background:#080e19;
          border:1px solid rgba(255,255,255,.08);
        }

        .settings-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:20px;
        }

        .settings-head h3{
          margin:0;
          font-size:19px;
        }

        .setting-grid{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:12px;
        }

        .setting-card{
          padding:16px;
          border-radius:15px;
          background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.06);
        }

        .setting-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:15px;
        }

        .setting-row strong{
          display:block;
          font-size:14px;
        }

        .setting-row span{
          display:block;
          margin-top:5px;
          color:#68768a;
          font-size:11px;
        }

        .switch{
          width:49px;
          height:27px;
          border-radius:99px;
          border:0;
          padding:3px;
          background:#202b3c;
          cursor:pointer;
          transition:.2s;
        }

        .switch.on{
          background:#b28a30;
        }

        .switch i{
          display:block;
          width:21px;
          height:21px;
          border-radius:50%;
          background:#b8c2d0;
          transition:.2s;
        }

        .switch.on i{
          transform:translateX(-22px);
          background:#fff;
        }

        .currency-list{
          display:flex;
          flex-wrap:wrap;
          gap:7px;
          margin-top:12px;
        }

        .currency-btn{
          border:1px solid rgba(255,255,255,.07);
          background:#0a111e;
          color:#718096;
          border-radius:10px;
          padding:8px 11px;
          cursor:pointer;
        }

        .currency-btn.active{
          color:#e8ca6b;
          border-color:rgba(220,184,80,.35);
          background:rgba(220,184,80,.07);
        }

        .save-btn{
          margin-top:18px;
          width:100%;
          height:48px;
          border:0;
          border-radius:13px;
          color:#15110a;
          background:linear-gradient(135deg,#f1d77f,#b98b29);
          font-family:inherit;
          font-weight:900;
          cursor:pointer;
        }

        .error{
          padding:13px 15px;
          border-radius:13px;
          margin-bottom:15px;
          color:#ff9aa1;
          background:rgba(255,73,87,.08);
          border:1px solid rgba(255,73,87,.16);
        }

        .empty{
          grid-column:1/-1;
          padding:60px 20px;
          text-align:center;
          color:#6d7a8e;
          border:1px dashed rgba(255,255,255,.08);
          border-radius:20px;
        }

        .footer{
          margin-top:20px;
          text-align:center;
          color:#536074;
          font-size:11px;
          padding:20px;
        }

        .footer a{
          color:#c9a64b;
        }

        @media(max-width:900px){
          .hero-grid{
            grid-template-columns:1fr;
          }

          .stats{
            grid-template-columns:repeat(2,1fr);
          }

          .events{
            grid-template-columns:1fr;
          }
        }

        @media(max-width:620px){
          .economic-page{
            padding:12px;
          }

          .hero{
            padding:21px;
          }

          .hero h2{
            font-size:24px;
          }

          .stats{
            grid-template-columns:1fr 1fr;
          }

          .setting-grid{
            grid-template-columns:1fr;
          }

          .event-time-grid,
          .event-data{
            grid-template-columns:1fr 1fr 1fr;
          }

          .topbar{
            align-items:flex-start;
          }

          .brand h1{
            font-size:16px;
          }
        }
      `}</style>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">
              <Icon
                name="calendar"
                size={24}
              />
            </div>

            <div>
              <h1>
                تقویم اقتصادی
              </h1>

              <p>
                Trading AI · Real
                Economic Calendar
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button
              className="icon-btn"
              onClick={() =>
                setShowSettings(
                  (value) => !value
                )
              }
              title="تنظیمات"
            >
              <Icon name="settings" />
            </button>

            <button
              className="icon-btn"
              onClick={loadData}
              title="به‌روزرسانی"
            >
              <Icon name="refresh" />
            </button>
          </div>
        </header>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <section className="hero">
          <div className="hero-grid">
            <div>
              <div className="live-badge">
                <i className="live-dot" />
                اتصال به تقویم اقتصادی
                واقعی
              </div>

              <h2>
                اخبار بازار،
                <span>
                  بدون داده ساختگی
                </span>
              </h2>

              <p>
                رویدادهای اقتصادی مهم،
                تصمیمات بانک‌های مرکزی،
                CPI، NFP، FOMC، GDP و
                سایر داده‌های کلیدی را
                با زمان‌بندی واقعی مشاهده
                کن. سیستم قبل از رویداد
                هشدار می‌دهد و اطلاعات
                Previous / Forecast /
                Actual را نمایش می‌دهد.
              </p>
            </div>

            <div className="next-card">
              <div className="next-label">
                مهم‌ترین رویداد بعدی
              </div>

              {nextHigh ? (
                <>
                  <div className="next-name">
                    {nextHigh.event}
                  </div>

                  <div className="next-time">
                    {formatCountdown(
                      nextHigh.eventTime
                    )}
                  </div>
                </>
              ) : (
                <div className="next-name">
                  رویداد مهمی پیدا نشد
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="stat">
            <div className="stat-title">
              کل رویدادهای آینده
            </div>

            <div className="stat-value stat-gold">
              {events.length}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">
              رویدادهای پر اهمیت
            </div>

            <div className="stat-value stat-red">
              {highCount}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">
              رویدادهای متوسط
            </div>

            <div className="stat-value stat-orange">
              {mediumCount}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">
              آخرین بروزرسانی
            </div>

            <div className="stat-value stat-green">
              {lastUpdated
                ? lastUpdated.toLocaleTimeString(
                    "fa-IR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )
                : "—"}
            </div>
          </div>
        </section>

        <section className="toolbar">
          <div className="search-wrap">
            <Icon name="search" />

            <input
              className="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="جستجوی NFP، CPI، FOMC، کشور، ارز..."
            />
          </div>

          <select
            className="select"
            value={impactFilter}
            onChange={(event) =>
              setImpactFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              همه اهمیت‌ها
            </option>

            <option value="HIGH">
              🔴 اهمیت بالا
            </option>

            <option value="MEDIUM">
              🟠 اهمیت متوسط
            </option>

            <option value="LOW">
              🟢 اهمیت کم
            </option>
          </select>

          <select
            className="select"
            value={currencyFilter}
            onChange={(event) =>
              setCurrencyFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              همه ارزها
            </option>

            {currencies.map(
              (currency) => (
                <option
                  key={currency}
                  value={currency}
                >
                  {currency}
                </option>
              )
            )}
          </select>

          <button
            className="refresh-btn"
            onClick={loadData}
          >
            <Icon
              name="refresh"
              size={17}
            />
            بروزرسانی
          </button>
        </section>

        <section className="events">
          {loading ? (
            <div className="empty">
              در حال دریافت تقویم
              اقتصادی واقعی...
            </div>
          ) : filteredEvents.length ===
            0 ? (
            <div className="empty">
              رویدادی مطابق فیلترها
              پیدا نشد.
            </div>
          ) : (
            filteredEvents.map(
              (event) => (
                <article
                  className="event"
                  key={event.id}
                >
                  <div className="event-top">
                    <div className="event-currency">
                      <span>
                        {event.country ||
                          "🌐"}
                      </span>

                      <span className="currency">
                        {event.currency ||
                          "GLOBAL"}
                      </span>
                    </div>

                    <div
                      className={`impact ${impactClass(
                        event.importance
                      )}`}
                    >
                      {impactText(
                        event.importance
                      )}
                    </div>
                  </div>

                  <h3>
                    {event.event}
                  </h3>

                  <div className="category">
                    {event.category ||
                      "Economic Event"}
                  </div>

                  <div className="event-time-grid">
                    <div className="time-box">
                      <span>
                        🇬🇧 لندن
                      </span>

                      <strong>
                        {formatTime(
                          event.eventTime,
                          "Europe/London"
                        )}
                      </strong>
                    </div>

                    <div className="time-box">
                      <span>
                        🇺🇸 نیویورک
                      </span>

                      <strong>
                        {formatTime(
                          event.eventTime,
                          "America/New_York"
                        )}
                      </strong>
                    </div>

                    <div className="time-box">
                      <span>
                        🇮🇷 تهران
                      </span>

                      <strong>
                        {formatTime(
                          event.eventTime,
                          "Asia/Tehran"
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="event-data">
                    <div className="data-box">
                      <span>
                        Previous
                      </span>

                      <strong>
                        {event.previous ||
                          "—"}
                      </strong>
                    </div>

                    <div className="data-box">
                      <span>
                        Forecast
                      </span>

                      <strong>
                        {event.forecast ||
                          "—"}
                      </strong>
                    </div>

                    <div className="data-box">
                      <span>
                        Actual
                      </span>

                      <strong>
                        {event.actual ||
                          "Pending"}
                      </strong>
                    </div>
                  </div>

                  <div className="event-footer">
                    <div className="countdown">
                      <Icon
                        name="clock"
                        size={14}
                      />{" "}
                      {formatCountdown(
                        event.eventTime
                      )}
                    </div>

                    {event.sourceUrl ? (
                      <a
                        className="source"
                        href={
                          event.sourceUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        منبع خبر ↗
                      </a>
                    ) : (
                      <span className="source">
                        FinanceCalendar
                      </span>
                    )}
                  </div>
                </article>
              )
            )
          )}
        </section>

        {showSettings && (
          <section className="settings-panel">
            <div className="settings-head">
              <div>
                <h3>
                  تنظیمات ویژه اخبار
                </h3>

                <div
                  style={{
                    color: "#657286",
                    fontSize: 11,
                    marginTop: 5,
                  }}
                >
                  کنترل کامل فیلتر اخبار،
                  ریسک و هشدار تلگرام
                </div>
              </div>

              <Icon
                name="settings"
                size={22}
              />
            </div>

            <div className="setting-grid">
              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      اخبار High Impact
                    </strong>

                    <span>
                      CPI / NFP / FOMC
                      و رویدادهای مهم
                    </span>
                  </div>

                  <button
                    className={`switch ${
                      settings.highImpact
                        ? "on"
                        : ""
                    }`}
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          highImpact:
                            !current.highImpact,
                        })
                      )
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      اخبار Medium Impact
                    </strong>

                    <span>
                      رویدادهای با اهمیت
                      متوسط
                    </span>
                  </div>

                  <button
                    className={`switch ${
                      settings.mediumImpact
                        ? "on"
                        : ""
                    }`}
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          mediumImpact:
                            !current.mediumImpact,
                        })
                      )
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      News Filter
                    </strong>

                    <span>
                      توقف/کاهش معاملات
                      نزدیک خبر مهم
                    </span>
                  </div>

                  <button
                    className={`switch ${
                      settings.newsFilterEnabled
                        ? "on"
                        : ""
                    }`}
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          newsFilterEnabled:
                            !current.newsFilterEnabled,
                        })
                      )
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      Market Risk
                    </strong>

                    <span>
                      کنترل ریسک هنگام
                      رویدادهای مهم
                    </span>
                  </div>

                  <button
                    className={`switch ${
                      settings.marketRiskEnabled
                        ? "on"
                        : ""
                    }`}
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          marketRiskEnabled:
                            !current.marketRiskEnabled,
                        })
                      )
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      Telegram Alerts
                    </strong>

                    <span>
                      ارسال هشدارهای اقتصادی
                      به کانال تلگرام
                    </span>
                  </div>

                  <button
                    className={`switch ${
                      settings.telegramEnabled
                        ? "on"
                        : ""
                    }`}
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          telegramEnabled:
                            !current.telegramEnabled,
                        })
                      )
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>

              <div className="setting-card">
                <strong>
                  ارزهای تحت نظر
                </strong>

                <div className="currency-list">
                  {currencies.map(
                    (currency) => (
                      <button
                        key={currency}
                        className={`currency-btn ${
                          settings.currencies.includes(
                            currency
                          )
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          toggleCurrency(
                            currency
                          )
                        }
                      >
                        {currency}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      هشدار پیش‌فرض
                    </strong>

                    <span>
                      هشدار اصلی قبل از
                      خبر
                    </span>
                  </div>

                  <strong
                    style={{
                      color:
                        "#e4c568",
                    }}
                  >
                    {settings.alertMinutes.join(
                      " / "
                    )}{" "}
                    دقیقه
                  </strong>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-row">
                  <div>
                    <strong>
                      وضعیت سیستم
                    </strong>

                    <span>
                      اتصال دیتای اقتصادی
                    </span>
                  </div>

                  <Icon
                    name="check"
                    size={24}
                  />
                </div>
              </div>
            </div>

            <button
              className="save-btn"
              disabled={saving}
              onClick={saveSettings}
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تنظیمات"}
            </button>
          </section>
        )}

        <footer className="footer">
          داده‌های تقویم اقتصادی از{" "}
          <a
            href="https://www.financecalendar.com"
            target="_blank"
            rel="noreferrer"
          >
            FinanceCalendar
          </a>{" "}
          دریافت می‌شوند. این بخش سیگنال
          خرید/فروش تولید نمی‌کند و صرفاً
          هشدار و اطلاعات رویداد اقتصادی
          ارائه می‌دهد.
        </footer>
      </div>
    </main>
  );
}
