import api from '@/lib/axios'
import {
  Workspace,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  WorkspaceMember,
  WorkspaceAccessLevel,
  MentionableUser,
} from '../types'

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

// =====================================================
// MEMBERS
// =====================================================

export const getWorkspaceMembers = async (
  workspaceId: string
): Promise<WorkspaceMember[]> => {
  const res = await api.get(`/workspaces/${workspaceId}/members`)
  return res.data.data as WorkspaceMember[]
}

export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  access: WorkspaceAccessLevel
): Promise<void> => {
  await api.post(`/workspaces/${workspaceId}/members`, {
    user_id: userId,
    access,
  })
}

export const updateWorkspaceMemberAccess = async (
  workspaceId: string,
  userId: string,
  access: WorkspaceAccessLevel
): Promise<void> => {
  await api.put(`/workspaces/${workspaceId}/members/${userId}`, { access })
}

export const removeWorkspaceMember = async (
  workspaceId: string,
  userId: string
): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
}

export const searchMentionableUsers = async (
  query: string,
  workspaceId?: string
): Promise<MentionableUser[]> => {
  const res = await api.get('/users/mentionable', {
    params: {
      search: query,
      // Tanpa flag ini endpoint membatasi kandidat ke divisi si pencari.
      // Untuk share lintas divisi, kandidat harus siapa pun di sistem.
      collaborator: 1,
      workspace_id: workspaceId,
    },
  })
  return res.data.data as MentionableUser[]
}
