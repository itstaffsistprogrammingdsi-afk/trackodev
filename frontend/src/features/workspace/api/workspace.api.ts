import api from '@/lib/axios'
import { Workspace } from '../types'

export const getWorkspaces = async (divisionId: string) => {
  const res = await api.get(`/divisions/${divisionId}/workspaces`)
  console.log("WORKSPACE RESPONSE", res.data)
  return res.data.data as Workspace[]
}

export const createWorkspace = async (
  divisionId: string,
  payload: { name: string; description?: string }
) => {
  const res = await api.post(`/divisions/${divisionId}/workspaces`, payload)
  return res.data.data as Workspace
}

export const deleteWorkspace = async (id: string) => {
  const res = await api.delete(`/workspaces/${id}`)
  return res.data
}