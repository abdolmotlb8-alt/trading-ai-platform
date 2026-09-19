"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type Bot = {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string | null;

  symbol: string;
  timeframe: string;
  marketType: string;

  isActive: boolean;

  lotMode: string;
  lotSize: number;
  riskPercent: number;

  takeProfit: number | null;
  stopLoss: number | null;
  riskReward: number | null;

  trailingStop: boolean;
  trailingStopDistance: number | null;

  breakEven: boolean;
  breakEvenTrigger: number | null;

  dailyProfitStop: number | null;
  dailyLossLimit: number | null;
  maxDailyStopLosses: number;
  maxOpenTrades: number;

  buyEnabled: boolean;
  sellEnabled: boolean;

  maxSpread: number | null;
  cooldownMinutes: number;

  sessionFilter: boolean;
  newsFilter: boolean;

  signalThreshold: number;
  minConfirmations: number;

  telegramEnabled: boolean;

  analysisConfig: unknown;
};

type FormState = {
  botName: string;
  market: string;
  strategy: string;

  lotMode: "fixed" | "risk";
  lotSize: string;
  riskPercent: string;

  takeProfit: string;
  stopLoss: string;
  riskReward: string;

  dailyProfit: string;
  dailyLoss: string;
  maxStopLosses: string;
  maxOpenTrades: string;

  maxSpread: string;
  cooldown: string;

  trailingStop: boolean;
  trailingStopDistance: string;

  breakEven: boolean;
  breakEvenTrigger: string;

  buyEnabled: boolean;
  sellEnabled: boolean;

  sessionFilter: boolean;
  newsFilter: boolean;
  telegramEnabled: boolean;

  signalThreshold: string;
  minConfirmations: string;

  botEnabled: boolean;
};

const defaultForm: FormState = {
  botName: "Gold AI Bot",
  market: "XAU/USD",
  strategy: "تحلیل چندتأییدی",

  lotMode: "fixed",
  lotSize: "0.01",
  riskPercent: "1",

  takeProfit: "5",
  stopLoss: "4",
  riskReward: "1.25",

  dailyProfit: "20",
  dailyLoss: "12",
  maxStopLosses: "3",
  maxOpenTrades: "1",

  maxSpread: "30",
  cooldown: "5",

  trailingStop: true,
  trailingStopDistance: "2",

  breakEven: false,
  breakEvenTrigger: "2",

  buyEnabled: true,
  sellEnabled: true,

  sessionFilter: true,
  newsFilter: true,
  telegramEnabled: false,

  signalThreshold: "80",
  minConfirmations: "5",

  botEnabled: false,
};

const markets = [
  {
    label: "طلا XAUUSD",
    value: "XAU/USD",
    symbol: "XAUUSD",
    marketType: "FOREX",
    icon: "🪙",
  },
  {
    label: "بیت‌کوین BTCUSDT",
    value: "BTC/USDT",
    symbol: "BTCUSDT",
    marketType: "CRYPTO",
    icon: "₿",
  },
  {
    label: "اتریوم ETHUSDT",
    value: "ETH/USDT",
    symbol: "ETHUSDT",
    marketType: "CRYPTO",
    icon: "Ξ",
  },
  {
    label: "یورو دلار EURUSD",
    value: "EUR/USD",
    symbol: "EURUSD",
    marketType: "FOREX",
    icon: "💱",
  },
];

const strategies = [
  "تحلیل چندتأییدی",
  "پرایس اکشن",
  "کندل استیک",
  "اسکالپ",
  "روندی",
];

