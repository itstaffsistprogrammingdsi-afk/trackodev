export type TaskStatus =
  | "todo"
  | "in_progress"
  | "completed";

export interface DailyTodoItem {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  board: string;
  output_count: number;
  completed_at: string | null;
}

export interface DailyTodoStatusGroup {
  todo: DailyTodoItem[];
  in_progress: DailyTodoItem[];
  completed: DailyTodoItem[];
}

export interface DailyTodoFilter {
  start_date?: string;
  end_date?: string;
}

export interface DailyTodoOutputSummary {
  total_files: number;
  cards_with_output: number;
  cards_without_output: number;
}

export interface DailyTodoSummary {
  total_cards: number;
  completed: number;
  completion_rate: number;
}

export interface DailyTodoResponse {
  filter: DailyTodoFilter;
  status: DailyTodoStatusGroup;
  output: DailyTodoOutputSummary;
  summary: DailyTodoSummary;
}