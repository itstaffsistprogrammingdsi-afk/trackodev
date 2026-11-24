import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ZoomIn, ZoomOut } from "lucide-react";

import { getCampaignGantt } from "../api/campaign.api";
import type { GanttTask } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  campaignId: string;
};

const MIN_DAY_WIDTH = 14;
const MAX_DAY_WIDTH = 40;
const DEFAULT_DAY_WIDTH = 22;
const TASK_COLUMN_WIDTH = 220;

const statusStyles: Record<
  string,
  { bar: string; dot: string; label: string; labelEn: string }
> = {
  completed: {
    bar: "border-success/20 bg-success-soft text-success",
    dot: "bg-success",
    label: "Selesai",
    labelEn: "Completed",
  },
  in_progress: {
    bar: "border-accent/20 bg-accent-soft text-accent",
    dot: "bg-accent",
    label: "Berjalan",
    labelEn: "In progress",
  },
  todo: {
    bar: "border-line bg-surface-muted text-fg-muted",
    dot: "bg-fg-subtle",
    label: "Belum dimulai",
    labelEn: "Not started",
  },
};

export default function CampaignGantt({ campaignId }: Props) {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDays, setTotalDays] = useState(30);
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const realtimeRevision = useRealtimeRevision([
    "Board", "Card", "Subtask", "Task",
  ]);

  useEffect(() => {
    const fetchGantt = async () => {
      if (!campaignId) return;

      setLoading(true);

      try {
        const data = await getCampaignGantt(campaignId);
        setTasks(data.tasks ?? []);
        setTotalDays(data.total_days ?? 30);
      } catch (error) {
        console.error("GANTT ERROR:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGantt();
  }, [campaignId, realtimeRevision]);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [totalDays]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );
  const completionRate = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  const decreaseZoom = () =>
    setDayWidth((current) => Math.max(MIN_DAY_WIDTH, current - 4));
  const increaseZoom = () =>
    setDayWidth((current) => Math.min(MAX_DAY_WIDTH, current + 4));

  if (loading) {
    return (
      <div
        className="rounded-panel border border-line bg-surface p-5"
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">
          {t("Memuat jadwal campaign", "Loading campaign schedule")}
        </span>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[180px_1fr] items-center gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="rounded-panel border border-line bg-surface p-5">
        <EmptyState
          icon={CalendarRange}
          title={t("Belum ada jadwal", "No schedule yet")}
          description={t(
            "Timeline muncul setelah card memiliki rentang tanggal pengerjaan.",
            "The timeline appears once cards have a work date range.",
          )}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="border-b border-line p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              {t("Jadwal campaign", "Campaign schedule")}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t(
                "{tasks} task · {days} hari · {completed} selesai",
                "{tasks} tasks · {days} days · {completed} completed",
                {
                  tasks: tasks.length,
                  days: totalDays,
                  completed: completedCount,
                },
              )}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div
                className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuenow={completionRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(
                  "Progress penyelesaian task campaign",
                  "Campaign task completion progress",
                )}
              >
                <div
                  className="h-full rounded-full bg-success transition-[width] duration-300 ease-soft"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-[11px] font-medium tabular-nums text-fg-muted">
                {completionRate}%
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[3px] border border-line bg-surface-muted" aria-hidden="true" />
                {t("Belum dimulai", "Not started")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[3px] bg-accent" aria-hidden="true" />
                {t("Berjalan", "In progress")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[3px] bg-success" aria-hidden="true" />
                {t("Selesai", "Completed")}
              </span>
            </div>

            <div className="flex items-center rounded-control border border-line bg-surface-muted p-1">
              <button
                type="button"
                onClick={decreaseZoom}
                disabled={dayWidth <= MIN_DAY_WIDTH}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("Perkecil timeline", "Zoom out timeline")}
                title={t("Perkecil timeline", "Zoom out timeline")}
              >
                <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="min-w-8 text-center text-[10px] font-medium tabular-nums text-fg-subtle">
                {Math.round((dayWidth / DEFAULT_DAY_WIDTH) * 100)}%
              </span>
              <button
                type="button"
                onClick={increaseZoom}
                disabled={dayWidth >= MAX_DAY_WIDTH}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("Perbesar timeline", "Zoom in timeline")}
                title={t("Perbesar timeline", "Zoom in timeline")}
              >
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="p-5"
          style={{ minWidth: TASK_COLUMN_WIDTH + totalDays * dayWidth }}
        >
          <div
            className="grid border-b border-line pb-2 text-[10px] font-medium text-fg-subtle"
            style={{
              gridTemplateColumns: `${TASK_COLUMN_WIDTH}px repeat(${totalDays}, ${dayWidth}px)`,
            }}
          >
            <div className="sticky left-0 z-10 bg-surface pl-3 text-fg-muted">
              {t("Task")}
            </div>

            {days.map((day) => (
              <div key={day} className="border-l border-line text-center tabular-nums">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1">
            {tasks.map((task) => {
              // backend start dimulai dari 1
              const left = ((task.start - 1) / totalDays) * 100;
              const width = (task.length / totalDays) * 100;
              const status = statusStyles[task.status] ?? statusStyles.todo;
              const endDay = task.start + task.length - 1;

              return (
                <div
                  key={task.id}
                  className="group grid items-center rounded-control transition-colors hover:bg-surface-muted/50"
                  style={{
                    gridTemplateColumns: `${TASK_COLUMN_WIDTH}px ${totalDays * dayWidth}px`,
                  }}
                >
                  <div
                    className="sticky left-0 z-10 truncate border-r border-line bg-surface px-3 py-2 text-xs font-medium text-fg group-hover:bg-surface-muted/50"
                    title={task.name}
                  >
                    {task.name}
                  </div>

                  <div className="relative m-1 h-7 overflow-hidden rounded-[6px] border border-line bg-surface-muted/40">
                    <div
                      className="absolute inset-0 grid"
                      style={{
                        gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`,
                      }}
                      aria-hidden="true"
                    >
                      {days.map((day) => (
                        <div key={day} className="border-l border-line/70 first:border-l-0" />
                      ))}
                    </div>

                    <div
                      role="img"
                      className={`absolute top-0 flex h-full items-center gap-1.5 rounded-[5px] border px-2 text-[10px] font-medium ${status.bar}`}
                      style={{
                        left: `${Math.max(left, 0)}%`,
                        width: `${Math.max(width, 3)}%`,
                      }}
                      title={`${task.name} — ${t(status.label, status.labelEn)} · ${t("hari", "day")} ${task.start}–${endDay}`}
                      aria-label={`${task.name}, ${t(status.label, status.labelEn)}, ${t("hari", "day")} ${task.start} ${t("sampai", "to")} ${endDay}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                      <span className="truncate">
                        {task.name.length > 20
                          ? `${task.name.slice(0, 20)}…`
                          : task.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="border-t border-line px-5 py-2 text-[10px] text-fg-subtle lg:hidden">
        {t(
          "Geser ke samping untuk melihat seluruh timeline.",
          "Scroll sideways to see the full timeline.",
        )}
      </p>
    </div>
  );
}
