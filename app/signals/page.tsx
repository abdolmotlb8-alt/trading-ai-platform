"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SideType = "BUY" | "SELL" | "WAIT";

type SignalStatus =
  | "ACTIVE"
  | "WAITING"
  | "TP1"
  | "TP2"
  | "TP3"
  | "STOP_LOSS"
  | "SL"
  | "EXPIRED"
  | "CLOSED"
  | "WIN"
  | "LOSS"
  | "BREAKEVEN"
  | string;

type Signal = {
  id: string;

  symbol: string;
  name: string;
  market: string;
  interval: string;

  side: SideType;

  price: number;
  entry: number;

  stopLoss: number | null;

  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;

  riskReward: number | null;

  confidence: number;
  strength: number;

  trend: string;

  rsi: number;
  ema20: number;
  ema50: number;

  macd: number;
  macdSignal: number;
  macdHistogram: number;

  atr: number;

  support1: number | null;
  support2: number | null;

  resistance1: number | null;
  resistance2: number | null;

  candleTime: string;
  generatedAt: string;

  reasons: string[];

  status?: SignalStatus;
  result?: string;

  telegramSent?: boolean;

  currentPrice?: number | null;
  lastCheckedAt?: string | null;

  createdAt?: string;
  expiresAt?: string | null;
  closedAt?: string | null;

  tp1HitAt?: string | null;
  tp2HitAt?: string | null;
  tp3HitAt?: string | null;
  stopLossHitAt?: string | null;

  realizedProfitLoss?: number | null;

  riskUsd?: number | null;
  takeProfit1Usd?: number | null;
  takeProfit2Usd?: number | null;
  takeProfit3Usd?: number | null;

  confirmations?: string[];
};

type APIResponse = {
  success: boolean;

  source?: string;
  generatedAt?: string;
  interval?: string;

  signals?: unknown[];

  errors?: Array<{
    symbol: string;
    error: string;
  }>;

  summary?: {
    total: number;
    buy: number;
    sell: number;
    wait: number;
  };

  performance?: {
    daily?: {
      trades?: number;
      wins?: number;
      losses?: number;
      profitLoss?: number;
    };
    weekly?: {
      trades?: number;
      wins?: number;
      losses?: number;
      profitLoss?: number;
    };
    monthly?: {
      trades?: number;
      wins?: number;
      losses?: number;
      profitLoss?: number;
    };
  };

  error?: string;
};

type FilterType = "ALL" | "BUY" | "SELL";

