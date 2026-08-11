import api from "@/lib/axios";
import { isMobileApp } from "@/lib/mobileConfig";
import type { Card } from "@/features/card/types";
import { Board, CreateBoardPayload, ReorderBoardPayload } from "../types";

interface ApiEnvelope<T> {
  message?: string;
  data: T;
}

const MOBILE_CARD_HYDRATION_CONCURRENCY = 6;

const hydrateMobileCardMetadata = async (boards: Board[]): Promise<Board[]> => {
  if (!isMobileApp()) return boards;

  const cardsMissingBrands = boards
    .flatMap((board) => board.cards)
    .filter((card) => !Array.isArray(card.brands));

  if (cardsMissingBrands.length === 0) return boards;

  const hydratedCards = new Map<string, Card>();
  let nextIndex = 0;

  const hydrateNext = async (): Promise<void> => {
    while (nextIndex < cardsMissingBrands.length) {
      const card = cardsMissingBrands[nextIndex++];

      try {
        const response = await api.get<ApiEnvelope<Card>>(`/cards/${card.id}`);
        hydratedCards.set(card.id, response.data.data);
      } catch (error) {
        console.warn("Mobile card metadata hydration failed", {
          cardId: card.id,
          error,
        });
      }
    }
  };

  const workerCount = Math.min(
    MOBILE_CARD_HYDRATION_CONCURRENCY,
    cardsMissingBrands.length,
  );

  await Promise.all(Array.from({ length: workerCount }, hydrateNext));

  return boards.map((board) => ({
    ...board,
    cards: board.cards.map((card) => {
      const hydrated = hydratedCards.get(card.id);

      return hydrated
        ? {
            ...card,
            ...hydrated,
            board_id: hydrated.board_id ?? card.board_id,
          }
        : card;
    }),
  }));
};

export const getBoards = async (campaignId: string): Promise<Board[]> => {
  const res = await api.get<ApiEnvelope<Board[]>>(
    `/campaigns/${campaignId}/boards`,
  );

  return hydrateMobileCardMetadata(res.data.data);
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
  const res = await api.patch<{ message: string }>("/boards/reorder", {
    boards,
  });

  return res.data;
};
