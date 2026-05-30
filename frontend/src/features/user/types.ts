export interface User {
  id: string;

  name: string;

  email: string;

  avatar?: string | null;

  role?: string;

  division_id?: string;
}

