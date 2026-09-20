import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "abdolmotlb8@gmail.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "ایمیل و رمز عبور الزامی است",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "فرمت ایمیل صحیح نیست",
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

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        { status: 401 }
      );
    }

    let currentRole = user.role;

    if (
      email === ADMIN_EMAIL.toLowerCase() &&
      user.role !== "ADMIN"
    ) {
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          role: "ADMIN",
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
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : "خطای داخلی سرور هنگام ورود",
      },
      { status: 500 }
    );
  }
}
