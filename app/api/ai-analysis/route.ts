/* =========================================================
   app/api/ai-analysis/route.ts
   AI XAUUSD ENGINE — V2
   ---------------------------------------------------------
   ✅ سازگار با Frontend فعلی
   ✅ ATR-based TP/SL
   ✅ Cache برای سرعت
   ✅ Trailing Stop بعد از TP2
   ✅ Telegram با Retry
   ✅ Win Rate دقیق
   ✅ بدون خطای TypeScript
   ========================================================= */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   1. CONFIG
   ========================================================= */

const SYMBOL = "XAU/USD";
const DISPLAY_SYMBOL = "XAUUSD";

const CONTRACT_SIZE = 100;

const TOTAL_LOT = 0.10;
const TP1_LOT = 0.04;
const TP2_LOT = 0.03;
const TP3_LOT = 0.03;

const STOP_USD = 40;
const TP1_USD = 20;
const TP2_USD = 24;
const TP3_USD = 36;
const TOTAL_POTENTIAL_USD = 80;

/* ATR-based multipliers */
const ATR_SL_MULT = 1.5;
const ATR_TP1_MULT = 1.5;
const ATR_TP2_MULT = 2.5;
const ATR_TP3_MULT = 4.0;

const MIN_SL_DISTANCE = 3.0;
const MAX_SL_DISTANCE = 15.0;

const TRAILING_ATR_MULT = 1.0;

/* Signal thresholds */
const SIGNAL_SCORE_MIN = 70;
const SIGNAL_CONFIRMATIONS_MIN = 3;

/* Cooldown */
const MIN_SIGNAL_COOLDOWN_MINUTES = 15;

/* News block */
const NEWS_BLOCK_MINUTES = 30;

/* Cache TTL */
const FX_CACHE_TTL_MS = 5 * 60 * 1000;
const PRICE_CACHE_TTL_MS = 10 * 1000;
const CANDLES_CACHE_TTL_MS = 20 * 1000;

/* Telegram retry */
const TG_RETRY_COUNT = 3;
const TG_RETRY_DELAY_MS = 800;

/* Env */
const TD_KEY = process.env.TWELVE_DATA_API_KEY;
const NETARZ_KEY = process.env.NETARZ_API_KEY;
const CRON_SECRET =
  process.env.AI_CRON_SECRET ||
  process.env.SIGNALS_CRON_SECRET ||
  process.env.NEWS_CRON_SECRET;

/* =========================================================
   2. TYPES
   ========================================================= */

type Direction = "BUY" | "SELL";
type SessionName = "Sydney" | "Tokyo" | "London" | "New York";

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type EventRow = {
  id: string;
  type: "TP1" | "TP2" | "TP3" | "SL" | "BREAKEVEN";
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

type Meta = {
  kind: "AI_XAUUSD_SIGNAL";
  symbol: string;
  direction: Direction;

  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;

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
  riskToman: number;
  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  totalPotentialToman: number;

  session: SessionName;
  sessionFa?: string;
  sessionFlag?: string;

  iranTime?: string;
  timeframe: string;

  score: number;
  confirmations: number;
  reasons: string[];

  support: number;
  resistance: number;
  currentPrice: number;

  state:
    | "AI_PENDING"
    | "AI_TP1"
    | "AI_TP2"
    | "AI_TP3"
    | "AI_SL"
    | "AI_BE";

  breakeven: boolean;
  trailingActive?: boolean;
  trailingStop?: number;

  events: EventRow[];

  analysis: {
    reasons: string[];
    support: number;
    resistance: number;
    atr: number;
    timeframes?: Record<string, unknown>;
  };

  createdAt: string;
  updatedAt: string;

  telegramSent?: boolean;
  telegramMessageId?: string;
  telegramError?: string;
};

/* =========================================================
   3. HELPERS
   ========================================================= */

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function fmtPrice(v: number): string {
  return Number(v).toFixed(2);
}

function fmtLot(v: number): string {
  return v.toFixed(2);
}

function fmtUsd(v: number): string {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(v))}`;
}

function fmtToman(v: number): string {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${new Intl.NumberFormat("fa-IR").format(
    Math.round(Math.abs(v))
  )} تومان`;
}

function iranTime(d = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- In-memory cache ---------- */

type CacheEntry<T> = { value: T; expiresAt: number };
const mem = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}

function cacheSet<T>(key: string, value: T, ttl: number): void {
  mem.set(key, { value, expiresAt: Date.now() + ttl });
}

/* =========================================================
   4. SESSION
   ========================================================= */

function getSessionInfo(d = new Date()) {
  const h = d.getUTCHours();

  if (h >= 13 && h < 22) {
    return { name: "New York" as SessionName, fa: "نیویورک", flag: "🇺🇸" };
  }
  if (h >= 7 && h < 16) {
    return { name: "London" as SessionName, fa: "لندن", flag: "🇬🇧" };
  }
  if (h >= 0 && h < 9) {
    return { name: "Tokyo" as SessionName, fa: "توکیو", flag: "🇯🇵" };
  }
  return { name: "Sydney" as SessionName, fa: "سیدنی", flag: "🇦🇺" };
}

/* =========================================================
   5. TWELVE DATA
   ========================================================= */

