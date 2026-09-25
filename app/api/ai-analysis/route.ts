/* =========================================================
   app/api/ai-analysis/route.ts
   AI XAUUSD SIGNAL ENGINE — V2 (PROFESSIONAL)
   ---------------------------------------------------------
   ✅ ATR-based TP/SL (پویا)
   ✅ Trailing Stop بعد از TP2
   ✅ Fix: کندل بسته‌نشده در Monitor
   ✅ Fix: Win Rate دقیق
   ✅ Fix: FX Cache (کاهش API calls)
   ✅ Fix: Telegram Retry
   ✅ Fix: Session شبانه (Sydney)
   ✅ State Machine کامل
   ✅ Type-safe
   ========================================================= */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   CONFIG
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;
const TOTAL_LOT = 0.10;

const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

/* ریسک ثابت دلاری */
const STOP_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;
const TOTAL_POTENTIAL_USD = 80;

/* ---------- ATR-based فاصله‌ها (اصلاح شد) ---------- */
const ATR_SL_MULTIPLIER = 1.5;
const ATR_TP1_MULTIPLIER = 1.5;
const ATR_TP2_MULTIPLIER = 2.5;
const ATR_TP3_MULTIPLIER = 4.0;

const MIN_SL_DISTANCE = 3.0;
const MAX_SL_DISTANCE = 15.0;

/* ---------- Trailing بعد از TP2 ---------- */
const TRAILING_ATR_MULTIPLIER = 1.0;

/* تحلیل */
const SIGNAL_SCORE_MIN = 70;
const SIGNAL_CONFIRMATIONS_MIN = 3;

/* Cooldown */
const MIN_SIGNAL_COOLDOWN_MINUTES = 15;

/* خبر */
const NEWS_BLOCK_MINUTES = 30;

/* Cache */
const FX_CACHE_TTL_MS = 5 * 60 * 1000;
const PRICE_CACHE_TTL_MS = 10 * 1000;

/* Retry */
const TELEGRAM_RETRY_COUNT = 3;
const TELEGRAM_RETRY_DELAY_MS = 1000;

/* API */
const TD_KEY = process.env.TWELVE_DATA_API_KEY;
const NETARZ_KEY = process.env.NETARZ_API_KEY;
const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.SIGNALS_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

/* =========================================================
   TYPES
   ========================================================= */

type Direction = "BUY" | "SELL";
type SessionName = "Sydney" | "Tokyo" | "London" | "New York";
type SignalState = "WAITING" | "TP1" | "TP2" | "TP3" | "SL" | "BREAKEVEN";
type EventType = "TP1" | "TP2" | "TP3" | "SL" | "BREAKEVEN";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type EventRecord = {
  id: string;
  type: EventType;
  at: string;
  price: number;
  lotClosed: number;
  pnlUsd: number;
  pnlToman: number;
  usdToToman: number;
  telegramSent: boolean;
  telegramMessageId?: string;
  telegramError?: string;
};

type SignalMeta = {
  kind: "AI_XAUUSD_SIGNAL";
  symbol: string;
  direction: Direction;

  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;

  slDistance: number;
  tp1Distance: number;
  tp2Distance: number;
  tp3Distance: number;

  totalLot: number;
  tp1Lot: number;
  tp2Lot: number;
  tp3Lot: number;

  riskUsd: number;
  tp1Usd: number;
  tp2Usd: number;
  tp3Usd: number;
  totalPotentialUsd: number;

  usdToToman: number;
  usdToTomanAsOf: string;
  riskToman: number;
  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  totalPotentialToman: number;

  session: SessionName;
  sessionFa: string;
  sessionFlag: string;
  iranTime: string;

  timeframe: string;
  score: number;
  confirmations: number;
  reasons: string[];

  support: number;
  resistance: number;
  currentPrice: number;

  state: SignalState;
  riskFreeActive: boolean;
  trailingActive: boolean;
  trailingStop?: number;

  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  closed: boolean;

  events: EventRecord[];
  analysis: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;

  telegramInitialSent: boolean;
  telegramInitialMessageId?: string;
  telegramInitialError?: string;
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))}`;
}

function formatToman(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${new Intl.NumberFormat("fa-IR").format(
    Math.round(Math.abs(value))
  )} تومان`;
}

