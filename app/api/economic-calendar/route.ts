import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINANCE_CALENDAR_URL =
  "https://www.financecalendar.com/wp-json/fc/v1/calendar";

const FINANCE_CALENDAR_HOME =
  "https://www.financecalendar.com";

type FinanceCalendarEvent = {
  date?: string;
  time_utc?: string;
  time_et?: string;
  all_day?: boolean;

  name?: string;
  title?: string;

  impact?: string;
  category?: string;

  consensus?: string | null;
  prior?: string | null;
  actual?: string | null;

  url?: string | null;
};

type FinanceCalendarResponse =
  | FinanceCalendarEvent[]
  | {
      events?: FinanceCalendarEvent[];
      attribution?: {
        source?: string;
        terms?: string;
        docs?: string;
      };
    };

type NewsSettingsShape = {
  highImpact: boolean;
  mediumImpact: boolean;
  lowImpact: boolean;
  currencies: string[];
  alertMinutes: number[];
  telegramEnabled: boolean;
  newsFilterEnabled: boolean;
  marketRiskEnabled: boolean;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function asString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

function normalizeImpact(value: unknown): number {
  const impact = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    impact === "high" ||
    impact === "3" ||
    impact === "critical"
  ) {
    return 3;
  }

  if (
    impact === "medium" ||
    impact === "2" ||
    impact === "moderate"
  ) {
    return 2;
  }

  if (
    impact === "low" ||
    impact === "1"
  ) {
    return 1;
  }

  return 1;
}

function inferCurrency(
  title: string,
  name: string,
  country: string | null
): string | null {
  const text =
    `${title} ${name} ${country ?? ""}`.toUpperCase();

  const currencyCodes = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "CAD",
    "CHF",
    "NZD",
    "CNY",
    "CNH",
    "SEK",
    "NOK",
    "SGD",
    "HKD",
    "MXN",
    "BRL",
    "ZAR",
  ];

  for (const code of currencyCodes) {
    if (text.includes(code)) {
      return code;
    }
  }

  if (
    text.includes("UNITED STATES") ||
    text.includes("US ") ||
    text.includes("U.S.")
  ) {
    return "USD";
  }

  if (
    text.includes("EUROZONE") ||
    text.includes("EURO AREA") ||
    text.includes("EUROPE")
  ) {
    return "EUR";
  }

  if (
    text.includes("UNITED KINGDOM") ||
    text.includes("UK ")
  ) {
    return "GBP";
  }

  if (text.includes("JAPAN")) {
    return "JPY";
  }

  if (text.includes("AUSTRALIA")) {
    return "AUD";
  }

  if (text.includes("CANADA")) {
    return "CAD";
  }

  if (text.includes("SWITZERLAND")) {
    return "CHF";
  }

  if (text.includes("NEW ZEALAND")) {
    return "NZD";
  }

  if (text.includes("CHINA")) {
    return "CNY";
  }

  return null;
}

function inferCountry(
  title: string,
  name: string
): string | null {
  const text =
    `${title} ${name}`.toUpperCase();

  if (
    text.includes("UNITED STATES") ||
    text.includes("US ") ||
    text.includes("U.S.") ||
    text.includes("FEDERAL RESERVE") ||
    text.includes("FOMC") ||
    text.includes("NFP") ||
    text.includes("NONFARM") ||
    text.includes("CPI")
  ) {
    return "United States";
  }

  if (
    text.includes("UNITED KINGDOM") ||
    text.includes("UK ") ||
    text.includes("BOE") ||
    text.includes("BANK OF ENGLAND")
  ) {
    return "United Kingdom";
  }

  if (
    text.includes("EUROZONE") ||
    text.includes("EURO AREA") ||
    text.includes("ECB") ||
    text.includes("EUROPEAN CENTRAL BANK")
  ) {
    return "Euro Area";
  }

  if (
    text.includes("JAPAN") ||
    text.includes("BOJ") ||
    text.includes("BANK OF JAPAN")
  ) {
    return "Japan";
  }

  if (
    text.includes("CANADA") ||
    text.includes("BOC") ||
    text.includes("BANK OF CANADA")
  ) {
    return "Canada";
  }

  if (
    text.includes("AUSTRALIA") ||
    text.includes("RBA") ||
    text.includes("RESERVE BANK OF AUSTRALIA")
  ) {
    return "Australia";
  }

  if (
    text.includes("NEW ZEALAND") ||
    text.includes("RBNZ")
  ) {
    return "New Zealand";
  }

  if (
    text.includes("SWITZERLAND") ||
    text.includes("SNB")
  ) {
    return "Switzerland";
  }

  if (
    text.includes("CHINA") ||
    text.includes("PBOC")
  ) {
    return "China";
  }

  return null;
}

