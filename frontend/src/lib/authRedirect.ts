import type { User } from "./auth.service";

const PRIVILEGED_ROLES = ["super_admin", "admin", "manager", "hrd"];

export function roleDestination(user: Pick<User, "roles"> | null): string {
  const roles = user?.roles ?? [];
  const isPrivileged = roles.some((role) => PRIVILEGED_ROLES.includes(role));
  return isPrivileged ? "/dashboard" : "/my-work";
}

export function safeInternalRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value === "/signin" || value === "/login") return null;
  return value;
}
