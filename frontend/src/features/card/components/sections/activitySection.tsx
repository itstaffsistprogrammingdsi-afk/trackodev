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
import { useLanguage } from "@/context/LanguageContext";
import { getLocale, translate } from "@/i18n/translate";

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
  (activity.description || activity.action || translate("mencatat aktivitas", "logged an activity"))
    .replace(/ di card '[^']*'(?: di board '[^']*')?$/i, "")
    .replace(/^Mengupdate/i, translate("Memperbarui", "Updated"));

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
      title: translate("mengubah judul card", "changed the card title"),
      detail: oldValue && newValue ? `${oldValue} → ${newValue}` : undefined,
    },
    description_updated: {
      title: translate("memperbarui deskripsi", "updated the description"),
    },
    priority_updated: {
      title: translate("mengubah prioritas", "changed the priority"),
      detail: oldValue && newValue ? `${oldValue} → ${newValue}` : undefined,
    },
    due_date_added: {
      title: translate("menambahkan deadline", "added a deadline"),
      detail: newValue,
    },
    due_date_updated: {
      title: translate("mengubah deadline", "changed the deadline"),
      detail: oldValue && newValue ? `${oldValue} → ${newValue}` : newValue,
    },
    due_date_removed: {
      title: translate("menghapus deadline", "removed the deadline"),
      detail: oldValue,
    },
    member_assigned: {
      title: translate("menambahkan anggota", "added a member"),
      detail,
    },
    member_unassigned: {
      title: translate("menghapus anggota", "removed a member"),
      detail,
    },
    brand_attached: {
      title: translate("menambahkan brand", "added a brand"),
      detail,
    },
    brand_detached: {
      title: translate("menghapus brand", "removed a brand"),
      detail,
    },
    label_attached: {
      title: translate("menambahkan label", "added a label"),
      detail,
    },
    label_detached: {
      title: translate("menghapus label", "removed a label"),
      detail,
    },
  };
  if (changes[activity.action]) return changes[activity.action];

  if (activity.action === "mirrored") {
    return {
      title: translate("membuat copy lintas divisi", "created a cross-division copy"),
      detail,
    };
  }

  if (activity.action === "mirror_synced") {
    return {
      title: translate(
        "menyinkronkan perubahan lintas divisi",
        "synced cross-division changes",
      ),
      detail,
    };
  }

  if (activity.action === "mirror_removed") {
    return {
      title: translate("menghapus copy lintas divisi", "removed the cross-division copy"),
      detail,
    };
  }

  if (activity.action === "mirror_moved") {
    return {
      title: translate("memindahkan copy lintas divisi", "moved the cross-division copy"),
      detail,
    };
  }

  if (activity.action === "mirror_orphaned") {
    return {
      title: translate(
        "copy lintas divisi ikut terhapus",
        "the cross-division copy was also deleted",
      ),
      detail,
    };
  }

  if (activity.entity_type === "task" || activity.entity_type === "subtask") {
    const noun = activity.entity_type;
    const verbs: Record<string, string> = {
      created: translate(`membuat ${noun}`, `created a ${noun}`),
      updated: translate(`mengubah nama ${noun}`, `renamed the ${noun}`),
      completed: translate(`menyelesaikan ${noun}`, `completed the ${noun}`),
      reopened: translate(`membuka kembali ${noun}`, `reopened the ${noun}`),
      deleted: translate(`menghapus ${noun}`, `deleted the ${noun}`),
    };
    return { title: verbs[activity.action] || legacyCopy(activity), detail };
  }

  if (activity.entity_type === "card_comment") {
    const verbs: Record<string, string> = {
      created: translate("menambahkan komentar", "added a comment"),
      updated: translate("mengedit komentar", "edited a comment"),
      deleted: translate("menghapus komentar", "deleted a comment"),
    };
    return {
      title: verbs[activity.action] || legacyCopy(activity),
      detail: meta(activity, "comment_preview"),
    };
  }

  if (activity.entity_type.includes("attachment")) {
    const verbs: Record<string, string> = {
      created: translate("menambahkan file", "added a file"),
      deleted: translate("menghapus file", "deleted a file"),
      qc_updated: translate("memperbarui hasil QC", "updated the QC result"),
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
  return { Icon: Settings2, className: "bg-surface text-fg-muted" };
}

const dateKey = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleDateString("en-CA");
};

