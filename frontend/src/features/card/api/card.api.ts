import api from "@/lib/axios";
import {
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  Brand,
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
export async function getLabels() {
  const res = await api.get("/labels");

  return res.data;
}

export async function createLabel(data: {
  name: string;
  color?: string;
}) {
  const res = await api.post(
    "/labels",
    data
  );

  return res.data;
}

export async function attachLabel(
  cardId: string,
  labelId: string
) {
  const res = await api.post(
    `/cards/${cardId}/labels`,
    {
      label_id: labelId,
    }
  );

  return res.data;
}

export async function detachLabel(
  cardId: string,
  labelId: string
) {
  const res = await api.delete(
    `/cards/${cardId}/labels/${labelId}`
  );

  return res.data;
}

export async function toggleLabel(
  cardId: string,
  labelId: string
) {
  const res = await api.patch(
    `/cards/${cardId}/labels`,
    {
      label_id: labelId,
    }
  );

  return res.data;
}

// =========================================
// CREATE BRAND
// =========================================
export const createBrand = async (
  campaignId: string,
  name: string,
  color: string,
) => {
  const res = await api.post("/brands", {
    campaign_id: campaignId,
    name,
    color,
  });

  return res.data;
};

// =========================================
// ATTACH BRAND
// =========================================
export const attachBrand = async (
  cardId: string,
  brandId: string,
) => {
  const res = await api.post(
    `/cards/${cardId}/brands/${brandId}/attach`,
  );

  return res.data;
};

// =========================================
// DETACH BRAND
// =========================================
export const detachBrand = async (
  cardId: string,
  brandId: string,
) => {
  const res = await api.delete(
    `/cards/${cardId}/brands/${brandId}/detach`,
  );

  return res.data;
};

// =========================================
// GET BRANDS
// =========================================
export const getBrands = async () => {
  const res = await api.get(
    "/brands",
  );

  return res.data as Brand[];
};