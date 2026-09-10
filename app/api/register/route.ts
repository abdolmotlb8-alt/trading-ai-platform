import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      password
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          message: "تمام فیلدها الزامی هستند"
        },
        {
          status: 400
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          message: "رمز عبور باید حداقل ۸ کاراکتر باشد"
        },
        {
          status: 400
        }
      );
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail
        }
      });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "این ایمیل قبلاً ثبت شده است"
        },
        {
          status: 400
        }
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "USER",
        plan: "FREE"
      }
    });

    return NextResponse.json(
      {
        message: "ثبت نام موفق بود",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan
        }
      },
      {
        status: 201
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "خطای سرور"
      },
      {
        status: 500
      }
    );
  }
}
