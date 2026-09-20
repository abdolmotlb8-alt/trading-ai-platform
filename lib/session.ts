import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
  if (!userId) {
    throw new Error("شناسه کاربر الزامی است");
  }

  const token = randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION * 1000
  );

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return true;
}

export async function getSession() {
  try {
    const cookieStore = await cookies();

    const sessionToken = cookieStore.get(
      SESSION_COOKIE_NAME
    )?.value;

    if (!sessionToken) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: {
        token: sessionToken,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.deleteMany({
        where: {
          id: session.id,
        },
      });

      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
    };
  } catch (error) {
    console.error("GET SESSION ERROR:", error);

    return null;
  }
}

export async function deleteSession() {
  try {
    const cookieStore = await cookies();

    const sessionToken = cookieStore.get(
      SESSION_COOKIE_NAME
    )?.value;

    if (sessionToken) {
      await prisma.session.deleteMany({
        where: {
          token: sessionToken,
        },
      });
    }

    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return true;
  } catch (error) {
    console.error("DELETE SESSION ERROR:", error);

    return false;
  }
}
