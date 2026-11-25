import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import CardDetailModal from '@/features/card/components/CardDetailModal';
import type { Card } from '@/features/card/types';
import { useCalendar } from '../hooks/useCalendar';
import { Task, User, DayData, GridDayCell } from '../types';
import CalendarCardCreateModal from './CalendarCardCreateModal';
import { isMobileApp } from '@/lib/mobileConfig';
import { useIsCompactViewport } from '@/hooks/useIsCompactViewport';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

// --- CONSTANTS ---
const WEEK_DAYS: Array<{ id: string; en: string }> = [
  { id: 'Minggu', en: 'Sunday' },
  { id: 'Senin', en: 'Monday' },
  { id: 'Selasa', en: 'Tuesday' },
  { id: 'Rabu', en: 'Wednesday' },
  { id: 'Kamis', en: 'Thursday' },
  { id: 'Jumat', en: 'Friday' },
  { id: 'Sabtu', en: 'Saturday' },
];

export const CalendarView: React.FC = () => {
  const { currentMonth, data, loading, prevMonth, nextMonth, goToToday, gridDays, refresh } = useCalendar();
  const { can } = useAuth();
  const { t, locale } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const nativeApp = isMobileApp();
  const compactViewport = useIsCompactViewport();
  // Grid kompak dipakai di aplikasi native maupun browser HP/tablet.
  const compactLayout = nativeApp || compactViewport;

  // State untuk tooltip
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; rect: DOMRect } | null>(null);

  // --- FORMATTERS ---
  const formatHeaderMonth = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    return new Date(Number(year), parseInt(month, 10) - 1, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateLabel = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const safeDateStr = dateStr.replace(' ', 'T');
    const date = new Date(safeDateStr);
    if (isNaN(date.getTime())) return t('Format Salah', 'Invalid format');
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  // Format tanggal lokal (bukan UTC) agar konsisten dengan dateString yang dipakai grid
  const getLocalDateString = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // --- DATA HANDLER ---
  const getDayData = (dateStr: string): DayData | null => {
    if (!data || !data.days) return null;
    return data.days[dateStr] ?? null;
  };

  const selectedDayData = selectedDate
    ? getDayData(selectedDate) ?? { total: 0, tasks: [] }
    : null;
  const totalTasks = data?.summary?.total_tasks ?? 0;
  const todayStr = getLocalDateString(new Date());
  const todayMonth = todayStr.slice(0, 7);
  const isInitialLoading = loading && !data;
  const isCurrentMonth = currentMonth === todayMonth;
  const canCreateCard = can('card.create');
  const canOpenCard = can('card.view') || can('task.view');

  const agendaDays = compactLayout && data
    ? gridDays
        .filter((cell) => cell.isCurrentMonth)
        .map((cell) => ({
          cell,
          dayData: getDayData(cell.dateString),
        }))
        .filter(
          (entry): entry is { cell: GridDayCell; dayData: DayData } =>
            Boolean(entry.dayData && entry.dayData.total > 0),
        )
        .sort((a, b) => a.cell.dateString.localeCompare(b.cell.dateString))
    : [];

  const openTask = (task: Task) => {
    if (!canOpenCard) return;

    setHoveredTask(null);
    setSelectedCard({
      id: task.id,
      title: task.title,
      board_id: task.board?.id ?? '',
      campaign_id: task.campaign?.id,
      campaign: task.campaign ?? undefined,
      due_date: task.due_date,
      created_at: task.created_at,
    });
  };

  return (
    <div className="relative w-full select-none font-sans text-fg">

      {/* --- HEADER NAVBAR --- */}
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-heading text-fg sm:text-2xl">
            {formatHeaderMonth(currentMonth)}
          </h1>
          {loading ? (
            <div
              className="flex items-center gap-2 rounded-control bg-surface-muted px-2.5 py-1"
              role="status"
              aria-live="polite"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle" aria-hidden="true" />
              <span className="text-[11px] font-medium text-fg-muted">{t("Memuat…", "Loading…")}</span>
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium tabular-nums text-fg-muted">
              {t("{count} task", "{count} tasks", { count: totalTasks })}
            </span>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={goToToday}
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Hari ini", "Today")}
            </button>
          ) : null}
          {canCreateCard && (
            <button
              type="button"
              onClick={() => setCreateDate(selectedDate ?? todayStr)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong sm:flex-none"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("Buat card", "Create card")}
            </button>
          )}
          <div className="flex items-center overflow-hidden rounded-control border border-line bg-surface">
            <button
              onClick={prevMonth}
              className="flex h-9 w-9 items-center justify-center text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              title={t("Bulan sebelumnya", "Previous month")}
              aria-label={t("Bulan sebelumnya", "Previous month")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="h-5 w-px bg-line" />
            <button
              onClick={nextMonth}
              className="flex h-9 w-9 items-center justify-center text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              title={t("Bulan berikutnya", "Next month")}
              aria-label={t("Bulan berikutnya", "Next month")}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {!loading && data && totalTasks === 0 ? (
        <div className="mb-4 flex flex-col gap-3 rounded-panel border border-dashed border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-subtle">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium text-fg">{t("Belum ada task di bulan ini", "No tasks this month")}</p>
              <p className="mt-0.5 text-[11px] text-fg-muted">{t("Pilih tanggal untuk menjadwalkan pekerjaan baru.", "Pick a date to schedule new work.")}</p>
            </div>
          </div>
          {canCreateCard ? (
            <button
              type="button"
              onClick={() => setCreateDate(todayStr)}
              className="inline-flex h-8 items-center gap-1.5 self-start rounded-control bg-accent px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Buat card", "Create card")}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* --- CALENDAR GRID --- */}
      <div
        className={`${compactLayout ? 'overflow-hidden' : 'overflow-x-auto'} rounded-panel border border-line bg-surface`}
        aria-busy={loading}
      >

        {/* Header Hari */}
        <div className={`grid grid-cols-7 border-b border-line bg-surface-muted/50 ${compactLayout ? 'min-w-0' : 'min-w-[760px]'}`}>
          {WEEK_DAYS.map((day) => {
            const label = t(day.id, day.en);
            return (
              <div key={day.id} className={compactLayout ? 'py-1.5 text-center text-[10px] font-medium text-fg-subtle' : 'py-2.5 pr-3 text-right text-[11px] font-medium text-fg-subtle'}>
                {compactLayout ? label.slice(0, 3) : label}
              </div>
            );
          })}
        </div>

        {/* Matriks Kotak */}
        <div className={`grid grid-cols-7 gap-px bg-line ${compactLayout ? 'min-w-0 auto-rows-[72px]' : 'min-w-[760px] auto-rows-[160px]'}`}>
          {isInitialLoading ? (
            Array.from({ length: 35 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className={`flex flex-col gap-2 bg-surface p-2.5 ${compactLayout ? 'h-[72px]' : 'h-[160px]'}`}
              >
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : gridDays.map((cell: GridDayCell, idx: number) => {
            const dayData = getDayData(cell.dateString);
            const tasks = dayData ? dayData.tasks : [];
            const totalTasksOnDay = dayData ? dayData.total : 0;
            const isToday = cell.dateString === todayStr;
            const weekday = new Date(`${cell.dateString}T00:00:00`).getDay();
            const isWeekend = weekday === 0 || weekday === 6;

            return (
              <div
                key={`${cell.dateString}-${idx}`}
                onClick={() => setSelectedDate(cell.dateString)}
                className={`relative flex cursor-pointer flex-col transition-colors ${compactLayout ? 'h-[72px] p-1' : 'h-[160px] p-2.5'} ${
                  cell.isCurrentMonth
                    ? (isToday
                        ? 'bg-accent-soft/40 hover:bg-accent-soft/60'
                        : isWeekend
                          ? 'bg-surface-muted/30 hover:bg-surface-hover'
                          : 'bg-surface hover:bg-surface-hover')
                    : 'bg-surface-muted/50 text-fg-subtle hover:bg-surface-muted'
                } group`}
              >
                {/* Tanggal */}
                <div className={`flex items-center justify-between ${compactLayout ? 'mb-1' : 'mb-3'}`}>
                  <span className="flex-1">
                    {canCreateCard && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCreateDate(cell.dateString);
                        }}
                        className={`${compactLayout ? 'hidden' : 'flex'} size-7 items-center justify-center rounded-control text-fg-subtle opacity-0 transition-colors hover:bg-accent-soft hover:text-accent group-hover:opacity-100 focus:opacity-100`}
                        title={t("Buat card tanggal {date}", "Create card on {date}", { date: formatDateLabel(cell.dateString) })}
                        aria-label={t("Buat card tanggal {date}", "Create card on {date}", { date: formatDateLabel(cell.dateString) })}
                      >
                        <Plus className="size-4" />
                      </button>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedDate(cell.dateString);
                    }}
                    aria-label={
                      totalTasksOnDay > 0
                        ? t("Buka {date}, {count} task", "Open {date}, {count} tasks", {
                            date: formatDateLabel(cell.dateString),
                            count: totalTasksOnDay,
                          })
                        : t("Buka {date}, belum ada task", "Open {date}, no tasks", {
                            date: formatDateLabel(cell.dateString),
                          })
                    }
                    className={`${compactLayout ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm'} flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      isToday ? 'bg-accent text-accent-fg' : 'text-fg group-hover:bg-surface-muted'
                    } ${!cell.isCurrentMonth && !isToday && 'text-fg-subtle'}`}
                  >
                    {cell.dayNumber}
                  </button>
                </div>

                {/* List Tasks (maksimal 3) */}
                <div className={compactLayout ? 'hidden' : 'flex-1 space-y-1.5 overflow-y-auto scrollbar-none'}>
                  {tasks.slice(0, 3).map((task: Task) => {
                    const isCompleted = task.status === 'completed' || task.status === 'done';
                    const creatorName = task.creator?.name || t('Tidak diketahui', 'Unknown');
                    const assigneeNames = task.assignees?.map((a) => a.name).join(', ') || t('Belum ada assignee', 'No assignees');

                    return (
                      <div
                        key={task.id}
                        role={canOpenCard ? 'button' : undefined}
                        tabIndex={canOpenCard ? 0 : undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          openTask(task);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            openTask(task);
                          }
                        }}
                        className={`group/task flex items-center gap-2 rounded-[6px] border px-2 py-1.5 transition-colors ${
                          isCompleted
                            ? 'border-transparent opacity-60 hover:opacity-100'
                            : 'border-line bg-surface hover:border-line-strong hover:bg-surface-hover'
                        } ${canOpenCard ? 'cursor-pointer' : ''}`}
                        title={`${task.title} — ${t('Dibuat: {creator}', 'Created by: {creator}', { creator: creatorName })} — Assignee: ${assigneeNames}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTask({ task, rect });
                        }}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        {/* Status Icon */}
                        <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-[3px] border ${
                          isCompleted
                            ? 'border-success bg-success'
                            : 'border-warning bg-warning'
                        }`} />

                        {/* Judul + Nama Assignee */}
                        <span className={`truncate text-xs ${
                          isCompleted ? 'text-fg-subtle line-through' : 'text-fg'
                        }`}>
                          <span className="font-medium">{task.title}</span>
                          <span className="font-normal text-fg-muted"> · {assigneeNames}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {compactLayout && totalTasksOnDay > 0 ? (
                  <div className="mt-auto flex items-center justify-center gap-0.5 truncate rounded-[5px] bg-accent-soft px-0.5 py-0.5 text-[10px] font-medium text-accent">
                    {totalTasksOnDay}
                    <span className="hidden 2xsm:inline"> {t("task", "tasks")}</span>
                  </div>
                ) : null}

                {/* Indikator Overflow */}
                {!compactLayout && totalTasksOnDay > 3 && (
                  <div className="mt-1 border-t border-line pt-1 text-center text-[10px] font-medium text-fg-subtle">
                    +{totalTasksOnDay - 3} {t("lainnya", "more")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {compactLayout && agendaDays.length > 0 ? (
        <section className="mt-4" aria-label={t("Agenda bulan ini", "This month's agenda")}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium text-fg-muted">
              {t("Agenda bulan ini", "This month's agenda")}
            </h2>
            <span className="text-2xs text-fg-subtle">
              {t("{count} hari dengan task", "{count} days with tasks", { count: agendaDays.length })}
            </span>
          </div>

          <div className="space-y-1.5">
            {agendaDays.slice(0, 10).map(({ cell, dayData }) => {
              const date = new Date(`${cell.dateString}T00:00:00`);
              const weekday = date.toLocaleDateString(locale, {
                weekday: "short",
              });
              const dayNumber = date.getDate();
              const preview = dayData.tasks
                .slice(0, 2)
                .map((task) => task.title)
                .join(" · ");

              return (
                <button
                  key={cell.dateString}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateString)}
                  className="flex w-full items-start gap-2.5 rounded-card border border-line bg-surface p-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-control bg-surface-muted">
                    <span className="text-[9px] font-medium text-fg-subtle">
                      {weekday}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-fg">
                      {dayNumber}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-fg">
                        {date.toLocaleDateString(locale, {
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium tabular-nums text-accent">
                        {t("{count} task", "{count} tasks", { count: dayData.total })}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-fg-muted">
                      {preview || t("Buka detail tanggal", "Open date details")}
                      {dayData.total > 2 ? ` · +${dayData.total - 2}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* --- MODAL DIALOG --- */}
      {selectedDate && selectedDayData ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-day-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t("Tutup detail tanggal", "Close date details")}
            onClick={() => setSelectedDate(null)}
          />

          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-modal border border-line bg-canvas shadow-e3 animate-in fade-in slide-in-from-bottom-2 duration-200 sm:rounded-modal">
            <div className="flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="calendar-day-title" className="text-lg font-semibold text-fg">
                  {formatDateLabel(selectedDate)}
                </h2>
                <p className="mt-1 text-xs text-fg-muted">
                  {t("{count} task terjadwal", "{count} tasks scheduled", { count: selectedDayData.total })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {canCreateCard ? (
                  <button
                    type="button"
                    onClick={() => setCreateDate(selectedDate)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {t("Buat card", "Create card")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  aria-label={t("Tutup detail tanggal", "Close date details")}
                  className="flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-canvas p-4 sm:p-6">
              {selectedDayData.tasks.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title={t("Belum ada card pada tanggal ini", "No cards on this date")}
                  description={t("Buat card untuk menjadwalkan pekerjaan pada tanggal ini.", "Create a card to schedule work on this date.")}
                  action={
                    canCreateCard
                      ? { label: t("Buat card", "Create card"), onClick: () => setCreateDate(selectedDate) }
                      : undefined
                  }
                />
              ) : (
                selectedDayData.tasks.map((task: Task) => {
                  const isCompleted =
                    task.status === "completed" || task.status === "done";

                  return (
                    <div
                      key={task.id}
                      role={canOpenCard ? "button" : undefined}
                      tabIndex={canOpenCard ? 0 : undefined}
                      onClick={() => openTask(task)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openTask(task);
                        }
                      }}
                      className={`group flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5 transition-colors hover:border-line-strong hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between ${
                        canOpenCard ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            isCompleted ? "bg-success" : "bg-warning"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">
                            {task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
                            <span>
                              {t("Dibuat oleh {name}", "Created by {name}", {
                                name: task.creator?.name || t("Tidak diketahui", "Unknown"),
                              })}
                            </span>
                            {task.campaign?.name ? (
                              <span className="rounded-full bg-surface-muted px-2 py-0.5">
                                {task.campaign.name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:justify-end sm:border-0 sm:pt-0">
                        <span className="text-[11px] text-fg-subtle">
                          {task.due_date
                            ? t("Deadline {date}", "Deadline {date}", { date: formatShortDate(task.due_date) })
                            : t("Dibuat {date}", "Created {date}", { date: formatShortDate(task.created_at) })}
                        </span>

                        <div className="flex items-center gap-3">
                          {task.assignees && task.assignees.length > 0 ? (
                            <div className="flex -space-x-1.5">
                              {task.assignees.slice(0, 3).map((user: User) => (
                                <span
                                  key={user.id}
                                  title={user.name}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent ring-2 ring-surface"
                                >
                                  {user.name.substring(0, 2).toUpperCase()}
                                </span>
                              ))}
                              {task.assignees.length > 3 ? (
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-[9px] font-medium text-fg-muted ring-2 ring-surface">
                                  +{task.assignees.length - 3}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[11px] text-fg-subtle">
                              {t("Belum ada assignee", "No assignees")}
                            </span>
                          )}
                          {canOpenCard ? (
                            <ExternalLink
                              className="h-3.5 w-3.5 text-fg-subtle transition-colors group-hover:text-accent"
                              aria-label={t("Buka detail card", "Open card details")}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* --- TOOLTIP --- */}
      {hoveredTask && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[100] hidden max-w-xs rounded-card bg-fg p-3 text-xs text-canvas shadow-e3 sm:block"
          style={{
            left: hoveredTask.rect.left + hoveredTask.rect.width / 2,
            top: hoveredTask.rect.top - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="mb-0.5 border-b border-canvas/20 pb-1 font-medium">
              {hoveredTask.task.title}
            </div>
            <div>
              <span className="font-medium">{t("Dibuat oleh:", "Created by:")}</span>{' '}
              {hoveredTask.task.creator?.name || t('Tidak diketahui', 'Unknown')}
            </div>
            <div>
              <span className="font-medium">{t("Anggota:", "Members:")}</span>{' '}
              {hoveredTask.task.assignees && hoveredTask.task.assignees.length > 0
                ? hoveredTask.task.assignees.map((a) => a.name).join(', ')
                : t('Belum ada', 'None yet')}
            </div>
            <div>
              <span className="font-medium">Campaign:</span>{' '}
              {hoveredTask.task.campaign?.name || '-'}
            </div>
            <div className="text-[11px] text-canvas/70">
              {formatShortDate(hoveredTask.task.created_at)}
              {hoveredTask.task.due_date && (
                <> · {t("Deadline", "Deadline")} {formatShortDate(hoveredTask.task.due_date)}</>
              )}
            </div>
          </div>
          {/* Segitiga penunjuk */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-8 border-transparent border-t-fg" />
        </div>
      )}

      {createDate && (
        <CalendarCardCreateModal
          date={createDate}
          onClose={() => setCreateDate(null)}
          onCreated={(card) => {
            setCreateDate(null);
            refresh();
            setSelectedCard(card);
          }}
        />
      )}

      <CardDetailModal
        card={selectedCard}
        isOpen={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        onUpdated={(updated) => {
          if (updated?.id) {
            setSelectedCard((current) =>
              current?.id === updated.id
                ? ({ ...current, ...updated } as Card)
                : current,
            );
            if ("due_date" in updated) refresh();
            return;
          }
          refresh();
        }}
        onDeleted={() => {
          setSelectedCard(null);
          refresh();
        }}
      />

    </div>
  );
};
