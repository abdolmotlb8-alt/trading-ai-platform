import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

const ADMIN_EMAIL = "ایمیل-خودت-را-اینجا-بگذار";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "ایمیل و رمز عبور الزامی است",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        {
          status: 401,
        }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          message: "ایمیل یا رمز عبور اشتباه است",
        },
        {
          status: 401,
        }
      );
    }

    // تبدیل حساب مالک سایت به ADMIN
    let currentRole = user.role;

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      if (user.role !== "ADMIN") {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            role: "ADMIN",
          },
        });
      }

      currentRole = "ADMIN";
    }

    await createSession(user.id);

    return NextResponse.json(
      {
        message: "ورود موفق بود",

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
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        message: "خطای داخلی سرور",
      },
      {
        status: 500,
      }
    );
  }
}
