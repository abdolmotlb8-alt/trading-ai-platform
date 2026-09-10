export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  plan: "FREE" | "VIP" | "PREMIUM";
};


export async function getCurrentUser(): Promise<CurrentUser | null> {

  return {
    id: "1",
    name: "Admin",
    email: "admin@example.com",
    role: "ADMIN",
    plan: "PREMIUM",
  };

}
