import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = [
  "😎",
  "🤖",
  "🧠",
  "🚀",
  "💎",
  "🔥",
  "🦾",
  "🐺",
  "🦊",
  "👑",
  "⚡",
  "🎯",
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function isValidAvatarDataUrl(value: string) {
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(
    value
  );
}

function estimateBase64Size(value: string) {
  const commaIndex = value.indexOf(",");

  if (commaIndex === -1) {
    return 0;
  }

  const base64 = value.slice(commaIndex + 1);

  return Math.floor((base64.length * 3) / 4);
}

function calculateRemainingDays(expiresAt: Date | null) {
  if (!expiresAt) {
    return null;
  }

  const difference = expiresAt.getTime() - Date.now();

  return Math.max(
    0,
    Math.ceil(difference / (1000 * 60 * 60 * 24))
  );
}

function getSubscriptionStatus(
  plan: string,
  expiresAt: Date | null
) {
  if (!expiresAt) {
    return plan === "FREE" ? "FREE" : "ACTIVE";
  }

  return expiresAt.getTime() > Date.now()
    ? "ACTIVE"
    : "EXPIRED";
}

/**
 * GET /api/profile
 *
 * دریافت اطلاعات واقعی کاربر لاگین‌شده
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError("برای مشاهده پروفایل ابتدا وارد حساب شوید.", 401);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
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
      return jsonError("کاربر پیدا نشد.", 404);
    }

    const plan = user.plan || "FREE";

    const remainingDays = calculateRemainingDays(
      user.subscriptionExpiresAt
    );

    const status = getSubscriptionStatus(
      plan,
      user.subscriptionExpiresAt
    );

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,

        avatarUrl: user.avatarUrl,
        avatarEmoji: user.avatarEmoji,
        bio: user.bio,

        subscriptionStartedAt:
          user.subscriptionStartedAt,

        subscriptionExpiresAt:
          user.subscriptionExpiresAt,

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      subscription: {
        plan,
        status,

        startedAt:
          user.subscriptionStartedAt,

        expiresAt:
          user.subscriptionExpiresAt,

        remainingDays,
      },

      allowedEmojis: ALLOWED_EMOJIS,
    });
  } catch (error) {
    console.error("GET /api/profile error:", error);

    return jsonError(
      "خطایی هنگام دریافت اطلاعات پروفایل رخ داد.",
      500
    );
  }
}

/**
 * PUT /api/profile
 *
 * ویرایش واقعی پروفایل
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "برای ویرایش پروفایل ابتدا وارد حساب شوید.",
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
      return jsonError("اطلاعات ارسال‌شده معتبر نیست.");
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : undefined;

    const bio =
      typeof body.bio === "string"
        ? body.bio.trim()
        : undefined;

    const avatarUrl =
      typeof body.avatarUrl === "string"
        ? body.avatarUrl.trim()
        : null;

    const avatarEmoji =
      typeof body.avatarEmoji === "string"
        ? body.avatarEmoji.trim()
        : null;

    const removeAvatar = body.removeAvatar === true;

    if (name !== undefined) {
      if (name.length < 2) {
        return jsonError(
          "نام کاربری باید حداقل ۲ کاراکتر باشد."
        );
      }

      if (name.length > 80) {
        return jsonError(
          "نام کاربری نمی‌تواند بیشتر از ۸۰ کاراکتر باشد."
        );
      }
    }

    if (bio !== undefined && bio.length > 500) {
      return jsonError(
        "توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد."
      );
    }

    if (
      avatarEmoji &&
      !ALLOWED_EMOJIS.includes(avatarEmoji)
    ) {
      return jsonError(
        "ایموجی انتخاب‌شده معتبر نیست."
      );
    }

    if (avatarUrl) {
      if (!isValidAvatarDataUrl(avatarUrl)) {
        return jsonError(
          "فرمت تصویر معتبر نیست. فقط JPG، PNG، WEBP و GIF مجاز است."
        );
      }

      const imageSize = estimateBase64Size(avatarUrl);

      if (imageSize > MAX_IMAGE_SIZE) {
        return jsonError(
          "حجم تصویر نباید بیشتر از ۲ مگابایت باشد."
        );
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: session.userId,
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

    if (!currentUser) {
      return jsonError("کاربر پیدا نشد.", 404);
    }

    const updateData: {
      name?: string;
      bio?: string;
      avatarUrl?: string | null;
      avatarEmoji?: string | null;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (bio !== undefined) {
      updateData.bio = bio;
    }

    if (removeAvatar) {
      updateData.avatarUrl = null;
      updateData.avatarEmoji = null;
    } else if (avatarUrl) {
      updateData.avatarUrl = avatarUrl;
      updateData.avatarEmoji = null;
    } else if (avatarEmoji) {
      updateData.avatarEmoji = avatarEmoji;
      updateData.avatarUrl = null;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.userId,
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

    const plan = updatedUser.plan || "FREE";

    const remainingDays = calculateRemainingDays(
      updatedUser.subscriptionExpiresAt
    );

    const status = getSubscriptionStatus(
      plan,
      updatedUser.subscriptionExpiresAt
    );

    return NextResponse.json({
      success: true,

      message: "اطلاعات پروفایل با موفقیت ذخیره شد.",

      user: updatedUser,

      subscription: {
        plan,
        status,

        startedAt:
          updatedUser.subscriptionStartedAt,

        expiresAt:
          updatedUser.subscriptionExpiresAt,

        remainingDays,
      },

      allowedEmojis: ALLOWED_EMOJIS,
    });
  } catch (error) {
    console.error("PUT /api/profile error:", error);

    return jsonError(
      "ذخیره اطلاعات پروفایل انجام نشد.",
      500
    );
  }
}

/**
 * DELETE /api/profile
 *
 * حذف عکس/ایموجی پروفایل
 */
export async function DELETE() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "برای انجام این کار ابتدا وارد حساب شوید.",
        401
      );
    }

    const user = await prisma.user.update({
      where: {
        id: session.userId,
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
      message: "تصویر پروفایل حذف شد.",
      user,
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);

    return jsonError(
      "حذف تصویر پروفایل انجام نشد.",
      500
    );
  }
}
