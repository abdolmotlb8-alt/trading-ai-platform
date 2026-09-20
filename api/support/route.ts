import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/support
 *
 * دریافت درخواست‌های پشتیبانی کاربر واردشده
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error: "برای مشاهده درخواست‌های پشتیبانی ابتدا وارد حساب شوید.",
        },
        { status: 401 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      tickets,
    });
  } catch (error) {
    console.error("GET /api/support error:", error);

    return NextResponse.json(
      {
        error: "خطا در دریافت درخواست‌های پشتیبانی.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support
 *
 * ایجاد درخواست جدید پشتیبانی
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error: "برای ایجاد درخواست پشتیبانی ابتدا وارد حساب شوید.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!subject) {
      return NextResponse.json(
        {
          error: "موضوع درخواست را وارد کنید.",
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          error: "متن درخواست را وارد کنید.",
        },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        {
          error: "موضوع درخواست نباید بیشتر از ۲۰۰ کاراکتر باشد.",
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        {
          error: "متن درخواست نباید بیشتر از ۵۰۰۰ کاراکتر باشد.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.userId,
        subject,
        status: "OPEN",
        messages: {
          create: {
            senderId: session.userId,
            senderType: "USER",
            message,
          },
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        ticket,
        message: "درخواست پشتیبانی با موفقیت ایجاد شد.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/support error:", error);

    return NextResponse.json(
      {
        error: "خطا در ایجاد درخواست پشتیبانی.",
      },
      { status: 500 }
    );
  }
}
