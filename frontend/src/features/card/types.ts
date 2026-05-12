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

  file_type?: string;

  file_size?: number;

  link_url?: string;

  attachment_type: "file" | "link";
}

export type Card = {
  id: string;

  title: string;

  description?: string;

  campaign_id?: string;
  
  board_id: string;


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

  /*
  |--------------------------------------------------------------------------
  | BRAND
  |--------------------------------------------------------------------------
  */

 brands?: Brand[];

  /*
  |--------------------------------------------------------------------------
  | CAMPAIGN
  |--------------------------------------------------------------------------
  */

  campaign?: Campaign | null;
  board?: Board;
};

export type Brand = {
  id: string;
  name: string;
  color: string;
};


/*
|--------------------------------------------------------------------------
| BOARD
|--------------------------------------------------------------------------
*/
export interface Board {
  id: string;
  campaign_id: string;
}