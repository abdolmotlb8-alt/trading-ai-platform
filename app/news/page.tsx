"use client";

import { useEffect, useMemo, useState } from "react";

type Importance = "HIGH" | "MEDIUM" | "LOW";
type EventStatus = "WAITING" | "RELEASED" | "CANCELLED";

type EconomicEvent = {
  id: string;
  time: string;
  date: string;
  currency: string;
  country: string;
  flag: string;
  event: string;
  importance: Importance;
  previous: string;
  forecast: string;
  actual: string;
  status: EventStatus;
  session: string;
  symbolImpact: string[];
};

const DEMO_EVENTS: EconomicEvent[] = [
  {
    id: "1",
    time: "14:30",
    date: "امروز",
    currency: "USD",
    country: "آمریکا",
    flag: "🇺🇸",
    event: "CPI - تورم مصرف‌کننده آمریکا",
    importance: "HIGH",
    previous: "3.4%",
    forecast: "3.2%",
    actual: "—",
    status: "WAITING",
    session: "نیویورک",
    symbolImpact: ["XAUUSD", "EURUSD", "USDJPY"],
  },
  {
    id: "2",
    time: "16:00",
    date: "امروز",
    currency: "EUR",
    country: "منطقه یورو",
    flag: "🇪🇺",
    event: "تولید ناخالص داخلی (فصلی)",
    importance: "HIGH",
    previous: "0.2%",
    forecast: "0.3%",
    actual: "—",
    status: "WAITING",
    session: "لندن",
    symbolImpact: ["EURUSD", "EURGBP"],
  },
  {
    id: "3",
    time: "17:30",
    date: "امروز",
    currency: "GBP",
    country: "بریتانیا",
    flag: "🇬🇧",
    event: "نرخ بیکاری بریتانیا",
    importance: "MEDIUM",
    previous: "4.2%",
    forecast: "4.1%",
    actual: "—",
    status: "WAITING",
    session: "لندن",
    symbolImpact: ["GBPUSD", "EURGBP"],
  },
  {
    id: "4",
    time: "18:00",
    date: "امروز",
    currency: "USD",
    country: "آمریکا",
    flag: "🇺🇸",
    event: "شاخص مدعیان بیکاری",
    importance: "MEDIUM",
    previous: "217K",
    forecast: "218K",
    actual: "—",
    status: "WAITING",
    session: "نیویورک",
    symbolImpact: ["XAUUSD", "EURUSD"],
  },
  {
    id: "5",
    time: "19:00",
    date: "امروز",
    currency: "USD",
    country: "آمریکا",
    flag: "🇺🇸",
    event: "سخنرانی عضو فدرال رزرو",
    importance: "LOW",
    previous: "—",
    forecast: "—",
    actual: "—",
    status: "WAITING",
    session: "نیویورک",
    symbolImpact: ["XAUUSD", "EURUSD"],
  },
  {
    id: "6",
    time: "22:45",
    date: "فردا",
    currency: "NZD",
    country: "نیوزیلند",
    flag: "🇳🇿",
    event: "نرخ بهره بانک مرکزی نیوزیلند",
    importance: "HIGH",
    previous: "5.25%",
    forecast: "5.50%",
    actual: "—",
    status: "WAITING",
    session: "آسیا",
    symbolImpact: ["NZDUSD", "AUDNZD"],
  },
  {
    id: "7",
    time: "23:30",
    date: "فردا",
    currency: "JPY",
    country: "ژاپن",
    flag: "🇯🇵",
    event: "شاخص قیمت تولیدکننده",
    importance: "MEDIUM",
    previous: "2.8%",
    forecast: "2.6%",
    actual: "—",
    status: "WAITING",
    session: "آسیا",
    symbolImpact: ["USDJPY", "EURJPY"],
  },
  {
    id: "8",
    time: "01:00",
    date: "فردا",
    currency: "CAD",
    country: "کانادا",
    flag: "🇨🇦",
    event: "گزارش اشتغال کانادا",
    importance: "HIGH",
    previous: "-12.6K",
    forecast: "15.0K",
    actual: "—",
    status: "WAITING",
    session: "نیویورک",
    symbolImpact: ["USDCAD", "CADJPY"],
  },
];