const TIMEFRAMES = [
  {
    value: "5min",
    label: "۵ دقیقه",
  },
  {
    value: "15min",
    label: "۱۵ دقیقه",
  },
  {
    value: "30min",
    label: "۳۰ دقیقه",
  },
  {
    value: "1h",
    label: "۱ ساعت",
  },
  {
    value: "4h",
    label: "۴ ساعت",
  },
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toNumber(
  value: unknown,
  fallback: number | null = null
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(
  value: unknown,
  fallback = ""
) {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return fallback;
}

function pickNumber(
  objects: unknown[],
  keys: string[]
) {
  for (const object of objects) {
    if (!isRecord(object)) {
      continue;
    }

    for (const key of keys) {
      const value = toNumber(
        object[key]
      );

      if (
        value !== null &&
        Number.isFinite(value)
      ) {
        return value;
      }
    }
  }

  return null;
}

function pickString(
  objects: unknown[],
  keys: string[]
) {
  for (const object of objects) {
    if (!isRecord(object)) {
      continue;
    }

    for (const key of keys) {
      const value =
        toStringValue(object[key]);

      if (value) {
        return value;
      }
    }
  }

  return "";
}

function pickBoolean(
  objects: unknown[],
  keys: string[]
) {
  for (const object of objects) {
    if (!isRecord(object)) {
      continue;
    }

    for (const key of keys) {
      if (
        typeof object[key] ===
        "boolean"
      ) {
        return object[key] as boolean;
      }
    }
  }

  return false;
}

function pickDate(
  objects: unknown[],
  keys: string[]
) {
  for (const object of objects) {
    if (!isRecord(object)) {
      continue;
    }

    for (const key of keys) {
      const value =
        object[key];

      if (
        typeof value === "string" &&
        value
      ) {
        return value;
      }
    }
  }

  return "";
}

function getNestedObjects(
  raw: Record<string, unknown>
) {
  const list: unknown[] = [
    raw,
  ];

  const possibleKeys = [
    "metadata",
    "risk",
    "levels",
    "state",
    "indicators",
    "analysis",
    "technical",
    "supportResistance",
    "performance",
  ];

  for (const key of possibleKeys) {
    const value = raw[key];

    if (isRecord(value)) {
      list.push(value);
    }
  }

  if (isRecord(raw.metadata)) {
    for (const key of [
      "risk",
      "levels",
      "state",
      "indicators",
      "analysis",
      "technical",
      "supportResistance",
      "performance",
    ]) {
      const value =
        raw.metadata[key];

      if (isRecord(value)) {
        list.push(value);
      }
    }
  }

  return list;
}

function normalizeSignal(
  input: unknown,
  index: number
): Signal | null {
  if (!isRecord(input)) {
    return null;
  }

  const raw = input;

  const nested =
    getNestedObjects(raw);

  const metadata =
    isRecord(raw.metadata)
      ? raw.metadata
      : {};

  const bot =
    isRecord(raw.bot)
      ? raw.bot
      : {};

  const symbol =
    pickString(
      [...nested, bot],
      [
        "symbol",
        "pair",
        "instrument",
      ]
    ) || "UNKNOWN";

  const id =
    pickString(
      nested,
      ["id"]
    ) ||
    `${symbol}-${index}-${Date.now()}`;

  const sideRaw =
    pickString(
      nested,
      [
        "side",
        "direction",
        "signal",
      ]
    ).toUpperCase();

  const side: SideType =
    sideRaw === "BUY"
      ? "BUY"
      : sideRaw === "SELL"
      ? "SELL"
      : "WAIT";

  const status =
    pickString(
      nested,
      [
        "status",
        "signalStatus",
      ]
    ) || "ACTIVE";

  const entry =
    pickNumber(
      nested,
      [
        "entry",
        "entryPrice",
        "entryLevel",
        "openPrice",
      ]
    ) ?? 0;

  const price =
    pickNumber(
      nested,
      [
        "price",
        "currentPrice",
        "marketPrice",
        "lastPrice",
      ]
    ) ?? entry;

  const stopLoss =
    pickNumber(
      nested,
      [
        "stopLoss",
        "sl",
        "stop",
        "stopLossPrice",
      ]
    );

  const tp1 =
    pickNumber(
      nested,
      [
        "takeProfit1",
        "tp1",
        "tp1Price",
        "target1",
      ]
    );

  const tp2 =
    pickNumber(
      nested,
      [
        "takeProfit2",
        "tp2",
        "tp2Price",
        "target2",
      ]
    );

  const tp3 =
    pickNumber(
      nested,
      [
        "takeProfit3",
        "tp3",
        "tp3Price",
        "target3",
        "takeProfit",
        "takeProfitPrice",
      ]
    );

  const confidence =
    pickNumber(
      nested,
      [
        "confidence",
        "signalConfidence",
        "score",
      ]
    ) ?? 0;

  const strength =
    pickNumber(
      nested,
      [
        "strength",
        "score",
        "confidence",
        "signalScore",
      ]
    ) ?? confidence;

  const riskReward =
    pickNumber(
      nested,
      [
        "riskReward",
        "rr",
        "riskRewardRatio",
      ]
    );

  const rsi =
    pickNumber(
      nested,
      [
        "rsi",
        "RSI",
      ]
    ) ?? 0;

  const ema20 =
    pickNumber(
      nested,
      [
        "ema20",
        "EMA20",
        "ema_20",
      ]
    ) ?? 0;

  const ema50 =
    pickNumber(
      nested,
      [
        "ema50",
        "EMA50",
        "ema_50",
      ]
    ) ?? 0;

  const macd =
    pickNumber(
      nested,
      [
        "macd",
        "MACD",
      ]
    ) ?? 0;

  const macdSignal =
    pickNumber(
      nested,
      [
        "macdSignal",
        "MACDSignal",
        "macd_signal",
      ]
    ) ?? 0;

  const macdHistogram =
    pickNumber(
      nested,
      [
        "macdHistogram",
        "MACDHistogram",
        "histogram",
      ]
    ) ?? 0;

  const atr =
    pickNumber(
      nested,
      [
        "atr",
        "ATR",
      ]
    ) ?? 0;

  const support1 =
    pickNumber(
      nested,
      [
        "support1",
        "support",
        "s1",
      ]
    );

  const support2 =
    pickNumber(
      nested,
      [
        "support2",
        "s2",
      ]
    );

  const resistance1 =
    pickNumber(
      nested,
      [
        "resistance1",
        "resistance",
        "r1",
      ]
    );

  const resistance2 =
    pickNumber(
      nested,
      [
        "resistance2",
        "r2",
      ]
    );

  const currentPrice =
    pickNumber(
      nested,
      [
        "currentPrice",
        "livePrice",
        "lastPrice",
        "marketPrice",
      ]
    );

  const riskUsd =
    pickNumber(
      nested,
      [
        "riskUsd",
        "riskUSD",
        "risk",
        "stopLossUsd",
      ]
    );

  const tp1Usd =
    pickNumber(
      nested,
      [
        "takeProfit1Usd",
        "tp1Usd",
        "tp1USD",
      ]
    );

  const tp2Usd =
    pickNumber(
      nested,
      [
        "takeProfit2Usd",
        "tp2Usd",
        "tp2USD",
      ]
    );

  const tp3Usd =
    pickNumber(
      nested,
      [
        "takeProfit3Usd",
        "tp3Usd",
        "tp3USD",
      ]
    );

  const realizedProfitLoss =
    pickNumber(
      nested,
      [
        "realizedProfitLoss",
        "profitLoss",
        "pnl",
        "realizedPnl",
        "profit",
      ]
    );

  const trend =
    pickString(
      nested,
      [
        "trend",
        "directionTrend",
        "marketTrend",
      ]
    ) || "NEUTRAL";

  const market =
    pickString(
      [...nested, bot],
      [
        "market",
        "marketType",
        "type",
      ]
    ) || "FOREX";

  const interval =
    pickString(
      [...nested, bot],
      [
        "interval",
        "timeframe",
        "timeFrame",
      ]
    ) || "15min";

  const name =
    pickString(
      [...nested, bot],
      [
        "name",
        "assetName",
      ]
    ) || symbol;

  const createdAt =
    pickDate(
      nested,
      [
        "createdAt",
        "generatedAt",
      ]
    );

  const generatedAt =
    pickDate(
      nested,
      [
        "generatedAt",
        "createdAt",
      ]
    ) ||
    new Date().toISOString();

  const candleTime =
    pickDate(
      nested,
      [
        "candleTime",
        "timestamp",
        "time",
        "candleAt",
      ]
    ) || generatedAt;

  const expiresAt =
    pickDate(
      nested,
      [
        "expiresAt",
        "expiry",
        "expiration",
      ]
    ) || null;

  const closedAt =
    pickDate(
      nested,
      [
        "closedAt",
        "completedAt",
      ]
    ) || null;

  const lastCheckedAt =
    pickDate(
      nested,
      [
        "lastCheckedAt",
        "checkedAt",
        "updatedAt",
      ]
    ) || null;

  const tp1HitAt =
    pickDate(
      nested,
      [
        "tp1HitAt",
        "tp1At",
        "takeProfit1HitAt",
      ]
    ) || null;

  const tp2HitAt =
    pickDate(
      nested,
      [
        "tp2HitAt",
        "tp2At",
        "takeProfit2HitAt",
      ]
    ) || null;

  const tp3HitAt =
    pickDate(
      nested,
      [
        "tp3HitAt",
        "tp3At",
        "takeProfit3HitAt",
      ]
    ) || null;

  const stopLossHitAt =
    pickDate(
      nested,
      [
        "stopLossHitAt",
        "slHitAt",
        "stopAt",
      ]
    ) || null;

  const telegramSent =
    pickBoolean(
      nested,
      [
        "telegramSent",
        "telegramDelivered",
      ]
    );

  let reasons: string[] = [];

  const possibleReasons: unknown[] = [
    raw.reasons,
    metadata.reasons,
    raw.confirmations,
    metadata.confirmations,
  ];

  for (
    const value of possibleReasons
  ) {
    if (
      Array.isArray(value)
    ) {
      reasons = value
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
        .map((item) =>
          item.trim()
        )
        .filter(Boolean);

      if (
        reasons.length > 0
      ) {
        break;
      }
    }
  }

  const confirmations =
    Array.isArray(
      raw.confirmations
    )
      ? raw.confirmations
          .filter(
            (
              item
            ): item is string =>
              typeof item ===
              "string"
          )
      : [];

  return {
    id,

    symbol,
    name,
    market,
    interval,

    side,

    price,
    entry,

    stopLoss,

    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,

    riskReward,

    confidence,
    strength,

    trend,

    rsi,
    ema20,
    ema50,

    macd,
    macdSignal,
    macdHistogram,

    atr,

    support1,
    support2,

    resistance1,
    resistance2,

    candleTime,
    generatedAt,

    reasons,

    status,
    result:
      pickString(
        nested,
        [
          "result",
          "tradeResult",
        ]
      ) || "OPEN",

    telegramSent,

    currentPrice:
      currentPrice ??
      price,

    lastCheckedAt,

    createdAt:
      createdAt ||
      generatedAt,

    expiresAt,
    closedAt,

    tp1HitAt,
    tp2HitAt,
    tp3HitAt,
    stopLossHitAt,

    realizedProfitLoss,

    riskUsd,
    takeProfit1Usd:
      tp1Usd,
    takeProfit2Usd:
      tp2Usd,
    takeProfit3Usd:
      tp3Usd,

    confirmations,
  };
}

function formatPrice(
  value:
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  if (value >= 100) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 3,
      }
    );
  }

  if (value >= 10) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 4,
      }
    );
  }

  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 6,
    }
  );
}

