import api from '@/lib/axios'
import { Workspace, CreateWorkspacePayload, UpdateWorkspacePayload } from '../types'

export const getWorkspaces = async (divisionId: string): Promise<Workspace[]> => {
  const res = await api.get(`/divisions/${divisionId}/workspaces`)
  return res.data.data as Workspace[]
}

export const createWorkspace = async (
  divisionId: string,
  payload: CreateWorkspacePayload
): Promise<Workspace> => {
  const res = await api.post(`/divisions/${divisionId}/workspaces`, payload)
  return res.data.data as Workspace
}

export const updateWorkspace = async (
  id: string,
  payload: UpdateWorkspacePayload
): Promise<Workspace> => {
  const res = await api.put(`/workspaces/${id}`, payload)
  return res.data.data as Workspace
}

export const deleteWorkspace = async (id: string): Promise<{ message: string }> => {
  const res = await api.delete(`/workspaces/${id}`)
  return res.data
}
