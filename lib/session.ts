export async function createSession(userId: string) {
  return {
    userId,
    createdAt: new Date(),
  };
}

export async function getSession() {
  return null;
}

export async function deleteSession() {
  return true;
}