function formatPrice(value: number): string {
  return Number(value).toFixed(2);
}

function formatLot(value: number): string {
  return value.toFixed(2);
}

function iranDateTime(date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* =========================================================
   IN-MEMORY CACHE
   ========================================================= */

type CacheEntry<T> = { value: T; expiresAt: number };
const memCache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  memCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/* =========================================================
   SESSION (اصلاح شد — Sydney درست کار می‌کند)
   ========================================================= */

function getSessionInfo(date = new Date()) {
  const utcHour = date.getUTCHours();

  /* اولویت: New York > London > Tokyo > Sydney */
  if (utcHour >= 13 && utcHour < 22) {
    return { name: "New York" as SessionName, fa: "نیویورک", flag: "🇺🇸" };
  }
  if (utcHour >= 7 && utcHour < 16) {
    return { name: "London" as SessionName, fa: "لندن", flag: "🇬🇧" };
  }
  if (utcHour >= 0 && utcHour < 9) {
    return { name: "Tokyo" as SessionName, fa: "توکیو", flag: "🇯🇵" };
  }
  return { name: "Sydney" as SessionName, fa: "سیدنی", flag: "🇦🇺" };
}

/* =========================================================
   TWELVE DATA
   ========================================================= */

async function twelveData(url: string) {
  if (!TD_KEY) {
    throw new Error("TWELVE_DATA_API_KEY تنظیم نشده است.");
  }

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(TD_KEY)}`;

  const response = await fetch(full, { cache: "no-store" });
  const data = await response.json();

  if (!response.ok || data?.status === "error" || data?.code) {
    throw new Error(
      data?.message || `Twelve Data error ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   CANDLES
   ========================================================= */

async function getCandles(
  interval: string,
  outputsize: number
): Promise<Candle[]> {
  const data = await twelveData(
    `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(SYMBOL)}` +
      `&interval=${encodeURIComponent(interval)}` +
      `&outputsize=${outputsize}` +
      `&order=ASC` +
      `&timezone=UTC`
  );

  if (!Array.isArray(data?.values)) {
    throw new Error(`داده کندل ${interval} دریافت نشد.`);
  }

  return data.values
    .map((item: any) => ({
      datetime: String(item.datetime),
      open: num(item.open),
      high: num(item.high),
      low: num(item.low),
      close: num(item.close),
      volume: num(item.volume),
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
    )
    .sort((a: Candle, b: Candle) => a.datetime.localeCompare(b.datetime));
}

/* =========================================================
   LIVE PRICE (با Cache)
   ========================================================= */

async function getLivePrice(): Promise<number> {
  const cached = cacheGet<number>("live_price");
  if (cached) return cached;

  const data = await twelveData(
    `https://api.twelvedata.com/price` +
      `?symbol=${encodeURIComponent(SYMBOL)}`
  );

  const price = num(data?.price);

  if (!price) {
    throw new Error("قیمت لحظه‌ای XAU/USD دریافت نشد.");
  }

  cacheSet("live_price", price, PRICE_CACHE_TTL_MS);
  return price;
}

/* =========================================================
   INDICATORS
   ========================================================= */

function sma(values: number[], period: number): number {
  if (!values.length) return 0;
  const slice = values.length < period ? values : values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

function calculateRsi(values: number[], period = 14): number {
  if (values.length <= period) return 50;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }

  gain /= period;
  loss /= period;

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = Math.max(diff, 0);
    const l = Math.max(-diff, 0);
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
  }

  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

function calculateAtr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;

  const values: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    values.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
    );
  }

  return sma(values, period);
}

function calculateMacd(values: number[]): number {
  return ema(values, 12) - ema(values, 26);
}

function getSwingLevels(candles: Candle[], lookback = 30) {
  const slice = candles.slice(-lookback);
  if (!slice.length) return { support: 0, resistance: 0 };

  return {
    support: Math.min(...slice.map((x) => x.low)),
    resistance: Math.max(...slice.map((x) => x.high)),
  };
}