function formatNumber(
  value:
    | number
    | null
    | undefined,
  digits = 2
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits:
        digits,
    }
  );
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "fa-IR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

function symbolIcon(
  symbol: string
) {
  const normalized =
    symbol
      .toUpperCase()
      .replace(
        /[\s_-]/g,
        ""
      );

  if (
    normalized.includes(
      "XAU"
    )
  ) {
    return "Au";
  }

  if (
    normalized.includes(
      "BTC"
    )
  ) {
    return "₿";
  }

  if (
    normalized.includes(
      "ETH"
    )
  ) {
    return "Ξ";
  }

  if (
    normalized.includes(
      "EUR"
    )
  ) {
    return "€";
  }

  if (
    normalized.includes(
      "GBP"
    )
  ) {
    return "£";
  }

  if (
    normalized.includes(
      "JPY"
    )
  ) {
    return "¥";
  }

  return "◎";
}

function marketLabel(
  market: string
) {
  const value =
    market.toUpperCase();

  if (
    value === "FOREX"
  ) {
    return "FOREX";
  }

  if (
    value === "CRYPTO"
  ) {
    return "CRYPTO";
  }

  if (
    value === "COMMODITY"
  ) {
    return "COMMODITY";
  }

  return market;
}

function timeframeLabel(
  timeframe: string
) {
  const item =
    TIMEFRAMES.find(
      (entry) =>
        entry.value ===
        timeframe
    );

  return (
    item?.label ||
    timeframe
  );
}

function trendLabel(
  trend: string
) {
  const value =
    trend.toUpperCase();

  if (
    value === "BULLISH"
  ) {
    return "صعودی";
  }

  if (
    value === "BEARISH"
  ) {
    return "نزولی";
  }

  return "خنثی";
}

function statusLabel(
  signal: Signal
) {
  const status =
    signal.status ||
    "ACTIVE";

  if (
    status === "TP1"
  ) {
    return "TP1 فعال شد";
  }

  if (
    status === "TP2"
  ) {
    return "TP2 فعال شد";
  }

  if (
    status === "TP3"
  ) {
    return "TP3 تکمیل شد";
  }

  if (
    status ===
      "STOP_LOSS" ||
    status === "SL"
  ) {
    return "حد ضرر فعال شد";
  }

  if (
    status === "EXPIRED"
  ) {
    return "منقضی شده";
  }

  if (
    status ===
      "CLOSED" ||
    status === "WIN"
  ) {
    return "بسته شده";
  }

  if (
    status === "LOSS"
  ) {
    return "زیان";
  }

  if (
    status ===
    "BREAKEVEN"
  ) {
    return "سر به سر";
  }

  if (
    status ===
      "WAITING" ||
    signal.side === "WAIT"
  ) {
    return "در انتظار";
  }

  return "سیگنال فعال";
}

