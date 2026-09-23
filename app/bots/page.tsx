"use client";

import { useEffect, useMemo, useState } from "react";

type ExecutionMode = "MANUAL" | "AUTO_APPROVAL";

type Bot = {
  id: string;
  name: string;
  type?: string;
  category?: string;
  symbol?: string;
  timeframe?: string;
  marketType?: string;

  isActive?: boolean;

  lotSize?: number;
  riskPercent?: number;

  takeProfit?: number;
  stopLoss?: number;
  riskReward?: number;

  trailingStop?: boolean;
  trailingStopDistance?: number;

  breakEven?: boolean;
  breakEvenTrigger?: number;

  dailyProfitStop?: number;
  dailyLossLimit?: number;
  maxDailyStopLosses?: number;
  maxOpenTrades?: number;

  buyEnabled?: boolean;
  sellEnabled?: boolean;

  maxSpread?: number;
  cooldownMinutes?: number;

  sessionFilter?: boolean;
  newsFilter?: boolean;

  signalThreshold?: number;
  minConfirmations?: number;

  telegramEnabled?: boolean;

  analysisConfig?: Config;

  createdAt?: string;
  updatedAt?: string;
};

type Config = {
  executionMode: ExecutionMode;

  autoStopAfterWins: number;
  autoStopAfterLosses: number;

  requireConfirmation: boolean;

  multiTimeframe: boolean;
  supportResistance: boolean;
  breakoutFilter: boolean;
  pullbackFilter: boolean;
  trendFilter: boolean;
  momentumFilter: boolean;
  volumeFilter: boolean;
  candlePatternFilter: boolean;
  volatilityFilter: boolean;

  minSignalScore: number;
  minConfirmations: number;

  preventDuplicateSignals: boolean;
  signalCooldownMinutes: number;

  stopAfterActiveSignal: boolean;

  useTP1: boolean;
  useTP2: boolean;
  useTP3: boolean;

  riskMode: "PERCENT" | "FIXED_LOT" | "FIXED_MONEY";

  fixedRiskMoney: number;

  allowCounterTrend: boolean;

  maxSignalsPerDay: number;
};

const DEFAULT_CONFIG: Config = {
  executionMode: "MANUAL",

  autoStopAfterWins: 0,
  autoStopAfterLosses: 0,

  requireConfirmation: true,

  multiTimeframe: true,
  supportResistance: true,
  breakoutFilter: true,
  pullbackFilter: true,
  trendFilter: true,
  momentumFilter: true,
  volumeFilter: true,
  candlePatternFilter: true,
  volatilityFilter: true,

  minSignalScore: 80,
  minConfirmations: 5,

  preventDuplicateSignals: true,
  signalCooldownMinutes: 5,

  stopAfterActiveSignal: true,

  useTP1: true,
  useTP2: true,
  useTP3: true,

  riskMode: "PERCENT",

  fixedRiskMoney: 10,

  allowCounterTrend: false,

  maxSignalsPerDay: 10,
};

const SYMBOLS = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "BTCUSDT",
  "ETHUSDT",
];

const TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
];

const MARKET_TYPES = ["FOREX", "CRYPTO"];