function candleDirection(candles: Candle[]): Direction | null {
  const current = candles.at(-1);
  const previous = candles.at(-2);
  if (!current || !previous) return null;

  const body = Math.abs(current.close - current.open);
  const range = Math.max(current.high - current.low, 0.0001);
  const bodyRatio = body / range;

  if (
    current.close > current.open &&
    (bodyRatio > 0.55 || current.close > previous.high)
  ) {
    return "BUY";
  }

  if (
    current.close < current.open &&
    (bodyRatio > 0.55 || current.close < previous.low)
  ) {
    return "SELL";
  }

  return null;
}

/* =========================================================
   TIMEFRAME ANALYSIS
   ========================================================= */

function timeframeAnalysis(candles: Candle[]) {
  const closes = candles.map((x) => x.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const rsi = calculateRsi(closes);
  const macd = calculateMacd(closes);
  const atr = calculateAtr(candles);

  let direction: Direction | null = null;

  if (ema20 > ema50 && rsi >= 51 && rsi <= 72 && macd > 0) {
    direction = "BUY";
  }
  if (ema20 < ema50 && rsi <= 49 && rsi >= 28 && macd < 0) {
    direction = "SELL";
  }

  return { direction, ema20, ema50, rsi, macd, atr };
}

/* =========================================================
   COMPLETE MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket() {
  const [m1, m5, m15, h1, h4] = await Promise.all([
    getCandles("1min", 180),
    getCandles("5min", 160),
    getCandles("15min", 120),
    getCandles("1h", 100),
    getCandles("4h", 80),
  ]);

  const a1 = timeframeAnalysis(m1);
  const a5 = timeframeAnalysis(m5);
  const a15 = timeframeAnalysis(m15);
  const a60 = timeframeAnalysis(h1);
  const a240 = timeframeAnalysis(h4);

  const votes = [
    a1.direction,
    a5.direction,
    a15.direction,
    a60.direction,
    a240.direction,
  ].filter(Boolean) as Direction[];

  const buyVotes = votes.filter((x) => x === "BUY").length;
  const sellVotes = votes.filter((x) => x === "SELL").length;

  let direction: Direction | null = null;
  if (buyVotes >= 3) direction = "BUY";
  else if (sellVotes >= 3) direction = "SELL";

  const reasons: string[] = [];
  let score = 0;

  if (direction) {
    score += 20;
    reasons.push(`هم‌جهتی چندتایم‌فریم: ${direction}`);
  }

  if (direction && a1.direction === direction) {
    score += 10;
    reasons.push("تایم‌فریم 1 دقیقه همسو است");
  }
  if (direction && a5.direction === direction) {
    score += 10;
    reasons.push("تایم‌فریم 5 دقیقه تأیید می‌کند");
  }
  if (direction && a15.direction === direction) {
    score += 10;
    reasons.push("تایم‌فریم 15 دقیقه تأیید می‌کند");
  }
  if (direction && a60.direction === direction) {
    score += 10;
    reasons.push("روند 1 ساعته همسو است");
  }
  if (direction && a240.direction === direction) {
    score += 10;
    reasons.push("روند 4 ساعته همسو است");
  }

  const levels = getSwingLevels(m5, 40);
  const atr = calculateAtr(m5);
  const price = m1.at(-1)?.close || m5.at(-1)?.close || 0;

  if (direction) {
    const distance =
      direction === "BUY"
        ? Math.abs(price - levels.support)
        : Math.abs(levels.resistance - price);

    if (distance <= Math.max(atr * 1.5, 5)) {
      score += 10;
      reasons.push("قیمت نزدیک ناحیه ساختاری مهم است");
    }
  }

  const candle = candleDirection(m5);
  if (direction && candle === direction) {
    score += 10;
    reasons.push("تأیید رفتار کندلی");
  }

  const currentVolume = m5.at(-1)?.volume || 0;
  const averageVolume = sma(
    m5.slice(0, -1).map((x) => x.volume),
    20
  );

  if (currentVolume > 0 && averageVolume > 0 && currentVolume >= averageVolume * 1.05) {
    score += 5;
    reasons.push("حجم بالاتر از میانگین");
  }

  if (direction === "BUY" && a5.rsi >= 52 && a5.rsi <= 68) {
    score += 5;
    reasons.push("مومنتوم خرید مناسب است");
  }
  if (direction === "SELL" && a5.rsi <= 48 && a5.rsi >= 32) {
    score += 5;
    reasons.push("مومنتوم فروش مناسب است");
  }

  return {
    direction,
    score: Math.min(score, 100),
    confirmations: reasons.length,
    reasons,
    support: levels.support,
    resistance: levels.resistance,
    atr,
    candles: { m1, m5, m15, h1, h4 },
    timeframeAnalysis: { m1: a1, m5: a5, m15: a15, h1: a60, h4: a240 },
  };
}

/* =========================================================
   NEWS FILTER
   ========================================================= */

async function getImportantNews() {
  const now = new Date();
  const until = new Date(now.getTime() + NEWS_BLOCK_MINUTES * 60_000);

  try {
    return await prisma.economicEvent.findMany({
      where: {
        eventTime: { gte: now, lte: until },
        importance: { gte: 3 },
      },
      orderBy: { eventTime: "asc" },
      take: 10,
    });
  } catch {
    return [];
  }
}

/* =========================================================
   USD / TOMAN (با Cache)
   ========================================================= */

async function getUsdToToman() {
  const cached = cacheGet<{
    rate: number;
    asOf: string;
    delayed: boolean;
    delayedMinutes: number;
  }>("fx_usd_toman");

  if (cached) return cached;

  if (!NETARZ_KEY) {
    throw new Error("NETARZ_API_KEY تنظیم نشده است.");
  }

  const response = await fetch(
    "https://netarz.ir/api/fx/v1/rates?codes=USD",
    {
      headers: { Authorization: `Bearer ${NETARZ_KEY}` },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "دریافت نرخ دلار ناموفق بود."
    );
  }

  const row = Array.isArray(data?.data)
    ? data.data.find((x: any) => x.code === "USD")
    : null;

  const rate = num(row?.mid ?? data?.meta?.usd_irt);
  if (!rate) throw new Error("نرخ واقعی USD/IRR دریافت نشد.");

  const result = {
    rate: Math.round(rate),
    asOf: row?.as_of ?? data?.meta?.as_of ?? new Date().toISOString(),
    delayed: Boolean(row?.is_delayed ?? data?.meta?.is_delayed),
    delayedMinutes: num(row?.delayed_minutes ?? data?.meta?.delayed_minutes),
  };

  cacheSet("fx_usd_toman", result, FX_CACHE_TTL_MS);
  return result;
}

/* =========================================================
   RISK CALCULATOR (ATR-based — اصلاح شد)
   ========================================================= */

function calculateLevels(
  entry: number,
  direction: Direction,
  atr: number
) {
  /* فاصله‌ها بر اساس ATR */
  let slDistance = clamp(
    atr * ATR_SL_MULTIPLIER,
    MIN_SL_DISTANCE,
    MAX_SL_DISTANCE
  );

  /* نسبت‌ها به SL */
  const ratio1 = ATR_TP1_MULTIPLIER / ATR_SL_MULTIPLIER;
  const ratio2 = ATR_TP2_MULTIPLIER / ATR_SL_MULTIPLIER;
  const ratio3 = ATR_TP3_MULTIPLIER / ATR_SL_MULTIPLIER;

  const tp1Distance = slDistance * ratio1;
  const tp2Distance = slDistance * ratio2;
  const tp3Distance = slDistance * ratio3;

  if (direction === "BUY") {
    return {
      stopLoss: round(entry - slDistance),
      tp1: round(entry + tp1Distance),
      tp2: round(entry + tp2Distance),
      tp3: round(entry + tp3Distance),
      slDistance: round(slDistance),
      tp1Distance: round(tp1Distance),
      tp2Distance: round(tp2Distance),
      tp3Distance: round(tp3Distance),
    };
  }

  return {
    stopLoss: round(entry + slDistance),
    tp1: round(entry - tp1Distance),
    tp2: round(entry - tp2Distance),
    tp3: round(entry - tp3Distance),
    slDistance: round(slDistance),
    tp1Distance: round(tp1Distance),
    tp2Distance: round(tp2Distance),
    tp3Distance: round(tp3Distance),
  };
}

/* =========================================================
   HIT DETECTION
   ========================================================= */

function targetHit(direction: Direction, price: number, target: number) {
  return direction === "BUY" ? price >= target : price <= target;
}

function stopHit(direction: Direction, price: number, stop: number) {
  return direction === "BUY" ? price <= stop : price >= stop;
}

/* =========================================================
   EVENT PROFIT
   ========================================================= */

function eventProfit(type: EventType) {
  if (type === "TP1") return { lot: TP1_LOT, usd: TP1_USD };
  if (type === "TP2") return { lot: TP2_LOT, usd: TP2_USD };
  if (type === "TP3") return { lot: TP3_LOT, usd: TP3_USD };
  if (type === "SL") return { lot: TOTAL_LOT, usd: -STOP_USD };
  return { lot: 0, usd: 0 };
}

/* =========================================================
   TELEGRAM (با Retry — اصلاح شد)
   ========================================================= */

async function sendTelegramOnce(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("تنظیمات Telegram کامل نیست.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || "ارسال پیام Telegram ناموفق بود.");
  }

  return String(data.result?.message_id || "");
}

async function sendTelegram(text: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < TELEGRAM_RETRY_COUNT; attempt++) {
    try {
      return await sendTelegramOnce(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      /* فقط اگر خطای Rate Limit یا Network بود، Retry کن */
      const msg = lastError.message.toLowerCase();
      const retryable =
        msg.includes("too many") ||
        msg.includes("timeout") ||
        msg.includes("network") ||
        msg.includes("429") ||
        msg.includes("502") ||
        msg.includes("503");

      if (!retryable || attempt === TELEGRAM_RETRY_COUNT - 1) {
        break;
      }

      await sleep(TELEGRAM_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError || new Error("ارسال Telegram ناموفق بود.");
}

/* =========================================================
   TELEGRAM MESSAGES
   ========================================================= */

function buildInitialTelegram(meta: SignalMeta): string {
  const direction = meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش";

  return [
    "🤖 <b>━━━ سیگنال هوش مصنوعی طلا ━━━</b>",
    "",
    `🪙 <b>XAUUSD | طلا</b>`,
    `${direction}`,
    "",
    `⭐ قدرت سیگنال: <b>${meta.score}/100</b>`,
    `✅ تعداد تأییدیه‌ها: <b>${meta.confirmations}</b>`,
    "",
    `📍 ورود: <b>${formatPrice(meta.entry)}</b>`,
    `🛑 حد ضرر: <b>${formatPrice(meta.stopLoss)}</b> <i>(${meta.slDistance.toFixed(1)}$)</i>`,
    `💰 ریسک: <b>${formatUsd(-meta.riskUsd)}</b>`,
    `🇮🇷 ریسک: <b>${formatToman(-meta.riskToman)}</b>`,
    "",
    `🎯 <b>TP1</b>: ${formatPrice(meta.tp1)}`,
    `📦 حجم: ${formatLot(meta.tp1Lot)} لات`,
    `💰 سود: <b>${formatUsd(meta.tp1Usd)}</b>`,
    `🇮🇷 ${formatToman(meta.tp1Toman)}`,
    "",
    `🎯 <b>TP2</b>: ${formatPrice(meta.tp2)}`,
    `📦 حجم: ${formatLot(meta.tp2Lot)} لات`,
    `💰 سود: <b>${formatUsd(meta.tp2Usd)}</b>`,
    `🇮🇷 ${formatToman(meta.tp2Toman)}`,
    "",
    `🎯 <b>TP3</b>: ${formatPrice(meta.tp3)}`,
    `📦 حجم: ${formatLot(meta.tp3Lot)} لات`,
    `💰 سود: <b>${formatUsd(meta.tp3Usd)}</b>`,
    `🇮🇷 ${formatToman(meta.tp3Toman)}`,
    "",
    `📦 حجم کل: <b>${formatLot(meta.totalLot)} لات</b>`,
    `🏆 سود کامل: <b>${formatUsd(meta.totalPotentialUsd)}</b>`,
    `🇮🇷 سود کامل: <b>${formatToman(meta.totalPotentialToman)}</b>`,
    "",
    `🛡️ <b>مدیریت ریسک‌فری</b>`,
    "بعد از TP1، حد ضرر بخش باقی‌مانده به نقطه ورود منتقل می‌شود.",
    "بعد از TP2، Trailing Stop فعال می‌شود.",
    "",
    `🕐 سشن: ${meta.sessionFlag} <b>${meta.sessionFa}</b>`,
    `⏱️ زمان ایران: <b>${meta.iranTime}</b>`,
    "",
    `💱 دلار: <b>${new Intl.NumberFormat("fa-IR").format(meta.usdToToman)} تومان</b>`,
    "",
    `🧠 ${meta.reasons.slice(0, 6).map((x) => `• ${x}`).join("\n")}`,
    "",
    "⚠️ <b>این تحلیل توسط هوش مصنوعی تولید شده و تضمین‌کننده سود نیست.</b>",
  ].join("\n");
}

function buildEventTelegram(meta: SignalMeta, event: EventRecord): string {
  if (event.type === "TP1") {
    return [
      "🟢 <b>هدف اول فعال شد — TP1</b>",
      "",
      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,
      `🎯 قیمت TP1: <b>${formatPrice(event.price)}</b>`,
      `💰 سود TP1: <b>${formatUsd(event.pnlUsd)}</b>`,
      `🇮🇷 سود: <b>${formatToman(event.pnlToman)}</b>`,
      `📦 بسته شد: <b>${formatLot(TP1_LOT)} لات</b>`,
      `📦 باقی‌مانده: <b>${formatLot(TOTAL_LOT - TP1_LOT)} لات</b>`,
      "",
      "🛡️ <b>ریسک‌فری فعال شد</b>",
      `🔐 حد ضرر بخش باقی‌مانده → <b>نقطه ورود ${formatPrice(meta.entry)}</b>`,
      "",
      "⚠️ اگر قیمت برگردد، بخش باقی‌مانده در نقطه ورود بسته می‌شود و TP1 به عنوان سود حفظ می‌شود.",
    ].join("\n");
  }

  if (event.type === "TP2") {
    return [
      "🟢 <b>هدف دوم فعال شد — TP2</b>",
      "",
      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,
      `🎯 قیمت: <b>${formatPrice(event.price)}</b>`,
      `💰 سود این مرحله: <b>${formatUsd(event.pnlUsd)}</b>`,
      `🇮🇷 سود: <b>${formatToman(event.pnlToman)}</b>`,
      `📦 بسته شد: <b>${formatLot(TP2_LOT)} لات</b>`,
      "",
      "🛡️ <b>ریسک‌فری همچنان فعال است</b>",
      `🔐 حد ضرر بخش باقی‌مانده → <b>نقطه ورود ${formatPrice(meta.entry)}</b>`,
      "",
      "📈 <b>Trailing Stop فعال شد</b>",
      "حد ضرر بخش آخر با حرکت قیمت به‌صورت خودکار به‌روزرسانی می‌شود.",
      "",
      `📊 سود ثبت‌شده تا این لحظه: <b>${formatUsd(TP1_USD + TP2_USD)}</b>`,
    ].join("\n");
  }

  if (event.type === "TP3") {
    return [
      "🏆 <b>معامله تکمیل شد — TP3</b>",
      "",
      `🪙 XAUUSD | ${meta.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,
      `🎯 قیمت TP3: <b>${formatPrice(event.price)}</b>`,
      `💰 سود TP3: <b>${formatUsd(event.pnlUsd)}</b>`,
      `🇮🇷 سود: <b>${formatToman(event.pnlToman)}</b>`,
      "",
      `🏆 <b>سود نهایی: ${formatUsd(TOTAL_POTENTIAL_USD)}</b>`,
      `🇮🇷 <b>${formatToman(meta.totalPotentialToman)}</b>`,
      "",
      "✅ تمام اهداف معامله تکمیل شد.",
    ].join("\n");
  }

  if (event.type === "BREAKEVEN") {
