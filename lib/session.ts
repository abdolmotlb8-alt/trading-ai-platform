import { cookies } from "next/headers";


const SESSION_NAME = "trading_session";


export async function createSession(userId: string) {

  const cookieStore = await cookies();


  cookieStore.set(
    SESSION_NAME,
    userId,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    }
  );


  return {
    userId
  };

}



export async function getSession() {

  const cookieStore = await cookies();


  const session =
    cookieStore.get(SESSION_NAME);


  if (!session) {

    return null;

  }


  return {

    userId: session.value

  };

}



export async function deleteSession() {

  const cookieStore = await cookies();


  cookieStore.delete(
    SESSION_NAME
  );


  return true;

}
