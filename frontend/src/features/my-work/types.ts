export type ActivityRange =
  | "today"
  | "week"
  | "month"
  | "all";

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

  entity_type: string;

  entity_id: string;

  meta?: Record<string, unknown>;

  created_at: string;

  user: {
    id: string;
    name: string;
  };
}

export interface ActivityResponse {
  filter: {
    range: ActivityRange;
  };

  summary: {
    total_activities: number;
    today: number;
    this_week: number;
    this_month: number;
  };

  activities: ActivityItem[];

  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