async function tdFetch(url: string): Promise<any> {
  if (!TD_KEY) throw new Error("TWELVE_DATA_API_KEY تنظیم نشده است.");

  const full =
    `${url}${url.includes("?") ? "&" : "?"}` +
    `apikey=${encodeURIComponent(TD_KEY)}`;

  const res = await fetch(full, { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || data?.status === "error" || data?.code) {
    throw new Error(
      data?.message || `TwelveData error ${res.status}`
    );
  }

  return data;
}

/* ---------- Candles ---------- */

async function getCandles(
  interval: string,
  size: number
): Promise<Candle[]> {
  const key = `candles_${interval}_${size}`;
  const cached = cacheGet<Candle[]>(key);
  if (cached) return cached;

  const data = await tdFetch(
    `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(SYMBOL)}` +
      `&interval=${encodeURIComponent(interval)}` +
      `&outputsize=${size}` +
      `&order=ASC` +
      `&timezone=UTC`
  );

  if (!Array.isArray(data?.values)) {
    throw new Error(`داده کندل ${interval} دریافت نشد.`);
  }

  const out: Candle[] = data.values
    .map((x: any) => ({
      datetime: String(x.datetime),
      open: num(x.open),
      high: num(x.high),
      low: num(x.low),
      close: num(x.close),
      volume: num(x.volume),
    }))
    .filter(
      (c: Candle) =>
        c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
    )
    .sort((a: Candle, b: Candle) =>
      a.datetime.localeCompare(b.datetime)
    );

  cacheSet(key, out, CANDLES_CACHE_TTL_MS);
  return out;
}

/* ---------- Live price ---------- */

async function getLivePrice(): Promise<number> {
  const cached = cacheGet<number>("price");
  if (cached) return cached;

  const data = await tdFetch(
    `https://api.twelvedata.com/price` +
      `?symbol=${encodeURIComponent(SYMBOL)}`
  );

  const price = num(data?.price);
  if (!price) throw new Error("قیمت XAU/USD دریافت نشد.");

  cacheSet("price", price, PRICE_CACHE_TTL_MS);
  return price;
}

/* =========================================================
   6. INDICATORS
   ========================================================= */

function sma(v: number[], p: number): number {
  if (!v.length) return 0;
  const s = v.length < p ? v : v.slice(-p);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

function ema(v: number[], p: number): number {
  if (!v.length) return 0;
  const k = 2 / (p + 1);
  let r = v[0];
  for (let i = 1; i < v.length; i++) {
    r = v[i] * k + r * (1 - k);
  }
  return r;
}

function rsi(v: number[], p = 14): number {
  if (v.length <= p) return 50;
  let g = 0,
    l = 0;
  for (let i = 1; i <= p; i++) {
    const d = v[i] - v[i - 1];
    if (d >= 0) g += d;
    else l -= d;
  }
  g /= p;
  l /= p;
  for (let i = p + 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    g = (g * (p - 1) + Math.max(d, 0)) / p;
    l = (l * (p - 1) + Math.max(-d, 0)) / p;
  }
  if (l === 0) return 100;
  const rs = g / l;
  return 100 - 100 / (1 + rs);
}

function atr(candles: Candle[], p = 14): number {
  if (candles.length < p + 1) return 0;
  const v: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const pv = candles[i - 1];
    v.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - pv.close),
        Math.abs(c.low - pv.close)
      )
    );
  }
  return sma(v, p);
}

function macd(v: number[]): number {
  return ema(v, 12) - ema(v, 26);
}

function swings(candles: Candle[], lookback = 30) {
  const s = candles.slice(-lookback);
  if (!s.length) return { support: 0, resistance: 0 };
  return {
    support: Math.min(...s.map((x) => x.low)),
    resistance: Math.max(...s.map((x) => x.high)),
  };
}

function candleDir(candles: Candle[]): Direction | null {
  const c = candles.at(-1);
  const p = candles.at(-2);
  if (!c || !p) return null;
  const body = Math.abs(c.close - c.open);
  const range = Math.max(c.high - c.low, 0.0001);
  const ratio = body / range;

  if (c.close > c.open && (ratio > 0.55 || c.close > p.high)) return "BUY";
  if (c.close < c.open && (ratio > 0.55 || c.close < p.low)) return "SELL";
  return null;
}

/* ---------- Timeframe analysis ---------- */

function tfAnalysis(candles: Candle[]) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes);
  const m = macd(closes);
  const a = atr(candles);

  let dir: Direction | null = null;

  if (e20 > e50 && r >= 51 && r <= 72 && m > 0) dir = "BUY";
  if (e20 < e50 && r <= 49 && r >= 28 && m < 0) dir = "SELL";

  return { direction: dir, ema20: e20, ema50: e50, rsi: r, macd: m, atr: a };
}

/* =========================================================
   7. MARKET ANALYSIS
   ========================================================= */

