export type RoleType =
  | "super_admin"
  | "admin"
  | "user";

export interface User {
  id: string;

  name: string;

  email: string;

  avatar?: string | null;

  role?: RoleType;
  roles?: string[];

  division_id?: string;

  division_role?:
    | "admin"
    | "member";
}