function makeExternalId(
  event: FinanceCalendarEvent,
  eventTime: Date
): string {
  const raw = [
    event.url ?? "",
    eventTime.toISOString(),
    event.title ?? "",
    event.name ?? "",
  ].join("|");

  return createHash("sha256")
    .update(raw)
    .digest("hex");
}

function getEventTime(
  event: FinanceCalendarEvent
): Date | null {
  const candidates = [
    event.time_utc,
    event.date,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const date = new Date(candidate);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function normalizeCalendarResponse(
  data: FinanceCalendarResponse
): FinanceCalendarEvent[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray(data.events)
  ) {
    return data.events;
  }

  return [];
}

async function fetchFinanceCalendar(
  days: number
): Promise<FinanceCalendarEvent[]> {
  const safeDays = Math.min(
    Math.max(days, 1),
    92
  );

  const now = new Date();

  const from = now
    .toISOString()
    .slice(0, 10);

  const end = new Date(now);

  end.setUTCDate(
    end.getUTCDate() + safeDays
  );

  const to = end
    .toISOString()
    .slice(0, 10);

  const url =
    `${FINANCE_CALENDAR_URL}` +
    `?from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}` +
    `&limit=500`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "TradingAIPlatform/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Finance Calendar HTTP ${response.status}`
    );
  }

  const data =
    (await response.json()) as FinanceCalendarResponse;

  return normalizeCalendarResponse(data);
}

async function syncCalendar(
  days: number
): Promise<number> {
  const externalEvents =
    await fetchFinanceCalendar(days);

  let saved = 0;

  for (const externalEvent of externalEvents) {
    const eventTime =
      getEventTime(externalEvent);

    if (!eventTime) {
      continue;
    }

    if (externalEvent.all_day) {
      continue;
    }

    const title =
      asString(externalEvent.title) ||
      asString(externalEvent.name);

    if (!title) {
      continue;
    }

    const name =
      asString(externalEvent.name) ||
      title;

    const country =
      inferCountry(
        title,
        name
      );

    const currency =
      inferCurrency(
        title,
        name,
        country
      );

    const importance =
      normalizeImpact(
        externalEvent.impact
      );

    const externalId =
      makeExternalId(
        externalEvent,
        eventTime
      );

    await prisma.economicEvent.upsert({
      where: {
        externalId,
      },

      create: {
        externalId,

        country,
        currency,

        event: title,

        category:
          asString(
            externalEvent.category
          ),

        importance,

        eventTime,

        previous:
          asString(
            externalEvent.prior
          ),

        forecast:
          asString(
            externalEvent.consensus
          ),

        actual:
          asString(
            externalEvent.actual
          ),

        unit: null,

        status:
          eventTime.getTime() <=
          Date.now()
            ? "RELEASED"
            : "SCHEDULED",

        source:
          "FINANCE_CALENDAR",

        sourceUrl:
          asString(
            externalEvent.url
          ) ||
          FINANCE_CALENDAR_HOME,

        rawData:
          externalEvent as unknown as object,
      },

      update: {
        country,
        currency,

        event: title,

        category:
          asString(
            externalEvent.category
          ),

        importance,

        eventTime,

        previous:
          asString(
            externalEvent.prior
          ),

        forecast:
          asString(
            externalEvent.consensus
          ),

        actual:
          asString(
            externalEvent.actual
          ),

        status:
          eventTime.getTime() <=
          Date.now()
            ? "RELEASED"
            : "SCHEDULED",

        source:
          "FINANCE_CALENDAR",

        sourceUrl:
          asString(
            externalEvent.url
          ) ||
          FINANCE_CALENDAR_HOME,

        rawData:
          externalEvent as unknown as object,
      },
    });

    saved += 1;
  }

  return saved;
}

