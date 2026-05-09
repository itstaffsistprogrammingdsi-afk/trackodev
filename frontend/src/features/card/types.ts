export type CreateCardRequest = {
  title: string;

  description?: string;

  priority?:
    | "low"
    | "medium"
    | "high"
    | "urgent";

  due_date?: string;
};

export type UpdateCardRequest =
  Partial<CreateCardRequest>;

export type CardComment = {
  id: string;
  content: string;
  created_at?: string;
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
  color: string;
}

export type Card = {
  id: string;

  title: string;

  description?: string;

  campaign_id?: string;

  priority?:
    | "low"
    | "medium"
    | "high"
    | "urgent";

  due_date?: string | null;

  comments?: CardComment[];

  assignees?: User[];

  tasks?: CardTask[];

  labels?: Label[];
};

export type Attachment = {
  id: string;
  file_name?: string;
  link_url?: string;
  type?: "file" | "link";
};