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
  botName: "ربات طلای هوشمند",
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

  maxSpread: "0",
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
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function botToForm(bot: Bot): FormState {
  const market =
    marketOptions.find(
      (item) => item.symbol === bot.symbol
    )?.value ??
    bot.symbol;

  return {
    botName: bot.name || "ربات جدید",
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

    dailyProfit: String(bot.dailyProfitStop ?? 20),
    dailyLoss: String(bot.dailyLossLimit ?? 12),
    maxStopLosses: String(bot.maxDailyStopLosses ?? 3),
    maxOpenTrades: String(bot.maxOpenTrades ?? 1),

    maxSpread: String(bot.maxSpread ?? 0),
    cooldown: String(bot.cooldownMinutes ?? 5),

    trailingStop: bot.trailingStop ?? false,
    trailingStopDistance: String(
      bot.trailingStopDistance ?? 2
    ),

    breakEven: bot.breakEven ?? false,
    breakEvenTrigger: String(
      bot.breakEvenTrigger ?? 2
    ),

    buyEnabled: bot.buyEnabled ?? true,
    sellEnabled: bot.sellEnabled ?? true,

    sessionFilter: bot.sessionFilter ?? true,
    newsFilter: bot.newsFilter ?? true,
    telegramEnabled: bot.telegramEnabled ?? false,

    signalThreshold: String(
      bot.signalThreshold ?? 80
    ),
    minConfirmations: String(
      bot.minConfirmations ?? 5
    ),

    botEnabled: bot.isActive ?? false,
  };
}

