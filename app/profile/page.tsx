import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

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

type ProfileUpdateBody = {
  name?: unknown;
  bio?: unknown;
  avatarUrl?: unknown;
  avatarEmoji?: unknown;
  removeAvatar?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function getSubscriptionStatus(
  plan: string,
  startedAt: Date | null,
  expiresAt: Date | null
) {
  const now = Date.now();

  if (!expiresAt) {
    return {
      active: plan !== "FREE",
      plan,
      startedAt,
      expiresAt: null,
      remainingDays: null,
      expired: false,
      unlimited: plan !== "FREE",
    };
  }

  const remainingMilliseconds =
    expiresAt.getTime() - now;

  const remainingDays = Math.max(
    0,
    Math.ceil(
      remainingMilliseconds /
        (1000 * 60 * 60 * 24)
    )
  );

  const expired =
    remainingMilliseconds <= 0;

  return {
    active: !expired && plan !== "FREE",
    plan,
    startedAt,
    expiresAt,
    remainingDays,
    expired,
    unlimited: false,
  };
}

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  bio: string | null;
  subscriptionStartedAt: Date | null;
  subscriptionExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const subscription = getSubscriptionStatus(
    user.plan,
    user.subscriptionStartedAt,
    user.subscriptionExpiresAt
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,

    avatarUrl: user.avatarUrl,
    avatarEmoji: user.avatarEmoji,
    bio: user.bio,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,

    subscription,
  };
}

/*
|--------------------------------------------------------------------------
| GET /api/profile
|--------------------------------------------------------------------------
| دریافت اطلاعات واقعی کاربر واردشده
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "برای مشاهده پروفایل ابتدا وارد حساب خود شوید.",
        401
      );
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
      return jsonError(
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

    return jsonError(
      "خطای داخلی سرور هنگام دریافت پروفایل.",
      500
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT /api/profile
|--------------------------------------------------------------------------
| بروزرسانی اطلاعات پروفایل
|--------------------------------------------------------------------------
*/

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "برای ویرایش پروفایل ابتدا وارد حساب خود شوید.",
        401
      );
    }

    let body: ProfileUpdateBody;

    try {
      body =
        (await request.json()) as ProfileUpdateBody;
    } catch {
      return jsonError(
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
    | Name
    |--------------------------------------------------------------------------
    */

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return jsonError(
          "نام کاربر معتبر نیست.",
          400
        );
      }

      const name = body.name.trim();

      if (name.length < 2) {
        return jsonError(
          "نام باید حداقل ۲ کاراکتر باشد.",
          400
        );
      }

      if (name.length > 80) {
        return jsonError(
          "نام نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.",
          400
        );
      }

      updateData.name = name;
    }

    /*
    |--------------------------------------------------------------------------
    | Bio
    |--------------------------------------------------------------------------
    */

    if (body.bio !== undefined) {
      if (
        body.bio !== null &&
        typeof body.bio !== "string"
      ) {
        return jsonError(
          "توضیحات پروفایل معتبر نیست.",
          400
        );
      }

      const bio =
        typeof body.bio === "string"
          ? body.bio.trim()
          : "";

      if (bio.length > 500) {
        return jsonError(
          "توضیحات پروفایل نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.",
          400
        );
      }

      updateData.bio =
        bio.length > 0 ? bio : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Avatar
    |--------------------------------------------------------------------------
    */

    if (body.removeAvatar === true) {
      updateData.avatarUrl = null;
      updateData.avatarEmoji = null;
    }

    /*
    |--------------------------------------------------------------------------
    | Emoji Avatar
    |--------------------------------------------------------------------------
    */

    if (body.avatarEmoji !== undefined) {
      if (
        body.avatarEmoji !== null &&
        typeof body.avatarEmoji !== "string"
      ) {
        return jsonError(
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
        return jsonError(
          "این ایموجی در لیست آواتارهای مجاز نیست.",
          400
        );
      }

      updateData.avatarEmoji =
        emoji || null;

      /*
      * اگر کاربر ایموجی انتخاب کند،
      * عکس قبلی حذف می‌شود تا فقط یکی نمایش داده شود.
      */
      if (emoji) {
        updateData.avatarUrl = null;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Avatar Image
    |--------------------------------------------------------------------------
    |
    | در این نسخه تصویر به صورت Data URL ذخیره می‌شود.
    | برای عکس‌های معمولی پروفایل مناسب است و نیاز به سرویس
    | خارجی مثل Cloudinary ندارد.
    |
    */

    if (body.avatarUrl !== undefined) {
      if (
        body.avatarUrl !== null &&
        typeof body.avatarUrl !== "string"
      ) {
        return jsonError(
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
          !avatarUrl.startsWith(
            "data:image/"
          )
        ) {
          return jsonError(
            "فرمت تصویر ارسال‌شده معتبر نیست.",
            400
          );
        }

        const commaIndex =
          avatarUrl.indexOf(",");

        if (commaIndex === -1) {
          return jsonError(
            "ساختار تصویر معتبر نیست.",
            400
          );
        }

        const header =
          avatarUrl
            .slice(0, commaIndex)
            .toLowerCase();

        const imageData =
          avatarUrl.slice(
            commaIndex + 1
          );

        const matchedType =
          ALLOWED_AVATAR_TYPES.find(
            (type) =>
              header.includes(type)
          );

        if (!matchedType) {
          return jsonError(
            "فرمت تصویر باید JPG، PNG، WEBP یا GIF باشد.",
            400
          );
        }

        if (
          !header.includes(
            ";base64"
          )
        ) {
          return jsonError(
            "تصویر باید به صورت Base64 ارسال شود.",
            400
          );
        }

        /*
        * بررسی تقریبی حجم فایل واقعی
        * از روی Base64
        */
        const estimatedSize =
          Math.floor(
            (imageData.length * 3) /
              4
          );

        if (
          estimatedSize >
          MAX_AVATAR_SIZE
        ) {
          return jsonError(
            "حجم عکس پروفایل نباید بیشتر از ۲ مگابایت باشد.",
            400
          );
        }

        updateData.avatarUrl =
          avatarUrl;

        /*
        * اگر عکس انتخاب شود،
        * ایموجی قبلی حذف می‌شود.
        */
        updateData.avatarEmoji =
          null;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Empty Update
    |--------------------------------------------------------------------------
    */

    if (
      Object.keys(updateData).length ===
      0
    ) {
      return jsonError(
        "هیچ تغییری برای ذخیره ارسال نشده است.",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Update Database
    |--------------------------------------------------------------------------
    */

    const updatedUser =
      await prisma.user.update({
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

    return NextResponse.json({
      success: true,
      message:
        "پروفایل با موفقیت بروزرسانی شد.",
      user: serializeUser(
        updatedUser
      ),
    });
  } catch (error) {
    console.error(
      "PROFILE PUT ERROR:",
      error
    );

    return jsonError(
      "خطای داخلی سرور هنگام بروزرسانی پروفایل.",
      500
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/profile/avatar
|--------------------------------------------------------------------------
| حذف تصویر و ایموجی پروفایل
|--------------------------------------------------------------------------
*/

export async function DELETE() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "ابتدا وارد حساب خود شوید.",
        401
      );
    }

    const user =
      await prisma.user.update({
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
      message:
        "تصویر پروفایل حذف شد.",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(
      "PROFILE DELETE AVATAR ERROR:",
      error
    );

    return jsonError(
      "خطای داخلی سرور هنگام حذف تصویر.",
      500
    );
  }
}
