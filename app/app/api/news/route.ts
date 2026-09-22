import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINANCE_CALENDAR_API =
  "https://www.financecalendar.com/wp-json/fc/v1/calendar";

type FinanceCalendarEvent = {
  id?: string | number;
  event_id?: string | number;
  externalId?: string;
  external_id?: string;

  date?: string;
  datetime?: string;
  time?: string;
  time_utc?: string;

  name?: string;
  title?: string;
  event?: string;

  country?: string;
  currency?: string;

  category?: string;

  impact?: string | number;
  importance?: string | number;

  previous?: string | number | null;
  prior?: string | number | null;

  forecast?: string | number | null;
  consensus?: string | number | null;

  actual?: string | number | null;

  unit?: string | null;

  url?: string | null;
  sourceUrl?: string | null;

  [key: string]: unknown;
};

type FinanceCalendarResponse =
  | FinanceCalendarEvent[]
  | {
      events?: FinanceCalendarEvent[];
      data?: FinanceCalendarEvent[];
      results?: FinanceCalendarEvent[];
      attribution?: unknown;
      [key: string]: unknown;
    };

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();

  if (!raw) return null;

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

function normalizeImportance(value: unknown): number {
  if (typeof value === "number") {
    if (value >= 3) return 3;
    if (value >= 2) return 2;
    return 1;
  }

  const valueText = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    valueText === "high" ||
    valueText === "3" ||
    valueText === "critical"
  ) {
    return 3;
  }

  if (
    valueText === "medium" ||
    valueText === "2" ||
    valueText === "moderate"
  ) {
    return 2;
  }

  return 1;
}

function normalizeActual(value: unknown): string | null {
  return normalizeText(value);
}

function buildExternalId(
  item: FinanceCalendarEvent,
  eventTime: Date,
  eventName: string,
) {
  const directId =
    normalizeText(item.externalId) ??
    normalizeText(item.external_id) ??
    normalizeText(item.event_id) ??
    normalizeText(item.id);

  if (directId) {
    return `financecalendar:${directId}`;
  }

  const stableValue = [
    normalizeText(item.country) ?? "",
    normalizeText(item.currency) ?? "",
    eventName,
    eventTime.toISOString(),
  ].join("|");

  const hash = createHash("sha256")
    .update(stableValue)
    .digest("hex")
    .slice(0, 40);

  return `financecalendar:${hash}`;
}

function buildSourceUrl(value: unknown): string | null {
  const url = normalizeText(value);

  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `https://www.financecalendar.com${url}`;
  }

  return `https://www.financecalendar.com/${url}`;
}

function getEventsFromResponse(
  response: FinanceCalendarResponse,
): FinanceCalendarEvent[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.events)) {
    return response.events;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  return [];
}

function getEventName(item: FinanceCalendarEvent) {
  return (
    normalizeText(item.name) ??
    normalizeText(item.title) ??
    normalizeText(item.event) ??
    "Economic Event"
  );
}

function getEventTime(item: FinanceCalendarEvent): Date | null {
  return (
    parseDate(item.time_utc) ??
    parseDate(item.datetime) ??
    parseDate(item.date) ??
    parseDate(item.time)
  );
}

function getPrevious(item: FinanceCalendarEvent) {
  return normalizeText(item.previous) ?? normalizeText(item.prior);
}

function getForecast(item: FinanceCalendarEvent) {
  return normalizeText(item.forecast) ?? normalizeText(item.consensus);
}

function getStatus(
  eventTime: Date,
  actual: string | null,
) {
  if (actual) {
    return "RELEASED";
  }

  if (eventTime.getTime() <= Date.now()) {
    return "RELEASED";
  }

  return "SCHEDULED";
}

