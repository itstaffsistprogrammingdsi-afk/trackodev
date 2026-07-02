export interface User {
  id: number;
  name: string;
  avatar: string | null;
}

export interface Task {
  id: number;
  title: string;
  status: string;
  due_date: string | null;
  campaign?: { id: number; name: string } | null;
  board?: { id: number; name: string } | null;
  assignees?: User[];
}

export interface DayData {
  total: number;
  tasks: Task[];
}

export interface CalendarMonthResponse {
  month: string;
  summary: {
    total_tasks: number;
    active_days: number;
  };
  days: Record<string, DayData>; // Format key-nya string tanggal "2026-07-02"
}

export interface CalendarDayResponse {
  date: string;
  total: number;
  tasks: Task[];
}