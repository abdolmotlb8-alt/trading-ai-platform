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
    entry?: number;
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
    breakeven?: boolean;
  };

  lastPrice?: number;
  lastPriceAt?: string;

  telegram?: {
    sent?: boolean;
    messageId?: string | null;
    sentAt?: string | null;
  };

  market?: {
    price?: number;
    priceAt?: string;
    isOpen?: boolean;
  };
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

type PerformancePeriod = {
  signals?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  pnlUsd?: number;
};

type Performance = {
  daily?: PerformancePeriod;
  weekly?: PerformancePeriod;
  monthly?: PerformancePeriod;
};

type ApiData = {
  ok?: boolean;

  error?: string;

  engine?: {
    source?: string;
    monitored?: unknown;

    state?: string;

    marketOpen?: boolean;

    lastRunAt?: string | null;

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

  market?: {
    symbol?: string;
    price?: number;
    priceAt?: string | null;
    isOpen?: boolean;
    status?: string;
  };

  telegram?: {
    enabled?: boolean;
    connected?: boolean;
  };

  signals?: Signal[];

  active?: Signal | null;

  currentSignal?: Signal | null;

  latest?: Signal | null;

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

const ACTIVE_STATUSES = new Set([
  "WAITING",
  "ACTIVE",
  "TP1_HIT",
  "TP2_HIT",
  "TP3_HIT",
]);

const CLOSED_STATUSES = new Set([
  "CLOSED",
  "SL_HIT",
  "COMPLETED",
  "TP3_COMPLETED",
  "BREAKEVEN",
  "BE",
]);

function price(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n) || n === 0) {
    return "—";
  }

  return priceFmt.format(n);
}

function usd(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "$0";
  }

  return `${n >= 0 ? "+" : "-"}$${usdFmt.format(
    Math.abs(n)
  )}`;
}

function toman(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return `${tomanFmt.format(Math.round(Math.abs(n)))} تومان`;
}

function dateFa(value?: string | null) {
  if (!value) {
    return "—";
  }

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
  if (direction === "BUY") {
    return "خرید";
  }

  if (direction === "SELL") {
    return "فروش";
  }

  return "—";
}

function statusFa(status?: string) {
  const map: Record<string, string> = {
    WAITING: "در انتظار ورود",
    ACTIVE: "فعال",
    TP1_HIT: "TP1 ثبت شد",
    TP2_HIT: "TP2 ثبت شد",
    TP3_HIT: "TP3 ثبت شد",
    CLOSED: "بسته شد",
    SL_HIT: "حد ضرر",
    COMPLETED: "تکمیل شد",
    TP3_COMPLETED: "TP3 تکمیل شد",
    BREAKEVEN: "سر‌به‌سر",
    BE: "سر‌به‌سر",
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
    BE: "BREAKEVEN",
  };

  return map[type || ""] || type || "رویداد";
}

function getMeta(signal: Signal): SignalMeta {
  return signal.metadata || {};
}

function getConfirmationCount(signal: Signal) {
  if (
    !signal.confirmations ||
    typeof signal.confirmations !== "object"
  ) {
    return 0;
  }

  return Object.values(
    signal.confirmations as Record<string, unknown>
  ).filter(Boolean).length;
}

function getRiskLabel(signal: Signal) {
  const lot = Number(signal.metadata?.risk?.lotSize);

  if (Number.isFinite(lot) && lot > 0) {
    return `${lot.toFixed(2)} lot`;
  }

  return "—";
}

function isActiveSignal(signal: Signal) {
  return ACTIVE_STATUSES.has(
    String(signal.status || "").toUpperCase()
  );
}

function isClosedSignal(signal: Signal) {
  return CLOSED_STATUSES.has(
    String(signal.status || "").toUpperCase()
  );
}

function getSignalLevels(signal: Signal) {
  const meta = signal.metadata || {};
  const levels = meta.levels || {};

  const entry =
    Number(levels.entry) ||
    Number(signal.entry) ||
    Number(meta.lastPrice) ||
    0;

  const sl =
    Number(levels.sl) ||
    Number(signal.stopLoss) ||
    0;

  const tp1 =
    Number(levels.tp1) || 0;

  const tp2 =
    Number(levels.tp2) || 0;

  const tp3 =
    Number(levels.tp3) ||
    Number(signal.takeProfit) ||
    0;

  return {
    entry,
    sl,
    tp1,
    tp2,
    tp3,
  };
}

function getLatestPrice(signal?: Signal | null) {
  if (!signal) {
    return 0;
  }

  return (
    Number(signal.metadata?.lastPrice) ||
    Number(signal.metadata?.market?.price) ||
    Number(signal.entry) ||
    0
  );
}

function calculateDistance(
  direction: Direction,
  from: number,
  to: number
) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return 0;
  }

  if (direction === "BUY") {
    return to - from;
  }

  return from - to;
}

function getProgress(signal: Signal) {
  const { entry, tp3 } = getSignalLevels(signal);
  const current = getLatestPrice(signal);

  if (!entry || !tp3 || !current) {
    return 0;
  }

  const total = calculateDistance(
    signal.direction,
    entry,
    tp3
  );

  const done = calculateDistance(
    signal.direction,
    entry,
    current
  );

  if (total <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, (done / total) * 100)
  );
}