export default function BotBuilderPage() {
  const [form, setForm] = useState<FormState>(
    defaultForm
  );

  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedMarket = useMemo(() => {
    return (
      marketOptions.find(
        (item) => item.value === form.market
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

  function resetForm() {
    setForm(defaultForm);
    setSelectedBotId(null);
    setMessage("");
    setError("");
  }

  async function loadBots() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bots", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "خطا در دریافت ربات‌ها."
        );
      }

      const loadedBots: Bot[] = data?.bots ?? [];

      setBots(loadedBots);

      if (loadedBots.length > 0) {
        const firstBot = loadedBots[0];

        setSelectedBotId(firstBot.id);
        setForm(botToForm(firstBot));
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات ربات‌ها."
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
        setError("نام ربات را وارد کنید.");
        setSaving(false);
        return;
      }

      const payload = {
        name: form.botName.trim(),

        type: "TRADING",
        category: "TRADING",

        description:
          "ربات معامله‌گر با تنظیمات مدیریت ریسک و فیلترهای معاملاتی.",

        symbol: selectedMarket.symbol,
        timeframe: "15m",
        marketType: selectedMarket.type,

        isActive: form.botEnabled,

        lotMode:
          form.lotMode === "risk"
            ? "RISK_PERCENT"
            : "FIXED",

        lotSize: numberOrDefault(
          form.lotSize,
          0.01
        ),

        riskPercent: numberOrDefault(
          form.riskPercent,
          1
        ),

        takeProfit: numberOrDefault(
          form.takeProfit,
          5
        ),

        stopLoss: numberOrDefault(
          form.stopLoss,
          4
        ),

        riskReward: numberOrDefault(
          form.riskReward,
          1.25
        ),

        trailingStop: form.trailingStop,

        trailingStopDistance:
          numberOrDefault(
            form.trailingStopDistance,
            2
          ),

        breakEven: form.breakEven,

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

        buyEnabled: form.buyEnabled,
        sellEnabled: form.sellEnabled,

        maxSpread:
          numberOrDefault(
            form.maxSpread,
            0
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

        sessionFilter: form.sessionFilter,
        newsFilter: form.newsFilter,

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

      const isEditing =
        selectedBotId !== null;

      const response = await fetch(
        "/api/bots",
        {
          method: isEditing
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            isEditing
              ? {
                  id: selectedBotId,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "ذخیره تنظیمات انجام نشد."
        );
      }

      const savedBot: Bot | undefined =
        data?.bot;

      if (savedBot) {
        setBots((current) => {
          const exists = current.some(
            (bot) =>
              bot.id === savedBot.id
          );

          if (exists) {
            return current.map((bot) =>
              bot.id === savedBot.id
                ? savedBot
                : bot
            );
          }

          return [savedBot, ...current];
        });

        setSelectedBotId(savedBot.id);
        setForm(botToForm(savedBot));
      }

      setMessage(
        isEditing
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
      className="min-h-screen bg-slate-950 text-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                مدیریت ربات معامله‌گر
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                ساخت و تنظیم ربات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                تنظیمات ربات را کنترل کن، ذخیره کن و
                بعداً همان تنظیمات را بدون از دست رفتن
                اطلاعات ادامه بده.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createNewBot}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-700"
              >
                + ربات جدید
              </button>

              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "در حال ذخیره..."
                  : "ذخیره تنظیمات"}
              </button>
            </div>
          </div>
        </section>

        {/* Messages */}
        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold leading-7 text-red-300">
            {error}
          </div>
        )}

        {/* Bots */}
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">
                ربات‌های من
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                برای ویرایش، یکی از ربات‌ها را انتخاب
                کن.
              </p>
            </div>

            <div className="text-xs text-slate-500">
              {loading
                ? "در حال دریافت..."
                : `${bots.length} ربات`}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-center text-sm text-slate-500">
              در حال دریافت ربات‌ها از دیتابیس...
            </div>
          ) : bots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
              <div className="text-3xl">🤖</div>

              <p className="mt-3 font-bold text-slate-300">
                هنوز رباتی ساخته نشده است.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                تنظیمات را وارد کن و روی ذخیره تنظیمات
                بزن.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bots.map((bot) => {
                const selected =
                  bot.id === selectedBotId;

                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() =>
                      selectBot(bot)
                    }
                    className={`text-right rounded-2xl border p-4 transition ${
                      selected
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-100">
                          {bot.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {bot.symbol} ·{" "}
                          {bot.timeframe}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black ${
                          bot.isActive
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {bot.isActive
                          ? "فعال"
                          : "خاموش"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-900 p-2">
                        <div className="text-slate-500">
                          TP
                        </div>
                        <div className="mt-1 font-bold text-emerald-300">
                          ${bot.takeProfit ?? 0}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-900 p-2">
                        <div className="text-slate-500">
                          SL
                        </div>
                        <div className="mt-1 font-bold text-red-300">
                          ${bot.stopLoss ?? 0}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main settings */}
          <div className="space-y-6">
            {/* Basic */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="اطلاعات اصلی"
                description="نام، بازار و استراتژی اصلی ربات."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="نام ربات">
                  <input
                    value={form.botName}
                    onChange={(event) =>
                      updateField(
                        "botName",
                        event.target.value
                      )
                    }
                    className="input"
                    placeholder="مثلاً Gold AI Bot"
                  />
                </Field>

                <Field label="بازار">
                  <select
                    value={form.market}
                    onChange={(event) =>
                      updateField(
                        "market",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    {marketOptions.map(
                      (market) => (
                        <option
                          key={market.value}
                          value={market.value}
                        >
                          {market.label}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="استراتژی">
                  <select
                    value={form.strategy}
                    onChange={(event) =>
                      updateField(
                        "strategy",
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    {strategyOptions.map(
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
                </Field>

                <Field label="تایم‌فریم">
                  <div className="input flex items-center justify-between">
                    <span>15 دقیقه</span>
                    <span className="text-xs text-cyan-400">
                      15m
                    </span>
                  </div>
                </Field>
              </div>
            </section>

            {/* Risk */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="مدیریت حجم و ریسک"
                description="حجم معامله و درصد ریسک هر معامله."
              />

              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950 p-2">
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "lotMode",
                      "fixed"
                    )
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    form.lotMode === "fixed"
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-500 hover:bg-slate-900"
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
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    form.lotMode === "risk"
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-500 hover:bg-slate-900"
                  }`}
                >
                  درصد ریسک
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Lot Size">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.lotSize}
                    onChange={(event) =>
                      updateField(
                        "lotSize",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="درصد ریسک">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.riskPercent}
                    onChange={(event) =>
                      updateField(
                        "riskPercent",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>
            </section>

            {/* TP SL */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="حد سود و حد ضرر"
                description="مقادیر مدیریت معامله برای هر پوزیشن."
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Take Profit">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.takeProfit}
                    onChange={(event) =>
                      updateField(
                        "takeProfit",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Stop Loss">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.stopLoss}
                    onChange={(event) =>
                      updateField(
                        "stopLoss",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Risk / Reward">
                  <input
                    type="number"
                    min="0.1"
                    step="0.05"
                    value={form.riskReward}
                    onChange={(event) =>
                      updateField(
                        "riskReward",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>
            </section>

            {/* Daily limits */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="محدودیت‌های روزانه"
                description="برای جلوگیری از ادامه معامله در شرایط نامناسب."
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="توقف سود روزانه">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.dailyProfit}
                    onChange={(event) =>
                      updateField(
                        "dailyProfit",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="حد ضرر روزانه">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.dailyLoss}
                    onChange={(event) =>
                      updateField(
                        "dailyLoss",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="حداکثر استاپ روزانه">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxStopLosses}
                    onChange={(event) =>
                      updateField(
                        "maxStopLosses",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="حداکثر معاملات باز">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.maxOpenTrades}
                    onChange={(event) =>
                      updateField(
                        "maxOpenTrades",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>
            </section>

            {/* Trade direction */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="جهت معاملات"
                description="مشخص کن ربات اجازه چه نوع معاملاتی داشته باشد."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleCard
                  title="Buy"
                  description="اجازه معاملات خرید"
                  enabled={form.buyEnabled}
                  onClick={() =>
                    updateField(
                      "buyEnabled",
                      !form.buyEnabled
                    )
                  }
                />

                <ToggleCard
                  title="Sell"
                  description="اجازه معاملات فروش"
                  enabled={form.sellEnabled}
                  onClick={() =>
                    updateField(
                      "sellEnabled",
                      !form.sellEnabled
                    )
                  }
                />
              </div>
            </section>

            {/* Advanced */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="تنظیمات پیشرفته"
                description="فیلترها و کنترل‌های تکمیلی."
              />

              <div className="grid gap-3">
                <ToggleCard
                  title="Trailing Stop"
                  description="جابجایی حد ضرر در جهت معامله"
                  enabled={form.trailingStop}
                  onClick={() =>
                    updateField(
                      "trailingStop",
                      !form.trailingStop
                    )
                  }
                />

                {form.trailingStop && (
                  <Field label="فاصله Trailing Stop">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        form.trailingStopDistance
                      }
                      onChange={(event) =>
                        updateField(
                          "trailingStopDistance",
                          event.target.value
                        )
                      }
                      className="input"
                    />
                  </Field>
                )}

                <ToggleCard
                  title="Break Even"
                  description="انتقال حد ضرر به نقطه ورود"
                  enabled={form.breakEven}
                  onClick={() =>
                    updateField(
                      "breakEven",
                      !form.breakEven
                    )
                  }
                />

                {form.breakEven && (
                  <Field label="تریگر Break Even">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        form.breakEvenTrigger
                      }
                      onChange={(event) =>
                        updateField(
                          "breakEvenTrigger",
                          event.target.value
                        )
                      }
                      className="input"
                    />
                  </Field>
                )}

                <ToggleCard
                  title="Session Filter"
                  description="فیلتر ساعات معاملاتی"
                  enabled={form.sessionFilter}
                  onClick={() =>
                    updateField(
                      "sessionFilter",
                      !form.sessionFilter
                    )
                  }
                />

                <ToggleCard
                  title="News Filter"
                  description="فیلتر اخبار مهم بازار"
                  enabled={form.newsFilter}
                  onClick={() =>
                    updateField(
                      "newsFilter",
                      !form.newsFilter
                    )
                  }
                />

                <ToggleCard
                  title="Telegram"
                  description="ارسال رویدادهای ربات به تلگرام"
                  enabled={form.telegramEnabled}
                  onClick={() =>
                    updateField(
                      "telegramEnabled",
                      !form.telegramEnabled
                    )
                  }
                />
              </div>
            </section>

            {/* Filters */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
              <SectionTitle
                title="فیلترهای ورود"
                description="حداقل امتیاز و تعداد تأییدیه‌های لازم."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="حداقل امتیاز سیگنال">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={
                      form.signalThreshold
                    }
                    onChange={(event) =>
                      updateField(
                        "signalThreshold",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="حداقل تعداد تأییدیه">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.minConfirmations
                    }
                    onChange={(event) =>
                      updateField(
                        "minConfirmations",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="حداکثر Spread">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.maxSpread}
                    onChange={(event) =>
                      updateField(
                        "maxSpread",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Cooldown بعد از معامله">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.cooldown}
                    onChange={(event) =>
                      updateField(
                        "cooldown",
                        event.target.value
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>
            </section>

            {/* Save */}
            <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-5 shadow-xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-black">
                    آماده ذخیره تنظیمات؟
                  </h2>

                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    تنظیمات فعلی در دیتابیس ذخیره می‌شوند
                    و بعد از Refresh باقی خواهند ماند.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="rounded-2xl bg-cyan-500 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "در حال ذخیره..."
                    : selectedBotId
                    ? "ذخیره تغییرات"
                    : "ساخت و ذخیره ربات"}
                </button>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
              <h2 className="font-black">
                خلاصه تنظیمات
              </h2>

              <div className="mt-4 space-y-3">
                <SummaryRow
                  label="بازار"
                  value={
                    selectedMarket.symbol
                  }
                />

                <SummaryRow
                  label="Lot"
                  value={`${form.lotSize}`}
                />

                <SummaryRow
                  label="TP"
                  value={`$${form.takeProfit}`}
                  valueClass="text-emerald-300"
                />

                <SummaryRow
                  label="SL"
                  value={`$${form.stopLoss}`}
                  valueClass="text-red-300"
                />

                <SummaryRow
                  label="حد سود روزانه"
                  value={`$${form.dailyProfit}`}
                  valueClass="text-emerald-300"
                />

                <SummaryRow
                  label="حد ضرر روزانه"
                  value={`$${form.dailyLoss}`}
                  valueClass="text-red-300"
                />

                <SummaryRow
                  label="حداکثر استاپ"
                  value={
                    form.maxStopLosses
                  }
                />

                <SummaryRow
                  label="تأییدیه"
                  value={`${form.minConfirmations}`}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-black">
                    وضعیت ربات
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    فعال‌سازی ربات معامله‌گر
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "botEnabled",
                      !form.botEnabled
                    )
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    form.botEnabled
                      ? "bg-emerald-500"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      form.botEnabled
                        ? "right-1"
                        : "right-6"
                    }`}
                  />
                </button>
              </div>

              <div
                className={`mt-5 rounded-2xl border p-4 text-center ${
                  form.botEnabled
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-950/50"
                }`}
              >
                <div
                  className={`text-sm font-black ${
                    form.botEnabled
                      ? "text-emerald-300"
                      : "text-slate-500"
                  }`}
                >
                  {form.botEnabled
                    ? "ربات فعال است"
                    : "ربات خاموش است"}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex gap-3">
                <div className="text-xl">
                  ⚠️
                </div>

                <div>
                  <h3 className="text-sm font-black text-amber-300">
                    توجه
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-400">
                    ذخیره شدن تنظیمات به معنی تضمین سودآوری
                    معاملات نیست. عملکرد واقعی ربات به
                    استراتژی، بازار، اجرای سفارش و مدیریت
                    ریسک وابسته است.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid rgb(30 41 59);
          background: rgb(2 6 23 / 0.75);
          padding: 0.8rem 0.9rem;
          color: white;
          outline: none;
          transition: 0.2s;
        }

        .input:focus {
          border-color: rgb(34 211 238 / 0.6);
          box-shadow: 0 0 0 3px
            rgb(34 211 238 / 0.08);
        }

        select.input {
          cursor: pointer;
        }

        option {
          background: rgb(15 23 42);
          color: white;
        }
      `}</style>
    </main>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-black">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function ToggleCard({
  title,
  description,
  enabled,
  onClick,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-right transition ${
        enabled
          ? "border-cyan-500/30 bg-cyan-500/5"
          : "border-slate-800 bg-slate-950/50"
      }`}
    >
      <div>
        <div className="text-sm font-black text-slate-200">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </div>
      </div>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-cyan-500"
            : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled
              ? "right-1"
              : "right-6"
          }`}
        />
      </span>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "text-slate-200",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-3 py-3">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span
        className={`text-sm font-black ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}
