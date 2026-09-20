import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/support/[id]
 *
 * دریافت یک تیکت و تمام پیام‌های آن
 */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error: "برای مشاهده تیکت ابتدا وارد حساب شوید.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "شناسه تیکت مشخص نیست.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          error: "تیکت پیدا نشد یا دسترسی به آن ندارید.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("GET /api/support/[id] error:", error);

    return NextResponse.json(
      {
        error: "خطا در دریافت تیکت.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/[id]
 *
 * ارسال پیام جدید توسط کاربر داخل تیکت
 */
export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error: "برای ارسال پیام ابتدا وارد حساب شوید.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "شناسه تیکت مشخص نیست.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          error: "متن پیام را وارد کنید.",
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        {
          error: "متن پیام نباید بیشتر از ۵۰۰۰ کاراکتر باشد.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          error: "تیکت پیدا نشد یا دسترسی به آن ندارید.",
        },
        { status: 404 }
      );
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        {
          error:
            "این تیکت بسته شده است. برای ادامه گفتگو یک درخواست جدید ایجاد کنید.",
        },
        { status: 400 }
      );
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session.userId,
        senderType: "USER",
        message,
      },
    });

    const updatedTicket = await prisma.supportTicket.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "OPEN",
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("POST /api/support/[id] error:", error);

    return NextResponse.json(
      {
        error: "خطا در ارسال پیام.",
      },
      { status: 500 }
    );
  }
}
