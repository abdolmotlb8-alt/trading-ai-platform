import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type RegisterData = {
  name?: string;
  email?: string;
  password?: string;
};

async function readRequestBody(
  request: Request
): Promise<RegisterData> {
  const bodyText = await request.text();

  if (!bodyText.trim()) {
    return {};
  }

  const contentType = request.headers.get("content-type") || "";

  // پردازش JSON
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(bodyText) as RegisterData;
    } catch {
      // در صورت خراب بودن JSON، فرم معمولی بررسی می‌شود.
    }
  }

  // پردازش فرم معمولی
  const formData = new URLSearchParams(bodyText);

  return {
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const data = await readRequestBody(request);

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const password =
      typeof data.password === "string"
        ? data.password
        : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "نام، ایمیل و رمز عبور الزامی هستند",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "رمز عبور باید حداقل ۸ کاراکتر باشد",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "این ایمیل قبلاً ثبت‌نام کرده است",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "USER",
        plan: "FREE",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "ثبت‌نام با موفقیت انجام شد. اکنون وارد حساب خود شوید.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "خطای داخلی سرور هنگام ثبت‌نام",
      },
      { status: 500 }
    );
  }
}
