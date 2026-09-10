import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "session";

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return {
    token,
    userId,
  };
}


export async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE);

  if (!token) {
    return null;
  }

  return {
    token: token.value,
  };
}


export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);

  return true;
}
