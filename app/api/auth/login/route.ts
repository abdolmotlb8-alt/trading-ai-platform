import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

const ADMIN_EMAIL = "abdolmotlb8@gmail.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "ایمیل و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "ایمیل یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { message: "ایمیل یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    let role = user.role;

    if (email === ADMIN_EMAIL.toLowerCase()) {
      role = "ADMIN";

      if (user.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
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
          role,
          plan: user.plan,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN_ERROR:", error);

    return NextResponse.json(
      { message: "خطای داخلی سرور. دوباره تلاش کنید" },
      { status: 500 }
    );
  }
}
