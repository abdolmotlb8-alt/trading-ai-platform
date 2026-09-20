import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "نام، ایمیل و رمز عبور الزامی هستند" },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        { message: "نام باید حداقل ۲ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "فرمت ایمیل صحیح نیست" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "رمز عبور باید حداقل ۸ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "این ایمیل قبلاً ثبت شده است" },
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

    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "ثبت‌نام با موفقیت انجام شد",
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
    console.error("REGISTER_ERROR:", error);

    return NextResponse.json(
      { message: "خطای داخلی سرور. دوباره تلاش کنید" },
      { status: 500 }
    );
  }
}
