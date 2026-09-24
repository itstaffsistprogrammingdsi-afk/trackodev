export type DueDateStatus = "none" | "safe" | "warning" | "overdue";

const WARNING_WINDOW_MS = 48 * 60 * 60 * 1000;

export const parseDueDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type DueDateOptions = {
  /** Kartu yang sudah selesai tidak pernah dianggap terlambat. */
  completed?: boolean;
  now?: Date;
};

export const isCardCompleted = (card: {
  status?: string | null;
  completed_at?: string | null;
}): boolean => card.status === "completed" || Boolean(card.completed_at);

export const getDueDateStatus = (
  value?: string | null,
  options: DueDateOptions = {},
): DueDateStatus => {
  const dueDate = parseDueDate(value);
  if (!dueDate) return "none";

  // Kartu selesai (mis. sudah dipindah ke Done) tidak pernah overdue walau
  // deadline-nya sudah lewat — selaras dengan dashboard/stats.
  if (options.completed) return "safe";

  const now = options.now ?? new Date();
  const remainingMs = dueDate.getTime() - now.getTime();
  if (remainingMs < 0) return "overdue";
  if (remainingMs < WARNING_WINDOW_MS) return "warning";

  return "safe";
};

export const isCardOverdue = (
  value?: string | null,
  options: DueDateOptions = {},
): boolean => getDueDateStatus(value, options) === "overdue";

export const dueDateBadgeClasses: Record<DueDateStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-orange-50 text-orange-700 border-orange-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};
