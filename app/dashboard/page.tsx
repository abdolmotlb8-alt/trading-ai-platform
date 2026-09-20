
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Globe,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Palette,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Telegram,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
  X,
  Zap,
} from "lucide-react";

type BotItem = {
  id?: string | number;
  name?: string;
  symbol?: string;
  status?: string;
  isActive?: boolean;
  active?: boolean;
  telegramEnabled?: boolean;
  strategy?: string;
};

type Language = "fa" | "en";

const translations = {
  fa: {
    dashboard: "داشبورد",
    overview: "نمای کلی",
    market: "بازار",
    aiAnalysis: "تحلیل هوشمند AI",
    bots: "ربات‌های معاملاتی",
    news: "اخبار بازار",
    telegram: "اتصال تلگرام",
    settings: "تنظیمات",
    support: "پشتیبانی",
    account: "حساب کاربری",
    logout: "خروج از حساب",
    welcome: "خوش آمدید",
    overviewText: "مرکز مدیریت هوشمند معاملات و ربات‌های شما",
    activeBots: "ربات‌های فعال",
    totalBots: "مجموع ربات‌ها",
    telegramStatus: "وضعیت تلگرام",
    connected: "متصل",
    disconnected: "متصل نیست",
    marketStatus: "وضعیت بازار",
    online: "آنلاین",
    quickAccess: "دسترسی سریع",
    manageBots: "مدیریت ربات‌ها",
    manageBotsText: "ساخت و مدیریت ربات‌های معاملاتی",
    marketChart: "نمودار بازار",
    marketChartText: "بررسی روند و قیمت دارایی‌ها",
    aiTools: "ابزارهای هوشمند",
    aiToolsText: "تحلیل بازار با هوش مصنوعی",
    latestNews: "آخرین اخبار",
    latestNewsText: "اخبار و رویدادهای بازار",
    systemStatus: "وضعیت سیستم",
    systemStatusText: "بررسی اتصال سرویس‌ها",
    view: "مشاهده",
    refresh: "به‌روزرسانی",
    search: "جست‌وجو...",
    light: "روشن",
    dark: "تاریک",
    language: "زبان",
    noBots: "هنوز رباتی ثبت نشده است",
    createBot: "ساخت ربات جدید",
    realData: "داده‌های متصل به سیستم",
  },
  en: {
    dashboard: "Dashboard",
    overview: "Overview",
    market: "Market",
    aiAnalysis: "AI Analysis",
    bots: "Trading Bots",
    news: "Market News",
    telegram: "Telegram",
    settings: "Settings",
    support: "Support",
    account: "Account",
    logout: "Log out",
    welcome: "Welcome",
    overviewText: "Your intelligent trading and bot management center",
    activeBots: "Active Bots",
    totalBots: "Total Bots",
    telegramStatus: "Telegram Status",
    connected: "Connected",
    disconnected: "Disconnected",
    marketStatus: "Market Status",
    online: "Online",
    quickAccess: "Quick Access",
    manageBots: "Manage Bots",
    manageBotsText: "Create and manage trading bots",
    marketChart: "Market Chart",
    marketChartText: "Review market prices and trends",
    aiTools: "AI Tools",
    aiToolsText: "Analyze markets with AI",
    latestNews: "Latest News",
    latestNewsText: "Market news and events",
    systemStatus: "System Status",
    systemStatusText: "Check service connections",
    view: "View",
    refresh: "Refresh",
    search: "Search...",
    light: "Light",
    dark: "Dark",
    language: "Language",
    noBots: "No bots have been created yet",
    createBot: "Create New Bot",
    realData: "Connected system data",
  },
};

