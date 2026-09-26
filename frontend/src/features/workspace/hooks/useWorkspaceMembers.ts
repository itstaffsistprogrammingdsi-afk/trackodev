import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

import * as api from '../api/workspace.api'
import { WorkspaceAccessLevel, WorkspaceMember } from '../types'

type ApiErrorResponse = {
  message?: string
  errors?: Record<string, string[]>
}

export type WorkspaceMemberMutationError = AxiosError<ApiErrorResponse>

const membersKey = (workspaceId: string) => ['workspace-members', workspaceId]

export const useWorkspaceMembers = (workspaceId: string, enabled = true) => {
  return useQuery<WorkspaceMember[]>({
    queryKey: membersKey(workspaceId),
    queryFn: () => api.getWorkspaceMembers(workspaceId),
    enabled: enabled && !!workspaceId,
    staleTime: 10_000,
  })
}

export const useAddWorkspaceMember = (workspaceId: string) => {
  const qc = useQueryClient()

  return useMutation<
    void,
    WorkspaceMemberMutationError,
    { userId: string; access: WorkspaceAccessLevel }
  >({
    mutationFn: ({ userId, access }) =>
      api.addWorkspaceMember(workspaceId, userId, access),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export const useUpdateWorkspaceMemberAccess = (workspaceId: string) => {
  const qc = useQueryClient()

  return useMutation<
    void,
    WorkspaceMemberMutationError,
    { userId: string; access: WorkspaceAccessLevel }
  >({
    mutationFn: ({ userId, access }) =>
      api.updateWorkspaceMemberAccess(workspaceId, userId, access),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export const useRemoveWorkspaceMember = (workspaceId: string) => {
  const qc = useQueryClient()

  return useMutation<void, WorkspaceMemberMutationError, string>({
    mutationFn: (userId) => api.removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
