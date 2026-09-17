import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

const ALLOWED_ROLES = ["USER", "ADMIN"];

const ALLOWED_PLANS = [
  "FREE",
  "VIP",
  "PREMIUM",
  "LIFETIME",
];

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "ورود لازم است" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { message: "دسترسی غیرمجاز" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const { role, plan } = body;

    if (
      role !== undefined &&
      !ALLOWED_ROLES.includes(role)
    ) {
      return NextResponse.json(
        { message: "نقش نامعتبر است" },
        { status: 400 }
      );
    }

    if (
      plan !== undefined &&
      !ALLOWED_PLANS.includes(plan)
    ) {
      return NextResponse.json(
        { message: "پلن نامعتبر است" },
        { status: 400 }
      );
    }

    if (
      role === undefined &&
      plan === undefined
    ) {
      return NextResponse.json(
        { message: "هیچ تغییری ارسال نشده است" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: "کاربر پیدا نشد" },
        { status: 404 }
      );
    }

    if (
      targetUser.id === currentUser.id &&
      role !== undefined &&
      role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          message:
            "نمی‌توانید سطح دسترسی حساب مدیر فعلی را از ADMIN تغییر دهید.",
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(plan !== undefined ? { plan } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
      },
    });

    return NextResponse.json(
      {
        message: "اطلاعات کاربر با موفقیت تغییر کرد",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ADMIN USER UPDATE ERROR:", error);

    return NextResponse.json(
      { message: "خطای داخلی سرور" },
      { status: 500 }
    );
  }
}
