import api from '@/lib/axios'

export const getDivisions = async () => {
  const res = await api.get('/divisions')
  return res.data.data
}

export const createDivision = async (data: {
  name: string
  code?: string
  description?: string
}) => {
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

// export const getDivisionMembers = async (
//   divisionId: string
// ) => {
//   const res = await api.get(
//     `/divisions/${divisionId}/members`
//   )

//   return res.data.data
// }

export const deleteDivision = async (
  id: string
) => {
  const res = await api.delete(
    `/divisions/${id}`
  )

  return res.data
}