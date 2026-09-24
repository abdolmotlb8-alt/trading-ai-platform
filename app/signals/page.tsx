"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Direction = "BUY" | "SELL";

type EventRow = {
  type?: string;
  price?: number;
  pnlUsd?: number;
  pnlIrr?: number | null;
  at?: string;
  note?: string;
};

type SignalMeta = {
  risk?: {
    lotSize?: number;
    stopLossDollars?: number;
    tp1Dollars?: number;
    tp2Dollars?: number;
    tp3Dollars?: number;
    contractSize?: number;
  };
  levels?: {
    sl?: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
  };
  events?: EventRow[];
  state?: {
    tp1Hit?: boolean;
    tp2Hit?: boolean;
    tp3Hit?: boolean;
    slHit?: boolean;
  };
  lastPrice?: number;
  lastPriceAt?: string;
};

type Signal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward?: number | null;
  score?: number | null;
  confidence?: number | null;
  status: string;
  source?: string | null;
  marketStructure?: string | null;
  supportResistance?: string | null;
  liquidity?: string | null;
  pullback?: string | null;
  candlePattern?: string | null;
  volumeConfirmation?: string | null;
  multiTimeframeConfirmation?: string | null;
  sessionConfirmation?: string | null;
  volatilityConfirmation?: string | null;
  newsConfirmation?: string | null;
  confirmations?: unknown;
  reasons?: unknown;
  metadata?: SignalMeta | null;
  telegramSent?: boolean;
  telegramMessageId?: string | null;
  telegramSentAt?: string | null;
  createdAt: string;
  closedAt?: string | null;
  expiresAt?: string | null;
  bot?: {
    name?: string | null;
  } | null;
};

type Performance = {
  daily?: {
    signals?: number;
    wins?: number;
    losses?: number;
    winRate?: number;
    pnlUsd?: number;
  };
  weekly?: {
    signals?: number;
    wins?: number;
    losses?: number;
    winRate?: number;
    pnlUsd?: number;
  };
  monthly?: {
    signals?: number;
    wins?: number;
    losses?: number;
    winRate?: number;
    pnlUsd?: number;
  };
};

type ApiData = {
  ok?: boolean;
  engine?: {
    source?: string;
    monitored?: unknown;
    scanned?: {
      bots?: number;
      made?: Signal[];
      errors?: {
        botId?: string;
        symbol?: string;
        error?: string;
      }[];
    };
  };
  signals?: Signal[];
  performance?: Performance;
};

type Filter = "ALL" | "BUY" | "SELL";

const tomanFmt = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const priceFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function price(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return priceFmt.format(n);
}

function usd(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return `${n >= 0 ? "+" : "-"}$${usdFmt.format(Math.abs(n))}`;
}

