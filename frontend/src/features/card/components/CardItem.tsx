import { useRef, useState } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRightLeft,
  Building2,
  CalendarClock,
  Tags,
  UsersRound,
} from "lucide-react";

import { Card } from "../types";
import {
  dueDateBadgeClasses,
  getDueDateStatus,
} from "../utils/dueDate";

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
  const [isMoving, setIsMoving] = useState(false);
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
    opacity: isDragging ? 0.4 : 1,
  };

  // =========================================
  // DATE FORMAT
  // =========================================
  const formattedDate = card.created_at
    ? new Date(card.created_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const formattedDueDate = card.due_date
    ? new Date(card.due_date.replace(" ", "T")).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // =========================================
  // DUE DATE STATUS
  // =========================================
  const dueStatus = getDueDateStatus(card.due_date);
  const dueClasses = dueDateBadgeClasses[dueStatus];
  const brands = card.brands ?? [];
  const labels = card.labels ?? [];
  const assignees = card.assignees ?? [];

  // =========================================
  // PRIORITY
  // =========================================
  const priorityBadgeClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "low":
        return "bg-green-50 text-green-600";

      case "medium":
        return "bg-yellow-50 text-yellow-600";

      case "high":
        return "bg-orange-50 text-orange-600";

      case "urgent":
        return "bg-red-50 text-red-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

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

  const handleMove = async (boardId: string) => {
    if (!boardId || boardId === card.board_id || !onMove) return;

    try {
      setIsMoving(true);
      await onMove(card, boardId);
    } catch (error) {
      console.error("Move card failed", error);
      alert("Card gagal dipindahkan. Silakan coba lagi.");
    } finally {
      setIsMoving(false);
    }
  };

  // =========================================
  // RENDER
  // =========================================
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
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] md:overflow-visible md:rounded-xl md:border-gray-100 md:p-3 md:hover:translate-y-0 md:hover:bg-gray-50 md:active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 md:hidden"
        style={{
          backgroundColor:
            brands[0]?.color ||
            (card.priority?.toLowerCase() === "urgent" ? "#e11d48" : "#3b82f6"),
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words text-[15px] font-bold leading-5 text-slate-800 md:pr-12 md:text-sm md:font-semibold md:text-gray-800 dark:text-slate-100">
          {card.title}
        </h3>

        {card.priority ? (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide md:absolute md:right-2 md:top-2 md:mt-2 md:rounded-sm md:px-1.5 md:py-0.5 md:font-semibold md:leading-none ${priorityBadgeClass(card.priority)}`}
          >
            {card.priority}
          </span>
        ) : null}
      </div>

      {brands.length > 0 ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-2.5 md:hidden dark:bg-slate-800/70">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <Building2 size={12} />
            Brand
          </div>
          <div className="flex flex-wrap gap-1.5">
          {brands.slice(0, 3).map((brand) => (
            <span
              key={brand.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: brand.color || "#64748b" }}
              />
              <span className="truncate">{brand.name}</span>
            </span>
          ))}
          {brands.length > 3 ? (
            <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              +{brands.length - 3}
            </span>
          ) : null}
          </div>
        </div>
      ) : null}

      {labels.length > 0 ? (
        <div className="mt-2.5 md:hidden">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <Tags size={12} />
            Label
          </div>
          <div className="flex flex-wrap gap-1.5">
          {labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <span
                className="h-2 w-0.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color || "#3b82f6" }}
              />
              <span className="truncate">{label.name}</span>
            </span>
          ))}
          {labels.length > 3 ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
              +{labels.length - 3}
            </span>
          ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 md:hidden dark:border-slate-800">
        <div className="flex min-w-0 items-center">
          {assignees.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {assignees.slice(0, 3).map((user) => (
                  <span
                    key={user.id}
                    title={user.name}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
              <span className="ml-2 inline-flex items-center gap-1 truncate text-[10px] font-medium text-slate-500">
                <UsersRound size={12} />
                {assignees.length} member
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <UsersRound size={12} />
              Belum ada member
            </span>
          )}
        </div>

        {formattedDueDate ? (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${dueClasses}`}>
            <CalendarClock size={12} />
            {dueStatus === "overdue" ? "Terlambat" : formattedDueDate}
          </span>
        ) : null}
      </div>

      {formattedDate || card.created_by ? (
        <p className="mt-2 truncate text-[10px] text-slate-400 md:hidden">
          {card.created_by ? `Dibuat oleh ${card.created_by.name}` : "Dibuat"}
          {formattedDate ? ` � ${formattedDate}` : ""}
        </p>
      ) : null}

      {onMove && moveTargets.length > 0 ? (
        <div
          className="mt-3 border-t border-slate-100 pt-3 md:hidden dark:border-slate-800"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <ArrowRightLeft size={12} />
            Pindahkan ke status
          </label>
          <select
            value={card.board_id}
            disabled={isMoving}
            aria-label={`Pindahkan ${card.title} ke status lain`}
            onChange={(event) => void handleMove(event.target.value)}
            className="h-12 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-wait disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
          >
            <option value={card.board_id}>
              {isMoving ? "Memindahkan..." : "Pilih tujuan"}
            </option>
            {moveTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-3 hidden flex-col gap-2 md:flex md:flex-row md:items-end md:justify-between md:gap-3">
        <div className="min-w-0">
          {formattedDate ? (
            <div className="mt-0.5 text-[10px] text-gray-400">{formattedDate}</div>
          ) : null}
          {card.created_by ? (
            <div className="truncate text-[11px] text-gray-500">
              by <span className="font-medium text-gray-700">{card.created_by.name}</span>
            </div>
          ) : null}
        </div>
        {formattedDueDate ? (
          <div className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${dueClasses}`}>
            {dueStatus === "overdue"
              ? `Overdue · ${formattedDueDate}`
              : `Due ${formattedDueDate}`}
          </div>
        ) : null}
      </div>
    </article>
  );
}
