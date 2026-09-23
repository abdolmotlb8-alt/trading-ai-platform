import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CURRENCIES = [
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

const DEFAULT_ALERT_MINUTES = [120];

type SettingsPayload = {
  highImpact?: unknown;
  mediumImpact?: unknown;
  lowImpact?: unknown;
  currencies?: unknown;
  alertMinutes?: unknown;
  telegramEnabled?: unknown;
  newsFilterEnabled?: unknown;
  marketRiskEnabled?: unknown;
};

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "off"
    ) {
      return false;
    }
  }

  return fallback;
}

function normalizeCurrencies(value: unknown): string[] {
  let values: unknown[] = [];

  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === "string") {
    values = value.split(",");
  }

  const result: string[] = [];

  for (const item of values) {
    if (typeof item !== "string") {
      continue;
    }

    const currency = item.trim().toUpperCase();

    if (!currency) {
      continue;
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      continue;
    }

    if (!result.includes(currency)) {
      result.push(currency);
    }
  }

  return result.length > 0 ? result : DEFAULT_CURRENCIES;
}

function normalizeAlertMinutes(value: unknown): number[] {
  let values: unknown[] = [];

  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === "string") {
    values = value.split(",");
  } else if (typeof value === "number") {
    values = [value];
  }

  const result: number[] = [];

  for (const item of values) {
    const minutes = Number(item);

    if (!Number.isFinite(minutes)) {
      continue;
    }

    const rounded = Math.round(minutes);

    if (rounded < 1 || rounded > 10080) {
      continue;
    }

    if (!result.includes(rounded)) {
      result.push(rounded);
    }
  }

  result.sort((a, b) => b - a);

  return result.length > 0 ? result : DEFAULT_ALERT_MINUTES;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function serializeSettings(settings: {
  id: string;
  userId: string;
  highImpact: boolean;
  mediumImpact: boolean;
  lowImpact: boolean;
  currencies: Prisma.JsonValue | null;
  alertMinutes: Prisma.JsonValue | null;
  telegramEnabled: boolean;
  newsFilterEnabled: boolean;
  marketRiskEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: settings.id,
    userId: settings.userId,

    highImpact: settings.highImpact,
    mediumImpact: settings.mediumImpact,
    lowImpact: settings.lowImpact,

    currencies:
      settings.currencies !== null
        ? normalizeCurrencies(settings.currencies)
        : DEFAULT_CURRENCIES,

    alertMinutes:
      settings.alertMinutes !== null
        ? normalizeAlertMinutes(settings.alertMinutes)
        : DEFAULT_ALERT_MINUTES,

    telegramEnabled: settings.telegramEnabled,
    newsFilterEnabled: settings.newsFilterEnabled,
    marketRiskEnabled: settings.marketRiskEnabled,

    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "احراز هویت لازم است.",
        },
        { status: 401 }
      );
    }

    let settings = await prisma.newsSetting.findUnique({
      where: {
        userId: session.userId,
      },
    });

    if (!settings) {
      settings = await prisma.newsSetting.create({
        data: {
          userId: session.userId,

          highImpact: true,
          mediumImpact: true,
          lowImpact: false,

          currencies: jsonValue(DEFAULT_CURRENCIES),
          alertMinutes: jsonValue(DEFAULT_ALERT_MINUTES),

          telegramEnabled: true,
          newsFilterEnabled: true,
          marketRiskEnabled: true,
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        settings: serializeSettings(settings),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("NEWS_SETTINGS_GET_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "خطا در دریافت تنظیمات اخبار.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "احراز هویت لازم است.",
        },
        { status: 401 }
      );
    }

    let body: SettingsPayload = {};

    try {
      const parsed: unknown = await request.json();

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        body = parsed as SettingsPayload;
      }
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "داده ارسالی معتبر نیست.",
        },
        { status: 400 }
      );
    }

    const current = await prisma.newsSetting.findUnique({
      where: {
        userId: session.userId,
      },
    });

    const currentCurrencies = current?.currencies
      ? normalizeCurrencies(current.currencies)
      : DEFAULT_CURRENCIES;

    const currentAlertMinutes = current?.alertMinutes
      ? normalizeAlertMinutes(current.alertMinutes)
      : DEFAULT_ALERT_MINUTES;

    const highImpact =
      body.highImpact === undefined
        ? current?.highImpact ?? true
        : toBoolean(body.highImpact, current?.highImpact ?? true);

    const mediumImpact =
      body.mediumImpact === undefined
        ? current?.mediumImpact ?? true
        : toBoolean(body.mediumImpact, current?.mediumImpact ?? true);

    const lowImpact =
      body.lowImpact === undefined
        ? current?.lowImpact ?? false
        : toBoolean(body.lowImpact, current?.lowImpact ?? false);

    const telegramEnabled =
      body.telegramEnabled === undefined
        ? current?.telegramEnabled ?? true
        : toBoolean(body.telegramEnabled, current?.telegramEnabled ?? true);

    const newsFilterEnabled =
      body.newsFilterEnabled === undefined
        ? current?.newsFilterEnabled ?? true
        : toBoolean(
            body.newsFilterEnabled,
            current?.newsFilterEnabled ?? true
          );

    const marketRiskEnabled =
      body.marketRiskEnabled === undefined
        ? current?.marketRiskEnabled ?? true
        : toBoolean(
            body.marketRiskEnabled,
            current?.marketRiskEnabled ?? true
          );

    const currencies =
      body.currencies === undefined
        ? currentCurrencies
        : normalizeCurrencies(body.currencies);

    const alertMinutes =
      body.alertMinutes === undefined
        ? currentAlertMinutes
        : normalizeAlertMinutes(body.alertMinutes);

    const settings = await prisma.newsSetting.upsert({
      where: {
        userId: session.userId,
      },

      create: {
        userId: session.userId,

        highImpact,
        mediumImpact,
        lowImpact,

        currencies: jsonValue(currencies),
        alertMinutes: jsonValue(alertMinutes),

        telegramEnabled,
        newsFilterEnabled,
        marketRiskEnabled,
      },

      update: {
        highImpact,
        mediumImpact,
        lowImpact,

        currencies: jsonValue(currencies),
        alertMinutes: jsonValue(alertMinutes),

        telegramEnabled,
        newsFilterEnabled,
        marketRiskEnabled,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "تنظیمات اخبار با موفقیت ذخیره شد.",
        settings: serializeSettings(settings),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("NEWS_SETTINGS_PATCH_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "ذخیره تنظیمات اخبار انجام نشد.",
      },
      { status: 500 }
    );
  }
}