export default function DashboardPage() {
  const [language, setLanguage] = useState<Language>("fa");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [bots, setBots] = useState<BotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isFa = language === "fa";
  const t = translations[language];

  const direction = isFa ? "rtl" : "ltr";

  const activeBots = useMemo(
    () =>
      bots.filter(
        (bot) => bot.isActive === true || bot.active === true
      ).length,
    [bots]
  );

  async function loadBots() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bots", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load bots");
      }

      const data = await response.json();

      const receivedBots = Array.isArray(data)
        ? data
        : Array.isArray(data.bots)
        ? data.bots
        : Array.isArray(data.data)
        ? data.data
        : [];

      setBots(receivedBots);
    } catch {
      setError(
        isFa
          ? "دریافت اطلاعات ربات‌ها ناموفق بود."
          : "Failed to load bot information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots();
  }, []);

  function navigateTo(path: string) {
    window.location.href = path;
  }

  function logout() {
    window.location.href = "/api/auth/signout";
  }

  const menuItems = [
    {
      id: "dashboard",
      label: t.dashboard,
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      id: "market",
      label: t.market,
      icon: LineChart,
      path: "/market",
    },
    {
      id: "ai",
      label: t.aiAnalysis,
      icon: Sparkles,
      path: "/ai-analysis",
    },
    {
      id: "bots",
      label: t.bots,
      icon: Bot,
      path: "/bots",
    },
    {
      id: "news",
      label: t.news,
      icon: Newspaper,
      path: "/news",
    },
    {
      id: "telegram",
      label: t.telegram,
      icon: Bell,
      path: "/settings/telegram",
    },
    {
      id: "settings",
      label: t.settings,
      icon: Settings,
      path: "/settings",
    },
  ];

  const quickCards = [
    {
      title: t.manageBots,
      description: t.manageBotsText,
      icon: Bot,
      href: "/bots",
      iconClass: "text-cyan-400",
    },
    {
      title: t.marketChart,
      description: t.marketChartText,
      icon: BarChart3,
      href: "/market",
      iconClass: "text-emerald-400",
    },
    {
      title: t.aiTools,
      description: t.aiToolsText,
      icon: Sparkles,
      href: "/ai-analysis",
      iconClass: "text-violet-400",
    },
    {
      title: t.latestNews,
      description: t.latestNewsText,
      icon: Newspaper,
      href: "/news",
      iconClass: "text-amber-400",
    },
  ];

  return (
    <main
      dir={direction}
      className={
        darkMode
          ? "min-h-screen bg-[#050d1a] text-white"
          : "min-h-screen bg-slate-100 text-slate-900"
      }
    >
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 z-40 w-72 transform border-e transition-transform duration-300 lg:static lg:translate-x-0 ${
            isFa ? "right-0" : "left-0"
          } ${
            sidebarOpen
              ? "translate-x-0"
              : isFa
              ? "translate-x-full"
              : "-translate-x-full"
          } ${
            darkMode
              ? "border-white/10 bg-[#081525]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex h-full flex-col p-5">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-400/10 p-3">
                  <Zap className="text-cyan-400" size={25} />
                </div>

                <div>
                  <h1 className="text-lg font-black tracking-wide">
                    Trading AI
                  </h1>
                  <p className="text-xs text-slate-400">Smart Trading Platform</p>
                </div>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-500">
              {isFa ? "منوی اصلی" : "Main Menu"}
            </p>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const selected = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.path)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      selected
                        ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/10"
                        : darkMode
                        ? "text-slate-300 hover:bg-white/5 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    {selected && (
                      <ChevronLeft
                        className={isFa ? "mr-auto" : "ml-auto"}
                        size={16}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2">
              <button
                onClick={() => navigateTo("/support")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  darkMode
                    ? "text-slate-300 hover:bg-white/5"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CircleHelp size={19} />
                {t.support}
              </button>

              <button
                onClick={() => navigateTo("/settings")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  darkMode
                    ? "text-slate-300 hover:bg-white/5"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Settings size={19} />
                {t.settings}
              </button>

              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-rose-400 hover:bg-rose-400/10"
              >
                <LogOut size={19} />
                {t.logout}
              </button>

              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={18} />
                  <span className="text-xs font-bold">
                    {isFa ? "امنیت حساب" : "Account Security"}
                  </span>
                </div>
                <p className="text-xs leading-6 text-slate-400">
                  {isFa
                    ? "اطلاعات حساب از طریق نشست ورود فعلی مدیریت می‌شود."
                    : "Your account is managed through the current login session."}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header
            className={`sticky top-0 z-20 border-b backdrop-blur-xl ${
              darkMode
                ? "border-white/10 bg-[#050d1a]/80"
                : "border-slate-200 bg-white/80"
            }`}
          >
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl p-2 hover:bg-white/10 lg:hidden"
                >
                  <Menu size={22} />
                </button>

                <div className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 sm:flex">
                  <Search size={17} className="text-slate-400" />
                  <input
                    placeholder={t.search}
                    className={`w-36 bg-transparent text-sm outline-none ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => setLanguage(isFa ? "en" : "fa")}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"
                >
                  <Globe size={17} />
                  {isFa ? "EN" : "FA"}
                </button>

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="rounded-xl border border-white/10 p-2.5"
                  aria-label="Toggle theme"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button
                  className="relative rounded-xl border border-white/10 p-2.5"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-400" />
                </button>

                <div className="hidden items-center gap-2 sm:flex">
                  <div className="rounded-xl bg-cyan-400/10 p-2">
                    <UserRound className="text-cyan-400" size={20} />
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-bold">
                      {isFa ? "حساب کاربری" : "User Account"}
                    </p>
                    <p className="text-[10px] text-slate-400">FREE PLAN</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-10">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs text-cyan-400">
                  <Activity size={15} />
                  <span>{t.realData}</span>
                </div>

                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {t.welcome} 👋
                </h2>

                <p className="mt-3 text-sm text-slate-400">
                  {t.overviewText}
                </p>
              </div>

              <button
                onClick={loadBots}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                {t.refresh}
              </button>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={t.activeBots}
                value={loading ? "—" : String(activeBots)}
                icon={<Bot size={22} />}
                iconClass="text-cyan-400"
                darkMode={darkMode}
              />

              <StatCard
                title={t.totalBots}
                value={loading ? "—" : String(bots.length)}
                icon={<Activity size={22} />}
                iconClass="text-violet-400"
                darkMode={darkMode}
              />

              <StatCard
                title={t.telegramStatus}
                value={t.disconnected}
                icon={<Bell size={22} />}
                iconClass="text-amber-400"
                darkMode={darkMode}
                small
              />

              <StatCard
                title={t.marketStatus}
                value={t.online}
                icon={<LineChart size={22} />}
                iconClass="text-emerald-400"
                darkMode={darkMode}
                small
              />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black">{t.quickAccess}</h3>
              <span className="text-xs text-slate-500">
                {isFa ? "دسترسی سریع به بخش‌ها" : "Navigate your workspace"}
              </span>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickCards.map((card) => {
                const Icon = card.icon;

                return (
                  <button
                    key={card.title}
                    onClick={() => navigateTo(card.href)}
                    className={`group rounded-3xl border p-5 text-start transition hover:-translate-y-1 ${
                      darkMode
                        ? "border-white/10 bg-[#0a1a2d] hover:border-cyan-400/40"
                        : "border-slate-200 bg-white hover:border-cyan-400"
                    }`}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <div
                        className={`rounded-2xl bg-white/5 p-3 ${card.iconClass}`}
                      >
                        <Icon size={24} />
                      </div>
                      {isFa ? (
                        <ArrowLeft
                          size={17}
                          className="text-slate-500 transition group-hover:text-cyan-400"
                        />
                      ) : (
                        <ArrowRight
                          size={17}
                          className="text-slate-500 transition group-hover:text-cyan-400"
                        />
                      )}
                    </div>

                    <h4 className="mb-2 font-bold">{card.title}</h4>
                    <p className="text-xs leading-6 text-slate-400">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div
                className={`rounded-3xl border p-6 xl:col-span-2 ${
                  darkMode
                    ? "border-white/10 bg-[#0a1a2d]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black">{t.bots}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {isFa
                        ? "اطلاعات دریافت‌شده از API ربات‌ها"
                        : "Information loaded from the bots API"}
                    </p>
                  </div>

                  <button
                    onClick={() => navigateTo("/bots")}
                    className="rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-400"
                  >
                    {t.view}
                  </button>
                </div>

                {error && (
                  <div className="mb-4 rounded-2xl bg-rose-400/10 p-4 text-sm text-rose-400">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-12 text-slate-400">
                    <RefreshCw className="me-2 animate-spin" size={18} />
                    Loading...
                  </div>
                ) : bots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                    <Bot className="mx-auto mb-3 text-slate-500" size={35} />
                    <p className="text-sm text-slate-400">{t.noBots}</p>
                    <button
                      onClick={() => navigateTo("/bots")}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-bold text-slate-950"
                    >
                      <Plus size={16} />
                      {t.createBot}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bots.slice(0, 5).map((bot, index) => {
                      const enabled =
                        bot.isActive === true || bot.active === true;

                      return (
                        <div
                          key={String(bot.id ?? index)}
                          className={`flex items-center justify-between rounded-2xl border p-4 ${
                            darkMode
                              ? "border-white/5 bg-white/[0.025]"
                              : "border-slate-100 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-cyan-400/10 p-3">
                              <Bot className="text-cyan-400" size={20} />
                            </div>

                            <div>
                              <p className="text-sm font-bold">
                                {bot.name || `Bot ${index + 1}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {bot.symbol || bot.strategy || "Trading Bot"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                              enabled
                                ? "bg-emerald-400/10 text-emerald-400"
                                : "bg-slate-400/10 text-slate-400"
                            }`}
                          >
                            {enabled
                              ? isFa
                                ? "فعال"
                                : "Active"
                              : isFa
                              ? "غیرفعال"
                              : "Inactive"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className={`rounded-3xl border p-6 ${
                  darkMode
                    ? "border-white/10 bg-[#0a1a2d]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-400/10 p-3">
                    <ShieldCheck className="text-emerald-400" size={21} />
                  </div>
                  <div>
                    <h3 className="font-black">{t.systemStatus}</h3>
                    <p className="text-xs text-slate-400">
                      {t.systemStatusText}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <StatusRow
                    label={isFa ? "رابط کاربری" : "User Interface"}
                    status={isFa ? "فعال" : "Operational"}
                    color="bg-emerald-400"
                  />

                  <StatusRow
                    label={isFa ? "API ربات‌ها" : "Bots API"}
                    status={loading ? "..." : "Connected"}
                    color="bg-cyan-400"
                  />

                  <StatusRow
                    label={isFa ? "اتصال تلگرام" : "Telegram API"}
                    status={isFa ? "نیازمند بررسی" : "Needs verification"}
                    color="bg-amber-400"
                  />

                  <StatusRow
                    label={isFa ? "داده بازار" : "Market Data"}
                    status={isFa ? "نیازمند اتصال" : "Needs integration"}
                    color="bg-amber-400"
                  />
                </div>

                <button
                  onClick={() => navigateTo("/settings")}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold hover:bg-white/5"
                >
                  <Settings size={16} />
                  {t.settings}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconClass,
  darkMode,
  small = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  darkMode: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        darkMode
          ? "border-white/10 bg-[#0a1a2d]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400">{title}</p>
        <div className={`rounded-xl bg-white/5 p-3 ${iconClass}`}>{icon}</div>
      </div>

      <p className={small ? "text-xl font-black" : "text-3xl font-black"}>
        {value}
      </p>
    </div>
  );
}

function StatusRow({
  label,
  status,
  color,
}: {
  label: string;
  status: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-300">{status}</span>
    </div>
  );
}