async function analyzeMarket() {
  const [m1, m5, m15, h1, h4] = await Promise.all([
    getCandles("1min", 180),
    getCandles("5min", 160),
    getCandles("15min", 120),
    getCandles("1h", 100),
    getCandles("4h", 80),
  ]);

  const a1 = tfAnalysis(m1);
  const a5 = tfAnalysis(m5);
  const a15 = tfAnalysis(m15);
  const a60 = tfAnalysis(h1);
  const a240 = tfAnalysis(h4);

  const votes = [
    a1.direction,
    a5.direction,
    a15.direction,
    a60.direction,
    a240.direction,
  ].filter(Boolean) as Direction[];

  const buyV = votes.filter((v) => v === "BUY").length;
  const sellV = votes.filter((v) => v === "SELL").length;

  let dir: Direction | null = null;
  if (buyV >= 3) dir = "BUY";
  else if (sellV >= 3) dir = "SELL";

  const reasons: string[] = [];
  let score = 0;

  if (dir) {
    score += 20;
    reasons.push(`هم‌جهتی چندتایم‌فریم: ${dir}`);
  }

  if (dir && a1.direction === dir) {
    score += 10;
    reasons.push("تایم‌فریم 1 دقیقه همسو است");
  }
  if (dir && a5.direction === dir) {
    score += 10;
    reasons.push("تایم‌فریم 5 دقیقه تأیید می‌کند");
  }
  if (dir && a15.direction === dir) {
    score += 10;
    reasons.push("تایم‌فریم 15 دقیقه تأیید می‌کند");
  }
  if (dir && a60.direction === dir) {
    score += 10;
    reasons.push("روند 1 ساعته همسو است");
  }
  if (dir && a240.direction === dir) {
    score += 10;
    reasons.push("روند 4 ساعته همسو است");
  }

  const lv = swings(m5, 40);
  const a = atr(m5);
  const price = m1.at(-1)?.close || m5.at(-1)?.close || 0;

  if (dir) {
    const dist =
      dir === "BUY"
        ? Math.abs(price - lv.support)
        : Math.abs(lv.resistance - price);

    if (dist <= Math.max(a * 1.5, 5)) {
      score += 10;
      reasons.push("قیمت نزدیک ناحیه ساختاری مهم است");
    }
  }

  const cd = candleDir(m5);
  if (dir && cd === dir) {
    score += 10;
    reasons.push("تأیید رفتار کندلی");
  }

  const curVol = m5.at(-1)?.volume || 0;
  const avgVol = sma(
    m5.slice(0, -1).map((c) => c.volume),
    20
  );
  if (curVol > 0 && avgVol > 0 && curVol >= avgVol * 1.05) {
    score += 5;
    reasons.push("حجم بالاتر از میانگین");
  }

  if (dir === "BUY" && a5.rsi >= 52 && a5.rsi <= 68) {
    score += 5;
    reasons.push("مومنتوم خرید مناسب است");
  }
  if (dir === "SELL" && a5.rsi <= 48 && a5.rsi >= 32) {
    score += 5;
    reasons.push("مومنتوم فروش مناسب است");
  }

  return {
    direction: dir,
    score: Math.min(score, 100),
    confirmations: reasons.length,
    reasons,
    support: lv.support,
    resistance: lv.resistance,
    atr: a,
    candles: { m1, m5, m15, h1, h4 },
    timeframes: { m1: a1, m5: a5, m15: a15, h1: a60, h4: a240 },
  };
}

/* =========================================================
   8. NEWS FILTER
   ========================================================= */

async function checkNews() {
  try {
    const now = new Date();
    const until = new Date(now.getTime() + NEWS_BLOCK_MINUTES * 60000);

    const evts = await prisma.economicEvent.findMany({
      where: {
        eventTime: { gte: now, lte: until },
        importance: { gte: 3 },
      },
      orderBy: { eventTime: "asc" },
      take: 10,
    });

    return evts;
  } catch {
    return [];
  }
}

/* =========================================================
   9. FX RATE
   ========================================================= */

async function getFx() {
  const cached = cacheGet<{
    rate: number;
    asOf: string;
    delayed: boolean;
    delayedMinutes: number;
  }>("fx");

  if (cached) return cached;

  if (!NETARZ_KEY) throw new Error("NETARZ_API_KEY تنظیم نشده است.");

  const res = await fetch(
    "https://netarz.ir/api/fx/v1/rates?codes=USD",
    {
      headers: { Authorization: `Bearer ${NETARZ_KEY}` },
      cache: "no-store",
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "دریافت نرخ دلار ناموفق بود.");
  }

  const row = Array.isArray(data?.data)
    ? data.data.find((x: any) => x.code === "USD")
    : null;

  const rate = num(row?.mid ?? data?.meta?.usd_irt);
  if (!rate) throw new Error("نرخ USD/IRR دریافت نشد.");

  const result = {
    rate: Math.round(rate),
    asOf: row?.as_of ?? data?.meta?.as_of ?? new Date().toISOString(),
    delayed: Boolean(row?.is_delayed ?? data?.meta?.is_delayed),
    delayedMinutes: num(row?.delayed_minutes ?? data?.meta?.delayed_minutes),
  };

  cacheSet("fx", result, FX_CACHE_TTL_MS);
  return result;
}

/* =========================================================
   10. RISK CALCULATOR
   ========================================================= */

function calcLevels(entry: number, dir: Direction, a: number) {
  const slDist = clamp(a * ATR_SL_MULT, MIN_SL_DISTANCE, MAX_SL_DISTANCE);

  const r1 = ATR_TP1_MULT / ATR_SL_MULT;
  const r2 = ATR_TP2_MULT / ATR_SL_MULT;
  const r3 = ATR_TP3_MULT / ATR_SL_MULT;

  const tp1D = slDist * r1;
  const tp2D = slDist * r2;
  const tp3D = slDist * r3;

  if (dir === "BUY") {
    return {
      stopLoss: round2(entry - slDist),
      tp1: round2(entry + tp1D),
      tp2: round2(entry + tp2D),
      tp3: round2(entry + tp3D),
    };
  }

  return {
    stopLoss: round2(entry + slDist),
    tp1: round2(entry - tp1D),
    tp2: round2(entry - tp2D),
    tp3: round2(entry - tp3D),
  };
}

