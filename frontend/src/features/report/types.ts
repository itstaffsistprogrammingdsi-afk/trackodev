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

export type TaskStatus = "todo" | "in_progress" | "completed" | "done" | string;

export type TaskPriority = "low" | "medium" | "high" | string;

export interface Task {
  card_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  brands: Brand[];
  labels: Label[];
  attachments: Attachment[] | null;
}

export interface UserReportDetail {
  user_id: string;
  name: string;
  divisions: string | null; // FIX: sesuai backend kamu
  tasks: Task[] | null;
}

export interface ReportDetailResponse {
  data: UserReportDetail[];
}