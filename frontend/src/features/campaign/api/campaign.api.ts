import api from "@/lib/axios";
import {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  Campaign,
} from "../types";

export const getCampaigns = async (workspaceId: string): Promise<Campaign[]> => {
  const res = await api.get(`/workspaces/${workspaceId}/campaigns`);
  return res.data.data; // ✅ hanya array
};

export const getCampaign = async (id: string) => {
  const res = await api.get(`/campaigns/${id}`);
  return res.data.data;
};

export const createCampaign = async (
  workspaceId: string,
  data: CreateCampaignRequest
) => {
  const res = await api.post(`/workspaces/${workspaceId}/campaigns`, data);
  return res.data.data;
};

export const updateCampaign = async (
  id: string,
  data: UpdateCampaignRequest
) => {
  const res = await api.put(`/campaigns/${id}`, data);
  return res.data.data;
};

export const deleteCampaign = async (id: string) => {
  const res = await api.delete(`/campaigns/${id}`);
  return res.data;
};

export const addMember = async (campaignId: string, user_id: string) => {
  const res = await api.post(`/campaigns/${campaignId}/members`, { user_id });
  return res.data.data;
};

export const getMembers = async (campaignId: string) => {
  const res = await api.get(`/campaigns/${campaignId}/members`)
  return res.data.data
}

export const removeMember = async (campaignId: string, userId: string) => {
  const res = await api.delete(`/campaigns/${campaignId}/members/${userId}`)
  return res.data
}

export const getUsers = async () => {
  const res = await api.get("/users") // pastikan endpoint ada
  return res.data.data
}

export const searchUsers = async (query: string) => {

  const res = await api.get(`/users/mentionable?search=${query}`)

  return res.data.data
}