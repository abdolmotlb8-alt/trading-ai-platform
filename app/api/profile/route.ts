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

const MAX_BIO_LENGTH = 500;
const MAX_NAME_LENGTH = 80;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

type ProfileBody = {
  name?: unknown;
  bio?: unknown;
  avatarUrl?: unknown;
  avatarEmoji?: unknown;
  removeAvatar?: unknown;
};

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function isDataImage(value: string) {
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(
    value
  );
}

function getBase64Size(value: string) {
  const base64 = value.split(",")[1] || "";

  return Math.floor(
    (base64.length * 3) / 4
  );
}

function sanitizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,

        /*
         * این فیلدها فعلاً null هستند چون
         * هنوز در schema.prisma اضافه نشده‌اند.
         */
        avatarUrl: null,
        avatarEmoji: "😎",
        bio: null,

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      subscription: {
        plan: user.plan,
        status:
          String(user.plan).toUpperCase() ===
          "FREE"
            ? "FREE"
            : "ACTIVE",
        startedAt: null,
        expiresAt: null,
        remainingDays: null,
      },

      allowedEmojis: ALLOWED_EMOJIS,
    });
  } catch (error) {
    console.error(
      "GET /api/profile error:",
      error
    );

    return jsonError(
      "خطا در دریافت اطلاعات پروفایل.",
      500
    );
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "برای ویرایش پروفایل ابتدا وارد حساب خود شوید.",
        401
      );
    }

    let body: ProfileBody;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "اطلاعات ارسال‌شده معتبر نیست."
      );
    }

    const name =
      typeof body.name === "string"
        ? sanitizeName(body.name)
        : "";

    const bio =
      typeof body.bio === "string"
        ? body.bio.trim()
        : "";

    const avatarUrl =
      typeof body.avatarUrl === "string"
        ? body.avatarUrl
        : "";

    const avatarEmoji =
      typeof body.avatarEmoji === "string"
        ? body.avatarEmoji
        : "";

    const removeAvatar =
      body.removeAvatar === true;

    if (!name) {
      return jsonError(
        "نام کاربری نمی‌تواند خالی باشد."
      );
    }

    if (name.length < 2) {
      return jsonError(
        "نام کاربری باید حداقل ۲ کاراکتر باشد."
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      return jsonError(
        `نام کاربری نمی‌تواند بیشتر از ${MAX_NAME_LENGTH} کاراکتر باشد.`
      );
    }

    if (bio.length > MAX_BIO_LENGTH) {
      return jsonError(
        `توضیحات نمی‌تواند بیشتر از ${MAX_BIO_LENGTH} کاراکتر باشد.`
      );
    }

    if (avatarEmoji) {
      if (
        !ALLOWED_EMOJIS.includes(
          avatarEmoji
        )
      ) {
        return jsonError(
          "ایموجی انتخاب‌شده معتبر نیست."
        );
      }
    }

    if (avatarUrl) {
      if (!isDataImage(avatarUrl)) {
        return jsonError(
          "فرمت تصویر پروفایل معتبر نیست."
        );
      }

      const imageSize =
        getBase64Size(avatarUrl);

      if (imageSize > MAX_AVATAR_SIZE) {
        return jsonError(
          "حجم تصویر نباید بیشتر از ۲ مگابایت باشد."
        );
      }
    }

    /*
     * فعلاً فقط فیلدهایی را تغییر می‌دهیم
     * که در schema فعلی User وجود دارند.
     *
     * avatar / bio بعد از ارتقای schema
     * به صورت دائمی در دیتابیس ذخیره خواهند شد.
     */
    const updatedUser =
      await prisma.user.update({
        where: {
          id: session.userId,
        },
        data: {
          name,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "اطلاعات پروفایل با موفقیت ذخیره شد.",

      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        plan: updatedUser.plan,

        /*
         * موقتاً تا زمانی که schema ارتقا پیدا کند.
         */
        avatarUrl: removeAvatar
          ? null
          : avatarUrl || null,

        avatarEmoji:
          avatarEmoji || "😎",

        bio: bio || null,

        createdAt:
          updatedUser.createdAt,

        updatedAt:
          updatedUser.updatedAt,
      },

      subscription: {
        plan: updatedUser.plan,
        status:
          String(
            updatedUser.plan
          ).toUpperCase() === "FREE"
            ? "FREE"
            : "ACTIVE",
        startedAt: null,
        expiresAt: null,
        remainingDays: null,
      },

      allowedEmojis: ALLOWED_EMOJIS,
    });
  } catch (error) {
    console.error(
      "PUT /api/profile error:",
      error
    );

    return jsonError(
      "ذخیره اطلاعات پروفایل انجام نشد.",
      500
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return jsonError(
        "برای انجام این کار ابتدا وارد حساب خود شوید.",
        401
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
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
      message:
        "تصویر پروفایل حذف شد.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatarUrl: null,
        avatarEmoji: "😎",
        bio: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      subscription: {
        plan: user.plan,
        status:
          String(user.plan).toUpperCase() ===
          "FREE"
            ? "FREE"
            : "ACTIVE",
        startedAt: null,
        expiresAt: null,
        remainingDays: null,
      },

      allowedEmojis: ALLOWED_EMOJIS,
    });
  } catch (error) {
    console.error(
      "DELETE /api/profile error:",
      error
    );

    return jsonError(
      "حذف تصویر پروفایل انجام نشد.",
      500
    );
  }
}
