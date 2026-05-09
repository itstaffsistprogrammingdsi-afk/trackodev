import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/workspace.api'
import { Workspace } from '../types'

export const useWorkspaces = (divisionId: string) => {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces', divisionId],
    queryFn: () => api.getWorkspaces(divisionId),
    enabled: !!divisionId,
  })
}

export const useCreateWorkspace = (divisionId: string) => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api.createWorkspace(divisionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', divisionId] })
    },
  })
}

export const useDeleteWorkspace = (divisionId: string) => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', divisionId] })
    },
  })
}