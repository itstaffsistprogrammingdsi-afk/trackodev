import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  History,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import DatePickerField from "@/features/my-work/components/DatePickerField";
import {
  getDivisionActivities,
  type DivisionActivity,
  type DivisionActivityCategory,
} from "../api/division.api";

type Props = {
  divisionId: string;
};

const PAGE_SIZE = 15;
const REALTIME_RESOURCES = [
  "ActivityLog",
  "Division",
  "Workspace",
  "Campaign",
  "Board",
  "Card",
  "Task",
  "Subtask",
  "CardComment",
  "CardAttachment",
  "CardBriefAttachment",
  "Form",
  "FormField",
  "Brand",
] as const;

const FILTERS: Array<{ value: DivisionActivityCategory; label: string }> = [
  { value: "all", label: "Semua aktivitas" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "comment", label: "Comment" },
];

const entityLabels: Record<string, string> = {
  division: "Division",
  workspace: "Workspace",
  campaign: "Campaign",
  board: "Board",
  card: "Card",
  task: "Task",
  subtask: "Subtask",
  card_comment: "Comment",
  card_attachment: "Attachment",
  card_brief_attachment: "Brief attachment",
  form: "Form",
  form_field: "Form field",
  brand: "Brand",
};

const activityMeta = (
  activity: DivisionActivity,
  key: string,
): string | undefined => {
  const value = activity.meta?.[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
};

const actionLabels: Record<string, string> = {
  created: "Create",
  updated: "Update",
  deleted: "Delete",
  added: "Create",
  removed: "Delete",
  attached: "Create",
  detached: "Delete",
  assigned: "Update",
  unassigned: "Delete",
  moved: "Update",
  completed: "Update",
  reopened: "Update",
  reordered: "Update",
};

function actionLabel(activity: DivisionActivity): string {
  if (activity.activity_type === "comment") return "Comment";
  const action = activity.action.split(".").pop() ?? activity.action;
  return actionLabels[action] ?? activity.activity_type[0].toUpperCase() + activity.activity_type.slice(1);
}

function activityIcon(activity: DivisionActivity) {
  if (activity.activity_type === "comment") return MessageSquareText;
  if (activity.activity_type === "create") return Plus;
  if (activity.activity_type === "delete") return Trash2;
  return Pencil;
}

function activityIconClass(activity: DivisionActivity): string {
  if (activity.activity_type === "comment") {
    return "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300";
  }
  if (activity.activity_type === "create") {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (activity.activity_type === "delete") {
    return "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300";
  }
  return "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300";
}

function activityText(activity: DivisionActivity): string {
  if (activity.description?.trim()) return activity.description;

  const subject = entityLabels[activity.entity_type] ?? activity.entity_type;
  const verb = actionLabel(activity).toLowerCase();
  return `${verb} ${subject.toLowerCase()}`;
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "-";

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return formatter.format(days, "day");
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DivisionActivitySection({ divisionId }: Props) {
  const [category, setCategory] = useState<DivisionActivityCategory>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activities, setActivities] = useState<DivisionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const realtimeRevision = useRealtimeRevision(REALTIME_RESOURCES);
  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const fetchActivities = useCallback(
    async (requestedPage: number, append: boolean) => {
      if (!divisionId || dateRangeInvalid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getDivisionActivities(
          divisionId,
          category,
          requestedPage,
          PAGE_SIZE,
          dateFrom || undefined,
          dateTo || undefined,
        );
        setActivities((current) => {
          const next = append ? [...current, ...response.activities] : response.activities;
          return next.filter(
            (activity, index, items) =>
              items.findIndex((item) => item.id === activity.id) === index,
          );
        });
        setPage(response.current_page);
        setHasMore(response.has_more);
        setTotal(response.total_logs);
      } finally {
        setLoading(false);
      }
    },
    [category, dateFrom, dateRangeInvalid, dateTo, divisionId],
  );

  useEffect(() => {
    setActivities([]);
    setPage(1);
    if (dateRangeInvalid) {
      setTotal(0);
      setHasMore(false);
      setLoading(false);
      return;
    }
    void fetchActivities(1, false);
  }, [dateRangeInvalid, fetchActivities, realtimeRevision]);

  const loadMore = () => {
    if (!loading && hasMore) void fetchActivities(page + 1, true);
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <History size={19} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg">
              Aktivitas division
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              Log create, update, delete, dan comment untuk audit.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center justify-end gap-2">
            <label htmlFor="division-activity-filter" className="sr-only">
              Filter aktivitas
            </label>
            <select
              id="division-activity-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value as DivisionActivityCategory)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
            >
              {FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void fetchActivities(1, false)}
              disabled={loading || dateRangeInvalid}
              aria-label="Muat ulang aktivitas"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-end gap-2">
            <div>
              <label htmlFor="division-activity-date-from" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Dari tanggal
              </label>
              <DatePickerField
                id="division-activity-date-from"
                value={dateFrom}
                onChange={setDateFrom}
                maxDate={dateTo || undefined}
                placeholder="Pilih tanggal"
                className="w-44"
              />
            </div>
            <div>
              <label htmlFor="division-activity-date-to" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Sampai tanggal
              </label>
              <DatePickerField
                id="division-activity-date-to"
                value={dateTo}
                minDate={dateFrom || undefined}
                onChange={setDateTo}
                placeholder="Pilih tanggal"
                align="right"
                className="w-44"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            )}
          </div>
          {dateRangeInvalid && (
            <p className="text-right text-[11px] font-medium text-rose-500">
              Tanggal mulai harus sebelum atau sama dengan tanggal akhir.
            </p>
          )}
        </div>
      </div>

      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Clock3 size={16} className="animate-pulse" /> Memuat aktivitas...
        </div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Belum ada aktivitas untuk filter ini.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Aktivitas baru akan muncul otomatis saat ada perubahan di division.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((activity) => {
              const Icon = activityIcon(activity);
              const exactTime = new Date(activity.created_at).toLocaleString("id-ID", {
                dateStyle: "full",
                timeStyle: "short",
              });
              const actor = activity.user?.name ?? "Sistem";
              const entity = entityLabels[activity.entity_type] ?? activity.entity_type;

              return (
                <article key={activity.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activityIconClass(activity)}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">{actor}</span>{" "}
                        {activityText(activity)}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {entity}
                      </span>
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800/70 dark:text-slate-500">
                        {actionLabel(activity)}
                      </span>
                    </div>
                    {activity.entity_type === "card_comment" && activityMeta(activity, "comment_preview") && (
                      <p className="mt-1.5 break-words rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                        {activityMeta(activity, "comment_preview")}
                      </p>
                    )}
                    <time className="mt-1.5 block text-[11px] text-slate-400" dateTime={activity.created_at} title={exactTime}>
                      {relativeTime(activity.created_at)}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              Menampilkan {activities.length} dari {total} aktivitas
            </span>
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
              >
                {loading ? "Memuat..." : "Tampilkan lebih banyak"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
