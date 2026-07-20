import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import * as api from "../api/board.api";
import { Board, CreateBoardPayload, ReorderBoardPayload } from "../types";

export const useBoards = (campaignId: string) => {
  return useQuery<Board[]>({
    queryKey: ["boards", campaignId],
    queryFn: () => api.getBoards(campaignId),
    enabled: !!campaignId,
    staleTime: 30_000,
  });
};

export const useCreateBoard = (campaignId: string) => {
  const qc = useQueryClient();

  return useMutation<Board, Error, CreateBoardPayload>({
    mutationFn: (payload) => api.createBoard(campaignId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards", campaignId] });
    },
  });
};

export const useUpdateBoard = (campaignId: string) => {
  const qc = useQueryClient();

  return useMutation<
    Board,
    Error,
    { id: string; payload: Partial<CreateBoardPayload> }
  >({
    mutationFn: ({ id, payload }) => api.updateBoard(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards", campaignId] });
    },
  });
};

export const useDeleteBoard = (campaignId: string) => {
  const qc = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => api.deleteBoard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards", campaignId] });
    },
  });
};

export const useReorderBoards = (campaignId: string) => {
  const qc = useQueryClient();

  return useMutation<{ message: string }, Error, ReorderBoardPayload[]>({
    mutationFn: (boards) => api.reorderBoards(boards),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards", campaignId] });
    },
  });
};
