import { cookies } from "next/headers";

export async function createSession(userId: string) {

  const token = userId;

  const cookieStore = await cookies();

  cookieStore.set(
    "session",
    token,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    }
  );

  return token;
}


export async function getSession() {

  const cookieStore = await cookies();

  const session =
    cookieStore.get("session");

  if (!session) {
    return null;
  }

  return {
    userId: session.value,
  };
}


export async function deleteSession() {

  const cookieStore = await cookies();

  cookieStore.delete("session");

  return true;
}
