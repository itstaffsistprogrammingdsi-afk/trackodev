export interface Attachment {
  id: string;
  type: 'file' | 'link';
  file_name: string | null;
  file_url: string | null;
  link_url: string | null;
}

export interface Task {
  card_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  attachments: Attachment[];
}

export interface UserReportDetail {
  user_id: string;
  name: string;
  divisions: string | string[];
  tasks: Task[];
}

export interface ReportDetailResponse {
  data: UserReportDetail[];
}