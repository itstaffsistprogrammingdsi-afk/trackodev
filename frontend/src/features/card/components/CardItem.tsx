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

  // overdue
  if (diffHours < 0) {
    dueClasses = "bg-gray-100 text-gray-500";
  }

  // h-4
  else if (diffHours <= 4) {
    dueClasses = "bg-red-50 text-red-600";
  }

  // h-24
  else if (diffHours <= 24) {
    dueClasses = "bg-yellow-50 text-yellow-600";
  }

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
      bg-white
      p-3
      rounded-xl
      shadow-sm
      border
      border-gray-100
      cursor-pointer
      hover:bg-gray-50
      hover:shadow-md
      active:scale-[0.98]
      transition-all
    "
  >
    <div className="space-y-3">
      {/* TITLE */}
      <p
        className="
          text-sm
          font-semibold
          text-gray-800
          break-words
          leading-5
        "
      >
        {card.title}
      </p>

      {/* FOOTER */}
      <div
        className="
          flex
          items-end
          justify-between
          gap-3
        "
      >
        {/* LEFT */}
        <div className="min-w-0">


          {/* CREATED DATE */}
          {formattedDate && (
            <div
              className="
                text-[10px]
                text-gray-400
                mt-0.5
              "
            >
              {formattedDate}
            </div>
          )}

                    {/* CREATOR */}
          {card.created_by && (
            <div
              className="
                text-[11px]
                text-gray-500
                truncate
              "
            >
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
              items-center
              rounded-full
              px-2.5
              py-1
              text-[10px]
              font-semibold
              whitespace-nowrap
              shrink-0
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
