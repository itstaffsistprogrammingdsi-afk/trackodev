import { Card } from "@/features/card/types"

export type Board = {
  id: string
  campaign_id: string
  name: string
  color?: string
  order: number
  cards: Card[]
}