/* =========================================================
   11. HIT DETECTION
   ========================================================= */

function hitTP(dir: Direction, price: number, tp: number) {
  return dir === "BUY" ? price >= tp : price <= tp;
}

function hitSL(dir: Direction, price: number, sl: number) {
  return dir === "BUY" ? price <= sl : price >= sl;
}

/* =========================================================
   12. TELEGRAM
   ========================================================= */

async function tgSendOnce(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token || !chatId) throw new Error("Telegram env کامل نیست.");

  const res = await fetch(
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

  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || "Telegram send failed.");
  }

  return String(data.result?.message_id || "");
}

async function tgSend(text: string): Promise<string> {
  let lastErr: Error | null = null;

  for (let i = 0; i < TG_RETRY_COUNT; i++) {
    try {
      return await tgSendOnce(text);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const msg = lastErr.message.toLowerCase();
      const retryable =
        msg.includes("too many") ||
        msg.includes("timeout") ||
        msg.includes("network") ||
        msg.includes("429") ||
        msg.includes("502") ||
        msg.includes("503");

      if (!retryable || i === TG_RETRY_COUNT - 1) break;
      await sleep(TG_RETRY_DELAY_MS * (i + 1));
    }
  }

  throw lastErr || new Error("Telegram send failed.");
}

/* =========================================================
   13. TELEGRAM MESSAGES
   ========================================================= */

function tgInitial(m: Meta): string {
  const dir = m.direction === "BUY" ? "🟢 خرید" : "🔴 فروش";

  return [
    "🤖 <b>━━━ سیگنال هوش مصنوعی طلا ━━━</b>",
    "",
    "🪙 <b>XAUUSD | طلا</b>",
    dir,
    "",
    `⭐ قدرت سیگنال: <b>${m.score}/100</b>`,
    `✅ تأییدیه‌ها: <b>${m.confirmations}</b>`,
    "",
    `📍 ورود: <b>${fmtPrice(m.entry)}</b>`,
    `🛑 حد ضرر: <b>${fmtPrice(m.stopLoss)}</b>`,
    `💰 ریسک: <b>${fmtUsd(-m.riskUsd)}</b>`,
    `🇮🇷 ریسک: <b>${fmtToman(-m.riskToman)}</b>`,
    "",
    `🎯 <b>TP1</b>: ${fmtPrice(m.tp1)} · ${fmtLot(m.tp1Lot)} لات · ${fmtUsd(m.tp1Usd)}`,
    `🎯 <b>TP2</b>: ${fmtPrice(m.tp2)} · ${fmtLot(m.tp2Lot)} لات · ${fmtUsd(m.tp2Usd)}`,
    `🎯 <b>TP3</b>: ${fmtPrice(m.tp3)} · ${fmtLot(m.tp3Lot)} لات · ${fmtUsd(m.tp3Usd)}`,
    "",
    `📦 حجم کل: <b>${fmtLot(m.totalLot)} لات</b>`,
    `🏆 سود کامل: <b>${fmtUsd(m.totalPotentialUsd)}</b>`,
    `🇮🇷 ${fmtToman(m.totalPotentialToman)}`,
    "",
    `🕐 سشن: <b>${m.sessionFa || m.session}</b>`,
    `⏱️ ${m.iranTime || iranTime()}`,
    "",
    `💱 دلار: <b>${new Intl.NumberFormat("fa-IR").format(m.usdToToman)} تومان</b>`,
    "",
    `🧠 ${m.reasons.slice(0, 6).map((r) => `• ${r}`).join("\n")}`,
    "",
    "⚠️ این تحلیل توسط AI تولید شده و تضمین سود نیست.",
  ].join("\n");
}

