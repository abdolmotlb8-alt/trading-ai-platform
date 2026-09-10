import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";


export async function GET() {

  try {

    const session = await getSession();


    if (!session) {

      return NextResponse.json(
        {
          message: "کاربر وارد نشده است"
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
          message: "کاربر پیدا نشد"
        },
        {
          status: 404
        }
      );

    }



    return NextResponse.json(
      {
        user
      },
      {
        status: 200
      }
    );


  } catch (error) {


    console.log(
      "CURRENT USER ERROR:",
      error
    );


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
