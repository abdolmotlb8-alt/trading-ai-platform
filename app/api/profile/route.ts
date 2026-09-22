import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = [
  "🤖",
  "🧠",
  "🚀",
  "📈",
  "💎",
  "⚡",
  "🔥",
  "👑",
  "🦁",
  "🐺",
  "🦊",
  "🐉",
  "🌟",
  "💰",
  "🎯",
  "🛡️",
];

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function getSubscriptionInfo(
  plan: string,
  subscriptionStartedAt: Date | null,
  subscriptionExpiresAt: Date | null
) {
  const isFree = plan.toUpperCase() === "FREE";

  if (isFree) {
    return {
      active: false,
      plan: "FREE",
      startedAt: subscriptionStartedAt,
      expiresAt: subscriptionExpiresAt,
      remainingDays: 0,
      expired: false,
      unlimited: false,
    };
  }

  if (!subscriptionExpiresAt) {
    return {
      active: true,
      plan,
      startedAt: subscriptionStartedAt,
      expiresAt: null,
      remainingDays: null,
      expired: false,
      unlimited: true,
    };
  }

  const now = Date.now();
  const expiresTime = subscriptionExpiresAt.getTime();
  const remainingMilliseconds = expiresTime - now;

  const remainingDays = Math.max(
    0,
    Math.ceil(
      remainingMilliseconds /
        (1000 * 60 * 60 * 24)
    )
  );

  const expired = remainingMilliseconds <= 0;

  return {
    active: !expired,
    plan,
    startedAt: subscriptionStartedAt,
    expiresAt: subscriptionExpiresAt,
    remainingDays,
    expired,
    unlimited: false,
  };
}

function serializeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,

    avatarUrl: user.avatarUrl ?? null,
    avatarEmoji: user.avatarEmoji ?? null,
    bio: user.bio ?? null,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,

    subscription: getSubscriptionInfo(
      user.plan,
      user.subscriptionStartedAt ?? null,
      user.subscriptionExpiresAt ?? null
    ),
  };
}

async function getAuthenticatedUserId() {
  const session = await getSession();

  if (!session?.userId) {
    return null;
  }

  return session.userId;
}

