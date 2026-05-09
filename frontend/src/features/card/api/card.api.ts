import api from "@/lib/axios";
import {
  Card,
  CreateCardRequest,
  UpdateCardRequest,
} from "../types";

// =====================================================
// GET CARDS
// =====================================================
export const getCards = async (
  boardId: string,
) => {
  const res = await api.get(
    `/boards/${boardId}/cards`,
  );

  return res.data.data as Card[];
};

// =====================================================
// CREATE CARD
// =====================================================
export const createCard = async (
  boardId: string,
  payload: CreateCardRequest,
) => {
  const res = await api.post(
    `/boards/${boardId}/cards`,
    payload,
  );

  return res.data.data as Card;
};

// =====================================================
// UPDATE CARD
// =====================================================
export const updateCard = async (
  id: string,
  payload: UpdateCardRequest,
) => {
  const res = await api.put(
    `/cards/${id}`,
    payload,
  );

  return res.data.data as Card;
};

// =====================================================
// DELETE CARD
// =====================================================
export const deleteCard = async (
  id: string,
) => {
  const res = await api.delete(
    `/cards/${id}`,
  );

  return res.data;
};

// =====================================================
// MOVE CARD
// =====================================================
export const moveCard = (
  cardId: string,
  boardId: string,
) =>
  api.patch(`/cards/${cardId}/move`, {
    board_id: boardId,
  });

// =====================================================
// REORDER CARDS
// =====================================================
export const reorderCards = (
  cards: {
    id: string;
    order: number;
  }[],
) =>
  api.patch(`/cards/reorder`, {
    cards,
  });

// =====================================================
// COMMENTS
// =====================================================
export const addComment = (
  cardId: string,
  content: string,
) => {
  return api.post(
    `/cards/${cardId}/comments`,
    {
      content,
    },
  );
};

// =====================================================
// ASSIGN MEMBER
// =====================================================
export const assignMember = async (
  cardId: string,
  userId: string,
) => {
  const res = await api.post(
    `/cards/${cardId}/assign`,
    {
      user_id: userId,
    },
  );

  return res.data;
};

// =====================================================
// UNASSIGN MEMBER
// =====================================================
export const unassignMember = async (
  cardId: string,
  userId: string,
) => {
  const res = await api.delete(
    `/cards/${cardId}/assign/${userId}`,
  );

  return res.data;
};

// =====================================================
// LABELS
// =====================================================
export const attachLabel = async (
  cardId: string,
  payload: { label_id: string },
) => {
  const res = await api.post(
    `/cards/${cardId}/labels`,
    payload,
  );

  return res.data;
};

export const detachLabel = async (
  cardId: string,
  labelId: string,
) => {
  const res = await api.delete(
    `/cards/${cardId}/labels/${labelId}`,
  );

  return res.data;
};