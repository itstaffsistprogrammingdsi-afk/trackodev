import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { getCampaignGantt } from "../api/campaign.api";
import type { GanttTask } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  campaignId: string;
};

type MonthGroup = {
  key: string;
  label: string;
  startIndex: number;
  days: number;
};

const MIN_DAY_WIDTH = 14;
const MAX_DAY_WIDTH = 40;
const MIN_FIT_DAY_WIDTH = 3;
const DEFAULT_DAY_WIDTH = 22;
const TASK_COLUMN_WIDTH = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function parseStartDate(value?: string | null): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export default function CampaignGantt({ campaignId }: Props) {
  const { t, locale } = useLanguage();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDays, setTotalDays] = useState(30);
  const [startDateValue, setStartDateValue] = useState<string | null>(null);
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const [fitMode, setFitMode] = useState(true);
  const [focusMonth, setFocusMonth] = useState("all");
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const realtimeRevision = useRealtimeRevision([
    "Board",
    "Card",
    "Subtask",
    "Task",
  ]);

  useEffect(() => {
    const fetchGantt = async () => {
      if (!campaignId) return;

      setLoading(true);

      try {
        const data = await getCampaignGantt(campaignId);
        setTasks(data.tasks ?? []);
        setStartDateValue(data.start_date ?? null);
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

  useEffect(() => {
    // Campaign panjang dibuka dalam mode Fit agar bar yang berada di ujung
    // timeline tidak terlihat kosong karena berada di luar viewport.
    setFitMode(true);
    setFocusMonth("all");
  }, [campaignId]);

  useEffect(() => {
    if (!scrollEl) return;

    const updateWidth = () => setContainerWidth(scrollEl.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrollEl);

    return () => observer.disconnect();
  }, [scrollEl]);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, index) => index + 1);
  }, [totalDays]);

  const startDate = useMemo(
    () => parseStartDate(startDateValue),
    [startDateValue],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
      }),
    [locale],
  );

  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (!startDate) return [];

    const formatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    });

    const groups: MonthGroup[] = [];

    for (let index = 0; index < totalDays; index += 1) {
      const date = addDays(startDate, index);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const previous = groups[groups.length - 1];

      if (previous?.key === key) {
        previous.days += 1;
      } else {
        groups.push({
          key,
          label: formatter.format(date),
          startIndex: index,
          days: 1,
        });
      }
    }

    return groups;
  }, [startDate, totalDays, locale]);

  const todayIndex = useMemo(() => {
    if (!startDate) return null;

    const startUtc = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const now = new Date();
    const todayUtc = Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const index = Math.floor((todayUtc - startUtc) / DAY_MS) + 1;

    return index >= 1 && index <= totalDays ? index : null;
  }, [startDate, totalDays]);

  const fitDayWidth = useMemo(() => {
    if (containerWidth <= 0) return DEFAULT_DAY_WIDTH;

    const available = Math.max(
      0,
      containerWidth - TASK_COLUMN_WIDTH - 40,
    );

    return Math.max(
      MIN_FIT_DAY_WIDTH,
      Math.min(MAX_DAY_WIDTH, Math.floor(available / Math.max(1, totalDays))),
    );
  }, [containerWidth, totalDays]);

  useEffect(() => {
    if (fitMode) setDayWidth(fitDayWidth);
  }, [fitMode, fitDayWidth]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );
  const completionRate = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  const showDayNumbers = dayWidth >= 12;
  const showDayGrid = dayWidth >= 8;

  const decreaseZoom = () => {
    setFitMode(false);
    setDayWidth((current) => Math.max(MIN_DAY_WIDTH, current - 4));
  };

  const increaseZoom = () => {
    setFitMode(false);
    setDayWidth((current) => Math.min(MAX_DAY_WIDTH, current + 4));
  };

  const toggleFit = () => {
    if (fitMode) {
      setFitMode(false);
      setDayWidth(DEFAULT_DAY_WIDTH);
      return;
    }

    setFitMode(true);
    setDayWidth(fitDayWidth);
  };

  const scrollToDay = (day: number) => {
    if (!scrollEl) return;

    const target =
      TASK_COLUMN_WIDTH + (day - 1) * dayWidth - scrollEl.clientWidth / 2;

    scrollEl.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };

  const handleFocusMonth = (value: string) => {
    setFocusMonth(value);

    if (value === "all" || !scrollEl) return;

    const group = monthGroups.find((item) => item.key === value);
    if (!group) return;

    const target = TASK_COLUMN_WIDTH + group.startIndex * dayWidth;

    scrollEl.scrollTo({ left: Math.max(0, target - 8), behavior: "smooth" });
  };

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
            <div
              key={index}
              className="grid grid-cols-[180px_1fr] items-center gap-3"
            >
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

          <div className="flex flex-col items-start gap-2.5 lg:items-end">
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[3px] border border-line bg-surface-muted"
                  aria-hidden="true"
                />
                {t("Belum dimulai", "Not started")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[3px] bg-accent"
                  aria-hidden="true"
                />
                {t("Berjalan", "In progress")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-[3px] bg-success"
                  aria-hidden="true"
                />
                {t("Selesai", "Completed")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {monthGroups.length > 1 ? (
                <div className="relative">
                  <select
                    value={focusMonth}
                    onChange={(event) => handleFocusMonth(event.target.value)}
                    aria-label={t("Fokus bulan", "Focus month")}
                    title={t("Fokus bulan", "Focus month")}
                    className="h-8 cursor-pointer appearance-none rounded-control border border-line bg-surface pl-2.5 pr-7 text-[11px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
                  >
                    <option value="all">{t("Semua bulan", "All months")}</option>
                    {monthGroups.map((group) => (
                      <option key={group.key} value={group.key}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
                  />
                </div>
              ) : null}

              {todayIndex ? (
                <button
                  type="button"
                  onClick={() => scrollToDay(todayIndex)}
                  title={t("Ke hari ini", "Go to today")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-[11px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("Hari ini", "Today")}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={toggleFit}
                aria-pressed={fitMode}
                title={t("Muat seluruh campaign", "Fit campaign")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  fitMode
                    ? "border-accent/30 bg-accent-soft text-accent"
                    : "border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg"
                }`}
              >
                <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("Muat penuh", "Fit")}
                </span>
              </button>

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
      </div>

      <div ref={setScrollEl} className="overflow-x-auto">
        <div
          className="p-5"
          style={{ minWidth: TASK_COLUMN_WIDTH + totalDays * dayWidth }}
        >
          <div className="relative">
            {monthGroups.length > 0 ? (
              <div
                className="grid border-b border-line pb-1 text-[10px] font-medium text-fg-subtle"
                style={{
                  gridTemplateColumns: `${TASK_COLUMN_WIDTH}px ${monthGroups
                    .map((group) => `${group.days * dayWidth}px`)
                    .join(" ")}`,
                }}
              >
                <div className="sticky left-0 z-10 bg-surface pl-3 text-fg-muted">
                  {t("Task", "Task")}
                </div>
                {monthGroups.map((group) => (
                  <div
                    key={group.key}
                    className="truncate border-l border-line px-2"
                  >
                    {group.label}
                  </div>
                ))}
              </div>
            ) : null}

            {showDayNumbers || monthGroups.length === 0 ? (
              <div
                className="grid border-b border-line pb-2 text-[10px] font-medium text-fg-subtle"
                style={{
                  gridTemplateColumns: `${TASK_COLUMN_WIDTH}px repeat(${totalDays}, ${dayWidth}px)`,
                }}
              >
                <div className="sticky left-0 z-10 bg-surface pl-3 text-fg-muted">
                  {monthGroups.length === 0 ? t("Task", "Task") : ""}
                </div>
                {days.map((day) => {
                  const date = startDate ? addDays(startDate, day - 1) : null;
                  const weekend = date ? isWeekend(date) : false;

                  return (
                    <div
                      key={day}
                      title={
                        date ? dateFormatter.format(date) : undefined
                      }
                      className={`border-l border-line text-center tabular-nums ${
                        todayIndex === day
                          ? "bg-accent-soft font-semibold text-accent"
                          : weekend
                            ? "bg-surface-muted/40"
                            : ""
                      }`}
                    >
                      {date ? date.getDate() : day}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-1">
              {tasks.map((task) => {
                const left = ((task.start - 1) / totalDays) * 100;
                const width = (task.length / totalDays) * 100;
                const status = statusStyles[task.status] ?? statusStyles.todo;
                const endDay = task.start + task.length - 1;
                const barWidth = Math.max(width, 3);
                const barWidthPx = (barWidth / 100) * totalDays * dayWidth;
                const showStatusDot = barWidthPx >= 60;
                const compactBar = barWidthPx < 32;
                const taskStartDate = startDate
                  ? addDays(startDate, task.start - 1)
                  : null;
                const taskEndDate = startDate
                  ? addDays(startDate, endDay - 1)
                  : null;
                const taskRange =
                  taskStartDate && taskEndDate
                    ? `${dateFormatter.format(taskStartDate)} – ${dateFormatter.format(taskEndDate)}`
                    : `${task.start}–${endDay}`;

                return (
                  <div
                    key={task.id}
                    className="group grid items-center rounded-control transition-colors hover:bg-surface-muted/50"
                    style={{
                      gridTemplateColumns: `${TASK_COLUMN_WIDTH}px ${totalDays * dayWidth}px`,
                    }}
                  >
                    <div
                      className="sticky left-0 z-10 line-clamp-2 break-words rounded-[4px] border-r border-line bg-surface px-3 py-1.5 text-xs font-medium leading-4 text-fg group-hover:bg-surface-muted/50"
                      title={task.name}
                    >
                      {task.name}
                    </div>

                    <div className="relative m-1 h-7 rounded-[6px] border border-line bg-surface-muted/40">
                      {showDayGrid ? (
                        <div
                          className="absolute inset-0 grid overflow-hidden rounded-[6px]"
                          style={{
                            gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`,
                          }}
                          aria-hidden="true"
                        >
                          {days.map((day) => {
                            const date = startDate
                              ? addDays(startDate, day - 1)
                              : null;

                            return (
                              <div
                                key={day}
                                className={`border-l border-line/70 first:border-l-0 ${
                                  date && isWeekend(date)
                                    ? "bg-surface-muted/40"
                                    : ""
                                }`}
                              />
                            );
                          })}
                        </div>
                      ) : null}

                      <div
                        role="img"
                        className={`absolute top-0 flex h-full min-w-0 items-center overflow-hidden rounded-[5px] border text-[10px] font-medium ${compactBar ? "gap-0 px-0.5" : "gap-1.5 px-2"} ${status.bar}`}
                        style={{
                          left: `${Math.max(left, 0)}%`,
                          width: `${barWidth}%`,
                        }}
                        title={`${task.name} — ${t(status.label, status.labelEn)} · ${taskRange}`}
                        aria-label={`${task.name}, ${t(status.label, status.labelEn)}, ${taskRange}`}
                      >
                        {showStatusDot ? (
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate overflow-hidden">
                          {task.name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {todayIndex ? (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-accent/50"
                style={{
                  left:
                    TASK_COLUMN_WIDTH +
                    (todayIndex - 1) * dayWidth +
                    dayWidth / 2,
                }}
                aria-hidden="true"
              />
            ) : null}
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
