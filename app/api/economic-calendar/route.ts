import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CALENDAR_API =
  "https://www.financecalendar.com/wp-json/fc/v1/calendar";

const SOURCE_URL = "https://www.financecalendar.com";

const DEFAULT_DAYS = 14;
const DEFAULT_ALERT_MINUTES = [120];

const DEFAULT_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "CNY",
];

type CalendarItem = Record<string, unknown>;

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const result = String(value).trim();

  return result.length ? result : null;
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function importanceToNumber(value: unknown): number {
  const raw = String(value ?? "").toLowerCase();

  if (raw.includes("high")) return 3;
  if (raw.includes("medium")) return 2;
  if (raw.includes("low")) return 1;

  return 1;
}

function inferCurrency(item: CalendarItem): string | null {
  const direct =
    text(item.currency) ||
    text(item.currency_code) ||
    text(item.currencyCode);

  if (direct) {
    return direct.toUpperCase();
  }

  const title = `${text(item.name) ?? ""} ${
    text(item.title) ?? ""
  }`.toUpperCase();

  const currencies = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CHF",
    "CAD",
    "AUD",
    "NZD",
    "CNY",
  ];

  for (const currency of currencies) {
    if (title.includes(currency)) {
      return currency;
    }
  }

  const country = `${text(item.country) ?? ""}`.toUpperCase();

  if (country.includes("UNITED STATES") || country === "US") {
    return "USD";
  }

  if (country.includes("UNITED KINGDOM") || country === "GB") {
    return "GBP";
  }

  if (country.includes("JAPAN") || country === "JP") {
    return "JPY";
  }

  if (country.includes("EURO")) {
    return "EUR";
  }

  return null;
}

function inferCountry(item: CalendarItem): string | null {
  return (
    text(item.country) ||
    text(item.country_name) ||
    text(item.region) ||
    null
  );
}

function parseEventTime(item: CalendarItem): Date | null {
  const possibleValues = [
    item.time_utc,
    item.datetime,
    item.datetime_utc,
    item.timestamp,
    item.date,
  ];

  for (const value of possibleValues) {
    const raw = text(value);

    if (!raw) continue;

    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function externalIdFor(item: CalendarItem, eventTime: Date) {
  const sourceId =
    text(item.id) ||
    text(item.event_id) ||
    text(item.slug) ||
    text(item.url) ||
    text(item.title) ||
    text(item.name) ||
    "economic-event";

  const raw = [
    sourceId,
    eventTime.toISOString(),
    text(item.title),
    text(item.name),
  ].join("|");

  return createHash("sha256").update(raw).digest("hex");
}

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function parseCurrencies(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return DEFAULT_CURRENCIES;
  }

  const result = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  return result.length ? result : DEFAULT_CURRENCIES;
}

function parseAlertMinutes(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ALERT_MINUTES;
  }

  const result = value
    .map((item) => Number(item))
    .filter(
      (item) =>
        Number.isFinite(item) &&
        item >= 5 &&
        item <= 1440
    );

  return result.length ? result : DEFAULT_ALERT_MINUTES;
}

async function getCurrentUserId() {
  const session = await getSession();

  if (!session?.userId) {
    return null;
  }

  return session.userId;
}

async function getUserNewsSettings(userId: string) {
  return prisma.newsSetting.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      highImpact: true,
      mediumImpact: true,
      lowImpact: false,
      currencies: DEFAULT_CURRENCIES,
      alertMinutes: DEFAULT_ALERT_MINUTES,
      telegramEnabled: true,
      newsFilterEnabled: true,
      marketRiskEnabled: true,
    },
    update: {},
  });
}

async function fetchExternalCalendar(days: number) {
  const now = new Date();

  const end = new Date(
    now.getTime() + days * 24 * 60 * 60 * 1000
  );

  const from = now.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const url = new URL(CALENDAR_API);

  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "500");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "TradingAIPlatform/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Economic calendar provider returned ${response.status}`
    );
  }

  const payload = await response.json();

  const events = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return events as CalendarItem[];
}