function statusClass(
  signal: Signal
) {
  const status =
    signal.status ||
    "ACTIVE";

  if (
    status === "TP1" ||
    status === "TP2" ||
    status === "TP3" ||
    status === "WIN"
  ) {
    return "status-success";
  }

  if (
    status ===
      "STOP_LOSS" ||
    status === "SL" ||
    status === "LOSS"
  ) {
    return "status-danger";
  }

  if (
    status ===
      "EXPIRED" ||
    status ===
      "BREAKEVEN"
  ) {
    return "status-warning";
  }

  return "status-active";
}

function Side({
  side,
}: {
  side: SideType;
}) {
  if (
    side === "BUY"
  ) {
    return (
      <span className="side side-buy">
        <span className="side-icon">
          ↗
        </span>
        BUY
      </span>
    );
  }

  if (
    side === "SELL"
  ) {
    return (
      <span className="side side-sell">
        <span className="side-icon">
          ↘
        </span>
        SELL
      </span>
    );
  }

  return (
    <span className="side side-wait">
      <span className="side-icon">
        ◌
      </span>
      WAIT
    </span>
  );
}

function Metric({
  title,
  value,
  tone = "",
}: {
  title: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="metric">
      <span className="metric-title">
        {title}
      </span>

      <strong
        className={
          tone
            ? `metric-value ${tone}`
            : "metric-value"
        }
      >
        {value}
      </strong>
    </div>
  );
}

function TargetBox({
  label,
  value,
  tone,
  hit,
  usd,
}: {
  label: string;
  value:
    | number
    | null
    | undefined;
  tone:
    | "entry"
    | "sl"
    | "tp";
  hit?: boolean;
  usd?: number | null;
}) {
  return (
    <div
      className={`target-box ${tone} ${
        hit
          ? "target-hit"
          : ""
      }`}
    >
      <div className="target-head">
        <span>
          {label}
        </span>

        {hit && (
          <span className="hit-mark">
            ✓
          </span>
        )}
      </div>

      <strong>
        {formatPrice(value)}
      </strong>

      {usd !== null &&
        usd !== undefined && (
          <small>
            ${formatNumber(
              usd,
              2
            )}
          </small>
        )}
    </div>
  );
}

