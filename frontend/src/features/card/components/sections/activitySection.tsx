import {
  CalendarClock,
  CheckSquare2,
  ChevronDown,
  Clock3,
  History,
  Lightbulb,
  MessageSquareText,
  Paperclip,
  Settings2,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import type { ComponentType } from "react";
import type { ActivityInsight, ActivityLog } from "../../types";

interface Props {
  activities: ActivityLog[];
  loading?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  total?: number;
  insight?: ActivityInsight | null;
}

const meta = (activity: ActivityLog, key: string) => {
  const value = activity.meta?.[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
};

const legacyCopy = (activity: ActivityLog) =>
  (activity.description || activity.action || "mencatat aktivitas")
    .replace(/ di card '[^']*'(?: di board '[^']*')?$/i, "")
    .replace(/^Mengupdate/i, "Memperbarui");

function activityCopy(activity: ActivityLog) {
  const oldValue = meta(activity, "old_value");
  const newValue = meta(activity, "new_value");
  const detail =
    meta(activity, "task_title") ||
    meta(activity, "subtask_title") ||
    meta(activity, "label_name") ||
    meta(activity, "brand_name") ||
    meta(activity, "member_name") ||
    meta(activity, "attachment_name");

  const changes: Record<string, { title: string; detail?: string }> = {
    title_updated: {
      title: "mengubah judul card",
      detail: oldValue && newValue ? `${oldValue} → ${newValue}` : undefined,
    },
    description_updated: { title: "memperbarui deskripsi" },
    priority_updated: {
      title: "mengubah prioritas",
      detail: oldValue && newValue ? `${oldValue} → ${newValue}` : undefined,
    },
    due_date_added: { title: "menambahkan tenggat waktu", detail: newValue },
    due_date_updated: {
      title: "mengubah tenggat waktu",
      detail: oldValue && newValue ? `${oldValue} → ${newValue}` : newValue,
    },
    due_date_removed: { title: "menghapus tenggat waktu", detail: oldValue },
    member_assigned: { title: "menambahkan anggota", detail },
    member_unassigned: { title: "menghapus anggota", detail },
    brand_attached: { title: "menambahkan brand", detail },
    brand_detached: { title: "menghapus brand", detail },
    label_attached: { title: "menambahkan label", detail },
    label_detached: { title: "menghapus label", detail },
  };
  if (changes[activity.action]) return changes[activity.action];

  if (activity.entity_type === "task" || activity.entity_type === "subtask") {
    const noun = activity.entity_type;
    const verbs: Record<string, string> = {
      created: `membuat ${noun}`,
      updated: `mengubah nama ${noun}`,
      completed: `menyelesaikan ${noun}`,
      reopened: `membuka kembali ${noun}`,
      deleted: `menghapus ${noun}`,
    };
    return { title: verbs[activity.action] || legacyCopy(activity), detail };
  }

  if (activity.entity_type === "card_comment") {
    const verbs: Record<string, string> = {
      created: "menambahkan komentar",
      updated: "mengedit komentar",
      deleted: "menghapus komentar",
    };
    return {
      title: verbs[activity.action] || legacyCopy(activity),
      detail: meta(activity, "comment_preview"),
    };
  }

  if (activity.entity_type.includes("attachment")) {
    const verbs: Record<string, string> = {
      created: "menambahkan file",
      deleted: "menghapus file",
      qc_updated: "memperbarui hasil QC",
    };
    return { title: verbs[activity.action] || legacyCopy(activity), detail };
  }

  return { title: legacyCopy(activity) };
}

function activityStyle(activity: ActivityLog): {
  Icon: ComponentType<{ size?: number; className?: string }>;
  className: string;
} {
  if (activity.entity_type === "task" || activity.entity_type === "subtask") {
    return { Icon: CheckSquare2, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" };
  }
  if (activity.entity_type === "card_comment") {
    return { Icon: MessageSquareText, className: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400" };
  }
  if (activity.entity_type.includes("attachment")) {
    return { Icon: Paperclip, className: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" };
  }
  if (activity.action.includes("member")) {
    return { Icon: UserRound, className: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400" };
  }
  if (activity.action.includes("label") || activity.action.includes("brand")) {
    return { Icon: Tag, className: "bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400" };
  }
  if (activity.action.includes("due_date")) {
    return { Icon: CalendarClock, className: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400" };
  }
  return { Icon: Settings2, className: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" };
}

const dateKey = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleDateString("en-CA");
};

const dateLabel = (key: string) => {
  if (key === "unknown") return "Tanggal tidak tersedia";
  const today = dateKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === today) return "Hari ini";
  if (key === dateKey(yesterday.toISOString())) return "Kemarin";
  return new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const relativeTime = (value: string) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (Number.isNaN(seconds)) return "-";
  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ActivitySection({
  activities,
  loading,
  hasMore,
  loadMore,
  total = 0,
  insight,
}: Props) {
  const groups = activities.reduce<Record<string, ActivityLog[]>>(
    (result, activity) => {
      const key = dateKey(activity.created_at);
      (result[key] ||= []).push(activity);
      return result;
    },
    {}
  );
  const dominantLabels = {
    changes: "Perubahan card",
    tasks: "Aktivitas task",
    comments: "Komentar",
    files: "Aktivitas file",
  };
  const insightItems: string[] = [];
  if (insight?.dominant_category && insight.dominant_count) {
    insightItems.push(
      `${dominantLabels[insight.dominant_category]} paling dominan (${insight.dominant_count} aktivitas).`
    );
  }
  if (insight?.most_active_user) {
    insightItems.push(
      `${insight.most_active_user.name} paling aktif (${insight.most_active_user.activity_count} aktivitas).`
    );
  }
  if (insight?.last_activity_at) {
    const inactiveDays = Math.floor(
      (Date.now() - new Date(insight.last_activity_at).getTime()) / 86_400_000
    );
    insightItems.push(
      inactiveDays >= 7
        ? `Tidak ada aktivitas penting selama ${inactiveDays} hari.`
        : `Aktivitas terakhir ${relativeTime(insight.last_activity_at)}.`
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <History size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg">Aktivitas</h2>
          <p className="text-xs text-slate-400 sm:text-sm">Riwayat penting pada card ini</p>
        </div>
      </div>

      {insightItems.length > 0 && (
        <aside className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/30" aria-label="Insight aktivitas">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
              <Lightbulb size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Insight aktivitas
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {insightItems.join(" ")}
              </p>
            </div>
          </div>
        </aside>
      )}

      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Clock3 size={16} className="animate-pulse" /> Memuat aktivitas...
        </div>
      ) : activities.length > 0 ? (
        <>
          <div className="space-y-6">
            {Object.entries(groups).map(([key, items]) => (
              <div key={key}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{dateLabel(key)}</span>
                  <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div>
                  {items.map((activity, index) => {
                    const copy = activityCopy(activity);
                    const style = activityStyle(activity);
                    const exactTime = new Date(activity.created_at).toLocaleString("id-ID", {
                      dateStyle: "full",
                      timeStyle: "short",
                    });
                    return (
                      <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {index < items.length - 1 && (
                          <span className="absolute left-[17px] top-9 h-[calc(100%-2rem)] w-px bg-slate-200 dark:bg-slate-700" />
                        )}
                        <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                          <style.Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">{activity.user?.name ?? "Sistem"}</span>{" "}
                            {copy.title}
                          </p>
                          {copy.detail && (
                            <p className="mt-1 break-words rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                              {copy.detail}
                            </p>
                          )}
                          <time className="mt-1.5 block text-[11px] text-slate-400" dateTime={activity.created_at} title={exactTime}>
                            {relativeTime(activity.created_at)}
                          </time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-xs text-slate-400">{activities.length} dari {total} aktivitas</span>
            {hasMore && (
              <button type="button" onClick={loadMore} disabled={loading} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400">
                {loading ? "Memuat..." : "Tampilkan lebih banyak"} <ChevronDown size={14} />
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Sparkles size={20} />
          </div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Belum ada aktivitas
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">Perubahan penting akan tercatat otomatis di sini.</p>
        </div>
      )}
    </section>
  );
}
