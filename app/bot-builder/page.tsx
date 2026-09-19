"use client";

import { useEffect, useMemo, useState } from "react";

/* =========================================================
   Types
========================================================= */

type Bot = {
  id: string;
  name: string;
  type?: string | null;
  category?: string | null;

  symbol: string;
  timeframe: string;
  marketType?: string | null;

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
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
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
  riskReward: string;

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
};

/* =========================================================
   Helpers
========================================================= */

const emptyForm: FormState = {
  name: "",
  symbol: "XAUUSD",
  timeframe: "15m",
  marketType: "FOREX",

  lotMode: "FIXED",
  lotSize: "0.01",
  riskPercent: "1",

  takeProfit: "5",
  stopLoss: "4",
  riskReward: "1.25",

  trailingStop: false,
  trailingStopDistance: "2",

  breakEven: false,
  breakEvenTrigger: "2",

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
};

function numberOrNull(value: string) {
  if (value.trim() === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function botToForm(bot: Bot): FormState {
  return {
    name: bot.name ?? "",
    symbol: bot.symbol ?? "XAUUSD",
    timeframe: bot.timeframe ?? "15m",
    marketType: bot.marketType ?? "FOREX",

    lotMode: bot.lotMode ?? "FIXED",
    lotSize: String(bot.lotSize ?? 0.01),
    riskPercent: String(bot.riskPercent ?? 1),

    takeProfit:
      bot.takeProfit === null || bot.takeProfit === undefined
        ? ""
        : String(bot.takeProfit),

    stopLoss:
      bot.stopLoss === null || bot.stopLoss === undefined
        ? ""
        : String(bot.stopLoss),

    riskReward:
      bot.riskReward === null || bot.riskReward === undefined
        ? ""
        : String(bot.riskReward),

    trailingStop: Boolean(bot.trailingStop),
    trailingStopDistance:
      bot.trailingStopDistance === null ||
      bot.trailingStopDistance === undefined
        ? ""
        : String(bot.trailingStopDistance),

    breakEven: Boolean(bot.breakEven),
    breakEvenTrigger:
      bot.breakEvenTrigger === null || bot.breakEvenTrigger === undefined
        ? ""
        : String(bot.breakEvenTrigger),

    dailyProfitStop:
      bot.dailyProfitStop === null ||
      bot.dailyProfitStop === undefined
        ? ""
        : String(bot.dailyProfitStop),

    dailyLossLimit:
      bot.dailyLossLimit === null || bot.dailyLossLimit === undefined
        ? ""
        : String(bot.dailyLossLimit),

    maxDailyStopLosses: String(bot.maxDailyStopLosses ?? 3),
    maxOpenTrades: String(bot.maxOpenTrades ?? 1),

    buyEnabled: Boolean(bot.buyEnabled),
    sellEnabled: Boolean(bot.sellEnabled),

    maxSpread:
      bot.maxSpread === null || bot.maxSpread === undefined
        ? ""
        : String(bot.maxSpread),

    cooldownMinutes: String(bot.cooldownMinutes ?? 5),

    sessionFilter: Boolean(bot.sessionFilter),
    newsFilter: Boolean(bot.newsFilter),

    signalThreshold: String(bot.signalThreshold ?? 80),
    minConfirmations: String(bot.minConfirmations ?? 5),

    telegramEnabled: Boolean(bot.telegramEnabled),
    isActive: Boolean(bot.isActive),
  };
}

function formToPayload(form: FormState) {
  return {
    name: form.name.trim(),
    type: "TRADING",
    category: "TRADING",

    symbol: form.symbol,
    timeframe: form.timeframe,
    marketType: form.marketType,

    lotMode: form.lotMode,
    lotSize: Number(form.lotSize) || 0.01,
    riskPercent: Number(form.riskPercent) || 1,

    takeProfit: numberOrNull(form.takeProfit),
    stopLoss: numberOrNull(form.stopLoss),
    riskReward: numberOrNull(form.riskReward),

    trailingStop: form.trailingStop,
    trailingStopDistance: numberOrNull(form.trailingStopDistance),

    breakEven: form.breakEven,
    breakEvenTrigger: numberOrNull(form.breakEvenTrigger),

    dailyProfitStop: numberOrNull(form.dailyProfitStop),
    dailyLossLimit: numberOrNull(form.dailyLossLimit),
    maxDailyStopLosses: Number(form.maxDailyStopLosses) || 3,
    maxOpenTrades: Number(form.maxOpenTrades) || 1,

    buyEnabled: form.buyEnabled,
    sellEnabled: form.sellEnabled,

    maxSpread: numberOrNull(form.maxSpread),
    cooldownMinutes: Number(form.cooldownMinutes) || 5,

    sessionFilter: form.sessionFilter,
    newsFilter: form.newsFilter,

    signalThreshold: Number(form.signalThreshold) || 80,
    minConfirmations: Number(form.minConfirmations) || 5,

    telegramEnabled: form.telegramEnabled,
    isActive: form.isActive,
  };
}

/* =========================================================
   SVG Icons
========================================================= */

function Icon({
  name,
  size = 20,
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

  switch (name) {
    case "bot":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="13" rx="3" />
          <path d="M12 3v4" />
          <path d="M8 12h.01" />
          <path d="M16 12h.01" />
          <path d="M8 16h8" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 5-7" />
        </svg>
      );

    case "profit":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M17 7c0-2-2.2-3-5-3s-5 1-5 3 2 3 5 4 5 2 5 4-2.2 3-5 3-5-1-5-3" />
        </svg>
      );

    case "loss":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="m7 8 5-5 5 5" />
          <path d="M7 16h10" />
        </svg>
      );

    case "risk":
      return (
        <svg {...common}>
          <path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-3Z" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.46 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.9A1.7 1.7 0 0 0 8.46 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.73 5.2V4h2.4v1.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03H22v2.4h-1.04A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6v5.5c0 4.4 3 7.8 7.5 9.5 4.5-1.7 7.5-5.1 7.5-9.5V6L12 3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "filter":
      return (
        <svg {...common}>
          <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
        </svg>
      );

    case "telegram":
      return (
        <svg {...common}>
          <path d="m21 4-3 16-6-5-3 3 .5-5.5L21 4Z" />
          <path d="m9.5 12.5 8-5" />
        </svg>
      );

    case "save":
      return (
        <svg {...common}>
          <path d="M5 4h11l3 3v13H5V4Z" />
          <path d="M8 4v6h8V4" />
          <path d="M8 20v-6h8v6" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.8-4L3 10" />
          <path d="M3 5v5h5" />
          <path d="M4 13a8 8 0 0 0 14.8 4L21 14" />
          <path d="M21 19v-5h-5" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

/* =========================================================
   Small UI Components
========================================================= */

function SectionCard({
  icon,
  title,
  description,
  children,
  accent = "cyan",
  defaultOpen = true,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: "cyan" | "green" | "red" | "gold" | "purple";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`section-card accent-${accent}`}>
      <button
        type="button"
        className="section-header"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="section-title-wrap">
          <div className="section-icon">
            <Icon name={icon} size={21} />
          </div>

          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        <div className={`chevron ${open ? "open" : ""}`}>
          <Icon name="chevron" size={18} />
        </div>
      </button>

      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
  min,
  max,
  step,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
  min?: string;
  max?: string;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>

      <div className="input-wrap">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />

        {suffix && <span className="input-suffix">{suffix}</span>}
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
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  color = "cyan",
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  color?: "cyan" | "green" | "red" | "gold";
}) {
  return (
    <button
      type="button"
      className={`toggle-card ${checked ? "checked" : ""} toggle-${color}`}
      onClick={() => onChange(!checked)}
    >
      <div className="toggle-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <span className="toggle-switch">
        <span />
      </span>
    </button>
  );
}

function Metric({
  icon,
  title,
  value,
  color,
}: {
  icon: string;
  title: string;
  value: string;
  color: "green" | "red" | "cyan" | "gold";
}) {
  return (
    <div className={`metric metric-${color}`}>
      <div className="metric-icon">
        <Icon name={icon} size={20} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================================================
   Main Page
========================================================= */

export default function BotBuilderPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedId) ?? null,
    [bots, selectedId]
  );

  const updateForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  /* -------------------------------------------------------
     Load bots
  ------------------------------------------------------- */

  async function loadBots(selectFirst = true) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bots", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "خطا در دریافت ربات‌ها");
      }

      const loadedBots: Bot[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.bots)
          ? data.bots
          : [];

      setBots(loadedBots);

      if (loadedBots.length > 0 && selectFirst) {
        const firstBot = loadedBots[0];

        setSelectedId(firstBot.id);
        setForm(botToForm(firstBot));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ارتباط با سرور"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots(true);
  }, []);

  /* -------------------------------------------------------
     Select bot
  ------------------------------------------------------- */

  function selectBot(bot: Bot) {
    setSelectedId(bot.id);
    setForm(botToForm(bot));
    setMessage("");
    setError("");
  }

  /* -------------------------------------------------------
     New bot
  ------------------------------------------------------- */

  function startNewBot() {
    setSelectedId(null);

    setForm({
      ...emptyForm,
      name: `Trading AI Bot ${bots.length + 1}`,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* -------------------------------------------------------
     Create
  ------------------------------------------------------- */

  async function createBot() {
    if (!form.name.trim()) {
      setError("لطفاً نام ربات را وارد کنید.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formToPayload(form)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "ساخت ربات انجام نشد.");
      }

      const createdBot: Bot = data?.bot ?? data;

      if (!createdBot?.id) {
        await loadBots(true);
      } else {
        setBots((current) => [createdBot, ...current]);
        setSelectedId(createdBot.id);
        setForm(botToForm(createdBot));
      }

      setMessage("ربات با موفقیت ساخته شد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا هنگام ساخت ربات"
      );
    } finally {
      setCreating(false);
    }
  }

  /* -------------------------------------------------------
     Save
  ------------------------------------------------------- */

  async function saveBot() {
    if (!selectedId) {
      await createBot();
      return;
    }

    if (!form.name.trim()) {
      setError("لطفاً نام ربات را وارد کنید.");
      return;
    }

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
          ...formToPayload(form),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "ذخیره تنظیمات انجام نشد.");
      }

      const updatedBot: Bot = data?.bot ?? data;

      if (updatedBot?.id) {
        setBots((current) =>
          current.map((bot) =>
            bot.id === updatedBot.id
              ? updatedBot
              : bot
          )
        );

        setForm(botToForm(updatedBot));
      } else {
        await loadBots(false);
      }

      setMessage("تمام تنظیمات با موفقیت ذخیره شد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا هنگام ذخیره تنظیمات"
      );
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------
     Quick active toggle
  ------------------------------------------------------- */

  async function toggleBotActive() {
    if (!selectedId) {
      setForm((current) => ({
        ...current,
        isActive: !current.isActive,
      }));

      return;
    }

    const nextValue = !form.isActive;

    setForm((current) => ({
      ...current,
      isActive: nextValue,
    }));

    try {
      setError("");

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تغییر وضعیت ربات انجام نشد.");
      }

      const updatedBot: Bot = data?.bot ?? data;

      if (updatedBot?.id) {
        setBots((current) =>
          current.map((bot) =>
            bot.id === updatedBot.id
              ? updatedBot
              : bot
          )
        );

        setForm(botToForm(updatedBot));
      }

      setMessage(
        nextValue
          ? "ربات فعال شد."
          : "ربات متوقف شد."
      );
    } catch (err) {
      setForm((current) => ({
        ...current,
        isActive: !nextValue,
      }));

      setError(
        err instanceof Error
          ? err.message
          : "خطا در تغییر وضعیت ربات"
      );
    }
  }

  /* -------------------------------------------------------
     Derived values
  ------------------------------------------------------- */

  const rrCalculated =
    Number(form.stopLoss) > 0 &&
    Number(form.takeProfit) > 0
      ? (Number(form.takeProfit) / Number(form.stopLoss)).toFixed(2)
      : "—";

  const dailyRisk =
    Number(form.dailyLossLimit) > 0
      ? Number(form.dailyLossLimit).toFixed(2)
      : "—";

  const activeBots = bots.filter((bot) => bot.isActive).length;

  /* =======================================================
     Render
  ======================================================= */

  return (
    <main className="bot-page" dir="rtl">
      <div className="page-shell">

        {/* =================================================
            TOP HEADER
        ================================================= */}

        <header className="hero">

          <div className="hero-brand">
            <div className="hero-logo">
              <Icon name="bot" size={30} />
            </div>

            <div>
              <div className="eyebrow">
                TRADING AI • BOT MANAGEMENT
              </div>

              <h1>ساخت و مدیریت ربات معاملاتی</h1>

              <p>
                تنظیمات ربات را حرفه‌ای، دقیق و مستقیم روی
                حساب کاربری خود مدیریت کنید.
              </p>
            </div>
          </div>

          <div className="hero-actions">

            <button
              type="button"
              className="ghost-button"
              onClick={() => loadBots(false)}
              disabled={loading}
            >
              <Icon name="refresh" size={18} />
              بروزرسانی
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={startNewBot}
            >
              <Icon name="plus" size={19} />
              ربات جدید
            </button>

          </div>
        </header>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">
              <Icon name="risk" size={21} />
            </span>

            <div>
              <strong>خطا</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            <span className="alert-icon">
              <Icon name="shield" size={21} />
            </span>

            <div>
              <strong>انجام شد</strong>
              <p>{message}</p>
            </div>

            <button
              type="button"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            BOT OVERVIEW
        ================================================= */}

        <div className="overview-grid">

          <Metric
            icon="bot"
            title="تعداد ربات‌ها"
            value={String(bots.length)}
            color="cyan"
          />

          <Metric
            icon="chart"
            title="ربات‌های فعال"
            value={String(activeBots)}
            color="green"
          />

          <Metric
            icon="profit"
            title="حد سود فعلی"
            value={`$${form.takeProfit || "0"}`}
            color="green"
          />

          <Metric
            icon="loss"
            title="حد ضرر فعلی"
            value={`$${form.stopLoss || "0"}`}
            color="red"
          />
        </div>

        {/* =================================================
            BOT SELECTOR
        ================================================= */}

        <section className="bot-selector-card">

          <div className="selector-heading">
            <div>
              <span className="small-label">
                ربات‌های حساب شما
              </span>

              <h2>
                {selectedBot
                  ? selectedBot.name
                  : "ایجاد یک ربات جدید"}
              </h2>
            </div>

            <button
              type="button"
              className="new-bot-button"
              onClick={startNewBot}
            >
              <Icon name="plus" size={17} />
              ربات جدید
            </button>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="spinner" />
              <span>در حال دریافت ربات‌ها...</span>
            </div>
          ) : bots.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">
                <Icon name="bot" size={30} />
              </div>

              <strong>
                هنوز رباتی ساخته نشده است
              </strong>

              <span>
                از دکمه «ربات جدید» برای ساخت اولین ربات
                استفاده کنید.
              </span>
            </div>
          ) : (
            <div className="bot-list">
              {bots.map((bot) => (
                <button
                  type="button"
                  key={bot.id}
                  className={`bot-chip ${
                    selectedId === bot.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => selectBot(bot)}
                >
                  <span className="bot-chip-icon">
                    <Icon name="bot" size={18} />
                  </span>

                  <span className="bot-chip-content">
                    <strong>{bot.name}</strong>

                    <small>
                      {bot.symbol} • {bot.timeframe}
                    </small>
                  </span>

                  <span
                    className={`status-dot ${
                      bot.isActive ? "active" : ""
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* =================================================
            ACTIVE STATUS
        ================================================= */}

        <section
          className={`status-panel ${
            form.isActive ? "status-active" : "status-off"
          }`}
        >
          <div className="status-main">

            <div className="status-icon">
              <Icon
                name={form.isActive ? "chart" : "bot"}
                size={25}
              />
            </div>

            <div>
              <span>وضعیت اجرای ربات</span>

              <strong>
                {form.isActive
                  ? "ربات فعال است"
                  : "ربات متوقف است"}
              </strong>

              <small>
                {form.isActive
                  ? "ربات اجازه اجرای قوانین معاملاتی تنظیم‌شده را دارد."
                  : "ربات فعلاً هیچ اجرای فعالی ندارد."}
              </small>
            </div>

          </div>

          <button
            type="button"
            className={`big-toggle ${
              form.isActive ? "on" : ""
            }`}
            onClick={toggleBotActive}
          >
            <span />
            {form.isActive ? "فعال" : "غیرفعال"}
          </button>
        </section>

        {/* =================================================
            FORM
        ================================================= */}

        <div className="settings-layout">

          <div className="settings-main">

            {/* BOT INFO */}

            <SectionCard
              icon="bot"
              title="اطلاعات اصلی ربات"
              description="نام، بازار و تایم‌فریم ربات را مشخص کنید."
              accent="cyan"
            >
              <div className="form-grid three">

                <Field
                  label="نام ربات"
                  value={form.name}
                  onChange={(value) =>
                    updateForm("name", value)
                  }
                  placeholder="مثلاً Gold AI Pro"
                />

                <SelectField
                  label="نماد معاملاتی"
                  value={form.symbol}
                  onChange={(value) =>
                    updateForm("symbol", value)
                  }
                  options={[
                    {
                      value: "XAUUSD",
                      label: "XAUUSD • طلا",
                    },
                    {
                      value: "EURUSD",
                      label: "EURUSD",
                    },
                    {
                      value: "GBPUSD",
                      label: "GBPUSD",
                    },
                    {
                      value: "USDJPY",
                      label: "USDJPY",
                    },
                    {
                      value: "BTCUSDT",
                      label: "BTCUSDT • بیت‌کوین",
                    },
                    {
                      value: "ETHUSDT",
                      label: "ETHUSDT • اتریوم",
                    },
                  ]}
                />

                <SelectField
                  label="تایم‌فریم"
                  value={form.timeframe}
                  onChange={(value) =>
                    updateForm("timeframe", value)
                  }
                  options={[
                    { value: "1m", label: "1 دقیقه" },
                    { value: "5m", label: "5 دقیقه" },
                    { value: "15m", label: "15 دقیقه" },
                    { value: "30m", label: "30 دقیقه" },
                    { value: "1h", label: "1 ساعت" },
                    { value: "4h", label: "4 ساعت" },
                    { value: "1d", label: "روزانه" },
                  ]}
                />

              </div>

              <div className="form-grid two">

                <SelectField
                  label="نوع بازار"
                  value={form.marketType}
                  onChange={(value) =>
                    updateForm("marketType", value)
                  }
                  options={[
                    {
                      value: "FOREX",
                      label: "Forex",
                    },
                    {
                      value: "CRYPTO",
                      label: "Crypto",
                    },
                    {
                      value: "METALS",
                      label: "Metals",
                    },
                    {
                      value: "INDEX",
                      label: "Indices",
                    },
                  ]}
                />

                <div className="info-box">
                  <span>بازار انتخاب‌شده</span>
                  <strong>
                    {form.symbol}
                  </strong>
                  <small>
                    {form.marketType} • {form.timeframe}
                  </small>
                </div>

              </div>
            </SectionCard>

            {/* VOLUME / RISK */}

            <SectionCard
              icon="risk"
              title="حجم معامله و مدیریت ریسک"
              description="مشخص کنید ربات با حجم ثابت کار کند یا درصد ریسک."
              accent="gold"
            >
              <div className="mode-selector">

                <button
                  type="button"
                  className={
                    form.lotMode === "FIXED"
                      ? "mode active"
                      : "mode"
                  }
                  onClick={() =>
                    updateForm("lotMode", "FIXED")
                  }
                >
                  <strong>حجم ثابت</strong>
                  <span>
                    Lot ثابت برای هر معامله
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    form.lotMode === "RISK_PERCENT"
                      ? "mode active"
                      : "mode"
                  }
                  onClick={() =>
                    updateForm(
                      "lotMode",
                      "RISK_PERCENT"
                    )
                  }
                >
                  <strong>درصد ریسک</strong>
                  <span>
                    محاسبه حجم بر اساس ریسک
                  </span>
                </button>

              </div>

              <div className="form-grid two">

                <Field
                  label="Lot Size"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.lotSize}
                  onChange={(value) =>
                    updateForm("lotSize", value)
                  }
                  suffix="LOT"
                  disabled={
                    form.lotMode !== "FIXED"
                  }
                />

                <Field
                  label="درصد ریسک"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.riskPercent}
                  onChange={(value) =>
                    updateForm(
                      "riskPercent",
                      value
                    )
                  }
                  suffix="%"
                  disabled={
                    form.lotMode !== "RISK_PERCENT"
                  }
                />

              </div>

              <div className="warning-box">
                <Icon name="shield" size={19} />

                <div>
                  <strong>
                    کنترل ریسک فعال است
                  </strong>

                  <span>
                    حد ضرر روزانه و تعداد Stop Loss
                    در بخش محدودیت‌های روزانه قابل تنظیم است.
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* TP SL */}

            <SectionCard
              icon="profit"
              title="حد سود و حد ضرر"
              description="مقادیر واقعی مدیریت معامله را تعیین کنید."
              accent="green"
            >
              <div className="form-grid three">

                <div className="money-field profit-field">
                  <label>حد سود</label>

                  <div>
                    <span>$</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.takeProfit}
                      onChange={(event) =>
                        updateForm(
                          "takeProfit",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <small>
                    Take Profit
                  </small>
                </div>

                <div className="money-field loss-field">
                  <label>حد ضرر</label>

                  <div>
                    <span>$</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.stopLoss}
                      onChange={(event) =>
                        updateForm(
                          "stopLoss",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <small>
                    Stop Loss
                  </small>
                </div>

                <Field
                  label="Risk / Reward"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.riskReward}
                  onChange={(value) =>
                    updateForm(
                      "riskReward",
                      value
                    )
                  }
                  suffix="R:R"
                />

              </div>

              <div className="rr-preview">

                <div>
                  <span>نسبت محاسبه‌شده</span>
                  <strong>
                    1 : {rrCalculated}
                  </strong>
                </div>

                <div>
                  <span>سود هر معامله</span>
                  <strong className="green-text">
                    +${form.takeProfit || "0"}
                  </strong>
                </div>

                <div>
                  <span>ضرر هر معامله</span>
                  <strong className="red-text">
                    -${form.stopLoss || "0"}
                  </strong>
                </div>

              </div>
            </SectionCard>

            {/* TRAILING / BREAK EVEN */}

            <SectionCard
              icon="chart"
              title="مدیریت هوشمند معامله"
              description="Trailing Stop و Break Even را کنترل کنید."
              accent="purple"
            >
              <div className="toggle-grid">

                <Toggle
                  label="Trailing Stop"
                  description="حد ضرر را همراه قیمت حرکت می‌دهد."
                  checked={form.trailingStop}
                  onChange={(value) =>
                    updateForm(
                      "trailingStop",
                      value
                    )
                  }
                  color="cyan"
                />

                <Toggle
                  label="Break Even"
                  description="بعد از رسیدن به سود مشخص، معامله را به نقطه سر‌به‌سر منتقل می‌کند."
                  checked={form.breakEven}
                  onChange={(value) =>
                    updateForm(
                      "breakEven",
                      value
                    )
                  }
                  color="green"
                />

              </div>

              <div className="form-grid two">

                <Field
                  label="Trailing Distance"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.trailingStopDistance}
                  onChange={(value) =>
                    updateForm(
                      "trailingStopDistance",
                      value
                    )
                  }
                  suffix="$"
                  disabled={!form.trailingStop}
                />

                <Field
                  label="Break Even Trigger"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.breakEvenTrigger}
                  onChange={(value) =>
                    updateForm(
                      "breakEvenTrigger",
                      value
                    )
                  }
                  suffix="$"
                  disabled={!form.breakEven}
                />

              </div>
            </SectionCard>

            {/* DAILY LIMITS */}

            <SectionCard
              icon="shield"
              title="محدودیت‌های روزانه"
              description="برای جلوگیری از معامله بیش از حد، سقف سود و ضرر تعیین کنید."
              accent="red"
            >
              <div className="form-grid four">

                <Field
                  label="توقف بعد از سود"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.dailyProfitStop}
                  onChange={(value) =>
                    updateForm(
                      "dailyProfitStop",
                      value
                    )
                  }
                  suffix="$"
                />

                <Field
                  label="حد ضرر روزانه"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.dailyLossLimit}
                  onChange={(value) =>
                    updateForm(
                      "dailyLossLimit",
                      value
                    )
                  }
                  suffix="$"
                />

                <Field
                  label="حداکثر Stop Loss"
                  type="number"
                  step="1"
                  min="1"
                  value={form.maxDailyStopLosses}
                  onChange={(value) =>
                    updateForm(
                      "maxDailyStopLosses",
                      value
                    )
                  }
                  suffix="بار"
                />

                <Field
                  label="حداکثر معاملات باز"
                  type="number"
                  step="1"
                  min="1"
                  value={form.maxOpenTrades}
                  onChange={(value) =>
                    updateForm(
                      "maxOpenTrades",
                      value
                    )
                  }
                  suffix="معامله"
                />

              </div>

              <div className="risk-summary">

                <div className="risk-summary-item">
                  <span>حد توقف سود روزانه</span>
                  <strong className="green-text">
                    +${form.dailyProfitStop || "0"}
                  </strong>
                </div>

                <div className="risk-summary-item">
                  <span>حد توقف ضرر روزانه</span>
                  <strong className="red-text">
                    -${dailyRisk}
                  </strong>
                </div>

                <div className="risk-summary-item">
                  <span>تعداد استاپ مجاز</span>
                  <strong>
                    {form.maxDailyStopLosses} بار
                  </strong>
                </div>

              </div>
            </SectionCard>

            {/* BUY SELL */}

            <SectionCard
              icon="chart"
              title="جهت معاملات"
              description="مشخص کنید ربات اجازه خرید یا فروش داشته باشد."
              accent="cyan"
            >
              <div className="toggle-grid">

                <Toggle
                  label="معاملات BUY"
                  description="اجازه ایجاد معاملات خرید"
                  checked={form.buyEnabled}
                  onChange={(value) =>
                    updateForm(
                      "buyEnabled",
                      value
                    )
                  }
                  color="green"
                />

                <Toggle
                  label="معاملات SELL"
                  description="اجازه ایجاد معاملات فروش"
                  checked={form.sellEnabled}
                  onChange={(value) =>
                    updateForm(
                      "sellEnabled",
                      value
                    )
                  }
                  color="red"
                />

              </div>

              {!form.buyEnabled &&
                !form.sellEnabled && (
                  <div className="danger-box">
                    هیچ جهت معاملاتی فعال نیست؛ ربات
                    قادر به ایجاد معامله نخواهد بود.
                  </div>
                )}
            </SectionCard>

            {/* FILTERS */}

            <SectionCard
              icon="filter"
              title="فیلترهای ورود"
              description="شرایط محیطی را قبل از اجازه معامله بررسی کنید."
              accent="gold"
            >
              <div className="toggle-grid">

                <Toggle
                  label="Session Filter"
                  description="فقط در سشن‌های مجاز فعالیت کند."
                  checked={form.sessionFilter}
                  onChange={(value) =>
                    updateForm(
                      "sessionFilter",
                      value
                    )
                  }
                  color="cyan"
                />

                <Toggle
                  label="News Filter"
                  description="در زمان خبرهای مهم از معامله جلوگیری کند."
                  checked={form.newsFilter}
                  onChange={(value) =>
                    updateForm(
                      "newsFilter",
                      value
                    )
                  }
                  color="gold"
                />

              </div>

              <div className="form-grid two">

                <Field
                  label="حداکثر Spread"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.maxSpread}
                  onChange={(value) =>
                    updateForm(
                      "maxSpread",
                      value
                    )
                  }
                  suffix="Point"
                />

                <Field
                  label="Cooldown بین معاملات"
                  type="number"
                  step="1"
                  min="0"
                  value={form.cooldownMinutes}
                  onChange={(value) =>
                    updateForm(
                      "cooldownMinutes",
                      value
                    )
                  }
                  suffix="دقیقه"
                />

              </div>
            </SectionCard>

            {/* SIGNAL ENGINE */}

            <SectionCard
              icon="settings"
              title="موتور سیگنال و تأیید"
              description="حداقل امتیاز و تعداد تأییدهای مورد نیاز را تعیین کنید."
              accent="purple"
            >
              <div className="score-card">

                <div className="score-number">
                  <strong>
                    {form.signalThreshold}
                  </strong>

                  <span>/ 100</span>
                </div>

                <div className="score-bar">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            form.signalThreshold
                          ) || 0
                        )
                      )}%`,
                    }}
                  />
                </div>

                <span>
                  حداقل امتیاز سیگنال
                </span>

              </div>

              <div className="form-grid two">

                <Field
                  label="Signal Threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.signalThreshold}
                  onChange={(value) =>
                    updateForm(
                      "signalThreshold",
                      value
                    )
                  }
                  suffix="/100"
                />

                <Field
                  label="حداقل تأییدها"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={form.minConfirmations}
                  onChange={(value) =>
                    updateForm(
                      "minConfirmations",
                      value
                    )
                  }
                  suffix="تأیید"
                />

              </div>
            </SectionCard>

            {/* TELEGRAM */}

            <SectionCard
              icon="telegram"
              title="اعلان‌های Telegram"
              description="ارسال اعلان‌های ربات به سیستم Telegram."
              accent="cyan"
            >
              <Toggle
                label="فعال‌سازی Telegram"
                description="ارسال رویدادهای ربات به کانال Telegram."
                checked={form.telegramEnabled}
                onChange={(value) =>
                  updateForm(
                    "telegramEnabled",
                    value
                  )
                }
                color="cyan"
              />

              <div className="telegram-note">
                <Icon name="telegram" size={20} />

                <span>
                  توکن Bot و Channel ID نباید داخل این صفحه
                  ذخیره شوند؛ این اطلاعات باید در Environment
                  Variables سرور قرار بگیرند.
                </span>
              </div>
            </SectionCard>

          </div>

          {/* =================================================
              SIDE SUMMARY
          ================================================= */}

          <aside className="settings-side">

            <div className="sticky-panel">

              <div className="side-title">
                <div className="side-title-icon">
                  <Icon name="settings" size={21} />
                </div>

                <div>
                  <span>خلاصه تنظیمات</span>
                  <strong>
                    {form.name || "ربات جدید"}
                  </strong>
                </div>
              </div>

              <div className="side-status">
                <span
                  className={
                    form.isActive
                      ? "live-dot"
                      : "offline-dot"
                  }
                />

                {form.isActive
                  ? "فعال"
                  : "غیرفعال"}
              </div>

              <div className="summary-list">

                <div>
                  <span>نماد</span>
                  <strong>{form.symbol}</strong>
                </div>

                <div>
                  <span>تایم‌فریم</span>
                  <strong>{form.timeframe}</strong>
                </div>

                <div>
                  <span>نوع حجم</span>
                  <strong>
                    {form.lotMode === "FIXED"
                      ? "Fixed Lot"
                      : "Risk %"}
                  </strong>
                </div>

                <div>
                  <span>حد سود</span>
                  <strong className="green-text">
                    +${form.takeProfit || "0"}
                  </strong>
                </div>

                <div>
                  <span>حد ضرر</span>
                  <strong className="red-text">
                    -${form.stopLoss || "0"}
                  </strong>
                </div>

                <div>
                  <span>R/R</span>
                  <strong>
                    {rrCalculated}
                  </strong>
                </div>

                <div>
                  <span>استاپ روزانه</span>
                  <strong>
                    {form.maxDailyStopLosses}
                  </strong>
                </div>

                <div>
                  <span>معاملات باز</span>
                  <strong>
                    {form.maxOpenTrades}
                  </strong>
                </div>

              </div>

              <div className="side-divider" />

              <div className="permission-box">

                <span>اجازه معاملات</span>

                <div className="permission-row">

                  <span
                    className={
                      form.buyEnabled
                        ? "permission buy"
                        : "permission disabled"
                    }
                  >
                    BUY
                  </span>

                  <span
                    className={
                      form.sellEnabled
                        ? "permission sell"
                        : "permission disabled"
                    }
                  >
                    SELL
                  </span>

                </div>
              </div>

              <div className="side-actions">

                <button
                  type="button"
                  className="save-button"
                  onClick={saveBot}
                  disabled={
                    saving || creating
                  }
                >
                  <Icon name="save" size={20} />

                  {saving
                    ? "در حال ذخیره..."
                    : selectedId
                      ? "ذخیره تنظیمات"
                      : "ساخت و ذخیره ربات"}
                </button>

                {!selectedId && (
                  <button
                    type="button"
                    className="create-secondary"
                    onClick={createBot}
                    disabled={
                      saving || creating
                    }
                  >
                    <Icon name="plus" size={18} />

                    {creating
                      ? "در حال ساخت..."
                      : "ساخت ربات"}
                  </button>
                )}

              </div>

              <div className="security-note">
                <Icon name="shield" size={17} />

                <span>
                  تنظیمات با حساب کاربری شما ذخیره می‌شود.
                </span>
              </div>

            </div>
          </aside>
        </div>

        {/* =================================================
            FOOTER NOTE
        ================================================= */}

        <div className="bottom-note">
          <Icon name="shield" size={18} />

          <span>
            تغییر تنظیمات تا زمانی که ذخیره نشود روی ربات
            اعمال نمی‌شود. برای فعال‌کردن اجرای ربات،
            ابتدا تنظیمات را ذخیره کنید و سپس وضعیت را فعال کنید.
          </span>
        </div>

      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .bot-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(14, 165, 233, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 10% 35%,
              rgba(16, 185, 129, 0.07),
              transparent 24%
            ),
            #070b14;
          color: #e8eef8;
          padding: 28px 16px 60px;
          font-family:
            Arial,
            Tahoma,
            "Segoe UI",
            sans-serif;
        }

        .page-shell {
          width: min(1380px, 100%);
          margin: 0 auto;
        }

        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 26px;
          border: 1px solid rgba(148, 163, 184, 0.13);
          background:
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.98),
              rgba(10, 18, 31, 0.94)
            );
          border-radius: 26px;
          box-shadow:
            0 20px 70px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .hero-brand {
          display: flex;
          align-items: center;
          gap: 17px;
          min-width: 0;
        }

        .hero-logo {
          width: 62px;
          height: 62px;
          flex: 0 0 62px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #67e8f9;
          background:
            linear-gradient(
              145deg,
              rgba(8, 145, 178, 0.3),
              rgba(15, 23, 42, 0.9)
            );
          border: 1px solid rgba(103, 232, 249, 0.22);
          box-shadow:
            0 0 35px rgba(34, 211, 238, 0.09);
        }

        .eyebrow {
          color: #67e8f9;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-bottom: 7px;
          direction: ltr;
          text-align: right;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(22px, 3vw, 32px);
          line-height: 1.3;
          color: #f8fafc;
        }

        .hero p {
          margin: 8px 0 0;
          color: #8fa0b8;
          font-size: 14px;
          line-height: 1.8;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        button {
          font-family: inherit;
        }

        .primary-button,
        .ghost-button,
        .new-bot-button,
        .save-button,
        .create-secondary {
          border: 0;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            opacity 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .primary-button:hover,
        .ghost-button:hover,
        .new-bot-button:hover,
        .save-button:hover,
        .create-secondary:hover {
          transform: translateY(-1px);
        }

        .primary-button {
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border-radius: 13px;
          color: #04131a;
          background: linear-gradient(
            135deg,
            #67e8f9,
            #22d3ee
          );
          font-weight: 800;
        }

        .ghost-button {
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 15px;
          border-radius: 13px;
          color: #cbd5e1;
          background: #111a2a;
          border: 1px solid #263449;
        }

        .ghost-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 15px;
          border: 1px solid;
        }

        .alert-error {
          background: rgba(127, 29, 29, 0.2);
          border-color: rgba(248, 113, 113, 0.25);
          color: #fecaca;
        }

        .alert-success {
          background: rgba(6, 78, 59, 0.22);
          border-color: rgba(52, 211, 153, 0.25);
          color: #bbf7d0;
        }

        .alert-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
        }

        .alert div {
          min-width: 0;
          flex: 1;
        }

        .alert strong {
          display: block;
          margin-bottom: 2px;
        }

        .alert p {
          margin: 0;
          color: inherit;
          opacity: 0.85;
          font-size: 13px;
        }

        .alert button {
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 22px;
          cursor: pointer;
        }

        .overview-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .metric {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 18px;
          background: #0d1523;
          border: 1px solid #1c293c;
        }

        .metric-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.035);
        }

        .metric span {
          display: block;
          color: #7f91aa;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .metric strong {
          display: block;
          font-size: 18px;
          color: #f8fafc;
        }

        .metric-cyan .metric-icon {
          color: #67e8f9;
        }

        .metric-green .metric-icon {
          color: #34d399;
        }

        .metric-red .metric-icon {
          color: #fb7185;
        }

        .metric-gold .metric-icon {
          color: #fbbf24;
        }

        .bot-selector-card {
          margin-top: 16px;
          padding: 20px;
          border-radius: 21px;
          background: #0c1421;
          border: 1px solid #1c293c;
        }

        .selector-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .small-label {
          display: block;
          color: #71829a;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .selector-heading h2 {
          margin: 0;
          font-size: 19px;
          color: #f8fafc;
        }

        .new-bot-button {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 11px;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
          border: 1px solid rgba(34, 211, 238, 0.2);
          font-weight: 700;
        }

        .bot-list {
          display: grid;
          grid-template-columns:
            repeat(auto-fill, minmax(220px, 1fr));
          gap: 9px;
        }

        .bot-chip {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: right;
          padding: 11px;
          border-radius: 14px;
          color: #cbd5e1;
          background: #101a2a;
          border: 1px solid #1f2e43;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .bot-chip:hover {
          transform: translateY(-1px);
          border-color: #344a65;
        }

        .bot-chip.selected {
          background: rgba(8, 145, 178, 0.09);
          border-color: rgba(34, 211, 238, 0.48);
        }

        .bot-chip-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
        }

        .bot-chip-content {
          min-width: 0;
          flex: 1;
        }

        .bot-chip-content strong,
        .bot-chip-content small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bot-chip-content strong {
          font-size: 13px;
          color: #e8eef8;
          margin-bottom: 3px;
        }

        .bot-chip-content small {
          font-size: 10px;
          color: #71829a;
          direction: ltr;
          text-align: right;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 999px;
          background: #475569;
        }

        .status-dot.active {
          background: #34d399;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
        }

        .loading-box,
        .empty-box {
          min-height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          border-radius: 15px;
          background: #0a111d;
          border: 1px dashed #25364c;
          color: #8494aa;
        }

        .empty-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.07);
        }

        .empty-box strong {
          color: #cbd5e1;
          font-size: 14px;
        }

        .empty-box span {
          font-size: 11px;
        }

        .spinner {
          width: 23px;
          height: 23px;
          border: 2px solid #26364a;
          border-top-color: #67e8f9;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .status-panel {
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 20px;
          border-radius: 20px;
          border: 1px solid;
        }

        .status-active {
          background: rgba(6, 78, 59, 0.13);
          border-color: rgba(52, 211, 153, 0.25);
        }

        .status-off {
          background: rgba(30, 41, 59, 0.42);
          border-color: #253449;
        }

        .status-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .status-icon {
          width: 47px;
          height: 47px;
          flex: 0 0 47px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          color: #67e8f9;
        }

        .status-active .status-icon {
          color: #34d399;
        }

        .status-main span,
        .status-main strong,
        .status-main small {
          display: block;
        }

        .status-main span {
          color: #75869e;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .status-main strong {
          font-size: 16px;
          color: #f8fafc;
        }

        .status-main small {
          color: #7f91aa;
          font-size: 11px;
          margin-top: 4px;
        }

        .big-toggle {
          min-width: 108px;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid #334155;
          border-radius: 12px;
          background: #111b2b;
          color: #94a3b8;
          cursor: pointer;
          font-weight: 800;
        }

        .big-toggle span {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #64748b;
        }

        .big-toggle.on {
          color: #86efac;
          border-color: rgba(52, 211, 153, 0.35);
          background: rgba(6, 78, 59, 0.2);
        }

        .big-toggle.on span {
          background: #34d399;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
        }

        .settings-layout {
          margin-top: 16px;
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            320px;
          gap: 16px;
          align-items: start;
        }

        .settings-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .settings-side {
          min-width: 0;
        }

        .sticky-panel {
          position: sticky;
          top: 18px;
          padding: 19px;
          border-radius: 21px;
          background:
            linear-gradient(
              180deg,
              #0d1727,
              #0a111d
            );
          border: 1px solid #203047;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.22);
        }

        .side-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .side-title-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
        }

        .side-title span,
        .side-title strong {
          display: block;
        }

        .side-title span {
          color: #71829a;
          font-size: 10px;
        }

        .side-title strong {
          margin-top: 2px;
          color: #f8fafc;
          font-size: 14px;
        }

        .side-status {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          color: #cbd5e1;
          background: #111b2a;
          font-size: 11px;
        }

        .live-dot,
        .offline-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .live-dot {
          background: #34d399;
          box-shadow: 0 0 9px rgba(52, 211, 153, 0.7);
        }

        .offline-dot {
          background: #64748b;
        }

        .summary-list {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow: hidden;
          border: 1px solid #1c2a3d;
          border-radius: 14px;
        }

        .summary-list div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 11px;
          background: #0d1625;
        }

        .summary-list div:nth-child(even) {
          background: #0b1320;
        }

        .summary-list span {
          color: #71829a;
          font-size: 10px;
        }

        .summary-list strong {
          color: #dbe5f1;
          font-size: 11px;
          direction: ltr;
        }

        .green-text {
          color: #34d399 !important;
        }

        .red-text {
          color: #fb7185 !important;
        }

        .side-divider {
          height: 1px;
          background: #1e2b3d;
          margin: 17px 0;
        }

        .permission-box > span {
          color: #71829a;
          font-size: 10px;
        }

        .permission-row {
          display: flex;
          gap: 7px;
          margin-top: 8px;
        }

        .permission {
          flex: 1;
          text-align: center;
          padding: 8px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 800;
        }

        .permission.buy {
          color: #6ee7b7;
          background: rgba(16, 185, 129, 0.09);
          border: 1px solid rgba(52, 211, 153, 0.15);
        }

        .permission.sell {
          color: #fda4af;
          background: rgba(244, 63, 94, 0.09);
          border: 1px solid rgba(251, 113, 133, 0.15);
        }

        .permission.disabled {
          color: #64748b;
          background: #111a29;
          border: 1px solid #1c2a3c;
        }

        .side-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 17px;
        }

        .save-button {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 13px;
          color: #04131a;
          background:
            linear-gradient(
              135deg,
              #67e8f9,
              #22d3ee
            );
          font-weight: 900;
        }

        .save-button:disabled,
        .create-secondary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .create-secondary {
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 12px;
          color: #cbd5e1;
          background: #111b2b;
          border: 1px solid #26364b;
          font-weight: 700;
        }

        .security-note {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid #1b293b;
          color: #60728a;
          font-size: 9px;
          line-height: 1.7;
        }

        .section-card {
          overflow: hidden;
          border-radius: 21px;
          background: #0c1421;
          border: 1px solid #1c293c;
          box-shadow:
            0 12px 45px rgba(0, 0, 0, 0.12);
        }

        .section-card::before {
          content: "";
          display: block;
          height: 2px;
          background: #22d3ee;
          opacity: 0.7;
        }

        .accent-green::before {
          background: #34d399;
        }

        .accent-red::before {
          background: #fb7185;
        }

        .accent-gold::before {
          background: #fbbf24;
        }

        .accent-purple::before {
          background: #a78bfa;
        }

        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 19px;
          text-align: right;
          color: inherit;
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .section-title-wrap {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .section-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.07);
        }

        .accent-green .section-icon {
          color: #34d399;
          background: rgba(52, 211, 153, 0.07);
        }

        .accent-red .section-icon {
          color: #fb7185;
          background: rgba(251, 113, 133, 0.07);
        }

        .accent-gold .section-icon {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.07);
        }

        .accent-purple .section-icon {
          color: #a78bfa;
          background: rgba(167, 139, 250, 0.07);
        }

        .section-header h2 {
          margin: 0;
          color: #edf3fb;
          font-size: 15px;
        }

        .section-header p {
          margin: 4px 0 0;
          color: #6f8098;
          font-size: 10px;
          line-height: 1.7;
        }

        .chevron {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: grid;
          place-items: center;
          color: #64748b;
          border-radius: 9px;
          background: #111b2a;
          transition: transform 0.2s ease;
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .section-body {
          padding: 0 19px 20px;
        }

        .form-grid {
          display: grid;
          gap: 12px;
        }

        .form-grid + .form-grid {
          margin-top: 12px;
        }

        .form-grid.two {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .form-grid.three {
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
        }

        .form-grid.four {
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
        }

        .field {
          min-width: 0;
          display: block;
        }

        .field-label {
          display: block;
          margin-bottom: 7px;
          color: #91a2b9;
          font-size: 10px;
          font-weight: 700;
        }

        .input-wrap {
          position: relative;
        }

        .field input,
        .field select,
        .money-field input {
          width: 100%;
          min-height: 45px;
          border-radius: 11px;
          border: 1px solid #223149;
          background: #09111e;
          color: #e8eef8;
          outline: none;
          padding: 0 12px;
          font-size: 12px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .field input:focus,
        .field select:focus,
        .money-field input:focus {
          border-color: rgba(34, 211, 238, 0.55);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.07);
        }

        .field input:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }

        .field select {
          cursor: pointer;
          appearance: auto;
        }

        .input-suffix {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: #53657d;
          font-size: 9px;
          direction: ltr;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .mode {
          min-height: 73px;
          padding: 12px;
          border-radius: 13px;
          text-align: right;
          cursor: pointer;
          background: #0a121f;
          border: 1px solid #213148;
          color: #b9c7d8;
        }

        .mode.active {
          border-color: rgba(34, 211, 238, 0.5);
          background: rgba(34, 211, 238, 0.06);
          color: #67e8f9;
        }

        .mode strong,
        .mode span {
          display: block;
        }

        .mode strong {
          font-size: 12px;
        }

        .mode span {
          margin-top: 5px;
          color: #667890;
          font-size: 9px;
        }

        .warning-box,
        .telegram-note,
        .danger-box {
          margin-top: 12px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px;
          border-radius: 12px;
          font-size: 10px;
          line-height: 1.7;
        }

        .warning-box {
          color: #fcd34d;
          background: rgba(120, 53, 15, 0.16);
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        .warning-box strong,
        .warning-box span {
          display: block;
        }

        .warning-box span {
          color: #8f7b50;
          margin-top: 2px;
        }

        .money-field {
          min-width: 0;
        }

        .money-field label {
          display: block;
          margin-bottom: 7px;
          color: #91a2b9;
          font-size: 10px;
          font-weight: 700;
        }

        .money-field > div {
          position: relative;
        }

        .money-field > div > span {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 900;
          direction: ltr;
        }

        .money-field input {
          padding-right: 31px;
          direction: ltr;
          text-align: left;
        }

        .money-field small {
          display: block;
          margin-top: 5px;
          color: #53657d;
          font-size: 9px;
          direction: ltr;
          text-align: right;
        }

        .profit-field > div > span {
          color: #34d399;
        }

        .loss-field > div > span {
          color: #fb7185;
        }

        .rr-preview {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 11px;
          border-radius: 13px;
          background: #09111e;
          border: 1px solid #1d2b3e;
        }

        .rr-preview div {
          min-width: 0;
          text-align: center;
        }

        .rr-preview span,
        .rr-preview strong {
          display: block;
        }

        .rr-preview span {
          color: #64758d;
          font-size: 9px;
          margin-bottom: 4px;
        }

        .rr-preview strong {
          color: #dbe5f1;
          font-size: 13px;
          direction: ltr;
        }

        .toggle-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .toggle-card {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 70px;
          padding: 12px;
          text-align: right;
          border-radius: 13px;
          background: #09111e;
          border: 1px solid #1f2e43;
          color: #cbd5e1;
          cursor: pointer;
        }

        .toggle-card.checked {
          background: rgba(34, 211, 238, 0.045);
          border-color: rgba(34, 211, 238, 0.28);
        }

        .toggle-copy {
          min-width: 0;
        }

        .toggle-copy strong,
        .toggle-copy span {
          display: block;
        }

        .toggle-copy strong {
          font-size: 12px;
        }

        .toggle-copy span {
          margin-top: 4px;
          color: #667890;
          font-size: 9px;
          line-height: 1.6;
        }

        .toggle-switch {
          width: 42px;
          height: 23px;
          flex: 0 0 42px;
          padding: 3px;
          border-radius: 999px;
          background: #1e293b;
          transition: background 0.2s ease;
        }

        .toggle-switch span {
          display: block;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #64748b;
          transition: transform 0.2s ease;
        }

        .toggle-card.checked .toggle-switch {
          background: #0891b2;
        }

        .toggle-card.checked .toggle-switch span {
          transform: translateX(-19px);
          background: #ecfeff;
        }

        .toggle-green.checked {
          border-color: rgba(52, 211, 153, 0.28);
          background: rgba(52, 211, 153, 0.045);
        }

        .toggle-green.checked .toggle-switch {
          background: #059669;
        }

        .toggle-red.checked {
          border-color: rgba(251, 113, 133, 0.28);
          background: rgba(251, 113, 133, 0.045);
        }

        .toggle-red.checked .toggle-switch {
          background: #e11d48;
        }

        .toggle-gold.checked {
          border-color: rgba(251, 191, 36, 0.28);
          background: rgba(251, 191, 36, 0.045);
        }

        .toggle-gold.checked .toggle-switch {
          background: #d97706;
        }

        .risk-summary {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .risk-summary-item {
          padding: 12px;
          border-radius: 12px;
          background: #09111e;
          border: 1px solid #1d2b3e;
        }

        .risk-summary-item span,
        .risk-summary-item strong {
          display: block;
        }

        .risk-summary-item span {
          color: #667890;
          font-size: 9px;
          margin-bottom: 5px;
        }

        .risk-summary-item strong {
          font-size: 13px;
          direction: ltr;
        }

        .danger-box {
          color: #fda4af;
          background: rgba(127, 29, 29, 0.15);
          border: 1px solid rgba(251, 113, 133, 0.18);
        }

        .score-card {
          padding: 15px;
          border-radius: 14px;
          background: #09111e;
          border: 1px solid #1d2b3e;
          margin-bottom: 12px;
        }

        .score-number {
          display: flex;
          align-items: baseline;
          gap: 5px;
          direction: ltr;
        }

        .score-number strong {
          font-size: 27px;
          color: #a78bfa;
        }

        .score-number span {
          color: #65768e;
          font-size: 10px;
        }

        .score-bar {
          height: 7px;
          margin: 11px 0 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #1c293a;
        }

        .score-bar div {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #8b5cf6,
              #22d3ee
            );
          transition: width 0.2s ease;
        }

        .score-card > span {
          color: #667890;
          font-size: 9px;
        }

        .telegram-note {
          align-items: center;
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.045);
          border: 1px solid rgba(34, 211, 238, 0.13);
        }

        .telegram-note span {
          color: #71829a;
        }

        .bottom-note {
          margin-top: 16px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 13px 15px;
          color: #60728a;
          font-size: 10px;
          line-height: 1.8;
          border-radius: 14px;
          background: #0b1320;
          border: 1px solid #172538;
        }

        @media (max-width: 1050px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }

          .sticky-panel {
            position: static;
          }

          .settings-side {
            order: -1;
          }

          .overview-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .bot-page {
            padding: 12px 10px 40px;
          }

          .hero {
            padding: 17px;
            border-radius: 20px;
            flex-direction: column;
            align-items: stretch;
          }

          .hero-logo {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
          }

          .hero-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .primary-button,
          .ghost-button {
            width: 100%;
          }

          .overview-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .metric {
            padding: 12px;
          }

          .metric-icon {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }

          .selector-heading {
            align-items: stretch;
            flex-direction: column;
          }

          .new-bot-button {
            width: 100%;
            justify-content: center;
          }

          .bot-list {
            grid-template-columns: 1fr;
          }

          .status-panel {
            align-items: stretch;
            flex-direction: column;
          }

          .big-toggle {
            width: 100%;
          }

          .form-grid.two,
          .form-grid.three,
          .form-grid.four {
            grid-template-columns: 1fr;
          }

          .toggle-grid {
            grid-template-columns: 1fr;
          }

          .rr-preview,
          .risk-summary {
            grid-template-columns: 1fr;
          }

          .section-header {
            padding: 15px;
          }

          .section-body {
            padding: 0 15px 16px;
          }

          .section-header p {
            display: none;
          }

          .section-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .section-header h2 {
            font-size: 14px;
          }

          .sticky-panel {
            padding: 15px;
          }
        }

        @media (max-width: 420px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }

          .hero-brand {
            align-items: flex-start;
          }

          .hero h1 {
            font-size: 21px;
          }

          .hero p {
            font-size: 11px;
          }

          .hero-actions {
            grid-template-columns: 1fr;
          }

          .metric strong {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
