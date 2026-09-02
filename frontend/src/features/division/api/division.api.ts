import api from '@/lib/axios'
import type { Division } from '../types'

/*
|--------------------------------------------------------------------------
| DIVISION
|--------------------------------------------------------------------------
*/

export const getDivisions = async () => {
  const res = await api.get('/divisions')
  return res.data.data
}

export const getDivision = async (
  id: string
) => {
  const res = await api.get(
    `/divisions/${id}`
  )

  return res.data.data
}

export const createDivision = async (
  data: {
    name: string
    code?: string
    description?: string

    admin_ids: string[]
    member_ids: string[]
  }
) => {
  const res = await api.post(
    '/divisions',
    data
  )

  return res.data.data
}

export const updateDivision = async (
  id: string,
  data: {
    name?: string
    code?: string
    description?: string
  }
) => {
  const res = await api.put(
    `/divisions/${id}`,
    data
  )

  return res.data.data
}

export const deleteDivision = async (
  id: string
) => {
  const res = await api.delete(
    `/divisions/${id}`
  )

  return res.data
}

/*
|--------------------------------------------------------------------------
| MEMBERS
|--------------------------------------------------------------------------
*/

export const getDivisionMembers =
  async (divisionId: string) => {

    const res = await api.get(
      `/divisions/${divisionId}/members`
    )

    return res.data.data
  }

export const addDivisionMember = async (
  divisionId: string,
  data: {
    user_id: string
    role: "admin" | "member"
  }
) => {

  const res = await api.post(
    `/divisions/${divisionId}/members`,
    data
  )

  return res.data
}

export const updateDivisionMember =
  async (
    divisionId: string,
    userId: string,
    data: {
      role: 'admin' | 'member'
    }
  ) => {

    const res = await api.put(
      `/divisions/${divisionId}/members/${userId}`,
      data
    )

    return res.data
  }

export const removeDivisionMember =
  async (
    divisionId: string,
    userId: string
  ) => {

    const res = await api.delete(
      `/divisions/${divisionId}/members/${userId}`
    )

    return res.data
  }

export type MyDivisionItem = Division;

export const getMyDivisions = async (): Promise<MyDivisionItem[]> => {
  const res = await api.get("/my-divisions");
  return res.data.data ?? [];
};

export type DivisionActivityCategory =
  | "all"
  | "create"
  | "update"
  | "delete"
  | "comment";

export type DivisionActivity = {
  id: string;
  user_id?: string | null;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  activity_type: "create" | "update" | "delete" | "comment";
  description?: string | null;
  created_at: string;
  meta?: Record<string, unknown> | null;
  user?: { id: string; name: string } | null;
};

export type DivisionActivityResponse = {
  success: boolean;
  division_id: string;
  category: DivisionActivityCategory;
  total_logs: number;
  current_page: number;
  last_page: number;
  has_more: boolean;
  date_from?: string | null;
  date_to?: string | null;
  activities: DivisionActivity[];
};

export const getDivisionActivities = async (
  divisionId: string,
  category: DivisionActivityCategory = "all",
  page = 1,
  limit = 15,
  dateFrom?: string,
  dateTo?: string,
): Promise<DivisionActivityResponse> => {
  const res = await api.get(`/divisions/${divisionId}/activities`, {
    params: {
      category,
      page,
      limit,
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    },
  });

  return res.data;
};
