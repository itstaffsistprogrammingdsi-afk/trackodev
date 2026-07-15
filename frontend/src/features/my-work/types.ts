export type ActivityRange =
  | "today"
  | "week"
  | "month"
  | "all";

  export type ExportPeriodType =
  | "daily"
  | "monthly"
  | "yearly";

  export type ExportFormat =
  | "xlsx"
  | "pdf";

  export interface ExportLogParams {
    type: ExportPeriodType;
    format: ExportFormat;
    date?: string;   // dipakai saat type = "daily", format: YYYY-MM-DD
    month?: number;  // dipakai saat type = "monthly", 1-12
    year?: number;   // dipakai saat type = "monthly" | "yearly"
  }

export interface DailyTodoItem {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "completed";
  due_date: string | null;
  board: string;
  output_count: number;
  completed_at: string | null;
}

export interface DailyTodoResponse {
  filter: {
    start_date: string | null;
    end_date: string | null;
  };

  status: {
    todo: DailyTodoItem[];
    in_progress: DailyTodoItem[];
    completed: DailyTodoItem[];
  };

  output: {
    total_files: number;
    cards_with_output: number;
    cards_without_output: number;
  };

  summary: {
    total_cards: number;
    completed: number;
    completion_rate: number;
  };
}

export interface ActivityItem {
  id: string;

  action: string;

  description: string;

  entity_type: string | null;

  entity_id: string | null;

  meta: Record<string, unknown> | null;

  created_at: string;

  user: {
    id: string;
    name: string;
  };
}

export interface AttachmentItem {
  id: number;

  card_id: number;

  card_title: string | null;

  file_name: string | null;

  file_type: string | null;

  file_size: number | null;

  file_size_kb: number;

  file_size_mb: number;

  attachment_type: "file" | "link";

  file_url: string | null;

  link_url: string | null;

  created_at: string;
}

export interface ActivityResponse {
  success: boolean;

  filter: {
    range: ActivityRange;
  };

  summary: {
    total_activities: number;

    today: number;

    this_week: number;

    this_month: number;

    uploaded_files: number;

    uploaded_links: number;

    total_attachments: number;

    total_storage_used: number;

    total_storage_used_mb: number;
  };

  activities: ActivityItem[];

  recent_attachments: AttachmentItem[];

  pagination: {
    current_page: number;

    last_page: number;

    per_page: number;

    total: number;
  };


}