function tgEvent(m: Meta, e: EventRow): string {
  if (e.type === "TP1") {
    return [
      "🟢 <b>هدف اول فعال شد — TP1</b>",
      "",
      `🪙 XAUUSD | ${m.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,
      `🎯 قیمت: <b>${fmtPrice(e.price)}</b>`,
      `💰 سود: <b>${fmtUsd(e.pnlUsd)}</b>`,
      `🇮🇷 ${fmtToman(e.pnlToman)}`,
      `📦 بسته شد: ${fmtLot(TP1_LOT)} لات`,
      "",
      "🛡️ <b>ریسک‌فری فعال شد</b>",
      `🔐 SL باقی‌مانده → <b>${fmtPrice(m.entry)}</b>`,
    ].join("\n");
  }

  if (e.type === "TP2") {
    return [
      "🟢 <b>هدف دوم فعال شد — TP2</b>",
      "",
      `🪙 XAUUSD | ${m.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,
      `🎯 قیمت: <b>${fmtPrice(e.price)}</b>`,
      `💰 سود: <b>${fmtUsd(e.pnlUsd)}</b>`,
      `🇮🇷 ${fmtToman(e.pnlToman)}`,
      `📦 بسته شد: ${fmtLot(TP2_LOT)} لات`,
      "",
      "📈 <b>Trailing Stop فعال</b>",
      `📊 سود تا این لحظه: <b>${fmtUsd(TP1_USD + TP2_USD)}</b>`,
    ].join("\n");
  }

  if (e.type === "TP3") {
    return [
      "🏆 <b>معامله تکمیل شد — TP3</b>",
      "",
      `🪙 XAUUSD | ${m.direction === "BUY" ? "🟢 خرید" : "🔴 فروش"}`,
      `🎯 قیمت: <b>${fmtPrice(e.price)}</b>`,
      `💰 سود: <b>${fmtUsd(e.pnlUsd)}</b>`,
      `🇮🇷 ${fmtToman(e.pnlToman)}`,
      "",
      `🏆 سود نهایی: <b>${fmtUsd(TOTAL_POTENTIAL_USD)}</b>`,
      `🇮🇷 <b>${fmtToman(m.totalPotentialToman)}</b>`,
      "",
      "✅ تمام اهداف تکمیل شد.",
    ].join("\n");
  }

  if (e.type === "BREAKEVEN") {
    return [
      "🛡️ <b>خروج در نقطه ورود — Risk-Free</b>",
      "",
      `📍 ورود: <b>${fmtPrice(m.entry)}</b>`,
      `📍 خروج: <b>${fmtPrice(e.price)}</b>`,
      "",
      "✅ این معامله <b>باخت محسوب نمی‌شود</b>.",
      "سود TPهای قبلی حفظ شده است.",
    ].join("\n");
  }

  return [
    "🔴 <b>حد ضرر فعال شد — SL</b>",
    "",
    `📍 ورود: <b>${fmtPrice(m.entry)}</b>`,
    `🛑 استاپ: <b>${fmtPrice(e.price)}</b>`,
    `💵 ضرر: <b>${fmtUsd(e.pnlUsd)}</b>`,
    `🇮🇷 ${fmtToman(e.pnlToman)}`,
    "",
    "❌ معامله به عنوان باخت ثبت شد.",
  ].join("\n");
}

/* =========================================================
   14. SAVE DELIVERY
   ========================================================= */

async function saveDelivery(
  signalId: string,
  status: "SENT" | "FAILED",
  messageId?: string,
  errorMessage?: string
) {
  try {
    const chatId = process.env.TELEGRAM_SIGNAL_CHAT_ID || "UNKNOWN";
    await prisma.telegramDelivery.create({
      data: {
        signalId,
        channelId: chatId,
        messageId: messageId || null,
        status,
        errorMessage: errorMessage || null,
        sentAt: status === "SENT" ? new Date() : null,
      },
    });
  } catch {
    /* silent */
  }
}

/* =========================================================
   15. FIND ACTIVE / COOLDOWN
   ========================================================= */

async function findActive() {
  return prisma.analysisRun.findFirst({
    where: {
      symbol: DISPLAY_SYMBOL,
      status: { in: ["AI_PENDING", "AI_TP1", "AI_TP2"] },
      signalGenerated: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function hasCooldown() {
  const since = new Date(
    Date.now() - MIN_SIGNAL_COOLDOWN_MINUTES * 60000
  );

  return prisma.analysisRun.findFirst({
    where: {
      symbol: DISPLAY_SYMBOL,
      signalGenerated: true,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}

/* =========================================================
   16. EVENT PROFIT
   ========================================================= */

function eventProfit(type: EventRow["type"]): { lot: number; usd: number } {
  if (type === "TP1") return { lot: TP1_LOT, usd: TP1_USD };
  if (type === "TP2") return { lot: TP2_LOT, usd: TP2_USD };
  if (type === "TP3") return { lot: TP3_LOT, usd: TP3_USD };
  if (type === "SL") return { lot: TOTAL_LOT, usd: -STOP_USD };
  return { lot: 0, usd: 0 };
}

function hasEvent(m: Meta, type: EventRow["type"]) {
  return m.events.some((e) => e.type === type);
}

/* =========================================================
   17. CREATE EVENT
   ========================================================= */

async function createEvent(
  runId: string,
  meta: Meta,
  type: EventRow["type"],
  price: number,
  fxRate: number
): Promise<EventRow | null> {
  if (hasEvent(meta, type)) return null;

  const p = eventProfit(type);
  const now = new Date();

  const evt: EventRow = {
    id: makeId(type),
    type,
    at: now.toISOString(),
    price: round2(price),
    lotClosed: p.lot,
    pnlUsd: p.usd,
    pnlToman: Math.round(p.usd * fxRate),
    usdToToman: fxRate,
    telegramSent: false,
  };

  meta.events.push(evt);

  if (type === "TP1") {
    meta.state = "AI_TP1";
    meta.breakeven = true;
  } else if (type === "TP2") {
    meta.state = "AI_TP2";
    meta.breakeven = true;
    meta.trailingActive = true;
    meta.trailingStop = round2(meta.entry);
  } else if (type === "TP3") {
    meta.state = "AI_TP3";
  } else if (type === "SL") {
    meta.state = "AI_SL";
  } else if (type === "BREAKEVEN") {
    meta.state = "AI_BE";
  }

  meta.updatedAt = now.toISOString();

  /* Save DB first */
  await prisma.analysisRun.update({
    where: { id: runId },
    data: {
      status: meta.state,
      metadata: meta as any,
      finishedAt:
        meta.state === "AI_TP3" ||
        meta.state === "AI_SL" ||
        meta.state === "AI_BE"
          ? now
          : undefined,
    },
  });

  /* Send Telegram */
  try {
    const msgId = await tgSend(tgEvent(meta, evt));
    evt.telegramSent = true;
    evt.telegramMessageId = msgId;
    await saveDelivery(runId, "SENT", msgId);
  } catch (err) {
    evt.telegramError = err instanceof Error ? err.message : String(err);
    await saveDelivery(runId, "FAILED", undefined, evt.telegramError);
  }

  await prisma.analysisRun.update({
    where: { id: runId },
    data: { metadata: meta as any },
  });

  return evt;
}

/* =========================================================
   18. MONITOR ACTIVE SIGNAL
   ========================================================= */

async function monitorRun(run: any) {
  const meta = run.metadata as Meta;
  if (!meta || meta.kind !== "AI_XAUUSD_SIGNAL") return null;
  if (meta.state === "AI_TP3" || meta.state === "AI_SL" || meta.state === "AI_BE") {
    return { state: meta.state, closed: true };
  }

  const [price, fx] = await Promise.all([getLivePrice(), getFx()]);
  meta.currentPrice = price;
  meta.updatedAt = new Date().toISOString();

  const recentCandles = await getCandles("1min", 3);
  const cur = recentCandles.at(-1);
  const low = cur?.low ?? price;
  const high = cur?.high ?? price;

  /* -------- WAITING -------- */
  if (meta.state === "AI_PENDING") {
    const slHit =
      hitSL(meta.direction, price, meta.stopLoss) ||
      hitSL(meta.direction, low, meta.stopLoss) ||
      hitSL(meta.direction, high, meta.stopLoss);

    if (slHit) {
      return createEvent(run.id, meta, "SL", meta.stopLoss, fx.rate);
    }

    const tp1Hit =
      hitTP(meta.direction, price, meta.tp1) ||
      hitTP(meta.direction, high, meta.tp1) ||
      hitTP(meta.direction, low, meta.tp1);

    if (tp1Hit) {
      return createEvent(run.id, meta, "TP1", meta.tp1, fx.rate);
    }
  }

  /* -------- TP1 -------- */
  if (meta.state === "AI_TP1") {
    const beHit =
      hitSL(meta.direction, price, meta.entry) ||
      hitSL(meta.direction, low, meta.entry) ||
      hitSL(meta.direction, high, meta.entry);

    if (beHit) {
      return createEvent(run.id, meta, "BREAKEVEN", meta.entry, fx.rate);
    }

    const tp2Hit =
      hitTP(meta.direction, price, meta.tp2) ||
      hitTP(meta.direction, high, meta.tp2) ||
      hitTP(meta.direction, low, meta.tp2);

    if (tp2Hit) {
      return createEvent(run.id, meta, "TP2", meta.tp2, fx.rate);
    }
  }

  /* -------- TP2 + Trailing -------- */
  if (meta.state === "AI_TP2") {
    /* Trailing stop: فقط جلو بره، عقب نره */
    const atrVal = meta.analysis?.atr || 2;
    const trailDist = atrVal * TRAILING_ATR_MULT;

    if (meta.direction === "BUY") {
      const newTrail = price - trailDist;
      if (
        newTrail > (meta.trailingStop || meta.entry) &&
        newTrail < price
      ) {
        meta.trailingStop = round2(newTrail);
      }
    } else {
      const newTrail = price + trailDist;
      if (
        newTrail < (meta.trailingStop || meta.entry) &&
        newTrail > price
      ) {
        meta.trailingStop = round2(newTrail);
      }
    }

    const activeStop = meta.trailingStop || meta.entry;

    const beHit =
      hitSL(meta.direction, price, activeStop) ||
      hitSL(meta.direction, low, activeStop) ||
      hitSL(meta.direction, high, activeStop);

    if (beHit) {
      return createEvent(run.id, meta, "BREAKEVEN", activeStop, fx.rate);
    }

    const tp3Hit =
      hitTP(meta.direction, price, meta.tp3) ||
      hitTP(meta.direction, high, meta.tp3) ||
      hitTP(meta.direction, low, meta.tp3);

    if (tp3Hit) {
      return createEvent(run.id, meta, "TP3", meta.tp3, fx.rate);
    }
  }

  await prisma.analysisRun.update({
    where: { id: run.id },
    data: { metadata: meta as any },
  });

  return { state: meta.state, price, closed: false };
}

/* =========================================================
   19. CREATE NEW SIGNAL
   ========================================================= */

async function createSignal() {
  const active = await findActive();
  if (active) {
    return { created: false, reason: "معامله فعال وجود دارد.", activeId: active.id };
  }

  const cooldown = await hasCooldown();
  if (cooldown) {
    return { created: false, reason: "Cooldown فعال است.", cooldownId: cooldown.id };
  }

  const news = await checkNews();
  if (news.length > 0) {
    return { created: false, reason: "خبر مهم نزدیک است.", newsCount: news.length };
  }

  const analysis = await analyzeMarket();

  if (
    !analysis.direction ||
    analysis.score < SIGNAL_SCORE_MIN ||
    analysis.confirmations < SIGNAL_CONFIRMATIONS_MIN
  ) {
    await prisma.analysisRun.create({
      data: {
        symbol: DISPLAY_SYMBOL,
        timeframe: "1m / 5m / 15m / 1H / 4H",
        status: "AI_NO_TRADE",
        signalGenerated: false,
        candlesAnalyzed:
          analysis.candles.m1.length +
          analysis.candles.m5.length +
          analysis.candles.m15.length +
          analysis.candles.h1.length +
          analysis.candles.h4.length,
        confirmationsFound: analysis.confirmations,
        finishedAt: new Date(),
        metadata: {
          kind: "AI_NO_TRADE",
          score: analysis.score,
          confirmations: analysis.confirmations,
          reasons: analysis.reasons,
        } as any,
      },
    });

    return {
      created: false,
      reason: "شرایط ورود معتبر نیست.",
      score: analysis.score,
    };
  }

  const entry = await getLivePrice();
  if (!entry) throw new Error("قیمت ورود دریافت نشد.");

  const lv = calcLevels(entry, analysis.direction, analysis.atr);
  const fx = await getFx();
  const session = getSessionInfo();
  const now = new Date();

  const meta: Meta = {
    kind: "AI_XAUUSD_SIGNAL",
    symbol: DISPLAY_SYMBOL,
    direction: analysis.direction,

    entry: round2(entry),
    stopLoss: lv.stopLoss,
    tp1: lv.tp1,
    tp2: lv.tp2,
    tp3: lv.tp3,

    totalLot: TOTAL_LOT,
    tp1Lot: TP1_LOT,
    tp2Lot: TP2_LOT,
    tp3Lot: TP3_LOT,

    riskUsd: STOP_USD,
    tp1Usd: TP1_USD,
    tp2Usd: TP2_USD,
    tp3Usd: TP3_USD,
    totalPotentialUsd: TOTAL_POTENTIAL_USD,

    usdToToman: fx.rate,
    riskToman: Math.round(STOP_USD * fx.rate),
    tp1Toman: Math.round(TP1_USD * fx.rate),
    tp2Toman: Math.round(TP2_USD * fx.rate),
    tp3Toman: Math.round(TP3_USD * fx.rate),
    totalPotentialToman: Math.round(TOTAL_POTENTIAL_USD * fx.rate),

    session: session.name,
    sessionFa: session.fa,
    sessionFlag: session.flag,

    iranTime: iranTime(now),
    timeframe: "1m + 5m + 15m + 1H + 4H",

    score: analysis.score,
    confirmations: analysis.confirmations,
    reasons: analysis.reasons,

    support: round2(analysis.support),
    resistance: round2(analysis.resistance),
    currentPrice: round2(entry),

    state: "AI_PENDING",
    breakeven: false,
    trailingActive: false,

    events: [],

    analysis: {
      reasons: analysis.reasons,
      support: round2(analysis.support),
      resistance: round2(analysis.resistance),
      atr: round2(analysis.atr),
      timeframes: analysis.timeframes as any,
    },

    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    telegramSent: false,
  };

  const run = await prisma.analysisRun.create({
    data: {
      symbol: DISPLAY_SYMBOL,
      timeframe: "1m / 5m / 15m / 1H / 4H",
      status: "AI_PENDING",
      signalGenerated: true,
      candlesAnalyzed:
        analysis.candles.m1.length +
        analysis.candles.m5.length +
        analysis.candles.m15.length +
        analysis.candles.h1.length +
        analysis.candles.h4.length,
      confirmationsFound: analysis.confirmations,
      finishedAt: now,
      metadata: meta as any,
    },
  });

  try {
    const msgId = await tgSend(tgInitial(meta));
    meta.telegramSent = true;
    meta.telegramMessageId = msgId;
    await saveDelivery(run.id, "SENT", msgId);
  } catch (err) {
    meta.telegramError = err instanceof Error ? err.message : String(err);
    await saveDelivery(run.id, "FAILED", undefined, meta.telegramError);
  }

  await prisma.analysisRun.update({
    where: { id: run.id },
    data: { metadata: meta as any },
  });

  return { created: true, id: run.id, signal: meta };
}

/* =========================================================
   20. PERFORMANCE
   ========================================================= */

type Perf = {
  trades: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  breakeven: number;
  wins: number;
  losses: number;
  winRate: number;
  tp1Toman: number;
  tp2Toman: number;
  tp3Toman: number;
  slToman: number;
  pnlUsd: number;
  pnlToman: number;
};

function emptyPerf(): Perf {
  return {
    trades: 0,
    tp1: 0,
    tp2: 0,
    tp3: 0,
    sl: 0,
    breakeven: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    tp1Toman: 0,
    tp2Toman: 0,
    tp3Toman: 0,
    slToman: 0,
    pnlUsd: 0,
    pnlToman: 0,
  };
}

function calcTotals(rows: any[]): Perf {
  const r = emptyPerf();

  for (const row of rows) {
    const m = row.metadata as Meta;
    if (!m || m.kind !== "AI_XAUUSD_SIGNAL") continue;

    r.trades++;

    let hasTP = false;
    let hasSL = false;
    let hasBE = false;

    for (const e of m.events || []) {
      if (e.type === "TP1") {
        r.tp1++;
        r.tp1Toman += e.pnlToman;
        r.pnlUsd += e.pnlUsd;
        r.pnlToman += e.pnlToman;
        hasTP = true;
      }
      if (e.type === "TP2") {
        r.tp2++;
        r.tp2Toman += e.pnlToman;
        r.pnlUsd += e.pnlUsd;
        r.pnlToman += e.pnlToman;
        hasTP = true;
      }
      if (e.type === "TP3") {
        r.tp3++;
        r.tp3Toman += e.pnlToman;
        r.pnlUsd += e.pnlUsd;
        r.pnlToman += e.pnlToman;
        hasTP = true;
      }
      if (e.type === "SL") {
        r.sl++;
        r.slToman += e.pnlToman;
        r.pnlUsd += e.pnlUsd;
        r.pnlToman += e.pnlToman;
        hasSL = true;
      }
      if (e.type === "BREAKEVEN") {
        r.breakeven++;
        hasBE = true;
      }
    }

    /* Win/Loss logic */
    if (hasTP) {
      r.wins++;
    } else if (hasSL && !hasBE) {
      r.losses++;
    } else if (hasBE && !hasTP) {
      r.wins++;
    }
  }

  const closed = r.wins + r.losses;
  r.winRate = closed > 0 ? round2((r.wins / closed) * 100) : 0;
  r.pnlUsd = money(r.pnlUsd);
  r.pnlToman = Math.round(r.pnlToman);

  return r;
}

function periodStart(p: "day" | "week" | "month"): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);

  if (p === "day") return d;

  if (p === "week") {
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d;
  }

  d.setUTCDate(1);
  return d;
}

async function getPerformance() {
  const [day, week, month, all] = await Promise.all([
    prisma.analysisRun.findMany({
      where: {
        symbol: DISPLAY_SYMBOL,
        signalGenerated: true,
        createdAt: { gte: periodStart("day") },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analysisRun.findMany({
      where: {
        symbol: DISPLAY_SYMBOL,
        signalGenerated: true,
        createdAt: { gte: periodStart("week") },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analysisRun.findMany({
      where: {
        symbol: DISPLAY_SYMBOL,
        signalGenerated: true,
        createdAt: { gte: periodStart("month") },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analysisRun.findMany({
      where: {
        symbol: DISPLAY_SYMBOL,
        signalGenerated: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    day: calcTotals(day),
    week: calcTotals(week),
    month: calcTotals(month),
    all: calcTotals(all),
    recent: all.slice(0, 20).map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      metadata: row.metadata,
    })),
  };
}

/* =========================================================
   21. DASHBOARD
   ========================================================= */

async function getDashboard(timeframe: string) {
  const [active, latest, perf, price, fx, candles] = await Promise.all([
    findActive(),
    prisma.analysisRun.findFirst({
      where: { symbol: DISPLAY_SYMBOL, signalGenerated: true },
      orderBy: { createdAt: "desc" },
    }),
    getPerformance(),
    getLivePrice().catch(() => null),
    getFx().catch(() => null),
    getCandles(timeframe || "1min", 180).catch(() => []),
  ]);

  return {
    symbol: DISPLAY_SYMBOL,
    contractSize: CONTRACT_SIZE,

    position: {
      totalLot: TOTAL_LOT,
      tp1Lot: TP1_LOT,
      tp2Lot: TP2_LOT,
      tp3Lot: TP3_LOT,
      stopUsd: STOP_USD,
      tp1Usd: TP1_USD,
      tp2Usd: TP2_USD,
      tp3Usd: TP3_USD,
    },

    active: active
      ? { id: active.id, status: active.status, metadata: active.metadata }
      : null,

    latest: latest
      ? { id: latest.id, status: latest.status, metadata: latest.metadata }
      : null,

    candles,
    currentPrice: price,

    performance: {
      day: perf.day,
      week: perf.week,
      month: perf.month,
      recent: perf.recent,
    },

    usdToToman: fx,
  };
}

/* =========================================================
   22. CRON ENGINE
   ========================================================= */

async function cronEngine() {
  const results: any[] = [];

  /* Monitor active */
  const activeRuns = await prisma.analysisRun.findMany({
    where: {
      symbol: DISPLAY_SYMBOL,
      signalGenerated: true,
      status: { in: ["AI_PENDING", "AI_TP1", "AI_TP2"] },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const run of activeRuns) {
    try {
      const result = await monitorRun(run);
      results.push({ id: run.id, result });
    } catch (err) {
      results.push({
        id: run.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /* Create new if none active */
  if (activeRuns.length === 0) {
    try {
      const signal = await createSignal();
      results.push({ signal });
    } catch (err) {
      results.push({
        signalError: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    results,
    activeTrades: activeRuns.length,
    at: new Date().toISOString(),
  };
}

/* =========================================================
   23. AUTH
   ========================================================= */

function isCronAuthed(req: NextRequest): boolean {
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-ai-cron-secret") ||
    req.headers.get("x-signals-cron-secret") ||
    req.headers.get("x-cron-secret") ||
    url.searchParams.get("secret");

  if (!CRON_SECRET || !provided) return false;
  return provided === CRON_SECRET;
}

/* =========================================================
   24. GET HANDLER
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cron = url.searchParams.get("cron") === "1";
    const timeframe = url.searchParams.get("timeframe") || "1min";

    /* -------- CRON -------- */
    if (cron) {
      if (!isCronAuthed(request)) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      const result = await cronEngine();

      return NextResponse.json(
        { ok: true, engine: "AI_XAUUSD_ENGINE_V2", ...result },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    /* -------- USER -------- */
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { ok: false, error: "احراز هویت لازم است." },
        { status: 401 }
      );
    }

    const data = await getDashboard(timeframe);

    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("AI ANALYSIS ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "خطای داخلی موتور تحلیل",
      },
      { status: 500 }
    );
  }
}
