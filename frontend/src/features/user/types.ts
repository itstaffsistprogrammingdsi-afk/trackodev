export interface User {
  id: string;

  name: string;

  email: string;

  avatar?: string | null;

  role?: string;
  roles?: string[];

  division_id?: string;

  division_role?: "admin" | "member";
}