function sanitizeRawData(item: FinanceCalendarEvent) {
  try {
    return JSON.parse(JSON.stringify(item));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const now = new Date();

    const defaultFrom = formatDate(now);

    const defaultToDate = new Date(now);
    defaultToDate.setUTCDate(defaultToDate.getUTCDate() + 7);

    const defaultTo = formatDate(defaultToDate);

    const from = searchParams.get("from") || defaultFrom;
    const to = searchParams.get("to") || defaultTo;

    const impact = searchParams.get("impact");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(
      Math.max(Number(limitParam || 500), 1),
      500,
    );

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date range.",
        },
        { status: 400 },
      );
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: "`from` date cannot be after `to` date.",
        },
        { status: 400 },
      );
    }

    const maxRangeMs =
      92 * 24 * 60 * 60 * 1000;

    if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
      return NextResponse.json(
        {
          success: false,
          error: "The requested date range cannot exceed 92 days.",
        },
        { status: 400 },
      );
    }

    const apiUrl = new URL(FINANCE_CALENDAR_API);

    apiUrl.searchParams.set("from", from);
    apiUrl.searchParams.set("to", to);
    apiUrl.searchParams.set("limit", String(limit));

    if (
      impact === "high" ||
      impact === "medium" ||
      impact === "low"
    ) {
      apiUrl.searchParams.set("impact", impact);
    }

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");

      console.error(
        "FinanceCalendar API error:",
        response.status,
        errorText,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Economic calendar provider is currently unavailable.",
          providerStatus: response.status,
        },
        { status: 502 },
      );
    }

    const data =
      (await response.json()) as FinanceCalendarResponse;

    const providerEvents = getEventsFromResponse(data);

    const normalizedEvents = providerEvents
      .map((item) => {
        const eventTime = getEventTime(item);

        if (!eventTime) {
          return null;
        }

        const eventName = getEventName(item);

        const actual = normalizeActual(item.actual);

        const previous = getPrevious(item);

        const forecast = getForecast(item);

        const importance = normalizeImportance(
          item.impact ?? item.importance,
        );

        const externalId = buildExternalId(
          item,
          eventTime,
          eventName,
        );

        const sourceUrl = buildSourceUrl(
          item.url ?? item.sourceUrl,
        );

        return {
          externalId,
          country: normalizeText(item.country),
          currency: normalizeText(item.currency),
          event: eventName,
          category: normalizeText(item.category),
          importance,
          eventTime,
          previous,
          forecast,
          actual,
          unit: normalizeText(item.unit),
          status: getStatus(eventTime, actual),
          source: "FINANCE_CALENDAR",
          sourceUrl,
          rawData: sanitizeRawData(item),
        };
      })
      .filter(
        (
          event,
        ): event is NonNullable<typeof event> =>
          event !== null,
      );

    let created = 0;
    let updated = 0;

    for (const event of normalizedEvents) {
      const existing =
        await prisma.economicEvent.findUnique({
          where: {
            externalId: event.externalId,
          },
          select: {
            id: true,
          },
        });

      await prisma.economicEvent.upsert({
        where: {
          externalId: event.externalId,
        },
        create: event,
        update: {
          country: event.country,
          currency: event.currency,
          event: event.event,
          category: event.category,
          importance: event.importance,
          eventTime: event.eventTime,
          previous: event.previous,
          forecast: event.forecast,
          actual: event.actual,
          unit: event.unit,
          status: event.status,
          source: event.source,
          sourceUrl: event.sourceUrl,
          rawData: event.rawData ?? undefined,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    const dbEvents = await prisma.economicEvent.findMany({
      where: {
        eventTime: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: {
        eventTime: "asc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,

      source: {
        name: "FinanceCalendar",
        url: "https://www.financecalendar.com",
        attributionRequired: true,
      },

      range: {
        from,
        to,
      },

      sync: {
        providerEvents: providerEvents.length,
        normalizedEvents: normalizedEvents.length,
        created,
        updated,
      },

      events: dbEvents,
    });
  } catch (error) {
    console.error("GET /api/news error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load economic calendar.",
      },
      { status: 500 },
    );
  }
}
