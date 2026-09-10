import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";


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



    const normalizedEmail =
      email.trim().toLowerCase();



    const user =
      await prisma.user.findUnique({

        where: {
          email: normalizedEmail
        }

      });



    if (!user) {

      return NextResponse.json(
        {
          message: "ایمیل یا رمز عبور اشتباه است"
        },
        {
          status: 401
        }
      );

    }



    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );



    if (!validPassword) {

      return NextResponse.json(
        {
          message: "ایمیل یا رمز عبور اشتباه است"
        },
        {
          status: 401
        }
      );

    }



    await createSession(user.id);



    return NextResponse.json(
      {
        message: "ورود موفق بود",

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan
        }
      },
      {
        status: 200
      }
    );



  } catch (error) {


    console.log(
      "LOGIN ERROR:",
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