const CURRENCIES = [
  { code: "USD", flag: "🇺🇸", name: "دلار آمریکا" },
  { code: "EUR", flag: "🇪🇺", name: "یورو" },
  { code: "GBP", flag: "🇬🇧", name: "پوند انگلیس" },
  { code: "JPY", flag: "🇯🇵", name: "ین ژاپن" },
  { code: "CHF", flag: "🇨🇭", name: "فرانک سوئیس" },
  { code: "CAD", flag: "🇨🇦", name: "دلار کانادا" },
  { code: "AUD", flag: "🇦🇺", name: "دلار استرالیا" },
  { code: "NZD", flag: "🇳🇿", name: "دلار نیوزیلند" },
];

const SESSIONS = [
  {
    id: "آسیا",
    icon: "🌏",
    title: "سشن آسیا",
    time: "00:00 - 09:00",
  },
  {
    id: "لندن",
    icon: "🇬🇧",
    title: "سشن لندن",
    time: "08:00 - 17:00",
  },
  {
    id: "نیویورک",
    icon: "🇺🇸",
    title: "سشن نیویورک",
    time: "13:00 - 22:00",
  },
];

function importanceLabel(value: Importance) {
  if (value === "HIGH") return "بالا";
  if (value === "MEDIUM") return "متوسط";
  return "پایین";
}

function statusLabel(value: EventStatus) {
  if (value === "RELEASED") return "منتشر شده";
  if (value === "CANCELLED") return "لغو شده";
  return "در انتظار";
}

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "اکنون";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

