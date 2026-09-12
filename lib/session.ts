import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION = 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
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

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return true;
}

export async function getSession() {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      token: sessionCookie.value,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    cookieStore.delete("session");

    return null;
  }

  return {
    userId: session.userId,
  };
}

export async function deleteSession() {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session");

  if (sessionCookie?.value) {
    await prisma.session.deleteMany({
      where: {
        token: sessionCookie.value,
      },
    });
  }

  cookieStore.delete("session");

  return true;
}
