"use client";

import { useEffect, useMemo, useState } from "react";

/* =========================================================
   Trading AI - Professional Bot Builder
   ========================================================= */

type Bot = {
  id: string;
  name: string;
  type?: string;
  category?: string;

  symbol?: string;
  timeframe?: string;
  marketType?: string;

  lotMode?: string;
  lotSize?: number;
  riskPercent?: number;

  takeProfit?: number | null;
  stopLoss?: number | null;
  riskReward?: number | null;

  trailingStop?: boolean;
  trailingStopDistance?: number | null;

  breakEven?: boolean;
  breakEvenTrigger?: number | null;

  dailyProfitStop?: number | null;
  dailyLossLimit?: number | null;
  maxDailyStopLosses?: number;
  maxOpenTrades?: number;

  buyEnabled?: boolean;
  sellEnabled?: boolean;

  maxSpread?: number | null;
  cooldownMinutes?: number;

  sessionFilter?: boolean;
  newsFilter?: boolean;

  signalThreshold?: number;
  minConfirmations?: number;

  telegramEnabled?: boolean;

  isActive?: boolean;

  analysisConfig?: Record<string, unknown> | null;

  createdAt?: string;
  updatedAt?: string;
};

type AutoConfig = {
  executionMode: "MANUAL" | "AUTO_CONFIRM";
  stopAfterWins: number;
  stopAfterLosses: number;
  confirmationRequired: boolean;
  maxConsecutiveLosses: number;
};

type FormState = {
  name: string;
  symbol: string;
  timeframe: string;
  marketType: string;

  lotMode: string;
  lotSize: string;
  riskPercent: string;

  takeProfit: string;
  stopLoss: string;

  trailingStop: boolean;
  trailingStopDistance: string;

  breakEven: boolean;
  breakEvenTrigger: string;

  dailyProfitStop: string;
  dailyLossLimit: string;
  maxDailyStopLosses: string;
  maxOpenTrades: string;

  buyEnabled: boolean;
  sellEnabled: boolean;

  maxSpread: string;
  cooldownMinutes: string;

  sessionFilter: boolean;
  newsFilter: boolean;

  signalThreshold: string;
  minConfirmations: string;

  telegramEnabled: boolean;

  isActive: boolean;

  auto: AutoConfig;
};

const DEFAULT_FORM: FormState = {
  name: "ربات طلایی من",
  symbol: "XAUUSD",
  timeframe: "15m",
  marketType: "FOREX",

  lotMode: "FIXED",
  lotSize: "0.01",
  riskPercent: "1",

  takeProfit: "5",
  stopLoss: "4",

  trailingStop: false,
  trailingStopDistance: "2",

  breakEven: false,
  breakEvenTrigger: "3",

  dailyProfitStop: "20",
  dailyLossLimit: "12",
  maxDailyStopLosses: "3",
  maxOpenTrades: "1",

  buyEnabled: true,
  sellEnabled: true,

  maxSpread: "30",
  cooldownMinutes: "5",

  sessionFilter: true,
  newsFilter: true,

  signalThreshold: "80",
  minConfirmations: "5",

  telegramEnabled: false,

  isActive: false,

  auto: {
    executionMode: "MANUAL",
    stopAfterWins: 0,
    stopAfterLosses: 3,
    confirmationRequired: true,
    maxConsecutiveLosses: 3,
  },
};

/* =========================================================
   SVG ICONS
   ========================================================= */

