import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/board.api'
import { Board } from '../types'

export const useBoards = (campaignId: string) => {
  return useQuery<Board[]>({
    queryKey: ['boards', campaignId],
    queryFn: () => api.getBoards(campaignId),
    enabled: !!campaignId,
  })
}

export const useCreateBoard = (campaignId: string) => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; color?: string }) =>
      api.createBoard(campaignId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards', campaignId] })
    },
  })
}

export const useDeleteBoard = (campaignId: string) => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteBoard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards', campaignId] })
    },
  })
}