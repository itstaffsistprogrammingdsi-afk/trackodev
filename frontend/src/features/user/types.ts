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
  permissions?: string[];

  division_id?: string;

  division_role?:
    | "admin"
    | "member";
}

export interface UserPermissionData {
  user: Pick<User, 'id' | 'name' | 'email' | 'roles'>;
  available_permissions: string[];
  role_permissions: string[];
  direct_permissions: string[];
  effective_permissions: string[];
}