function toNumber(
  value: string,
  fallback: number
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function botToForm(bot: Bot): FormState {
  const market =
    markets.find(
      (item) =>
        item.symbol === bot.symbol
    )?.value ?? "XAU/USD";

  return {
    botName: bot.name || "Gold AI Bot",
    market,

    strategy:
      bot.category === "TRADING"
        ? "تحلیل چندتأییدی"
        : bot.category ||
          "تحلیل چندتأییدی",

    lotMode:
      bot.lotMode === "RISK_PERCENT"
        ? "risk"
        : "fixed",

    lotSize: String(
      bot.lotSize ?? 0.01
    ),

    riskPercent: String(
      bot.riskPercent ?? 1
    ),

    takeProfit: String(
      bot.takeProfit ?? 5
    ),

    stopLoss: String(
      bot.stopLoss ?? 4
    ),

    riskReward: String(
      bot.riskReward ?? 1.25
    ),

    dailyProfit: String(
      bot.dailyProfitStop ?? 20
    ),

    dailyLoss: String(
      bot.dailyLossLimit ?? 12
    ),

    maxStopLosses: String(
      bot.maxDailyStopLosses ?? 3
    ),

    maxOpenTrades: String(
      bot.maxOpenTrades ?? 1
    ),

    maxSpread: String(
      bot.maxSpread ?? 30
    ),

    cooldown: String(
      bot.cooldownMinutes ?? 5
    ),

    trailingStop:
      bot.trailingStop ?? false,

    trailingStopDistance: String(
      bot.trailingStopDistance ?? 2
    ),

    breakEven:
      bot.breakEven ?? false,

    breakEvenTrigger: String(
      bot.breakEvenTrigger ?? 2
    ),

    buyEnabled:
      bot.buyEnabled ?? true,

    sellEnabled:
      bot.sellEnabled ?? true,

    sessionFilter:
      bot.sessionFilter ?? true,

    newsFilter:
      bot.newsFilter ?? true,

    telegramEnabled:
      bot.telegramEnabled ?? false,

    signalThreshold: String(
      bot.signalThreshold ?? 80
    ),

    minConfirmations: String(
      bot.minConfirmations ?? 5
    ),

    botEnabled:
      bot.isActive ?? false,
  };
}

export default function BotBuilderPage() {
  const [form, setForm] =
    useState<FormState>(defaultForm);

  const [bots, setBots] =
    useState<Bot[]>([]);

  const [selectedBotId, setSelectedBotId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const selectedMarket = useMemo(
    () =>
      markets.find(
        (item) =>
          item.value === form.market
      ) ?? markets[0],
    [form.market]
  );

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setMessage("");
    setError("");
  }

  async function loadBots() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/bots",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "خطا در دریافت ربات‌ها."
        );
      }

      const loadedBots: Bot[] =
        data?.bots ?? [];

      setBots(loadedBots);

      if (loadedBots.length > 0) {
        setSelectedBotId(
          loadedBots[0].id
        );

        setForm(
          botToForm(
            loadedBots[0]
          )
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت ربات‌ها."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots();
  }, []);

  function selectBot(bot: Bot) {
    setSelectedBotId(bot.id);
    setForm(botToForm(bot));
    setMessage("");
    setError("");
    setMobileMenu(false);
  }

  function createNewBot() {
    setSelectedBotId(null);

    setForm({
      ...defaultForm,
      botName: `ربات جدید ${
        bots.length + 1
      }`,
    });

    setMessage("");
    setError("");
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (!form.botName.trim()) {
        setError(
          "لطفاً نام ربات را وارد کنید."
        );
        setSaving(false);
        return;
      }

      const payload = {
        name: form.botName.trim(),

        type: "TRADING",
        category: "TRADING",

        description:
          "ربات معاملاتی Trading AI با مدیریت ریسک حرفه‌ای.",

        symbol:
          selectedMarket.symbol,

        timeframe: "15m",

        marketType:
          selectedMarket.marketType,

        isActive:
          form.botEnabled,

        lotMode:
          form.lotMode === "risk"
            ? "RISK_PERCENT"
            : "FIXED",

        lotSize: toNumber(
          form.lotSize,
          0.01
        ),

        riskPercent: toNumber(
          form.riskPercent,
          1
        ),

        takeProfit: toNumber(
          form.takeProfit,
          5
        ),

        stopLoss: toNumber(
          form.stopLoss,
          4
        ),

        riskReward: toNumber(
          form.riskReward,
          1.25
        ),

        trailingStop:
          form.trailingStop,

        trailingStopDistance:
          toNumber(
            form.trailingStopDistance,
            2
          ),

        breakEven:
          form.breakEven,

        breakEvenTrigger:
          toNumber(
            form.breakEvenTrigger,
            2
          ),

        dailyProfitStop:
          toNumber(
            form.dailyProfit,
            20
          ),

        dailyLossLimit:
          toNumber(
            form.dailyLoss,
            12
          ),

        maxDailyStopLosses:
          Math.max(
            0,
            Math.floor(
              toNumber(
                form.maxStopLosses,
                3
              )
            )
          ),

        maxOpenTrades:
          Math.max(
            1,
            Math.floor(
              toNumber(
                form.maxOpenTrades,
                1
              )
            )
          ),

        buyEnabled:
          form.buyEnabled,

        sellEnabled:
          form.sellEnabled,

        maxSpread:
          toNumber(
            form.maxSpread,
            30
          ),

        cooldownMinutes:
          Math.max(
            0,
            Math.floor(
              toNumber(
                form.cooldown,
                5
              )
            )
          ),

        sessionFilter:
          form.sessionFilter,

        newsFilter:
          form.newsFilter,

        signalThreshold:
          Math.min(
            100,
            Math.max(
              0,
              Math.floor(
                toNumber(
                  form.signalThreshold,
                  80
                )
              )
            )
          ),

        minConfirmations:
          Math.max(
            0,
            Math.floor(
              toNumber(
                form.minConfirmations,
                5
              )
            )
          ),

        telegramEnabled:
          form.telegramEnabled,
      };

      const editing =
        selectedBotId !== null;

      const response = await fetch(
        "/api/bots",
        {
          method: editing
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            editing
              ? {
                  id: selectedBotId,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "ذخیره انجام نشد."
        );
      }

      if (data?.bot) {
        const savedBot: Bot =
          data.bot;

        setBots((current) => {
          const exists =
            current.some(
              (bot) =>
                bot.id ===
                savedBot.id
            );

          if (exists) {
            return current.map(
              (bot) =>
                bot.id ===
                savedBot.id
                  ? savedBot
                  : bot
            );
          }

          return [
            savedBot,
            ...current,
          ];
        });

        setSelectedBotId(
          savedBot.id
        );

        setForm(
          botToForm(savedBot)
        );
      }

      setMessage(
        editing
          ? "تنظیمات ربات با موفقیت ذخیره شد."
          : "ربات جدید با موفقیت ساخته شد."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#020817] text-white"
    >
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[10%] top-[8%] h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[5%] h-80 w-80 rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute right-[45%] top-[45%] h-48 w-48 rounded-full bg-cyan-400/5 blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-cyan-400/10 bg-[#020817]/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-2xl shadow-[0_0_25px_rgba(34,211,238,0.12)]">
              🤖
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            </div>

            <div>
              <div className="text-base font-black tracking-tight sm:text-lg">
                Trading AI
              </div>

              <div className="text-[9px] tracking-wider text-cyan-400/70">
                SMART TRADING • BETTER RESULTS
              </div>
            </div>

          </div>

          <div className="hidden items-center gap-3 sm:flex">

            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-[10px] font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              سیستم آنلاین است
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80">
              🔔
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80">
              👤
            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenu(
                !mobileMenu
              )
            }
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:hidden"
          >
            ☰
          </button>

        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenu && (
        <div className="fixed right-3 top-[82px] z-50 w-56 rounded-2xl border border-cyan-400/20 bg-[#061426]/95 p-3 shadow-2xl backdrop-blur-xl sm:hidden">
          <MobileNavItem
            icon="⌂"
            text="داشبورد"
          />
          <MobileNavItem
            icon="🤖"
            text="ربات ساز"
            active
          />
          <MobileNavItem
            icon="◎"
            text="ربات‌های من"
          />
          <MobileNavItem
            icon="◉"
            text="تحلیلگر AI"
          />
          <MobileNavItem
            icon="▣"
            text="بازارها"
          />
          <MobileNavItem
            icon="◫"
            text="گزارش‌ها"
          />
          <MobileNavItem
            icon="⚙"
            text="تنظیمات"
          />
        </div>
      )}

      <div className="mx-auto flex max-w-[1500px]">

        {/* SIDEBAR */}
        <aside className="hidden w-[210px] shrink-0 border-l border-cyan-400/10 py-6 lg:block">

          <div className="sticky top-[90px] space-y-2 px-4">

            <NavItem
              icon="⌂"
              text="داشبورد"
            />

            <NavItem
              icon="🤖"
              text="ربات ساز"
              active
            />

            <NavItem
              icon="◎"
              text="ربات‌های من"
            />

            <NavItem
              icon="◉"
              text="تحلیلگر AI"
            />

            <NavItem
              icon="▣"
              text="بازارها"
            />

            <NavItem
              icon="◫"
              text="گزارش‌ها"
            />

            <NavItem
              icon="⚙"
              text="تنظیمات"
            />

            <div className="my-6 h-px bg-slate-800" />

            <NavItem
              icon="◌"
              text="پشتیبانی"
            />

          </div>

        </aside>

        {/* MAIN */}
        <div className="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-7 lg:px-7 lg:py-8">

          {/* HERO */}
          <section className="relative mb-5 overflow-hidden rounded-[26px] border border-cyan-400/20 bg-gradient-to-br from-[#08233d] via-[#061426] to-[#03101f] p-5 shadow-[0_0_50px_rgba(0,180,255,0.06)] sm:p-7">

            <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-[80px]" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-3xl shadow-[0_0_35px_rgba(34,211,238,0.12)]">
                  🤖
                </div>

                <div>
                  <div className="mb-1 text-[10px] font-black tracking-[0.18em] text-cyan-400">
                    BOT MANAGEMENT
                  </div>

                  <h1 className="text-2xl font-black sm:text-3xl">
                    تنظیمات و ساخت ربات
                  </h1>

                  <p className="mt-2 max-w-xl text-xs leading-6 text-slate-400 sm:text-sm">
                    ربات معاملاتی خود را با تنظیمات دقیق،
                    مدیریت ریسک حرفه‌ای و کنترل کامل مدیریت کنید.
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/40 px-5 py-4">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                  ⚡
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">
                    وضعیت ربات
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-sm font-black">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        form.botEnabled
                          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                          : "bg-slate-600"
                      }`}
                    />

                    {form.botEnabled
                      ? "فعال"
                      : "خاموش"}
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* BOTS */}
          <section className="mb-5 rounded-[26px] border border-cyan-400/15 bg-[#061426]/80 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-5">

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-lg">
                  🤖
                </div>

                <div>
                  <h2 className="text-sm font-black">
                    ربات‌های من
                  </h2>

                  <p className="mt-1 text-[10px] text-slate-500">
                    ربات موردنظر را برای ویرایش انتخاب کنید.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={createNewBot}
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-2.5 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/10"
              >
                + ربات جدید
              </button>

            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
                در حال دریافت ربات‌ها...
              </div>
            ) : bots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-7 text-center">
                <div className="text-3xl">
                  🤖
                </div>

                <div className="mt-3 text-sm font-black">
                  هنوز رباتی ساخته نشده است.
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  بعد از تکمیل تنظیمات، ربات خود را ذخیره کنید.
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">

                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() =>
                      selectBot(bot)
                    }
                    className={`group rounded-2xl border p-4 text-right transition ${
                      selectedBotId ===
                      bot.id
                        ? "border-cyan-400/50 bg-cyan-400/[0.06] shadow-[0_0_30px_rgba(34,211,238,0.06)]"
                        : "border-slate-800 bg-slate-950/30 hover:border-cyan-400/20"
                    }`}
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-xl">
                          {bot.symbol ===
                          "XAUUSD"
                            ? "🪙"
                            : "₿"}
                        </div>

                        <div>
                          <div className="text-sm font-black">
                            {bot.name}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {bot.symbol} •{" "}
                            {bot.timeframe}
                          </div>
                        </div>

                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                          bot.isActive
                            ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            : "border border-slate-700 bg-slate-800/70 text-slate-500"
                        }`}
                      >
                        {bot.isActive
                          ? "فعال"
                          : "خاموش"}
                      </span>

                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">

                      <StatBox
                        label="TP"
                        value={`$${bot.takeProfit ?? 0}`}
                        type="green"
                      />

                      <StatBox
                        label="SL"
                        value={`$${bot.stopLoss ?? 0}`}
                        type="red"
                      />

                      <StatBox
                        label="R/R"
                        value={`${bot.riskReward ?? 0}`}
                        type="blue"
                      />

                    </div>

                  </button>
                ))}

              </div>
            )}

          </section>

          {/* ALERT */}
          {(message || error) && (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-xs font-bold ${
                message
                  ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                  : "border-red-400/20 bg-red-400/5 text-red-300"
              }`}
            >
              {message || error}
            </div>
          )}

          {/* SECTION 01 */}
          <SettingsCard
            number="01"
            icon="⚙️"
            title="مشخصات اصلی ربات"
            description="نام، بازار و استراتژی معاملاتی ربات را مشخص کنید."
            action={
              <button
                type="button"
                onClick={createNewBot}
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-[10px] font-black text-cyan-300"
              >
                + ربات جدید
              </button>
            }
          >

            <div className="grid gap-4 lg:grid-cols-3">

              <FieldCard
                icon="🤖"
                label="نام ربات"
              >
                <input
                  value={form.botName}
                  onChange={(event) =>
                    updateField(
                      "botName",
                      event.target.value
                    )
                  }
                  className="dark-input"
                  placeholder="Gold AI Bot"
                />
              </FieldCard>

              <FieldCard
                icon={selectedMarket.icon}
                label="بازار"
              >
                <select
                  value={form.market}
                  onChange={(event) =>
                    updateField(
                      "market",
                      event.target.value
                    )
                  }
                  className="dark-input cursor-pointer"
                >
                  {markets.map(
                    (market) => (
                      <option
                        key={
                          market.value
                        }
                        value={
                          market.value
                        }
                      >
                        {market.label}
                      </option>
                    )
                  )}
                </select>
              </FieldCard>

              <FieldCard
                icon="🎯"
                label="استراتژی"
              >
                <select
                  value={form.strategy}
                  onChange={(event) =>
                    updateField(
                      "strategy",
                      event.target.value
                    )
                  }
                  className="dark-input cursor-pointer"
                >
                  {strategies.map(
                    (strategy) => (
                      <option
                        key={strategy}
                        value={strategy}
                      >
                        {strategy}
                      </option>
                    )
                  )}
                </select>
              </FieldCard>

            </div>

          </SettingsCard>

          {/* SECTION 02 */}
          <SettingsCard
            number="02"
            icon="🛡️"
            title="حجم معامله و مدیریت ریسک"
            description="حجم معاملات و میزان ریسک هر معامله را کنترل کنید."
          >

            <div className="grid gap-4 lg:grid-cols-3">

              <FieldCard
                icon="📊"
                label="روش تعیین حجم"
              >
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#020817] p-1.5">

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "lotMode",
                        "fixed"
                      )
                    }
                    className={`rounded-lg px-3 py-3 text-[10px] font-black transition ${
                      form.lotMode ===
                      "fixed"
                        ? "bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.22)]"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    حجم ثابت
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "lotMode",
                        "risk"
                      )
                    }
                    className={`rounded-lg px-3 py-3 text-[10px] font-black transition ${
                      form.lotMode ===
                      "risk"
                        ? "bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.22)]"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    بر اساس ریسک
                  </button>

                </div>
              </FieldCard>

              <FieldCard
                icon="◈"
                label="Lot Size"
              >
                <StepperInput
                  value={
                    form.lotSize
                  }
                  onChange={(value) =>
                    updateField(
                      "lotSize",
                      value
                    )
                  }
                  step={0.01}
                  suffix="LOT"
                />
              </FieldCard>

              <FieldCard
                icon="%"
                label="درصد ریسک هر معامله"
              >
                <StepperInput
                  value={
                    form.riskPercent
                  }
                  onChange={(value) =>
                    updateField(
                      "riskPercent",
                      value
                    )
                  }
                  step={0.1}
                  suffix="%"
                />
              </FieldCard>

            </div>

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[10px] leading-6 text-amber-300">
              ⚠️ حجم و درصد ریسک باید متناسب با موجودی حساب،
              حد ضرر و قوانین بروکر انتخاب شود.
            </div>

          </SettingsCard>

          {/* SECTION 03 */}
          <SettingsCard
            number="03"
            icon="🎯"
            title="حد سود و حد ضرر"
            description="مقادیر TP، SL و نسبت ریسک به بازده را مشخص کنید."
          >

            <div className="grid gap-4 lg:grid-cols-3">

              <FieldCard
                icon="💰"
                label="Take Profit"
                accent="green"
              >
                <StepperInput
                  value={
                    form.takeProfit
                  }
                  onChange={(value) =>
                    updateField(
                      "takeProfit",
                      value
                    )
                  }
                  step={0.1}
                  suffix="$"
                />
              </FieldCard>

              <FieldCard
                icon="🎯"
                label="Stop Loss"
                accent="red"
              >
                <StepperInput
                  value={
                    form.stopLoss
                  }
                  onChange={(value) =>
                    updateField(
                      "stopLoss",
                      value
                    )
                  }
                  step={0.1}
                  suffix="$"
                />
              </FieldCard>

              <FieldCard
                icon="R"
                label="Risk / Reward"
                accent="blue"
              >
                <StepperInput
                  value={
                    form.riskReward
                  }
                  onChange={(value) =>
                    updateField(
                      "riskReward",
                      value
                    )
                  }
                  step={0.05}
                  suffix="R"
                />
              </FieldCard>

            </div>

          </SettingsCard>

          {/* SECTION 04 */}
          <SettingsCard
            number="04"
            icon="📅"
            title="محدودیت‌های روزانه"
            description="با رسیدن به این محدودیت‌ها، سیستم می‌تواند معاملات جدید را متوقف کند."
          >

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <FieldCard
                icon="💚"
                label="توقف سود روزانه"
                accent="green"
              >
                <StepperInput
                  value={
                    form.dailyProfit
                  }
                  onChange={(value) =>
                    updateField(
                      "dailyProfit",
                      value
                    )
                  }
                  step={1}
                  suffix="$"
                />
              </FieldCard>

              <FieldCard
                icon="❤️"
                label="حداکثر ضرر روزانه"
                accent="red"
              >
                <StepperInput
                  value={
                    form.dailyLoss
                  }
                  onChange={(value) =>
                    updateField(
                      "dailyLoss",
                      value
                    )
                  }
                  step={1}
                  suffix="$"
                />
              </FieldCard>

              <FieldCard
                icon="🟡"
                label="حداکثر Stop Loss"
              >
                <StepperInput
                  value={
                    form.maxStopLosses
                  }
                  onChange={(value) =>
                    updateField(
                      "maxStopLosses",
                      value
                    )
                  }
                  step={1}
                  suffix="بار"
                />
              </FieldCard>

              <FieldCard
                icon="🔵"
                label="حداکثر معاملات باز"
              >
                <StepperInput
                  value={
                    form.maxOpenTrades
                  }
                  onChange={(value) =>
                    updateField(
                      "maxOpenTrades",
                      value
                    )
                  }
                  step={1}
                  suffix="معامله"
                />
              </FieldCard>

            </div>

          </SettingsCard>

          {/* SECTION 05 */}
          <SettingsCard
            number="05"
            icon="⚡"
            title="تنظیمات اجرای معامله"
            description="شرایط و فیلترهای ورود به معاملات را کنترل کنید."
          >

            <div className="grid gap-3 lg:grid-cols-2">

              <ToggleRow
                icon="🟢"
                title="معاملات BUY"
                description="اجازه ارسال معاملات خرید"
                enabled={
                  form.buyEnabled
                }
                onClick={() =>
                  updateField(
                    "buyEnabled",
                    !form.buyEnabled
                  )
                }
              />

              <ToggleRow
                icon="🔴"
                title="معاملات SELL"
                description="اجازه ارسال معاملات فروش"
                enabled={
                  form.sellEnabled
                }
                onClick={() =>
                  updateField(
                    "sellEnabled",
                    !form.sellEnabled
                  )
                }
              />

              <ToggleRow
                icon="🎯"
                title="Trailing Stop"
                description="حرکت حد ضرر همراه با معامله"
                enabled={
                  form.trailingStop
                }
                onClick={() =>
                  updateField(
                    "trailingStop",
                    !form.trailingStop
                  )
                }
              />

              <ToggleRow
                icon="⚖️"
                title="Break Even"
                description="انتقال حد ضرر به نقطه ورود"
                enabled={
                  form.breakEven
                }
                onClick={() =>
                  updateField(
                    "breakEven",
                    !form.breakEven
                  )
                }
              />

              <ToggleRow
                icon="◷"
                title="Session Filter"
                description="معامله فقط در ساعات مجاز"
                enabled={
                  form.sessionFilter
                }
                onClick={() =>
                  updateField(
                    "sessionFilter",
                    !form.sessionFilter
                  )
                }
              />

              <ToggleRow
                icon="📰"
                title="News Filter"
                description="فیلتر شرایط خبری بازار"
                enabled={
                  form.newsFilter
                }
                onClick={() =>
                  updateField(
                    "newsFilter",
                    !form.newsFilter
                  )
                }
              />

            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">

              {form.trailingStop && (
                <FieldCard
                  icon="↗"
                  label="فاصله Trailing Stop"
                >
                  <StepperInput
                    value={
                      form.trailingStopDistance
                    }
                    onChange={(value) =>
                      updateField(
                        "trailingStopDistance",
                        value
                      )
                    }
                    step={0.1}
                    suffix="$"
                  />
                </FieldCard>
              )}

              {form.breakEven && (
                <FieldCard
                  icon="⚖"
                  label="تریگر Break Even"
                >
                  <StepperInput
                    value={
                      form.breakEvenTrigger
                    }
                    onChange={(value) =>
                      updateField(
                        "breakEvenTrigger",
                        value
                      )
                    }
                    step={0.1}
                    suffix="$"
                  />
                </FieldCard>
              )}

              <FieldCard
                icon="⚡"
                label="حداکثر Spread"
              >
                <StepperInput
                  value={
                    form.maxSpread
                  }
                  onChange={(value) =>
                    updateField(
                      "maxSpread",
                      value
                    )
                  }
                  step={0.1}
                  suffix="pip"
                />
              </FieldCard>

              <FieldCard
                icon="◷"
                label="Cooldown بین معاملات"
              >
                <StepperInput
                  value={
                    form.cooldown
                  }
                  onChange={(value) =>
                    updateField(
                      "cooldown",
                      value
                    )
                  }
                  step={1}
                  suffix="دقیقه"
                />
              </FieldCard>

            </div>

            <div className="mt-4">
              <ToggleRow
                icon="✈️"
                title="Telegram"
                description="ارسال وضعیت ربات به تلگرام"
                enabled={
                  form.telegramEnabled
                }
                onClick={() =>
                  updateField(
                    "telegramEnabled",
                    !form.telegramEnabled
                  )
                }
              />
            </div>

          </SettingsCard>

          {/* SECTION 06 */}
          <SettingsCard
            number="06"
            icon="◎"
            title="فیلتر و قدرت سیگنال"
            description="حداقل کیفیت لازم برای اجازه ورود به معامله."
          >

            <div className="grid gap-4 lg:grid-cols-2">

              <FieldCard
                icon="💎"
                label="حداقل امتیاز سیگنال"
              >
                <StepperInput
                  value={
                    form.signalThreshold
                  }
                  onChange={(value) =>
                    updateField(
                      "signalThreshold",
                      value
                    )
                  }
                  step={1}
                  suffix="/100"
                />
              </FieldCard>

              <FieldCard
                icon="🛡️"
                label="حداقل تأییدیه‌ها"
              >
                <StepperInput
                  value={
                    form.minConfirmations
                  }
                  onChange={(value) =>
                    updateField(
                      "minConfirmations",
                      value
                    )
                  }
                  step={1}
                  suffix="تأیید"
                />
              </FieldCard>

            </div>

          </SettingsCard>

          {/* SECTION 07 */}
          <SettingsCard
            number="07"
            icon="🤖"
            title="وضعیت ربات"
            description="فعال یا غیرفعال بودن ربات را مشخص کنید."
          >

            <div className="flex flex-col gap-4 rounded-2xl border border-cyan-400/10 bg-[#020817]/50 p-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    form.botEnabled
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  🤖
                </div>

                <div>
                  <div className="text-sm font-black">
                    {form.botEnabled
                      ? "ربات فعال است"
                      : "ربات خاموش است"}
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    وضعیت ربات پس از ذخیره در دیتابیس ثبت می‌شود.
                  </div>
                </div>

              </div>

              <ToggleSwitch
                enabled={
                  form.botEnabled
                }
                onClick={() =>
                  updateField(
                    "botEnabled",
                    !form.botEnabled
                  )
                }
              />

            </div>

          </SettingsCard>

          {/* SAVE */}
          <section className="relative mt-5 overflow-hidden rounded-[26px] border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 via-[#061426] to-[#061426] p-4 shadow-[0_0_50px_rgba(34,211,238,0.07)] sm:p-5">

            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-300 to-blue-600" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-xl text-cyan-300">
                  ℹ️
                </div>

                <div>
                  <div className="text-sm font-black">
                    تنظیمات آماده ذخیره‌سازی است.
                  </div>

                  <div className="mt-1 text-[10px] leading-5 text-slate-500">
                    اطلاعات پس از ذخیره در دیتابیس باقی می‌ماند.
                  </div>
                </div>

              </div>

              <button
                type="button"
                onClick={
                  saveSettings
                }
                disabled={saving}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-400 px-7 py-4 text-sm font-black text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.22)] transition hover:scale-[1.01] hover:shadow-[0_0_45px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">
                  {saving
                    ? "در حال ذخیره..."
                    : selectedBotId
                    ? "ذخیره تنظیمات ربات"
                    : "ساخت و ذخیره ربات"}
                </span>
              </button>

            </div>

          </section>

        </div>
      </div>

      <style jsx>{`
        .dark-input {
          width: 100%;
          height: 48px;
          border-radius: 13px;
          border: 1px solid rgba(24, 86, 125, 0.8);
          background: linear-gradient(
            180deg,
            rgba(6, 30, 52, 0.95),
            rgba(3, 20, 37, 0.95)
          );
          padding: 0 14px;
          color: #e2f7ff;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-input:focus {
          border-color: rgba(34, 211, 238, 0.8);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.06),
            0 0 25px rgba(34, 211, 238, 0.08);
        }

        .dark-input::placeholder {
          color: #64748b;
        }

        select option {
          background: #061426;
          color: #e2f7ff;
        }

        .stepper-input {
          width: 100%;
          height: 48px;
          border-radius: 13px;
          border: 1px solid rgba(24, 86, 125, 0.8);
          background: linear-gradient(
            180deg,
            rgba(6, 30, 52, 0.95),
            rgba(3, 20, 37, 0.95)
          );
          color: #e2f7ff;
          padding: 0 58px 0 58px;
          text-align: center;
          font-size: 14px;
          font-weight: 900;
          outline: none;
        }

        .stepper-input:focus {
          border-color: rgba(34, 211, 238, 0.8);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.06),
            0 0 25px rgba(34, 211, 238, 0.08);
        }

        .stepper-input::-webkit-inner-spin-button,
        .stepper-input::-webkit-outer-spin-button {
          opacity: 0.35;
        }

        @media (max-width: 640px) {
          .dark-input {
            height: 50px;
            font-size: 12px;
          }

          .stepper-input {
            height: 50px;
          }
        }
      `}</style>
    </main>
  );
}

function SettingsCard({
  number,
  icon,
  title,
  description,
  action,
  children,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative mb-5 overflow-hidden rounded-[26px] border border-cyan-400/15 bg-gradient-to-br from-[#071b30]/95 via-[#061426]/95 to-[#03101f]/95 p-4 shadow-[0_15px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6">

      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-400/5 blur-[70px]" />

      <div className="relative mb-5 flex flex-col gap-4 border-b border-cyan-400/10 pb-5 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-sm font-black text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
            {number}
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 text-lg">
            {icon}
          </div>

          <div>
            <h2 className="text-base font-black sm:text-lg">
              {title}
            </h2>

            <p className="mt-1 text-[10px] leading-5 text-cyan-300/60">
              {description}
            </p>
          </div>

        </div>

        {action}

      </div>

      <div className="relative">
        {children}
      </div>

    </section>
  );
}

function FieldCard({
  icon,
  label,
  accent = "cyan",
  children,
}: {
  icon: string;
  label: string;
  accent?: "cyan" | "green" | "red" | "blue";
  children: ReactNode;
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20"
      : accent === "red"
      ? "text-red-300 bg-red-400/10 border-red-400/20"
      : accent === "blue"
      ? "text-sky-300 bg-sky-400/10 border-sky-400/20"
      : "text-cyan-300 bg-cyan-400/10 border-cyan-400/20";

  return (
    <div className="rounded-2xl border border-cyan-400/10 bg-[#020817]/45 p-3.5 transition hover:border-cyan-400/20 hover:bg-[#031426]/70">

      <div className="mb-2.5 flex items-center gap-2">

        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-black ${accentClass}`}
        >
          {icon}
        </span>

        <span className="text-[10px] font-bold text-slate-400">
          {label}
        </span>

      </div>

      {children}

    </div>
  );
}

