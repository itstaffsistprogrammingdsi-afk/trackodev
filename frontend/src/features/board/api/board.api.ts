import api from "@/lib/axios";
import { Board, CreateBoardPayload, ReorderBoardPayload } from "../types";

interface ApiEnvelope<T> {
  message?: string;
  data: T;
}

export const getBoards = async (campaignId: string): Promise<Board[]> => {
  const res = await api.get<ApiEnvelope<Board[]>>(
    `/campaigns/${campaignId}/boards`,
  );

  return res.data.data;
};

export const createBoard = async (
  campaignId: string,
  payload: CreateBoardPayload,
): Promise<Board> => {
  const res = await api.post<ApiEnvelope<Board>>(
    `/campaigns/${campaignId}/boards`,
    payload,
  );

  return res.data.data;
};

export const updateBoard = async (
  id: string,
  payload: Partial<CreateBoardPayload>,
): Promise<Board> => {
  const res = await api.put<ApiEnvelope<Board>>(`/boards/${id}`, payload);

  return res.data.data;
};

export const deleteBoard = async (id: string): Promise<{ message: string }> => {
  const res = await api.delete<{ message: string }>(`/boards/${id}`);

  return res.data;
};

export const reorderBoards = async (
  boards: ReorderBoardPayload[],
): Promise<{ message: string }> => {
  const res = await api.post<{ message: string }>("/boards/reorder", {
    boards,
  });

  return res.data;
};
