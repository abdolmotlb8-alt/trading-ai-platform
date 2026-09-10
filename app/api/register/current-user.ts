import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function getCurrentUser() {
  const userId = await getSession();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true
    }
  });

  return user;
}
