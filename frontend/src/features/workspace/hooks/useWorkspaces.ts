import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import * as api from '../api/workspace.api'
import { Workspace, CreateWorkspacePayload, UpdateWorkspacePayload } from '../types'

type ApiErrorResponse = {
  message?: string
  errors?: Record<string, string[]>
}

export type WorkspaceMutationError = AxiosError<ApiErrorResponse>

export const useWorkspaces = (divisionId: string) => {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces', divisionId],
    queryFn: () => api.getWorkspaces(divisionId),
    enabled: !!divisionId,
  })
}

export const useCreateWorkspace = (divisionId: string) => {
  const qc = useQueryClient()

  return useMutation<Workspace, WorkspaceMutationError, CreateWorkspacePayload>({
    mutationFn: (payload) => api.createWorkspace(divisionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', divisionId] })
    },
  })
}

export const useUpdateWorkspace = (divisionId: string) => {
  const qc = useQueryClient()

  return useMutation<
    Workspace,
    WorkspaceMutationError,
    { id: string; payload: UpdateWorkspacePayload }
  >({
    mutationFn: ({ id, payload }) => api.updateWorkspace(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', divisionId] })
    },
  })
}

export const useDeleteWorkspace = (divisionId: string) => {
  const qc = useQueryClient()

  return useMutation<{ message: string }, WorkspaceMutationError, string>({
    mutationFn: (id) => api.deleteWorkspace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', divisionId] })
    },
  })
}