function parseSettings(
  value: {
    highImpact: boolean;
    mediumImpact: boolean;
    lowImpact: boolean;
    currencies: unknown;
    alertMinutes: unknown;
    telegramEnabled: boolean;
    newsFilterEnabled: boolean;
    marketRiskEnabled: boolean;
  } | null
): NewsSettingsShape {
  const currencies =
    Array.isArray(value?.currencies)
      ? value.currencies
          .map((item) =>
            String(item)
              .trim()
              .toUpperCase()
          )
          .filter(Boolean)
      : [
          "USD",
          "EUR",
          "GBP",
          "JPY",
          "AUD",
          "CAD",
          "CHF",
          "NZD",
          "CNY",
        ];

  const alertMinutes =
    Array.isArray(value?.alertMinutes)
      ? value.alertMinutes
          .map((item) =>
            Number(item)
          )
          .filter(
            (item) =>
              Number.isFinite(item) &&
              item > 0 &&
              item <= 1440
          )
      : [120];

  return {
    highImpact:
      value?.highImpact ?? true,

    mediumImpact:
      value?.mediumImpact ?? true,

    lowImpact:
      value?.lowImpact ?? false,

    currencies,

    alertMinutes:
      alertMinutes.length > 0
        ? alertMinutes
        : [120],

    telegramEnabled:
      value?.telegramEnabled ?? true,

    newsFilterEnabled:
      value?.newsFilterEnabled ?? true,

    marketRiskEnabled:
      value?.marketRiskEnabled ?? true,
  };
}

function allowedBySettings(
  event: {
    importance: number;
    currency: string | null;
  },
  settings: NewsSettingsShape
): boolean {
  if (
    event.importance >= 3 &&
    !settings.highImpact
  ) {
    return false;
  }

  if (
    event.importance === 2 &&
    !settings.mediumImpact
  ) {
    return false;
  }

  if (
    event.importance <= 1 &&
    !settings.lowImpact
  ) {
    return false;
  }

  if (
    event.currency &&
    settings.currencies.length > 0 &&
    !settings.currencies.includes(
      event.currency.toUpperCase()
    )
  ) {
    return false;
  }

  return true;
}

function impactLabel(
  importance: number
): string {
  if (importance >= 3) {
    return "HIGH IMPACT";
  }

  if (importance === 2) {
    return "MEDIUM IMPACT";
  }

  return "LOW IMPACT";
}

function impactIcon(
  importance: number
): string {
  if (importance >= 3) {
    return "🔴";
  }

  if (importance === 2) {
    return "🟠";
  }

  return "🟢";
}

function formatTelegramTime(
  value: Date,
  timeZone: string
): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(value);
}

function minutesRemaining(
  eventTime: Date,
  alertMinutes: number
): number {
  return Math.max(
    0,
    Math.round(
      (eventTime.getTime() -
        Date.now()) /
        60000
    )
  );
}

async function sendTelegramMessage(
  text: string
): Promise<string> {
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
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        chat_id: chatId,
        text,

        parse_mode: "HTML",

        disable_web_page_preview:
          true,
      }),

      cache: "no-store",
    }
  );

  const data = (await response.json()) as {
    ok?: boolean;
    result?: {
      message_id?: number;
    };
    description?: string;
  };

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.description ||
        `Telegram HTTP ${response.status}`
    );
  }

  return String(
    data.result?.message_id ?? ""
  );
}

