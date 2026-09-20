import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

const ADMIN_EMAIL = "abdolmotlb8@gmail.com";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("اطلاعات ارسال‌شده معتبر نیست", 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      !("password" in body)
    ) {
      return errorResponse("ایمیل و رمز عبور الزامی است", 400);
    }

    const { email, password } = body as {
      email: unknown;
      password: unknown;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return errorResponse("فرمت اطلاعات صحیح نیست", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!normalizedEmail || !cleanPassword) {
      return errorResponse(
        "ایمیل و رمز عبور الزامی است",
        400
      );
    }

    if (cleanPassword.length < 6) {
      return errorResponse(
        "رمز عبور باید حداقل ۶ کاراکتر باشد",
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
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
      return errorResponse(
        "ایمیل یا رمز عبور اشتباه است",
        401
      );
    }

    if (!user.password) {
      console.error("LOGIN ERROR: Password hash is missing");

      return errorResponse(
        "اطلاعات امنیتی حساب ناقص است",
        500
      );
    }

    const isPasswordValid = await bcrypt.compare(
      cleanPassword,
      user.password
    );

    if (!isPasswordValid) {
      return errorResponse(
        "ایمیل یا رمز عبور اشتباه است",
        401
      );
    }

    let currentRole = user.role;

    if (
      normalizedEmail === ADMIN_EMAIL.toLowerCase() &&
      user.role !== "ADMIN"
    ) {
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          role: "ADMIN",
        },
        select: {
          role: true,
        },
      });

      currentRole = updatedUser.role;
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
          role: currentRole,
          plan: user.plan,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("LOGIN SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "خطای داخلی سرور. اتصال دیتابیس و Session را بررسی کنید.",
      },
      {
        status: 500,
      }
    );
  }
}
