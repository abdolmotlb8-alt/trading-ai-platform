export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};


export async function getCurrentUser(): Promise<CurrentUser | null> {

  return {
    id: "1",
    name: "Admin",
    email: "admin@example.com",
    role: "ADMIN",
  };

}
