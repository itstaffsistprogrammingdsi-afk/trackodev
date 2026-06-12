import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../api/card.api"
import { Card, CreateCardRequest } from "../types"

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
mutationFn: (payload: CreateCardRequest) =>
  api.createCard(boardId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] })
      qc.invalidateQueries({ queryKey: ["cards", boardId] })
    },
  })
}