import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { arrayMove } from "@dnd-kit/sortable";

import { useBoards } from "../hooks/useBoards";

import BoardColumn from "../components/BoardColumn";
import BoardListView from "../components/BoardListView";
import BoardFormModal from "../components/BoardFormModal";
import DeleteBoardDialog from "../components/DeleteBoardDialog";

import CardDetailModal from "@/features/card/components/CardDetailModal";

import { moveCard, reorderCards } from "@/features/card/api/card.api";

import { Board } from "../types";
import { Card } from "@/features/card/types";

import { Kanban, List, Plus, FolderKanban, Loader2 } from "lucide-react";

type ViewMode = "kanban" | "list";

type FoundCard = {
  board: Board;
  card: Card;
  index: number;
};

function isCard(value: unknown): value is Card {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "title" in value
  );
}

export default function BoardPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const id = campaignId ?? "";

  const { data, isLoading, refetch } = useBoards(id);

  // =========================================
  // STATE
  // =========================================
  const [boards, setBoards] = useState<Board[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // =========================================
  // SYNC DATA
  // =========================================
  useEffect(() => {
    if (data) {
      setBoards(data);
    }
  }, [data]);

  // =========================================
  // KEEP MODAL UPDATED
  // =========================================
  useEffect(() => {
    if (!selectedCard) return;

    let found: Card | null = null;

    for (const board of boards) {
      const updatedCard = board.cards.find((c) => c.id === selectedCard.id);
      if (updatedCard) {
        found = updatedCard;
        break;
      }
    }

    if (found) {
      if (found !== selectedCard) {
        setSelectedCard(found);
      }
    } else {
      setSelectedCard(null);
    }
  }, [boards, selectedCard]);

  // =========================================
  // KEEP EDIT/DELETE TARGETS IN SYNC
  // =========================================
  useEffect(() => {
    if (editingBoard && !boards.some((b) => b.id === editingBoard.id)) {
      setEditingBoard(null);
    }

    if (deletingBoard && !boards.some((b) => b.id === deletingBoard.id)) {
      setDeletingBoard(null);
    }
  }, [boards, editingBoard, deletingBoard]);

  // =========================================
  // DND SENSOR
  // =========================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // =========================================
  // FIND CARD
  // =========================================
  const findCard = (cardId: string): FoundCard | null => {
    for (const board of boards) {
      const index = board.cards.findIndex((c) => c.id === cardId);

      if (index !== -1) {
        return {
          board,
          card: board.cards[index],
          index,
        };
      }
    }

    return null;
  };

  // =========================================
  // DRAG START
  // =========================================
  const handleDragStart = (event: DragStartEvent): void => {
    const rawCard = event.active.data.current?.card;

    if (isCard(rawCard)) {
      setActiveCard(rawCard);
    }
  };

  // =========================================
  // DRAG END
  // =========================================
  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    try {
      const { active, over } = event;

      setActiveCard(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeData = findCard(activeId);
      if (!activeData) return;

      const sourceBoard = activeData.board;
      const overCardData = findCard(overId);
      const targetBoardId = overCardData ? overCardData.board.id : overId;

      if (!targetBoardId) return;

      if (sourceBoard.id !== targetBoardId) {
        const targetBoard = boards.find((b) => b.id === targetBoardId);

        if (!targetBoard) return;

        const insertIndex =
          overCardData && overCardData.board.id === targetBoardId
            ? overCardData.index
            : targetBoard.cards.length;

        setBoards((prev) =>
          prev.map((b) => {
            if (b.id === sourceBoard.id) {
              return {
                ...b,
                cards: b.cards.filter((c) => c.id !== activeId),
              };
            }

            if (b.id === targetBoardId) {
              const nextCards = [...b.cards];
              nextCards.splice(insertIndex, 0, activeData.card);

              return {
                ...b,
                cards: nextCards,
              };
            }

            return b;
          })
        );

        await moveCard(activeId, targetBoardId);

        const orderedTargetCards = [...targetBoard.cards];
        orderedTargetCards.splice(insertIndex, 0, activeData.card);

        await reorderCards(
          orderedTargetCards.map((c, index) => ({
            id: c.id,
            order: index + 1,
          }))
        );

        await refetch();
        return;
      }

      const board = sourceBoard;
      const oldIndex = activeData.index;

      let newIndex = board.cards.length - 1;
      if (overCardData) {
        newIndex = overCardData.index;
      }

      if (oldIndex === newIndex) return;

      const newCards = arrayMove(board.cards, oldIndex, newIndex);

      setBoards((prev) =>
        prev.map((b) =>
          b.id === board.id
            ? {
                ...b,
                cards: newCards,
              }
            : b
        )
      );

      await reorderCards(
        newCards.map((c, index) => ({
          id: c.id,
          order: index + 1,
        }))
      );

      await refetch();
    } catch (error) {
      console.error("Drag error:", error);
      await refetch();
    }
  };

  // =========================================
  // LOADING SKELETON
  // =========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 px-4 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex gap-2">
            <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden px-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-[300px] shrink-0 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!campaignId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Campaign Tidak Ditemukan
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Silakan pilih campaign yang valid untuk melihat board task.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
  {/* ===================================== */}
  {/* TOP NAV BAR (SAAS MODERN & CLEAN) */}
  {/* ===================================== */}
  {/* DIUBAH: Mengganti "sticky top-0" menjadi "relative" agar ikut naik saat di-scroll */}
  <div className="relative z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* LEFT SIDE: CONTROLS & SWITCHER */}
      <div className="flex w-full items-center gap-3 sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
        
        {/* VIEW MODE SWITCHER */}
        <div className="flex shrink-0 items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            aria-pressed={viewMode === "kanban"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              viewMode === "kanban"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Kanban size={14} />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <List size={14} />
            <span>List</span>
          </button>
        </div>

        {/* ADD COLUMN BUTTON */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="
            flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold 
            text-white transition-all duration-200 hover:bg-blue-500 active:scale-[0.98] shadow-sm
          "
        >
          <Plus size={15} />
          <span>Column</span>
        </button>
      </div>

      {/* RIGHT SIDE: TASK STATS BADGE (MODERN) */}
      <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
          <FolderKanban size={14} className="text-slate-400 dark:text-slate-500" />
          <span>
            {boards.reduce((sum, b) => sum + b.cards.length, 0)} Tasks in {boards.length} Columns
          </span>
        </div>
      </div>
    </div>
  </div>

  {/* ===================================== */}
  {/* BOARD CONTENT AREA */}
  {/* ===================================== */}
  <div className="w-full px-3 py-4 sm:px-6">
    {boards.length === 0 ? (
      /* EMPTY STATE */
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <FolderKanban size={26} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Belum ada column
          </h3>
          <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
            Buat column pertama seperti &ldquo;To Do&rdquo;, &ldquo;In Progress&rdquo;, atau &ldquo;Done&rdquo; untuk mulai mengatur alur kerja.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="mt-2 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98]"
        >
          <Plus size={15} />
          <span>Tambah Column</span>
        </button>
      </div>
    ) : viewMode === "kanban" ? (
      /* KANBAN BOARD VIEW */
      <div
        className="flex w-full gap-4 overflow-x-auto overflow-y-hidden pb-6 custom-scrollbar"
        style={{ touchAction: "pan-x" }}
      >
        {boards.map((board) => (
          <div
            key={board.id}
            className="w-[85vw] max-w-[320px] shrink-0 sm:w-[320px] sm:max-w-none transition-all"
          >
            <BoardColumn
              board={board}
              onCardCreated={refetch}
              onRefresh={refetch}
              onOpenCard={setSelectedCard}
              onEdit={() => setEditingBoard(board)}
              onDelete={() => setDeletingBoard(board)}
            />
          </div>
        ))}
      </div>
    ) : (
      /* LIST VIEW */
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <BoardListView boards={boards} onOpenCard={setSelectedCard} />
      </div>
    )}
  </div>

  {/* ===================================== */}
  {/* CREATE / EDIT BOARD MODAL */}
  {/* ===================================== */}
  <BoardFormModal
    open={isCreateOpen || !!editingBoard}
    mode={editingBoard ? "edit" : "create"}
    board={editingBoard}
    campaignId={id}
    onClose={() => {
      setIsCreateOpen(false);
      setEditingBoard(null);
    }}
  />

  {/* ===================================== */}
  {/* DELETE BOARD CONFIRMATION */}
  {/* ===================================== */}
  <DeleteBoardDialog
    board={deletingBoard}
    campaignId={id}
    onClose={() => setDeletingBoard(null)}
  />
</div>

      {/* ===================================== */}
      {/* CARD DETAIL MODAL */}
      {/* ===================================== */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdated={async () => {
          await refetch();
        }}
        onDeleted={(deletedId) => {
          setBoards((prev) =>
            prev.map((board) => ({
              ...board,
              cards: board.cards.filter((c) => c.id !== deletedId),
            }))
          );
          setSelectedCard(null);
        }}
      />

      {/* ===================================== */}
      {/* DRAG OVERLAY */}
      {/* ===================================== */}
      <DragOverlay>
        {activeCard ? (
          <div className="w-[300px] rotate-2 scale-105 rounded-2xl border border-blue-500/30 bg-white dark:bg-slate-900 p-4 shadow-2xl ring-2 ring-blue-500/20 transition-all cursor-grabbing">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {activeCard.title}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Moving task...</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}