/*
|--------------------------------------------------------------------------
| GET /api/profile
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return errorResponse(
        "برای مشاهده پروفایل ابتدا وارد حساب خود شوید.",
        401
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,

        avatarUrl: true,
        avatarEmoji: true,
        bio: true,

        subscriptionStartedAt: true,
        subscriptionExpiresAt: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResponse(
        "کاربر پیدا نشد.",
        404
      );
    }

    return NextResponse.json({
      success: true,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(
      "PROFILE GET ERROR:",
      error
    );

    return errorResponse(
      "خطای داخلی سرور هنگام دریافت پروفایل.",
      500
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT /api/profile
|--------------------------------------------------------------------------
*/

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return errorResponse(
        "برای ویرایش پروفایل ابتدا وارد حساب خود شوید.",
        401
      );
    }

    let body: {
      name?: unknown;
      bio?: unknown;
      avatarUrl?: unknown;
      avatarEmoji?: unknown;
      removeAvatar?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "اطلاعات ارسال‌شده معتبر نیست.",
        400
      );
    }

    const updateData: {
      name?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      avatarEmoji?: string | null;
    } = {};

    /*
    |--------------------------------------------------------------------------
    | NAME
    |--------------------------------------------------------------------------
    */

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return errorResponse(
          "نام کاربر معتبر نیست.",
          400
        );
      }

      const name = body.name.trim();

      if (name.length < 2) {
        return errorResponse(
          "نام باید حداقل ۲ کاراکتر باشد.",
          400
        );
      }

      if (name.length > 80) {
        return errorResponse(
          "نام نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.",
          400
        );
      }

      updateData.name = name;
    }

    /*
    |--------------------------------------------------------------------------
    | BIO
    |--------------------------------------------------------------------------
    */

    if (body.bio !== undefined) {
      if (
        body.bio !== null &&
        typeof body.bio !== "string"
      ) {
        return errorResponse(
          "متن معرفی معتبر نیست.",
          400
        );
      }

      const bio =
        typeof body.bio === "string"
          ? body.bio.trim()
          : "";

      if (bio.length > 500) {
        return errorResponse(
          "متن معرفی نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.",
          400
        );
      }

      updateData.bio =
        bio.length > 0 ? bio : null;
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE AVATAR
    |--------------------------------------------------------------------------
    */

    if (body.removeAvatar === true) {
      updateData.avatarUrl = null;
      updateData.avatarEmoji = null;
    }

    /*
    |--------------------------------------------------------------------------
    | EMOJI
    |--------------------------------------------------------------------------
    */

    if (body.avatarEmoji !== undefined) {
      if (
        body.avatarEmoji !== null &&
        typeof body.avatarEmoji !== "string"
      ) {
        return errorResponse(
          "ایموجی پروفایل معتبر نیست.",
          400
        );
      }

      const emoji =
        typeof body.avatarEmoji === "string"
          ? body.avatarEmoji.trim()
          : "";

      if (
        emoji &&
        !ALLOWED_EMOJIS.includes(emoji)
      ) {
        return errorResponse(
          "این ایموجی در لیست آواتارهای مجاز نیست.",
          400
        );
      }

      updateData.avatarEmoji =
        emoji || null;

      if (emoji) {
        updateData.avatarUrl = null;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | AVATAR IMAGE
    |--------------------------------------------------------------------------
    */

    if (body.avatarUrl !== undefined) {
      if (
        body.avatarUrl !== null &&
        typeof body.avatarUrl !== "string"
      ) {
        return errorResponse(
          "تصویر پروفایل معتبر نیست.",
          400
        );
      }

      const avatarUrl =
        typeof body.avatarUrl === "string"
          ? body.avatarUrl.trim()
          : "";

      if (!avatarUrl) {
        updateData.avatarUrl = null;
      } else {
        if (
          !avatarUrl.startsWith("data:image/")
        ) {
          return errorResponse(
            "فرمت تصویر معتبر نیست.",
            400
          );
        }

        const commaIndex =
          avatarUrl.indexOf(",");

        if (commaIndex === -1) {
          return errorResponse(
            "ساختار تصویر معتبر نیست.",
            400
          );
        }

        const header = avatarUrl
          .slice(0, commaIndex)
          .toLowerCase();

        const imageData =
          avatarUrl.slice(
            commaIndex + 1
          );

        const allowedType =
          [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ].some((type) =>
            header.includes(type)
          );

        if (!allowedType) {
          return errorResponse(
            "فرمت تصویر باید JPG، PNG، WEBP یا GIF باشد.",
            400
          );
        }

        if (
          !header.includes(";base64")
        ) {
          return errorResponse(
            "تصویر باید به صورت Base64 ارسال شود.",
            400
          );
        }

        const estimatedSize = Math.floor(
          (imageData.length * 3) / 4
        );

        const maxSize =
          2 * 1024 * 1024;

        if (estimatedSize > maxSize) {
          return errorResponse(
            "حجم تصویر نباید بیشتر از ۲ مگابایت باشد.",
            400
          );
        }

        updateData.avatarUrl =
          avatarUrl;

        updateData.avatarEmoji =
          null;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | NOTHING TO UPDATE
    |--------------------------------------------------------------------------
    */

    if (
      Object.keys(updateData).length === 0
    ) {
      return errorResponse(
        "هیچ تغییری برای ذخیره وجود ندارد.",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | DATABASE UPDATE
    |--------------------------------------------------------------------------
    */

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,

          avatarUrl: true,
          avatarEmoji: true,
          bio: true,

          subscriptionStartedAt: true,
          subscriptionExpiresAt: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "پروفایل با موفقیت بروزرسانی شد.",
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error(
      "PROFILE PUT ERROR:",
      error
    );

    return errorResponse(
      "خطای داخلی سرور هنگام بروزرسانی پروفایل.",
      500
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/profile
|--------------------------------------------------------------------------
*/

export async function DELETE() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return errorResponse(
        "ابتدا وارد حساب خود شوید.",
        401
      );
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          avatarUrl: null,
          avatarEmoji: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,

          avatarUrl: true,
          avatarEmoji: true,
          bio: true,

          subscriptionStartedAt: true,
          subscriptionExpiresAt: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "تصویر پروفایل حذف شد.",
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error(
      "PROFILE DELETE ERROR:",
      error
    );

    return errorResponse(
      "خطای داخلی سرور هنگام حذف تصویر.",
      500
    );
  }
}
