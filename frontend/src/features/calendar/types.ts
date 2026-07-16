export interface User {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  campaign?: { id: string; name: string } | null;
  board?: { id: string; name: string } | null;
  assignees?: User[];
  creator?: User | null;
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

export interface GridDayCell {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}