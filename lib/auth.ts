export type UserRole =
  | "USER"
  | "VIP"
  | "ADMIN";


export function hasAccess(
  role: UserRole,
  requiredRole: UserRole
) {

  if (role === "ADMIN") {
    return true;
  }


  if (
    role === "VIP" &&
    requiredRole === "VIP"
  ) {
    return true;
  }


  if (
    role === "USER" &&
    requiredRole === "USER"
  ) {
    return true;
  }


  return false;

}
