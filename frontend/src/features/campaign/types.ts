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
  division_id: string;
};

export type CampaignType = "personal" | "group";

export type CreateCampaignRequest = {
  name: string;
  description?: string;
  type: CampaignType;
  due_date?: string;
  member_ids?: string[];
  division_id: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
};

export type GanttTask = {
  id: string;
  name: string;
  start: number;
  length: number;
  status: "todo" | "in_progress" | "completed";
};

export type GanttResponse = {
  total_days: number;
  tasks: GanttTask[];
};

export type BoardProgressData = {
  total: number;

  todo: number;
  in_progress: number;
  completed: number;

  overdue: number;
};

export type CampaignStatsData = {
  total_tasks: number;
  completed: number;
  in_progress: number;
  overdue: number;
};

export type OverdueTask = {
  id: string;
  title: string;
  code?: string;
  status: string;
  due_date?: string;
  due_text: string;
};

export type CampaignHealthData = {
  completion_rate: number;
  overdue_tasks: number;
  active_members: number;
  status: "Healthy" | "At Risk" | "Critical";
};
export type UpdateCampaignRequest = Partial<CreateCampaignRequest>;
