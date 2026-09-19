"use client";

import { useEffect, useMemo, useState } from "react";

type Bot = {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string | null;

  symbol?: string | null;
  timeframe?: string | null;
  marketType?: string | null;

  isActive: boolean;

  lotMode: string;
  lotSize: number;
  riskPercent: number;

  takeProfit?: number | null;
  stopLoss?: number | null;
  riskReward?: number | null;

  trailingStop: boolean;
  trailingStopDistance?: number | null;

  breakEven: boolean;
  breakEvenTrigger?: number | null;

  dailyProfitStop?: number | null;
  dailyLossLimit?: number | null;
  maxDailyStopLosses: number;
  maxOpenTrades: number;

  buyEnabled: boolean;
  sellEnabled: boolean;

  maxSpread?: number | null;
  cooldownMinutes: number;

  sessionFilter: boolean;
  newsFilter: boolean;

  signalThreshold: number;
  minConfirmations: number;

  telegramEnabled: boolean;

  analysisConfig?: Record<string, unknown> | null;

  createdAt?: string;
  updatedAt?: string;
};

type Config = {
  executionMode: "MANUAL" | "AUTO_APPROVAL";
  autoStopAfterWins: number;
  autoStopAfterLosses: number;
  requireConfirmation: boolean;
};

const defaultConfig: Config = {
  executionMode: "MANUAL",
  autoStopAfterWins: 0,
  autoStopAfterLosses: 0,
  requireConfirmation: true,
};

const timeframes = [
  { value: "1m", label: "۱ دقیقه" },
  { value: "5m", label: "۵ دقیقه" },
  { value: "15m", label: "۱۵ دقیقه" },
  { value: "30m", label: "۳۰ دقیقه" },
  { value: "1h", label: "۱ ساعت" },
  { value: "4h", label: "۴ ساعت" },
  { value: "1d", label: "روزانه" },
];

const symbols = [
  { value: "XAUUSD", label: "XAUUSD • Gold" },
  { value: "EURUSD", label: "EURUSD • Euro / Dollar" },
  { value: "GBPUSD", label: "GBPUSD • Pound / Dollar" },
  { value: "USDJPY", label: "USDJPY • Dollar / Yen" },
  { value: "BTCUSDT", label: "BTCUSDT • Bitcoin" },
  { value: "ETHUSDT", label: "ETHUSDT • Ethereum" },
];

const marketTypes = [
  { value: "FOREX", label: "Forex" },
  { value: "CRYPTO", label: "Crypto" },
];

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `$${Number(value).toFixed(2)}`;
}

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function getConfig(bot: Bot): Config {
  const raw = bot.analysisConfig;

  if (!raw || typeof raw !== "object") {
    return defaultConfig;
  }

  return {
    executionMode:
      raw.executionMode === "AUTO_APPROVAL"
        ? "AUTO_APPROVAL"
        : "MANUAL",

    autoStopAfterWins: numberValue(
      raw.autoStopAfterWins,
      0
    ),

    autoStopAfterLosses: numberValue(
      raw.autoStopAfterLosses,
      0
    ),

    requireConfirmation:
      raw.requireConfirmation !== false,
  };
}

function Icon({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "green" | "red" | "purple" | "amber";
}) {
  return (
    <span className={`icon-box icon-${tone}`}>
      {children}
    </span>
  );
}

