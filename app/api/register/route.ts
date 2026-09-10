import { NextResponse } from "next/server";
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



    const existingUser = await prisma.user.findUnique({
      where: {
        email
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



    const user = await prisma.user.create({

      data: {

        name,

        email,

        password,

        role: "USER",

        plan: "FREE"

      }

    });



    return NextResponse.json(
      {
        message: "ثبت نام موفق بود",
        user
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