function buildNewsTelegramMessage(
  event: {
    event: string;
    country: string | null;
    currency: string | null;
    category: string | null;
    importance: number;
    eventTime: Date;
    previous: string | null;
    forecast: string | null;
    actual: string | null;
    sourceUrl: string | null;
  },
  alertMinutes: number
): string {
  const icon =
    impactIcon(event.importance);

  const impact =
    impactLabel(event.importance);

  const remaining =
    minutesRemaining(
      event.eventTime,
      alertMinutes
    );

  const utc =
    formatTelegramTime(
      event.eventTime,
      "UTC"
    );

  const london =
    formatTelegramTime(
      event.eventTime,
      "Europe/London"
    );

  const newYork =
    formatTelegramTime(
      event.eventTime,
      "America/New_York"
    );

  const tehran =
    formatTelegramTime(
      event.eventTime,
      "Asia/Tehran"
    );

  const source =
    event.sourceUrl ||
    FINANCE_CALENDAR_HOME;

  return [
    `🚨 <b>ECONOMIC NEWS WARNING</b>`,

    `━━━━━━━━━━━━━━━━━━`,

    `${icon} <b>${escapeHtml(
      impact
    )}</b>`,

    `📌 <b>${escapeHtml(
      event.event
    )}</b>`,

    `💵 Currency: <b>${escapeHtml(
      event.currency || "N/A"
    )}</b>`,

    `🌍 Country: <b>${escapeHtml(
      event.country || "N/A"
    )}</b>`,

    `⏳ <b>${remaining} minutes remaining</b>`,

    ``,

    `🕐 UTC: <b>${utc}</b>`,

    `🇬🇧 London: <b>${london}</b>`,

    `🇺🇸 New York: <b>${newYork}</b>`,

    `🇮🇷 Tehran: <b>${tehran}</b>`,

    ``,

    `📊 Forecast: <b>${escapeHtml(
      event.forecast || "—"
    )}</b>`,

    `↩️ Previous: <b>${escapeHtml(
      event.previous || "—"
    )}</b>`,

    `📈 Actual: <b>${escapeHtml(
      event.actual || "Pending"
    )}</b>`,

    ``,

    `🧭 Category: <b>${escapeHtml(
      event.category || "Economic"
    )}</b>`,

    ``,

    `⚠️ این رویداد ممکن است باعث افزایش نوسان در XAUUSD، USD و سایر بازارهای مرتبط شود.`,

    ``,

    `🔗 <a href="${escapeHtml(
      source
    )}">Finance Calendar</a>`,
  ].join("\n");
}

