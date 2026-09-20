import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

type LoginData = {
  email?: string;
  password?: string;
};

async function readRequestBody(request: Request): Promise<LoginData> {
  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  const contentType = request.headers.get("content-type") || "";

  // پردازش JSON
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(bodyText) as LoginData;
    } catch {
      // اگر JSON خراب بود، پایین‌تر به‌صورت فرم بررسی می‌شود.
    }
  }

  // پردازش فرم معمولی:
  // email=test@example.com&password=12345678
  const formData = new URLSearchParams(bodyText);

  return {
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const data = await readRequestBody(request);

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const password =
      typeof data.password === "string"
        ? data.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "ایمیل و رمز عبور الزامی هستند",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        { status: 401 }
      );
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        {
          success: false,
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        { status: 401 }
      );
    }

    // ادمین اصلی پروژه
    const finalRole =
      email === "abdolmotlb8@gmail.com"
        ? "ADMIN"
        : user.role;

    // در صورت نیاز، نقش ادمین را در دیتابیس نیز ذخیره می‌کنیم.
    if (finalRole !== user.role) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          role: finalRole,
        },
      });
    }

    // ایجاد سشن و کوکی ورود
    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "ورود با موفقیت انجام شد",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: finalRole,
          plan: user.plan,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "خطای داخلی سرور هنگام ورود",
      },
      { status: 500 }
    );
  }
}
