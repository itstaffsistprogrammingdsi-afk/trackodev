import api from '@/lib/axios'
import { Board } from '../types'

export const getBoards = async (campaignId: string) => {
  const res = await api.get(`/campaigns/${campaignId}/boards`)
  return res.data.data as Board[]
}

export const createBoard = async (
  campaignId: string,
  payload: { name: string; color?: string }
) => {
  const res = await api.post(`/campaigns/${campaignId}/boards`, payload)
  return res.data.data as Board
}

export const deleteBoard = async (id: string) => {
  const res = await api.delete(`/boards/${id}`)
  return res.data
}