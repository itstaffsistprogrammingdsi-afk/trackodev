import { Card } from "@/features/card/types";

export type Board = {
  id: string;
  campaign_id: string;
  name: string;
  color?: string;
  order: number;
  cards: Card[];
  created_at?: string;
};

export type CreateBoardPayload = {
  name: string;
  color?: string;
};

export type ReorderBoardPayload = {
  id: string;
  order: number;
};