function Icon({
  name,
  size = 22,
}: {
  name: string;
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

  if (name === "bot") {
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4" />
        <circle cx="9" cy="13" r="1" />
        <circle cx="15" cy="13" r="1" />
        <path d="M8 17h8" />
      </svg>
    );
  }

  if (name === "market") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </svg>
    );
  }

  if (name === "money") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M7 9h.01M17 15h.01" />
      </svg>
    );
  }

  if (name === "profit") {
    return (
      <svg {...common}>
        <path d="M4 18 10 12l4 3 6-8" />
        <path d="M15 7h5v5" />
      </svg>
    );
  }

  if (name === "loss") {
    return (
      <svg {...common}>
        <path d="M4 6 10 12l4-3 6 8" />
        <path d="M15 17h5v-5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg {...common}>
        <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
      </svg>
    );
  }

  if (name === "telegram") {
    return (
      <svg {...common}>
        <path d="m21 4-3 17-6-6-4 3 1-5 12-9Z" />
        <path d="m12 15 3-5" />
      </svg>
    );
  }

  if (name === "save") {
    return (
      <svg {...common}>
        <path d="M5 4h12l2 2v14H5V4Z" />
        <path d="M8 4v5h8V4" />
        <path d="M8 20v-6h8v6" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M20 11a8 8 0 0 0-14-4L4 9" />
        <path d="M4 5v4h4" />
        <path d="M4 13a8 8 0 0 0 14 4l2-2" />
        <path d="M20 19v-4h-4" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg {...common}>
        <path d="m12 3 9 17H3L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  if (name === "zap") {
    return (
      <svg {...common}>
        <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "$0";
  return `$${Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function botToForm(bot: Bot): FormState {
  const config =
    bot.analysisConfig &&
    typeof bot.analysisConfig === "object"
      ? bot.analysisConfig
      : {};

  const auto =
    config &&
    typeof config.autoControl === "object" &&
    config.autoControl !== null
      ? (config.autoControl as Partial<AutoConfig>)
      : {};

  return {
    name: bot.name || "ربات جدید",
    symbol: bot.symbol || "XAUUSD",
    timeframe: bot.timeframe || "15m",
    marketType: bot.marketType || "FOREX",

    lotMode: bot.lotMode || "FIXED",
    lotSize: String(bot.lotSize ?? 0.01),
    riskPercent: String(bot.riskPercent ?? 1),

    takeProfit: String(bot.takeProfit ?? 5),
    stopLoss: String(bot.stopLoss ?? 4),

    trailingStop: Boolean(bot.trailingStop),
    trailingStopDistance: String(bot.trailingStopDistance ?? 2),

    breakEven: Boolean(bot.breakEven),
    breakEvenTrigger: String(bot.breakEvenTrigger ?? 3),

    dailyProfitStop: String(bot.dailyProfitStop ?? 20),
    dailyLossLimit: String(bot.dailyLossLimit ?? 12),
    maxDailyStopLosses: String(bot.maxDailyStopLosses ?? 3),
    maxOpenTrades: String(bot.maxOpenTrades ?? 1),

    buyEnabled: bot.buyEnabled !== false,
    sellEnabled: bot.sellEnabled !== false,

    maxSpread: String(bot.maxSpread ?? 30),
    cooldownMinutes: String(bot.cooldownMinutes ?? 5),

    sessionFilter: bot.sessionFilter !== false,
    newsFilter: bot.newsFilter !== false,

    signalThreshold: String(bot.signalThreshold ?? 80),
    minConfirmations: String(bot.minConfirmations ?? 5),

    telegramEnabled: Boolean(bot.telegramEnabled),

    isActive: Boolean(bot.isActive),

    auto: {
      executionMode:
        auto.executionMode === "AUTO_CONFIRM"
          ? "AUTO_CONFIRM"
          : "MANUAL",
      stopAfterWins: Number(auto.stopAfterWins ?? 0),
      stopAfterLosses: Number(
        auto.stopAfterLosses ?? bot.maxDailyStopLosses ?? 3
      ),
      confirmationRequired:
        auto.confirmationRequired !== false,
      maxConsecutiveLosses: Number(
        auto.maxConsecutiveLosses ?? bot.maxDailyStopLosses ?? 3
      ),
    },
  };
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div className="section-icon">
          <Icon name={icon} size={21} />
        </div>

        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>

      <div className="section-content">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <div className="field-top">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </label>
  );
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
  description?: string;
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

      <span className="toggle-text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </button>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function BotBuilderPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedId) ?? null,
    [bots, selectedId]
  );

  const tp = numberValue(form.takeProfit);
  const sl = numberValue(form.stopLoss);

  const riskReward =
    sl > 0 ? tp / sl : 0;

  const calculatedProfit =
    tp > 0 ? tp : 0;

  const calculatedLoss =
    sl > 0 ? sl : 0;

  /* -------------------------------------------------------
     LOAD
     ------------------------------------------------------- */

  async function loadBots() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bots", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("خطا در دریافت ربات‌ها");
      }

      const data = await response.json();

      const list: Bot[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.bots)
        ? data.bots
        : [];

      setBots(list);

      if (list.length > 0) {
        const first = list[0];
        setSelectedId(first.id);
        setForm(botToForm(first));
      }
    } catch (err) {
      console.error(err);
      setError("دریافت اطلاعات ربات‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots();
  }, []);

  /* -------------------------------------------------------
     FORM UPDATE
     ------------------------------------------------------- */

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setMessage("");
    setError("");
  }

  function updateAuto<K extends keyof AutoConfig>(
    key: K,
    value: AutoConfig[K]
  ) {
    setForm((previous) => ({
      ...previous,
      auto: {
        ...previous.auto,
        [key]: value,
      },
    }));

    setMessage("");
    setError("");
  }

  /* -------------------------------------------------------
     SELECT BOT
     ------------------------------------------------------- */

  function selectBot(bot: Bot) {
    setSelectedId(bot.id);
    setForm(botToForm(bot));
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* -------------------------------------------------------
     NEW BOT
     ------------------------------------------------------- */

  function newBot() {
    setSelectedId(null);
    setForm({
      ...DEFAULT_FORM,
      name: `ربات جدید ${bots.length + 1}`,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* -------------------------------------------------------
     SAVE
     ------------------------------------------------------- */

  async function saveBot() {
    if (!form.name.trim()) {
      setError("نام ربات را وارد کنید.");
      return;
    }

    if (!form.buyEnabled && !form.sellEnabled) {
      setError("حداقل یکی از Buy یا Sell باید فعال باشد.");
      return;
    }

    if (tp <= 0 || sl <= 0) {
      setError("حد سود و حد ضرر باید بیشتر از صفر باشند.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        id: selectedId || undefined,

        name: form.name.trim(),

        type: "TRADING",
        category: "TRADING",

        symbol: form.symbol,
        timeframe: form.timeframe,
        marketType: form.marketType,

        lotMode: form.lotMode,
        lotSize: numberValue(form.lotSize, 0.01),
        riskPercent: numberValue(form.riskPercent, 1),

        takeProfit: tp,
        stopLoss: sl,
        riskReward,

        trailingStop: form.trailingStop,
        trailingStopDistance: numberValue(
          form.trailingStopDistance,
          2
        ),

        breakEven: form.breakEven,
        breakEvenTrigger: numberValue(
          form.breakEvenTrigger,
          3
        ),

        dailyProfitStop: numberValue(
          form.dailyProfitStop,
          20
        ),

        dailyLossLimit: numberValue(
          form.dailyLossLimit,
          12
        ),

        maxDailyStopLosses: Math.max(
          1,
          Math.floor(
            numberValue(form.maxDailyStopLosses, 3)
          )
        ),

        maxOpenTrades: Math.max(
          1,
          Math.floor(
            numberValue(form.maxOpenTrades, 1)
          )
        ),

        buyEnabled: form.buyEnabled,
        sellEnabled: form.sellEnabled,

        maxSpread: numberValue(
          form.maxSpread,
          30
        ),

        cooldownMinutes: Math.max(
          0,
          Math.floor(
            numberValue(form.cooldownMinutes, 5)
          )
        ),

        sessionFilter: form.sessionFilter,
        newsFilter: form.newsFilter,

        signalThreshold: Math.min(
          100,
          Math.max(
            0,
            Math.floor(
              numberValue(
                form.signalThreshold,
                80
              )
            )
          )
        ),

        minConfirmations: Math.max(
          1,
          Math.floor(
            numberValue(
              form.minConfirmations,
              5
            )
          )
        ),

        telegramEnabled: form.telegramEnabled,

        isActive: form.isActive,

        analysisConfig: {
          autoControl: {
            executionMode:
              form.auto.executionMode,
            stopAfterWins:
              Math.max(
                0,
                Math.floor(form.auto.stopAfterWins)
              ),
            stopAfterLosses:
              Math.max(
                0,
                Math.floor(form.auto.stopAfterLosses)
              ),
            confirmationRequired:
              form.auto.confirmationRequired,
            maxConsecutiveLosses:
              Math.max(
                0,
                Math.floor(
                  form.auto.maxConsecutiveLosses
                )
              ),
          },
        },
      };

      const response = await fetch("/api/bots", {
        method: selectedId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "ذخیره ربات انجام نشد."
        );
      }

      const savedBot: Bot =
        data?.bot ||
        data?.data ||
        data;

      if (savedBot?.id) {
        setSelectedId(savedBot.id);
      }

      await loadBots();

      setMessage(
        selectedId
          ? "تنظیمات ربات با موفقیت بروزرسانی شد."
          : "ربات جدید با موفقیت ساخته شد."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
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

  /* -------------------------------------------------------
     ACTIVE TOGGLE
     ------------------------------------------------------- */

  async function toggleBotActive() {
    if (!selectedId) {
      setError(
        "ابتدا ربات را ذخیره کنید، سپس آن را روشن کنید."
      );
      return;
    }

    const nextValue = !form.isActive;

    setForm((previous) => ({
      ...previous,
      isActive: nextValue,
    }));

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/bots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedId,
          isActive: nextValue,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تغییر وضعیت ربات انجام نشد."
        );
      }

      await loadBots();

      setMessage(
        nextValue
          ? "ربات فعال شد."
          : "ربات خاموش شد."
      );
    } catch (err) {
      console.error(err);

      setForm((previous) => ({
        ...previous,
        isActive: !nextValue,
      }));

      setError(
        err instanceof Error
          ? err.message
          : "تغییر وضعیت انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------
     DELETE
     -------------------------------------------------------
     The current API does not expose DELETE in the known
     contract, so we intentionally do not fake a delete button.
  ------------------------------------------------------- */

  return (
    <main className="bot-page" dir="rtl">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #050914;
        }

        body {
          font-family:
            Vazirmatn,
            IRANSans,
            Tahoma,
            Arial,
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

        .bot-page {
          min-height: 100vh;
          width: 100%;
          color: #e8eef8;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(14, 165, 233, 0.10),
              transparent 28%
            ),
            radial-gradient(
              circle at 5% 35%,
              rgba(99, 102, 241, 0.08),
              transparent 25%
            ),
            #050914;
          padding: 28px 16px 70px;
        }

        .page-shell {
          width: min(1120px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: #67e8f9;
          background:
            linear-gradient(
              145deg,
              rgba(8, 145, 178, 0.25),
              rgba(37, 99, 235, 0.13)
            );
          border: 1px solid rgba(103, 232, 249, 0.22);
          box-shadow:
            0 10px 35px rgba(8, 145, 178, 0.10);
          flex: 0 0 auto;
        }

        .brand-text h1 {
          margin: 0;
          font-size: clamp(21px, 4vw, 29px);
          letter-spacing: -0.5px;
          color: #f8fbff;
        }

        .brand-text p {
          margin: 5px 0 0;
          color: #8290a5;
          font-size: 13px;
        }

        .top-actions {
          display: flex;
          gap: 9px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .btn {
          border: 1px solid #1e293b;
          color: #dbe7f5;
          background: #0b1220;
          border-radius: 12px;
          min-height: 44px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease,
            opacity 0.18s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
          border-color: #334155;
          background: #101a2b;
        }

        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .btn-primary {
          border-color: rgba(34, 211, 238, 0.35);
          background:
            linear-gradient(
              135deg,
              #0891b2,
              #2563eb
            );
          color: white;
          box-shadow:
            0 12px 30px rgba(8, 145, 178, 0.18);
        }

        .btn-primary:hover {
          background:
            linear-gradient(
              135deg,
              #06b6d4,
              #2563eb
            );
        }

        .btn-green {
          border-color: rgba(34, 197, 94, 0.30);
          color: #bbf7d0;
          background: rgba(22, 101, 52, 0.16);
        }

        .btn-red {
          border-color: rgba(248, 113, 113, 0.28);
          color: #fecaca;
          background: rgba(127, 29, 29, 0.16);
        }

        .notice {
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .notice-success {
          background: rgba(16, 185, 129, 0.10);
          border: 1px solid rgba(16, 185, 129, 0.22);
          color: #a7f3d0;
        }

        .notice-error {
          background: rgba(239, 68, 68, 0.10);
          border: 1px solid rgba(239, 68, 68, 0.22);
          color: #fecaca;
        }

        .bot-control {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          padding: 18px;
          margin-bottom: 18px;
          border-radius: 20px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.98),
              rgba(8, 15, 28, 0.98)
            );
          border: 1px solid #172235;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.20);
        }

        .bot-status {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .status-dot {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #475569;
          box-shadow: 0 0 0 5px rgba(71, 85, 105, 0.10);
        }

        .status-dot.active {
          background: #22c55e;
          box-shadow:
            0 0 0 5px rgba(34, 197, 94, 0.10),
            0 0 22px rgba(34, 197, 94, 0.45);
        }

        .status-title {
          margin: 0;
          color: #f8fafc;
          font-size: 16px;
          font-weight: 800;
        }

        .status-subtitle {
          margin: 4px 0 0;
          color: #718096;
          font-size: 12px;
        }

        .status-action {
          min-width: 145px;
        }

        .bot-list {
          display: flex;
          gap: 9px;
          overflow-x: auto;
          padding: 2px 1px 9px;
          margin-bottom: 18px;
          scrollbar-width: thin;
        }

        .bot-chip {
          flex: 0 0 auto;
          border: 1px solid #172235;
          background: #09111e;
          color: #aebbd0;
          padding: 11px 13px;
          border-radius: 13px;
          cursor: pointer;
          min-width: 150px;
          text-align: right;
          transition: 0.18s ease;
        }

        .bot-chip:hover {
          border-color: #2b3a50;
        }

        .bot-chip.active {
          border-color: rgba(34, 211, 238, 0.42);
          background:
            linear-gradient(
              145deg,
              rgba(8, 145, 178, 0.13),
              rgba(37, 99, 235, 0.09)
            );
          color: #e8fbff;
        }

        .bot-chip strong {
          display: block;
          font-size: 13px;
        }

        .bot-chip small {
          display: block;
          color: #64748b;
          margin-top: 4px;
          font-size: 11px;
        }

        .empty-list {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: 1px dashed #26344a;
          color: #718096;
          text-align: center;
          font-size: 13px;
        }

        .grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .section-card {
          background:
            linear-gradient(
              145deg,
              rgba(11, 18, 32, 0.97),
              rgba(7, 14, 26, 0.97)
            );
          border: 1px solid #172235;
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 16px 45px rgba(0, 0, 0, 0.14);
          margin-bottom: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 17px 18px;
          border-bottom: 1px solid #142033;
        }

        .section-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #67e8f9;
          background: rgba(8, 145, 178, 0.10);
          border: 1px solid rgba(34, 211, 238, 0.13);
        }

        .section-header h2 {
          margin: 0;
          font-size: 16px;
          color: #f1f5f9;
        }

        .section-header p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.7;
        }

        .section-content {
          padding: 17px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field-grid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .field {
          display: block;
          min-width: 0;
        }

        .field-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
        }

        .field-top span {
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 700;
        }

        .field-top small {
          color: #526176;
          font-size: 10px;
        }

        .input,
        .select {
          width: 100%;
          min-height: 47px;
          border-radius: 12px;
          border: 1px solid #1d2a3e;
          background: #070e1a;
          color: #e5edf7;
          padding: 0 13px;
          outline: none;
          transition: 0.18s ease;
          direction: rtl;
        }

        .input:focus,
        .select:focus {
          border-color: rgba(34, 211, 238, 0.55);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.07);
        }

        .input::placeholder {
          color: #475569;
        }

        .select {
          appearance: auto;
        }

        .money-input {
          direction: ltr;
          text-align: left;
        }

        .tp-card,
        .sl-card {
          border-radius: 17px;
          padding: 16px;
          border: 1px solid;
        }

        .tp-card {
          border-color: rgba(34, 197, 94, 0.17);
          background: rgba(22, 101, 52, 0.07);
        }

        .sl-card {
          border-color: rgba(248, 113, 113, 0.17);
          background: rgba(127, 29, 29, 0.07);
        }

        .metric-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 9px;
        }

        .tp-card .metric-label {
          color: #86efac;
        }

        .sl-card .metric-label {
          color: #fda4af;
        }

        .metric-input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 23px;
          font-weight: 900;
          direction: ltr;
          text-align: left;
        }

        .rr-panel {
          margin-top: 15px;
          border-radius: 18px;
          padding: 17px;
          background:
            linear-gradient(
              135deg,
              rgba(8, 145, 178, 0.11),
              rgba(37, 99, 235, 0.07)
            );
          border: 1px solid rgba(34, 211, 238, 0.16);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .rr-title {
          color: #94a3b8;
          font-size: 11px;
        }

        .rr-number {
          margin-top: 5px;
          color: #67e8f9;
          font-size: 28px;
          font-weight: 900;
          direction: ltr;
        }

        .rr-explanation {
          text-align: left;
          direction: ltr;
          color: #64748b;
          font-size: 10px;
          line-height: 1.7;
        }

        .direction-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .direction {
          min-height: 62px;
          border-radius: 15px;
          border: 1px solid #1d2a3e;
          background: #070e1a;
          color: #718096;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .direction.buy.active {
          border-color: rgba(34, 197, 94, 0.36);
          background: rgba(22, 101, 52, 0.13);
          color: #86efac;
        }

        .direction.sell.active {
          border-color: rgba(248, 113, 113, 0.36);
          background: rgba(127, 29, 29, 0.13);
          color: #fda4af;
        }

        .direction strong {
          display: block;
          font-size: 13px;
        }

        .direction small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
        }

        .toggle-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .toggle-row {
          min-height: 67px;
          border: 1px solid #18253a;
          background: #070e1a;
          border-radius: 14px;
          padding: 11px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #cbd5e1;
          cursor: pointer;
          text-align: right;
          transition: 0.18s ease;
        }

        .toggle-row:hover {
          border-color: #2b3b52;
        }

        .toggle-row.active {
          border-color: rgba(34, 211, 238, 0.23);
          background: rgba(8, 145, 178, 0.06);
        }

        .switch {
          width: 39px;
          height: 23px;
          border-radius: 999px;
          background: #1e293b;
          padding: 3px;
          flex: 0 0 auto;
          transition: 0.18s ease;
        }

        .switch span {
          display: block;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #64748b;
          transition: 0.18s ease;
        }

        .switch.on {
          background: #0891b2;
        }

        .switch.on span {
          transform: translateX(-16px);
          background: white;
        }

        .toggle-text {
          min-width: 0;
        }

        .toggle-text strong {
          display: block;
          font-size: 12px;
        }

        .toggle-text small {
          display: block;
          color: #596a80;
          margin-top: 4px;
          font-size: 10px;
          line-height: 1.5;
        }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 13px;
        }

        .mode-button {
          min-height: 74px;
          border-radius: 15px;
          border: 1px solid #1d2a3e;
          background: #070e1a;
          color: #94a3b8;
          padding: 12px;
          cursor: pointer;
          text-align: right;
          transition: 0.18s ease;
        }

        .mode-button.active {
          border-color: rgba(34, 211, 238, 0.35);
          background: rgba(8, 145, 178, 0.09);
          color: #e2faff;
        }

        .mode-button strong {
          display: block;
          font-size: 13px;
        }

        .mode-button small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.6;
        }

        .danger-box {
          margin-top: 13px;
          border-radius: 15px;
          padding: 13px;
          border: 1px solid rgba(248, 113, 113, 0.14);
          background: rgba(127, 29, 29, 0.06);
          color: #cbd5e1;
          font-size: 11px;
          line-height: 1.9;
        }

        .danger-box strong {
          color: #fda4af;
        }

        .bottom-save {
          position: sticky;
          bottom: 12px;
          z-index: 20;
          margin-top: 7px;
          border-radius: 18px;
          padding: 9px;
          background: rgba(5, 9, 20, 0.86);
          border: 1px solid #172235;
          backdrop-filter: blur(16px);
          box-shadow:
            0 15px 50px rgba(0, 0, 0, 0.30);
        }

        .save-button {
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 14px;
          color: white;
          font-weight: 900;
          font-size: 14px;
          background:
            linear-gradient(
              135deg,
              #0891b2,
              #2563eb
            );
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow:
            0 10px 30px rgba(37, 99, 235, 0.20);
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .summary-item {
          border: 1px solid #172235;
          background: #09111e;
          border-radius: 15px;
          padding: 13px;
          min-width: 0;
        }

        .summary-item span {
          color: #64748b;
          display: block;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .summary-item strong {
          color: #e2e8f0;
          font-size: 14px;
        }

        .summary-item.profit strong {
          color: #4ade80;
        }

        .summary-item.loss strong {
          color: #fb7185;
        }

        .loading-screen {
          width: min(700px, 100%);
          margin: 90px auto;
          text-align: center;
          color: #718096;
        }

        .loading-icon {
          width: 55px;
          height: 55px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          color: #67e8f9;
          border: 1px solid #1c3047;
          background: #09111e;
          animation: pulse 1.4s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: 850px) {
          .grid-two {
            grid-template-columns: 1fr;
          }

          .field-grid.three {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summary-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .bot-page {
            padding: 15px 10px 55px;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .top-actions {
            width: 100%;
          }

          .top-actions .btn {
            flex: 1;
          }

          .bot-control {
            grid-template-columns: 1fr;
          }

          .status-action {
            width: 100%;
          }

          .field-grid,
          .field-grid.three,
          .toggle-list,
          .mode-grid {
            grid-template-columns: 1fr;
          }

          .section-card {
            border-radius: 17px;
          }

          .section-header,
          .section-content {
            padding: 14px;
          }

          .rr-panel {
            align-items: flex-start;
            flex-direction: column;
          }

          .rr-explanation {
            text-align: right;
            direction: rtl;
          }

          .summary-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .brand-text p {
            font-size: 11px;
          }
        }
      `}</style>

      <div className="page-shell">
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="topbar">
          <div className="brand-area">
            <div className="brand-icon">
              <Icon name="bot" size={25} />
            </div>

            <div className="brand-text">
              <h1>ساخت و مدیریت ربات</h1>
              <p>
                تنظیمات واقعی ربات معاملاتی Trading AI
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="btn"
              onClick={loadBots}
              disabled={loading || saving}
            >
              <Icon name="refresh" size={17} />
              بروزرسانی
            </button>

            <button
              type="button"
              className="btn"
              onClick={newBot}
              disabled={saving}
            >
              <Icon name="plus" size={17} />
              ربات جدید
            </button>
          </div>
        </header>

        {/* =================================================
            NOTICES
        ================================================= */}

        {message && (
          <div className="notice notice-success">
            <Icon name="check" size={18} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="notice notice-error">
            <Icon name="warning" size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="loading-screen">
            <div className="loading-icon">
              <Icon name="refresh" size={24} />
            </div>

            <div>
              در حال دریافت تنظیمات ربات‌ها...
            </div>
          </div>
        ) : (
          <>
            {/* =============================================
                BOT STATUS
            ============================================= */}

            <div className="bot-control">
              <div className="bot-status">
                <div
                  className={`status-dot ${
                    form.isActive ? "active" : ""
                  }`}
                />

                <div>
                  <p className="status-title">
                    {form.isActive
                      ? "ربات در وضعیت فعال است"
                      : "ربات خاموش است"}
                  </p>

                  <p className="status-subtitle">
                    {selectedId
                      ? "تنظیمات فعلی این ربات از دیتابیس خوانده شده است."
                      : "یک ربات جدید بسازید و تنظیمات آن را ذخیره کنید."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`btn status-action ${
                  form.isActive
                    ? "btn-red"
                    : "btn-green"
                }`}
                onClick={toggleBotActive}
                disabled={!selectedId || saving}
              >
                <Icon
                  name={form.isActive ? "loss" : "zap"}
                  size={18}
                />

                {form.isActive
                  ? "خاموش کردن ربات"
                  : "روشن کردن ربات"}
              </button>
            </div>

            {/* =============================================
                BOT LIST
            ============================================= */}

            <div className="bot-list">
              {bots.length === 0 ? (
                <div className="empty-list">
                  هنوز رباتی ساخته نشده است. از دکمه «ربات
                  جدید» استفاده کنید.
                </div>
              ) : (
                <>
                  {bots.map((bot) => (
                    <button
                      key={bot.id}
                      type="button"
                      className={`bot-chip ${
                        selectedId === bot.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() => selectBot(bot)}
                    >
                      <strong>
                        {bot.name}
                      </strong>

                      <small>
                        {bot.symbol || "XAUUSD"} •{" "}
                        {bot.timeframe || "15m"}
                      </small>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* =============================================
                SUMMARY
            ============================================= */}

            <div className="summary-strip">
              <div className="summary-item">
                <span>بازار</span>
                <strong>{form.symbol}</strong>
              </div>

              <div className="summary-item">
                <span>تایم‌فریم</span>
                <strong>{form.timeframe}</strong>
              </div>

              <div className="summary-item profit">
                <span>حد سود</span>
                <strong>
                  {formatMoney(calculatedProfit)}
                </strong>
              </div>

              <div className="summary-item loss">
                <span>حد ضرر</span>
                <strong>
                  {formatMoney(calculatedLoss)}
                </strong>
              </div>
            </div>

            {/* =============================================
                BASIC
            ============================================= */}

            <SectionCard
              icon="bot"
              title="اطلاعات اصلی ربات"
              description="نام و مشخصات پایه ربات را تعیین کنید."
            >
              <div className="field-grid">
                <Field
                  label="نام ربات"
                  hint="نام دلخواه"
                >
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) =>
                      update(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="مثلاً Gold AI Pro"
                  />
                </Field>

                <Field
                  label="نوع بازار"
                  hint="Market"
                >
                  <select
                    className="select"
                    value={form.marketType}
                    onChange={(e) =>
                      update(
                        "marketType",
                        e.target.value
                      )
                    }
                  >
                    <option value="FOREX">
                      Forex
                    </option>
                    <option value="CRYPTO">
                      Crypto
                    </option>
                    <option value="INDEX">
                      Index
                    </option>
                    <option value="METALS">
                      Metals
                    </option>
                  </select>
                </Field>

                <Field
                  label="نماد معاملاتی"
                  hint="Symbol"
                >
                  <select
                    className="select"
                    value={form.symbol}
                    onChange={(e) =>
                      update(
                        "symbol",
                        e.target.value
                      )
                    }
                  >
                    <option value="XAUUSD">
                      XAUUSD • Gold
                    </option>
                    <option value="EURUSD">
                      EURUSD
                    </option>
                    <option value="GBPUSD">
                      GBPUSD
                    </option>
                    <option value="USDJPY">
                      USDJPY
                    </option>
                    <option value="BTCUSDT">
                      BTCUSDT
                    </option>
                    <option value="ETHUSDT">
                      ETHUSDT
                    </option>
                  </select>
                </Field>

                <Field
                  label="تایم‌فریم"
                  hint="Timeframe"
                >
                  <select
                    className="select"
                    value={form.timeframe}
                    onChange={(e) =>
                      update(
                        "timeframe",
                        e.target.value
                      )
                    }
                  >
                    <option value="1m">
                      1 دقیقه
                    </option>
                    <option value="5m">
                      5 دقیقه
                    </option>
                    <option value="15m">
                      15 دقیقه
                    </option>
                    <option value="30m">
                      30 دقیقه
                    </option>
                    <option value="1h">
                      1 ساعت
                    </option>
                    <option value="4h">
                      4 ساعت
                    </option>
                    <option value="1d">
                      روزانه
                    </option>
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* =============================================
                MONEY / RISK
            ============================================= */}

            <SectionCard
              icon="money"
              title="حجم و مدیریت ریسک"
              description="مشخص کنید ربات با چه حجمی و چه میزان ریسکی وارد معامله شود."
            >
              <div className="field-grid">
                <Field
                  label="روش تعیین حجم"
                  hint="Lot Mode"
                >
                  <select
                    className="select"
                    value={form.lotMode}
                    onChange={(e) =>
                      update(
                        "lotMode",
                        e.target.value
                      )
                    }
                  >
                    <option value="FIXED">
                      حجم ثابت
                    </option>
                    <option value="RISK_PERCENT">
                      درصد ریسک
                    </option>
                  </select>
                </Field>

                <Field
                  label="حجم ثابت"
                  hint="Lot"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={form.lotSize}
                    onChange={(e) =>
                      update(
                        "lotSize",
                        e.target.value
                      )
                    }
                    disabled={
                      form.lotMode !== "FIXED"
                    }
                  />
                </Field>

                <Field
                  label="درصد ریسک"
                  hint="%"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.riskPercent}
                    onChange={(e) =>
                      update(
                        "riskPercent",
                        e.target.value
                      )
                    }
                    disabled={
                      form.lotMode !==
                      "RISK_PERCENT"
                    }
                  />
                </Field>
              </div>

              <div style={{ height: 14 }} />

              <div className="direction-grid">
                <button
                  type="button"
                  className={`direction buy ${
                    form.buyEnabled
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    update(
                      "buyEnabled",
                      !form.buyEnabled
                    )
                  }
                >
                  <span>
                    <strong>BUY</strong>
                    <small>
                      معاملات خرید
                    </small>
                  </span>

                  <Icon
                    name="profit"
                    size={22}
                  />
                </button>

                <button
                  type="button"
                  className={`direction sell ${
                    form.sellEnabled
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    update(
                      "sellEnabled",
                      !form.sellEnabled
                    )
                  }
                >
                  <span>
                    <strong>SELL</strong>
                    <small>
                      معاملات فروش
                    </small>
                  </span>

                  <Icon
                    name="loss"
                    size={22}
                  />
                </button>
              </div>
            </SectionCard>

            {/* =============================================
                TP / SL
            ============================================= */}

            <SectionCard
              icon="profit"
              title="حد سود، حد ضرر و R/R"
              description="نسبت ریسک به بازده بر اساس مقادیر واقعی TP و SL محاسبه می‌شود."
            >
              <div className="field-grid">
                <div className="tp-card">
                  <div className="metric-label">
                    <Icon
                      name="profit"
                      size={17}
                    />
                    حد سود
                  </div>

                  <input
                    className="metric-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.takeProfit}
                    onChange={(e) =>
                      update(
                        "takeProfit",
                        e.target.value
                      )
                    }
                  />

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 10,
                      marginTop: 7,
                    }}
                  >
                    مقدار سود هدف هر معامله
                  </div>
                </div>

                <div className="sl-card">
                  <div className="metric-label">
                    <Icon
                      name="loss"
                      size={17}
                    />
                    حد ضرر
                  </div>

                  <input
                    className="metric-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.stopLoss}
                    onChange={(e) =>
                      update(
                        "stopLoss",
                        e.target.value
                      )
                    }
                  />

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 10,
                      marginTop: 7,
                    }}
                  >
                    مقدار زیان مجاز هر معامله
                  </div>
                </div>
              </div>

              <div className="rr-panel">
                <div>
                  <div className="rr-title">
                    نسبت ریسک به بازده محاسبه‌شده
                  </div>

                  <div className="rr-number">
                    1 :{" "}
                    {riskReward > 0
                      ? riskReward.toFixed(2)
                      : "0.00"}
                  </div>
                </div>

                <div className="rr-explanation">
                  TP ÷ SL
                  <br />
                  {tp > 0 && sl > 0
                    ? `${tp} ÷ ${sl} = ${riskReward.toFixed(
                        2
                      )}`
                    : "حد سود و ضرر را وارد کنید"}
                </div>
              </div>
            </SectionCard>

            {/* =============================================
                SMART MANAGEMENT
            ============================================= */}

            <SectionCard
              icon="settings"
              title="مدیریت هوشمند معامله"
              description="قواعدی که در زمان باز بودن معامله روی مدیریت آن اعمال می‌شوند."
            >
              <div className="toggle-list">
                <Toggle
                  checked={form.trailingStop}
                  onChange={(value) =>
                    update(
                      "trailingStop",
                      value
                    )
                  }
                  label="Trailing Stop"
                  description="جابجایی هوشمند حد ضرر"
                />

                <Toggle
                  checked={form.breakEven}
                  onChange={(value) =>
                    update(
                      "breakEven",
                      value
                    )
                  }
                  label="Break Even"
                  description="انتقال حد ضرر به نقطه ورود"
                />
              </div>

              <div style={{ height: 14 }} />

              <div className="field-grid">
                <Field
                  label="فاصله Trailing Stop"
                  hint="$"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      form.trailingStopDistance
                    }
                    onChange={(e) =>
                      update(
                        "trailingStopDistance",
                        e.target.value
                      )
                    }
                    disabled={
                      !form.trailingStop
                    }
                  />
                </Field>

                <Field
                  label="فعال شدن Break Even"
                  hint="$"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      form.breakEvenTrigger
                    }
                    onChange={(e) =>
                      update(
                        "breakEvenTrigger",
                        e.target.value
                      )
                    }
                    disabled={
                      !form.breakEven
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            {/* =============================================
                DAILY PROTECTION
            ============================================= */}

            <SectionCard
              icon="shield"
              title="محافظت و محدودیت‌های روزانه"
              description="برای جلوگیری از ادامه معامله در شرایط نامطلوب."
            >
              <div className="field-grid">
                <Field
                  label="توقف بعد از سود روزانه"
                  hint="$"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      form.dailyProfitStop
                    }
                    onChange={(e) =>
                      update(
                        "dailyProfitStop",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="حد ضرر روزانه"
                  hint="$"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      form.dailyLossLimit
                    }
                    onChange={(e) =>
                      update(
                        "dailyLossLimit",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="حداکثر Stop Loss روزانه"
                  hint="تعداد"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.maxDailyStopLosses
                    }
                    onChange={(e) =>
                      update(
                        "maxDailyStopLosses",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="حداکثر معاملات باز"
                  hint="تعداد"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.maxOpenTrades
                    }
                    onChange={(e) =>
                      update(
                        "maxOpenTrades",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </div>

              <div className="danger-box">
                <strong>محافظت فعال:</strong>{" "}
                اگر حد سود روزانه یا حد ضرر روزانه
                تکمیل شود، موتور اجرای ربات باید
                معامله جدید را متوقف کند.
              </div>
            </SectionCard>

            {/* =============================================
                AUTO CONTROL
            ============================================= */}

            <SectionCard
              icon="zap"
              title="کنترل اجرای ربات"
              description="این بخش مشخص می‌کند ربات چگونه و تحت چه شرایطی اجازه اجرای معاملات داشته باشد."
            >
              <div className="mode-grid">
                <button
                  type="button"
                  className={`mode-button ${
                    form.auto.executionMode ===
                    "MANUAL"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    updateAuto(
                      "executionMode",
                      "MANUAL"
                    )
                  }
                >
                  <strong>
                    دستی
                  </strong>

                  <small>
                    ربات فقط بعد از روشن کردن
                    توسط کاربر فعال می‌شود.
                  </small>
                </button>

                <button
                  type="button"
                  className={`mode-button ${
                    form.auto.executionMode ===
                    "AUTO_CONFIRM"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    updateAuto(
                      "executionMode",
                      "AUTO_CONFIRM"
                    )
                  }
                >
                  <strong>
                    خودکار با تأیید کاربر
                  </strong>

                  <small>
                    بعد از تأیید کاربر، موتور ربات
                    می‌تواند طبق قوانین ذخیره‌شده
                    اجرا شود.
                  </small>
                </button>
              </div>

              <div className="field-grid three">
                <Field
                  label="خاموشی بعد از X سود"
                  hint="0 = غیرفعال"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.auto.stopAfterWins
                    }
                    onChange={(e) =>
                      updateAuto(
                        "stopAfterWins",
                        numberValue(
                          e.target.value,
                          0
                        )
                      )
                    }
                  />
                </Field>

                <Field
                  label="خاموشی بعد از X ضرر"
                  hint="0 = غیرفعال"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.auto.stopAfterLosses
                    }
                    onChange={(e) =>
                      updateAuto(
                        "stopAfterLosses",
                        numberValue(
                          e.target.value,
                          0
                        )
                      )
                    }
                  />
                </Field>

                <Field
                  label="حداکثر ضرر متوالی"
                  hint="0 = بدون محدودیت"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.auto
                        .maxConsecutiveLosses
                    }
                    onChange={(e) =>
                      updateAuto(
                        "maxConsecutiveLosses",
                        numberValue(
                          e.target.value,
                          0
                        )
                      )
                    }
                  />
                </Field>
              </div>

              <div style={{ height: 12 }} />

              <Toggle
                checked={
                  form.auto.confirmationRequired
                }
                onChange={(value) =>
                  updateAuto(
                    "confirmationRequired",
                    value
                  )
                }
                label="تأیید کاربر برای فعال‌سازی اجرای خودکار"
                description="برای اجرای خودکار، فعال‌سازی باید توسط کاربر تأیید شده باشد."
              />
            </SectionCard>

            {/* =============================================
                FILTERS
            ============================================= */}

            <SectionCard
              icon="filter"
              title="فیلترهای ورود"
              description="فیلترهایی که قبل از اجازه ورود معامله بررسی می‌شوند."
            >
              <div className="field-grid">
                <Field
                  label="حداکثر Spread"
                  hint="Point"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.maxSpread}
                    onChange={(e) =>
                      update(
                        "maxSpread",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="Cooldown"
                  hint="دقیقه"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.cooldownMinutes
                    }
                    onChange={(e) =>
                      update(
                        "cooldownMinutes",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="حداقل امتیاز سیگنال"
                  hint="0 تا 100"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={
                      form.signalThreshold
                    }
                    onChange={(e) =>
                      update(
                        "signalThreshold",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="حداقل تأییدیه‌ها"
                  hint="تعداد"
                >
                  <input
                    className="input money-input"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.minConfirmations
                    }
                    onChange={(e) =>
                      update(
                        "minConfirmations",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </div>

              <div style={{ height: 14 }} />

              <div className="toggle-list">
                <Toggle
                  checked={
                    form.sessionFilter
                  }
                  onChange={(value) =>
                    update(
                      "sessionFilter",
                      value
                    )
                  }
                  label="Session Filter"
                  description="محدود کردن معاملات به سشن‌های مجاز"
                />

                <Toggle
                  checked={form.newsFilter}
                  onChange={(value) =>
                    update(
                      "newsFilter",
                      value
                    )
                  }
                  label="News Filter"
                  description="جلوگیری از ورود در زمان اخبار مهم"
                />
              </div>
            </SectionCard>

            {/* =============================================
                TELEGRAM
            ============================================= */}

            <SectionCard
              icon="telegram"
              title="اعلان‌ها و Telegram"
              description="کنترل ارسال اعلان‌های مربوط به ربات."
            >
              <Toggle
                checked={
                  form.telegramEnabled
                }
                onChange={(value) =>
                  update(
                    "telegramEnabled",
                    value
                  )
                }
                label="ارسال اعلان Telegram"
                description="ارسال وضعیت و سیگنال‌ها به Telegram در صورت پیکربندی سرویس."
              />
            </SectionCard>

            {/* =============================================
                SAVE
            ============================================= */}

            <div className="bottom-save">
              <button
                type="button"
                className="save-button"
                onClick={saveBot}
                disabled={saving}
              >
                <Icon
                  name={saving ? "refresh" : "save"}
                  size={19}
                />

                {saving
                  ? "در حال ذخیره و بروزرسانی..."
                  : selectedBot
                  ? "ذخیره و بروزرسانی ربات"
                  : "ساخت و ذخیره ربات"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
