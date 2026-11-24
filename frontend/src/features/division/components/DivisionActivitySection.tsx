import { useCallback, useEffect, useState } from "react";
import {
  History,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import DatePickerField from "@/features/my-work/components/DatePickerField";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { getLocale, translate } from "@/i18n/translate";
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

type LocalizedLabel = { id: string; en: string };

const FILTERS: Array<{
  value: DivisionActivityCategory;
  label: string;
  labelEn: string;
}> = [
  { value: "all", label: "Semua aktivitas", labelEn: "All activity" },
  { value: "create", label: "Dibuat", labelEn: "Created" },
  { value: "update", label: "Diperbarui", labelEn: "Updated" },
  { value: "delete", label: "Dihapus", labelEn: "Deleted" },
  { value: "comment", label: "Komentar", labelEn: "Comments" },
];

const entityLabels: Record<string, LocalizedLabel> = {
  division: { id: "Divisi", en: "Division" },
  workspace: { id: "Workspace", en: "Workspace" },
  campaign: { id: "Campaign", en: "Campaign" },
  board: { id: "Board", en: "Board" },
  card: { id: "Kartu", en: "Card" },
  task: { id: "Task", en: "Task" },
  subtask: { id: "Subtask", en: "Subtask" },
  card_comment: { id: "Komentar", en: "Comment" },
  card_attachment: { id: "Lampiran", en: "Attachment" },
  card_brief_attachment: { id: "Lampiran brief", en: "Brief attachment" },
  form: { id: "Form", en: "Form" },
  form_field: { id: "Kolom form", en: "Form field" },
  brand: { id: "Brand", en: "Brand" },
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

const actionLabels: Record<string, LocalizedLabel> = {
  created: { id: "Buat", en: "Create" },
  updated: { id: "Perbarui", en: "Update" },
  deleted: { id: "Hapus", en: "Delete" },
  added: { id: "Buat", en: "Create" },
  removed: { id: "Hapus", en: "Delete" },
  attached: { id: "Buat", en: "Create" },
  detached: { id: "Hapus", en: "Delete" },
  assigned: { id: "Perbarui", en: "Update" },
  unassigned: { id: "Hapus", en: "Delete" },
  moved: { id: "Perbarui", en: "Update" },
  completed: { id: "Perbarui", en: "Update" },
  reopened: { id: "Perbarui", en: "Update" },
  reordered: { id: "Perbarui", en: "Update" },
};

const activityTypeLabels: Record<string, LocalizedLabel> = {
  create: { id: "Buat", en: "Create" },
  update: { id: "Perbarui", en: "Update" },
  delete: { id: "Hapus", en: "Delete" },
  comment: { id: "Komentar", en: "Comment" },
};

function actionLabel(activity: DivisionActivity): string {
  if (activity.activity_type === "comment") {
    return translate("Komentar", "Comment");
  }
  const action = activity.action.split(".").pop() ?? activity.action;
  const label = actionLabels[action] ?? activityTypeLabels[activity.activity_type];
  return label
    ? translate(label.id, label.en)
    : activity.activity_type[0].toUpperCase() + activity.activity_type.slice(1);
}

function activityIcon(activity: DivisionActivity) {
  if (activity.activity_type === "comment") return MessageSquareText;
  if (activity.activity_type === "create") return Plus;
  if (activity.activity_type === "delete") return Trash2;
  return Pencil;
}

function activityIconClass(activity: DivisionActivity): string {
  if (activity.activity_type === "comment") {
    return "bg-accent-soft text-accent";
  }
  if (activity.activity_type === "create") {
    return "bg-success-soft text-success";
  }
  if (activity.activity_type === "delete") {
    return "bg-danger-soft text-danger";
  }
  return "bg-info-soft text-info";
}

function activityText(activity: DivisionActivity): string {
  if (activity.description?.trim()) return activity.description;

  const subject = entityLabels[activity.entity_type]
    ? translate(
        entityLabels[activity.entity_type].id,
        entityLabels[activity.entity_type].en,
      )
    : activity.entity_type;
  const verb = actionLabel(activity).toLowerCase();
  return `${verb} ${subject.toLowerCase()}`;
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "-";

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
  });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return formatter.format(days, "day");
  return new Date(value).toLocaleDateString(getLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DivisionActivitySection({ divisionId }: Props) {
  const { t, locale, language } = useLanguage();
  const [category, setCategory] = useState<DivisionActivityCategory>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activities, setActivities] = useState<DivisionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const realtimeRevision = useRealtimeRevision(REALTIME_RESOURCES);
  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const fetchActivities = useCallback(
    async (requestedPage: number, append: boolean) => {
      if (!divisionId || dateRangeInvalid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
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
      } catch (err) {
        console.error("Gagal memuat aktivitas division", err);
        setError(
          t(
            "Gagal memuat aktivitas. Silakan coba lagi.",
            "Failed to load activity. Please try again.",
          ),
        );
        if (!append) {
          setActivities([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [category, dateFrom, dateRangeInvalid, dateTo, divisionId, language, t],
  );

  useEffect(() => {
    setActivities([]);
    setPage(1);
    if (dateRangeInvalid) {
      setTotal(0);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }
    void fetchActivities(1, false);
  }, [dateRangeInvalid, fetchActivities, realtimeRevision]);

  const loadMore = () => {
    if (!loading && hasMore) void fetchActivities(page + 1, true);
  };

  return (
    <section className="rounded-panel border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-muted">
            <History size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-heading text-fg">
              {t("Aktivitas divisi", "Division activity")}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t(
                "Jejak perubahan untuk audit dan pemantauan tim.",
                "Change history for auditing and team monitoring.",
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center justify-end gap-2">
            <label htmlFor="division-activity-filter" className="sr-only">
              {t("Filter aktivitas", "Filter activity")}
            </label>
            <select
              id="division-activity-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value as DivisionActivityCategory)}
              className="h-9 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
            >
              {FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {t(filter.label, filter.labelEn)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void fetchActivities(1, false)}
              disabled={loading || dateRangeInvalid}
              aria-label={t("Muat ulang aktivitas", "Reload activity")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  loading
                    ? "animate-spin motion-reduce:animate-none"
                    : undefined
                }
              />
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-end gap-2">
            <div>
              <label htmlFor="division-activity-date-from" className="mb-1 block text-2xs font-medium text-fg-subtle">
                {t("Dari tanggal", "From date")}
              </label>
              <DatePickerField
                id="division-activity-date-from"
                value={dateFrom}
                onChange={setDateFrom}
                maxDate={dateTo || undefined}
                placeholder={t("Pilih tanggal", "Select date")}
                className="w-44"
              />
            </div>
            <div>
              <label htmlFor="division-activity-date-to" className="mb-1 block text-2xs font-medium text-fg-subtle">
                {t("Sampai tanggal", "To date")}
              </label>
              <DatePickerField
                id="division-activity-date-to"
                value={dateTo}
                minDate={dateFrom || undefined}
                onChange={setDateTo}
                placeholder={t("Pilih tanggal", "Select date")}
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
                className="h-9 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              >
                {t("Reset", "Reset")}
              </button>
            )}
          </div>
          {dateRangeInvalid && (
            <p className="text-right text-2xs font-medium text-danger">
              {t(
                "Tanggal mulai harus sebelum atau sama dengan tanggal akhir.",
                "The start date must be before or equal to the end date.",
              )}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex flex-col gap-2 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchActivities(1, false)}
            className="inline-flex h-8 w-fit items-center gap-1.5 rounded-control border border-danger/25 bg-surface px-3 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {t("Coba lagi", "Try again")}
          </button>
        </div>
      ) : loading && activities.length === 0 ? (
        <div className="mt-6 space-y-3" role="status" aria-busy="true">
          <span className="sr-only">
            {t("Memuat aktivitas division", "Loading division activity")}
          </span>
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-3 rounded-card border border-line p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={History}
          title={t(
            "Belum ada aktivitas untuk filter ini",
            "No activity for this filter yet",
          )}
          description={t(
            "Aktivitas baru akan muncul otomatis saat ada perubahan di division.",
            "New activity will appear automatically when the division changes.",
          )}
          className="mt-5"
        />
      ) : (
        <>
          <div className="mt-5 divide-y divide-line">
            {activities.map((activity) => {
              const Icon = activityIcon(activity);
              const exactTime = new Date(activity.created_at).toLocaleString(locale, {
                dateStyle: "full",
                timeStyle: "short",
              });
              const actor = activity.user?.name ?? t("Sistem", "System");
              const entity = entityLabels[activity.entity_type]
                ? t(
                    entityLabels[activity.entity_type].id,
                    entityLabels[activity.entity_type].en,
                  )
                : activity.entity_type;

              return (
                <article key={activity.id} className="flex gap-2.5 py-3.5 first:pt-0 last:pb-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activityIconClass(activity)}`}>
                    <Icon size={14} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs leading-5 text-fg-muted">
                        <span className="font-medium text-fg">{actor}</span>{" "}
                        {activityText(activity)}
                      </p>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
                        {entity}
                      </span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
                        {actionLabel(activity)}
                      </span>
                    </div>
                    {activity.entity_type === "card_comment" && activityMeta(activity, "comment_preview") && (
                      <p className="mt-1.5 break-words rounded-[7px] bg-surface-muted/60 px-2 py-1.5 text-2xs leading-4 text-fg-muted">
                        {activityMeta(activity, "comment_preview")}
                      </p>
                    )}
                    <time className="mt-1 block text-2xs text-fg-subtle" dateTime={activity.created_at} title={exactTime}>
                      {relativeTime(activity.created_at)}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-2xs tabular-nums text-fg-subtle">
              {t(
                "Menampilkan {shown} dari {total} aktivitas",
                "Showing {shown} of {total} activities",
                { shown: activities.length, total },
              )}
            </span>
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="text-xs font-medium text-accent transition-colors hover:text-accent-strong disabled:opacity-50"
              >
                {loading
                  ? t("Memuat…", "Loading…")
                  : t("Tampilkan lebih banyak", "Show more")}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
