import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

type LoginData = {
  email?: unknown;
  password?: unknown;
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

async function readRequestBody(
  request: Request
): Promise<LoginData> {
  const contentType = (
    request.headers.get("content-type") || ""
  ).toLowerCase();

  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  if (contentType.includes("application/json")) {
    try {
      const parsed: unknown = JSON.parse(bodyText);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error("Invalid JSON body");
      }

      return parsed as LoginData;
    } catch {
      throw new Error("INVALID_JSON");
    }
  }

  if (
    contentType.includes(
      "application/x-www-form-urlencoded"
    ) ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = new URLSearchParams(bodyText);

    return {
      email: formData.get("email") || undefined,
      password: formData.get("password") || undefined,
    };
  }

  throw new Error("UNSUPPORTED_CONTENT_TYPE");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    let data: LoginData;

    try {
      data = await readRequestBody(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "INVALID_JSON"
      ) {
        return jsonError(
          "فرمت اطلاعات ارسال‌شده نامعتبر است",
          400
        );
      }

      if (
        error instanceof Error &&
        error.message === "UNSUPPORTED_CONTENT_TYPE"
      ) {
        return jsonError(
          "نوع درخواست پشتیبانی نمی‌شود",
          415
        );
      }

      return jsonError(
        "اطلاعات درخواست قابل پردازش نیست",
        400
      );
    }

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const password =
      typeof data.password === "string"
        ? data.password
        : "";

    if (!email || !password) {
      return jsonError(
        "ایمیل و رمز عبور الزامی هستند",
        400
      );
    }

    if (!isValidEmail(email)) {
      return jsonError(
        "فرمت ایمیل صحیح نیست",
        400
      );
    }

    if (password.length < 1) {
      return jsonError(
        "رمز عبور را وارد کنید",
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        plan: true,
      },
    });

    if (!user) {
      return jsonError(
        "ایمیل یا رمز عبور اشتباه است",
        401
      );
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordIsValid) {
      return jsonError(
        "ایمیل یا رمز عبور اشتباه است",
        401
      );
    }

    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "ورود با موفقیت انجام شد",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN_ERROR:", error);

    return jsonError(
      "خطای داخلی سرور هنگام ورود",
      500
    );
  }
}