function Section({
  icon,
  title,
  description,
  children,
  tone = "cyan",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "cyan" | "green" | "red" | "purple" | "amber";
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <Icon tone={tone}>{icon}</Icon>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="section-body">{children}</div>
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
      <div className="field-label">
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
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className={`toggle-row ${checked ? "toggle-active" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`switch ${checked ? "switch-on" : ""}`}>
        <span />
      </span>

      <span className="toggle-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedId) ?? null,
    [bots, selectedId]
  );

  const config = useMemo(
    () => (selectedBot ? getConfig(selectedBot) : defaultConfig),
    [selectedBot]
  );

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

      if (selectFirst) {
        setSelectedId((current) => {
          if (
            current &&
            loadedBots.some((bot) => bot.id === current)
          ) {
            return current;
          }

          return loadedBots[0]?.id ?? null;
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات ربات"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots();
  }, []);

  function updateSelected(
    patch: Partial<Bot>
  ) {
    if (!selectedId) return;

    setBots((current) =>
      current.map((bot) =>
        bot.id === selectedId
          ? {
              ...bot,
              ...patch,
            }
          : bot
      )
    );
  }

  function updateConfig(
    patch: Partial<Config>
  ) {
    if (!selectedBot) return;

    const nextConfig: Config = {
      ...config,
      ...patch,
    };

    updateSelected({
      analysisConfig: nextConfig,
    });
  }

  async function saveBot() {
    if (!selectedBot) return;

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/bots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedBot.id,

          name: selectedBot.name,
          type: selectedBot.type,
          category: selectedBot.category,

          symbol: selectedBot.symbol,
          timeframe: selectedBot.timeframe,
          marketType: selectedBot.marketType,

          isActive: selectedBot.isActive,

          lotMode: selectedBot.lotMode,
          lotSize: numberValue(selectedBot.lotSize, 0.01),
          riskPercent: numberValue(
            selectedBot.riskPercent,
            1
          ),

          takeProfit:
            selectedBot.takeProfit === null
              ? null
              : numberValue(selectedBot.takeProfit, 0),

          stopLoss:
            selectedBot.stopLoss === null
              ? null
              : numberValue(selectedBot.stopLoss, 0),

          riskReward:
            selectedBot.riskReward === null
              ? null
              : numberValue(selectedBot.riskReward, 0),

          trailingStop: selectedBot.trailingStop,

          trailingStopDistance:
            selectedBot.trailingStopDistance === null
              ? null
              : numberValue(
                  selectedBot.trailingStopDistance,
                  0
                ),

          breakEven: selectedBot.breakEven,

          breakEvenTrigger:
            selectedBot.breakEvenTrigger === null
              ? null
              : numberValue(
                  selectedBot.breakEvenTrigger,
                  0
                ),

          dailyProfitStop:
            selectedBot.dailyProfitStop === null
              ? null
              : numberValue(
                  selectedBot.dailyProfitStop,
                  0
                ),

          dailyLossLimit:
            selectedBot.dailyLossLimit === null
              ? null
              : numberValue(
                  selectedBot.dailyLossLimit,
                  0
                ),

          maxDailyStopLosses:
            numberValue(
              selectedBot.maxDailyStopLosses,
              3
            ),

          maxOpenTrades:
            numberValue(
              selectedBot.maxOpenTrades,
              1
            ),

          buyEnabled: selectedBot.buyEnabled,
          sellEnabled: selectedBot.sellEnabled,

          maxSpread:
            selectedBot.maxSpread === null
              ? null
              : numberValue(selectedBot.maxSpread, 0),

          cooldownMinutes:
            numberValue(
              selectedBot.cooldownMinutes,
              5
            ),

          sessionFilter: selectedBot.sessionFilter,
          newsFilter: selectedBot.newsFilter,

          signalThreshold:
            numberValue(
              selectedBot.signalThreshold,
              80
            ),

          minConfirmations:
            numberValue(
              selectedBot.minConfirmations,
              5
            ),

          telegramEnabled:
            selectedBot.telegramEnabled,

          analysisConfig:
            selectedBot.analysisConfig ?? {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "ذخیره تنظیمات انجام نشد"
        );
      }

      const updatedBot: Bot =
        data?.bot || data;

      setBots((current) =>
        current.map((bot) =>
          bot.id === updatedBot.id
            ? updatedBot
            : bot
        )
      );

      setMessage("تنظیمات ربات با موفقیت ذخیره شد.");
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

  async function toggleBot() {
    if (!selectedBot) return;

    const nextActive = !selectedBot.isActive;

    updateSelected({
      isActive: nextActive,
    });

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
          id: selectedBot.id,
          isActive: nextActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        updateSelected({
          isActive: !nextActive,
        });

        throw new Error(
          data?.error || "تغییر وضعیت ربات انجام نشد"
        );
      }

      const updatedBot: Bot =
        data?.bot || data;

      setBots((current) =>
        current.map((bot) =>
          bot.id === updatedBot.id
            ? updatedBot
            : bot
        )
      );

      setMessage(
        nextActive
          ? "ربات روشن شد و وضعیت آن در دیتابیس ثبت شد."
          : "ربات خاموش شد و وضعیت آن در دیتابیس ثبت شد."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در تغییر وضعیت ربات"
      );
    } finally {
      setSaving(false);
    }
  }

  async function createBot() {
    try {
      setCreating(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Trading AI Bot ${bots.length + 1}`,
          type: "TRADING",
          category: "TRADING",
          symbol: "XAUUSD",
          timeframe: "15m",
          marketType: "FOREX",

          lotMode: "FIXED",
          lotSize: 0.01,
          riskPercent: 1,

          takeProfit: 10,
          stopLoss: 2,
          riskReward: 5,

          trailingStop: false,
          breakEven: false,

          dailyProfitStop: 20,
          dailyLossLimit: 12,
          maxDailyStopLosses: 3,
          maxOpenTrades: 1,

          buyEnabled: true,
          sellEnabled: true,

          maxSpread: null,
          cooldownMinutes: 5,

          sessionFilter: true,
          newsFilter: true,

          signalThreshold: 80,
          minConfirmations: 5,

          telegramEnabled: false,

          analysisConfig: {
            ...defaultConfig,
          },

          isActive: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "ساخت ربات انجام نشد"
        );
      }

      const newBot: Bot =
        data?.bot || data;

      setBots((current) => [
        newBot,
        ...current,
      ]);

      setSelectedId(newBot.id);

      setMessage(
        "ربات جدید ساخته شد. ابتدا تنظیمات آن را بررسی و ذخیره کنید."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ساخت ربات"
      );
    } finally {
      setCreating(false);
    }
  }

  function calculateRR(
    tp: number | null | undefined,
    sl: number | null | undefined
  ) {
    const takeProfit = numberValue(tp);
    const stopLoss = numberValue(sl);

    if (takeProfit <= 0 || stopLoss <= 0) {
      return 0;
    }

    return takeProfit / stopLoss;
  }

  function updateTakeProfit(value: number) {
    if (!selectedBot) return;

    const rr = calculateRR(
      value,
      selectedBot.stopLoss
    );

    updateSelected({
      takeProfit: value,
      riskReward:
        rr > 0
          ? Number(rr.toFixed(2))
          : null,
    });
  }

  function updateStopLoss(value: number) {
    if (!selectedBot) return;

    const rr = calculateRR(
      selectedBot.takeProfit,
      value
    );

    updateSelected({
      stopLoss: value,
      riskReward:
        rr > 0
          ? Number(rr.toFixed(2))
          : null,
    });
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-card">
          <div className="loading-orb">🤖</div>
          <h1>در حال بارگذاری ربات‌ها...</h1>
          <p>
            اطلاعات واقعی ربات‌ها از دیتابیس دریافت می‌شود.
          </p>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page" dir="rtl">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="container">
        <header className="topbar">
          <div className="brand-area">
            <div className="brand-icon">🤖</div>

            <div>
              <div className="eyebrow">
                TRADING AI • BOT CENTER
              </div>

              <h1>مرکز کنترل ربات‌ها</h1>

              <p>
                مدیریت واقعی تنظیمات، ریسک و وضعیت اجرای ربات
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadBots(false)}
              disabled={loading}
            >
              ↻ بروزرسانی
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={createBot}
              disabled={creating}
            >
              ＋ {creating ? "در حال ساخت..." : "ربات جدید"}
            </button>
          </div>
        </header>

        {message && (
          <div className="notice success-notice">
            <span>✓</span>
            {message}
          </div>
        )}

        {error && (
          <div className="notice error-notice">
            <span>!</span>
            {error}
          </div>
        )}

        {bots.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">🤖</div>

            <h2>هنوز رباتی ساخته نشده است</h2>

            <p>
              اولین ربات خود را بسازید و تنظیمات واقعی آن را
              ذخیره کنید.
            </p>

            <button
              type="button"
              className="primary-button large"
              onClick={createBot}
              disabled={creating}
            >
              ＋ ساخت اولین ربات
            </button>
          </div>
        ) : (
          <>
            <section className="bot-selector">
              <div className="selector-title">
                <div>
                  <span className="eyebrow">
                    YOUR BOTS
                  </span>
                  <h2>ربات‌های شما</h2>
                </div>

                <span className="bot-count">
                  {bots.length} ربات
                </span>
              </div>

              <div className="bot-list">
                {bots.map((bot) => (
                  <button
                    type="button"
                    key={bot.id}
                    className={`bot-tab ${
                      bot.id === selectedId
                        ? "bot-tab-active"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedId(bot.id)
                    }
                  >
                    <span className="bot-tab-icon">
                      🤖
                    </span>

                    <span className="bot-tab-content">
                      <strong>{bot.name}</strong>

                      <small>
                        {bot.symbol || "—"} •{" "}
                        {bot.timeframe || "—"}
                      </small>
                    </span>

                    <span
                      className={`status-dot ${
                        bot.isActive
                          ? "status-on"
                          : "status-off"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </section>

            {selectedBot && (
              <>
                <section className="hero-card">
                  <div className="hero-main">
                    <div className="hero-icon">
                      🤖
                    </div>

                    <div>
                      <span className="eyebrow">
                        ACTIVE BOT CONTROL
                      </span>

                      <h2>
                        {selectedBot.name}
                      </h2>

                      <p>
                        {selectedBot.symbol || "—"}{" "}
                        •{" "}
                        {selectedBot.timeframe || "—"}{" "}
                        •{" "}
                        {selectedBot.marketType ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`live-status ${
                      selectedBot.isActive
                        ? "live-on"
                        : "live-off"
                    }`}
                  >
                    <span />
                    {selectedBot.isActive
                      ? "ربات روشن است"
                      : "ربات خاموش است"}
                  </div>

                  <button
                    type="button"
                    className={`power-button ${
                      selectedBot.isActive
                        ? "power-off"
                        : "power-on"
                    }`}
                    onClick={toggleBot}
                    disabled={saving}
                  >
                    <span>
                      {selectedBot.isActive
                        ? "■"
                        : "▶"}
                    </span>

                    {selectedBot.isActive
                      ? "خاموش کردن ربات"
                      : "روشن کردن ربات"}
                  </button>

                  <p className="power-warning">
                    {selectedBot.isActive
                      ? "ربات در وضعیت فعال ثبت شده است. اجرای معامله واقعی فقط پس از اتصال Broker/MT5 انجام خواهد شد."
                      : "ربات فعلاً معامله‌ای اجرا نمی‌کند. ابتدا تنظیمات را بررسی و سپس در صورت نیاز روشن کنید."}
                  </p>
                </section>

                <div className="summary-grid">
                  <div className="summary-card">
                    <span>بازار</span>
                    <strong>
                      {selectedBot.symbol ||
                        "—"}
                    </strong>
                  </div>

                  <div className="summary-card">
                    <span>تایم‌فریم</span>
                    <strong>
                      {selectedBot.timeframe ||
                        "—"}
                    </strong>
                  </div>

                  <div className="summary-card profit">
                    <span>حد سود</span>
                    <strong>
                      {money(
                        selectedBot.takeProfit
                      )}
                    </strong>
                  </div>

                  <div className="summary-card loss">
                    <span>حد ضرر</span>
                    <strong>
                      {money(
                        selectedBot.stopLoss
                      )}
                    </strong>
                  </div>

                  <div className="summary-card rr">
                    <span>ریسک به ریوارد</span>
                    <strong>
                      1:
                      {numberValue(
                        selectedBot.riskReward
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="settings-grid">
                  <Section
                    icon="⚙"
                    title="مشخصات اصلی"
                    description="اطلاعات پایه‌ای ربات را کنترل کنید."
                  >
                    <div className="form-grid">
                      <Field label="نام ربات">
                        <input
                          value={selectedBot.name}
                          onChange={(event) =>
                            updateSelected({
                              name: event.target
                                .value,
                            })
                          }
                          placeholder="نام ربات"
                        />
                      </Field>

                      <Field label="نوع بازار">
                        <select
                          value={
                            selectedBot.marketType ||
                            "FOREX"
                          }
                          onChange={(event) =>
                            updateSelected({
                              marketType:
                                event.target
                                  .value,
                            })
                          }
                        >
                          {marketTypes.map(
                            (item) => (
                              <option
                                key={item.value}
                                value={
                                  item.value
                                }
                              >
                                {item.label}
                              </option>
                            )
                          )}
                        </select>
                      </Field>

                      <Field
                        label="نماد معاملاتی"
                        hint="Symbol"
                      >
                        <select
                          value={
                            selectedBot.symbol ||
                            "XAUUSD"
                          }
                          onChange={(event) =>
                            updateSelected({
                              symbol:
                                event.target
                                  .value,
                            })
                          }
                        >
                          {symbols.map(
                            (item) => (
                              <option
                                key={item.value}
                                value={
                                  item.value
                                }
                              >
                                {item.label}
                              </option>
                            )
                          )}
                        </select>
                      </Field>

                      <Field label="تایم‌فریم">
                        <select
                          value={
                            selectedBot.timeframe ||
                            "15m"
                          }
                          onChange={(event) =>
                            updateSelected({
                              timeframe:
                                event.target
                                  .value,
                            })
                          }
                        >
                          {timeframes.map(
                            (item) => (
                              <option
                                key={item.value}
                                value={
                                  item.value
                                }
                              >
                                {item.label}
                              </option>
                            )
                          )}
                        </select>
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon="💰"
                    title="مدیریت حجم و ریسک"
                    description="نحوه تعیین حجم معامله را مشخص کنید."
                    tone="green"
                  >
                    <div className="mode-grid">
                      <button
                        type="button"
                        className={`mode-card ${
                          selectedBot.lotMode ===
                          "FIXED"
                            ? "mode-active"
                            : ""
                        }`}
                        onClick={() =>
                          updateSelected({
                            lotMode: "FIXED",
                          })
                        }
                      >
                        <strong>
                          حجم ثابت
                        </strong>
                        <small>
                          Lot Size ثابت
                        </small>
                      </button>

                      <button
                        type="button"
                        className={`mode-card ${
                          selectedBot.lotMode ===
                          "RISK_PERCENT"
                            ? "mode-active"
                            : ""
                        }`}
                        onClick={() =>
                          updateSelected({
                            lotMode:
                              "RISK_PERCENT",
                          })
                        }
                      >
                        <strong>
                          ریسک درصدی
                        </strong>
                        <small>
                          محاسبه بر اساس ریسک
                        </small>
                      </button>
                    </div>

                    <div className="form-grid">
                      <Field
                        label="حجم ثابت"
                        hint="Lot"
                      >
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={
                            selectedBot.lotSize
                          }
                          disabled={
                            selectedBot.lotMode !==
                            "FIXED"
                          }
                          onChange={(event) =>
                            updateSelected({
                              lotSize:
                                numberValue(
                                  event.target
                                    .value,
                                  0.01
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field
                        label="درصد ریسک"
                        hint="%"
                      >
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={
                            selectedBot.riskPercent
                          }
                          disabled={
                            selectedBot.lotMode !==
                            "RISK_PERCENT"
                          }
                          onChange={(event) =>
                            updateSelected({
                              riskPercent:
                                numberValue(
                                  event.target
                                    .value,
                                  1
                                ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon="🎯"
                    title="حد سود، حد ضرر و R:R"
                    description="R:R به‌صورت خودکار از TP و SL محاسبه می‌شود."
                    tone="green"
                  >
                    <div className="risk-grid">
                      <div className="risk-input profit-input">
                        <span>سود هدف</span>

                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={
                              selectedBot.takeProfit ??
                              ""
                            }
                            onChange={(event) =>
                              updateTakeProfit(
                                numberValue(
                                  event.target
                                    .value
                                )
                              )
                            }
                          />

                          <b>$</b>
                        </div>
                      </div>

                      <div className="risk-input loss-input">
                        <span>حد ضرر</span>

                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={
                              selectedBot.stopLoss ??
                              ""
                            }
                            onChange={(event) =>
                              updateStopLoss(
                                numberValue(
                                  event.target
                                    .value
                                )
                              )
                            }
                          />

                          <b>$</b>
                        </div>
                      </div>
                    </div>

                    <div className="rr-card">
                      <div>
                        <span>
                          نسبت ریسک به ریوارد
                        </span>

                        <strong>
                          1:
                          {numberValue(
                            selectedBot.riskReward
                          ).toFixed(2)}
                        </strong>
                      </div>

                      <p>
                        مثال: سود $10 و ضرر $2
                        به‌صورت خودکار برابر
                        با R:R = 1:5 می‌شود.
                      </p>
                    </div>
                  </Section>

                  <Section
                    icon="🛡"
                    title="مدیریت هوشمند معامله"
                    description="مدیریت معامله پس از ورود."
                    tone="purple"
                  >
                    <div className="toggle-grid">
                      <Toggle
                        checked={
                          selectedBot.trailingStop
                        }
                        onChange={(value) =>
                          updateSelected({
                            trailingStop:
                              value,
                          })
                        }
                        title="Trailing Stop"
                        description="جابجایی خودکار حد ضرر"
                      />

                      <Toggle
                        checked={
                          selectedBot.breakEven
                        }
                        onChange={(value) =>
                          updateSelected({
                            breakEven: value,
                          })
                        }
                        title="Break Even"
                        description="انتقال حد ضرر به نقطه ورود"
                      />
                    </div>

                    <div className="form-grid">
                      <Field label="فاصله Trailing Stop">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            selectedBot
                              .trailingStopDistance ??
                            ""
                          }
                          disabled={
                            !selectedBot.trailingStop
                          }
                          onChange={(event) =>
                            updateSelected({
                              trailingStopDistance:
                                numberValue(
                                  event.target
                                    .value
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field label="تریگر Break Even">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            selectedBot
                              .breakEvenTrigger ??
                            ""
                          }
                          disabled={
                            !selectedBot.breakEven
                          }
                          onChange={(event) =>
                            updateSelected({
                              breakEvenTrigger:
                                numberValue(
                                  event.target
                                    .value
                                ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon="📊"
                    title="محدودیت‌های روزانه"
                    description="برای کنترل ریسک روزانه ربات."
                    tone="amber"
                  >
                    <div className="form-grid">
                      <Field label="توقف بعد از سود">
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              selectedBot.dailyProfitStop ??
                              ""
                            }
                            onChange={(event) =>
                              updateSelected({
                                dailyProfitStop:
                                  numberValue(
                                    event.target
                                      .value
                                  ),
                              })
                            }
                          />
                          <span>$</span>
                        </div>
                      </Field>

                      <Field label="حد ضرر روزانه">
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              selectedBot.dailyLossLimit ??
                              ""
                            }
                            onChange={(event) =>
                              updateSelected({
                                dailyLossLimit:
                                  numberValue(
                                    event.target
                                      .value
                                  ),
                              })
                            }
                          />
                          <span>$</span>
                        </div>
                      </Field>

                      <Field label="حداکثر Stop Loss روزانه">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            selectedBot.maxDailyStopLosses
                          }
                          onChange={(event) =>
                            updateSelected({
                              maxDailyStopLosses:
                                numberValue(
                                  event.target
                                    .value,
                                  3
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field label="حداکثر معاملات باز">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            selectedBot.maxOpenTrades
                          }
                          onChange={(event) =>
                            updateSelected({
                              maxOpenTrades:
                                numberValue(
                                  event.target
                                    .value,
                                  1
                                ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon="↕"
                    title="جهت معاملات"
                    description="تعیین کنید ربات اجازه چه معاملاتی دارد."
                  >
                    <div className="toggle-grid">
                      <Toggle
                        checked={
                          selectedBot.buyEnabled
                        }
                        onChange={(value) =>
                          updateSelected({
                            buyEnabled: value,
                          })
                        }
                        title="Buy"
                        description="اجازه معاملات خرید"
                      />

                      <Toggle
                        checked={
                          selectedBot.sellEnabled
                        }
                        onChange={(value) =>
                          updateSelected({
                            sellEnabled: value,
                          })
                        }
                        title="Sell"
                        description="اجازه معاملات فروش"
                      />
                    </div>
                  </Section>

                  <Section
                    icon="🧠"
                    title="فیلترهای هوشمند"
                    description="شرایطی که قبل از اجرای سیگنال بررسی می‌شوند."
                    tone="purple"
                  >
                    <div className="toggle-grid">
                      <Toggle
                        checked={
                          selectedBot.sessionFilter
                        }
                        onChange={(value) =>
                          updateSelected({
                            sessionFilter:
                              value,
                          })
                        }
                        title="Session Filter"
                        description="فیلتر ساعات معاملاتی"
                      />

                      <Toggle
                        checked={
                          selectedBot.newsFilter
                        }
                        onChange={(value) =>
                          updateSelected({
                            newsFilter:
                              value,
                          })
                        }
                        title="News Filter"
                        description="توقف در شرایط خبری"
                      />
                    </div>

                    <div className="form-grid">
                      <Field label="حداقل امتیاز سیگنال">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={
                            selectedBot.signalThreshold
                          }
                          onChange={(event) =>
                            updateSelected({
                              signalThreshold:
                                numberValue(
                                  event.target
                                    .value,
                                  80
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field label="حداقل تأییدها">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                          value={
                            selectedBot.minConfirmations
                          }
                          onChange={(event) =>
                            updateSelected({
                              minConfirmations:
                                numberValue(
                                  event.target
                                    .value,
                                  5
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field label="حداکثر Spread">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            selectedBot.maxSpread ??
                            ""
                          }
                          onChange={(event) =>
                            updateSelected({
                              maxSpread:
                                event.target
                                  .value === ""
                                  ? null
                                  : numberValue(
                                      event.target
                                        .value
                                    ),
                            })
                          }
                        />
                      </Field>

                      <Field label="Cooldown">
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              selectedBot.cooldownMinutes
                            }
                            onChange={(event) =>
                              updateSelected({
                                cooldownMinutes:
                                  numberValue(
                                    event.target
                                      .value,
                                    5
                                  ),
                              })
                            }
                          />
                          <span>دقیقه</span>
                        </div>
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon="⚡"
                    title="حالت اجرای ربات"
                    description="نحوه اجازه دادن به اجرای قوانین ربات."
                    tone="cyan"
                  >
                    <div className="mode-grid">
                      <button
                        type="button"
                        className={`mode-card ${
                          config.executionMode ===
                          "MANUAL"
                            ? "mode-active"
                            : ""
                        }`}
                        onClick={() =>
                          updateConfig({
                            executionMode:
                              "MANUAL",
                          })
                        }
                      >
                        <strong>
                          🖐 دستی
                        </strong>

                        <small>
                          اجرای معامله فقط با تأیید کاربر
                        </small>
                      </button>

                      <button
                        type="button"
                        className={`mode-card ${
                          config.executionMode ===
                          "AUTO_APPROVAL"
                            ? "mode-active"
                            : ""
                        }`}
                        onClick={() =>
                          updateConfig({
                            executionMode:
                              "AUTO_APPROVAL",
                          })
                        }
                      >
                        <strong>
                          ⚡ خودکار با تأیید
                        </strong>

                        <small>
                          ربات طبق قوانین ذخیره‌شده آماده اجرای خودکار است
                        </small>
                      </button>
                    </div>

                    <div className="toggle-grid">
                      <Toggle
                        checked={
                          config.requireConfirmation
                        }
                        onChange={(value) =>
                          updateConfig({
                            requireConfirmation:
                              value,
                          })
                        }
                        title="تأیید کاربر"
                        description="قبل از اجرای معامله نیاز به تأیید داشته باشد"
                      />
                    </div>
                  </Section>

                  <Section
                    icon="⛔"
                    title="خاموشی خودکار"
                    description="پس از رسیدن به تعداد مشخصی برد یا باخت، ربات خاموش شود."
                    tone="red"
                  >
                    <div className="form-grid">
                      <Field label="خاموش شدن بعد از برد">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            config.autoStopAfterWins
                          }
                          onChange={(event) =>
                            updateConfig({
                              autoStopAfterWins:
                                numberValue(
                                  event.target
                                    .value
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field label="خاموش شدن بعد از باخت">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            config.autoStopAfterLosses
                          }
                          onChange={(event) =>
                            updateConfig({
                              autoStopAfterLosses:
                                numberValue(
                                  event.target
                                    .value
                                ),
                            })
                          }
                        />
                      </Field>
                    </div>

                    <div className="rule-info">
                      <span>۰ = غیرفعال</span>
                      <span>
                        این قوانین در{" "}
                        <b>analysisConfig</b>{" "}
                        ذخیره می‌شوند.
                      </span>
                    </div>
                  </Section>

                  <Section
                    icon="📡"
                    title="تلگرام"
                    description="فعال‌سازی ثبت و ارسال سیگنال‌های ربات."
                    tone="cyan"
                  >
                    <Toggle
                      checked={
                        selectedBot.telegramEnabled
                      }
                      onChange={(value) =>
                        updateSelected({
                          telegramEnabled:
                            value,
                        })
                      }
                      title="ارسال به Telegram"
                      description="فعال‌سازی ارسال سیگنال پس از اتصال Telegram"
                    />
                  </Section>
                </div>

                <div className="save-area">
                  <div>
                    <strong>
                      تغییرات ذخیره نشده
                    </strong>

                    <span>
                      بعد از تغییر تنظیمات، برای ثبت آن‌ها در دیتابیس روی ذخیره بزنید.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="save-button"
                    onClick={saveBot}
                    disabled={saving}
                  >
                    {saving
                      ? "در حال ذخیره..."
                      : "💾 ذخیره و بروزرسانی ربات"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 85% 5%, rgba(14, 165, 233, .12), transparent 28%),
      radial-gradient(circle at 10% 40%, rgba(37, 99, 235, .09), transparent 30%),
      #050a14;
    color: #e5edf7;
    padding: 28px 14px 90px;
    position: relative;
    overflow-x: hidden;
  }

  .ambient {
    position: fixed;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
    opacity: .12;
  }

  .ambient-one {
    background: #00d9ff;
    top: 80px;
    right: -150px;
  }

  .ambient-two {
    background: #2563eb;
    bottom: 50px;
    left: -170px;
  }

  .container {
    width: min(1180px, 100%);
    margin: 0 auto;
    position: relative;
    z-index: 2;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    margin-bottom: 24px;
  }

  .brand-area {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .brand-icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(14, 165, 233, .18), rgba(37, 99, 235, .14));
    border: 1px solid rgba(56, 189, 248, .22);
    font-size: 27px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, .22);
  }

  .eyebrow {
    color: #67e8f9;
    font-size: 10px;
    letter-spacing: 1.7px;
    font-weight: 800;
    display: block;
    margin-bottom: 5px;
  }

  .topbar h1 {
    margin: 0;
    font-size: clamp(25px, 4vw, 38px);
    line-height: 1.2;
    color: #f8fbff;
  }

  .topbar p {
    margin: 7px 0 0;
    color: #7e91aa;
    font-size: 13px;
  }

  .top-actions {
    display: flex;
    gap: 10px;
  }

  button {
    font: inherit;
  }

  button:disabled {
    opacity: .58;
    cursor: not-allowed;
  }

  .primary-button,
  .secondary-button,
  .save-button {
    border: 0;
    cursor: pointer;
    color: white;
    border-radius: 14px;
    padding: 13px 18px;
    font-weight: 800;
    transition: .2s ease;
  }

  .primary-button {
    background: linear-gradient(135deg, #06b6d4, #2563eb);
    box-shadow: 0 10px 30px rgba(37, 99, 235, .22);
  }

  .primary-button:hover,
  .save-button:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  .secondary-button {
    color: #dcecff;
    background: #0b1423;
    border: 1px solid #1d3047;
  }

  .large {
    padding: 15px 24px;
  }

  .notice {
    border-radius: 14px;
    padding: 13px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }

  .success-notice {
    background: rgba(16, 185, 129, .09);
    border: 1px solid rgba(16, 185, 129, .22);
    color: #6ee7b7;
  }

  .error-notice {
    background: rgba(244, 63, 94, .08);
    border: 1px solid rgba(244, 63, 94, .22);
    color: #fda4af;
  }

  .bot-selector,
  .hero-card,
  .section-card,
  .save-area,
  .empty-card,
  .loading-card {
    background: linear-gradient(145deg, rgba(10, 20, 35, .94), rgba(6, 13, 25, .96));
    border: 1px solid #15253a;
    box-shadow: 0 18px 55px rgba(0, 0, 0, .18);
  }

  .bot-selector {
    border-radius: 22px;
    padding: 18px;
    margin-bottom: 16px;
  }

  .selector-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 14px;
  }

  .selector-title h2 {
    margin: 0;
    font-size: 20px;
  }

  .bot-count {
    color: #7dd3fc;
    background: rgba(14, 165, 233, .08);
    border: 1px solid rgba(14, 165, 233, .15);
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 12px;
  }

  .bot-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .bot-tab {
    min-width: 0;
    position: relative;
    text-align: right;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px;
    border-radius: 16px;
    color: #aebdd0;
    background: #08111e;
    border: 1px solid #14263b;
    cursor: pointer;
    transition: .2s ease;
  }

  .bot-tab:hover {
    border-color: #244966;
  }

  .bot-tab-active {
    color: white;
    border-color: #0891b2;
    background: linear-gradient(135deg, rgba(8, 145, 178, .14), rgba(37, 99, 235, .10));
    box-shadow: inset 0 0 30px rgba(14, 165, 233, .04);
  }

  .bot-tab-icon {
    width: 37px;
    height: 37px;
    flex: 0 0 37px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #101c2c;
  }

  .bot-tab-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bot-tab-content strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bot-tab-content small {
    color: #71839a;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: auto;
  }

  .status-on {
    background: #34d399;
    box-shadow: 0 0 12px rgba(52, 211, 153, .7);
  }

  .status-off {
    background: #475569;
  }

  .hero-card {
    border-radius: 24px;
    padding: 22px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }

  .hero-card::after {
    content: "";
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(14, 165, 233, .06);
    left: -100px;
    bottom: -150px;
    pointer-events: none;
  }

  .hero-main {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .hero-icon {
    width: 55px;
    height: 55px;
    border-radius: 17px;
    display: grid;
    place-items: center;
    font-size: 26px;
    background: linear-gradient(135deg, rgba(14, 165, 233, .16), rgba(37, 99, 235, .13));
    border: 1px solid rgba(56, 189, 248, .2);
  }

  .hero-card h2 {
    margin: 0;
    font-size: 25px;
  }

  .hero-card p {
    color: #71839a;
    margin: 6px 0 0;
  }

  .live-status {
    position: absolute;
    top: 22px;
    left: 22px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    padding: 7px 10px;
    border-radius: 999px;
  }

  .live-status span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .live-on {
    color: #6ee7b7;
    background: rgba(16, 185, 129, .08);
  }

  .live-on span {
    background: #34d399;
    box-shadow: 0 0 10px #34d399;
  }

  .live-off {
    color: #94a3b8;
    background: rgba(100, 116, 139, .08);
  }

  .live-off span {
    background: #64748b;
  }

  .power-button {
    width: 100%;
    border: 1px solid;
    border-radius: 15px;
    padding: 14px;
    margin-top: 20px;
    cursor: pointer;
    font-weight: 900;
    transition: .2s ease;
  }

  .power-button span {
    margin-left: 7px;
  }

  .power-on {
    background: rgba(16, 185, 129, .08);
    border-color: rgba(16, 185, 129, .28);
    color: #6ee7b7;
  }

  .power-off {
    background: rgba(244, 63, 94, .07);
    border-color: rgba(244, 63, 94, .25);
    color: #fda4af;
  }

  .power-button:hover {
    transform: translateY(-1px);
  }

  .power-warning {
    text-align: center;
    font-size: 11px !important;
    color: #64748b !important;
    margin-bottom: 0 !important;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  .summary-card {
    padding: 16px;
    border-radius: 17px;
    background: #07111e;
    border: 1px solid #14253a;
  }

  .summary-card span {
    display: block;
    color: #63758b;
    font-size: 11px;
    margin-bottom: 8px;
  }

  .summary-card strong {
    color: #dbeafe;
    font-size: 18px;
  }

  .summary-card.profit strong {
    color: #34d399;
  }

  .summary-card.loss strong {
    color: #fb7185;
  }

  .summary-card.rr strong {
    color: #a78bfa;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .section-card {
    border-radius: 22px;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 19px 20px;
    border-bottom: 1px solid #122236;
  }

  .section-header h2 {
    margin: 0;
    color: #f1f5f9;
    font-size: 17px;
  }

  .section-header p {
    margin: 5px 0 0;
    color: #6f8299;
    font-size: 11px;
    line-height: 1.7;
  }

  .icon-box {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    font-size: 19px;
  }

  .icon-cyan {
    background: rgba(14, 165, 233, .1);
    color: #67e8f9;
    border: 1px solid rgba(14, 165, 233, .17);
  }

  .icon-green {
    background: rgba(16, 185, 129, .09);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, .17);
  }

  .icon-red {
    background: rgba(244, 63, 94, .08);
    color: #fda4af;
    border: 1px solid rgba(244, 63, 94, .17);
  }

  .icon-purple {
    background: rgba(139, 92, 246, .09);
    color: #c4b5fd;
    border: 1px solid rgba(139, 92, 246, .17);
  }

  .icon-amber {
    background: rgba(245, 158, 11, .09);
    color: #fcd34d;
    border: 1px solid rgba(245, 158, 11, .17);
  }

  .section-body {
    padding: 19px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .field {
    min-width: 0;
  }

  .field-label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 7px;
    color: #cbd5e1;
    font-size: 12px;
  }

  .field-label small {
    color: #52657d;
    direction: ltr;
  }

  input,
  select {
    width: 100%;
    height: 46px;
    outline: none;
    border-radius: 12px;
    border: 1px solid #172b42;
    background: #070f1b;
    color: #e5edf7;
    padding: 0 13px;
    transition: .18s ease;
    font-size: 13px;
  }

  input:focus,
  select:focus {
    border-color: #0891b2;
    box-shadow: 0 0 0 3px rgba(8, 145, 178, .08);
  }

  input:disabled,
  select:disabled {
    opacity: .38;
    cursor: not-allowed;
  }

  select {
    cursor: pointer;
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .mode-card {
    text-align: right;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid #172b42;
    background: #07111e;
    color: #dbeafe;
    cursor: pointer;
    transition: .2s ease;
  }

  .mode-card strong,
  .mode-card small {
    display: block;
  }

  .mode-card small {
    margin-top: 5px;
    color: #64748b;
    font-size: 10px;
  }

  .mode-active {
    border-color: #0891b2;
    background: rgba(8, 145, 178, .1);
    box-shadow: inset 0 0 25px rgba(8, 145, 178, .04);
  }

  .risk-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .risk-input {
    border-radius: 16px;
    padding: 14px;
    border: 1px solid #172b42;
    background: #07111e;
  }

  .risk-input > span {
    display: block;
    color: #64748b;
    font-size: 11px;
    margin-bottom: 8px;
  }

  .risk-input > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .risk-input input {
    background: transparent;
    border: 0;
    padding: 0;
    height: 35px;
    font-size: 22px;
    font-weight: 900;
  }

  .risk-input b {
    font-size: 18px;
  }

  .profit-input {
    border-color: rgba(16, 185, 129, .18);
  }

  .profit-input b {
    color: #34d399;
  }

  .loss-input {
    border-color: rgba(244, 63, 94, .18);
  }

  .loss-input b {
    color: #fb7185;
  }

  .rr-card {
    margin-top: 12px;
    padding: 15px;
    border-radius: 15px;
    background: linear-gradient(135deg, rgba(139, 92, 246, .08), rgba(37, 99, 235, .06));
    border: 1px solid rgba(139, 92, 246, .16);
  }

  .rr-card > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .rr-card span {
    color: #8998ab;
    font-size: 12px;
  }

  .rr-card strong {
    color: #c4b5fd;
    font-size: 20px;
  }

  .rr-card p {
    margin: 8px 0 0;
    color: #66788f;
    font-size: 10px;
    line-height: 1.7;
  }

  .toggle-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .toggle-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    text-align: right;
    padding: 13px;
    border-radius: 14px;
    border: 1px solid #172b42;
    background: #07111e;
    color: #dbeafe;
    cursor: pointer;
  }

  .toggle-active {
    border-color: rgba(14, 165, 233, .3);
    background: rgba(14, 165, 233, .06);
  }

  .switch {
    width: 42px;
    height: 23px;
    flex: 0 0 42px;
    border-radius: 999px;
    padding: 3px;
    background: #1e293b;
    transition: .2s ease;
  }

  .switch span {
    display: block;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #64748b;
    transition: .2s ease;
  }

  .switch-on {
    background: #0891b2;
  }

  .switch-on span {
    transform: translateX(-19px);
    background: white;
  }

  .toggle-copy {
    min-width: 0;
  }

  .toggle-copy strong,
  .toggle-copy small {
    display: block;
  }

  .toggle-copy strong {
    font-size: 12px;
  }

  .toggle-copy small {
    color: #61738a;
    margin-top: 3px;
    font-size: 9px;
  }

  .input-with-unit {
    position: relative;
  }

  .input-with-unit input {
    padding-left: 65px;
  }

  .input-with-unit span {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    font-size: 10px;
    pointer-events: none;
  }

  .rule-info {
    margin-top: 13px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: #64748b;
    font-size: 10px;
  }

  .rule-info b {
    color: #94a3b8;
    direction: ltr;
    display: inline-block;
  }

  .save-area {
    margin-top: 16px;
    border-radius: 22px;
    padding: 17px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    position: sticky;
    bottom: 12px;
    z-index: 10;
    backdrop-filter: blur(18px);
  }

  .save-area strong,
  .save-area span {
    display: block;
  }

  .save-area strong {
    color: #e2e8f0;
    font-size: 13px;
  }

  .save-area span {
    color: #60738a;
    font-size: 10px;
    margin-top: 4px;
  }

  .save-button {
    min-width: 250px;
    background: linear-gradient(135deg, #06b6d4, #2563eb);
  }

  .empty-card,
  .loading-card {
    border-radius: 24px;
    padding: 60px 25px;
    text-align: center;
  }

  .empty-icon,
  .loading-orb {
    width: 70px;
    height: 70px;
    margin: 0 auto 16px;
    border-radius: 22px;
    display: grid;
    place-items: center;
    background: rgba(14, 165, 233, .08);
    border: 1px solid rgba(14, 165, 233, .17);
    font-size: 30px;
  }

  .empty-card h2,
  .loading-card h1 {
    margin: 0;
    font-size: 22px;
  }

  .empty-card p,
  .loading-card p {
    color: #6d8097;
    font-size: 12px;
    margin: 9px 0 20px;
  }

  @media (max-width: 900px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .page {
      padding: 18px 10px 80px;
    }

    .topbar {
      align-items: stretch;
      flex-direction: column;
    }

    .top-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .top-actions button {
      width: 100%;
    }

    .brand-icon {
      width: 50px;
      height: 50px;
      flex-basis: 50px;
    }

    .topbar h1 {
      font-size: 25px;
    }

    .bot-list {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summary-card:last-child {
      grid-column: 1 / -1;
    }

    .form-grid,
    .risk-grid,
    .toggle-grid,
    .mode-grid {
      grid-template-columns: 1fr;
    }

    .hero-card {
      padding: 18px;
    }

    .live-status {
      position: static;
      display: inline-flex;
      margin-top: 15px;
    }

    .section-header {
      padding: 16px;
    }

    .section-body {
      padding: 15px;
    }

    .save-area {
      flex-direction: column;
      align-items: stretch;
      bottom: 7px;
    }

    .save-button {
      min-width: 0;
      width: 100%;
    }

    .rule-info {
      flex-direction: column;
    }
  }

  @media (max-width: 420px) {
    .page {
      padding-left: 8px;
      padding-right: 8px;
    }

    .top-actions {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: 1fr 1fr;
    }

    .summary-card strong {
      font-size: 16px;
    }

    .hero-card h2 {
      font-size: 21px;
    }
  }
`;
