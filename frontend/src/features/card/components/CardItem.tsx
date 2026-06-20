import { useRef } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card } from "../types";

// =========================================
// PROPS
// =========================================
interface Props {
  card: Card;
  onRefresh?: () => void;
  onOpen?: (card: Card) => void;
}

export default function CardItem({ card, onOpen }: Props) {
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
  const now = new Date();

  const dueDateObj = card.due_date
    ? new Date(card.due_date.replace(" ", "T"))
    : null;

  const diffMs = dueDateObj ? dueDateObj.getTime() - now.getTime() : 0;

  const diffHours = diffMs / (1000 * 60 * 60);

  let dueClasses = "bg-green-50 text-green-600";

  if (diffHours < 0) {
    dueClasses = "bg-gray-100 text-gray-500";
  } else if (diffHours <= 4) {
    dueClasses = "bg-red-50 text-red-600";
  } else if (diffHours <= 24) {
    dueClasses = "bg-yellow-50 text-yellow-600";
  }

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

  // =========================================
  // RENDER
  // =========================================
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="
        relative
        rounded-xl
        border
        border-gray-100
        bg-white
        p-3
        shadow-sm
        cursor-pointer
        transition-all
        hover:bg-gray-50
        hover:shadow-md
        active:scale-[0.98]
      "
    >
      {/* PRIORITY */}
      {card.priority && (
        <span
          className={`
            absolute
            top-2
            right-2
            inline-flex
            rounded-sm
            px-1.5
            py-0.5
            text-[9px]
            font-semibold
            uppercase
            leading-none
            mt-2
            ${priorityBadgeClass(card.priority)}
          `}
        >
          {card.priority}
        </span>
      )}

      <div className="space-y-3">
        {/* TITLE */}
        <p
          className="
            pr-12
            text-sm
            font-semibold
            leading-5
            break-words
            text-gray-800
          "
        >
          {card.title}
        </p>

        {/* FOOTER */}
        <div className="flex items-end justify-between gap-3">
          {/* LEFT */}
          <div className="min-w-0">
            {formattedDate && (
              <div className="mt-0.5 text-[10px] text-gray-400">
                {formattedDate}
              </div>
            )}

            {card.created_by && (
              <div className="truncate text-[11px] text-gray-500">
                by{" "}
                <span className="font-medium text-gray-700">
                  {card.created_by.name}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT */}
          {formattedDueDate && (
            <div
              className={`
                inline-flex
                shrink-0
                items-center
                whitespace-nowrap
                rounded-full
                px-2.5
                py-1
                text-[10px]
                font-semibold
                ${dueClasses}
              `}
            >
              Due {formattedDueDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}