function StatCard({
  title,
  value,
  tone = "",
  subtitle,
}: {
  title: string;
  value: string;
  tone?: string;
  subtitle?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">
        {title}
      </span>

      <strong
        className={`stat-value ${tone}`}
      >
        {value}
      </strong>

      {subtitle && (
        <small className="stat-subtitle">
          {subtitle}
        </small>
      )}
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] =
    useState<Signal[]>([]);

  const [summary, setSummary] =
    useState({
      total: 0,
      buy: 0,
      sell: 0,
      wait: 0,
    });

  const [timeframe, setTimeframe] =
    useState("15min");

  const [filter, setFilter] =
    useState<FilterType>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdate, setLastUpdate] =
    useState("");

  const [apiErrors, setApiErrors] =
    useState<
      Array<{
        symbol: string;
        error: string;
      }>
    >([]);

  const [performance, setPerformance] =
    useState<
      APIResponse["performance"]
    >();

  const loadSignals =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await fetch(
              `/api/signals?interval=${encodeURIComponent(
                timeframe
              )}`,
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            ) || "";

          const text =
            await response.text();

          if (
            !contentType.includes(
              "application/json"
            )
          ) {
            throw new Error(
              `API پاسخ JSON نداده است. HTTP ${response.status}`
            );
          }

          let data: APIResponse;

          try {
            data =
              JSON.parse(
                text
              ) as APIResponse;
          } catch {
            throw new Error(
              "پاسخ API قابل خواندن نیست."
            );
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ||
                `API Error ${response.status}`
            );
          }

          const rawSignals =
            Array.isArray(
              data.signals
            )
              ? data.signals
              : [];

          const normalizedSignals =
            rawSignals
              .map(
                (
                  item,
                  index
                ) =>
                  normalizeSignal(
                    item,
                    index
                  )
              )
              .filter(
                (
                  item
                ): item is Signal =>
                  item !== null
              );

          setSignals(
            normalizedSignals
          );

          const nextSummary =
            data.summary || {
              total:
                normalizedSignals.length,

              buy:
                normalizedSignals.filter(
                  (item) =>
                    item.side ===
                    "BUY"
                ).length,

              sell:
                normalizedSignals.filter(
                  (item) =>
                    item.side ===
                    "SELL"
                ).length,

              wait:
                normalizedSignals.filter(
                  (item) =>
                    item.side ===
                    "WAIT"
                ).length,
            };

          setSummary(
            nextSummary
          );

          setApiErrors(
            Array.isArray(
              data.errors
            )
              ? data.errors
              : []
          );

          setPerformance(
            data.performance
          );

          setLastUpdate(
            data.generatedAt ||
              new Date().toISOString()
          );
        } catch (err) {
          console.error(
            "SIGNALS_PAGE_ERROR:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت سیگنال‌ها"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [timeframe]
    );

  useEffect(() => {
    loadSignals();

    const intervalId =
      window.setInterval(
        () => {
          loadSignals(true);
        },
        60_000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadSignals]);

  const visibleSignals =
    useMemo(() => {
      if (
        filter === "ALL"
      ) {
        return signals;
      }

      return signals.filter(
        (signal) =>
          signal.side ===
          filter
      );
    }, [
      signals,
      filter,
    ]);

  const activeCount =
    signals.filter(
      (signal) => {
        const status =
          signal.status ||
          "ACTIVE";

        return (
          status ===
            "ACTIVE" ||
          status ===
            "WAITING" ||
          status ===
            "TP1" ||
          status ===
            "TP2"
        );
      }
    ).length;

  const tpHitCount =
    signals.filter(
      (signal) =>
        !!signal.tp1HitAt ||
        !!signal.tp2HitAt ||
        !!signal.tp3HitAt
    ).length;

  const totalRealized =
    signals.reduce(
      (
        total,
        signal
      ) =>
        total +
        (signal.realizedProfitLoss ??
          0),
      0
    );

  return (
    <main
      dir="rtl"
      className="page"
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #030303;
          color: #f4efe3;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        body {
          min-width: 320px;
        }

        button,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(212, 175, 55, 0.14),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 30%,
              rgba(212, 175, 55, 0.06),
              transparent 24%
            ),
            linear-gradient(
              180deg,
              #090909 0%,
              #040404 55%,
              #020202 100%
            );
        }

        .container {
          width: min(1480px, calc(100% - 28px));
          margin: 0 auto;
          padding: 18px 0 65px;
        }

        .topbar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          min-height: 76px;
          padding: 12px 15px;
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 22px;
          background:
            linear-gradient(
              135deg,
              rgba(27, 25, 18, 0.96),
              rgba(8, 8, 8, 0.96)
            );
          backdrop-filter: blur(24px);
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.45);
        }

        .topbar::after {
          content: "";
          position: absolute;
          left: 14%;
          right: 14%;
          bottom: -1px;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(212, 175, 55, 0.75),
              transparent
            );
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          position: relative;
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          color: #050505;
          font-size: 15px;
          font-weight: 1000;
          background:
            linear-gradient(
              135deg,
              #fff2aa,
              #d4af37 42%,
              #896313
            );
          box-shadow:
            0 0 32px rgba(212, 175, 55, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.55);
        }

        .brand-logo::before {
          content: "";
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(0, 0, 0, 0.28);
          border-radius: 12px;
        }

        .brand-title {
          margin: 0;
          color: #f8f1df;
          font-size: 18px;
        }

        .brand-subtitle {
          margin: 5px 0 0;
          color: #80755e;
          font-size: 9px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border: 1px solid rgba(73, 219, 139, 0.22);
          border-radius: 999px;
          color: #a8ebbf;
          background: rgba(73, 219, 139, 0.05);
          font-size: 9px;
          white-space: nowrap;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #63e89b;
          box-shadow: 0 0 13px rgba(99, 232, 155, 0.85);
        }

        .hero {
          position: relative;
          overflow: hidden;
          margin-top: 15px;
          padding: 31px 28px;
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 27px;
          background:
            linear-gradient(
              135deg,
              rgba(31, 28, 19, 0.97),
              rgba(9, 9, 9, 0.98)
            );
          box-shadow:
            0 25px 85px rgba(0, 0, 0, 0.4);
        }

        .hero::before {
          content: "";
          position: absolute;
          width: 470px;
          height: 470px;
          top: -280px;
          left: -120px;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.08);
          filter: blur(65px);
        }

        .hero::after {
          content: "";
          position: absolute;
          right: -130px;
          bottom: -180px;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          border: 1px solid rgba(212, 175, 55, 0.06);
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 11px;
          color: #d4af37;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .eyebrow::before {
          content: "";
          width: 25px;
          height: 1px;
          background: #d4af37;
        }

        .hero h1 {
          margin: 0;
          color: #faf3df;
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1.25;
          font-weight: 900;
        }

        .hero-description {
          max-width: 950px;
          margin: 14px 0 0;
          color: #918874;
          font-size: 12px;
          line-height: 2.15;
        }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 25px;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .filter {
          min-width: 72px;
          padding: 10px 15px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          color: #817864;
          background: rgba(255, 255, 255, 0.025);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .filter:hover {
          color: #d4af37;
          border-color: rgba(212, 175, 55, 0.3);
        }

        .filter.active {
          color: #080705;
          border-color: rgba(212, 175, 55, 0.75);
          background:
            linear-gradient(
              135deg,
              #f4dc82,
              #d4af37,
              #99701a
            );
          box-shadow:
            0 8px 25px rgba(212, 175, 55, 0.14);
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .select,
        .refresh {
          min-height: 42px;
          padding: 0 13px;
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 11px;
          outline: none;
        }

        .select {
          min-width: 155px;
          color: #e9dfc4;
          background: #0c0c0b;
          cursor: pointer;
        }

        .select option {
          color: #eee4c8;
          background: #11100d;
        }

        .refresh {
          color: #080705;
          font-weight: 900;
          background:
            linear-gradient(
              135deg,
              #f2d779,
              #d4af37,
              #99701a
            );
          cursor: pointer;
          transition: 0.2s ease;
        }

        .refresh:hover {
          transform: translateY(-1px);
          box-shadow:
            0 8px 25px rgba(212, 175, 55, 0.17);
        }

        .refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .engine-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 13px 0;
        }

        .engine-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #aaa18f;
          font-size: 9px;
          white-space: nowrap;
        }

        .engine-status strong {
          color: #d4af37;
        }

        .engine-line {
          flex: 1;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(212, 175, 55, 0.2),
              transparent
            );
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 11px;
          margin: 13px 0;
        }

        .stat {
          position: relative;
          overflow: hidden;
          min-height: 105px;
          padding: 17px;
          border: 1px solid rgba(212, 175, 55, 0.11);
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              rgba(20, 19, 15, 0.96),
              rgba(7, 7, 7, 0.97)
            );
        }

        .stat::after {
          content: "";
          position: absolute;
          width: 85px;
          height: 85px;
          left: -38px;
          bottom: -45px;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.07);
          filter: blur(10px);
        }

        .stat-label {
          display: block;
          color: #746c5b;
          font-size: 9px;
        }

        .stat-value {
          display: block;
          margin-top: 8px;
          font-size: 27px;
          font-weight: 1000;
        }

        .stat-subtitle {
          display: block;
          margin-top: 4px;
          color: #625c4f;
          font-size: 8px;
        }

        .gold {
          color: #d4af37;
        }

        .green {
          color: #65e6a0;
        }

        .red {
          color: #ff7181;
        }

        .gray {
          color: #aaa18e;
        }

        .api-error-bar {
          margin-bottom: 13px;
          padding: 11px 14px;
          border: 1px solid rgba(217, 116, 75, 0.18);
          border-radius: 13px;
          color: #e8b9a4;
          background: rgba(150, 63, 38, 0.08);
          font-size: 9px;
          line-height: 1.9;
        }

        .performance {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .performance-card {
          padding: 14px;
          border: 1px solid rgba(212, 175, 55, 0.09);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.018);
        }

        .performance-card h4 {
          margin: 0 0 10px;
          color: #d4af37;
          font-size: 10px;
        }

        .performance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .performance-item {
          min-width: 0;
          padding: 8px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
        }

        .performance-item span {
          display: block;
          color: #625c4f;
          font-size: 7px;
        }

        .performance-item strong {
          display: block;
          margin-top: 4px;
          color: #d9d0bc;
          font-size: 9px;
        }

        .cards {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(365px, 1fr)
            );
          gap: 14px;
        }

        .card {
          position: relative;
          overflow: hidden;
          padding: 19px;
          border: 1px solid rgba(212, 175, 55, 0.14);
          border-radius: 23px;
          background:
            linear-gradient(
              145deg,
              rgba(20, 19, 16, 0.98),
              rgba(7, 7, 7, 0.99)
            );
          box-shadow:
            0 20px 65px rgba(0, 0, 0, 0.35);
          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          border-color: rgba(212, 175, 55, 0.28);
        }

        .card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              transparent,
              #d4af37,
              #fff1a8,
              #d4af37,
              transparent
            );
        }

        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .asset {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .asset-icon {
          display: grid;
          place-items: center;
          flex: none;
          width: 48px;
          height: 48px;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 14px;
          color: #e7c85d;
          background:
            linear-gradient(
              135deg,
              rgba(212, 175, 55, 0.16),
              rgba(212, 175, 55, 0.03)
            );
          font-size: 15px;
          font-weight: 1000;
        }

        .asset-name {
          margin: 0;
          color: #f4eedf;
          font-size: 15px;
          font-weight: 900;
        }

        .asset-description {
          display: block;
          margin-top: 4px;
          color: #6f6757;
          font-size: 9px;
        }

        .market-badge {
          display: inline-flex;
          margin-top: 5px;
          padding: 3px 7px;
          border: 1px solid rgba(212, 175, 55, 0.1);
          border-radius: 999px;
          color: #a89b7b;
          background: rgba(212, 175, 55, 0.045);
          font-size: 7px;
        }

        .side {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 1000;
        }

        .side-icon {
          font-size: 13px;
        }

        .side-buy {
          color: #65e6a0;
          border: 1px solid rgba(65, 223, 147, 0.2);
          background: rgba(65, 223, 147, 0.06);
        }

        .side-sell {
          color: #ff7181;
          border: 1px solid rgba(255, 84, 106, 0.2);
          background: rgba(255, 84, 106, 0.06);
        }

        .side-wait {
          color: #d4af37;
          border: 1px solid rgba(212, 175, 55, 0.2);
          background: rgba(212, 175, 55, 0.05);
        }

        .status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 12px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 8px;
          font-size: 8px;
          font-weight: 800;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-active {
          color: #e2bd4e;
          border: 1px solid rgba(212, 175, 55, 0.18);
          background: rgba(212, 175, 55, 0.05);
        }

        .status-active .status-dot {
          background: #d4af37;
          box-shadow: 0 0 8px rgba(212, 175, 55, 0.8);
        }

        .status-success {
          color: #65e6a0;
          border: 1px solid rgba(65, 223, 147, 0.17);
          background: rgba(65, 223, 147, 0.05);
        }

        .status-success .status-dot {
          background: #65e6a0;
        }

        .status-danger {
          color: #ff7181;
          border: 1px solid rgba(255, 84, 106, 0.17);
          background: rgba(255, 84, 106, 0.05);
        }

        .status-danger .status-dot {
          background: #ff7181;
        }

        .status-warning {
          color: #d4af37;
          border: 1px solid rgba(212, 175, 55, 0.17);
          background: rgba(212, 175, 55, 0.05);
        }

        .status-warning .status-dot {
          background: #d4af37;
        }

        .telegram {
          color: #716a5b;
          font-size: 8px;
        }

        .telegram.sent {
          color: #65e6a0;
        }

        .main-price {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin: 18px 0 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(212, 175, 55, 0.07);
        }

        .price-label {
          color: #716956;
          font-size: 8px;
        }

        .price {
          margin-top: 5px;
          color: #e4c75c;
          font-size: 27px;
          font-weight: 1000;
          letter-spacing: -0.7px;
        }

        .confidence {
          width: 125px;
        }

        .confidence-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
          color: #746c5c;
          font-size: 8px;
        }

        .confidence-top b {
          color: #d4af37;
        }

        .progress {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
        }

        .progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #9d7519,
              #d4af37,
              #fff0a1
            );
          transition: width 0.3s ease;
        }

        .target-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }

        .target-box {
          min-width: 0;
          padding: 10px 7px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.018);
        }

        .target-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 3px;
          margin-bottom: 6px;
        }

        .target-head > span:first-child {
          color: #686052;
          font-size: 7px;
          white-space: nowrap;
        }

        .target-box strong {
          display: block;
          overflow: hidden;
          color: #e8dfc8;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .target-box small {
          display: block;
          margin-top: 4px;
          color: #625c4f;
          font-size: 7px;
        }

        .target-box.entry {
          border-color: rgba(212, 175, 55, 0.13);
        }

        .target-box.sl {
          border-color: rgba(255, 84, 106, 0.13);
        }

        .target-box.sl strong {
          color: #ff7181;
        }

        .target-box.tp {
          border-color: rgba(65, 223, 147, 0.13);
        }

        .target-box.tp strong {
          color: #65e6a0;
        }

        .target-hit {
          box-shadow:
            inset 0 0 0 1px rgba(101, 230, 160, 0.13);
        }

        .hit-mark {
          color: #65e6a0;
          font-size: 9px;
        }

        .secondary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 7px;
        }

        .metric {
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.045);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.018);
        }

        .metric-title {
          display: block;
          margin-bottom: 4px;
          color: #625c4f;
          font-size: 7px;
        }

        .metric-value {
          display: block;
          overflow: hidden;
          color: #cfc7b5;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .levels-box,
        .reason-box {
          margin-top: 9px;
          padding: 12px;
          border: 1px solid rgba(212, 175, 55, 0.07);
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.22);
        }

        .levels-title,
        .reason-title {
          margin-bottom: 8px;
          color: #827966;
          font-size: 8px;
          font-weight: 800;
        }

        .sr {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .sr-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
          padding: 8px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.018);
        }

        .sr-item span {
          color: #625d50;
          font-size: 7px;
        }

        .sr-item strong {
          font-size: 8px;
        }

        .support {
          color: #aab8a9;
        }

        .resistance {
          color: #c49b96;
        }

        .reason {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 5px;
          color: #9d9686;
          font-size: 8px;
          line-height: 1.8;
        }

        .reason:first-of-type {
          margin-top: 0;
        }

        .reason-check {
          flex: none;
          color: #d4af37;
          font-weight: 900;
        }

        .result {
          margin-top: 9px;
          padding: 11px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 900;
        }

        .result-profit {
          color: #65e6a0;
          border: 1px solid rgba(65, 223, 147, 0.13);
          background: rgba(65, 223, 147, 0.04);
        }

        .result-loss {
          color: #ff7181;
          border: 1px solid rgba(255, 84, 106, 0.13);
          background: rgba(255, 84, 106, 0.04);
        }

        .empty,
        .error {
          padding: 58px 20px;
          text-align: center;
          border: 1px solid rgba(212, 175, 55, 0.11);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(20, 19, 15, 0.95),
              rgba(7, 7, 7, 0.97)
            );
          color: #8d8574;
          font-size: 11px;
          line-height: 2;
        }

        .empty-title {
          margin-bottom: 8px;
          color: #d4af37;
          font-size: 14px;
          font-weight: 900;
        }

        .empty-icon {
          display: grid;
          place-items: center;
          width: 55px;
          height: 55px;
          margin: 0 auto 13px;
          border: 1px solid rgba(212, 175, 55, 0.18);
          border-radius: 16px;
          color: #d4af37;
          background: rgba(212, 175, 55, 0.04);
          font-size: 21px;
        }

        .error {
          color: #e18b91;
          border-color: rgba(255, 84, 106, 0.14);
        }

        .retry {
          margin-top: 15px;
          padding: 10px 19px;
          border: 0;
          border-radius: 10px;
          color: #090806;
          background:
            linear-gradient(
              135deg,
              #f2d779,
              #d4af37,
              #99701a
            );
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        .loading {
          animation: loadingPulse 1.4s infinite;
        }

        @keyframes loadingPulse {
          50% {
            opacity: 0.45;
          }
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(212, 175, 55, 0.07);
          color: #625c4f;
          font-size: 7px;
          line-height: 1.8;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .source {
          margin-top: 24px;
          padding: 0 10px;
          color: #504b40;
          text-align: center;
          font-size: 7px;
          line-height: 2;
        }

        @media (max-width: 1050px) {
          .cards {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .target-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .target-box:nth-child(4) {
            grid-column: span 1;
          }

          .secondary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 800px) {
          .container {
            width: calc(100% - 16px);
            padding-top: 8px;
          }

          .hero {
            padding: 25px 17px;
            border-radius: 22px;
          }

          .toolbar {
            align-items: stretch;
          }

          .filters {
            width: 100%;
          }

          .filter {
            flex: 1;
            min-width: 0;
            padding: 9px 7px;
          }

          .actions {
            width: 100%;
            flex-direction: column;
          }

          .select,
          .refresh {
            width: 100%;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .performance {
            grid-template-columns: 1fr;
          }

          .cards {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .topbar {
            padding: 10px;
            border-radius: 18px;
          }

          .brand-logo {
            width: 43px;
            height: 43px;
            border-radius: 13px;
          }

          .brand-title {
            font-size: 14px;
          }

          .brand-subtitle {
            display: none;
          }

          .live {
            padding: 6px 8px;
            font-size: 8px;
          }

          .hero h1 {
            font-size: 27px;
          }

          .hero-description {
            font-size: 10px;
          }

          .stat {
            min-height: 91px;
            padding: 14px;
          }

          .stat-value {
            font-size: 23px;
          }

          .card {
            padding: 15px;
            border-radius: 19px;
          }

          .target-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .target-box:last-child {
            grid-column: span 2;
          }

          .main-price {
            align-items: flex-start;
            flex-direction: column;
          }

          .confidence {
            width: 100%;
          }

          .footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .engine-row {
            overflow: hidden;
          }

          .engine-line {
            min-width: 30px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <div className="container">

        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">
              AI
            </div>

            <div>
              <h2 className="brand-title">
                Trading AI
              </h2>

              <p className="brand-subtitle">
                Real Market Intelligence
              </p>
            </div>
          </div>

          <div className="live">
            <span className="live-dot" />
            موتور بازار فعال
          </div>
        </header>

        <section className="hero">
          <div className="hero-content">

            <div className="eyebrow">
              REAL MARKET SIGNAL ENGINE
            </div>

            <h1>
              مرکز سیگنال
              <br />
              Trading AI
            </h1>

            <p className="hero-description">
              سیگنال‌های این صفحه از
              موتور تحلیل Backend دریافت
              می‌شوند. قیمت بازار، Entry،
              Stop Loss، TP1، TP2 و TP3
              از داده‌های واقعی محاسبه‌شده
              توسط موتور سیگنال نمایش داده
              می‌شوند. این رابط کاربری هیچ
              سیگنال ساختگی تولید نمی‌کند.
            </p>

            <div className="toolbar">

              <div className="filters">

                <button
                  type="button"
                  className={
                    filter === "ALL"
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter("ALL")
                  }
                >
                  همه
                </button>

                <button
                  type="button"
                  className={
                    filter === "BUY"
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter("BUY")
                  }
                >
                  BUY
                </button>

                <button
                  type="button"
                  className={
                    filter === "SELL"
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter("SELL")
                  }
                >
                  SELL
                </button>

              </div>

              <div className="actions">

                <select
                  className="select"
                  value={timeframe}
                  onChange={(event) =>
                    setTimeframe(
                      event.target.value
                    )
                  }
                >
                  {TIMEFRAMES.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        تایم‌فریم:{" "}
                        {item.label}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  className="refresh"
                  onClick={() =>
                    loadSignals(true)
                  }
                  disabled={refreshing}
                >
                  {refreshing
                    ? "در حال تحلیل..."
                    : "↻ بروزرسانی بازار"}
                </button>

              </div>
            </div>
          </div>
        </section>

        <div className="engine-row">

          <div className="engine-status">
            <span className="live-dot" />

            <span>
              موتور تحلیل:
            </span>

            <strong>
              REAL DATA
            </strong>
          </div>

          <div className="engine-line" />

          <div className="engine-status">
            <span>
              تایم‌فریم:
            </span>

            <strong>
              {timeframeLabel(
                timeframe
              )}
            </strong>
          </div>

        </div>

        <section className="stats">

          <StatCard
            title="خروجی موتور"
            value={String(
              summary.total
            )}
            tone="gold"
            subtitle="Signal Engine"
          />

          <StatCard
            title="BUY"
            value={String(
              summary.buy
            )}
            tone="green"
            subtitle="سیگنال خرید"
          />

          <StatCard
            title="SELL"
            value={String(
              summary.sell
            )}
            tone="red"
            subtitle="سیگنال فروش"
          />

          <StatCard
            title="فعال"
            value={String(
              activeCount
            )}
            tone="gray"
            subtitle="Open / Active"
          />

        </section>

        <section className="stats">

          <StatCard
            title="TP ثبت‌شده"
            value={String(
              tpHitCount
            )}
            tone="green"
            subtitle="TP Events"
          />

          <StatCard
            title="P/L فعلی"
            value={`$${formatNumber(
              totalRealized,
              2
            )}`}
            tone={
              totalRealized >= 0
                ? "green"
                : "red"
            }
            subtitle="نتایج ثبت‌شده"
          />

          <StatCard
            title="آخرین بروزرسانی"
            value={
              lastUpdate
                ? formatDate(
                    lastUpdate
                  )
                : "—"
            }
            tone="gold"
            subtitle="Market Refresh"
          />

          <StatCard
            title="وضعیت"
            value="LIVE"
            tone="green"
            subtitle="Backend Connected"
          />

        </section>

        {performance && (
          <section className="performance">

            {(
              [
                [
                  "امروز",
                  performance.daily,
                ],
                [
                  "این هفته",
                  performance.weekly,
                ],
                [
                  "این ماه",
                  performance.monthly,
                ],
              ] as const
            ).map(
              ([
                title,
                data,
              ]) => (
                <div
                  className="performance-card"
                  key={title}
                >
                  <h4>
                    عملکرد {title}
                  </h4>

                  <div className="performance-grid">

                    <div className="performance-item">
                      <span>
                        معاملات
                      </span>

                      <strong>
                        {data?.trades ??
                          0}
                      </strong>
                    </div>

                    <div className="performance-item">
                      <span>
                        برد
                      </span>

                      <strong className="green">
                        {data?.wins ??
                          0}
                      </strong>
                    </div>

                    <div className="performance-item">
                      <span>
                        سود/زیان
                      </span>

                      <strong
                        className={
                          (data?.profitLoss ??
                            0) >=
                          0
                            ? "green"
                            : "red"
                        }
                      >
                        $
                        {formatNumber(
                          data?.profitLoss ??
                            0,
                          2
                        )}
                      </strong>
                    </div>

                  </div>
                </div>
              )
            )}

          </section>
        )}

        {apiErrors.length > 0 && (
          <div className="api-error-bar">
            <strong>
              بعضی بازارها پاسخ نداده‌اند:
            </strong>{" "}
            {apiErrors
              .slice(0, 4)
              .map(
                (item) =>
                  `${item.symbol}: ${item.error}`
              )
              .join(" | ")}
          </div>
        )}

        {loading ? (
          <div className="empty loading">

            <div className="empty-icon">
              ◌
            </div>

            <div className="empty-title">
              در حال تحلیل واقعی بازار
            </div>

            دریافت قیمت، کندل‌ها،
            اندیکاتورها، ساختار بازار،
            حمایت و مقاومت و شرایط
            سیگنال...

          </div>
        ) : error ? (
          <div className="error">
