export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type Campaign = {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: "personal" | "group";
  due_date?: string;
  created_by?: User;
  members?: User[];
  created_at?: string;
};

export type CampaignType = "personal" | "group";

export type CreateCampaignRequest = {
  name: string;
  description?: string;
  type: CampaignType;
  due_date?: string;
  member_ids?: string[];
};

export type Member = {
  id: string
  name: string
  email: string
}

export type UpdateCampaignRequest = Partial<CreateCampaignRequest>;