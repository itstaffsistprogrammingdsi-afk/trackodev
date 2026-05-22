export interface Division {
  id: string
  name: string
  code?: string | null
  slug: string
  description?: string | null
  created_at: string
}

export type RoleType =
  | 'super_admin'
  | 'admin'
  | 'user'

export interface User {
  id: string
  name: string
  email: string

  role?: RoleType
  roles?: string[]
}

export type DivisionMember = User

/*
|--------------------------------------------------------------------------
| PAYLOAD TYPES
|--------------------------------------------------------------------------
*/

export interface CreateDivisionPayload {
  name: string
  code?: string
  description?: string
}

export interface UpdateDivisionPayload {
  id: string

  data: {
    name?: string
    code?: string
    description?: string
  }
}

export interface AddDivisionMemberPayload {
  divisionId: string

  data: {
    user_id: string
  }
}

export interface RemoveDivisionMemberPayload {
  divisionId: string
  userId: string
}