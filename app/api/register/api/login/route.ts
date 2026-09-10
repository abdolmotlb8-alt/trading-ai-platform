import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function createSession(userId: string) {
  const session = await prisma.session.create({
    data: {
      userId,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(
    "session",
    session.id,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return session;
}


export async function getSession() {
  const cookieStore = await cookies();

  const sessionId =
    cookieStore.get("session")?.value;

  if (!sessionId) {
    return null;
  }

  const session =
    await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

  return session;
}


export async function deleteSession() {
  const cookieStore = await cookies();

  const sessionId =
    cookieStore.get("session")?.value;

  if (sessionId) {
    await prisma.session.delete({
      where: {
        id: sessionId,
      },
    }).catch(() => {});
  }

  cookieStore.delete("session");

  return true;
}