function StepperInput({
  value,
  onChange,
  step,
  suffix,
}: {
  value: string;
  onChange: (value: string) => void;
  step: number;
  suffix?: string;
}) {
  function changeValue(
    direction: number
  ) {
    const current =
      Number(value) || 0;

    const next =
      current +
      step * direction;

    const decimals =
      step < 1 ? 2 : 0;

    onChange(
      Math.max(
        0,
        Number(
          next.toFixed(
            decimals
          )
        )
      ).toString()
    );
  }

  return (
    <div className="relative">

      <button
        type="button"
        onClick={() =>
          changeValue(-1)
        }
        className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-cyan-400/10 bg-slate-900 text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
      >
        −
      </button>

      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="stepper-input"
      />

      {suffix && (
        <span className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 text-[9px] font-black text-cyan-400/60">
          {suffix}
        </span>
      )}

      <button
        type="button"
        onClick={() =>
          changeValue(1)
        }
        className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-cyan-400/10 bg-slate-900 text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
      >
        +
      </button>

    </div>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  enabled,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-[76px] items-center justify-between gap-4 rounded-2xl border border-cyan-400/10 bg-[#020817]/45 px-4 py-3 transition hover:border-cyan-400/20 hover:bg-[#031426]/70">

      <div className="flex min-w-0 items-center gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            enabled
              ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
              : "border-slate-800 bg-slate-900 text-slate-600"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <div className="text-xs font-black text-slate-200">
            {title}
          </div>

          <div className="mt-1 text-[9px] leading-5 text-slate-500">
            {description}
          </div>

        </div>

      </div>

      <ToggleSwitch
        enabled={enabled}
        onClick={onClick}
      />

    </div>
  );
}

function ToggleSwitch({
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
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
        enabled
          ? "bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.22)]"
          : "bg-slate-700"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-lg transition ${
          enabled
            ? "translate-x-0"
            : "-translate-x-5"
        }`}
      />
    </button>
  );
}

function StatBox({
  label,
  value,
  type,
}: {
  label: string;
  value: string;
  type: "green" | "red" | "blue";
}) {
  const className =
    type === "green"
      ? "text-emerald-300"
      : type === "red"
      ? "text-red-300"
      : "text-sky-300";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">

      <div className="text-[8px] text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 text-xs font-black ${className}`}
      >
        {value}
      </div>

    </div>
  );
}

function NavItem({
  icon,
  text,
  active = false,
}: {
  icon: string;
  text: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs font-bold transition ${
        active
          ? "border border-cyan-400/20 bg-gradient-to-l from-cyan-400/15 to-transparent text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.05)]"
          : "text-slate-500 hover:bg-slate-900/60 hover:text-slate-300"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          active
            ? "bg-cyan-400/10 text-cyan-300"
            : "bg-slate-900 text-slate-500"
        }`}
      >
        {icon}
      </span>

      {text}
    </button>
  );
}

function MobileNavItem({
  icon,
  text,
  active = false,
}: {
  icon: string;
  text: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs font-bold ${
        active
          ? "bg-cyan-400/10 text-cyan-300"
          : "text-slate-400"
      }`}
    >
      <span>{icon}</span>
      {text}
    </button>
  );
}
