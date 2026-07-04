export interface Division {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  divisions?: Division[];
}

export interface Campaign {
  id: number;
  name: string;
}

export interface Board {
  id: number;
  name: string;
}

export interface Brand {
  id: number;
  name: string;
  color?: string;
}

export interface Label {
  id: number;
  name: string;
  color?: string;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_url: string | null;
  file_type: string;
  attachment_type: string;
  quantity: number;
  result_description: string | null;
  qc_quantity: number | null;
  qc_note: string | null;
  qc_by: number | null;
  qc_user: { id: number; name: string } | null;
  qc_at: string | null;
  uploader: { id: number; name: string } | null;
}

export interface Card {
  id: string;
  board_id: number;
  campaign_id: number;
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
  divisions: { id: number; name: string }[];
  workspaces: { id: number; name: string }[];
  campaigns: { id: number; name: string }[];
  labels: { id: number; name: string; color?: string }[];
  brands: { id: number; name: string; color?: string }[];
}