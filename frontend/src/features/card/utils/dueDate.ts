export type DueDateStatus = "none" | "safe" | "warning" | "overdue";

// Selaras dengan reminder backend `reminder:due-date` yang mengirim notifikasi
// H-1. Deadline dianggap mendekat mulai 24 jam terakhir.
const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;

export const parseDueDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type DueDateOptions = {
  /** Kartu sudah selesai (status completed atau completed_at terisi). */
  completed?: boolean;
  /** Waktu kartu benar-benar selesai; dipakai menilai telat vs tepat waktu. */
  completedAt?: string | null;
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

  // Kartu selesai: keterlambatan yang sudah terjadi tetap ditandai sebagai
  // riwayat (selesai setelah deadline), sedangkan selesai tepat waktu tampil
  // normal. Kartu selesai tanpa completed_at (data lama) dianggap tepat waktu.
  if (options.completed) {
    const completedAt = parseDueDate(options.completedAt);
    if (completedAt && completedAt.getTime() > dueDate.getTime()) {
      return "overdue";
    }

    return "safe";
  }

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
  // Tanpa deadline tetap netral. Deadline yang masih aman berwarna hijau,
  // mendekat (<= 24 jam) oranye, dan lewat deadline merah.
  none: "border-line bg-surface-muted text-fg-muted",
  safe: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  overdue: "border-danger/25 bg-danger-soft text-danger",
};