const dateLabel = (key: string) => {
  if (key === "unknown") return translate("Tanggal tidak tersedia", "Date not available");
  const today = dateKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === today) return translate("Hari ini", "Today");
  if (key === dateKey(yesterday.toISOString())) return translate("Kemarin", "Yesterday");
  return new Date(`${key}T00:00:00`).toLocaleDateString(getLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const relativeTime = (value: string) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (Number.isNaN(seconds)) return "-";
  const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return new Date(value).toLocaleTimeString(getLocale(), {
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
  const { t, locale } = useLanguage();
  const groups = activities.reduce<Record<string, ActivityLog[]>>(
    (result, activity) => {
      const key = dateKey(activity.created_at);
      (result[key] ||= []).push(activity);
      return result;
    },
    {}
  );
  const dominantLabels = {
    changes: t("Perubahan card", "Card changes"),
    tasks: t("Aktivitas task", "Task activity"),
    comments: t("Komentar", "Comments"),
    files: t("Aktivitas file", "File activity"),
  };
  const insightItems: string[] = [];
  if (insight?.dominant_category && insight.dominant_count) {
    insightItems.push(
      t(
        "{label} paling dominan ({count} aktivitas).",
        "{label} is the most dominant ({count} activities).",
        {
          label: dominantLabels[insight.dominant_category],
          count: insight.dominant_count,
        },
      ),
    );
  }
  if (insight?.most_active_user) {
    insightItems.push(
      t(
        "{name} paling aktif ({count} aktivitas).",
        "{name} is the most active ({count} activities).",
        {
          name: insight.most_active_user.name,
          count: insight.most_active_user.activity_count,
        },
      ),
    );
  }
  if (insight?.last_activity_at) {
    const inactiveDays = Math.floor(
      (Date.now() - new Date(insight.last_activity_at).getTime()) / 86_400_000
    );
    insightItems.push(
      inactiveDays >= 7
        ? t(
            "Tidak ada aktivitas penting selama {days} hari.",
            "No significant activity for {days} days.",
            { days: inactiveDays },
          )
        : t(
            "Aktivitas terakhir {time}.",
            "Last activity {time}.",
            { time: relativeTime(insight.last_activity_at) },
          ),
    );
  }

  return (
    <section className="p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-fg-muted">
          <History size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">{t("Aktivitas", "Activity")}</h2>
          <p className="text-xs text-fg-muted">{t("Riwayat penting pada card ini", "Key history for this card")}</p>
        </div>
      </div>

      {insightItems.length > 0 && (
        <aside className="mb-5 rounded-card border border-line bg-surface-muted/60 p-3.5" aria-label={t("Insight aktivitas", "Activity insight")}>
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-fg-muted">
              <Lightbulb size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-fg">
                {t("Insight aktivitas", "Activity insight")}
              </h3>
              <p className="mt-1 text-xs leading-5 text-fg-muted">
                {insightItems.join(" ")}
              </p>
            </div>
          </div>
        </aside>
      )}

      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
          <Clock3 size={16} className="animate-pulse" /> {t("Memuat aktivitas...", "Loading activity...")}
        </div>
      ) : activities.length > 0 ? (
        <>
          <div className="space-y-6">
            {Object.entries(groups).map(([key, items]) => (
              <div key={key}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-fg-subtle">{dateLabel(key)}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div>
                  {items.map((activity, index) => {
                    const copy = activityCopy(activity);
                    const style = activityStyle(activity);
                    const exactTime = new Date(activity.created_at).toLocaleString(locale, {
                      dateStyle: "full",
                      timeStyle: "short",
                    });
                    return (
                      <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {index < items.length - 1 && (
                          <span className="absolute left-[17px] top-9 h-[calc(100%-2rem)] w-px bg-line" />
                        )}
                        <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                          <style.Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm leading-5 text-fg">
                            <span className="font-semibold">
                              {activity.user?.name ?? t("Sistem", "System")}
                              {activity.user?.divisions?.length
                                ? ` - ${activity.user.divisions.map((division) => division.name).join(", ")}`
                                : ""}
                            </span>{" "}
                            {copy.title}
                          </p>
                          {copy.detail && (
                            <p className="mt-1 break-words rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-fg-muted">
                              {copy.detail}
                            </p>
                          )}
                          <time className="mt-1.5 block text-[11px] text-fg-subtle" dateTime={activity.created_at} title={exactTime}>
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

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs text-fg-subtle">
              {t("{shown} dari {total} aktivitas", "{shown} of {total} activities", {
                shown: activities.length,
                total,
              })}
            </span>
            {hasMore && (
              <button type="button" onClick={loadMore} disabled={loading} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong disabled:opacity-50">
                {loading ? t("Memuat...", "Loading...") : t("Tampilkan lebih banyak", "Show more")} <ChevronDown size={14} />
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
            <Sparkles size={20} />
          </div>
          <h3 className="text-sm font-medium text-fg">
            {t("Belum ada aktivitas", "No activity yet")}
          </h3>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {t(
              "Perubahan penting akan tercatat otomatis di sini.",
              "Important changes will be recorded here automatically.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}
