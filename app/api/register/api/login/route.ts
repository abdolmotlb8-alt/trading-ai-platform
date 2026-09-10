import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {

  try {

    const body = await request.json();

    const {
      email,
      password,
    } = body;


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


    const user = await prisma.user.findUnique({
      where:{
        email: email.trim().toLowerCase()
      }
    });


    if(!user){
      return NextResponse.json(
        {
          message:"ایمیل یا رمز عبور اشتباه است"
        },
        {
          status:401
        }
      );
    }


    const checkPassword = await bcrypt.compare(
      password,
      user.password
    );


    if(!checkPassword){
      return NextResponse.json(
        {
          message:"ایمیل یا رمز عبور اشتباه است"
        },
        {
          status:401
        }
      );
    }


    await createSession(user.id);


    return NextResponse.json({
      message:"ورود موفق بود",
      user:{
        id:user.id,
        name:user.name,
        email:user.email,
        role:user.role,
        plan:user.plan
      }
    });


  } catch(error){

    console.log(error);

    return NextResponse.json(
      {
        message:"خطای سرور"
      },
      {
        status:500
      }
    );
  }

}
