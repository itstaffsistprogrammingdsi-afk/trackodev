export type CardPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type CreateCardRequest = {
  title: string;

  description?: string;

  priority?: CardPriority;

  due_date?: string | null;
  assignees?: string[]
};

export type UpdateCardRequest =
  Partial<CreateCardRequest>;

export type CardComment = {
  id: string;
  content: string;
  created_at?: string;

  user?: User;
};

export type CardTask = {
  id: number;
  title: string;
  is_completed: boolean;
};

export type Activity = {
  id: number;
  text: string;
  created_at?: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Label {
  id: string;

  name: string;

  color?: string | null;

  slug: string;
}

// export interface Brand {
//   id: string;
//   name: string;
//   color?: string;
// }

export interface Campaign {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;

  file_name?: string;

  file_path?: string;

  file_url?: string;

  file_type?: string;

  file_size?: number;

  link_url?: string;

  attachment_type: "file" | "link";

  quantity?: number;

  result_description?: string;

  version?: number;
  replaces_attachment_id?: string | null;
  archived_at?: string | null;
  qc_at?: string | null;
  created_at?: string;
  uploader?: { id: string; name: string } | null;
  archiver?: { id: string; name: string } | null;
  can_restore?: boolean;
}

export type Card = {
  id: string;

  title: string;

  description?: string;

  campaign_id?: string;

  board_id: string;

  created_at?: string;

  created_by?: User | null;

  priority?: CardPriority;

  due_date?: string | null;
  is_overdue?: boolean;

  comments?: CardComment[];

  assignees?: User[];

  tasks?: CardTask[];

  labels?: Label[];

  brands?: Brand[];

  campaign?: Campaign | null;

  board?: Board;
};

export type Brand = {
  id: string;
  name: string;
  color: string;
  campaign_id?: string;
};


/*
|--------------------------------------------------------------------------
| BOARD
|--------------------------------------------------------------------------
*/
export interface Board {
  id: string;
  campaign_id: string;
  name?: string;
}

export interface ActivityLog {
  id: string;

  user_id: string;

  action: string;

  entity_type: string;

  description?: string;

  created_at: string;

  meta?: Record<string, unknown>;

  user?: {
    id: string;
    name: string;
  };
}

export interface ActivityInsight {
  last_activity_at?: string | null;
  dominant_category?: "changes" | "tasks" | "comments" | "files" | null;
  dominant_count?: number;
  most_active_user?: {
    id: string;
    name: string;
    activity_count: number;
  } | null;
}