async function runAlerts(): Promise<NextResponse> {
  const cronSecret =
    process.env.NEWS_CRON_SECRET;

  const enabled =
    process.env.NEWS_TELEGRAM_ENABLED !==
    "false";

  if (!cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "NEWS_CRON_SECRET is not configured",
      },
      { status: 500 }
    );
  }

  if (!enabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason:
        "NEWS_TELEGRAM_ENABLED=false",
    });
  }

  const days = Number(
    process.env.NEWS_CALENDAR_DAYS ||
      "14"
  );

  await syncCalendar(
    Number.isFinite(days)
      ? days
      : 14
  );

  const minimumImportance = Number(
    process.env.NEWS_ALERT_MIN_IMPORTANCE ||
      "2"
  );

  const alertMinutesFromEnv =
    String(
      process.env.NEWS_ALERT_MINUTES ||
        "120"
    )
      .split(",")
      .map((value) =>
        Number(value.trim())
      )
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0
      );

  const alertMinutes =
    alertMinutesFromEnv.length > 0
      ? alertMinutesFromEnv
      : [120];

  const now = new Date();

  const windowStart =
    new Date(
      now.getTime() -
        3 * 60 * 1000
    );

  const windowEnd =
    new Date(
      now.getTime() +
        Math.max(
          ...alertMinutes
        ) *
          60 *
          1000 +
        3 * 60 * 1000
    );

  const events =
    await prisma.economicEvent.findMany(
      {
        where: {
          importance: {
            gte: minimumImportance,
          },

          eventTime: {
            gte: now,
            lte: windowEnd,
          },
        },

        orderBy: {
          eventTime: "asc",
        },

        take: 100,
      }
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

  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No ADMIN user exists for news alert ownership",
      },
      { status: 500 }
    );
  }

  let sent = 0;

  let skipped = 0;

  const errors: string[] = [];

  for (const event of events) {
    for (const minutes of alertMinutes) {
      const targetTime =
        new Date(
          event.eventTime.getTime() -
            minutes * 60 * 1000
        );

      if (
        targetTime < windowStart ||
        targetTime > windowEnd
      ) {
        continue;
      }

      if (
        !allowedBySettings(
          {
            importance:
              event.importance,

            currency:
              event.currency,
          },
          parseSettings(null)
        )
      ) {
        continue;
      }

      const alertType =
        `TELEGRAM_${minutes}M`;

      const existing =
        await prisma.newsAlert.findUnique(
          {
            where: {
              userId_eventId_alertType: {
                userId: admin.id,
                eventId: event.id,
                alertType,
              },
            },
          }
        );

      if (
        existing?.status === "SENT"
      ) {
        skipped += 1;
        continue;
      }

      try {
        const message =
          buildNewsTelegramMessage(
            {
              event: event.event,
              country: event.country,
              currency: event.currency,
              category: event.category,
              importance:
                event.importance,
              eventTime:
                event.eventTime,
              previous:
                event.previous,
              forecast:
                event.forecast,
              actual:
                event.actual,
              sourceUrl:
                event.sourceUrl,
            },
            minutes
          );

        const messageId =
          await sendTelegramMessage(
            message
          );

        const alert =
          existing
            ? await prisma.newsAlert.update(
                {
                  where: {
                    id: existing.id,
                  },

                  data: {
                    status: "SENT",
                    sentAt: new Date(),
                    errorMessage: null,
                  },
                }
              )
            : await prisma.newsAlert.create(
                {
                  data: {
                    userId: admin.id,
                    eventId: event.id,
                    alertType,
                    scheduledFor:
                      targetTime,
                    status: "SENT",
                    sentAt: new Date(),
                  },
                }
              );

        await prisma.newsDelivery.create(
          {
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
          }
        );

        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown Telegram error";

        errors.push(
          `${event.event}: ${message}`
        );

        if (existing) {
          await prisma.newsAlert.update(
            {
              where: {
                id: existing.id,
              },

              data: {
                status: "FAILED",
                errorMessage: message,
              },
            }
          );
        } else {
          await prisma.newsAlert.create(
            {
              data: {
                userId: admin.id,
                eventId: event.id,
                alertType,
                scheduledFor:
                  targetTime,
                status: "FAILED",
                errorMessage: message,
              },
            }
          );
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "alerts",
    sent,
    skipped,
    checkedEvents: events.length,
    errors,
    source: {
      name: "Finance Calendar",
      url: FINANCE_CALENDAR_HOME,
    },
  });
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
      const expectedSecret =
        process.env.NEWS_CRON_SECRET;

      const receivedSecret =
        request.headers.get(
          "x-cron-secret"
        );

      if (
        !expectedSecret ||
        !receivedSecret ||
        receivedSecret !==
          expectedSecret
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Unauthorized",
          },
          { status: 401 }
        );
      }

      return await runAlerts();
    }

    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.userId,
        },

        select: {
          id: true,

          newsSetting: {
            select: {
              highImpact: true,
              mediumImpact: true,
              lowImpact: true,
              currencies: true,
              alertMinutes: true,
              telegramEnabled: true,
              newsFilterEnabled: true,
              marketRiskEnabled: true,
            },
          },
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    const days = Number(
      process.env.NEWS_CALENDAR_DAYS ||
        "14"
    );

    await syncCalendar(
      Number.isFinite(days)
        ? days
        : 14
    );

    const settings =
      parseSettings(
        user.newsSetting
      );

    const now = new Date();

    const end =
      new Date(
        now.getTime() +
          (Number.isFinite(days)
            ? days
            : 14) *
            24 *
            60 *
            60 *
            1000
      );

    const events =
      await prisma.economicEvent.findMany(
        {
          where: {
            eventTime: {
              gte: now,
              lte: end,
            },
          },

          orderBy: {
            eventTime: "asc",
          },

          take: 500,
        }
      );

    const filtered =
      events.filter((event) =>
        allowedBySettings(
          {
            importance:
              event.importance,

            currency:
              event.currency,
          },
          settings
        )
      );

    return NextResponse.json({
      ok: true,

      source: {
        name: "Finance Calendar",
        url: FINANCE_CALENDAR_HOME,
      },

      settings,

      events: filtered.map(
        (event) => ({
          id: event.id,

          externalId:
            event.externalId,

          event:
            event.event,

          title:
            event.event,

          name:
            event.event,

          country:
            event.country,

          currency:
            event.currency,

          category:
            event.category,

          importance:
            event.importance,

          eventTime:
            event.eventTime.toISOString(),

          previous:
            event.previous,

          forecast:
            event.forecast,

          actual:
            event.actual,

          unit:
            event.unit,

          status:
            event.status,

          source:
            event.source,

          sourceUrl:
            event.sourceUrl,
        })
      ),
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
      { status: 500 }
    );
  }
}
