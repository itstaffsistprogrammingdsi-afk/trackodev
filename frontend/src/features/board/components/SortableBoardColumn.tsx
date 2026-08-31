import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, LockKeyhole } from "lucide-react";

import { Card } from "@/features/card/types";
import BoardColumn from "./BoardColumn";
import { Board } from "../types";
import { getBoardSortableId, isBoardOrderLocked } from "../utils/boardOrder";

type Props = {
  board: Board;
  onCardCreated?: () => void | Promise<unknown>;
  onRefresh?: () => void | Promise<unknown>;
  onOpenCard?: (card: Card) => void;
  moveTargets?: Array<{ id: string; name: string }>;
  onMoveCard?: (card: Card, boardId: string) => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
  emptyMessage?: string;
  disableDrag?: boolean;
  fullWidth?: boolean;
};

export default function SortableBoardColumn({
  board,
  disableDrag = false,
  fullWidth = false,
  ...columnProps
}: Props) {
  const isLocked = isBoardOrderLocked(board);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getBoardSortableId(board.id),
    data: { entityType: "board", board },
    disabled: isLocked || disableDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${
        fullWidth
          ? "w-full max-w-none"
          : "w-[85vw] max-w-[320px] shrink-0 sm:w-[320px] sm:max-w-none"
      } ${
        isDragging ? "z-20 opacity-40" : ""
      }`}
    >
      <BoardColumn
        board={board}
        {...columnProps}
        dragHandle={
          disableDrag ? undefined : isLocked ? (
            <span
              title="Posisi column ini dikunci"
              aria-label={`Column ${board.name} tidak dapat dipindahkan`}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 dark:text-slate-600"
            >
              <LockKeyhole size={14} />
            </span>
          ) : (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Pindahkan column ${board.name}`}
              title="Geser untuk memindahkan column"
              className="inline-flex h-7 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <GripVertical size={16} />
            </button>
          )
        }
      />
    </div>
  );
}
