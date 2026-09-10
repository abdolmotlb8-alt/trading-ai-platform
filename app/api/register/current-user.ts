import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";


export async function GET() {

  try {

    const session = await getSession();


    if (!session) {
      return NextResponse.json(
        {
          user: null
        },
        {
          status: 401
        }
      );
    }


    const user = await prisma.user.findUnique({
      where: {
        id: session.userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true
      }
    });


    if (!user) {
      return NextResponse.json(
        {
          user: null
        },
        {
          status: 404
        }
      );
    }


    return NextResponse.json({
      user
    });


  } catch (error) {

    return NextResponse.json(
      {
        message: "Server error",
        error: String(error)
      },
      {
        status: 500
      }
    );

  }

}