function toman(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${tomanFmt.format(Math.round(Math.abs(n)))} تومان`;
}

function dateFa(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function directionFa(direction?: string) {
  return direction === "BUY" ? "خرید" : "فروش";
}

function statusFa(status?: string) {
  const map: Record<string, string> = {
    WAITING: "در انتظار",
    ACTIVE: "فعال",
    TP1_HIT: "TP1 ثبت شد",
    TP2_HIT: "TP2 ثبت شد",
    CLOSED: "بسته شد",
  };

  return map[status || ""] || status || "—";
}

function eventFa(type?: string) {
  const map: Record<string, string> = {
    TP1_HIT: "TP1",
    TP2_HIT: "TP2",
    TP3_HIT: "TP3",
    SL_HIT: "STOP LOSS",
    TP1: "TP1",
    TP2: "TP2",
    TP3: "TP3",
    SL: "STOP LOSS",
    BREAKEVEN: "BREAKEVEN",
  };

  return map[type || ""] || type || "رویداد";
}

function getMeta(signal: Signal): SignalMeta {
  return signal.metadata || {};
}

function getLatestSignal(signals: Signal[]) {
  return signals.length > 0 ? signals[0] : null;
}

export default function SignalsPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [busy, setBusy] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");

  const loadSignals = useCallback(async (manual = false) => {
    if (manual) {
      setScanning(true);
    }

    try {
      const response = await fetch(
        "/api/signals?interval=1min",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      const json: ApiData = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          (json as any)?.error || "خطا در دریافت موتور سیگنال"
        );
      }

      setData(json);
      setError("");
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ارتباط با موتور سیگنال برقرار نشد."
      );
    } finally {
      setBusy(false);
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    loadSignals();

    const timer = window.setInterval(() => {
      loadSignals();
    }, 20000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadSignals]);

  const signals = useMemo(() => {
    const rows = Array.isArray(data?.signals)
      ? [...data.signals]
      : [];

    rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    return rows;
  }, [data]);

  const activeSignals = useMemo(
    () =>
      signals.filter((s) =>
        ["WAITING", "ACTIVE", "TP1_HIT", "TP2_HIT"].includes(
          s.status
        )
      ),
    [signals]
  );

  const filteredSignals = useMemo(() => {
    if (filter === "ALL") return signals;

    return signals.filter(
      (signal) => signal.direction === filter
    );
  }, [signals, filter]);

  const latest = getLatestSignal(signals);

  const daily = data?.performance?.daily || {};
  const weekly = data?.performance?.weekly || {};
  const monthly = data?.performance?.monthly || {};

  const latestMeta = latest ? getMeta(latest) : {};

  const morningLevels = useMemo(() => {
    if (!latest) {
      return {
        support: null,
        resistance: null,
      };
    }

    const text = latest.supportResistance || "";

    const supportMatch = text.match(
      /S\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i
    );

    const resistanceMatch = text.match(
      /R\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i
    );

    return {
      support: supportMatch
        ? Number(supportMatch[1])
        : null,
      resistance: resistanceMatch
        ? Number(resistanceMatch[1])
        : null,
    };
  }, [latest]);

  return (
    <main dir="rtl" className="signals-page">
      <style>{`
        *{
          box-sizing:border-box;
        }

        body{
          margin:0;
          background:#050806;
          color:#f7f7f2;
          font-family:Tahoma,Arial,sans-serif;
        }

        .signals-page{
          min-height:100vh;
          padding:18px;
          background:
            radial-gradient(circle at 85% 0%,rgba(198,157,44,.12),transparent 28%),
            radial-gradient(circle at 5% 50%,rgba(20,120,75,.08),transparent 30%),
            linear-gradient(135deg,#050806,#0a0d0b 55%,#050806);
        }

        .container{
          width:100%;
          max-width:1450px;
          margin:0 auto;
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:15px;
          padding:18px 20px;
          border:1px solid rgba(214,174,61,.18);
          border-radius:22px;
          background:rgba(15,18,16,.86);
          backdrop-filter:blur(18px);
          box-shadow:0 20px 60px rgba(0,0,0,.28);
        }

        .title-wrap h1{
          margin:0;
          font-size:23px;
          letter-spacing:-.5px;
        }

        .title-wrap p{
          margin:7px 0 0;
          color:#777c76;
          font-size:11px;
        }

        .engine-status{
          display:flex;
          align-items:center;
          gap:9px;
          padding:9px 13px;
          border:1px solid rgba(68,211,128,.18);
          border-radius:999px;
          color:#9aa39c;
          font-size:10px;
          background:rgba(38,120,72,.05);
        }

        .dot{
          width:8px;
          height:8px;
          border-radius:50%;
          background:#35d77b;
          box-shadow:0 0 12px #35d77b;
        }

        .controls{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-top:16px;
          flex-wrap:wrap;
        }

        .filters{
          display:flex;
          gap:7px;
          padding:5px;
          border:1px solid #252923;
          border-radius:15px;
          background:#0b0e0c;
        }

        .filter-btn{
          border:0;
          cursor:pointer;
          min-width:75px;
          padding:9px 13px;
          border-radius:10px;
          color:#777d76;
          background:transparent;
          font-family:inherit;
          font-size:11px;
        }

        .filter-btn.active{
          color:#e4c55b;
          background:rgba(194,157,48,.11);
          border:1px solid rgba(194,157,48,.2);
        }

        .scan-btn{
          border:1px solid rgba(214,174,61,.3);
          background:linear-gradient(135deg,#9c7a20,#d2ac3f);
          color:#10100c;
          font-family:inherit;
          font-weight:bold;
          font-size:11px;
          border-radius:12px;
          padding:11px 17px;
          cursor:pointer;
          box-shadow:0 8px 24px rgba(188,145,35,.13);
        }

        .scan-btn:disabled{
          opacity:.55;
          cursor:wait;
        }

        .notice{
          margin-top:14px;
          padding:12px 15px;
          border-radius:14px;
          border:1px solid rgba(214,174,61,.14);
          background:rgba(194,157,48,.045);
          color:#92978f;
          font-size:10px;
          line-height:2;
        }

        .error{
          margin-top:14px;
          padding:12px 15px;
          border-radius:14px;
          border:1px solid rgba(235,80,90,.2);
          background:rgba(180,40,50,.06);
          color:#e9959c;
          font-size:10px;
          line-height:2;
        }

        .stats{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:12px;
          margin-top:16px;
        }

        .stat{
          min-height:105px;
          padding:17px;
          border-radius:19px;
          border:1px solid #1c211d;
          background:linear-gradient(145deg,#101411,#0b0e0c);
          box-shadow:0 12px 35px rgba(0,0,0,.2);
        }

        .stat span{
          display:block;
          color:#656c65;
          font-size:9px;
        }

        .stat strong{
          display:block;
          margin-top:10px;
          font-size:22px;
        }

        .stat small{
          display:block;
          margin-top:7px;
          color:#777d76;
          font-size:9px;
        }

        .gold{
          color:#dfbc4f;
        }

        .green{
          color:#37d68a;
        }

        .red{
          color:#ed6875;
        }

        .section{
          margin-top:18px;
        }

        .section-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:10px;
        }

        .section-head h2{
          margin:0;
          font-size:16px;
        }

        .section-head span{
          color:#606760;
          font-size:9px;
        }

        .levels{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .level{
          padding:17px;
          border-radius:18px;
          border:1px solid #1d221e;
          background:#0c100d;
        }

        .level span{
          display:block;
          color:#6c726c;
          font-size:9px;
        }

        .level strong{
          display:block;
          margin-top:8px;
          font-size:21px;
        }

        .level small{
          display:block;
          margin-top:6px;
          color:#626961;
          font-size:9px;
        }

        .signal-list{
          display:grid;
          gap:14px;
        }

        .empty{
          padding:45px 20px;
          text-align:center;
          border:1px dashed #242a25;
          border-radius:20px;
          color:#666d66;
          background:#090c0a;
        }

        .signal-card{
          position:relative;
          overflow:hidden;
          border-radius:24px;
          border:1px solid rgba(210,171,57,.16);
          background:
            linear-gradient(145deg,rgba(18,21,19,.97),rgba(8,11,9,.98));
          box-shadow:0 18px 55px rgba(0,0,0,.28);
        }

        .signal-card.buy{
          border-top:2px solid rgba(54,213,133,.6);
        }

        .signal-card.sell{
          border-top:2px solid rgba(226,77,89,.65);
        }

        .signal-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:15px;
          padding:19px 20px;
          border-bottom:1px solid #1b201c;
        }

        .symbol{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .direction{
          min-width:78px;
          padding:11px 13px;
          border-radius:14px;
          text-align:center;
          font-size:15px;
          font-weight:bold;
        }

        .direction.buy{
          color:#49df91;
          background:rgba(44,210,124,.08);
          border:1px solid rgba(44,210,124,.16);
        }

        .direction.sell{
          color:#ed6875;
          background:rgba(220,70,82,.08);
          border:1px solid rgba(220,70,82,.16);
        }

        .symbol-text strong{
          display:block;
          font-size:21px;
        }

        .symbol-text small{
          display:block;
          margin-top:5px;
          color:#656c65;
          font-size:9px;
        }

        .badges{
          display:flex;
          flex-wrap:wrap;
          justify-content:flex-end;
          gap:6px;
        }

        .badge{
          padding:7px 9px;
          border-radius:9px;
          color:#777e77;
          background:#111512;
          border:1px solid #202620;
          font-size:9px;
        }

        .badge.gold-badge{
          color:#d9b64b;
          border-color:rgba(214,174,61,.17);
          background:rgba(214,174,61,.05);
        }

        .signal-body{
          padding:18px 20px 20px;
        }

        .price-grid{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:9px;
        }

        .price-box{
          padding:14px;
          border-radius:15px;
          background:#0b0f0c;
          border:1px solid #1c211d;
        }

        .price-box span{
          display:block;
          color:#626961;
          font-size:8px;
        }

        .price-box strong{
          display:block;
          margin-top:8px;
          font-size:17px;
        }

        .price-box.entry strong{
          color:#e8dfbf;
        }

        .price-box.sl{
          border-color:rgba(221,75,87,.16);
        }

        .price-box.sl strong{
          color:#ed6875;
        }

        .price-box.tp strong{
          color:#3bd68a;
        }

        .confirmations{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px;
          margin-top:10px;
        }

        .confirmation{
          padding:11px;
          border-radius:13px;
          background:#0a0e0b;
          border:1px solid #1b201c;
        }

        .confirmation span{
          display:block;
          color:#646b64;
          font-size:8px;
        }

        .confirmation strong{
          display:block;
          margin-top:5px;
          color:#aab0aa;
          font-size:10px;
        }

        .positive{
          color:#3bd68a !important;
        }

        .negative{
          color:#e96d77 !important;
        }

        .signal-footer{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          margin-top:13px;
          padding-top:14px;
          border-top:1px solid #191e1a;
          color:#646b64;
          font-size:9px;
          flex-wrap:wrap;
        }

        .telegram-ok{
          color:#37d68a;
        }

        .telegram-failed{
          color:#e96d77;
        }

        .events{
          display:grid;
          gap:7px;
          margin-top:12px;
        }

        .event{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:10px 11px;
          border-radius:11px;
          background:#080b09;
          border:1px solid #171c18;
        }

        .event-left{
          display:flex;
          align-items:center;
          gap:8px;
        }

        .event-left strong{
          font-size:10px;
        }

        .event-left small{
          color:#606760;
          font-size:8px;
        }

        .performance{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
        }

        .performance-card{
          padding:17px;
          border-radius:18px;
          border:1px solid #1c211d;
          background:#0c100d;
        }

        .performance-card h3{
          margin:0;
          font-size:11px;
          color:#9a9f99;
        }

        .performance-row{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:8px;
          margin-top:12px;
        }

        .performance-row div{
          padding:9px;
          border-radius:11px;
          background:#090c0a;
        }

        .performance-row span{
          display:block;
          color:#5f665f;
          font-size:8px;
        }

        .performance-row strong{
          display:block;
          margin-top:5px;
          font-size:12px;
        }

        .footer{
          margin-top:20px;
          padding:16px;
          text-align:center;
          color:#505750;
          font-size:9px;
          line-height:2;
        }

        @media(max-width:1000px){
          .stats{
            grid-template-columns:repeat(2,1fr);
          }

          .price-grid{
            grid-template-columns:repeat(2,1fr);
          }

          .confirmations{
            grid-template-columns:repeat(2,1fr);
          }
        }

        @media(max-width:700px){
          .signals-page{
            padding:9px;
          }

          .topbar{
            align-items:flex-start;
            flex-direction:column;
          }

          .controls{
            align-items:stretch;
            flex-direction:column;
          }

          .filters{
            width:100%;
          }

          .filter-btn{
            flex:1;
          }

          .scan-btn{
            width:100%;
          }

          .stats{
            grid-template-columns:1fr 1fr;
            gap:8px;
          }

          .levels,
          .performance{
            grid-template-columns:1fr;
          }

          .signal-head{
            align-items:flex-start;
            flex-direction:column;
          }

          .badges{
            justify-content:flex-start;
          }
        }

        @media(max-width:450px){
          .stats{
            grid-template-columns:1fr;
          }

          .price-grid,
          .confirmations{
            grid-template-columns:1fr 1fr;
          }

          .symbol-text strong{
            font-size:18px;
          }
        }
      `}</style>

      <div className="container">
        <header className="topbar">
          <div className="title-wrap">
            <h1>سیگنال‌های معاملاتی</h1>
            <p>
              موتور واقعی XAUUSD · تحلیل چندتایم‌فریمی · ارسال Telegram
            </p>
          </div>

          <div className="engine-status">
            <span className="dot" />
            موتور سیگنال فعال
          </div>
        </header>

        <div className="controls">
          <div className="filters">
            <button
              className={`filter-btn ${
                filter === "ALL" ? "active" : ""
              }`}
              onClick={() => setFilter("ALL")}
            >
              همه
            </button>

            <button
              className={`filter-btn ${
                filter === "BUY" ? "active" : ""
              }`}
              onClick={() => setFilter("BUY")}
            >
              BUY
            </button>

            <button
              className={`filter-btn ${
                filter === "SELL" ? "active" : ""
              }`}
              onClick={() => setFilter("SELL")}
            >
              SELL
            </button>
          </div>

          <button
            className="scan-btn"
            disabled={scanning}
            onClick={() => loadSignals(true)}
          >
            {scanning ? "در حال اسکن بازار..." : "⟳ اسکن و بروزرسانی"}
          </button>
        </div>

        {error && (
          <div className="error">
            ⚠️ {error}
          </div>
        )}

        <div className="notice">
          🤖 این بخش از داده واقعی موتور Twelve Data استفاده می‌کند.
          صفحه هر ۲۰ ثانیه موتور سیگنال را بررسی می‌کند.
          <br />
          ⚠️ سیگنال‌ها تحلیل خودکار بازار هستند و تضمین سود نیستند.
          {lastUpdate && (
            <>
              <br />
              آخرین بروزرسانی: {dateFa(lastUpdate)}
            </>
          )}
        </div>

        <section className="stats">
          <div className="stat">
            <span>سیگنال‌های فعال</span>
            <strong className="gold">
              {activeSignals.length}
            </strong>
            <small>در انتظار TP / SL</small>
          </div>

          <div className="stat">
            <span>سیگنال‌های ثبت‌شده</span>
            <strong>{signals.length}</strong>
            <small>داده واقعی دیتابیس</small>
          </div>

          <div className="stat">
            <span>برد امروز</span>
            <strong className="green">
              {daily.wins ?? 0}
            </strong>
            <small>
              {daily.winRate ?? 0}% · {usd(daily.pnlUsd ?? 0)}
            </small>
          </div>

          <div className="stat">
            <span>عملکرد ماه</span>
            <strong
              className={
                Number(monthly.pnlUsd || 0) >= 0
                  ? "green"
                  : "red"
              }
            >
              {usd(monthly.pnlUsd ?? 0)}
            </strong>
            <small>
              {monthly.signals ?? 0} سیگنال
            </small>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>حمایت و مقاومت بازار</h2>
            <span>
              آخرین سطوح واقعی ثبت‌شده توسط موتور
            </span>
          </div>

          <div className="levels">
            <div className="level">
              <span>Support</span>
              <strong className="green">
                {morningLevels.support
                  ? price(morningLevels.support)
                  : "—"}
              </strong>
              <small>
                سطح حمایت استخراج‌شده از ساختار قیمت
              </small>
            </div>

            <div className="level">
              <span>Resistance</span>
              <strong className="red">
                {morningLevels.resistance
                  ? price(morningLevels.resistance)
                  : "—"}
              </strong>
              <small>
                سطح مقاومت استخراج‌شده از ساختار قیمت
              </small>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>پلن مدیریت معامله</h2>
            <span>XAUUSD · 0.10 lot</span>
          </div>

          <div className="levels">
            <div className="level">
              <span>ریسک Stop Loss</span>
              <strong className="red">
                -$4
              </strong>
              <small>
                فاصله قیمت SL برابر 4 دلار برای حجم 0.10 lot
              </small>
            </div>

            <div className="level">
              <span>TP1</span>
              <strong className="green">
                +$5
              </strong>
              <small>
                بستن 0.04 lot
              </small>
            </div>

            <div className="level">
              <span>TP2</span>
              <strong className="green">
                +$8
              </strong>
              <small>
                بستن 0.03 lot
              </small>
            </div>

            <div className="level">
              <span>TP3</span>
              <strong className="gold">
                +$12
              </strong>
              <small>
                بستن 0.03 lot · تکمیل 0.10 lot
              </small>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>سیگنال‌ها</h2>
            <span>
              {busy
                ? "در حال دریافت..."
                : `${filteredSignals.length} مورد`}
            </span>
          </div>

          <div className="signal-list">
            {filteredSignals.length === 0 && (
              <div className="empty">
                {busy
                  ? "در حال بررسی بازار..."
                  : "هنوز سیگنال فعالی با شرایط ثبت‌شده وجود ندارد."}
              </div>
            )}

            {filteredSignals.map((signal) => {
              const meta = getMeta(signal);

              const levels = meta.levels || {};

              const entry =
                Number(signal.entry) ||
                Number(meta.lastPrice) ||
                0;

              const sl =
                Number(levels.sl) ||
                Number(signal.stopLoss) ||
                0;

              const tp1 = Number(levels.tp1) || 0;
              const tp2 = Number(levels.tp2) || 0;
              const tp3 =
                Number(levels.tp3) ||
                Number(signal.takeProfit) ||
                0;

              const state = meta.state || {};

              const events = Array.isArray(meta.events)
                ? meta.events
                : [];

              const reasons = Array.isArray(signal.reasons)
                ? signal.reasons
                : [];

              const confirmations = signal.confirmations
                ? Object.entries(
                    signal.confirmations as Record<
                      string,
                      unknown
                    >
                  ).filter(([, value]) => Boolean(value))
                : [];

              return (
                <article
                  key={signal.id}
                  className={`signal-card ${
                    signal.direction === "BUY"
                      ? "buy"
                      : "sell"
                  }`}
                >
                  <div className="signal-head">
                    <div className="symbol">
                      <div
                        className={`direction ${
                          signal.direction === "BUY"
                            ? "buy"
                            : "sell"
                        }`}
                      >
                        {signal.direction === "BUY"
                          ? "BUY"
                          : "SELL"}
                        <small
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 8,
                            opacity: 0.7,
                          }}
                        >
                          {directionFa(
                            signal.direction
                          )}
                        </small>
                      </div>

                      <div className="symbol-text">
                        <strong>
                          {signal.symbol || "XAUUSD"}
                        </strong>

                        <small>
                          AI Signal ·{" "}
                          {signal.timeframe || "1min"}
                        </small>
                      </div>
                    </div>

                    <div className="badges">
                      <span className="badge">
                        {statusFa(signal.status)}
                      </span>

                      <span className="badge gold-badge">
                        Score {signal.score ?? 0}/100
                      </span>

                      <span className="badge">
                        TF {signal.timeframe || "1min"}
                      </span>

                      {signal.riskReward && (
                        <span className="badge">
                          RR {signal.riskReward}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="signal-body">
                    <div className="price-grid">
                      <div className="price-box entry">
                        <span>ENTRY</span>
                        <strong>
                          {price(entry)}
                        </strong>
                      </div>

                      <div className="price-box sl">
                        <span>STOP LOSS</span>
                        <strong>
                          {price(sl)}
                        </strong>
                      </div>

                      <div className="price-box tp">
                        <span>TAKE PROFIT 1</span>
                        <strong>
                          {price(tp1)}
                        </strong>
                      </div>

                      <div className="price-box tp">
                        <span>TAKE PROFIT 2</span>
                        <strong>
                          {price(tp2)}
                        </strong>
                      </div>
                    </div>

                    <div
                      className="price-grid"
                      style={{ marginTop: 9 }}
                    >
                      <div className="price-box tp">
                        <span>TAKE PROFIT 3</span>
                        <strong>
                          {price(tp3)}
                        </strong>
                      </div>

                      <div className="price-box">
                        <span>حجم کل</span>
                        <strong>
                          0.10 lot
                        </strong>
                      </div>

                      <div className="price-box">
                        <span>قیمت فعلی</span>
                        <strong>
                          {price(meta.lastPrice)}
                        </strong>
                      </div>

                      <div className="price-box">
                        <span>RR</span>
                        <strong className="gold">
                          {signal.riskReward
                            ? signal.riskReward
                            : "1:3"}
                        </strong>
                      </div>
                    </div>

                    <div className="confirmations">
                      <div className="confirmation">
                        <span>Trend</span>
                        <strong
                          className={
                            signal.marketStructure
                              ? "positive"
                              : ""
                          }
                        >
                          {signal.marketStructure ||
                            "بررسی شد"}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>Liquidity</span>
                        <strong>
                          {signal.liquidity ||
                            "بررسی شد"}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>Pullback</span>
                        <strong>
                          {signal.pullback ||
                            "بررسی شد"}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>Candle</span>
                        <strong>
                          {signal.candlePattern ||
                            "بررسی شد"}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>Volume</span>
                        <strong>
                          {signal.volumeConfirmation ||
                            "بررسی شد"}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>MTF</span>
                        <strong>
                          {signal.multiTimeFrameConfirmation ||
                            `${signal.confirmations ? Object.keys(signal.confirmations as object).length : 0} تأیید`}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>Session</span>
                        <strong>
                          {signal.sessionConfirmation ||
                            "بررسی شد"}
                        </strong>
                      </div>

                      <div className="confirmation">
                        <span>News</span>
                        <strong
                          className={
                            signal.newsConfirmation
                              ? "positive"
                              : ""
                          }
                        >
                          {signal.newsConfirmation ||
                            "فیلتر خبر"}
                        </strong>
                      </div>
                    </div>

                    {confirmations.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          color: "#626961",
                          fontSize: 9,
                        }}
                      >
                        تأییدهای ثبت‌شده:{" "}
                        <b style={{ color: "#d4d8d2" }}>
                          {confirmations.length}
                        </b>
                      </div>
                    )}

                    {reasons.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 12,
                          borderRadius: 13,
                          background: "#090d0a",
                          border: "1px solid #171c18",
                          color: "#737a72",
                          fontSize: 9,
                          lineHeight: 2,
                        }}
                      >
                        <b
                          style={{
                            color: "#a9afa8",
                          }}
                        >
                          منطق تحلیل:
                        </b>

                        <div
                          style={{
                            marginTop: 5,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 5,
                          }}
                        >
                          {reasons.map(
                            (reason, index) => (
                              <span
                                key={`${String(
                                  reason
                                )}-${index}`}
                                style={{
                                  padding:
                                    "5px 8px",
                                  borderRadius: 8,
                                  background:
                                    "#111612",
                                  border:
                                    "1px solid #202620",
                                }}
                              >
                                ✓ {String(reason)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <div className="events">
                      {events.length > 0 &&
                        [...events]
                          .reverse()
                          .map((event, index) => (
                            <div
                              className="event"
                              key={`${event.type}-${index}`}
                            >
                              <div className="event-left">
                                <strong>
                                  {eventFa(
                                    event.type
                                  )}
                                </strong>

                                <small>
                                  {dateFa(event.at)} ·{" "}
                                  {price(
                                    event.price
                                  )}
                                </small>
                              </div>

                              <strong
                                className={
                                  Number(
                                    event.pnlUsd
                                  ) >= 0
                                    ? "green"
                                    : "red"
                                }
                              >
                                {usd(
                                  event.pnlUsd
                                )}
                              </strong>
                            </div>
                          ))}
                    </div>

                    <div className="signal-footer">
                      <span>
                        ایجاد:{" "}
                        {dateFa(signal.createdAt)}
                      </span>

                      <span>
                        {state.tp1Hit
                          ? "✓ TP1"
                          : "○ TP1"}{" "}
                        ·{" "}
                        {state.tp2Hit
                          ? "✓ TP2"
                          : "○ TP2"}{" "}
                        ·{" "}
                        {state.tp3Hit
                          ? "✓ TP3"
                          : "○ TP3"}{" "}
                        ·{" "}
                        {state.slHit
                          ? "✓ SL"
                          : "○ SL"}
                      </span>

                      <span
                        className={
                          signal.telegramSent
                            ? "telegram-ok"
                            : "telegram-failed"
                        }
                      >
                        Telegram:{" "}
                        {signal.telegramSent
                          ? "✓ ارسال شد"
                          : "— ارسال نشده"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>عملکرد ثبت‌شده</h2>
            <span>
              فقط بر اساس رویدادهای ثبت‌شده سیستم
            </span>
          </div>

          <div className="performance">
            <PerformanceCard
              title="امروز"
              data={daily}
            />

            <PerformanceCard
              title="هفته"
              data={weekly}
            />

            <PerformanceCard
              title="ماه"
              data={monthly}
            />
          </div>
        </section>

        <div className="footer">
          <div>
            XAUUSD · حجم کل 0.10 lot ·
            TP1 = 0.04 · TP2 = 0.03 · TP3 = 0.03
          </div>

          <div>
            مدیریت معامله: بعد از TP1، برای 0.06 lot
            باقی‌مانده انتقال SL به Entry پیشنهاد می‌شود.
          </div>

          <div>
            {latest
              ? `آخرین سیگنال: ${latest.direction} · ${price(
                  latest.entry
                )}`
              : "هنوز سیگنالی ثبت نشده است."}
          </div>
        </div>
      </div>
    </main>
  );
}

function PerformanceCard({
  title,
  data,
}: {
  title: string;
  data: {
    signals?: number;
    wins?: number;
    losses?: number;
    winRate?: number;
    pnlUsd?: number;
  };
}) {
  const pnl = Number(data.pnlUsd || 0);

  return (
    <div className="performance-card">
      <h3>{title}</h3>

      <div className="performance-row">
        <div>
          <span>سیگنال</span>
          <strong>
            {data.signals ?? 0}
          </strong>
        </div>

        <div>
          <span>برد</span>
          <strong className="green">
            {data.wins ?? 0}
          </strong>
        </div>

        <div>
          <span>باخت</span>
          <strong className="red">
            {data.losses ?? 0}
          </strong>
        </div>
      </div>

      <div
        className="performance-row"
        style={{ marginTop: 8 }}
      >
        <div>
          <span>Win Rate</span>
          <strong className="gold">
            {data.winRate ?? 0}%
          </strong>
        </div>

        <div>
          <span>خالص USD</span>
          <strong
            className={
              pnl >= 0 ? "green" : "red"
            }
          >
            {usd(pnl)}
          </strong>
        </div>

        <div>
          <span>وضعیت</span>
          <strong>
            {pnl >= 0 ? "مثبت" : "منفی"}
          </strong>
        </div>
      </div>
    </div>
  );
}
