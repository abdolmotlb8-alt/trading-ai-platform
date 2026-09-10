import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function POST(request: Request) {

  try {

    const body = await request.json();

    const {
      email,
      password
    } = body;



    if (!email || !password) {

      return NextResponse.json(
        {
          message: "ایمیل و رمز عبور الزامی است"
        },
        {
          status: 400
        }
      );

    }



    const user = await prisma.user.findUnique({

      where: {
        email
      }

    });



    if (!user) {

      return NextResponse.json(
        {
          message: "کاربری با این ایمیل پیدا نشد"
        },
        {
          status: 404
        }
      );

    }



    if (user.password !== password) {

      return NextResponse.json(
        {
          message: "رمز عبور اشتباه است"
        },
        {
          status: 401
        }
      );

    }



    return NextResponse.json({

      message: "ورود موفق بود",

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        role: user.role,

        plan: user.plan

      }

    });



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
