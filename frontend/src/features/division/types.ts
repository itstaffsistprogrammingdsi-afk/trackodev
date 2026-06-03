import type { User } from "../user/types";

export interface Division {
  id: string;
  name: string;
  code?: string | null;
  slug: string;
  description?: string | null;
  created_at: string;
  admin_ids: string[];
  member_ids: string[];
  users?: User[];
}

export type DivisionMember = User;

/*
|--------------------------------------------------------------------------
| PAYLOAD TYPES
|--------------------------------------------------------------------------
*/

export interface CreateDivisionPayload {
  name: string;
  code?: string;
  description?: string;

  admin_ids: string[];
  member_ids: string[];
}

export interface UpdateDivisionPayload {
  id: string;

  data: {
    name?: string;
    code?: string;
    description?: string;
  };
}

export interface AddDivisionMemberPayload {
  divisionId: string;

  data: {
    user_id: string;
    role: "admin" | "member";
  };
}

export interface RemoveDivisionMemberPayload {
  divisionId: string;
  userId: string;
}
