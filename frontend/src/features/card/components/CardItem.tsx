import { useRef } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRightLeft,
  CalendarClock,
  CheckSquare,
  MessageSquare,
  Paperclip,
  PenLine,
} from "lucide-react";

import { isMobileApp } from "@/lib/mobileConfig";
import { useIsCompactViewport } from "@/hooks/useIsCompactViewport";
import { useLanguage } from "@/context/LanguageContext";
import { Card } from "../types";
import NativeCardItem from "./NativeCardItem";
import {
  dueDateBadgeClasses,
  getDueDateStatus,
  isCardCompleted,
} from "../utils/dueDate";
import {
  priorityBadgeClasses,
  priorityDotClasses,
  priorityLabels,
} from "../utils/priority";

// =========================================
// PROPS
// =========================================
interface Props {
  card: Card;
  onRefresh?: () => void;
  onOpen?: (card: Card) => void;
  moveTargets?: Array<{ id: string; name: string }>;
  onMove?: (card: Card, boardId: string) => Promise<void>;
}

export default function CardItem({ card, onOpen, moveTargets = [], onMove }: Props) {
  const { t, locale } = useLanguage();
  const mobileApp = isMobileApp();
  const compactViewport = useIsCompactViewport();
  const compactLayout = mobileApp || compactViewport;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { card },
    disabled: compactLayout,
  });

  // =========================================
  // CLICK vs DRAG DETECTION
  // =========================================
  const isDraggingRef = useRef(false);

  const startPosRef = useRef({
    x: 0,
    y: 0,
  });

  // =========================================
  // STYLE
  // =========================================
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  // =========================================
  // DATE FORMAT
  // =========================================
  const createdDate = card.created_at ? new Date(card.created_at) : null;
  const createdDateTitle =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.toLocaleString(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : undefined;
  const formattedCreatedDate =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  const formattedDueDate = card.due_date
    ? new Date(card.due_date.replace(" ", "T")).toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // =========================================
  // DUE DATE STATUS
  // =========================================
  const dueStatus = getDueDateStatus(card.due_date, {
    completed: isCardCompleted(card),
    completedAt: card.completed_at,
  });
  const dueClasses = dueDateBadgeClasses[dueStatus];
  const priorityLabel = card.priority
    ? priorityLabels[card.priority]
    : undefined;
  const brands = card.brands ?? [];
  const labels = card.labels ?? [];
  const assignees = card.assignees ?? [];
  const commentsCount = card.comments_count ?? card.comments?.length ?? 0;
  const attachmentsCount =
    card.attachments_count ?? card.attachments?.length ?? 0;
  const tasksCount = card.tasks_count ?? card.tasks?.length ?? 0;
  const completedTasksCount =
    card.completed_tasks_count ??
    card.tasks?.filter((task) => task.is_completed).length ??
    0;

  // =========================================
  // EVENTS
  // =========================================
  const handleMouseDown = (e: React.MouseEvent) => {
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x);

    const dy = Math.abs(e.clientY - startPosRef.current.y);

    if (dx > 5 || dy > 5) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) {
      onOpen?.(card);
    }
  };

  // =========================================
  // RENDER
  // =========================================
  if (compactLayout) {
    return (
      <NativeCardItem
        card={card}
        onOpen={onOpen}
        moveTargets={moveTargets}
        onMove={onMove}
      />
    );
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(card);
        }
      }}
      role="button"
      tabIndex={0}
      title={
        createdDateTitle
          ? t("Dibuat {date}", "Created {date}", { date: createdDateTitle })
          : undefined
      }
      aria-label={`${t("Buka detail", "Open details")} ${card.title}${
        dueStatus === "overdue"
          ? t(", sudah melewati deadline", ", past its deadline")
          : ""
      }`}
      className={[
        "group relative flex cursor-grab flex-col gap-2.5 rounded-card border bg-surface p-3.5 text-left shadow-e1",
        "transition-[border-color,box-shadow,background-color,opacity] duration-150 ease-soft",
        "hover:border-line-strong hover:shadow-e2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "active:cursor-grabbing",
        isDragging
          ? "z-20 border-accent/40 opacity-70 shadow-e3 ring-2 ring-accent/20"
          : "border-line",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <h3
          title={card.title}
          className="min-w-0 flex-1 line-clamp-2 text-[13px] font-medium leading-5 text-fg"
        >
          {card.title}
        </h3>

        {card.priority ? (
          <span
            className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${
              priorityBadgeClasses[card.priority] ??
              "bg-surface-muted text-fg-muted"
            }`}
            title={`${t("Prioritas", "Priority")} ${
              priorityLabel
                ? t(priorityLabel.label, priorityLabel.labelEn)
                : card.priority
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                priorityDotClasses[card.priority] ?? "bg-fg-subtle"
              }`}
            />
            {priorityLabel
              ? t(priorityLabel.label, priorityLabel.labelEn)
              : card.priority}
          </span>
        ) : null}
      </div>

      {card.created_by || formattedCreatedDate ? (
        <div
          className="flex min-w-0 items-center gap-1.5 text-[10px] leading-4 text-fg-subtle"
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
        </div>
      ) : null}

      {card.is_cross_division_copy ? (
        <span
          className="inline-flex max-w-full items-center gap-1.5 self-start rounded-control bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent"
          title={
            card.mirrored_by
              ? `${t("Ditugaskan oleh", "Assigned by")} ${card.mirrored_by.name}${
                  card.source_division
                    ? ` · ${t("dari divisi", "from division")} ${card.source_division.name}`
                    : ""
                }`
              : t("Copy lintas divisi", "Cross-division copy")
          }
        >
          <ArrowRightLeft size={11} className="shrink-0" />
          <span className="truncate">
            {t("Lintas divisi", "Cross-division")}
            {card.source_division ? ` · ${card.source_division.name}` : ""}
          </span>
        </span>
      ) : null}

      {brands.length > 0 || labels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {brands.slice(0, 1).map((brand) => (
            <span
              key={brand.id}
              className="inline-flex max-w-[55%] items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted"
              title={brand.name}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: brand.color || "var(--tracko-fg-subtle)" }}
              />
              <span className="truncate">{brand.name}</span>
            </span>
          ))}

          {labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="inline-flex max-w-[45%] items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted"
              title={label.name}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color || "var(--tracko-fg-subtle)" }}
              />
              <span className="truncate">{label.name}</span>
            </span>
          ))}

          {brands.length + labels.length > 3 ? (
            <span className="text-[10px] font-medium text-fg-subtle">
              +{brands.length + labels.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {assignees.length > 0 ? (
            <div
              className="flex -space-x-1.5"
              aria-label={t(
                "{count} anggota ditugaskan",
                "{count} members assigned",
                { count: assignees.length },
              )}
            >
              {assignees.slice(0, 3).map((user) => (
                <span
                  key={user.id}
                  title={user.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent ring-2 ring-surface"
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          ) : null}

          {assignees.length > 3 ? (
            <span className="text-[10px] font-medium text-fg-subtle">
              +{assignees.length - 3}
            </span>
          ) : null}

          {commentsCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-fg-subtle"
              title={t("{count} komentar", "{count} comments", {
                count: commentsCount,
              })}
            >
              <MessageSquare size={11} aria-hidden="true" />
              <span className="tabular-nums">{commentsCount}</span>
            </span>
          ) : null}

          {attachmentsCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-fg-subtle"
              title={t("{count} lampiran", "{count} attachments", {
                count: attachmentsCount,
              })}
            >
              <Paperclip size={11} aria-hidden="true" />
              <span className="tabular-nums">{attachmentsCount}</span>
            </span>
          ) : null}

          {tasksCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-fg-subtle"
              title={t(
                "{done} dari {total} subtask selesai",
                "{done} of {total} subtasks completed",
                { done: completedTasksCount, total: tasksCount },
              )}
            >
              <CheckSquare size={11} aria-hidden="true" />
              <span className="tabular-nums">
                {completedTasksCount}/{tasksCount}
              </span>
            </span>
          ) : null}
        </div>

        {formattedDueDate ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dueClasses}`}
            title={
              dueStatus === "overdue"
                ? t("Sudah melewati deadline", "Past its deadline")
                : t("Deadline")
            }
          >
            <CalendarClock size={11} aria-hidden="true" />
            {dueStatus === "overdue" ? t("Terlambat", "Overdue") : t("Deadline")}{" "}
            {formattedDueDate}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-fg-subtle">
            <CalendarClock size={11} aria-hidden="true" />
            {t("Tanpa deadline", "No deadline")}
          </span>
        )}
      </div>
    </article>
  );
}