function normalizeBot(bot: Bot): Bot {
  return {
    ...bot,
    analysisConfig: {
      ...DEFAULT_CONFIG,
      ...(bot.analysisConfig || {}),
    },
  };
}

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [newBot, setNewBot] = useState({
    name: "AI Analyst",
    symbol: "XAUUSD",
    timeframe: "15m",
    marketType: "FOREX",
  });

  const selectedBot = useMemo(() => {
    return bots.find((bot) => bot.id === selectedId) || null;
  }, [bots, selectedId]);

  const filteredBots = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return bots;

    return bots.filter((bot) =>
      [
        bot.name,
        bot.symbol,
        bot.timeframe,
        bot.marketType,
        bot.type,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(q)
        )
    );
  }, [bots, search]);

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
          data?.error || "خطا در دریافت ربات‌ها"
        );
      }

      const receivedBots: Bot[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.bots)
          ? data.bots
          : [];

      const normalized = receivedBots.map(normalizeBot);

      setBots(normalized);

      if (normalized.length > 0) {
        setSelectedId((current) => current || normalized[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات ربات‌ها"
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
    if (!selectedBot) return;

    setBots((current) =>
      current.map((bot) =>
        bot.id === selectedBot.id
          ? normalizeBot({
              ...bot,
              ...patch,
            })
          : bot
      )
    );
  }

  function updateConfig(
    patch: Partial<Config>
  ) {
    if (!selectedBot) return;

    const currentConfig = {
      ...DEFAULT_CONFIG,
      ...(selectedBot.analysisConfig || {}),
    };

    updateSelected({
      analysisConfig: {
        ...currentConfig,
        ...patch,
      },
    });
  }

  async function saveBot() {
    if (!selectedBot) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = normalizeBot(selectedBot);

      const response = await fetch("/api/bots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "ذخیره تنظیمات انجام نشد"
        );
      }

      const updatedBot = normalizeBot(
        data?.bot || data
      );

      setBots((current) =>
        current.map((bot) =>
          bot.id === updatedBot.id
            ? updatedBot
            : bot
        )
      );

      setSuccess("تنظیمات ربات با موفقیت ذخیره شد.");
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

  async function toggleBot(bot: Bot) {
    try {
      setError("");
      setSuccess("");

      const updated = {
        ...normalizeBot(bot),
        isActive: !bot.isActive,
      };

      const response = await fetch("/api/bots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "تغییر وضعیت ربات انجام نشد"
        );
      }

      const result = normalizeBot(data?.bot || data);

      setBots((current) =>
        current.map((item) =>
          item.id === result.id ? result : item
        )
      );

      if (result.id === selectedId) {
        setSelectedId(result.id);
      }

      setSuccess(
        result.isActive
          ? "ربات فعال شد."
          : "ربات متوقف شد."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در تغییر وضعیت ربات"
      );
    }
  }

  async function createBot() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const config = {
        ...DEFAULT_CONFIG,
      };

      const payload = {
        name: newBot.name.trim() || "AI Analyst",
        type: "ANALYST",
        category: "AI",
        symbol: newBot.symbol,
        timeframe: newBot.timeframe,
        marketType: newBot.marketType,

        isActive: false,

        lotSize: 0.01,
        riskPercent: 1,

        takeProfit: 3,
        stopLoss: 1,
        riskReward: 3,

        trailingStop: true,
        trailingStopDistance: 1,

        breakEven: true,
        breakEvenTrigger: 1,

        dailyProfitStop: 20,
        dailyLossLimit: 12,
        maxDailyStopLosses: 3,
        maxOpenTrades: 1,

        buyEnabled: true,
        sellEnabled: true,

        maxSpread: 30,
        cooldownMinutes: 5,

        sessionFilter: true,
        newsFilter: true,

        signalThreshold: 80,
        minConfirmations: 5,

        telegramEnabled: true,

        analysisConfig: config,
      };

      const response = await fetch("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "ساخت ربات انجام نشد"
        );
      }

      const created = normalizeBot(
        data?.bot || data
      );

      setBots((current) => [
        created,
        ...current,
      ]);

      setSelectedId(created.id);
      setShowCreate(false);

      setSuccess("ربات جدید ساخته شد.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ساخت ربات"
      );
    } finally {
      setSaving(false);
    }
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...(selectedBot?.analysisConfig || {}),
  };

  const activeCount = bots.filter(
    (bot) => bot.isActive
  ).length;

  return (
    <main dir="rtl" className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top right, rgba(245, 183, 55, .12), transparent 30%),
            radial-gradient(circle at bottom left, rgba(0, 212, 255, .08), transparent 30%),
            #05070b;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        .shell {
          max-width: 1500px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 27px;
          background:
            linear-gradient(145deg, rgba(255, 205, 92, .30), rgba(124, 78, 5, .14));
          border: 1px solid rgba(255, 204, 92, .32);
          box-shadow:
            0 0 30px rgba(245, 183, 55, .12),
            inset 0 1px rgba(255,255,255,.08);
        }

        h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .subtitle {
          margin-top: 7px;
          color: #8d98a8;
          font-size: 14px;
          line-height: 1.7;
        }

        .headerActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .btn {
          border: 1px solid rgba(255,255,255,.09);
          color: #f8fafc;
          background: rgba(255,255,255,.045);
          border-radius: 13px;
          min-height: 45px;
          padding: 0 17px;
          transition: .2s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
          border-color: rgba(255,205,92,.32);
          background: rgba(255,255,255,.07);
        }

        .btnGold {
          color: #111;
          font-weight: 900;
          border: 0;
          background: linear-gradient(135deg, #f7d46d, #d99a24);
          box-shadow: 0 10px 30px rgba(221,158,39,.14);
        }

        .btnDanger {
          color: #ffb4b4;
          border-color: rgba(255,80,80,.20);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat {
          min-height: 105px;
          padding: 18px;
          border-radius: 19px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.035);
          backdrop-filter: blur(20px);
        }

        .statLabel {
          color: #8c97a7;
          font-size: 13px;
          margin-bottom: 11px;
        }

        .statValue {
          font-size: 25px;
          font-weight: 900;
        }

        .gold {
          color: #f4c85b;
        }

        .green {
          color: #5ee6a1;
        }

        .layout {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .panel {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(10,14,21,.84);
          box-shadow:
            0 20px 60px rgba(0,0,0,.20),
            inset 0 1px rgba(255,255,255,.025);
          overflow: hidden;
        }

        .panelHead {
          padding: 19px;
          border-bottom: 1px solid rgba(255,255,255,.065);
        }

        .panelTitle {
          font-size: 16px;
          font-weight: 900;
        }

        .panelHint {
          color: #758093;
          font-size: 12px;
          margin-top: 6px;
          line-height: 1.6;
        }

        .search {
          width: 100%;
          height: 44px;
          margin-top: 15px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: #080c12;
          color: #fff;
          padding: 0 13px;
          outline: none;
        }

        .search:focus,
        .input:focus,
        .select:focus {
          border-color: rgba(244,200,91,.55);
          box-shadow: 0 0 0 3px rgba(244,200,91,.06);
        }

        .botList {
          padding: 10px;
          max-height: 690px;
          overflow-y: auto;
        }

        .botItem {
          width: 100%;
          text-align: right;
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 15px;
          margin-bottom: 8px;
          color: #fff;
          background: transparent;
        }

        .botItem:hover {
          background: rgba(255,255,255,.035);
        }

        .botItem.selected {
          background:
            linear-gradient(135deg, rgba(244,200,91,.12), rgba(255,255,255,.025));
          border-color: rgba(244,200,91,.24);
        }

        .botTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .botName {
          font-size: 15px;
          font-weight: 900;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .statusOn {
          color: #75efb1;
          background: rgba(45,205,128,.09);
          border: 1px solid rgba(45,205,128,.18);
        }

        .statusOff {
          color: #8993a2;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.06);
        }

        .botMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .tag {
          padding: 5px 8px;
          border-radius: 8px;
          color: #aeb8c7;
          background: rgba(255,255,255,.04);
          font-size: 11px;
        }

        .editor {
          padding: 22px;
        }

        .editorHeader {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .editorTitle {
          font-size: 22px;
          font-weight: 900;
        }

        .editorDescription {
          color: #7f8a9b;
          font-size: 13px;
          margin-top: 7px;
          line-height: 1.7;
        }

        .editorActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .section {
          margin-top: 17px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 18px;
          background: rgba(255,255,255,.022);
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .sectionIcon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(244,200,91,.09);
          border: 1px solid rgba(244,200,91,.15);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
        }

        .field {
          min-width: 0;
        }

        .label {
          display: block;
          color: #aab4c3;
          font-size: 12px;
          margin-bottom: 7px;
        }

        .input,
        .select {
          width: 100%;
          height: 44px;
          color: #fff;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: #080c12;
          padding: 0 12px;
          outline: none;
        }

        .toggleGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 9px;
        }

        .toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 52px;
          padding: 11px 13px;
          border: 1px solid rgba(255,255,255,.065);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .toggleText {
          color: #c8d0dc;
          font-size: 12px;
          line-height: 1.5;
        }

        .switch {
          width: 44px;
          height: 24px;
          border: 0;
          padding: 3px;
          border-radius: 999px;
          background: #242a33;
          flex: 0 0 auto;
        }

        .switch span {
          display: block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #9098a4;
          transition: .2s ease;
        }

        .switch.on {
          background: #b98b2f;
        }

        .switch.on span {
          transform: translateX(-20px);
          background: #fff4c9;
        }

        .range {
          width: 100%;
          accent-color: #e4b84c;
        }

        .rangeValue {
          margin-top: 8px;
          color: #f4c85b;
          font-size: 13px;
          font-weight: 900;
        }

        .notice {
          padding: 14px 15px;
          border-radius: 13px;
          margin-bottom: 15px;
          line-height: 1.7;
          font-size: 13px;
        }

        .noticeError {
          color: #ffc1c1;
          background: rgba(255,65,65,.08);
          border: 1px solid rgba(255,65,65,.16);
        }

        .noticeSuccess {
          color: #a9f7cb;
          background: rgba(53,211,131,.08);
          border: 1px solid rgba(53,211,131,.15);
        }

        .empty {
          min-height: 500px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 40px;
        }

        .emptyIcon {
          font-size: 44px;
          margin-bottom: 15px;
        }

        .emptyTitle {
          font-size: 20px;
          font-weight: 900;
        }

        .emptyText {
          color: #788496;
          font-size: 13px;
          margin-top: 8px;
          line-height: 1.8;
        }

        .modalBack {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0,0,0,.70);
          backdrop-filter: blur(12px);
        }

        .modal {
          width: min(520px, 100%);
          padding: 22px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.09);
          background: #0b1017;
          box-shadow: 0 30px 100px rgba(0,0,0,.55);
        }

        .modalTitle {
          font-size: 19px;
          font-weight: 900;
          margin-bottom: 17px;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 18px;
        }

        .footerInfo {
          margin-top: 16px;
          color: #687486;
          font-size: 11px;
          line-height: 1.8;
        }

        @media (max-width: 1100px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .botList {
            max-height: 330px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 750px) {
          .page {
            padding: 15px;
          }

          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .headerActions,
          .headerActions .btn {
            width: 100%;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .toggleGrid {
            grid-template-columns: 1fr;
          }

          .editor {
            padding: 14px;
          }

          .editorHeader {
            flex-direction: column;
          }

          .editorActions,
          .editorActions .btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .stats {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="shell">

        <header className="header">
          <div className="brand">
            <div className="logo">◈</div>

            <div>
              <h1>مدیریت ربات‌های Trading AI</h1>

              <div className="subtitle">
                کنترل کامل تحلیل، فیلتر سیگنال، مدیریت ریسک،
                اجرای معامله و ارسال هشدار
              </div>
            </div>
          </div>

          <div className="headerActions">
            <button
              className="btn"
              onClick={loadBots}
              disabled={loading}
            >
              ↻ بروزرسانی
            </button>

            <button
              className="btn btnGold"
              onClick={() => setShowCreate(true)}
            >
              + ساخت ربات جدید
            </button>
          </div>
        </header>

        <section className="stats">
          <div className="stat">
            <div className="statLabel">
              تعداد کل ربات‌ها
            </div>

            <div className="statValue">
              {bots.length}
            </div>
          </div>

          <div className="stat">
            <div className="statLabel">
              ربات‌های فعال
            </div>

            <div className="statValue green">
              {activeCount}
            </div>
          </div>

          <div className="stat">
            <div className="statLabel">
              حداقل امتیاز سیگنال
            </div>

            <div className="statValue gold">
              {selectedBot?.signalThreshold ?? config.minSignalScore}%
            </div>
          </div>

          <div className="stat">
            <div className="statLabel">
              حداقل تأییدیه
            </div>

            <div className="statValue">
              {selectedBot?.minConfirmations ??
                config.minConfirmations}
            </div>
          </div>
        </section>

        {error && (
          <div className="notice noticeError">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="notice noticeSuccess">
            ✓ {success}
          </div>
        )}

        <div className="layout">

          <aside className="panel">

            <div className="panelHead">
              <div className="panelTitle">
                ربات‌های شما
              </div>

              <div className="panelHint">
                ربات را انتخاب کنید تا تمام تنظیمات آن
                در پنل سمت مقابل نمایش داده شود.
              </div>

              <input
                className="search"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="جستجوی ربات، نماد..."
              />
            </div>

            <div className="botList">

              {loading && (
                <div className="empty">
                  <div>
                    <div className="emptyIcon">◌</div>
                    <div className="emptyTitle">
                      در حال دریافت ربات‌ها
                    </div>
                  </div>
                </div>
              )}

              {!loading &&
                filteredBots.length === 0 && (
                  <div className="empty">
                    <div>
                      <div className="emptyIcon">🤖</div>

                      <div className="emptyTitle">
                        رباتی پیدا نشد
                      </div>

                      <div className="emptyText">
                        از دکمه ساخت ربات جدید استفاده کنید.
                      </div>
                    </div>
                  </div>
                )}

              {!loading &&
                filteredBots.map((bot) => (
                  <button
                    key={bot.id}
                    className={`botItem ${
                      selectedId === bot.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedId(bot.id)
                    }
                  >
                    <div className="botTop">
                      <div className="botName">
                        {bot.name}
                      </div>

                      <span
                        className={`status ${
                          bot.isActive
                            ? "statusOn"
                            : "statusOff"
                        }`}
                      >
                        ●{" "}
                        {bot.isActive
                          ? "فعال"
                          : "متوقف"}
                      </span>
                    </div>

                    <div className="botMeta">
                      <span className="tag">
                        {bot.symbol || "—"}
                      </span>

                      <span className="tag">
                        {bot.timeframe || "—"}
                      </span>

                      <span className="tag">
                        {bot.marketType || "—"}
                      </span>

                      <span className="tag">
                        امتیاز{" "}
                        {bot.signalThreshold ??
                          config.minSignalScore}
                        %
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </aside>

          <section className="panel">

            {!selectedBot ? (
              <div className="empty">
                <div>
                  <div className="emptyIcon">
                    ⚙️
                  </div>

                  <div className="emptyTitle">
                    یک ربات انتخاب کنید
                  </div>

                  <div className="emptyText">
                    تنظیمات ربات انتخاب‌شده در اینجا
                    نمایش داده می‌شود.
                  </div>
                </div>
              </div>
            ) : (
              <div className="editor">

                <div className="editorHeader">

                  <div>
                    <div className="editorTitle">
                      {selectedBot.name}
                    </div>

                    <div className="editorDescription">
                      تنظیمات کامل این ربات را کنترل کنید.
                      هیچ سیگنال یا معامله‌ای در این صفحه
                      به‌صورت ساختگی تولید نمی‌شود.
                    </div>
                  </div>

                  <div className="editorActions">

                    <button
                      className={`btn ${
                        selectedBot.isActive
                          ? "btnDanger"
                          : "btnGold"
                      }`}
                      onClick={() =>
                        toggleBot(selectedBot)
                      }
                    >
                      {selectedBot.isActive
                        ? "■ توقف ربات"
                        : "▶ فعال‌سازی ربات"}
                    </button>

                    <button
                      className="btn btnGold"
                      onClick={saveBot}
                      disabled={saving}
                    >
                      {saving
                        ? "در حال ذخیره..."
                        : "✓ ذخیره تنظیمات"}
                    </button>

                  </div>
                </div>

                <section className="section">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      🤖
                    </div>

                    مشخصات اصلی ربات
                  </div>

                  <div className="grid">

                    <div className="field">
                      <label className="label">
                        نام ربات
                      </label>

                      <input
                        className="input"
                        value={selectedBot.name || ""}
                        onChange={(e) =>
                          updateSelected({
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        نماد
                      </label>

                      <select
                        className="select"
                        value={
                          selectedBot.symbol ||
                          "XAUUSD"
                        }
                        onChange={(e) =>
                          updateSelected({
                            symbol: e.target.value,
                          })
                        }
                      >
                        {SYMBOLS.map((symbol) => (
                          <option
                            key={symbol}
                            value={symbol}
                          >
                            {symbol}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">
                        تایم‌فریم
                      </label>

                      <select
                        className="select"
                        value={
                          selectedBot.timeframe ||
                          "15m"
                        }
                        onChange={(e) =>
                          updateSelected({
                            timeframe:
                              e.target.value,
                          })
                        }
                      >
                        {TIMEFRAMES.map((tf) => (
                          <option
                            key={tf}
                            value={tf}
                          >
                            {tf}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">
                        نوع بازار
                      </label>

                      <select
                        className="select"
                        value={
                          selectedBot.marketType ||
                          "FOREX"
                        }
                        onChange={(e) =>
                          updateSelected({
                            marketType:
                              e.target.value,
                          })
                        }
                      >
                        {MARKET_TYPES.map((market) => (
                          <option
                            key={market}
                            value={market}
                          >
                            {market}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">
                        حالت اجرا
                      </label>

                      <select
                        className="select"
                        value={config.executionMode}
                        onChange={(e) =>
                          updateConfig({
                            executionMode:
                              e.target.value as ExecutionMode,
                          })
                        }
                      >
                        <option value="MANUAL">
                          دستی
                        </option>

                        <option value="AUTO_APPROVAL">
                          اجرای خودکار پس از تأیید
                        </option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">
                        ارسال Telegram
                      </label>

                      <button
                        className={`switch ${
                          selectedBot.telegramEnabled
                            ? "on"
                            : ""
                        }`}
                        onClick={() =>
                          updateSelected({
                            telegramEnabled:
                              !selectedBot.telegramEnabled,
                          })
                        }
                        aria-label="Telegram"
                      >
                        <span />
                      </button>
                    </div>

                  </div>
                </section>

                <section className="section">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      🧠
                    </div>

                    موتور تحلیل و فیلتر سیگنال
                  </div>

                  <div className="toggleGrid">

                    <Toggle
                      text="تحلیل چند تایم‌فریمی"
                      value={config.multiTimeframe}
                      onChange={(value) =>
                        updateConfig({
                          multiTimeframe: value,
                        })
                      }
                    />

                    <Toggle
                      text="حمایت و مقاومت"
                      value={config.supportResistance}
                      onChange={(value) =>
                        updateConfig({
                          supportResistance: value,
                        })
                      }
                    />

                    <Toggle
                      text="شکست معتبر"
                      value={config.breakoutFilter}
                      onChange={(value) =>
                        updateConfig({
                          breakoutFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="تأیید پولبک"
                      value={config.pullbackFilter}
                      onChange={(value) =>
                        updateConfig({
                          pullbackFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="فیلتر روند"
                      value={config.trendFilter}
                      onChange={(value) =>
                        updateConfig({
                          trendFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="مومنتوم"
                      value={config.momentumFilter}
                      onChange={(value) =>
                        updateConfig({
                          momentumFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="حجم / تأیید جریان"
                      value={config.volumeFilter}
                      onChange={(value) =>
                        updateConfig({
                          volumeFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="الگوهای کندلی"
                      value={config.candlePatternFilter}
                      onChange={(value) =>
                        updateConfig({
                          candlePatternFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="فیلتر نوسان"
                      value={config.volatilityFilter}
                      onChange={(value) =>
                        updateConfig({
                          volatilityFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="اجازه معامله خلاف روند"
                      value={config.allowCounterTrend}
                      onChange={(value) =>
                        updateConfig({
                          allowCounterTrend: value,
                        })
                      }
                    />

                  </div>

                  <div
                    style={{
                      marginTop: 15,
                    }}
                    className="grid"
                  >

                    <div className="field">
                      <label className="label">
                        حداقل امتیاز سیگنال
                      </label>

                      <input
                        className="range"
                        type="range"
                        min="50"
                        max="100"
                        step="1"
                        value={
                          selectedBot.signalThreshold ??
                          config.minSignalScore
                        }
                        onChange={(e) =>
                          updateSelected({
                            signalThreshold:
                              Number(e.target.value),
                          })
                        }
                      />

                      <div className="rangeValue">
                        {selectedBot.signalThreshold ??
                          config.minSignalScore}
                        %
                      </div>
                    </div>

                    <div className="field">
                      <label className="label">
                        حداقل تعداد تأییدیه
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="12"
                        value={
                          selectedBot.minConfirmations ??
                          config.minConfirmations
                        }
                        onChange={(e) => {
                          const value =
                            numberValue(
                              e.target.value,
                              5
                            );

                          updateSelected({
                            minConfirmations: value,
                          });

                          updateConfig({
                            minConfirmations: value,
                          });
                        }}
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        حداکثر سیگنال روزانه
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={config.maxSignalsPerDay}
                        onChange={(e) =>
                          updateConfig({
                            maxSignalsPerDay:
                              numberValue(
                                e.target.value,
                                10
                              ),
                          })
                        }
                      />
                    </div>

                  </div>
                </section>

                <section className="section">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      🛡️
                    </div>

                    جلوگیری از سیگنال‌های تکراری
                  </div>

                  <div className="toggleGrid">

                    <Toggle
                      text="تا پایان سیگنال فعال، سیگنال جدید صادر نشود"
                      value={config.stopAfterActiveSignal}
                      onChange={(value) =>
                        updateConfig({
                          stopAfterActiveSignal:
                            value,
                        })
                      }
                    />

                    <Toggle
                      text="جلوگیری از سیگنال تکراری"
                      value={config.preventDuplicateSignals}
                      onChange={(value) =>
                        updateConfig({
                          preventDuplicateSignals:
                            value,
                        })
                      }
                    />

                  </div>

                  <div
                    className="grid"
                    style={{
                      marginTop: 13,
                    }}
                  >
                    <div className="field">
                      <label className="label">
                        فاصله حداقل بین سیگنال‌ها
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="1440"
                        value={
                          config.signalCooldownMinutes
                        }
                        onChange={(e) =>
                          updateConfig({
                            signalCooldownMinutes:
                              numberValue(
                                e.target.value,
                                5
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        TP1
                      </label>

                      <Toggle
                        text="فعال"
                        value={config.useTP1}
                        onChange={(value) =>
                          updateConfig({
                            useTP1: value,
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        TP2 / TP3
                      </label>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <Toggle
                          text="TP2"
                          value={config.useTP2}
                          onChange={(value) =>
                            updateConfig({
                              useTP2: value,
                            })
                          }
                        />

                        <Toggle
                          text="TP3"
                          value={config.useTP3}
                          onChange={(value) =>
                            updateConfig({
                              useTP3: value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="section">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      💰
                    </div>

                    مدیریت سرمایه و معامله
                  </div>

                  <div className="grid">

                    <div className="field">
                      <label className="label">
                        روش مدیریت ریسک
                      </label>

                      <select
                        className="select"
                        value={config.riskMode}
                        onChange={(e) =>
                          updateConfig({
                            riskMode:
                              e.target.value as Config["riskMode"],
                          })
                        }
                      >
                        <option value="PERCENT">
                          درصد سرمایه
                        </option>

                        <option value="FIXED_LOT">
                          لات ثابت
                        </option>

                        <option value="FIXED_MONEY">
                          مبلغ ثابت
                        </option>
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">
                        ریسک درصدی
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={
                          selectedBot.riskPercent ?? 1
                        }
                        onChange={(e) =>
                          updateSelected({
                            riskPercent:
                              numberValue(
                                e.target.value,
                                1
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        لات
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          selectedBot.lotSize ?? 0.01
                        }
                        onChange={(e) =>
                          updateSelected({
                            lotSize:
                              numberValue(
                                e.target.value,
                                0.01
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        مبلغ ریسک ثابت
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          config.fixedRiskMoney
                        }
                        onChange={(e) =>
                          updateConfig({
                            fixedRiskMoney:
                              numberValue(
                                e.target.value,
                                10
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Stop Loss
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          selectedBot.stopLoss ?? 1
                        }
                        onChange={(e) =>
                          updateSelected({
                            stopLoss:
                              numberValue(
                                e.target.value,
                                1
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Risk / Reward
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={
                          selectedBot.riskReward ?? 3
                        }
                        onChange={(e) =>
                          updateSelected({
                            riskReward:
                              numberValue(
                                e.target.value,
                                3
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        TP اصلی
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          selectedBot.takeProfit ?? 3
                        }
                        onChange={(e) =>
                          updateSelected({
                            takeProfit:
                              numberValue(
                                e.target.value,
                                3
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        حداکثر معاملات باز
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="100"
                        value={
                          selectedBot.maxOpenTrades ?? 1
                        }
                        onChange={(e) =>
                          updateSelected({
                            maxOpenTrades:
                              numberValue(
                                e.target.value,
                                1
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        حداکثر اسپرد
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={
                          selectedBot.maxSpread ?? 30
                        }
                        onChange={(e) =>
                          updateSelected({
                            maxSpread:
                              numberValue(
                                e.target.value,
                                30
                              ),
                          })
                        }
                      />
                    </div>

                  </div>

                  <div
                    className="toggleGrid"
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <Toggle
                      text="اجازه BUY"
                      value={
                        selectedBot.buyEnabled !== false
                      }
                      onChange={(value) =>
                        updateSelected({
                          buyEnabled: value,
                        })
                      }
                    />

                    <Toggle
                      text="اجازه SELL"
                      value={
                        selectedBot.sellEnabled !== false
                      }
                      onChange={(value) =>
                        updateSelected({
                          sellEnabled: value,
                        })
                      }
                    />

                    <Toggle
                      text="Trailing Stop"
                      value={
                        selectedBot.trailingStop !== false
                      }
                      onChange={(value) =>
                        updateSelected({
                          trailingStop: value,
                        })
                      }
                    />

                    <Toggle
                      text="Break-even"
                      value={
                        selectedBot.breakEven !== false
                      }
                      onChange={(value) =>
                        updateSelected({
                          breakEven: value,
                        })
                      }
                    />

                  </div>
                </section>

                <section className="section">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      ⏱️
                    </div>

                    محدودیت‌های روزانه
                  </div>

                  <div className="grid">

                    <div className="field">
                      <label className="label">
                        توقف بعد از سود روزانه
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          selectedBot.dailyProfitStop ??
                          20
                        }
                        onChange={(e) =>
                          updateSelected({
                            dailyProfitStop:
                              numberValue(
                                e.target.value,
                                20
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        حداکثر ضرر روزانه
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          selectedBot.dailyLossLimit ??
                          12
                        }
                        onChange={(e) =>
                          updateSelected({
                            dailyLossLimit:
                              numberValue(
                                e.target.value,
                                12
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        حداکثر Stop Loss روزانه
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={
                          selectedBot.maxDailyStopLosses ??
                          3
                        }
                        onChange={(e) =>
                          updateSelected({
                            maxDailyStopLosses:
                              numberValue(
                                e.target.value,
                                3
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        توقف بعد از چند برد
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={
                          config.autoStopAfterWins
                        }
                        onChange={(e) =>
                          updateConfig({
                            autoStopAfterWins:
                              numberValue(
                                e.target.value,
                                0
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        توقف بعد از چند باخت
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={
                          config.autoStopAfterLosses
                        }
                        onChange={(e) =>
                          updateConfig({
                            autoStopAfterLosses:
                              numberValue(
                                e.target.value,
                                0
                              ),
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Cooldown
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={
                          selectedBot.cooldownMinutes ??
                          config.signalCooldownMinutes
                        }
                        onChange={(e) =>
                          updateSelected({
                            cooldownMinutes:
                              numberValue(
                                e.target.value,
                                5
                              ),
                          })
                        }
                      />
                    </div>

                  </div>
                </section>

                <section className="section">
                  <div className="sectionTitle">
                    <div className="sectionIcon">
                      📰
                    </div>

                    فیلترهای بازار
                  </div>

                  <div className="toggleGrid">

                    <Toggle
                      text="فیلتر Session"
                      value={
                        selectedBot.sessionFilter !== false
                      }
                      onChange={(value) =>
                        updateSelected({
                          sessionFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="فیلتر اخبار"
                      value={
                        selectedBot.newsFilter !== false
                      }
                      onChange={(value) =>
                        updateSelected({
                          newsFilter: value,
                        })
                      }
                    />

                    <Toggle
                      text="نیاز به تأیید نهایی"
                      value={config.requireConfirmation}
                      onChange={(value) =>
                        updateConfig({
                          requireConfirmation:
                            value,
                        })
                      }
                    />

                    <Toggle
                      text="فعال‌سازی ارسال Telegram"
                      value={
                        selectedBot.telegramEnabled === true
                      }
                      onChange={(value) =>
                        updateSelected({
                          telegramEnabled: value,
                        })
                      }
                    />

                  </div>
                </section>

                <div className="footerInfo">
                  این پنل فقط تنظیمات واقعی ربات را ذخیره می‌کند.
                  تولید سیگنال، محاسبه Entry/SL/TP، تشخیص نتیجه،
                  ارسال Telegram و اجرای معامله باید در سرویس
                  سمت سرور انجام شود تا اطلاعات جعلی از UI تولید نشود.
                </div>

              </div>
            )}
          </section>
        </div>
      </div>

      {showCreate && (
        <div
          className="modalBack"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="modal">

            <div className="modalTitle">
              ساخت ربات تحلیلگر جدید
            </div>

            <div className="grid">

              <div
                className="field"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label className="label">
                  نام ربات
                </label>

                <input
                  className="input"
                  value={newBot.name}
                  onChange={(e) =>
                    setNewBot({
                      ...newBot,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label className="label">
                  نماد
                </label>

                <select
                  className="select"
                  value={newBot.symbol}
                  onChange={(e) =>
                    setNewBot({
                      ...newBot,
                      symbol: e.target.value,
                    })
                  }
                >
                  {SYMBOLS.map((symbol) => (
                    <option
                      key={symbol}
                      value={symbol}
                    >
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">
                  تایم‌فریم
                </label>

                <select
                  className="select"
                  value={newBot.timeframe}
                  onChange={(e) =>
                    setNewBot({
                      ...newBot,
                      timeframe: e.target.value,
                    })
                  }
                >
                  {TIMEFRAMES.map((tf) => (
                    <option
                      key={tf}
                      value={tf}
                    >
                      {tf}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">
                  بازار
                </label>

                <select
                  className="select"
                  value={newBot.marketType}
                  onChange={(e) =>
                    setNewBot({
                      ...newBot,
                      marketType: e.target.value,
                    })
                  }
                >
                  {MARKET_TYPES.map((market) => (
                    <option
                      key={market}
                      value={market}
                    >
                      {market}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="modalActions">

              <button
                className="btn"
                onClick={() =>
                  setShowCreate(false)
                }
              >
                انصراف
              </button>

              <button
                className="btn btnGold"
                onClick={createBot}
                disabled={saving}
              >
                {saving
                  ? "در حال ساخت..."
                  : "ساخت ربات"}
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}

function Toggle({
  text,
  value,
  onChange,
}: {
  text: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggle">
      <div className="toggleText">
        {text}
      </div>

      <button
        type="button"
        className={`switch ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
        aria-label={text}
      >
        <span />
      </button>
    </div>
  );
}