async function syncCalendar(days: number) {
  const externalEvents = await fetchExternalCalendar(days);

  let synced = 0;

  for (const item of externalEvents) {
    const eventTime = parseEventTime(item);

    if (!eventTime) {
      continue;
    }

    const eventName =
      text(item.name) ||
      text(item.title) ||
      text(item.event);

    if (!eventName) {
      continue;
    }

    const externalId = externalIdFor(
      item,
      eventTime
    );

    const currency = inferCurrency(item);
    const country = inferCountry(item);

    const importance = importanceToNumber(
      item.impact
    );

    const category =
      text(item.category) ||
      text(item.type) ||
      null;

    const previous =
      text(item.previous) ||
      text(item.prior) ||
      null;

    const forecast =
      text(item.forecast) ||
      text(item.consensus) ||
      null;

    const actual =
      text(item.actual) ||
      null;

    const unit =
      text(item.unit) ||
      null;

    const sourceUrl =
      text(item.url) ||
      SOURCE_URL;

    await prisma.economicEvent.upsert({
      where: {
        externalId,
      },
      create: {
        externalId,
        country,
        currency,
        event: eventName,
        category,
        importance,
        eventTime,
        previous,
        forecast,
        actual,
        unit,
        status: actual ? "RELEASED" : "SCHEDULED",
        source: "FINANCECALENDAR",
        sourceUrl,
        rawData: safeJson(item),
      },
      update: {
        country,
        currency,
        event: eventName,
        category,
        importance,
        eventTime,
        previous,
        forecast,
        actual,
        status: actual ? "RELEASED" : "SCHEDULED",
        source: "FINANCECALENDAR",
        sourceUrl,
        rawData: safeJson(item),
      },
    });

    synced++;
  }

  return synced;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(
  date: Date,
  timeZone: string
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false,
    }
  ).format(date);
}

function countdown(
  eventTime: Date,
  minutes: number
) {
  const target =
    eventTime.getTime() -
    minutes * 60 * 1000;

  const diff = Math.max(
    0,
    target - Date.now()
  );

  const hours = Math.floor(
    diff / 3600000
  );

  const mins = Math.floor(
    (diff % 3600000) / 60000
  );

  const secs = Math.floor(
    (diff % 60000) / 1000
  );

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function impactLabel(importance: number) {
  if (importance >= 3) return "HIGH";
  if (importance >= 2) return "MEDIUM";
  return "LOW";
}

function impactEmoji(importance: number) {
  if (importance >= 3) return "🔴";
  if (importance >= 2) return "🟠";
  return "🟢";
}

function eventCurrency(
  event: {
    currency: string | null;
    country: string | null;
    event: string;
  }
) {
  return (
    event.currency ||
    inferCurrency({
      country: event.country,
      title: event.event,
    }) ||
    "GLOBAL"
  );
}

function buildTelegramMessage(
  event: {
    event: string;
    currency: string | null;
    country: string | null;
    category: string | null;
    importance: number;
    eventTime: Date;
    previous: string | null;
    forecast: string | null;
    actual: string | null;
    sourceUrl: string | null;
  },
  alertMinutes: number
) {
  const currency = eventCurrency(event);

  const impact = impactLabel(
    event.importance
  );

  const emoji = impactEmoji(
    event.importance
  );

  const london = formatTime(
    event.eventTime,
    "Europe/London"
  );

  const newYork = formatTime(
    event.eventTime,
    "America/New_York"
  );

  const tehran = formatTime(
    event.eventTime,
    "Asia/Tehran"
  );

  const previous =
    event.previous ?? "—";

  const forecast =
    event.forecast ?? "—";

  const actual =
    event.actual ?? "منتشر نشده";

  const category =
    event.category ?? "Economic Event";

  const source =
    event.sourceUrl ||
    SOURCE_URL;

  return [
    `${emoji} <b>هشدار اقتصادی مهم</b>`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    `📌 <b>${escapeHtml(event.event)}</b>`,
    `💱 ارز: <b>${escapeHtml(currency)}</b>`,
    `🌍 کشور: <b>${escapeHtml(event.country ?? "Global")}</b>`,
    `🏷 دسته: <b>${escapeHtml(category)}</b>`,
    `⚠️ اهمیت: <b>${impact}</b>`,
    ``,
    `⏳ هشدار ${alertMinutes} دقیقه قبل از انتشار`,
    `🕐 زمان باقی‌مانده تا هشدار: <b>${countdown(
      event.eventTime,
      alertMinutes
    )}</b>`,
    ``,
    `🇬🇧 لندن: <b>${escapeHtml(london)}</b>`,
    `🇺🇸 نیویورک: <b>${escapeHtml(newYork)}</b>`,
    `🇮🇷 تهران: <b>${escapeHtml(tehran)}</b>`,
    ``,
    `📊 Previous: <b>${escapeHtml(previous)}</b>`,
    `🎯 Forecast: <b>${escapeHtml(forecast)}</b>`,
    `📈 Actual: <b>${escapeHtml(actual)}</b>`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    `🚨 <b>هشدار بازار</b>`,
    `این رویداد می‌تواند باعث افزایش نوسان در بازارهای مرتبط شود.`,
    ``,
    `⚠️ این پیام صرفاً هشدار زمان‌بندی‌شده است و سیگنال خرید یا فروش نیست.`,
    ``,
    `🔗 <a href="${escapeHtml(source)}">منبع و جزئیات خبر</a>`,
    `🌐 FinanceCalendar`,
  ].join("\n");
}

async function sendTelegram(
  message: string
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_SIGNAL_CHAT_ID;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is missing"
    );
  }

  if (!chatId) {
    throw new Error(
      "TELEGRAM_SIGNAL_CHAT_ID is missing"
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.description ||
        `Telegram error ${response.status}`
    );
  }

  return data.result;
}

