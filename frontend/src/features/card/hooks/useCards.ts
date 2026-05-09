import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../api/card.api"
import { Card } from "../types"

export const useCards = (boardId: string) => {
  return useQuery<Card[]>({
    queryKey: ["cards", boardId],
    queryFn: () => api.getCards(boardId),
    enabled: !!boardId,
  })
}

export const useCreateCard = (boardId: string) => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { title: string }) =>
      api.createCard(boardId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] })
    },
  })
}