export type DueDateStatus = "none" | "safe" | "warning" | "overdue";

const WARNING_WINDOW_MS = 48 * 60 * 60 * 1000;

export const parseDueDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getDueDateStatus = (
  value?: string | null,
  now = new Date(),
): DueDateStatus => {
  const dueDate = parseDueDate(value);
  if (!dueDate) return "none";

  const remainingMs = dueDate.getTime() - now.getTime();
  if (remainingMs < 0) return "overdue";
  if (remainingMs < WARNING_WINDOW_MS) return "warning";

  return "safe";
};

export const isCardOverdue = (value?: string | null): boolean =>
  getDueDateStatus(value) === "overdue";

export const dueDateBadgeClasses: Record<DueDateStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-orange-50 text-orange-700 border-orange-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};