function getSignalAge(signal: Signal) {
  const created = new Date(signal.createdAt).getTime();

  if (!Number.isFinite(created)) {
    return "";
  }

  const diff = Date.now() - created;

  if (diff < 60_000) {
    return "کمتر از ۱ دقیقه";
  }

  const minutes = Math.floor(diff / 60_000);

  if (minutes < 60) {
    return `${minutes} دقیقه`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ساعت`;
  }

  return `${Math.floor(hours / 24)} روز`;
}

function sortNewest(a: Signal, b: Signal) {
  return (
    new Date(b.createdAt).getTime() -
    new Date(a.createdAt).getTime()
  );
}

function findSupportResistance(signal?: Signal | null) {
  if (!signal) {
    return {
      support: null as number | null,
      resistance: null as number | null,
    };
  }

  const text = signal.supportResistance || "";

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
}

export default function SignalsPage() {
  const [data, setData] = useState<ApiData | null>(null);

  const [filter, setFilter] =
    useState<Filter>("ALL");

  const [busy, setBusy] =
    useState(true);

  const [scanning, setScanning] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdate, setLastUpdate] =
    useState("");

  const loadSignals = useCallback(
    async (manual = false) => {
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
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          }
        );

        let json: ApiData;

        try {
          json = await response.json();
        } catch {
          throw new Error(
            "پاسخ موتور سیگنال قابل خواندن نیست."
          );
        }

        if (!response.ok || !json.ok) {
          throw new Error(
            json.error ||
              "خطا در دریافت موتور سیگنال"
          );
        }

        setData(json);
        setError("");
        setLastUpdate(
          new Date().toISOString()
        );
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
    },
    []
  );

  useEffect(() => {
    void loadSignals();

    const timer = window.setInterval(() => {
      void loadSignals();
    }, 10_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadSignals]);

  const allSignals = useMemo(() => {
    const rows = Array.isArray(data?.signals)
      ? [...data.signals]
      : [];

    rows.sort(sortNewest);

    return rows;
  }, [data]);

  /*
   * مهم:
   * اگر API خودش active/currentSignal را برگرداند،
   * همان را در اولویت قرار می‌دهیم.
   *
   * اگر API چنین فیلدی نداشت،
   * از signals فقط ACTIVE/WAITING/TP1/TP2/TP3 را
   * استخراج می‌کنیم.
   */
  const activeSignal = useMemo(() => {
    const direct =
      data?.active ||
      data?.currentSignal ||
      null;

    if (direct && isActiveSignal(direct)) {
      return direct;
    }

    const activeRows =
      allSignals
        .filter(isActiveSignal)
        .sort(sortNewest);

    /*
     * سیستم فقط یک سیگنال جاری را نشان می‌دهد.
     * اگر API اشتباهاً چند سیگنال فعال برگرداند،
     * قدیمی‌ترها در بخش تاریخچه جاری نمایش داده نمی‌شوند.
     */
    return activeRows[0] || null;
  }, [
    data?.active,
    data?.currentSignal,
    allSignals,
  ]);

  const closedSignals = useMemo(() => {
    const rows = allSignals
      .filter(isClosedSignal)
      .filter(
        (signal) =>
          signal.id !== activeSignal?.id
      )
      .sort(sortNewest);

    if (filter === "ALL") {
      return rows.slice(0, 12);
    }

    return rows
      .filter(
        (signal) =>
          signal.direction === filter
      )
      .slice(0, 12);
  }, [
    allSignals,
    filter,
    activeSignal?.id,
  ]);

  const activeDirectionMatches =
    !activeSignal ||
    filter === "ALL" ||
    activeSignal.direction === filter;

  const latestForLevels =
    activeSignal ||
    data?.latest ||
    allSignals[0] ||
    null;

  const levels =
    findSupportResistance(
      latestForLevels
    );

  const daily =
    data?.performance?.daily || {};

  const weekly =
    data?.performance?.weekly || {};

  const monthly =
    data?.performance?.monthly || {};

  const marketPrice =
    Number(data?.market?.price) ||
    getLatestPrice(activeSignal);

  const marketOpen =
    data?.market?.isOpen !== false;

  const telegramEnabled =
    Boolean(
      data?.telegram?.enabled ||
        data?.telegram?.connected
    );

  const engineState =
    activeSignal
      ? "ACTIVE"
      : "SEARCHING";

  const activeMeta =
    activeSignal
      ? getMeta(activeSignal)
      : {};

  const activeLevels =
    activeSignal
      ? getSignalLevels(activeSignal)
      : {
          entry: 0,
          sl: 0,
          tp1: 0,
          tp2: 0,
          tp3: 0,
        };

  const activeRisk =
    activeMeta.risk || {};

  const progress =
    activeSignal
      ? getProgress(activeSignal)
      : 0;

  const activeEvents =
    Array.isArray(activeMeta.events)
      ? activeMeta.events
      : [];

  const activeState =
    activeMeta.state || {};

  const activeReasons =
    activeSignal &&
    Array.isArray(activeSignal.reasons)
      ? activeSignal.reasons
      : [];

  const confirmationCount =
    activeSignal
      ? getConfirmationCount(
          activeSignal
        )
      : 0;

  return (
    <main
      dir="rtl"
      className="signals-page"
    >
      <style>{`
        *{
          box-sizing:border-box;
        }

        html,body{
          margin:0;
          padding:0;
          background:#050606;
        }

        body{
          color:#f4f2e9;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        button{
          font-family:inherit;
        }

        .signals-page{
          min-height:100vh;
          padding:18px;
          background:
            radial-gradient(
              circle at 85% -5%,
              rgba(211,170,55,.14),
              transparent 30%
            ),
            radial-gradient(
              circle at 5% 45%,
              rgba(35,125,82,.08),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #040605 0%,
              #090c0a 50%,
              #040605 100%
            );
        }

        .container{
          width:100%;
          max-width:1480px;
          margin:0 auto;
        }

        .glass{
          background:
            linear-gradient(
              145deg,
              rgba(19,23,20,.94),
              rgba(8,11,9,.96)
            );
          border:1px solid rgba(218,177,61,.14);
          box-shadow:
            0 22px 70px rgba(0,0,0,.28),
            inset 0 1px 0 rgba(255,255,255,.025);
          backdrop-filter:blur(20px);
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          padding:20px;
          border-radius:24px;
        }

        .brand{
          display:flex;
          align-items:center;
          gap:13px;
        }

        .brand-icon{
          width:48px;
          height:48px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:15px;
          color:#11100a;
          font-size:22px;
          font-weight:900;
          background:
            linear-gradient(
              135deg,
              #9b7720,
              #e3c45d,
              #8b6b1b
            );
          box-shadow:
            0 10px 30px rgba(208,164,45,.18);
        }

        .brand-text h1{
          margin:0;
          font-size:22px;
          letter-spacing:-.5px;
        }

        .brand-text p{
          margin:6px 0 0;
          color:#696f68;
          font-size:10px;
        }

        .top-status{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }

        .status-pill{
          display:flex;
          align-items:center;
          gap:8px;
          padding:9px 12px;
          border-radius:999px;
          border:1px solid #20251f;
          background:#0a0e0b;
          color:#858b84;
          font-size:9px;
        }

        .status-dot{
          width:8px;
          height:8px;
          border-radius:50%;
          background:#37d689;
          box-shadow:0 0 12px rgba(55,214,137,.8);
        }

        .status-dot.gold{
          background:#d8b64d;
          box-shadow:0 0 12px rgba(216,182,77,.65);
        }

        .status-dot.red{
          background:#e86470;
          box-shadow:0 0 12px rgba(232,100,112,.6);
        }

        .controls{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-top:15px;
          flex-wrap:wrap;
        }

        .filters{
          display:flex;
          gap:5px;
          padding:5px;
          border-radius:15px;
          background:#080b09;
          border:1px solid #1b201c;
        }

        .filter-btn{
          min-width:76px;
          padding:9px 14px;
          border:1px solid transparent;
          border-radius:10px;
          background:transparent;
          color:#656c65;
          cursor:pointer;
          font-size:10px;
        }

        .filter-btn:hover{
          color:#b9beb7;
        }

        .filter-btn.active{
          color:#e3c45d;
          background:rgba(213,174,60,.09);
          border-color:rgba(213,174,60,.17);
        }

        .scan-btn{
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          min-width:190px;
          padding:11px 16px;
          border-radius:13px;
          border:1px solid rgba(220,179,58,.35);
          color:#12110b;
          background:
            linear-gradient(
              135deg,
              #98751f,
              #e2c158
            );
          font-size:10px;
          font-weight:900;
          cursor:pointer;
          box-shadow:
            0 10px 28px rgba(194,150,35,.13);
        }

        .scan-btn:hover{
          transform:translateY(-1px);
        }

        .scan-btn:disabled{
          opacity:.55;
          cursor:wait;
          transform:none;
        }

        .notice{
          margin-top:14px;
          padding:13px 16px;
          border-radius:15px;
          border:1px solid rgba(215,176,57,.11);
          background:rgba(215,176,57,.035);
          color:#777e76;
          font-size:9px;
          line-height:2;
        }

        .error{
          margin-top:14px;
          padding:13px 16px;
          border-radius:15px;
          border:1px solid rgba(230,84,96,.2);
          background:rgba(160,35,46,.07);
          color:#e8949c;
          font-size:10px;
          line-height:2;
        }

        .stats{
          display:grid;
          grid-template-columns:
            repeat(4,1fr);
          gap:12px;
          margin-top:15px;
        }

        .stat{
          min-height:108px;
          padding:17px;
          border-radius:19px;
          border:1px solid #1a201b;
          background:
            linear-gradient(
              145deg,
              #101411,
              #090c0a
            );
          box-shadow:
            0 14px 35px rgba(0,0,0,.2);
        }

        .stat-label{
          color:#626961;
          font-size:9px;
        }

        .stat-value{
          display:block;
          margin-top:10px;
          font-size:24px;
          font-weight:900;
        }

        .stat-sub{
          display:block;
          margin-top:7px;
          color:#666d66;
          font-size:8px;
        }

        .gold{
          color:#dfbd51;
        }

        .green{
          color:#3bd68a;
        }

        .red{
          color:#e96a76;
        }

        .muted{
          color:#6a716a;
        }

        .section{
          margin-top:18px;
        }

        .section-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:11px;
        }

        .section-head h2{
          margin:0;
          font-size:16px;
        }

        .section-head span{
          color:#5f665f;
          font-size:9px;
        }

        .market-card{
          display:grid;
          grid-template-columns:
            1.3fr
            1fr
            1fr;
          gap:10px;
        }

        .market-box{
          min-height:92px;
          padding:15px;
          border-radius:17px;
          border:1px solid #1b211c;
          background:#090d0a;
        }

        .market-box span{
          display:block;
          color:#606760;
          font-size:8px;
        }

        .market-box strong{
          display:block;
          margin-top:9px;
          font-size:20px;
        }

        .searching{
          position:relative;
          overflow:hidden;
          padding:30px 20px;
          text-align:center;
          border-radius:25px;
          border:1px solid rgba(215,176,57,.15);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(214,174,59,.08),
              transparent 45%
            ),
            linear-gradient(
              145deg,
              #101411,
              #080b09
            );
        }

        .search-icon{
          width:58px;
          height:58px;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 auto 14px;
          border-radius:18px;
          border:1px solid rgba(215,176,59,.2);
          background:rgba(215,176,59,.05);
          color:#d9b74e;
          font-size:25px;
          animation:pulse 1.8s infinite;
        }

        @keyframes pulse{
          0%,100%{
            box-shadow:
              0 0 0 0 rgba(215,176,59,.08);
          }

          50%{
            box-shadow:
              0 0 0 13px rgba(215,176,59,0);
          }
        }

        .searching h3{
          margin:0;
          font-size:17px;
        }

        .searching p{
          margin:8px auto 0;
          max-width:620px;
          color:#686f68;
          font-size:9px;
          line-height:2;
        }

        .signal-card{
          overflow:hidden;
          border-radius:25px;
          border:1px solid rgba(215,176,59,.16);
          background:
            linear-gradient(
              145deg,
              rgba(18,22,19,.98),
              rgba(7,10,8,.99)
            );
          box-shadow:
            0 25px 70px rgba(0,0,0,.3);
        }

        .signal-card.buy{
          border-top:2px solid #35d485;
        }

        .signal-card.sell{
          border-top:2px solid #e15c69;
        }

        .signal-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:15px;
          padding:19px 20px;
          border-bottom:1px solid #1a201b;
        }

        .signal-main{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .direction{
          min-width:82px;
          padding:12px 13px;
          border-radius:14px;
          text-align:center;
          font-size:15px;
          font-weight:900;
        }

        .direction.buy{
          color:#48df91;
          background:rgba(52,211,132,.07);
          border:1px solid rgba(52,211,132,.17);
        }

        .direction.sell{
          color:#eb6874;
          background:rgba(224,77,91,.07);
          border:1px solid rgba(224,77,91,.17);
        }

        .signal-name strong{
          display:block;
          font-size:20px;
        }

        .signal-name small{
          display:block;
          margin-top:5px;
          color:#616861;
          font-size:8px;
        }

        .badges{
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:6px;
          flex-wrap:wrap;
        }

        .badge{
          padding:7px 9px;
          border-radius:9px;
          background:#101411;
          border:1px solid #202620;
          color:#767d76;
          font-size:8px;
        }

        .badge.gold-badge{
          color:#dbb94f;
          border-color:rgba(215,176,57,.18);
          background:rgba(215,176,57,.045);
        }

        .signal-body{
          padding:18px 20px 20px;
        }

        .price-grid{
          display:grid;
          grid-template-columns:
            repeat(5,1fr);
          gap:9px;
        }

        .price-box{
          min-height:82px;
          padding:13px;
          border-radius:14px;
          background:#090d0a;
          border:1px solid #1b211c;
        }

        .price-box span{
          display:block;
          color:#5e655e;
          font-size:8px;
        }

        .price-box strong{
          display:block;
          margin-top:9px;
          font-size:16px;
          font-weight:900;
        }

        .price-box.entry{
          border-color:rgba(215,176,57,.18);
        }

        .price-box.entry strong{
          color:#eee5c8;
        }

        .price-box.sl{
          border-color:rgba(228,81,96,.18);
        }

        .price-box.sl strong{
          color:#ec6874;
        }

        .price-box.tp strong{
          color:#3bd68a;
        }

        .progress-wrap{
          margin-top:12px;
          padding:13px;
          border-radius:14px;
          background:#080c09;
          border:1px solid #171d18;
        }

        .progress-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          color:#666d66;
          font-size:8px;
        }

        .progress-head strong{
          color:#d8b64c;
          font-size:9px;
        }

        .progress-track{
          height:7px;
          margin-top:10px;
          overflow:hidden;
          border-radius:999px;
          background:#161b17;
        }

        .progress-bar{
          height:100%;
          border-radius:999px;
          background:
            linear-gradient(
              90deg,
              #82631a,
              #dfbd50
            );
          transition:width .35s ease;
        }

        .money-grid{
          display:grid;
          grid-template-columns:
            repeat(4,1fr);
          gap:9px;
          margin-top:10px;
        }

        .money-box{
          padding:13px;
          border-radius:14px;
          background:#090d0a;
          border:1px solid #1a201b;
        }

        .money-box span{
          display:block;
          color:#5e655e;
          font-size:8px;
        }

        .money-box strong{
          display:block;
          margin-top:8px;
          font-size:14px;
        }

        .confirmations{
          display:grid;
          grid-template-columns:
            repeat(5,1fr);
          gap:8px;
          margin-top:10px;
        }

        .confirmation{
          min-height:62px;
          padding:10px;
          border-radius:12px;
          background:#080c09;
          border:1px solid #181e19;
        }

        .confirmation span{
          display:block;
          color:#5d645d;
          font-size:7px;
        }

        .confirmation strong{
          display:block;
          margin-top:6px;
          color:#aeb4ad;
          font-size:9px;
          line-height:1.5;
        }

        .positive{
          color:#3bd68a !important;
        }

        .negative{
          color:#e96c77 !important;
        }

        .management{
          margin-top:11px;
          padding:13px;
          border-radius:14px;
          background:#080c09;
          border:1px solid #181e19;
        }

        .management-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }

        .management-head span{
          color:#606760;
          font-size:8px;
        }

        .management-head strong{
          color:#d6d9d4;
          font-size:10px;
        }

        .target-row{
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:9px;
        }

        .target{
          padding:7px 9px;
          border-radius:8px;
          border:1px solid #202620;
          background:#101511;
          color:#707770;
          font-size:8px;
        }

        .target.hit{
          color:#39d789;
          background:rgba(55,214,137,.08);
          border-color:rgba(55,214,137,.16);
        }

        .target.stop{
          color:#e96a76;
          background:rgba(233,106,118,.08);
          border-color:rgba(233,106,118,.16);
        }

        .reasons{
          margin-top:11px;
          padding:13px;
          border-radius:14px;
          background:#080c09;
          border:1px solid #181e19;
        }

        .reasons-title{
          color:#aeb3ad;
          font-size:9px;
          font-weight:900;
        }

        .reason-list{
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:8px;
        }

        .reason{
          padding:6px 8px;
          border-radius:8px;
          background:#101511;
          border:1px solid #202620;
          color:#747b74;
          font-size:8px;
        }

        .events{
          display:grid;
          gap:6px;
          margin-top:11px;
        }

        .event{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:10px 11px;
          border-radius:11px;
          background:#080c09;
          border:1px solid #171d18;
        }

        .event-left{
          display:flex;
          align-items:center;
          gap:8px;
        }

        .event-left strong{
          color:#c7cbc5;
          font-size:9px;
        }

        .event-left small{
          color:#5f665f;
          font-size:7px;
        }

        .signal-footer{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          margin-top:13px;
          padding-top:13px;
          border-top:1px solid #171d18;
          color:#5f665f;
          font-size:8px;
        }

        .telegram-ok{
          color:#39d789;
        }

        .telegram-failed{
          color:#e86b76;
        }

        .history{
          display:grid;
          gap:8px;
        }

        .history-item{
          display:grid;
          grid-template-columns:
            95px
            1fr
            110px
            130px
            120px;
          align-items:center;
          gap:12px;
          padding:13px;
          border-radius:15px;
          background:#090d0a;
          border:1px solid #181e19;
        }

        .history-direction{
          padding:8px;
          border-radius:9px;
          text-align:center;
          font-size:9px;
          font-weight:900;
        }

        .history-direction.buy{
          color:#3bd68a;
          background:rgba(55,214,137,.07);
        }

        .history-direction.sell{
          color:#e96a76;
          background:rgba(233,106,118,.07);
        }

        .history-symbol strong{
          display:block;
          font-size:10px;
        }

        .history-symbol small{
          display:block;
          margin-top:4px;
          color:#5e655e;
          font-size:7px;
        }

        .history-price{
          color:#b7bcb6;
          font-size:9px;
        }

        .history-status{
          color:#a7aca6;
          font-size:9px;
        }

        .history-time{
          color:#5d645d;
          font-size:8px;
        }

        .levels{
          display:grid;
          grid-template-columns:
            1fr 1fr;
          gap:10px;
        }

        .level{
          padding:16px;
          border-radius:17px;
          background:#090d0a;
          border:1px solid #1a201b;
        }

        .level span{
          display:block;
          color:#606760;
          font-size:8px;
        }

        .level strong{
          display:block;
          margin-top:9px;
          font-size:20px;
        }

        .level small{
          display:block;
          margin-top:6px;
          color:#5f665f;
          font-size:8px;
        }

        .performance{
          display:grid;
          grid-template-columns:
            repeat(3,1fr);
          gap:12px;
        }

        .performance-card{
          padding:17px;
          border-radius:18px;
          background:#090d0a;
          border:1px solid #1a201b;
        }

        .performance-card h3{
          margin:0;
          font-size:11px;
          color:#a0a59f;
        }

        .performance-row{
          display:grid;
          grid-template-columns:
            repeat(3,1fr);
          gap:7px;
          margin-top:11px;
        }

        .performance-cell{
          padding:9px;
          border-radius:10px;
          background:#070a08;
        }

        .performance-cell span{
          display:block;
          color:#5b625b;
          font-size:7px;
        }

        .performance-cell strong{
          display:block;
          margin-top:5px;
          font-size:11px;
        }

        .footer{
          margin-top:20px;
          padding:18px;
          text-align:center;
          color:#4f564f;
          font-size:8px;
          line-height:2;
        }

        .loading{
          padding:50px 20px;
          text-align:center;
          color:#6a716a;
          border:1px dashed #202620;
          border-radius:20px;
          background:#080b09;
          font-size:10px;
        }

        @media(max-width:1100px){
          .stats{
            grid-template-columns:
              repeat(2,1fr);
          }

          .price-grid{
            grid-template-columns:
              repeat(3,1fr);
          }

          .confirmations{
            grid-template-columns:
              repeat(3,1fr);
          }

          .history-item{
            grid-template-columns:
              90px
              1fr
              100px;
          }

          .history-price,
          .history-time{
            display:none;
          }
        }

        @media(max-width:800px){
          .market-card{
            grid-template-columns:
              1fr 1fr;
          }

          .market-box:first-child{
            grid-column:1/-1;
          }

          .performance{
            grid-template-columns:1fr;
          }

          .signal-header{
            align-items:flex-start;
            flex-direction:column;
          }

          .badges{
            justify-content:flex-start;
          }
        }

        @media(max-width:650px){
          .signals-page{
            padding:9px;
          }

          .topbar{
            align-items:flex-start;
            flex-direction:column;
            padding:16px;
          }

          .top-status{
            width:100%;
          }

          .status-pill{
            flex:1;
            justify-content:center;
          }

          .controls{
            flex-direction:column;
            align-items:stretch;
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
            grid-template-columns:
              1fr 1fr;
            gap:8px;
          }

          .price-grid,
          .money-grid{
            grid-template-columns:
              1fr 1fr;
          }

          .confirmations{
            grid-template-columns:
              1fr 1fr;
          }

          .levels{
            grid-template-columns:1fr;
          }

          .signal-body{
            padding:14px;
          }

          .history-item{
            grid-template-columns:
              78px
              1fr;
          }

          .history-status{
            display:none;
          }

          .brand-text h1{
            font-size:18px;
          }
        }

        @media(max-width:420px){
          .stats{
            grid-template-columns:1fr;
          }

          .price-grid,
          .money-grid,
          .confirmations{
            grid-template-columns:1fr 1fr;
          }

          .direction{
            min-width:70px;
          }
        }
      `}</style>

      <div className="container">
        {/* HEADER */}

        <header className="topbar glass">
          <div className="brand">
            <div className="brand-icon">
              AI
            </div>

            <div className="brand-text">
              <h1>
                Signal Engine
              </h1>

              <p>
                موتور سیگنال XAUUSD · مدیریت معامله · Telegram
              </p>
            </div>
          </div>

          <div className="top-status">
            <div className="status-pill">
              <span
                className={`status-dot ${
                  engineState === "ACTIVE"
                    ? ""
                    : "gold"
                }`}
              />

              {engineState === "ACTIVE"
                ? "سیگنال فعال"
                : "در حال جستجوی سیگنال"}
            </div>

            <div className="status-pill">
              <span
                className={`status-dot ${
                  marketOpen
                    ? ""
                    : "red"
                }`}
              />

              {marketOpen
                ? "بازار باز"
                : "بازار بسته"}
            </div>

            <div className="status-pill">
              <span
                className={`status-dot ${
                  telegramEnabled
                    ? ""
                    : "red"
                }`}
              />

              Telegram{" "}
              {telegramEnabled
                ? "فعال"
                : "غیرفعال"}
            </div>
          </div>
        </header>

        {/* CONTROLS */}

        <div className="controls">
          <div className="filters">
            <button
              type="button"
              className={`filter-btn ${
                filter === "ALL"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("ALL")
              }
            >
              همه
            </button>

            <button
              type="button"
              className={`filter-btn ${
                filter === "BUY"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("BUY")
              }
            >
              BUY
            </button>

            <button
              type="button"
              className={`filter-btn ${
                filter === "SELL"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("SELL")
              }
            >
              SELL
            </button>
          </div>

          <button
            type="button"
            className="scan-btn"
            disabled={scanning}
            onClick={() =>
              void loadSignals(true)
            }
          >
            {scanning
              ? "در حال بررسی بازار..."
              : "⟳ بروزرسانی موتور"}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="error">
            ⚠️ {error}
          </div>
        )}

        {/* NOTICE */}

        <div className="notice">
          <strong
            style={{
              color: "#d5b34d",
            }}
          >
            موتور سیگنال
          </strong>{" "}
          وضعیت سیگنال جاری را از API می‌گیرد.
          تا زمانی که معامله جاری به TP نهایی،
          SL یا حالت نهایی خود نرسیده باشد،
          این صفحه سیگنال دیگری را به‌عنوان
          سیگنال جاری نمایش نمی‌دهد.
          <br />
          بروزرسانی خودکار هر ۱۰ ثانیه انجام می‌شود.
          <br />
          ⚠️ تحلیل بازار تضمین سود نیست و نتیجه
          نهایی به اجرای واقعی معامله و شرایط بازار
          وابسته است.
          {lastUpdate && (
            <>
              <br />
              آخرین بروزرسانی:{" "}
              {dateFa(lastUpdate)}
            </>
          )}
        </div>

        {/* STATS */}

        <section className="stats">
          <div className="stat">
            <span className="stat-label">
              سیگنال جاری
            </span>

            <strong
              className={`stat-value ${
                activeSignal
                  ? "green"
                  : "gold"
              }`}
            >
              {activeSignal
                ? "۱"
                : "۰"}
            </strong>

            <span className="stat-sub">
              {activeSignal
                ? `${activeSignal.symbol} · ${activeSignal.direction}`
                : "در حال جستجو"}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              قیمت XAUUSD
            </span>

            <strong className="stat-value">
              {marketPrice
                ? price(marketPrice)
                : "—"}
            </strong>

            <span className="stat-sub">
              {data?.market?.priceAt
                ? dateFa(
                    data.market.priceAt
                  )
                : "قیمت زنده"}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              برد امروز
            </span>

            <strong className="stat-value green">
              {daily.wins ?? 0}
            </strong>

            <span className="stat-sub">
              {daily.winRate ?? 0}% ·{" "}
              {usd(daily.pnlUsd ?? 0)}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              عملکرد ماه
            </span>

            <strong
              className={`stat-value ${
                Number(
                  monthly.pnlUsd || 0
                ) >= 0
                  ? "green"
                  : "red"
              }`}
            >
              {usd(
                monthly.pnlUsd ?? 0
              )}
            </strong>

            <span className="stat-sub">
              {monthly.signals ?? 0} سیگنال
            </span>
          </div>
        </section>

        {/* MARKET */}

        <section className="section">
          <div className="section-head">
            <h2>
              وضعیت بازار
            </h2>

            <span>
              XAUUSD · قیمت جاری
            </span>
          </div>

          <div className="market-card">
            <div className="market-box">
              <span>
                قیمت فعلی
              </span>

              <strong
                className={
                  marketPrice
                    ? "gold"
                    : "muted"
                }
              >
                {marketPrice
                  ? price(marketPrice)
                  : "—"}
              </strong>
            </div>

            <div className="market-box">
              <span>
                وضعیت
              </span>

              <strong
                className={
                  marketOpen
                    ? "green"
                    : "red"
                }
              >
                {marketOpen
                  ? "بازار باز"
                  : "بازار بسته"}
              </strong>
            </div>

            <div className="market-box">
              <span>
                موتور
              </span>

              <strong
                className={
                  activeSignal
                    ? "green"
                    : "gold"
                }
              >
                {activeSignal
                  ? "MONITORING"
                  : "SEARCHING"}
              </strong>
            </div>
          </div>
        </section>

        {/* CURRENT SIGNAL */}

        <section className="section">
          <div className="section-head">
            <h2>
              سیگنال جاری
            </h2>

            <span>
              فقط یک معامله جاری
            </span>
          </div>

          {!activeSignal ||
          !activeDirectionMatches ? (
            <div className="searching">
              <div className="search-icon">
                ⌕
              </div>

              <h3>
                {marketOpen
                  ? "در حال جستجوی بهترین سیگنال"
                  : "بازار بسته است"}
              </h3>

              <p>
                {marketOpen
                  ? "در حال حاضر هیچ سیگنال فعالی با شرایط تأییدشده وجود ندارد. موتور بازار را بررسی می‌کند و پس از تشکیل شرایط معتبر، سیگنال جدید در همین بخش نمایش داده می‌شود."
                  : "تا زمان باز شدن بازار، سیگنال جدیدی ایجاد یا نمایش داده نمی‌شود."}
              </p>

              {!marketOpen && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#e96a76",
                    fontSize: 9,
                  }}
                >
                  بازار بسته است
                </div>
              )}
            </div>
          ) : (
            <article
              className={`signal-card ${
                activeSignal.direction ===
                "BUY"
                  ? "buy"
                  : "sell"
              }`}
            >
              {/* SIGNAL HEADER */}

              <div className="signal-header">
                <div className="signal-main">
                  <div
                    className={`direction ${
                      activeSignal.direction ===
                      "BUY"
                        ? "buy"
                        : "sell"
                    }`}
                  >
                    {activeSignal.direction}

                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 7,
                        opacity: 0.72,
                      }}
                    >
                      {directionFa(
                        activeSignal.direction
                      )}
                    </small>
                  </div>

                  <div className="signal-name">
                    <strong>
                      {activeSignal.symbol ||
                        "XAUUSD"}
                    </strong>

                    <small>
                      {activeSignal.timeframe ||
                        "1min"}{" "}
                      ·{" "}
                      {activeSignal.source ||
                        "Signal Engine"}
                    </small>
                  </div>
                </div>

                <div className="badges">
                  <span className="badge">
                    {statusFa(
                      activeSignal.status
                    )}
                  </span>

                  <span className="badge gold-badge">
                    Score{" "}
                    {activeSignal.score ??
                      0}
                    /100
                  </span>

                  <span className="badge">
                    RR{" "}
                    {activeSignal.riskReward ??
                      "—"}
                  </span>

                  <span className="badge">
                    {getRiskLabel(
                      activeSignal
                    )}
                  </span>

                  <span className="badge">
                    سن سیگنال:{" "}
                    {getSignalAge(
                      activeSignal
                    )}
                  </span>
                </div>
              </div>

              <div className="signal-body">
                {/* PRICE LEVELS */}

                <div className="price-grid">
                  <div className="price-box entry">
                    <span>
                      ENTRY
                    </span>

                    <strong>
                      {price(
                        activeLevels.entry
                      )}
                    </strong>
                  </div>

                  <div className="price-box sl">
                    <span>
                      STOP LOSS
                    </span>

                    <strong>
                      {price(
                        activeLevels.sl
                      )}
                    </strong>
                  </div>

                  <div className="price-box tp">
                    <span>
                      TAKE PROFIT 1
                    </span>

                    <strong>
                      {price(
                        activeLevels.tp1
                      )}
                    </strong>
                  </div>

                  <div className="price-box tp">
                    <span>
                      TAKE PROFIT 2
                    </span>

                    <strong>
                      {price(
                        activeLevels.tp2
                      )}
                    </strong>
                  </div>

                  <div className="price-box tp">
                    <span>
                      TAKE PROFIT 3
                    </span>

                    <strong>
                      {price(
                        activeLevels.tp3
                      )}
                    </strong>
                  </div>
                </div>

                {/* PROGRESS */}

                <div className="progress-wrap">
                  <div className="progress-head">
                    <span>
                      پیشرفت مسیر تا TP3
                    </span>

                    <strong>
                      {progress.toFixed(0)}%
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>

                {/* MONEY */}

                <div className="money-grid">
                  <div className="money-box">
                    <span>
                      حجم کل
                    </span>

                    <strong>
                      {getRiskLabel(
                        activeSignal
                      )}
                    </strong>
                  </div>

                  <div className="money-box">
                    <span>
                      ریسک SL
                    </span>

                    <strong className="red">
                      {Number.isFinite(
                        Number(
                          activeRisk.stopLossDollars
                        )
                      )
                        ? usd(
                            -Math.abs(
                              Number(
                                activeRisk.stopLossDollars
                              )
                            )
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="money-box">
                    <span>
                      سود TP1
                    </span>

                    <strong className="green">
                      {Number.isFinite(
                        Number(
                          activeRisk.tp1Dollars
                        )
                      )
                        ? usd(
                            Number(
                              activeRisk.tp1Dollars
                            )
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="money-box">
                    <span>
                      سود TP2 / TP3
                    </span>

                    <strong className="gold">
                      {Number.isFinite(
                        Number(
                          activeRisk.tp2Dollars
                        )
                      ) &&
                      Number.isFinite(
                        Number(
                          activeRisk.tp3Dollars
                        )
                      )
                        ? `${usd(
                            Number(
                              activeRisk.tp2Dollars
                            )
                          )} / ${usd(
                            Number(
                              activeRisk.tp3Dollars
                            )
                          )}`
                        : "—"}
                    </strong>
                  </div>
                </div>

                {/* MANAGEMENT */}

                <div className="management">
                  <div className="management-head">
                    <span>
                      وضعیت مدیریت معامله
                    </span>

                    <strong>
                      {getRiskLabel(
                        activeSignal
                      )}
                    </strong>
                  </div>

                  <div className="target-row">
                    <span
                      className={`target ${
                        activeState.tp1Hit
                          ? "hit"
                          : ""
                      }`}
                    >
                      {activeState.tp1Hit
                        ? "✓"
                        : "○"}{" "}
                      TP1
                    </span>

                    <span
                      className={`target ${
                        activeState.tp2Hit
                          ? "hit"
                          : ""
                      }`}
                    >
                      {activeState.tp2Hit
                        ? "✓"
                        : "○"}{" "}
                      TP2
                    </span>

                    <span
                      className={`target ${
                        activeState.tp3Hit
                          ? "hit"
                          : ""
                      }`}
                    >
                      {activeState.tp3Hit
                        ? "✓"
                        : "○"}{" "}
                      TP3
                    </span>

                    <span
                      className={`target ${
                        activeState.breakeven
                          ? "hit"
                          : ""
                      }`}
                    >
                      {activeState.breakeven
                        ? "✓"
                        : "○"}{" "}
                      BE
                    </span>

                    <span
                      className={`target ${
                        activeState.slHit
                          ? "stop"
                          : ""
                      }`}
                    >
                      {activeState.slHit
                        ? "✓"
                        : "○"}{" "}
                      SL
                    </span>
                  </div>
                </div>

                {/* CONFIRMATIONS */}

                <div className="confirmations">
                  <Confirmation
                    label="Trend"
                    value={
                      activeSignal.marketStructure ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="Liquidity"
                    value={
                      activeSignal.liquidity ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="Pullback"
                    value={
                      activeSignal.pullback ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="Candle"
                    value={
                      activeSignal.candlePattern ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="Volume"
                    value={
                      activeSignal.volumeConfirmation ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="MTF"
                    value={
                      activeSignal.multiTimeframeConfirmation ||
                      `${confirmationCount} تأیید`
                    }
                  />

                  <Confirmation
                    label="Session"
                    value={
                      activeSignal.sessionConfirmation ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="News"
                    value={
                      activeSignal.newsConfirmation ||
                      "فیلتر خبر"
                    }
                  />

                  <Confirmation
                    label="Volatility"
                    value={
                      activeSignal.volatilityConfirmation ||
                      "بررسی شد"
                    }
                  />

                  <Confirmation
                    label="Confidence"
                    value={
                      activeSignal.confidence != null
                        ? `${activeSignal.confidence}%`
                        : "—"
                    }
                  />
                </div>

                {/* REASONS */}

                {activeReasons.length > 0 && (
                  <div className="reasons">
                    <div className="reasons-title">
                      منطق تشکیل سیگنال
                    </div>

                    <div className="reason-list">
                      {activeReasons.map(
                        (
                          reason,
                          index
                        ) => (
                          <span
                            className="reason"
                            key={`${String(
                              reason
                            )}-${index}`}
                          >
                            ✓{" "}
                            {String(
                              reason
                            )}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* EVENTS */}

                {activeEvents.length >
                  0 && (
                  <div className="events">
                    {[
                      ...activeEvents,
                    ]
                      .reverse()
                      .map(
                        (
                          event,
                          index
                        ) => (
                          <div
                            className="event"
                            key={`${event.type}-${event.at}-${index}`}
                          >
                            <div className="event-left">
                              <strong>
                                {eventFa(
                                  event.type
                                )}
                              </strong>

                              <small>
                                {dateFa(
                                  event.at
                                )}{" "}
                                ·{" "}
                                {price(
                                  event.price
                                )}
                              </small>
                            </div>

                            <strong
                              className={
                                Number(
                                  event.pnlUsd ||
                                    0
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
                        )
                      )}
                  </div>
                )}

                {/* FOOTER */}

                <div className="signal-footer">
                  <span>
                    ایجاد:{" "}
                    {dateFa(
                      activeSignal.createdAt
                    )}
                  </span>

                  <span>
                    قیمت فعلی:{" "}
                    {price(
                      getLatestPrice(
                        activeSignal
                      )
                    )}
                  </span>

                  <span
                    className={
                      activeSignal.telegramSent
                        ? "telegram-ok"
                        : "telegram-failed"
                    }
                  >
                    Telegram:{" "}
                    {activeSignal.telegramSent
                      ? "✓ ارسال شد"
                      : "— ارسال نشده"}
                  </span>
                </div>
              </div>
            </article>
          )}
        </section>

        {/* SUPPORT / RESISTANCE */}

        <section className="section">
          <div className="section-head">
            <h2>
              حمایت و مقاومت
            </h2>

            <span>
              آخرین سطوح ثبت‌شده توسط موتور
            </span>
          </div>

          <div className="levels">
            <div className="level">
              <span>
                Support
              </span>

              <strong className="green">
                {levels.support
                  ? price(levels.support)
                  : "—"}
              </strong>

              <small>
                آخرین حمایت استخراج‌شده از داده موتور
              </small>
            </div>

            <div className="level">
              <span>
                Resistance
              </span>

              <strong className="red">
                {levels.resistance
                  ? price(
                      levels.resistance
                    )
                  : "—"}
              </strong>

              <small>
                آخرین مقاومت استخراج‌شده از داده موتور
              </small>
            </div>
          </div>
        </section>

        {/* HISTORY */}

        <section className="section">
          <div className="section-head">
            <h2>
              کارنامه سیگنال‌ها
            </h2>

            <span>
              فقط معاملات بسته‌شده
            </span>
          </div>

          {busy &&
          allSignals.length === 0 ? (
            <div className="loading">
              در حال دریافت کارنامه...
            </div>
          ) : closedSignals.length === 0 ? (
            <div className="searching">
              <div className="search-icon">
                ✓
              </div>

              <h3>
                هنوز معامله بسته‌شده‌ای ثبت نشده
              </h3>

              <p>
                بعد از ثبت TP یا SL،
                نتیجه معامله در این قسمت
                ذخیره و نمایش داده می‌شود.
              </p>
            </div>
          ) : (
            <div className="history">
              {closedSignals.map(
                (signal) => {
                  const signalLevels =
                    getSignalLevels(
                      signal
                    );

                  const meta =
                    getMeta(signal);

                  const events =
                    Array.isArray(
                      meta.events
                    )
                      ? meta.events
                      : [];

                  const lastEvent =
                    events.length > 0
                      ? events[
                          events.length -
                            1
                        ]
                      : null;

                  return (
                    <div
                      className="history-item"
                      key={signal.id}
                    >
                      <div
                        className={`history-direction ${
                          signal.direction ===
                          "BUY"
                            ? "buy"
                            : "sell"
                        }`}
                      >
                        {signal.direction}
                      </div>

                      <div className="history-symbol">
                        <strong>
                          {signal.symbol}
                        </strong>

                        <small>
                          Entry{" "}
                          {price(
                            signalLevels.entry
                          )}{" "}
                          ·{" "}
                          {signal.timeframe ||
                            "1min"}
                        </small>
                      </div>

                      <div className="history-price">
                        {lastEvent
                          ? `${eventFa(
                              lastEvent.type
                            )} · ${price(
                              lastEvent.price
                            )}`
                          : statusFa(
                              signal.status
                            )}
                      </div>

                      <div className="history-status">
                        <span
                          className={
                            signal.status ===
                              "SL_HIT" ||
                            signal.status ===
                              "BE"
                              ? "red"
                              : "green"
                          }
                        >
                          {statusFa(
                            signal.status
                          )}
                        </span>
                      </div>

                      <div className="history-time">
                        {dateFa(
                          signal.closedAt ||
                            signal.createdAt
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* PERFORMANCE */}

        <section className="section">
          <div className="section-head">
            <h2>
              عملکرد ثبت‌شده
            </h2>

            <span>
              بر اساس داده‌های ذخیره‌شده سیستم
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

        {/* FOOTER */}

        <footer className="footer">
          <div>
            XAUUSD · Signal Engine
          </div>

          <div>
            سیگنال جاری تا رسیدن به وضعیت نهایی
            جایگزین نمی‌شود.
          </div>

          <div>
            {activeSignal
              ? `سیگنال جاری: ${activeSignal.direction} · Entry ${price(
                  activeLevels.entry
                )}`
              : "در حال جستجوی بهترین سیگنال بازار"}
          </div>

          {activeSignal?.metadata
            ?.lastPriceAt && (
            <div>
              آخرین قیمت ثبت‌شده:{" "}
              {dateFa(
                activeSignal.metadata
                  .lastPriceAt
              )}
            </div>
          )}
        </footer>
      </div>
    </main>
  );
}

function Confirmation({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const positive =
    Boolean(value) &&
    ![
      "بررسی شد",
      "فیلتر خبر",
      "—",
    ].includes(value);

  return (
    <div className="confirmation">
      <span>{label}</span>

      <strong
        className={
          positive
            ? "positive"
            : ""
        }
      >
        {value}
      </strong>
    </div>
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
  const pnl =
    Number(data.pnlUsd || 0);

  return (
    <div className="performance-card">
      <h3>{title}</h3>

      <div className="performance-row">
        <div className="performance-cell">
          <span>
            سیگنال
          </span>

          <strong>
            {data.signals ?? 0}
          </strong>
        </div>

        <div className="performance-cell">
          <span>
            برد
          </span>

          <strong className="green">
            {data.wins ?? 0}
          </strong>
        </div>

        <div className="performance-cell">
          <span>
            باخت
          </span>

          <strong className="red">
            {data.losses ?? 0}
          </strong>
        </div>
      </div>

      <div
        className="performance-row"
        style={{
          marginTop: 8,
        }}
      >
        <div className="performance-cell">
          <span>
            Win Rate
          </span>

          <strong className="gold">
            {data.winRate ?? 0}%
          </strong>
        </div>

        <div className="performance-cell">
          <span>
            خالص USD
          </span>

          <strong
            className={
              pnl >= 0
                ? "green"
                : "red"
            }
          >
            {usd(pnl)}
          </strong>
        </div>

        <div className="performance-cell">
          <span>
            وضعیت
          </span>

          <strong>
            {pnl > 0
              ? "مثبت"
              : pnl < 0
              ? "منفی"
              : "خنثی"}
          </strong>
        </div>
      </div>
    </div>
  );
}