export default function NewsPage() {
  const [activeDate, setActiveDate] = useState("امروز");
  const [selectedCurrency, setSelectedCurrency] = useState("ALL");
  const [selectedImportance, setSelectedImportance] = useState("ALL");
  const [selectedSession, setSelectedSession] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const [favorites, setFavorites] = useState<string[]>([]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [highImpact, setHighImpact] = useState(true);
  const [mediumImpact, setMediumImpact] = useState(true);
  const [lowImpact, setLowImpact] = useState(false);

  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [newsFilterEnabled, setNewsFilterEnabled] = useState(true);
  const [marketRiskEnabled, setMarketRiskEnabled] = useState(true);

  const [alert3h, setAlert3h] = useState(true);
  const [alert1h, setAlert1h] = useState(true);
  const [alert30m, setAlert30m] = useState(true);
  const [alert15m, setAlert15m] = useState(true);
  const [alert5m, setAlert5m] = useState(false);
  const [alertReleased, setAlertReleased] = useState(true);

  const [enabledSessions, setEnabledSessions] = useState<string[]>([
    "آسیا",
    "لندن",
    "نیویورک",
  ]);

  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>([
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CHF",
    "CAD",
    "AUD",
    "NZD",
  ]);

  const [countdown, setCountdown] = useState(2 * 3600 + 45 * 60 + 17);

  useEffect(() => {
    const saved = window.localStorage.getItem("trading-ai-news-settings");

    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      if (Array.isArray(data.enabledCurrencies)) {
        setEnabledCurrencies(data.enabledCurrencies);
      }

      if (Array.isArray(data.enabledSessions)) {
        setEnabledSessions(data.enabledSessions);
      }

      if (typeof data.highImpact === "boolean") {
        setHighImpact(data.highImpact);
      }

      if (typeof data.mediumImpact === "boolean") {
        setMediumImpact(data.mediumImpact);
      }

      if (typeof data.lowImpact === "boolean") {
        setLowImpact(data.lowImpact);
      }

      if (typeof data.telegramEnabled === "boolean") {
        setTelegramEnabled(data.telegramEnabled);
      }

      if (typeof data.newsFilterEnabled === "boolean") {
        setNewsFilterEnabled(data.newsFilterEnabled);
      }

      if (typeof data.marketRiskEnabled === "boolean") {
        setMarketRiskEnabled(data.marketRiskEnabled);
      }

      if (typeof data.alert3h === "boolean") setAlert3h(data.alert3h);
      if (typeof data.alert1h === "boolean") setAlert1h(data.alert1h);
      if (typeof data.alert30m === "boolean") setAlert30m(data.alert30m);
      if (typeof data.alert15m === "boolean") setAlert15m(data.alert15m);
      if (typeof data.alert5m === "boolean") setAlert5m(data.alert5m);
      if (typeof data.alertReleased === "boolean") {
        setAlertReleased(data.alertReleased);
      }
    } catch {
      // Ignore invalid local settings.
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const saveSettings = () => {
    const settings = {
      enabledCurrencies,
      enabledSessions,
      highImpact,
      mediumImpact,
      lowImpact,
      telegramEnabled,
      newsFilterEnabled,
      marketRiskEnabled,
      alert3h,
      alert1h,
      alert30m,
      alert15m,
      alert5m,
      alertReleased,
    };

    window.localStorage.setItem(
      "trading-ai-news-settings",
      JSON.stringify(settings)
    );

    setSettingsOpen(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleCurrency = (currency: string) => {
    setEnabledCurrencies((current) =>
      current.includes(currency)
        ? current.filter((item) => item !== currency)
        : [...current, currency]
    );
  };

  const toggleSession = (session: string) => {
    setEnabledSessions((current) =>
      current.includes(session)
        ? current.filter((item) => item !== session)
        : [...current, session]
    );
  };

  const filteredEvents = useMemo(() => {
    return DEMO_EVENTS.filter((item) => {
      const matchesDate =
        activeDate === "همه" ||
        item.date === activeDate ||
        (activeDate === "این هفته" &&
          ["امروز", "فردا"].includes(item.date));

      const matchesCurrency =
        selectedCurrency === "ALL" ||
        item.currency === selectedCurrency;

      const matchesImportance =
        selectedImportance === "ALL" ||
        item.importance === selectedImportance;

      const matchesSession =
        selectedSession === "ALL" ||
        item.session === selectedSession;

      const matchesStatus =
        selectedStatus === "ALL" ||
        item.status === selectedStatus;

      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        item.event.toLowerCase().includes(normalizedSearch) ||
        item.currency.toLowerCase().includes(normalizedSearch) ||
        item.country.toLowerCase().includes(normalizedSearch) ||
        item.symbolImpact.some((symbol) =>
          symbol.toLowerCase().includes(normalizedSearch)
        );

      const importanceEnabled =
        (item.importance === "HIGH" && highImpact) ||
        (item.importance === "MEDIUM" && mediumImpact) ||
        (item.importance === "LOW" && lowImpact);

      const currencyEnabled = enabledCurrencies.includes(item.currency);
      const sessionEnabled = enabledSessions.includes(item.session);

      return (
        matchesDate &&
        matchesCurrency &&
        matchesImportance &&
        matchesSession &&
        matchesStatus &&
        matchesSearch &&
        importanceEnabled &&
        currencyEnabled &&
        sessionEnabled
      );
    });
  }, [
    activeDate,
    selectedCurrency,
    selectedImportance,
    selectedSession,
    selectedStatus,
    search,
    highImpact,
    mediumImpact,
    lowImpact,
    enabledCurrencies,
    enabledSessions,
  ]);

  const highEvents = DEMO_EVENTS.filter(
    (item) => item.importance === "HIGH"
  ).length;

  const nextEvent = DEMO_EVENTS[0];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#020817] text-slate-100"
    >
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_25%)]">
        <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 lg:px-8 lg:py-7">
          {/* Header */}
          <header className="mb-5 rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/20 text-xl text-blue-400 ring-1 ring-blue-500/30">
                    ◈
                  </div>

                  <div>
                    <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                      اخبار و تقویم اقتصادی
                    </h1>
                    <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                      مرکز هوشمند اخبار، رویدادها و هشدارهای اقتصادی Trading AI
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  سیستم آماده
                </div>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                >
                  ⚙ تنظیمات اخبار
                </button>
              </div>
            </div>
          </header>

          {/* Top cards */}
          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">وضعیت بازار</span>
                <span className="rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                  LIVE
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-amber-400/70 border-b-emerald-400 border-l-emerald-400">
                  <span className="text-xs font-bold text-slate-300">
                    62%
                  </span>
                </div>

                <div>
                  <p className="text-lg font-black text-amber-300">
                    نوسان متوسط
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ریسک قابل مدیریت
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-red-500/25 bg-gradient-to-br from-red-500/10 to-slate-950/80 p-5 shadow-xl shadow-red-950/10 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-red-300">
                  مهم‌ترین خبر بعدی
                </span>

                <span className="rounded-xl bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-300">
                  HIGH
                </span>
              </div>

              <div className="flex gap-3">
                <span className="text-3xl">{nextEvent.flag}</span>

                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-black text-white">
                    {nextEvent.event}
                  </p>

                  <p className="mt-3 font-mono text-xl font-black text-red-300">
                    {formatCountdown(countdown)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    تا زمان انتشار
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-slate-400">سشن فعال</span>
                <span className="text-xl">🌍</span>
              </div>

              <p className="text-2xl font-black text-blue-300">
                نیویورک
              </p>

              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                بازار فعال
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-slate-400">اخبار مهم امروز</span>
                <span className="text-xl">🔥</span>
              </div>

              <p className="text-3xl font-black text-white">
                {highEvents}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                رویداد با اهمیت بالا
              </p>
            </div>
          </section>

          {/* Main layout */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Calendar */}
            <div className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    تقویم اقتصادی
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    رویدادهای اقتصادی بر اساس زمان، ارز، اهمیت و سشن
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs text-blue-300">
                  {filteredEvents.length} رویداد نمایش داده می‌شود
                </div>
              </div>

              {/* Date tabs */}
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {["امروز", "فردا", "این هفته", "همه"].map((date) => (
                  <button
                    type="button"
                    key={date}
                    onClick={() => setActiveDate(date)}
                    className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                      activeDate === date
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                        : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="mb-5">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-slate-500">⌕</span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="جستجوی خبر، ارز، کشور یا نماد..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-xs text-slate-500 hover:text-white"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect
                  title="ارز"
                  value={selectedCurrency}
                  onChange={setSelectedCurrency}
                  options={[
                    ["ALL", "همه ارزها"],
                    ...CURRENCIES.map((item) => [
                      item.code,
                      `${item.flag} ${item.code}`,
                    ]),
                  ]}
                />

                <FilterSelect
                  title="اهمیت"
                  value={selectedImportance}
                  onChange={setSelectedImportance}
                  options={[
                    ["ALL", "همه اهمیت‌ها"],
                    ["HIGH", "🔴 بالا"],
                    ["MEDIUM", "🟠 متوسط"],
                    ["LOW", "🟢 پایین"],
                  ]}
                />

                <FilterSelect
                  title="سشن"
                  value={selectedSession}
                  onChange={setSelectedSession}
                  options={[
                    ["ALL", "همه سشن‌ها"],
                    ["آسیا", "🌏 آسیا"],
                    ["لندن", "🇬🇧 لندن"],
                    ["نیویورک", "🇺🇸 نیویورک"],
                  ]}
                />

                <FilterSelect
                  title="وضعیت"
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  options={[
                    ["ALL", "همه وضعیت‌ها"],
                    ["WAITING", "در انتظار"],
                    ["RELEASED", "منتشر شده"],
                    ["CANCELLED", "لغو شده"],
                  ]}
                />
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-right">
                    <thead className="bg-white/[0.035] text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-4 font-bold">زمان</th>
                        <th className="px-4 py-4 font-bold">کشور / ارز</th>
                        <th className="px-4 py-4 font-bold">خبر</th>
                        <th className="px-4 py-4 font-bold">اهمیت</th>
                        <th className="px-4 py-4 font-bold">قبلی</th>
                        <th className="px-4 py-4 font-bold">پیش‌بینی</th>
                        <th className="px-4 py-4 font-bold">واقعی</th>
                        <th className="px-4 py-4 font-bold">وضعیت</th>
                        <th className="px-4 py-4 font-bold">★</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredEvents.map((item) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-blue-500/[0.035]"
                        >
                          <td className="whitespace-nowrap px-4 py-5">
                            <span className="font-mono text-sm font-bold text-white">
                              {item.time}
                            </span>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{item.flag}</span>
                              <div>
                                <p className="text-sm font-bold text-white">
                                  {item.currency}
                                </p>
                                <p className="text-[11px] text-slate-600">
                                  {item.country}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="max-w-[280px] px-4 py-5">
                            <p className="font-bold text-slate-200">
                              {item.event}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.symbolImpact.slice(0, 3).map((symbol) => (
                                <span
                                  key={symbol}
                                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-500"
                                >
                                  {symbol}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <ImportanceBadge
                              value={item.importance}
                            />
                          </td>

                          <td className="px-4 py-5 text-sm text-slate-400">
                            {item.previous}
                          </td>

                          <td className="px-4 py-5 text-sm text-slate-300">
                            {item.forecast}
                          </td>

                          <td className="px-4 py-5 text-sm font-bold text-white">
                            {item.actual}
                          </td>

                          <td className="px-4 py-5">
                            <StatusBadge value={item.status} />
                          </td>

                          <td className="px-4 py-5">
                            <button
                              type="button"
                              onClick={() => toggleFavorite(item.id)}
                              className={`text-xl transition ${
                                favorites.includes(item.id)
                                  ? "text-amber-400"
                                  : "text-slate-700 hover:text-slate-300"
                              }`}
                            >
                              ★
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 lg:hidden">
                {filteredEvents.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="text-2xl">{item.flag}</span>

                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-black text-white">
                              {item.time}
                            </span>

                            <span className="text-xs text-slate-500">
                              {item.currency}
                            </span>
                          </div>

                          <p className="text-sm font-bold leading-6 text-slate-200">
                            {item.event}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className={`shrink-0 text-xl ${
                          favorites.includes(item.id)
                            ? "text-amber-400"
                            : "text-slate-700"
                        }`}
                      >
                        ★
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <InfoMini
                        label="اهمیت"
                        value={
                          <ImportanceBadge value={item.importance} />
                        }
                      />

                      <InfoMini
                        label="وضعیت"
                        value={<StatusBadge value={item.status} />}
                      />

                      <InfoMini
                        label="قبلی"
                        value={item.previous}
                      />

                      <InfoMini
                        label="پیش‌بینی"
                        value={item.forecast}
                      />

                      <InfoMini
                        label="واقعی"
                        value={item.actual}
                      />

                      <InfoMini
                        label="سشن"
                        value={item.session}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.symbolImpact.map((symbol) => (
                        <span
                          key={symbol}
                          className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-slate-500"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredEvents.length === 0 && (
                  <EmptyState />
                )}
              </div>

              {filteredEvents.length === 0 && (
                <div className="hidden lg:block">
                  <EmptyState />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-black">فیلتر اخبار</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      کنترل ورود خبر به سیستم تحلیل
                    </p>
                  </div>

                  <Toggle
                    enabled={newsFilterEnabled}
                    onClick={() =>
                      setNewsFilterEnabled((value) => !value)
                    }
                  />
                </div>

                <div className="space-y-3">
                  <SwitchRow
                    label="اهمیت بالا"
                    dot="bg-red-400"
                    enabled={highImpact}
                    onClick={() => setHighImpact((value) => !value)}
                  />

                  <SwitchRow
                    label="اهمیت متوسط"
                    dot="bg-amber-400"
                    enabled={mediumImpact}
                    onClick={() => setMediumImpact((value) => !value)}
                  />

                  <SwitchRow
                    label="اهمیت پایین"
                    dot="bg-emerald-400"
                    enabled={lowImpact}
                    onClick={() => setLowImpact((value) => !value)}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-5">
                  <h3 className="font-black">ارزهای فعال</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    فقط خبر ارزهای انتخاب‌شده نمایش داده شود
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map((currency) => {
                    const active = enabledCurrencies.includes(
                      currency.code
                    );

                    return (
                      <button
                        type="button"
                        key={currency.code}
                        onClick={() => toggleCurrency(currency.code)}
                        className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-xs transition ${
                          active
                            ? "border-blue-500/30 bg-blue-500/10 text-white"
                            : "border-white/10 bg-white/[0.025] text-slate-600"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{currency.flag}</span>
                          {currency.code}
                        </span>

                        <span
                          className={`h-2 w-2 rounded-full ${
                            active
                              ? "bg-emerald-400"
                              : "bg-slate-700"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-5">
                  <h3 className="font-black">سشن‌های معاملاتی</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    نمایش اخبار هر سشن
                  </p>
                </div>

                <div className="space-y-2">
                  {SESSIONS.map((session) => {
                    const active = enabledSessions.includes(session.id);

                    return (
                      <button
                        type="button"
                        key={session.id}
                        onClick={() => toggleSession(session.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-right transition ${
                          active
                            ? "border-blue-500/25 bg-blue-500/10"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {session.icon}
                          </span>

                          <div>
                            <p className="text-sm font-bold text-slate-200">
                              {session.title}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-600">
                              {session.time}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            active
                              ? "bg-emerald-400 shadow-lg shadow-emerald-500/40"
                              : "bg-slate-700"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-5">
                  <h3 className="font-black">هشدار خبر</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    زمان‌های ارسال هشدار
                  </p>
                </div>

                <div className="space-y-2">
                  <AlertRow
                    label="۳ ساعت قبل"
                    enabled={alert3h}
                    onClick={() => setAlert3h((value) => !value)}
                  />

                  <AlertRow
                    label="۱ ساعت قبل"
                    enabled={alert1h}
                    onClick={() => setAlert1h((value) => !value)}
                  />

                  <AlertRow
                    label="۳۰ دقیقه قبل"
                    enabled={alert30m}
                    onClick={() => setAlert30m((value) => !value)}
                  />

                  <AlertRow
                    label="۱۵ دقیقه قبل"
                    enabled={alert15m}
                    onClick={() => setAlert15m((value) => !value)}
                  />

                  <AlertRow
                    label="۵ دقیقه قبل"
                    enabled={alert5m}
                    onClick={() => setAlert5m((value) => !value)}
                  />

                  <AlertRow
                    label="هنگام انتشار"
                    enabled={alertReleased}
                    onClick={() =>
                      setAlertReleased((value) => !value)
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
                <h3 className="mb-4 font-black">اتصال‌ها</h3>

                <div className="space-y-3">
                  <ConnectionRow
                    title="Telegram Alerts"
                    icon="✈️"
                    enabled={telegramEnabled}
                    onClick={() =>
                      setTelegramEnabled((value) => !value)
                    }
                  />

                  <ConnectionRow
                    title="News Filter"
                    icon="🛡️"
                    enabled={newsFilterEnabled}
                    onClick={() =>
                      setNewsFilterEnabled((value) => !value)
                    }
                  />

                  <ConnectionRow
                    title="Market Risk"
                    icon="📊"
                    enabled={marketRiskEnabled}
                    onClick={() =>
                      setMarketRiskEnabled((value) => !value)
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500"
                >
                  💾 ذخیره تنظیمات
                </button>
              </div>
            </aside>
          </section>

          {/* Lower cards */}
          <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-black">اخبار مهم اخیر</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    مهم‌ترین رویدادهای قابل توجه
                  </p>
                </div>

                <span className="text-xl">🔥</span>
              </div>

              <div className="space-y-3">
                {DEMO_EVENTS.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <span className="text-xl">{item.flag}</span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-300">
                        {item.event}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-600">
                        {item.time} • {item.currency}
                      </p>
                    </div>

                    <ImportanceBadge value={item.importance} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-5">
                <h3 className="font-black">تأثیر احتمالی بر نمادها</h3>
                <p className="mt-1 text-xs text-slate-600">
                  نمادهای تحت تأثیر رویدادهای انتخاب‌شده
                </p>
              </div>

              <div className="space-y-4">
                {[
                  ["XAUUSD", "بالا", "w-[88%]", "bg-red-500"],
                  ["EURUSD", "متوسط", "w-[66%]", "bg-amber-400"],
                  ["GBPUSD", "متوسط", "w-[54%]", "bg-amber-400"],
                  ["USDJPY", "کم", "w-[35%]", "bg-emerald-400"],
                  ["AUDUSD", "کم", "w-[25%]", "bg-emerald-400"],
                ].map(([symbol, level, width, color]) => (
                  <div key={symbol}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        {symbol}
                      </span>

                      <span className="text-slate-500">{level}</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${width} ${color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-5">
                <h3 className="font-black">تقویم هفتگی</h3>
                <p className="mt-1 text-xs text-slate-600">
                  تعداد رویدادهای مهم هر روز
                </p>
              </div>

              <div className="space-y-2">
                {[
                  ["امروز", "دوشنبه", "8"],
                  ["فردا", "سه‌شنبه", "7"],
                  ["چهارشنبه", "چهارشنبه", "6"],
                  ["پنج‌شنبه", "پنج‌شنبه", "5"],
                  ["جمعه", "جمعه", "3"],
                ].map(([day, title, count]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-300">
                        {day}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {title}
                      </p>
                    </div>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-sm font-black text-blue-300">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer status */}
          <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-600 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-emerald-400">
                سیستم آماده
              </span>
              <span>•</span>
              <span>News Engine</span>
            </div>

            <div className="flex flex-wrap gap-4">
              <span>Economic Calendar</span>
              <span>News Filter</span>
              <span>Telegram Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#07111f] p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  تنظیمات کامل اخبار
                </h2>

                <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm">
                  تنظیم اهمیت خبر، ارزها، سشن‌ها، زمان هشدار و اتصال به
                  سرویس‌های جانبی.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <SettingsSection
                title="سطح اهمیت خبر"
                description="مشخص کنید کدام رویدادها وارد سیستم شوند."
              >
                <SwitchRow
                  label="خبرهای با اهمیت بالا"
                  dot="bg-red-400"
                  enabled={highImpact}
                  onClick={() => setHighImpact((value) => !value)}
                />

                <SwitchRow
                  label="خبرهای با اهمیت متوسط"
                  dot="bg-amber-400"
                  enabled={mediumImpact}
                  onClick={() => setMediumImpact((value) => !value)}
                />

                <SwitchRow
                  label="خبرهای با اهمیت پایین"
                  dot="bg-emerald-400"
                  enabled={lowImpact}
                  onClick={() => setLowImpact((value) => !value)}
                />
              </SettingsSection>

              <SettingsSection
                title="زمان هشدار"
                description="زمان‌های ارسال هشدار قبل و هنگام انتشار."
              >
                <AlertRow
                  label="۳ ساعت قبل"
                  enabled={alert3h}
                  onClick={() => setAlert3h((value) => !value)}
                />

                <AlertRow
                  label="۱ ساعت قبل"
                  enabled={alert1h}
                  onClick={() => setAlert1h((value) => !value)}
                />

                <AlertRow
                  label="۳۰ دقیقه قبل"
                  enabled={alert30m}
                  onClick={() => setAlert30m((value) => !value)}
                />

                <AlertRow
                  label="۱۵ دقیقه قبل"
                  enabled={alert15m}
                  onClick={() => setAlert15m((value) => !value)}
                />

                <AlertRow
                  label="۵ دقیقه قبل"
                  enabled={alert5m}
                  onClick={() => setAlert5m((value) => !value)}
                />

                <AlertRow
                  label="هنگام انتشار خبر"
                  enabled={alertReleased}
                  onClick={() =>
                    setAlertReleased((value) => !value)
                  }
                />
              </SettingsSection>

              <SettingsSection
                title="سشن‌های معاملاتی"
                description="اخبار مربوط به سشن‌های انتخابی نمایش داده می‌شوند."
              >
                {SESSIONS.map((session) => (
                  <AlertRow
                    key={session.id}
                    label={`${session.icon} ${session.title} — ${session.time}`}
                    enabled={enabledSessions.includes(session.id)}
                    onClick={() => toggleSession(session.id)}
                  />
                ))}
              </SettingsSection>

              <SettingsSection
                title="اتصال و فیلتر"
                description="کنترل ارتباط سیستم اخبار با بخش‌های دیگر Trading AI."
              >
                <AlertRow
                  label="News Filter برای ربات‌ها"
                  enabled={newsFilterEnabled}
                  onClick={() =>
                    setNewsFilterEnabled((value) => !value)
                  }
                />

                <AlertRow
                  label="هشدار Telegram"
                  enabled={telegramEnabled}
                  onClick={() =>
                    setTelegramEnabled((value) => !value)
                  }
                />

                <AlertRow
                  label="محاسبه وضعیت ریسک بازار"
                  enabled={marketRiskEnabled}
                  onClick={() =>
                    setMarketRiskEnabled((value) => !value)
                  }
                />
              </SettingsSection>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={saveSettings}
                className="flex-1 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-500"
              >
                💾 ذخیره تنظیمات
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/10"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function FilterSelect({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-slate-600">
        {title}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs font-bold text-slate-200 outline-none transition focus:border-blue-500/50"
      >
        {options.map(([optionValue, label]) => (
          <option
            key={optionValue}
            value={optionValue}
            className="bg-[#07111f]"
          >
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ImportanceBadge({ value }: { value: Importance }) {
  const styles =
    value === "HIGH"
      ? "border-red-500/30 bg-red-500/15 text-red-300"
      : value === "MEDIUM"
      ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
      : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-[10px] font-black ${styles}`}
    >
      {importanceLabel(value)}
    </span>
  );
}

function StatusBadge({ value }: { value: EventStatus }) {
  const styles =
    value === "RELEASED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : value === "CANCELLED"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-blue-500/20 bg-blue-500/10 text-blue-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-[10px] font-bold ${styles}`}
    >
      {statusLabel(value)}
    </span>
  );
}

function Toggle({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={enabled ? "فعال" : "غیرفعال"}
      className={`relative h-7 w-12 rounded-full transition ${
        enabled ? "bg-emerald-500" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition ${
          enabled ? "right-1" : "left-1"
        }`}
      />
    </button>
  );
}

function SwitchRow({
  label,
  dot,
  enabled,
  onClick,
}: {
  label: string;
  dot: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-right transition hover:bg-white/[0.05]"
    >
      <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {label}
      </span>

      <Toggle enabled={enabled} onClick={onClick} />
    </button>
  );
}

function AlertRow({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-right transition hover:bg-white/[0.05]"
    >
      <span className="text-xs font-bold text-slate-300">{label}</span>
      <Toggle enabled={enabled} onClick={onClick} />
    </button>
  );
}

function ConnectionRow({
  title,
  icon,
  enabled,
  onClick,
}: {
  title: string;
  icon: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
          {icon}
        </span>

        <span className="text-xs font-bold text-slate-300">
          {title}
        </span>
      </div>

      <Toggle enabled={enabled} onClick={onClick} />
    </div>
  );
}

function InfoMini({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
      <p className="mb-1 text-[9px] text-slate-600">{label}</p>
      <div className="text-xs font-bold text-slate-300">{value}</div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4">
      <h3 className="font-black text-slate-100">{title}</h3>
      <p className="mt-1 mb-4 text-xs leading-5 text-slate-600">
        {description}
      </p>

      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="text-3xl">⌕</div>
      <p className="mt-3 font-bold text-slate-300">
        رویدادی با این فیلترها پیدا نشد
      </p>
      <p className="mt-2 text-xs text-slate-600">
        فیلتر ارز، اهمیت، سشن یا جستجو را تغییر دهید.
      </p>
    </div>
  );
}
