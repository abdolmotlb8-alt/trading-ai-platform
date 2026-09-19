"use client";

import { useState } from "react";

type Bot = {
  name: string;
  market: string;
  strategy: string;
  status: string;
};

export default function BotBuilderPage() {
  const [botName, setBotName] = useState("Gold AI Bot");
  const [market, setMarket] = useState("XAU/USD");
  const [strategy, setStrategy] = useState("Trend Following");

  const [lotMode, setLotMode] = useState("fixed");
  const [lotSize, setLotSize] = useState("0.01");
  const [riskPercent, setRiskPercent] = useState("1");

  const [takeProfit, setTakeProfit] = useState("5");
  const [stopLoss, setStopLoss] = useState("4");
  const [riskReward, setRiskReward] = useState("1.25");

  const [dailyProfit, setDailyProfit] = useState("20");
  const [dailyLoss, setDailyLoss] = useState("12");
  const [maxStopLosses, setMaxStopLosses] = useState("3");
  const [maxOpenTrades, setMaxOpenTrades] = useState("1");

  const [maxSpread, setMaxSpread] = useState("30");
  const [cooldown, setCooldown] = useState("5");

  const [trailingStop, setTrailingStop] = useState(true);
  const [breakEven, setBreakEven] = useState(true);
  const [buyEnabled, setBuyEnabled] = useState(true);
  const [sellEnabled, setSellEnabled] = useState(true);
  const [sessionFilter, setSessionFilter] = useState(true);
  const [newsFilter, setNewsFilter] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);

  const [saved, setSaved] = useState(false);

  const [bots] = useState<Bot[]>([
    {
      name: "Gold AI Bot",
      market: "XAU/USD",
      strategy: "Trend Following",
      status: "فعال",
    },
    {
      name: "Crypto AI Bot",
      market: "BTC/USDT",
      strategy: "Smart Trading",
      status: "آماده",
    },
  ]);

  const saveSettings = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

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
          transition: "all .2s ease",
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
            boxShadow: enabled
              ? "0 0 12px rgba(34,211,238,.6)"
              : "none",
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
          borderBottom: "1px solid rgba(148,163,184,.08)",
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
        {/* Header */}
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
                  border: "1px solid rgba(34,211,238,.16)",
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
                ساخت، تنظیم و کنترل کامل ربات‌های معاملاتی Trading AI
              </p>
            </div>

            <div
              style={{
                minWidth: "170px",
                padding: "14px 16px",
                borderRadius: "16px",
                background: "rgba(2,8,23,.35)",
                border: "1px solid rgba(148,163,184,.10)",
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
                    boxShadow: botEnabled
                      ? "0 0 12px rgba(34,197,94,.7)"
                      : "none",
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

        {/* Bot identity */}
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
                onChange={(e) => setBotName(e.target.value)}
                style={inputStyle}
                placeholder="مثلاً Gold AI Bot"
              />
            </div>

            <div>
              <label style={labelStyle}>بازار</label>

              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                style={selectStyle}
              >
                <option value="XAU/USD">Gold — XAU/USD</option>
                <option value="BTC/USDT">Bitcoin — BTC/USDT</option>
                <option value="ETH/USDT">
                  Ethereum — ETH/USDT
                </option>
                <option value="EUR/USD">
                  Euro / Dollar — EUR/USD
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>استراتژی</label>

              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
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
          </div>
        </section>

        {/* Position sizing */}
        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              💰 حجم معامله و مدیریت ریسک
            </h2>

            <p style={sectionDescriptionStyle}>
              حجم معامله را ثابت کنید یا اجازه دهید بر اساس درصد
              ریسک محاسبه شود.
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
              <label style={labelStyle}>روش تعیین حجم</label>

              <select
                value={lotMode}
                onChange={(e) => setLotMode(e.target.value)}
                style={selectStyle}
              >
                <option value="fixed">
                  حجم ثابت (Fixed Lot)
                </option>

                <option value="risk">
                  بر اساس درصد ریسک
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Lot Size</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
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

          <div
            style={{
              marginTop: "15px",
              padding: "13px 15px",
              borderRadius: "13px",
              background: "rgba(250,204,21,.06)",
              border: "1px solid rgba(250,204,21,.12)",
              color: "#facc15",
              fontSize: "11px",
              lineHeight: 1.8,
            }}
          >
            ⚠️ حجم Lot و درصد ریسک باید متناسب با موجودی حساب،
            حد ضرر و قوانین بروکر انتخاب شود.
          </div>
        </section>

        {/* TP SL */}
        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              🎯 حد سود و حد ضرر
            </h2>

            <p style={sectionDescriptionStyle}>
              مدیریت کامل TP، SL و نسبت ریسک به بازده.
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

              <small
                style={{
                  display: "block",
                  color: "#64748b",
                  marginTop: "6px",
                  fontSize: "10px",
                }}
              >
                مقدار هدف سود هر معامله
              </small>
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

              <small
                style={{
                  display: "block",
                  color: "#64748b",
                  marginTop: "6px",
                  fontSize: "10px",
                }}
              >
                مقدار حداکثر ضرر هر معامله
              </small>
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

              <small
                style={{
                  display: "block",
                  color: "#64748b",
                  marginTop: "6px",
                  fontSize: "10px",
                }}
              >
                نسبت ریسک به بازده
              </small>
            </div>
          </div>
        </section>

        {/* Daily limits */}
        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              🛡️ محدودیت‌های روزانه
            </h2>

            <p style={sectionDescriptionStyle}>
              برای جلوگیری از ادامه معامله بعد از رسیدن به
              محدودیت‌های تعیین‌شده.
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

              <small
                style={{
                  color: "#64748b",
                  fontSize: "10px",
                  display: "block",
                  marginTop: "6px",
                }}
              >
                مثال: 20 دلار
              </small>
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

              <small
                style={{
                  color: "#64748b",
                  fontSize: "10px",
                  display: "block",
                  marginTop: "6px",
                }}
              >
                مثال: 12 دلار
              </small>
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

        {/* Trade execution */}
        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "10px" }}>
            <h2 style={sectionTitleStyle}>
              ⚡ تنظیمات اجرای معامله
            </h2>

            <p style={sectionDescriptionStyle}>
              قوانین ورود و کنترل شرایط اجرای معامله.
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
            description="جابجایی خودکار حد ضرر همراه با حرکت قیمت"
            enabled={trailingStop}
            onChange={setTrailingStop}
          />

          <SettingRow
            title="Break Even"
            description="انتقال حد ضرر به نقطه ورود پس از شرایط تعیین‌شده"
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
            description="جلوگیری از معامله در شرایط خبری پرریسک"
            enabled={newsFilter}
            onChange={setNewsFilter}
          />

          <SettingRow
            title="Telegram"
            description="ارسال رویدادها و وضعیت ربات به Telegram"
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

        {/* Current bot */}
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
                {market} • {strategy}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  textAlign: "left",
                }}
              >
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

        {/* Save */}
        <section
          style={{
            ...cardStyle,
            marginBottom: "18px",
          }}
        >
          <button
            type="button"
            onClick={saveSettings}
            style={{
              width: "100%",
              minHeight: "54px",
              borderRadius: "15px",
              border: "1px solid rgba(34,211,238,.28)",
              background:
                "linear-gradient(135deg, rgba(8,145,178,.28), rgba(37,99,235,.20))",
              color: "#67e8f9",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saved
              ? "✓ تنظیمات در این صفحه ذخیره شد"
              : "💾 ذخیره تنظیمات ربات"}
          </button>

          <p
            style={{
              textAlign: "center",
              color: "#475569",
              fontSize: "10px",
              lineHeight: 1.8,
              margin: "10px 0 0",
            }}
          >
            در مرحله بعد این تنظیمات را به دیتابیس متصل می‌کنیم
            تا واقعاً برای هر ربات ذخیره شوند.
          </p>
        </section>

        {/* My bots */}
        <section style={{ ...cardStyle, marginBottom: "18px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionTitleStyle}>
              🤖 ربات‌های من
            </h2>

            <p style={sectionDescriptionStyle}>
              ربات‌های ساخته‌شده و وضعیت فعلی آن‌ها.
            </p>
          </div>

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
                key={bot.name}
                style={{
                  padding: "18px",
                  borderRadius: "18px",
                  background: "#0b1929",
                  border:
                    "1px solid rgba(148,163,184,.09)",
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
                      background:
                        bot.status === "فعال"
                          ? "rgba(34,197,94,.08)"
                          : "rgba(250,204,21,.08)",
                      color:
                        bot.status === "فعال"
                          ? "#4ade80"
                          : "#facc15",
                      fontSize: "10px",
                    }}
                  >
                    {bot.status}
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
                    <strong style={{ color: "#e2e8f0" }}>
                      {bot.market}
                    </strong>
                  </div>

                  <div>
                    استراتژی:{" "}
                    <strong style={{ color: "#e2e8f0" }}>
                      {bot.strategy}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    width: "100%",
                    marginTop: "14px",
                    minHeight: "40px",
                    borderRadius: "11px",
                    border:
                      "1px solid rgba(148,163,184,.12)",
                    background: "rgba(2,8,23,.35)",
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
        </section>

        {/* Security */}
        <section style={{ ...cardStyle }}>
          <div style={{ marginBottom: "14px" }}>
            <h2 style={sectionTitleStyle}>
              🛡️ امنیت و کنترل ریسک
            </h2>

            <p style={sectionDescriptionStyle}>
              لایه‌های حفاظتی برای جلوگیری از اجرای معاملات
              خارج از قوانین تعیین‌شده.
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
                "بررسی حجم و حد ضرر قبل از معامله",
              ],
              [
                "✓",
                "Daily Stop",
                "توقف خودکار پس از رسیدن به حد روزانه",
              ],
              [
                "✓",
                "Trade Limit",
                "محدود کردن تعداد معاملات باز",
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
                  background: "rgba(2,8,23,.28)",
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
