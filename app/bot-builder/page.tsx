"use client";

import { useEffect, useState } from "react";

type Bot = {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  marketType: string;
  type: string;
  category: string;
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
};

export default function BotBuilderPage() {
  const [botId, setBotId] = useState("");

  const [botName, setBotName] = useState("Gold AI Bot");
  const [market, setMarket] = useState("XAU/USD");
  const [strategy, setStrategy] = useState("Trend Following");
  const [timeframe, setTimeframe] = useState("15m");

  const [lotMode, setLotMode] = useState("FIXED");
  const [lotSize, setLotSize] = useState("0.01");
  const [riskPercent, setRiskPercent] = useState("1");

  const [takeProfit, setTakeProfit] = useState("5");
  const [stopLoss, setStopLoss] = useState("4");
  const [riskReward, setRiskReward] = useState("1.25");

  const [trailingStop, setTrailingStop] = useState(true);
  const [trailingStopDistance, setTrailingStopDistance] =
    useState("2");

  const [breakEven, setBreakEven] = useState(true);
  const [breakEvenTrigger, setBreakEvenTrigger] =
    useState("2");

  const [dailyProfit, setDailyProfit] = useState("20");
  const [dailyLoss, setDailyLoss] = useState("12");
  const [maxStopLosses, setMaxStopLosses] = useState("3");
  const [maxOpenTrades, setMaxOpenTrades] = useState("1");

  const [maxSpread, setMaxSpread] = useState("30");
  const [cooldown, setCooldown] = useState("5");

  const [buyEnabled, setBuyEnabled] = useState(true);
  const [sellEnabled, setSellEnabled] = useState(true);
  const [sessionFilter, setSessionFilter] = useState(true);
  const [newsFilter, setNewsFilter] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);

  const [signalThreshold, setSignalThreshold] =
    useState("80");

  const [minConfirmations, setMinConfirmations] =
    useState("5");

  const [bots, setBots] = useState<Bot[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    minHeight: "46px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,.14)",
    background: "#081525",
    color: "#f8fafc",
    outline: "none",
    fontSize: "14px",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  const labelStyle = {
    display: "block",
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "8px",
  };

  const cardStyle = {
    borderRadius: "22px",
    background: "rgba(15,23,42,.82)",
    border: "1px solid rgba(148,163,184,.12)",
    padding: "20px",
  };

  const sectionTitleStyle = {
    margin: 0,
    fontSize: "19px",
    color: "#f8fafc",
  };

  const sectionDescriptionStyle = {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.8,
  };

  const Toggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
  }) => {
    return (
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        style={{
          width: "48px",
          height: "26px",
          border: "none",
          borderRadius: "999px",
          padding: "3px",
          background: enabled
            ? "rgba(34,211,238,.35)"
            : "rgba(100,116,139,.25)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: enabled ? "#67e8f9" : "#64748b",
            transform: enabled
              ? "translateX(22px)"
              : "translateX(0)",
            transition: "all .2s ease",
          }}
        />
      </button>
    );
  };

  const SettingRow = ({
    title,
    description,
    enabled,
    onChange,
  }: {
    title: string;
    description: string;
    enabled: boolean;
    onChange: (value: boolean) => void;
  }) => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "15px 0",
          borderBottom:
            "1px solid rgba(148,163,184,.08)",
        }}
      >
        <div>
          <div
            style={{
              color: "#e2e8f0",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "#64748b",
              fontSize: "11px",
              marginTop: "4px",
              lineHeight: 1.7,
            }}
          >
            {description}
          </div>
        </div>

        <Toggle enabled={enabled} onChange={onChange} />
      </div>
    );
  };

  const fillFromBot = (bot: Bot) => {
    setBotId(bot.id);
    setBotName(bot.name);
    setMarket(
      bot.symbol === "BTCUSDT"
        ? "BTC/USDT"
        : bot.symbol === "ETHUSDT"
        ? "ETH/USDT"
        : bot.symbol === "EURUSD"
        ? "EUR/USD"
        : "XAU/USD"
    );

    setStrategy(
      bot.type === "SCALPING"
        ? "Scalping"
        : bot.type === "AI"
        ? "AI Strategy"
        : bot.type === "SMART"
        ? "Smart Trading"
        : "Trend Following"
    );

    setTimeframe(bot.timeframe || "15m");

    setLotMode(bot.lotMode || "FIXED");
    setLotSize(String(bot.lotSize ?? 0.01));
    setRiskPercent(String(bot.riskPercent ?? 1));

    setTakeProfit(String(bot.takeProfit ?? 5));
    setStopLoss(String(bot.stopLoss ?? 4));
    setRiskReward(String(bot.riskReward ?? 1.25));

    setTrailingStop(bot.trailingStop);
    setTrailingStopDistance(
      String(bot.trailingStopDistance ?? 2)
    );

    setBreakEven(bot.breakEven);
    setBreakEvenTrigger(
      String(bot.breakEvenTrigger ?? 2)
    );

    setDailyProfit(
      String(bot.dailyProfitStop ?? 20)
    );

    setDailyLoss(
      String(bot.dailyLossLimit ?? 12)
    );

    setMaxStopLosses(
      String(bot.maxDailyStopLosses ?? 3)
    );

    setMaxOpenTrades(
      String(bot.maxOpenTrades ?? 1)
    );

    setBuyEnabled(bot.buyEnabled);
    setSellEnabled(bot.sellEnabled);

    setMaxSpread(String(bot.maxSpread ?? 30));
    setCooldown(String(bot.cooldownMinutes ?? 5));

    setSessionFilter(bot.sessionFilter);
    setNewsFilter(bot.newsFilter);
    setTelegramEnabled(bot.telegramEnabled);
    setBotEnabled(bot.isActive);

    setSignalThreshold(
      String(bot.signalThreshold ?? 80)
    );

    setMinConfirmations(
      String(bot.minConfirmations ?? 5)
    );
  };

  const loadBots = async () => {
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
          data.error || "خطا در دریافت ربات‌ها."
        );
      }

      const loadedBots: Bot[] = data.bots || [];

      setBots(loadedBots);

      if (loadedBots.length > 0) {
        fillFromBot(loadedBots[0]);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBots();
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const symbol =
        market === "XAU/USD"
          ? "XAUUSD"
          : market === "BTC/USDT"
          ? "BTCUSDT"
          : market === "ETH/USDT"
          ? "ETHUSDT"
          : "EURUSD";

      const type =
        strategy === "Scalping"
          ? "SCALPING"
          : strategy === "AI Strategy"
          ? "AI"
          : strategy === "Smart Trading"
          ? "SMART"
          : "TREND";

      const payload = {
        id: botId || undefined,

        name: botName,
        symbol,
        timeframe,

        type,
        category: "TRADING",
        description:
          "Trading AI automated trading bot",

        marketType:
          market.includes("BTC") ||
          market.includes("ETH")
            ? "CRYPTO"
            : market === "XAU/USD"
            ? "COMMODITY"
            : "FOREX",

        isActive: botEnabled,

        lotMode,
        lotSize: Number(lotSize),
        riskPercent: Number(riskPercent),

        takeProfit: Number(takeProfit),
        stopLoss: Number(stopLoss),
        riskReward: Number(riskReward),

        trailingStop,
        trailingStopDistance: Number(
          trailingStopDistance
        ),

        breakEven,
        breakEvenTrigger: Number(breakEvenTrigger),

        dailyProfitStop: Number(dailyProfit),
        dailyLossLimit: Number(dailyLoss),
        maxDailyStopLosses: Number(maxStopLosses),
        maxOpenTrades: Number(maxOpenTrades),

        buyEnabled,
        sellEnabled,

        maxSpread: Number(maxSpread),
        cooldownMinutes: Number(cooldown),

        sessionFilter,
        newsFilter,

        signalThreshold: Number(signalThreshold),
        minConfirmations: Number(
          minConfirmations
        ),

        telegramEnabled,
      };

      const response = await fetch("/api/bots", {
        method: botId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در ذخیره تنظیمات."
        );
      }

      const savedBot: Bot = data.bot;

      setBotId(savedBot.id);

      setBots((currentBots) => {
        const exists = currentBots.some(
          (bot) => bot.id === savedBot.id
        );

        if (exists) {
          return currentBots.map((bot) =>
            bot.id === savedBot.id
              ? savedBot
              : bot
          );
        }

        return [savedBot, ...currentBots];
      });

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "ذخیره تنظیمات انجام نشد."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(34,211,238,.10), transparent 30%), radial-gradient(circle at bottom left, rgba(37,99,235,.10), transparent 30%), #06101e",
        color: "#f8fafc",
        padding: "20px 14px 70px",
        fontFamily: "Arial, Tahoma, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1250px",
          margin: "0 auto",
        }}
      >
        <section
          style={{
            ...cardStyle,
            marginBottom: "18px",
            padding: "24px",
            background:
              "linear-gradient(145deg, rgba(8,47,73,.72), rgba(15,23,42,.88))",
            borderColor: "rgba(34,211,238,.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "6px 11px",
                  borderRadius: "999px",
                  background: "rgba(34,211,238,.08)",
                  border:
                    "1px solid rgba(34,211,238,.16)",
                  color: "#67e8f9",
                  fontSize: "11px",
                  marginBottom: "10px",
                }}
              >
                🤖 BOT MANAGEMENT CENTER
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 5vw, 40px)",
                }}
              >
                ساخت و مدیریت ربات
              </h1>

              <p
                style={{
                  color: "#94a3b8",
                  margin: "8px 0 0",
                  lineHeight: 1.8,
                  fontSize: "13px",
                }}
              >
                تنظیمات ربات اکنون مستقیماً در دیتابیس
                ذخیره می‌شود.
              </p>
            </div>

            <div
              style={{
                minWidth: "170px",
                padding: "14px 16px",
                borderRadius: "16px",
                background: "rgba(2,8,23,.35)",
                border:
                  "1px solid rgba(148,163,184,.10)",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "10px",
                  marginBottom: "5px",
                }}
              >
                وضعیت ربات
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    background: botEnabled
                      ? "#22c55e"
                      : "#64748b",
                  }}
                />

                <strong
                  style={{
                    color: botEnabled
                      ? "#4ade80"
                      : "#94a3b8",
                  }}
                >
                  {botEnabled ? "فعال" : "خاموش"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {loading && (
          <section style={{ ...cardStyle, marginBottom: "18px" }}>
            <div
              style={{
                textAlign: "center",
                color: "#94a3b8",
                padding: "12px",
              }}
            >
              در حال دریافت تنظیمات ربات...
            </div>
          </section>
        )}

        {error && (
          <section
            style={{
              ...cardStyle,
              marginBottom: "18px",
              borderColor: "rgba(248,113,113,.25)",
              background: "rgba(127,29,29,.18)",
            }}
          >
            <div
              style={{
                color: "#fca5a5",
                fontSize: "13px",
                lineHeight: 1.8,
              }}
            >
              ⚠️ {error}
            </div>
          </section>
        )}

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              ⚙️ مشخصات ربات
            </h2>

            <p style={sectionDescriptionStyle}>
              مشخصات اصلی ربات را انتخاب و تنظیم کنید.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <label style={labelStyle}>نام ربات</label>

              <input
                value={botName}
                onChange={(e) =>
                  setBotName(e.target.value)
                }
                style={inputStyle}
                placeholder="مثلاً Gold AI Bot"
              />
            </div>

            <div>
              <label style={labelStyle}>بازار</label>

              <select
                value={market}
                onChange={(e) =>
                  setMarket(e.target.value)
                }
                style={selectStyle}
              >
                <option value="XAU/USD">
                  Gold — XAU/USD
                </option>

                <option value="BTC/USDT">
                  Bitcoin — BTC/USDT
                </option>

                <option value="ETH/USDT">
                  Ethereum — ETH/USDT
                </option>

                <option value="EUR/USD">
                  Euro / Dollar — EUR/USD
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                استراتژی
              </label>

              <select
                value={strategy}
                onChange={(e) =>
                  setStrategy(e.target.value)
                }
                style={selectStyle}
              >
                <option value="Trend Following">
                  Trend Following
                </option>

                <option value="Scalping">
                  Scalping
                </option>

                <option value="Smart Trading">
                  Smart Trading
                </option>

                <option value="AI Strategy">
                  AI Strategy
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                تایم‌فریم
              </label>

              <select
                value={timeframe}
                onChange={(e) =>
                  setTimeframe(e.target.value)
                }
                style={selectStyle}
              >
                <option value="1m">1 دقیقه</option>
                <option value="5m">5 دقیقه</option>
                <option value="15m">15 دقیقه</option>
                <option value="30m">30 دقیقه</option>
                <option value="1h">1 ساعت</option>
                <option value="4h">4 ساعت</option>
                <option value="1d">روزانه</option>
              </select>
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              💰 حجم معامله و مدیریت ریسک
            </h2>

            <p style={sectionDescriptionStyle}>
              حجم ثابت یا حجم محاسبه‌شده بر اساس درصد ریسک.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <label style={labelStyle}>
                روش تعیین حجم
              </label>

              <select
                value={lotMode}
                onChange={(e) =>
                  setLotMode(e.target.value)
                }
                style={selectStyle}
              >
                <option value="FIXED">
                  حجم ثابت (Fixed Lot)
                </option>

                <option value="RISK_PERCENT">
                  بر اساس درصد ریسک
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Lot Size
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={lotSize}
                onChange={(e) =>
                  setLotSize(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                ریسک هر معامله (%)
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={riskPercent}
                onChange={(e) =>
                  setRiskPercent(e.target.value)
                }
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              🎯 حد سود و حد ضرر
            </h2>

            <p style={sectionDescriptionStyle}>
              کنترل TP، SL و نسبت ریسک به بازده.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Take Profit
              </label>

              <input
                type="number"
                step="0.1"
                value={takeProfit}
                onChange={(e) =>
                  setTakeProfit(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Stop Loss
              </label>

              <input
                type="number"
                step="0.1"
                value={stopLoss}
                onChange={(e) =>
                  setStopLoss(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Risk / Reward
              </label>

              <input
                type="number"
                min="0"
                step="0.05"
                value={riskReward}
                onChange={(e) =>
                  setRiskReward(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Trailing Stop Distance
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={trailingStopDistance}
                onChange={(e) =>
                  setTrailingStopDistance(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Break Even Trigger
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={breakEvenTrigger}
                onChange={(e) =>
                  setBreakEvenTrigger(e.target.value)
                }
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              🛡️ محدودیت‌های روزانه
            </h2>

            <p style={sectionDescriptionStyle}>
              توقف خودکار پس از رسیدن به حدود تعیین‌شده.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <label style={labelStyle}>
                توقف بعد از سود روزانه
              </label>

              <input
                type="number"
                step="0.1"
                value={dailyProfit}
                onChange={(e) =>
                  setDailyProfit(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                حداکثر ضرر روزانه
              </label>

              <input
                type="number"
                step="0.1"
                value={dailyLoss}
                onChange={(e) =>
                  setDailyLoss(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                حداکثر Stop Loss روزانه
              </label>

              <input
                type="number"
                min="0"
                value={maxStopLosses}
                onChange={(e) =>
                  setMaxStopLosses(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                حداکثر معاملات باز
              </label>

              <input
                type="number"
                min="1"
                value={maxOpenTrades}
                onChange={(e) =>
                  setMaxOpenTrades(e.target.value)
                }
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "10px" }}>
            <h2 style={sectionTitleStyle}>
              🧠 کنترل تحلیل و سیگنال
            </h2>

            <p style={sectionDescriptionStyle}>
              این تنظیمات فعلاً معیارهای مورد نیاز برای اجازه
              ورود ربات را ذخیره می‌کنند.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginTop: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                حداقل امتیاز سیگنال
              </label>

              <input
                type="number"
                min="0"
                max="100"
                value={signalThreshold}
                onChange={(e) =>
                  setSignalThreshold(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                حداقل تعداد تأییدها
              </label>

              <input
                type="number"
                min="0"
                value={minConfirmations}
                onChange={(e) =>
                  setMinConfirmations(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "10px" }}>
            <h2 style={sectionTitleStyle}>
              ⚡ تنظیمات اجرای معامله
            </h2>

            <p style={sectionDescriptionStyle}>
              قوانین اجرای ربات و فیلترهای حفاظتی.
            </p>
          </div>

          <SettingRow
            title="معاملات BUY"
            description="اجازه ارسال معاملات خرید"
            enabled={buyEnabled}
            onChange={setBuyEnabled}
          />

          <SettingRow
            title="معاملات SELL"
            description="اجازه ارسال معاملات فروش"
            enabled={sellEnabled}
            onChange={setSellEnabled}
          />

          <SettingRow
            title="Trailing Stop"
            description="جابجایی حد ضرر همراه با حرکت قیمت"
            enabled={trailingStop}
            onChange={setTrailingStop}
          />

          <SettingRow
            title="Break Even"
            description="انتقال حد ضرر به نقطه ورود"
            enabled={breakEven}
            onChange={setBreakEven}
          />

          <SettingRow
            title="Session Filter"
            description="معامله فقط در سشن‌های مجاز"
            enabled={sessionFilter}
            onChange={setSessionFilter}
          />

          <SettingRow
            title="News Filter"
            description="فیلتر شرایط خبری پرریسک"
            enabled={newsFilter}
            onChange={setNewsFilter}
          />

          <SettingRow
            title="Telegram"
            description="ارسال وضعیت ربات به Telegram"
            enabled={telegramEnabled}
            onChange={setTelegramEnabled}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginTop: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                حداکثر Spread
              </label>

              <input
                type="number"
                value={maxSpread}
                onChange={(e) =>
                  setMaxSpread(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                فاصله بین معاملات
              </label>

              <input
                type="number"
                value={cooldown}
                onChange={(e) =>
                  setCooldown(e.target.value)
                }
                style={inputStyle}
              />

              <small
                style={{
                  display: "block",
                  color: "#64748b",
                  marginTop: "6px",
                  fontSize: "10px",
                }}
              >
                دقیقه
              </small>
            </div>
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            marginBottom: "18px",
            background:
              "linear-gradient(145deg, rgba(8,47,73,.48), rgba(15,23,42,.88))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  marginBottom: "5px",
                }}
              >
                ربات انتخاب‌شده
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "23px",
                }}
              >
                {botName}
              </h2>

              <div
                style={{
                  color: "#64748b",
                  marginTop: "6px",
                  fontSize: "12px",
                }}
              >
                {market} • {strategy} • {timeframe}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "10px",
                  }}
                >
                  اجرای ربات
                </div>

                <div
                  style={{
                    color: botEnabled
                      ? "#4ade80"
                      : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: 800,
                    marginTop: "4px",
                  }}
                >
                  {botEnabled
                    ? "فعال است"
                    : "خاموش است"}
                </div>
              </div>

              <Toggle
                enabled={botEnabled}
                onChange={setBotEnabled}
              />
            </div>
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            marginBottom: "18px",
          }}
        >
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            style={{
              width: "100%",
              minHeight: "54px",
              borderRadius: "15px",
              border:
                "1px solid rgba(34,211,238,.28)",
              background: saving
                ? "rgba(71,85,105,.25)"
                : "linear-gradient(135deg, rgba(8,145,178,.28), rgba(37,99,235,.20))",
              color: saving
                ? "#94a3b8"
                : "#67e8f9",
              fontSize: "15px",
              fontWeight: 800,
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "⏳ در حال ذخیره..."
              : saved
              ? "✓ تنظیمات در دیتابیس ذخیره شد"
              : botId
              ? "💾 ذخیره تغییرات ربات"
              : "🤖 ساخت و ذخیره ربات"}
          </button>
        </section>

        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              🤖 ربات‌های من
            </h2>

            <p style={sectionDescriptionStyle}>
              ربات‌های واقعی ذخیره‌شده در دیتابیس.
            </p>
          </div>

          {bots.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
                borderRadius: "16px",
                background: "rgba(2,8,23,.25)",
              }}
            >
              هنوز رباتی ساخته نشده است.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  style={{
                    padding: "18px",
                    borderRadius: "18px",
                    background: "#0b1929",
                    border:
                      bot.id === botId
                        ? "1px solid rgba(34,211,238,.35)"
                        : "1px solid rgba(148,163,184,.09)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "16px",
                      }}
                    >
                      {bot.name}
                    </strong>

                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: "8px",
                        background: bot.isActive
                          ? "rgba(34,197,94,.08)"
                          : "rgba(100,116,139,.08)",
                        color: bot.isActive
                          ? "#4ade80"
                          : "#94a3b8",
                        fontSize: "10px",
                      }}
                    >
                      {bot.isActive
                        ? "فعال"
                        : "خاموش"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      color: "#94a3b8",
                      fontSize: "12px",
                      lineHeight: 2,
                    }}
                  >
                    <div>
                      بازار:{" "}
                      <strong
                        style={{
                          color: "#e2e8f0",
                        }}
                      >
                        {bot.symbol}
                      </strong>
                    </div>

                    <div>
                      تایم‌فریم:{" "}
                      <strong
                        style={{
                          color: "#e2e8f0",
                        }}
                      >
                        {bot.timeframe}
                      </strong>
                    </div>

                    <div>
                      Lot:{" "}
                      <strong
                        style={{
                          color: "#e2e8f0",
                        }}
                      >
                        {bot.lotSize}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fillFromBot(bot)
                    }
                    style={{
                      width: "100%",
                      marginTop: "14px",
                      minHeight: "40px",
                      borderRadius: "11px",
                      border:
                        "1px solid rgba(148,163,184,.12)",
                      background:
                        "rgba(2,8,23,.35)",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    مدیریت ربات
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...cardStyle }}>
          <div style={{ marginBottom: "14px" }}>
            <h2 style={sectionTitleStyle}>
              🛡️ امنیت و کنترل ریسک
            </h2>

            <p style={sectionDescriptionStyle}>
              محدودیت‌های ذخیره‌شده در ربات برای کنترل ریسک
              استفاده خواهند شد.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "10px",
            }}
          >
            {[
              [
                "✓",
                "کنترل ریسک",
                "بررسی حجم، TP و SL",
              ],
              [
                "✓",
                "Daily Stop",
                "توقف پس از رسیدن به حد روزانه",
              ],
              [
                "✓",
                "Trade Limit",
                "محدود کردن معاملات باز",
              ],
              [
                "✓",
                "Spread Protection",
                "عدم ورود در اسپرد نامناسب",
              ],
            ].map(([icon, title, description]) => (
              <div
                key={title}
                style={{
                  padding: "15px",
                  borderRadius: "15px",
                  background:
                    "rgba(2,8,23,.28)",
                  border:
                    "1px solid rgba(148,163,184,.08)",
                }}
              >
                <div
                  style={{
                    color: "#4ade80",
                    fontSize: "18px",
                    marginBottom: "8px",
                  }}
                >
                  {icon}
                </div>

                <strong
                  style={{
                    display: "block",
                    fontSize: "13px",
                  }}
                >
                  {title}
                </strong>

                <span
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "10px",
                    lineHeight: 1.7,
                    marginTop: "5px",
                  }}
                >
                  {description}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
