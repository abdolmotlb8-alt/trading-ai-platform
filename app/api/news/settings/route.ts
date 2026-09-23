import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const DEFAULT_ALERT_MINUTES = [120];

async function getUser() {
  const session = await getSession();

  if (!session?.userId) {
    return null;
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
      },
    });

  return user;
}

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
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
      await prisma.newsSetting.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          highImpact: true,
          mediumImpact: true,
          lowImpact: false,
          currencies:
            DEFAULT_CURRENCIES,
          alertMinutes:
            DEFAULT_ALERT_MINUTES,
          telegramEnabled: true,
          newsFilterEnabled: true,
          marketRiskEnabled: true,
        },
        update: {},
      });

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    console.error(
      "NEWS_SETTINGS_GET_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Could not load settings",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const user = await getUser();

    if (!user) {
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

    const body =
      await request.json();

    const currencies =
      Array.isArray(body.currencies)
        ? body.currencies
            .filter(
              (
                value: unknown
              ): value is string =>
                typeof value === "string"
            )
            .map((value) =>
              value
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        : DEFAULT_CURRENCIES;

    const alertMinutes =
      Array.isArray(
        body.alertMinutes
      )
        ? body.alertMinutes
            .map((value: unknown) =>
              Number(value)
            )
            .filter(
              (value: number) =>
                Number.isFinite(
                  value
                ) &&
                value >= 5 &&
                value <= 1440
            )
        : DEFAULT_ALERT_MINUTES;

    const settings =
      await prisma.newsSetting.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,

          highImpact:
            body.highImpact !== false,

          mediumImpact:
            body.mediumImpact !== false,

          lowImpact:
            body.lowImpact === true,

          currencies,

          alertMinutes,

          telegramEnabled:
            body.telegramEnabled !==
            false,

          newsFilterEnabled:
            body.newsFilterEnabled !==
            false,

          marketRiskEnabled:
            body.marketRiskEnabled !==
            false,
        },
        update: {
          highImpact:
            body.highImpact !== false,

          mediumImpact:
            body.mediumImpact !== false,

          lowImpact:
            body.lowImpact === true,

          currencies,

          alertMinutes,

          telegramEnabled:
            body.telegramEnabled !==
            false,

          newsFilterEnabled:
            body.newsFilterEnabled !==
            false,

          marketRiskEnabled:
            body.marketRiskEnabled !==
            false,
        },
      });

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    console.error(
      "NEWS_SETTINGS_PATCH_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Could not save settings",
      },
      {
        status: 500,
      }
    );
  }
}
