export interface Division {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  divisions?: Division[];
}

export interface Campaign {
  id: string;
  name: string;
}

export interface Board {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
  color?: string;
}

export interface Label {
  id: string;
  name: string;
  color?: string;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_url: string | null;
  download_endpoint?: string | null;
  file_type: string;
  attachment_type: string;
  quantity: number;
  result_description: string | null;
  qc_quantity: number | null;
  qc_note: string | null;
  qc_by: string | null;
  qc_user: { id: string; name: string } | null;
  qc_at: string | null;
  uploader: { id: string; name: string } | null;
  archived_at?: string | null;
  created_at?: string | null;
  is_download_locked?: boolean;
}

export interface Card {
  id: string;
  board_id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  is_completed: boolean;
  created_at: string;
  campaign: Campaign | null;
  board: Board | null;
  brands: Brand[];
  labels: Label[];
  assignees: User[];
  attachments: Attachment[];
  is_cross_division_copy?: boolean;
  parent_card_id?: string | null;
  source_division?: { id: string; name: string } | null;
  mirrored_by?: { id: string; name: string } | null;
}

export interface FilterParams {
  search?: string;
  division_id?: string;
  start_date?: string;
  end_date?: string;
  campaign_id?: string;
  workspace_id?: string;
  label_id?: string;
  brand_id?: string;
  page?: number;
  user_id?: string | number; // <--- Tambahkan ini
  search_card?: string; // <--- Tambahkan ini
}

export interface ReportPreviewData {
  table?: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
  html: string | null;
  pdf_base64: string | null;
  users_count: number;
  total_cards: number;
  total_attachments?: number;
  total_qc?: number;
  period_label?: string;
}

export interface ReportSummary {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  period_label: string;
}

export interface ReportDownloadHistoryItem {
  id: string;
  created_at: string | null;
  format: 'pdf' | 'xlsx' | null;
  file_name: string | null;
  period_label: string | null;
  total_cards: number | null;
  target_user_id: string | null;
  target_user_name: string | null;
  ip_address: string | null;
  user: { id: string; name: string } | null;
}

export interface ReportDownloadHistoryParams {
  page?: number;
  limit?: number;
  format?: 'pdf' | 'xlsx' | '';
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface ReportDownloadHistoryResponse {
  success: boolean;
  data: ReportDownloadHistoryItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

// Tambahkan interface ini di bagian paling bawah file src/features/report/types.ts
export interface MasterFilterOptions {
  divisions: { id: string; name: string }[];
  workspaces: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  labels: { id: string; name: string; color?: string }[];
  brands: { id: string; name: string; color?: string }[];
}

