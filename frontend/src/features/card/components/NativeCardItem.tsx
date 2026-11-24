import { useState } from "react";
import {
  ArrowRightLeft,
  CalendarClock,
  CheckSquare,
  MessageSquare,
  Paperclip,
  PenLine,
  UsersRound,
} from "lucide-react";

import type { Card, CardPriority } from "../types";
import {
  dueDateBadgeClasses,
  getDueDateStatus,
  isCardCompleted,
} from "../utils/dueDate";
import { alertIfMirrorConflict } from "../utils/mirrorConflict";
import {
  priorityBadgeClasses as priorityBadge,
  priorityDotClasses as priorityDot,
  priorityLabels,
} from "../utils/priority";
import { toast } from "@/lib/feedback";
import { useLanguage } from "@/context/LanguageContext";

interface NativeCardItemProps {
  card: Card;
  onOpen?: (card: Card) => void;
  moveTargets?: Array<{ id: string; name: string }>;
  onMove?: (card: Card, boardId: string) => Promise<void>;
}

const formatDueDate = (value: string | null | undefined, locale: string) =>
  value
    ? new Date(value.replace(" ", "T")).toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

export default function NativeCardItem({
  card,
  onOpen,
  moveTargets = [],
  onMove,
}: NativeCardItemProps) {
  const { t, locale } = useLanguage();
  const [isMoving, setIsMoving] = useState(false);
  const brands = card.brands ?? [];
  const labels = card.labels ?? [];
  const assignees = card.assignees ?? [];
  const visibleBrands = brands.slice(0, 1);
  const visibleLabels = labels.slice(0, 2);
  const hiddenTagCount =
    Math.max(0, brands.length - visibleBrands.length) +
    Math.max(0, labels.length - visibleLabels.length);
  const dueDate = formatDueDate(card.due_date, locale);
  const createdDate = card.created_at ? new Date(card.created_at) : null;
  const formattedCreatedDate =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;
  const createdDateTitle =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.toLocaleString(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : undefined;
  const dueStatus = getDueDateStatus(card.due_date, {
    completed: isCardCompleted(card),
    completedAt: card.completed_at,
  });
  const priority = card.priority?.toLowerCase() ?? "";
  const accentColor =
    brands[0]?.color || (priority === "urgent" ? "#b93832" : "#465fff");
  const completedTasks =
    card.completed_tasks_count ??
    card.tasks?.filter((task) => task.is_completed).length ??
    0;
  const tasksCount = card.tasks_count ?? card.tasks?.length ?? 0;
  const commentsCount = card.comments_count ?? card.comments?.length ?? 0;
  const attachmentsCount =
    card.attachments_count ?? card.attachments?.length ?? 0;

  const handleMove = async (boardId: string) => {
    if (!boardId || boardId === card.board_id || !onMove) return;

    try {
      setIsMoving(true);
      await onMove(card, boardId);
    } catch (error) {
      if (alertIfMirrorConflict(error)) return;
      console.error("Move card failed", error);
      toast.error(
        t(
          "Card gagal dipindahkan. Silakan coba lagi.",
          "Failed to move card. Please try again.",
        ),
      );
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <article className="relative overflow-hidden rounded-card border border-line bg-surface shadow-e1">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: accentColor }}
      />

      <button
        type="button"
        onClick={() => onOpen?.(card)}
        aria-label={`${t("Buka detail", "Open details")} ${card.title}`}
        className="block w-full px-4 pb-3 pt-4 text-left outline-none transition-colors active:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1 break-words text-[14px] font-medium leading-5 text-fg">
            {card.title}
          </span>

          {card.priority ? (
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                priorityBadge[priority as CardPriority] ??
                "bg-surface-muted text-fg-muted"
              }`}
              title={`${t("Prioritas", "Priority")} ${t(
                priorityLabels[priority as CardPriority]?.label ?? priority,
                priorityLabels[priority as CardPriority]?.labelEn ?? priority,
              )}`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  priorityDot[priority as CardPriority] ?? "bg-fg-subtle"
                }`}
              />
              {priorityLabels[priority as CardPriority]
                ? t(
                    priorityLabels[priority as CardPriority].label,
                    priorityLabels[priority as CardPriority].labelEn,
                  )
                : card.priority}
            </span>
          ) : null}
        </span>

        {card.created_by || formattedCreatedDate ? (
          <span
            className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] leading-4 text-fg-subtle"
            title={
              createdDateTitle
                ? t("Dibuat {date}", "Created {date}", { date: createdDateTitle })
                : undefined
            }
          >
            <PenLine size={10} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {card.created_by ? (
                <>
                  {t("Dibuat oleh", "Created by")}{" "}
                  <span className="font-medium text-fg-muted">
                    {card.created_by.name}
                  </span>
                </>
              ) : (
                t("Dibuat", "Created")
              )}
              {formattedCreatedDate ? (
                <span> · {formattedCreatedDate}</span>
              ) : null}
            </span>
          </span>
        ) : null}

        {card.is_cross_division_copy ? (
          <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-control bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent">
            <ArrowRightLeft size={11} className="shrink-0" />
            <span className="truncate">
              {t("Lintas divisi", "Cross-division")}
              {card.source_division ? ` · ${card.source_division.name}` : ""}
            </span>
          </span>
        ) : null}

        {visibleBrands.length > 0 || visibleLabels.length > 0 ? (
          <span className="mt-2.5 flex flex-wrap gap-1.5">
            {visibleBrands.map((brand) => (
              <span
                key={`brand-${brand.id}`}
                className="inline-flex min-w-0 max-w-[55%] items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: brand.color || "var(--tracko-fg-subtle)" }}
                />
                <span className="truncate">{brand.name}</span>
              </span>
            ))}
            {visibleLabels.map((label) => (
              <span
                key={`label-${label.id}`}
                className="inline-flex min-w-0 max-w-[45%] items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color || "var(--tracko-fg-subtle)" }}
                />
                <span className="truncate">{label.name}</span>
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
                +{hiddenTagCount}
              </span>
            ) : null}
          </span>
        ) : null}

        <span className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <span className="flex min-w-0 items-center gap-2">
            {assignees.length > 0 ? (
              <>
                <span className="flex -space-x-1.5">
                  {assignees.slice(0, 3).map((user) => (
                    <span
                      key={user.id}
                      title={user.name}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent ring-2 ring-surface"
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  ))}
                </span>
                {assignees.length > 3 ? (
                  <span className="text-[10px] font-medium text-fg-subtle">
                    +{assignees.length - 3}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-fg-subtle">
                <UsersRound size={11} aria-hidden="true" />
                {t("Belum ada member", "No members yet")}
              </span>
            )}

            {commentsCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-fg-subtle">
                <MessageSquare size={11} aria-hidden="true" />
                <span className="tabular-nums">{commentsCount}</span>
              </span>
            ) : null}

            {attachmentsCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-fg-subtle">
                <Paperclip size={11} aria-hidden="true" />
                <span className="tabular-nums">{attachmentsCount}</span>
              </span>
            ) : null}

            {tasksCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-fg-subtle">
                <CheckSquare size={11} aria-hidden="true" />
                <span className="tabular-nums">
                  {completedTasks}/{tasksCount}
                </span>
              </span>
            ) : null}
          </span>

          {dueDate ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueDateBadgeClasses[dueStatus]}`}
            >
              <CalendarClock size={11} aria-hidden="true" />
              {dueStatus === "overdue" ? t("Terlambat", "Overdue") : t("Deadline")} {dueDate}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-fg-subtle">
              <CalendarClock size={11} aria-hidden="true" />
              {t("Tanpa deadline", "No deadline")}
            </span>
          )}
        </span>
      </button>

      {onMove && moveTargets.length > 0 ? (
        <div className="border-t border-line bg-surface-muted/40 px-4 py-3">
          <label className="flex items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-fg-muted">
              <ArrowRightLeft size={12} aria-hidden="true" />
              {t("Pindah", "Move")}
            </span>
            <select
              value={card.board_id}
              disabled={isMoving}
              aria-label={t(
                "Pindahkan {title} ke status lain",
                "Move {title} to another status",
                { title: card.title },
              )}
              onChange={(event) => void handleMove(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:cursor-wait disabled:opacity-60"
            >
              <option value={card.board_id}>
                {isMoving ? t("Memindahkan...", "Moving...") : t("Pilih tujuan", "Select destination")}
              </option>
              {moveTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </article>
  );
}
