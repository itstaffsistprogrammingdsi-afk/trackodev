import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2 } from "lucide-react";

import { getOverdueTasks } from "../api/campaign.api";
import type { OverdueTask } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  campaignId: string;
};

export default function OverdueTasks({ campaignId }: Props) {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const realtimeRevision = useRealtimeRevision(["Board", "Card", "Task"]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOverdueTasks(campaignId);
        setData(res ?? []);
      } catch (err) {
        console.error("OVERDUE ERROR:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (!campaignId) return;

    fetch();
  }, [campaignId, realtimeRevision]);

  if (loading) {
    return (
      <div
        className="rounded-panel border border-line bg-surface p-5"
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">
          {t("Memuat task terlambat", "Loading overdue tasks")}
        </span>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-panel border border-line bg-surface p-5">
        <EmptyState
          icon={CheckCircle2}
          title={t("Tidak ada task terlambat", "No overdue tasks")}
          description={t(
            "Semua task berjalan sesuai jadwal pada campaign ini.",
            "All tasks in this campaign are on schedule.",
          )}
        />
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-fg">
            {t("Task terlambat", "Overdue tasks")}
          </h2>
        </div>
        <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-medium tabular-nums text-danger">
          {t("{count} task", "{count} tasks", { count: data.length })}
        </span>
      </div>

      <div className="max-h-[350px] space-y-2 overflow-y-auto">
        {data.map((task) => (
          <div
            key={task.id}
            className="rounded-card border border-line p-3 transition-colors hover:bg-surface-muted/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-fg">{task.title}</div>

                {task.code && (
                  <div className="mt-1 text-[11px] text-fg-subtle">{task.code}</div>
                )}

                {task.due_date && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-fg-muted">
                    <CalendarDays size={11} aria-hidden="true" />
                    {t("Jatuh tempo", "Due")}{" "}
                    {new Date(task.due_date).toLocaleDateString(locale)}
                  </div>
                )}
              </div>

              <span className="whitespace-nowrap text-[11px] font-medium text-danger">
                {task.due_text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
