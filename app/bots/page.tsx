"use client";

import { useEffect, useMemo, useState } from "react";

type Bot = {
  id: string;
  name: string;
  symbol: string | null;
  timeframe: string | null;
  marketType: string | null;

  isActive: boolean;
  executionMode: string;
  tradingApproval: boolean;
  botStatus: string;
  stoppedReason: string | null;
  lastStateChangeAt: string | null;

  autoStopAfterWins: number | null;
  autoStopAfterLosses: number | null;
  autoStopAfterTrades: number | null;
  stopBeforeNewsMinutes: number;

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
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function getStatusText(bot: Bot) {
  if (!bot.isActive) return "خاموش";

  if (bot.executionMode === "AUTO") {
    if (!bot.tradingApproval) return "در انتظار تأیید";
    return "خودکار";
  }

  return "دستی";
}

function getStatusClass(bot: Bot) {
  if (!bot.isActive) {
    return "bg-slate-800 text-slate-300 border-slate-700";
  }

  if (bot.executionMode === "AUTO" && !bot.tradingApproval) {
    return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  }

  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedId) ?? null,
    [bots, selectedId]
  );

  async function loadBots() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/bots", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "خطا در دریافت ربات‌ها");
      }

      const list = Array.isArray(data) ? data : data.bots || [];

      setBots(list);

      if (list.length > 0) {
        setSelectedId((current) =>
          current && list.some((bot: Bot) => bot.id === current)
            ? current
            : list[0].id
        );
      } else {
        setSelectedId(null);
      }
    } catch (error) {
      console.error(error);
      setMessage("دریافت اطلاعات ربات‌ها با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots();
  }, []);

  function updateLocal<K extends keyof Bot>(key: K, value: Bot[K]) {
    if (!selectedId) return;

    setBots((current) =>
      current.map((bot) =>
        bot.id === selectedId
          ? {
              ...bot,
              [key]: value,
            }
          : bot
      )
    );

    setSaveStatus("idle");
    setMessage("");
  }

  async function saveBot(patch: Partial<Bot>) {
    if (!selectedBot) return;

    try {
      setSaveStatus("saving");
      setMessage("");

      const response = await fetch("/api/bots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedBot.id,
          ...patch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "ذخیره تنظیمات انجام نشد");
      }

      const updated = data?.bot || data;

      setBots((current) =>
        current.map((bot) =>
          bot.id === selectedBot.id
            ? {
                ...bot,
                ...updated,
                ...patch,
              }
            : bot
        )
      );

      setSaveStatus("saved");
      setMessage("تنظیمات با موفقیت ذخیره شد.");

      window.setTimeout(() => {
        setSaveStatus("idle");
      }, 2200);
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره تنظیمات ربات"
      );
    }
  }

  async function saveAll() {
    if (!selectedBot) return;

    await saveBot({
      name: selectedBot.name,
      symbol: selectedBot.symbol,
      timeframe: selectedBot.timeframe,
      isActive: selectedBot.isActive,
      executionMode: selectedBot.executionMode,
      tradingApproval: selectedBot.tradingApproval,
      botStatus: selectedBot.botStatus,
      stoppedReason: selectedBot.stoppedReason,

      autoStopAfterWins: selectedBot.autoStopAfterWins,
      autoStopAfterLosses: selectedBot.autoStopAfterLosses,
      autoStopAfterTrades: selectedBot.autoStopAfterTrades,
      stopBeforeNewsMinutes: selectedBot.stopBeforeNewsMinutes,

      lotMode: selectedBot.lotMode,
      lotSize: selectedBot.lotSize,
      riskPercent: selectedBot.riskPercent,

      takeProfit: selectedBot.takeProfit,
      stopLoss: selectedBot.stopLoss,
      riskReward: selectedBot.riskReward,

      trailingStop: selectedBot.trailingStop,
      trailingStopDistance: selectedBot.trailingStopDistance,

      breakEven: selectedBot.breakEven,
      breakEvenTrigger: selectedBot.breakEvenTrigger,

      dailyProfitStop: selectedBot.dailyProfitStop,
      dailyLossLimit: selectedBot.dailyLossLimit,
      maxDailyStopLosses: selectedBot.maxDailyStopLosses,
      maxOpenTrades: selectedBot.maxOpenTrades,

      buyEnabled: selectedBot.buyEnabled,
      sellEnabled: selectedBot.sellEnabled,

      maxSpread: selectedBot.maxSpread,
      cooldownMinutes: selectedBot.cooldownMinutes,

      sessionFilter: selectedBot.sessionFilter,
      newsFilter: selectedBot.newsFilter,

      signalThreshold: selectedBot.signalThreshold,
      minConfirmations: selectedBot.minConfirmations,

      telegramEnabled: selectedBot.telegramEnabled,
    });
  }

  async function toggleBot() {
    if (!selectedBot) return;

    const nextActive = !selectedBot.isActive;

    updateLocal("isActive", nextActive);
    updateLocal("botStatus", nextActive ? "READY" : "STOPPED");

    await saveBot({
      isActive: nextActive,
      botStatus: nextActive ? "READY" : "STOPPED",
      stoppedReason: nextActive ? null : "توسط کاربر خاموش شد",
      lastStateChangeAt: new Date().toISOString(),
    });
  }

  async function toggleAutoMode() {
    if (!selectedBot) return;

    const nextMode =
      selectedBot.executionMode === "AUTO" ? "MANUAL" : "AUTO";

    updateLocal("executionMode", nextMode);

    await saveBot({
      executionMode: nextMode,
      tradingApproval:
        nextMode === "AUTO"
          ? selectedBot.tradingApproval
          : false,
    });
  }

  async function toggleApproval() {
    if (!selectedBot) return;

    const nextApproval = !selectedBot.tradingApproval;

    updateLocal("tradingApproval", nextApproval);

    await saveBot({
      tradingApproval: nextApproval,
    });
  }

  function calculateRR(
    takeProfit: number | null,
    stopLoss: number | null
  ) {
    if (!takeProfit || !stopLoss || stopLoss <= 0) return null;

    return takeProfit / stopLoss;
  }

  async function updateTakeProfit(value: number | null) {
    if (!selectedBot) return;

    const rr = calculateRR(value, selectedBot.stopLoss);

    updateLocal("takeProfit", value);
    updateLocal("riskReward", rr);

    await saveBot({
      takeProfit: value,
      riskReward: rr,
    });
  }

  async function updateStopLoss(value: number | null) {
    if (!selectedBot) return;

    const rr = calculateRR(selectedBot.takeProfit, value);

    updateLocal("stopLoss", value);
    updateLocal("riskReward", rr);

    await saveBot({
      stopLoss: value,
      riskReward: rr,
    });
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#050914] text-white"
      >
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5">
          <div className="rounded-3xl border border-cyan-400/10 bg-[#0a1220] px-8 py-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
            <p className="text-sm text-slate-300">
              در حال دریافت اطلاعات ربات‌ها...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!selectedBot) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#050914] text-white"
      >
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <section className="rounded-[28px] border border-cyan-400/10 bg-gradient-to-br from-[#0b1728] to-[#07101d] p-7 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">
              🤖
            </div>

            <h1 className="text-2xl font-black sm:text-3xl">
              مرکز کنترل ربات‌ها
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              هنوز رباتی برای کنترل وجود ندارد. ابتدا از بخش ساخت ربات،
              یک ربات ایجاد کنید.
            </p>

            <a
              href="/bot-builder"
              className="mt-7 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 transition hover:scale-[1.02]"
            >
              + ساخت ربات جدید
            </a>
          </section>
        </div>
      </main>
    );
  }

  const rr =
    selectedBot.riskReward ??
    calculateRR(selectedBot.takeProfit, selectedBot.stopLoss);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050914] text-white"
    >
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 lg:px-8 lg:py-8">

        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1.5 text-xs text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
              مرکز کنترل Trading AI
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              کنترل ربات 🤖
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              وضعیت و قوانین اجرای ربات را از یک صفحه مدیریت کنید.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadBots}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
            >
              ↻ بروزرسانی
            </button>

            <a
              href="/bot-builder"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              ⚙ تنظیمات
            </a>
          </div>
        </header>

        {/* BOT SELECTOR */}
        {bots.length > 1 && (
          <section className="mb-5 overflow-x-auto">
            <div className="flex min-w-max gap-3 pb-1">
              {bots.map((bot) => (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(bot.id);
                    setMessage("");
                    setSaveStatus("idle");
                  }}
                  className={`min-w-[190px] rounded-2xl border p-4 text-right transition ${
                    selectedBot.id === bot.id
                      ? "border-cyan-400/40 bg-cyan-400/[0.08] shadow-lg shadow-cyan-950/20"
                      : "border-white/5 bg-[#08111f] hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold">
                      {bot.name}
                    </span>

                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        bot.isActive
                          ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]"
                          : "bg-slate-600"
                      }`}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {bot.symbol || "بدون نماد"} •{" "}
                    {bot.timeframe || "—"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* MAIN STATUS */}
        <section className="mb-5 overflow-hidden rounded-[28px] border border-cyan-400/10 bg-gradient-to-br from-[#0b1b2d] via-[#091524] to-[#07101b] shadow-2xl">
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl shadow-lg shadow-cyan-950/20">
                  🤖
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-black sm:text-2xl">
                      {selectedBot.name}
                    </h2>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                        selectedBot
                      )}`}
                    >
                      {getStatusText(selectedBot)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    {selectedBot.symbol || "نماد مشخص نشده"} •{" "}
                    {selectedBot.timeframe || "تایم‌فریم مشخص نشده"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={toggleBot}
                  className={`rounded-2xl px-6 py-3.5 text-sm font-bold transition ${
                    selectedBot.isActive
                      ? "border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-950/20 hover:scale-[1.01]"
                  }`}
                >
                  {selectedBot.isActive
                    ? "⏹ خاموش کردن ربات"
                    : "▶ روشن کردن ربات"}
                </button>

                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saveStatus === "saving"}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-50"
                >
                  {saveStatus === "saving"
                    ? "در حال ذخیره..."
                    : "💾 ذخیره تنظیمات"}
                </button>
              </div>
            </div>

            {message && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                  saveStatus === "error"
                    ? "border-red-400/20 bg-red-500/5 text-red-300"
                    : "border-emerald-400/20 bg-emerald-500/5 text-emerald-300"
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </section>

        {/* QUICK STATS */}
        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-[#08111f] p-4">
            <p className="text-xs text-slate-500">نماد</p>
            <p className="mt-2 text-lg font-black text-white">
              {selectedBot.symbol || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#08111f] p-4">
            <p className="text-xs text-slate-500">تایم‌فریم</p>
            <p className="mt-2 text-lg font-black text-cyan-300">
              {selectedBot.timeframe || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-[#08111f] p-4">
            <p className="text-xs text-slate-500">حد سود</p>
            <p className="mt-2 text-lg font-black text-emerald-400">
              {formatMoney(selectedBot.takeProfit)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-400/10 bg-[#08111f] p-4">
            <p className="text-xs text-slate-500">حد ضرر</p>
            <p className="mt-2 text-lg font-black text-red-400">
              {formatMoney(selectedBot.stopLoss)}
            </p>
          </div>
        </section>

        {/* EXECUTION MODE */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <h2 className="font-black">حالت اجرای ربات</h2>
                <p className="mt-1 text-xs text-slate-500">
                  مشخص کنید ربات در چه حالتی آماده دریافت دستور باشد.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                updateLocal("executionMode", "MANUAL");
                updateLocal("tradingApproval", false);
                saveBot({
                  executionMode: "MANUAL",
                  tradingApproval: false,
                });
              }}
              className={`rounded-2xl border p-5 text-right transition ${
                selectedBot.executionMode === "MANUAL"
                  ? "border-cyan-400/40 bg-cyan-400/[0.08]"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className="text-2xl">✋</div>
              <h3 className="mt-3 font-bold">حالت دستی</h3>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                کنترل اجرای ربات در اختیار کاربر باقی می‌ماند.
              </p>
            </button>

            <button
              type="button"
              onClick={toggleAutoMode}
              className={`rounded-2xl border p-5 text-right transition ${
                selectedBot.executionMode === "AUTO"
                  ? "border-blue-400/40 bg-blue-400/[0.08]"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className="text-2xl">🤖</div>
              <h3 className="mt-3 font-bold">حالت خودکار</h3>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                ربات برای اجرای خودکار آماده می‌شود، مشروط به تأیید کاربر.
              </p>
            </button>
          </div>

          {selectedBot.executionMode === "AUTO" && (
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-amber-200">
                  🔐 تأیید اجرای خودکار
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  برای فعال شدن مجوز اجرای خودکار، تأیید صریح کاربر لازم است.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleApproval}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  selectedBot.tradingApproval
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {selectedBot.tradingApproval
                  ? "✓ تأیید شده"
                  : "تأیید اجرای خودکار"}
              </button>
            </div>
          )}
        </section>

        {/* TP SL */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h2 className="font-black">حد سود، حد ضرر و ریسک</h2>
              <p className="mt-1 text-xs text-slate-500">
                R/R به صورت خودکار از TP و SL محاسبه می‌شود.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.03] p-4">
              <span className="text-xs text-slate-500">
                💰 حد سود به دلار
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={selectedBot.takeProfit ?? ""}
                onChange={(event) => {
                  const value =
                    event.target.value === ""
                      ? null
                      : Number(event.target.value);

                  updateLocal("takeProfit", value);

                  const nextRR = calculateRR(
                    value,
                    selectedBot.stopLoss
                  );

                  updateLocal("riskReward", nextRR);
                }}
                onBlur={() =>
                  updateTakeProfit(selectedBot.takeProfit)
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#050914] px-4 py-3 text-left text-lg font-bold text-emerald-300 outline-none transition focus:border-emerald-400/40"
              />
            </label>

            <label className="rounded-2xl border border-red-400/10 bg-red-500/[0.03] p-4">
              <span className="text-xs text-slate-500">
                🛑 حد ضرر به دلار
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={selectedBot.stopLoss ?? ""}
                onChange={(event) => {
                  const value =
                    event.target.value === ""
                      ? null
                      : Number(event.target.value);

                  updateLocal("stopLoss", value);

                  const nextRR = calculateRR(
                    selectedBot.takeProfit,
                    value
                  );

                  updateLocal("riskReward", nextRR);
                }}
                onBlur={() =>
                  updateStopLoss(selectedBot.stopLoss)
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#050914] px-4 py-3 text-left text-lg font-bold text-red-300 outline-none transition focus:border-red-400/40"
              />
            </label>

            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
              <span className="text-xs text-slate-500">
                ⚖️ ریسک به ریوارد
              </span>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-3xl font-black text-cyan-300">
                  {rr ? rr.toFixed(2) : "—"}
                </span>

                <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300">
                  خودکار
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                مثال: TP $10 / SL $2 = R/R 5.00
              </p>
            </div>
          </div>
        </section>

        {/* DAILY PROTECTION */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <div>
              <h2 className="font-black">محافظت روزانه</h2>
              <p className="mt-1 text-xs text-slate-500">
                برای جلوگیری از ادامه فعالیت بعد از عبور از محدودیت‌های روزانه.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="💰 توقف بعد از سود"
              value={selectedBot.dailyProfitStop}
              onChange={(value) => {
                updateLocal("dailyProfitStop", value);
              }}
              onBlur={() =>
                saveBot({
                  dailyProfitStop: selectedBot.dailyProfitStop,
                })
              }
              suffix="$"
            />

            <NumberField
              label="📉 حد ضرر روزانه"
              value={selectedBot.dailyLossLimit}
              onChange={(value) => {
                updateLocal("dailyLossLimit", value);
              }}
              onBlur={() =>
                saveBot({
                  dailyLossLimit: selectedBot.dailyLossLimit,
                })
              }
              suffix="$"
            />

            <NumberField
              label="🛑 حداکثر استاپ روزانه"
              value={selectedBot.maxDailyStopLosses}
              onChange={(value) => {
                updateLocal(
                  "maxDailyStopLosses",
                  value === null ? 0 : Math.round(value)
                );
              }}
              onBlur={() =>
                saveBot({
                  maxDailyStopLosses: selectedBot.maxDailyStopLosses,
                })
              }
              suffix="بار"
            />

            <NumberField
              label="📊 حداکثر معاملات باز"
              value={selectedBot.maxOpenTrades}
              onChange={(value) => {
                updateLocal(
                  "maxOpenTrades",
                  value === null ? 0 : Math.round(value)
                );
              }}
              onBlur={() =>
                saveBot({
                  maxOpenTrades: selectedBot.maxOpenTrades,
                })
              }
              suffix="معامله"
            />
          </div>
        </section>

        {/* AUTO STOP */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xl">⏱️</span>
            <div>
              <h2 className="font-black">خاموشی خودکار</h2>
              <p className="mt-1 text-xs text-slate-500">
                ربات پس از رسیدن به یکی از قوانین زیر باید متوقف شود.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="🏆 بعد از چند برد؟"
              value={selectedBot.autoStopAfterWins}
              onChange={(value) =>
                updateLocal("autoStopAfterWins", value)
              }
              onBlur={() =>
                saveBot({
                  autoStopAfterWins: selectedBot.autoStopAfterWins,
                })
              }
              suffix="برد"
            />

            <NumberField
              label="❌ بعد از چند ضرر؟"
              value={selectedBot.autoStopAfterLosses}
              onChange={(value) =>
                updateLocal("autoStopAfterLosses", value)
              }
              onBlur={() =>
                saveBot({
                  autoStopAfterLosses: selectedBot.autoStopAfterLosses,
                })
              }
              suffix="ضرر"
            />

            <NumberField
              label="🔢 بعد از چند معامله؟"
              value={selectedBot.autoStopAfterTrades}
              onChange={(value) =>
                updateLocal("autoStopAfterTrades", value)
              }
              onBlur={() =>
                saveBot({
                  autoStopAfterTrades: selectedBot.autoStopAfterTrades,
                })
              }
              suffix="معامله"
            />
          </div>
        </section>

        {/* NEWS PROTECTION */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xl">📰</span>
            <div>
              <h2 className="font-black">محافظت در برابر اخبار</h2>
              <p className="mt-1 text-xs text-slate-500">
                این تنظیمات برای اتصال بعدی به موتور اخبار واقعی آماده شده است.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleRow
              title="فیلتر اخبار"
              description="قبل از رویدادهای مهم از ایجاد معامله جدید جلوگیری شود."
              enabled={selectedBot.newsFilter}
              onToggle={() => {
                const value = !selectedBot.newsFilter;
                updateLocal("newsFilter", value);
                saveBot({ newsFilter: value });
              }}
            />

            <NumberField
              label="⏳ توقف قبل از خبر"
              value={selectedBot.stopBeforeNewsMinutes}
              onChange={(value) =>
                updateLocal(
                  "stopBeforeNewsMinutes",
                  value === null ? 0 : Math.round(value)
                )
              }
              onBlur={() =>
                saveBot({
                  stopBeforeNewsMinutes:
                    selectedBot.stopBeforeNewsMinutes,
                })
              }
              suffix="دقیقه"
            />
          </div>
        </section>

        {/* DIRECTIONS */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xl">📈</span>
            <div>
              <h2 className="font-black">جهت معاملات</h2>
              <p className="mt-1 text-xs text-slate-500">
                مشخص کنید ربات اجازه بررسی کدام جهت را داشته باشد.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              title="خرید / BUY"
              description="اجازه ایجاد سیگنال و معامله خرید."
              enabled={selectedBot.buyEnabled}
              accent="green"
              onToggle={() => {
                const value = !selectedBot.buyEnabled;
                updateLocal("buyEnabled", value);
                saveBot({ buyEnabled: value });
              }}
            />

            <ToggleRow
              title="فروش / SELL"
              description="اجازه ایجاد سیگنال و معامله فروش."
              enabled={selectedBot.sellEnabled}
              accent="red"
              onToggle={() => {
                const value = !selectedBot.sellEnabled;
                updateLocal("sellEnabled", value);
                saveBot({ sellEnabled: value });
              }}
            />
          </div>
        </section>

        {/* ADVANCED */}
        <section className="mb-5 rounded-[26px] border border-white/5 bg-[#08111f] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="font-black">کنترل‌های پیشرفته</h2>
              <p className="mt-1 text-xs text-slate-500">
                تنظیمات مهمی که روی رفتار ربات تأثیر می‌گذارند.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="⏳ فاصله بین معاملات"
              value={selectedBot.cooldownMinutes}
              onChange={(value) =>
                updateLocal(
                  "cooldownMinutes",
                  value === null ? 0 : Math.round(value)
                )
              }
              onBlur={() =>
                saveBot({
                  cooldownMinutes: selectedBot.cooldownMinutes,
                })
              }
              suffix="دقیقه"
            />

            <NumberField
              label="🎯 حداقل امتیاز سیگنال"
              value={selectedBot.signalThreshold}
              onChange={(value) =>
                updateLocal(
                  "signalThreshold",
                  value === null ? 0 : Math.round(value)
                )
              }
              onBlur={() =>
                saveBot({
                  signalThreshold: selectedBot.signalThreshold,
                })
              }
              suffix="/ 100"
            />

            <NumberField
              label="🔎 حداقل تأییدها"
              value={selectedBot.minConfirmations}
              onChange={(value) =>
                updateLocal(
                  "minConfirmations",
                  value === null ? 0 : Math.round(value)
                )
              }
              onBlur={() =>
                saveBot({
                  minConfirmations: selectedBot.minConfirmations,
                })
              }
              suffix="تأیید"
            />

            <ToggleRow
              title="فیلتر سشن معاملاتی"
              description="معاملات فقط در زمان‌های مجاز انجام شوند."
              enabled={selectedBot.sessionFilter}
              onToggle={() => {
                const value = !selectedBot.sessionFilter;
                updateLocal("sessionFilter", value);
                saveBot({ sessionFilter: value });
              }}
            />

            <ToggleRow
              title="Trailing Stop"
              description="جابجایی حد ضرر بر اساس تنظیمات موتور معامله."
              enabled={selectedBot.trailingStop}
              onToggle={() => {
                const value = !selectedBot.trailingStop;
                updateLocal("trailingStop", value);
                saveBot({ trailingStop: value });
              }}
            />

            <ToggleRow
              title="Break Even"
              description="انتقال حد ضرر به نقطه سر به سر."
              enabled={selectedBot.breakEven}
              onToggle={() => {
                const value = !selectedBot.breakEven;
                updateLocal("breakEven", value);
                saveBot({ breakEven: value });
              }}
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="rounded-[24px] border border-cyan-400/10 bg-cyan-400/[0.03] p-5 text-center">
          <p className="text-sm font-semibold text-slate-300">
            وضعیت فعلی:{" "}
            <span className="text-cyan-300">
              {getStatusText(selectedBot)}
            </span>
          </p>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            تنظیمات بالا در حساب شما ذخیره می‌شوند. اجرای معامله واقعی فقط
            پس از اتصال موتور معامله و بروکر فعال خواهد شد.
          </p>
        </footer>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  onBlur,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur: () => void;
  suffix?: string;
}) {
  return (
    <label className="block rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <span className="text-xs text-slate-500">{label}</span>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value ?? ""}
          onChange={(event) => {
            onChange(
              event.target.value === ""
                ? null
                : Number(event.target.value)
            );
          }}
          onBlur={onBlur}
          className="w-full rounded-xl border border-white/10 bg-[#050914] px-4 py-3 text-left font-bold text-white outline-none transition focus:border-cyan-400/40"
        />

        {suffix && (
          <span className="shrink-0 text-xs text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
  accent = "cyan",
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  accent?: "cyan" | "green" | "red";
}) {
  const colors = {
    cyan: enabled
      ? "border-cyan-400/30 bg-cyan-400/[0.06]"
      : "border-white/5 bg-white/[0.02]",
    green: enabled
      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
      : "border-white/5 bg-white/[0.02]",
    red: enabled
      ? "border-red-400/30 bg-red-400/[0.05]"
      : "border-white/5 bg-white/[0.02]",
  };

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${colors[accent]}`}
    >
      <div className="min-w-0">
        <h3 className="font-bold text-slate-200">{title}</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={title}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-cyan-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
            enabled ? "right-1" : "right-6"
          }`}
        />
      </button>
    </div>
  );
}
