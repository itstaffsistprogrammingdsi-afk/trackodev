import api from '@/lib/axios'

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

  export interface MyDivisionItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

export const getMyDivisions = async (): Promise<MyDivisionItem[]> => {
  const res = await api.get("/my-divisions");
  return res.data.data ?? [];
};
