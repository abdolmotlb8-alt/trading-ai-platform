"use client";

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

  trailingStop: false,
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

const marketOptions = [
  {
    label: "طلا / XAUUSD",
    value: "XAU/USD",
    symbol: "XAUUSD",
    type: "FOREX",
  },
  {
    label: "بیت‌کوین / BTCUSDT",
    value: "BTC/USDT",
    symbol: "BTCUSDT",
    type: "CRYPTO",
  },
  {
    label: "اتریوم / ETHUSDT",
    value: "ETH/USDT",
    symbol: "ETHUSDT",
    type: "CRYPTO",
  },
  {
    label: "یورو دلار / EURUSD",
    value: "EUR/USD",
    symbol: "EURUSD",
    type: "FOREX",
  },
];

const strategyOptions = [
  "تحلیل چندتأییدی",
  "پرایس اکشن",
  "کندل استیک",
  "اسکالپ",
  "روندی",
];

function numberOrDefault(
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
    marketOptions.find(
      (item) => item.symbol === bot.symbol
    )?.value ?? "XAU/USD";

  return {
    botName: bot.name || "Gold AI Bot",
    market,
    strategy:
      bot.category === "TRADING"
        ? "تحلیل چندتأییدی"
        : bot.category || "تحلیل چندتأییدی",

    lotMode:
      bot.lotMode === "RISK_PERCENT"
        ? "risk"
        : "fixed",

    lotSize: String(bot.lotSize ?? 0.01),
    riskPercent: String(bot.riskPercent ?? 1),

    takeProfit: String(bot.takeProfit ?? 5),
    stopLoss: String(bot.stopLoss ?? 4),
    riskReward: String(bot.riskReward ?? 1.25),

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

  const [bots, setBots] = useState<Bot[]>([]);

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

  const selectedMarket = useMemo(() => {
    return (
      marketOptions.find(
        (item) =>
          item.value === form.market
      ) ?? marketOptions[0]
    );
  }, [form.market]);

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

      const data = await response.json();

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
        const firstBot =
          loadedBots[0];

        setSelectedBotId(
          firstBot.id
        );

        setForm(
          botToForm(firstBot)
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
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
  }

  function createNewBot() {
    setSelectedBotId(null);

    setForm({
      ...defaultForm,
      botName: `ربات جدید ${bots.length + 1}`,
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
          "ربات معامله‌گر با مدیریت ریسک و فیلترهای معاملاتی.",

        symbol: selectedMarket.symbol,
        timeframe: "15m",
        marketType:
          selectedMarket.type,

        isActive:
          form.botEnabled,

        lotMode:
          form.lotMode === "risk"
            ? "RISK_PERCENT"
            : "FIXED",

        lotSize:
          numberOrDefault(
            form.lotSize,
            0.01
          ),

        riskPercent:
          numberOrDefault(
            form.riskPercent,
            1
          ),

        takeProfit:
          numberOrDefault(
            form.takeProfit,
            5
          ),

        stopLoss:
          numberOrDefault(
            form.stopLoss,
            4
          ),

        riskReward:
          numberOrDefault(
            form.riskReward,
            1.25
          ),

        trailingStop:
          form.trailingStop,

        trailingStopDistance:
          numberOrDefault(
            form.trailingStopDistance,
            2
          ),

        breakEven:
          form.breakEven,

        breakEvenTrigger:
          numberOrDefault(
            form.breakEvenTrigger,
            2
          ),

        dailyProfitStop:
          numberOrDefault(
            form.dailyProfit,
            20
          ),

        dailyLossLimit:
          numberOrDefault(
            form.dailyLoss,
            12
          ),

        maxDailyStopLosses:
          Math.max(
            0,
            Math.floor(
              numberOrDefault(
                form.maxStopLosses,
                3
              )
            )
          ),

        maxOpenTrades:
          Math.max(
            1,
            Math.floor(
              numberOrDefault(
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
          numberOrDefault(
            form.maxSpread,
            30
          ),

        cooldownMinutes:
          Math.max(
            0,
            Math.floor(
              numberOrDefault(
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
                numberOrDefault(
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
              numberOrDefault(
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

      const savedBot: Bot | undefined =
        data?.bot;

      if (savedBot) {
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
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره تنظیمات."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#020817] text-white"
    >
      <div className="mx-auto max-w-[1450px] px-3 py-4 sm:px-5 lg:px-8 lg:py-7">

        {/* TOP HEADER */}
        <header className="mb-6 flex flex-col gap-4 rounded-[26px] border border-cyan-500/20 bg-[#061426]/95 p-4 shadow-[0_0_40px_rgba(0,180,255,0.06)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-2xl shadow-[0_0_25px_rgba(34,211,238,0.12)]">
              🤖
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                  Trading AI
                </h1>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                  آنلاین
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Smart Trading • Better Results
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              سیستم آماده است
            </div>

            <button
              type="button"
              onClick={createNewBot}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-black text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              + ربات جدید
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.18)] transition hover:brightness-110 disabled:opacity-50"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره تنظیمات"}
            </button>

          </div>
        </header>

        {/* TITLE */}
        <section className="mb-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <div className="mb-2 flex items-center gap-2 text-cyan-400">
                <span className="text-xl">
                  ⚙️
                </span>

                <span className="text-xs font-black">
                  BOT MANAGEMENT
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                تنظیمات و ساخت ربات
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                ربات معاملاتی خود را با تنظیمات دقیق،
                مدیریت ریسک و کنترل‌های حرفه‌ای مدیریت کنید.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <div className="text-[10px] text-slate-500">
                وضعیت فعلی
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm font-black">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    form.botEnabled
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                      : "bg-slate-600"
                  }`}
                />

                {form.botEnabled
                  ? "ربات فعال"
                  : "ربات خاموش"}
              </div>
            </div>

          </div>

        </section>

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-bold text-emerald-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15">
              ✓
            </span>

            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-bold leading-7 text-red-300">
            {error}
          </div>
        )}

        {/* MY BOTS */}
        <section className="mb-6 rounded-[26px] border border-slate-800 bg-[#061426]/90 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.2)] sm:p-5">

          <div className="mb-4 flex items-center justify-between gap-3">

            <div>
              <h3 className="text-base font-black">
                ربات‌های من
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                ربات موردنظر را برای ویرایش انتخاب کنید.
              </p>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] text-slate-500">
              {loading
                ? "در حال دریافت..."
                : `${bots.length} ربات`}
            </div>

          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-500">
              در حال دریافت اطلاعات...
            </div>
          ) : bots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-7 text-center">
              <div className="text-3xl">
                🤖
              </div>

              <p className="mt-3 text-sm font-black text-slate-300">
                هنوز رباتی ساخته نشده است.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                تنظیمات را وارد کنید و ربات را ذخیره کنید.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {bots.map((bot) => {
                const selected =
                  bot.id ===
                  selectedBotId;

                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() =>
                      selectBot(bot)
                    }
                    className={`rounded-2xl border p-4 text-right transition ${
                      selected
                        ? "border-cyan-400/50 bg-cyan-400/[0.07] shadow-[0_0_25px_rgba(34,211,238,0.07)]"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                    }`}
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <div className="text-sm font-black text-slate-100">
                          {bot.name}
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {bot.symbol} •{" "}
                          {bot.timeframe}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-black ${
                          bot.isActive
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border border-slate-700 bg-slate-800 text-slate-500"
                        }`}
                      >
                        {bot.isActive
                          ? "فعال"
                          : "خاموش"}
                      </span>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">

                      <MiniStat
                        label="TP"
                        value={`$${bot.takeProfit ?? 0}`}
                        positive
                      />

                      <MiniStat
                        label="SL"
                        value={`$${bot.stopLoss ?? 0}`}
                        danger
                      />

                    </div>

                  </button>
                );
              })}
            </div>
          )}

        </section>

        {/* MAIN CONTENT */}
        <div className="space-y-6">

          {/* 01 BASIC */}
          <SettingsCard
            number="01"
            icon="⚙️"
            title="مشخصات اصلی ربات"
            description="نام، بازار و استراتژی معاملاتی ربات را مشخص کنید."
          >

            <div className="grid gap-4 md:grid-cols-3">

              <InputField
                label="نام ربات"
                value={form.botName}
                onChange={(value) =>
                  updateField(
                    "botName",
                    value
                  )
                }
                placeholder="Gold AI Bot"
              />

              <SelectField
                label="بازار"
                value={form.market}
                onChange={(value) =>
                  updateField(
                    "market",
                    value
                  )
                }
                options={marketOptions.map(
                  (item) => ({
                    label: item.label,
                    value: item.value,
                  })
                )}
              />

              <SelectField
                label="استراتژی"
                value={form.strategy}
                onChange={(value) =>
                  updateField(
                    "strategy",
                    value
                  )
                }
                options={strategyOptions.map(
                  (item) => ({
                    label: item,
                    value: item,
                  })
                )}
              />

            </div>

          </SettingsCard>

          {/* 02 RISK */}
          <SettingsCard
            number="02"
            icon="🛡️"
            title="حجم معامله و مدیریت ریسک"
            description="حجم معاملات و میزان ریسک را کنترل کنید."
          >

            <div className="grid gap-4 lg:grid-cols-3">

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">

                <div className="mb-3 text-xs font-bold text-slate-400">
                  روش تعیین حجم
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1.5">

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "lotMode",
                        "fixed"
                      )
                    }
                    className={`rounded-lg px-3 py-2.5 text-xs font-black transition ${
                      form.lotMode ===
                      "fixed"
                        ? "bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
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
                    className={`rounded-lg px-3 py-2.5 text-xs font-black transition ${
                      form.lotMode ===
                      "risk"
                        ? "bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    بر اساس ریسک
                  </button>

                </div>

              </div>

              <NumberField
                label="Lot Size"
                value={form.lotSize}
                onChange={(value) =>
                  updateField(
                    "lotSize",
                    value
                  )
                }
                step="0.01"
                suffix="LOT"
              />

              <NumberField
                label="درصد ریسک هر معامله"
                value={
                  form.riskPercent
                }
                onChange={(value) =>
                  updateField(
                    "riskPercent",
                    value
                  )
                }
                step="0.1"
                suffix="%"
              />

            </div>

            <InfoBar>
              ⚠️ حجم و درصد ریسک باید متناسب با موجودی حساب،
              حد ضرر و قوانین بروکر انتخاب شود.
            </InfoBar>

          </SettingsCard>

          {/* 03 TP SL */}
          <SettingsCard
            number="03"
            icon="🎯"
            title="حد سود و حد ضرر"
            description="مقادیر TP، SL و نسبت ریسک به بازده را مشخص کنید."
          >

            <div className="grid gap-4 md:grid-cols-3">

              <NumberField
                label="Take Profit"
                value={form.takeProfit}
                onChange={(value) =>
                  updateField(
                    "takeProfit",
                    value
                  )
                }
                step="0.1"
                suffix="$"
                positive
              />

              <NumberField
                label="Stop Loss"
                value={form.stopLoss}
                onChange={(value) =>
                  updateField(
                    "stopLoss",
                    value
                  )
                }
                step="0.1"
                suffix="$"
                danger
              />

              <NumberField
                label="Risk / Reward"
                value={form.riskReward}
                onChange={(value) =>
                  updateField(
                    "riskReward",
                    value
                  )
                }
                step="0.05"
                suffix="R"
              />

            </div>

          </SettingsCard>

          {/* 04 DAILY */}
          <SettingsCard
            number="04"
            icon="📅"
            title="محدودیت‌های روزانه"
            description="پس از رسیدن به این محدودیت‌ها، سیستم می‌تواند معاملات جدید را متوقف کند."
          >

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <NumberField
                label="توقف سود روزانه"
                value={
                  form.dailyProfit
                }
                onChange={(value) =>
                  updateField(
                    "dailyProfit",
                    value
                  )
                }
                step="1"
                suffix="$"
                positive
              />

              <NumberField
                label="حداکثر ضرر روزانه"
                value={form.dailyLoss}
                onChange={(value) =>
                  updateField(
                    "dailyLoss",
                    value
                  )
                }
                step="1"
                suffix="$"
                danger
              />

              <NumberField
                label="حداکثر Stop Loss روزانه"
                value={
                  form.maxStopLosses
                }
                onChange={(value) =>
                  updateField(
                    "maxStopLosses",
                    value
                  )
                }
                step="1"
                suffix="بار"
              />

              <NumberField
                label="حداکثر معاملات باز"
                value={
                  form.maxOpenTrades
                }
                onChange={(value) =>
                  updateField(
                    "maxOpenTrades",
                    value
                  )
                }
                step="1"
                suffix="معامله"
              />

            </div>

          </SettingsCard>

          {/* 05 EXECUTION */}
          <SettingsCard
            number="05"
            icon="⚡"
            title="تنظیمات اجرای معامله"
            description="شرایط و فیلترهای ورود به معاملات را کنترل کنید."
          >

            <div className="grid gap-3 md:grid-cols-2">

              <ToggleSetting
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

              <ToggleSetting
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

              <ToggleSetting
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

              <ToggleSetting
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

              <ToggleSetting
                icon="🕐"
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

              <ToggleSetting
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

              <ToggleSetting
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

            <div className="mt-4 grid gap-4 md:grid-cols-2">

              {form.trailingStop && (
                <NumberField
                  label="فاصله Trailing Stop"
                  value={
                    form.trailingStopDistance
                  }
                  onChange={(value) =>
                    updateField(
                      "trailingStopDistance",
                      value
                    )
                  }
                  step="0.1"
                  suffix="$"
                />
              )}

              {form.breakEven && (
                <NumberField
                  label="تریگر Break Even"
                  value={
                    form.breakEvenTrigger
                  }
                  onChange={(value) =>
                    updateField(
                      "breakEvenTrigger",
                      value
                    )
                  }
                  step="0.1"
                  suffix="$"
                />
              )}

              <NumberField
                label="حداکثر Spread"
                value={
                  form.maxSpread
                }
                onChange={(value) =>
                  updateField(
                    "maxSpread",
                    value
                  )
                }
                step="0.1"
                suffix="pip"
              />

              <NumberField
                label="Cooldown بین معاملات"
                value={
                  form.cooldown
                }
                onChange={(value) =>
                  updateField(
                    "cooldown",
                    value
                  )
                }
                step="1"
                suffix="دقیقه"
              />

            </div>

          </SettingsCard>

          {/* 06 SIGNAL */}
          <SettingsCard
            number="06"
            icon="🧠"
            title="فیلتر و قدرت سیگنال"
            description="حداقل کیفیت لازم برای اجازه ورود به معامله."
          >

            <div className="grid gap-4 md:grid-cols-2">

              <NumberField
                label="حداقل امتیاز سیگنال"
                value={
                  form.signalThreshold
                }
                onChange={(value) =>
                  updateField(
                    "signalThreshold",
                    value
                  )
                }
                step="1"
                suffix="/100"
              />

              <NumberField
                label="حداقل تأییدیه‌ها"
                value={
                  form.minConfirmations
                }
                onChange={(value) =>
                  updateField(
                    "minConfirmations",
                    value
                  )
                }
                step="1"
                suffix="تأیید"
              />

            </div>

          </SettingsCard>

          {/* 07 BOT STATUS */}
          <SettingsCard
            number="07"
            icon="🤖"
            title="وضعیت ربات"
            description="فعال یا غیرفعال بودن ربات را مشخص کنید."
          >

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="text-sm font-black">
                  {form.botEnabled
                    ? "ربات فعال است"
                    : "ربات خاموش است"}
                </div>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  تغییر این گزینه فقط وضعیت ذخیره‌شده ربات را
                  تغییر می‌دهد.
                </p>
              </div>

              <Switch
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

          {/* SAVE AREA */}
          <section className="rounded-[26px] border border-cyan-400/20 bg-gradient-to-r from-cyan-500/[0.08] via-[#061426] to-[#061426] p-4 shadow-[0_0_40px_rgba(34,211,238,0.05)] sm:p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  ✓
                </div>

                <div>
                  <div className="text-sm font-black">
                    تنظیمات آماده ذخیره‌سازی است
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    اطلاعات پس از ذخیره در دیتابیس باقی می‌ماند.
                  </div>
                </div>

              </div>

              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-7 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.2)] transition hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "در حال ذخیره..."
                  : selectedBotId
                  ? "ذخیره تغییرات ربات"
                  : "ساخت و ذخیره ربات"}
              </button>

            </div>

          </section>

        </div>
      </div>

      <style jsx>{`
        .number-input {
          width: 100%;
          border: 1px solid rgba(51, 65, 85, 0.8);
          background: rgba(2, 8, 23, 0.75);
          color: white;
          border-radius: 14px;
          padding: 13px 14px;
          outline: none;
          transition: 0.2s;
        }

        .number-input:focus {
          border-color: rgba(34, 211, 238, 0.55);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.06),
            0 0 25px rgba(34, 211, 238, 0.04);
        }

        .number-input::-webkit-inner-spin-button,
        .number-input::-webkit-outer-spin-button {
          opacity: 0.5;
        }

        select {
          color-scheme: dark;
        }

        select option {
          background: #0f172a;
          color: white;
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
  children,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-800 bg-[#061426]/90 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.18)] sm:p-6">

      <div className="mb-5 flex items-start gap-3 border-b border-slate-800/80 pb-5">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] text-lg">
          {icon}
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-black text-slate-600">
              {number}
            </span>

            <h2 className="text-base font-black sm:text-lg">
              {title}
            </h2>

          </div>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            {description}
          </p>

        </div>

      </div>

      {children}

    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[11px] font-bold text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="number-input"
      />

    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  suffix,
  positive,
  danger,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  suffix?: string;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[11px] font-bold text-slate-400">
        {label}
      </span>

      <div className="relative">

        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={`number-input ${
            suffix
              ? "pl-16"
              : ""
          }`}
        />

        {suffix && (
          <span
            className={`absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black ${
              positive
                ? "text-emerald-400"
                : danger
                ? "text-red-400"
                : "text-slate-500"
            }`}
          >
            {suffix}
          </span>
        )}

      </div>

    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[11px] font-bold text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="number-input cursor-pointer"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

    </label>
  );
}

function ToggleSetting({
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-slate-700">

      <div className="flex min-w-0 items-center gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm ${
            enabled
              ? "bg-cyan-400/10 text-cyan-300"
              : "bg-slate-900 text-slate-600"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <div className="text-sm font-black text-slate-200">
            {title}
          </div>

          <div className="mt-1 text-[10px] leading-5 text-slate-500">
            {description}
          </div>

        </div>

      </div>

      <Switch
        enabled={enabled}
        onClick={onClick}
      />

    </div>
  );
}

function Switch({
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
      aria-label={
        enabled
          ? "غیرفعال کردن"
          : "فعال کردن"
      }
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
        enabled
          ? "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.2)]"
          : "bg-slate-700"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-md transition ${
          enabled
            ? "translate-x-0"
            : "-translate-x-5"
        }`}
      />
    </button>
  );
}

function MiniStat({
  label,
  value,
  positive,
  danger,
}: {
  label: string;
  value: string;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">

      <div className="text-[9px] text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 text-xs font-black ${
          positive
            ? "text-emerald-400"
            : danger
            ? "text-red-400"
            : "text-slate-300"
        }`}
      >
        {value}
      </div>

    </div>
  );
}

function InfoBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-[10px] font-bold leading-6 text-emerald-300">
      {children}
    </div>
  );
}