async function runTelegramAlerts() {
  const alertMinutes = (
    process.env.NEWS_ALERT_MINUTES ||
    "120"
  )
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value >= 5 &&
        value <= 1440
    );

  const minutesList =
    alertMinutes.length
      ? alertMinutes
      : DEFAULT_ALERT_MINUTES;

  const minImportance = Number(
    process.env.NEWS_ALERT_MIN_IMPORTANCE ||
      "2"
  );

  await syncCalendar(
    Number(
      process.env.NEWS_CALENDAR_DAYS ||
        "14"
    )
  );

  const admin =
    await prisma.user.findFirst({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
    });

  const fallbackUser =
    admin ||
    (await prisma.user.findFirst({
      select: {
        id: true,
      },
    }));

  if (!fallbackUser) {
    throw new Error(
      "No user exists for alert deduplication"
    );
  }

  let sent = 0;
  let skipped = 0;

  const now = Date.now();

  for (const minutes of minutesList) {
    const target =
      now +
      minutes * 60 * 1000;

    const windowStart = new Date(
      target - 3 * 60 * 1000
    );

    const windowEnd = new Date(
      target + 3 * 60 * 1000
    );

    const events =
      await prisma.economicEvent.findMany({
        where: {
          eventTime: {
            gte: windowStart,
            lte: windowEnd,
          },
          importance: {
            gte: minImportance,
          },
          status: {
            in: [
              "SCHEDULED",
              "RELEASED",
            ],
          },
        },
        orderBy: {
          eventTime: "asc",
        },
      });

    for (const event of events) {
      const alertType =
        `TELEGRAM_${minutes}M`;

      const existing =
        await prisma.newsAlert.findUnique({
          where: {
            userId_eventId_alertType: {
              userId:
                fallbackUser.id,
              eventId: event.id,
              alertType,
            },
          },
        });

      if (
        existing?.status === "SENT"
      ) {
        skipped++;
        continue;
      }

      const alert =
        await prisma.newsAlert.upsert({
          where: {
            userId_eventId_alertType: {
              userId:
                fallbackUser.id,
              eventId: event.id,
              alertType,
            },
          },
          create: {
            userId:
              fallbackUser.id,
            eventId: event.id,
            alertType,
            scheduledFor: new Date(
              event.eventTime.getTime() -
                minutes * 60 * 1000
            ),
            status: "PENDING",
          },
          update: {
            scheduledFor: new Date(
              event.eventTime.getTime() -
                minutes * 60 * 1000
            ),
          },
        });

      try {
        const message =
          buildTelegramMessage(
            event,
            minutes
          );

        const result =
          await sendTelegram(
            message
          );

        const messageId =
          result?.message_id
            ? String(result.message_id)
            : null;

        await prisma.newsAlert.update({
          where: {
            id: alert.id,
          },
          data: {
            status: "SENT",
            sentAt: new Date(),
            errorMessage: null,
          },
        });

        await prisma.newsDelivery.create({
          data: {
            alertId: alert.id,
            channel: "TELEGRAM",
            destination:
              process.env
                .TELEGRAM_SIGNAL_CHAT_ID ||
              "",
            status: "SENT",
            messageId,
            sentAt: new Date(),
          },
        });

        sent++;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown Telegram error";

        await prisma.newsAlert.update({
          where: {
            id: alert.id,
          },
          data: {
            status: "FAILED",
            errorMessage,
          },
        });

        await prisma.newsDelivery.create({
          data: {
            alertId: alert.id,
            channel: "TELEGRAM",
            destination:
              process.env
                .TELEGRAM_SIGNAL_CHAT_ID ||
              "",
            status: "FAILED",
            errorMessage,
          },
        });
      }
    }
  }

  return {
    sent,
    skipped,
    alertMinutes: minutesList,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const mode =
      request.nextUrl.searchParams.get(
        "mode"
      );

    if (mode === "alerts") {
      const cronSecret =
        request.headers.get(
          "x-cron-secret"
        );

      const expected =
        process.env.NEWS_CRON_SECRET;

      if (
        !expected ||
        cronSecret !== expected
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }

      const result =
        await runTelegramAlerts();

      return NextResponse.json({
        ok: true,
        mode: "alerts",
        ...result,
        timestamp:
          new Date().toISOString(),
      });
    }

    const userId =
      await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    const settings =
      await getUserNewsSettings(
        userId
      );

    const days = Math.min(
      30,
      Math.max(
        1,
        Number(
          request.nextUrl.searchParams.get(
            "days"
          ) ||
            process.env
              .NEWS_CALENDAR_DAYS ||
            DEFAULT_DAYS
        )
      )
    );

    const synced =
      await syncCalendar(days);

    const now = new Date();

    const end = new Date(
      now.getTime() +
        days *
          24 *
          60 *
          60 *
          1000
    );

    const configuredCurrencies =
      parseCurrencies(
        settings.currencies
      );

    const events =
      await prisma.economicEvent.findMany({
        where: {
          eventTime: {
            gte: now,
            lte: end,
          },
        },
        orderBy: {
          eventTime: "asc",
        },
      });

    const filtered = events.filter(
      (event) => {
        const currency =
          eventCurrency(event);

        const impactAllowed =
          event.importance >= 3
            ? settings.highImpact
            : event.importance >= 2
              ? settings.mediumImpact
              : settings.lowImpact;

        const currencyAllowed =
          currency === "GLOBAL" ||
          configuredCurrencies.includes(
            currency
          );

        return (
          impactAllowed &&
          currencyAllowed
        );
      }
    );

    return NextResponse.json({
      ok: true,
      source: "FINANCECALENDAR",
      sourceUrl: SOURCE_URL,
      synced,
      settings: {
        highImpact:
          settings.highImpact,
        mediumImpact:
          settings.mediumImpact,
        lowImpact:
          settings.lowImpact,
        currencies:
          configuredCurrencies,
        alertMinutes:
          parseAlertMinutes(
            settings.alertMinutes
          ),
        telegramEnabled:
          settings.telegramEnabled,
        newsFilterEnabled:
          settings.newsFilterEnabled,
        marketRiskEnabled:
          settings.marketRiskEnabled,
      },
      events: filtered,
      serverTime:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "ECONOMIC_CALENDAR_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Economic calendar failed",
      },
      {
        status: 500,
      }
    );
  }
}
