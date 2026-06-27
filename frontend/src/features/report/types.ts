export type Brand = {
  id: string;
  name: string;
  color: string;
};

export type Label = {
  id: string;
  name: string;
  color: string;
};

export interface Attachment {
  id: string;
  type: "file" | "link";
  file_name: string | null;
  file_url: string | null;
  link_url: string | null;
}

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "done"
  | string;

export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent"
  | string;

export interface Task {
  card_id: string;

  title: string;

  status: TaskStatus;

  priority: TaskPriority;

  due_date: string | null;

  completed_at: string | null;

  board_id: string;
  board_name: string;

  campaign_id: string;
  campaign_name: string;

  workspace_id: string;
  workspace_name: string;

  brands: Brand[];

  labels: Label[];

  attachments: Attachment[];
}

export interface UserReportDetail {
  user_id: string;

  name: string;

  divisions: string | null;

  tasks: Task[];
}

export interface ReportDetailResponse {
  data: UserReportDetail[];
}