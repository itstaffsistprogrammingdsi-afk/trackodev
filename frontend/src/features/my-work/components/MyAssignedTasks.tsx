import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Building2,
  CircleCheckBig,
  Clock3,
  Inbox,
  Loader2,
  PlayCircle,
} from "lucide-react";

import CardDetailModal from "@/features/card/components/CardDetailModal";
import CardItem from "@/features/card/components/CardItem";
import { getMyCards, moveCard } from "@/features/card/api/card.api";
import { alertIfMirrorConflict } from "@/features/card/utils/mirrorConflict";
import type { Card, CardWorkflowBoard } from "@/features/card/types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

type WorkColumn = {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: typeof Clock3;
};

function normalizeWorkflowValue(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s-]+/g, "_");
}

function workflowKey(board: CardWorkflowBoard): string {
  const type = normalizeWorkflowValue(board.type);
  return type ? `type:${type}` : `name:${normalizeWorkflowValue(board.name)}`;
}

function isCompletedWorkflow(board?: CardWorkflowBoard): boolean {
  const value = normalizeWorkflowValue(board?.type || board?.name);
  return ["done", "finished", "complete", "completed", "selesai", "qc_done"].includes(value);
}

function workflowDescription(board: CardWorkflowBoard): string {
  const value = normalizeWorkflowValue(board.type || board.name);
  if (["request", "by_request", "requested"].includes(value)) return "Menunggu permintaan";
  if (["todo", "to_do", "backlog"].includes(value)) return "Belum dikerjakan";
  if (["progress", "in_progress", "doing", "on_progress"].includes(value)) return "Sedang dikerjakan";
  if (isCompletedWorkflow(board)) return "Sudah selesai";
  return "Kolom workflow";
}

function workflowIcon(board: CardWorkflowBoard): typeof Clock3 {
  const value = normalizeWorkflowValue(board.type || board.name);
  if (isCompletedWorkflow(board)) return CircleCheckBig;
  if (["progress", "in_progress", "doing", "on_progress"].includes(value)) return PlayCircle;
  return Clock3;
}

function MyTaskColumn({
  column,
  cards,
  onOpenCard,
  onMoveCard,
}: {
  column: WorkColumn;
  cards: Card[];
  onOpenCard: (card: Card) => void;
  onMoveCard: (card: Card, boardId: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `my-task-${column.id}` });
  const Icon = column.icon;

  return (
    <section
      ref={setNodeRef}
      className={`w-[85vw] max-w-[340px] shrink-0 rounded-2xl border bg-slate-50/70 p-3 transition sm:w-[340px] sm:max-w-none dark:bg-slate-900/50 ${
        isOver ? "ring-2 ring-indigo-400/50" : ""
      }`}
      style={{ borderColor: column.color }}
    >
      <header className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={17} aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold">{column.label}</h3>
            <p className="text-[11px] font-medium opacity-75">{column.description}</p>
          </div>
        </div>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/75 px-1.5 text-xs font-bold shadow-sm dark:bg-slate-900/70">
          {cards.length}
        </span>
      </header>

      <SortableContext
        items={cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 space-y-3 rounded-xl">
          {cards.map((card) => {
            const moveTargets = (card.source?.workflow_boards ?? [])
              .filter((board) => board.id !== card.board_id)
              .map((board) => ({ id: board.id, name: board.name }));

            return (
              <div key={card.id} className="space-y-1.5">
                {card.source?.division?.name || card.source?.campaign?.name ? (
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <Building2 size={12} aria-hidden="true" />
                    <span className="truncate">
                      {[card.source?.division?.name, card.source?.campaign?.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ) : null}
                <CardItem
                  card={card}
                  onOpen={onOpenCard}
                  moveTargets={moveTargets}
                  onMove={onMoveCard}
                />
              </div>
            );
          })}

          {cards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-current/25 bg-white/35 px-3 py-8 text-center text-xs font-medium opacity-70 dark:bg-slate-950/20">
              Tidak ada tugas
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export default function MyAssignedTasks() {
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog",
    "Card",
    "Notification",
  ]);
  const {
    data: cards = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Card[]>({
    queryKey: ["my-cards"],
    queryFn: getMyCards,
    staleTime: 30_000,
  });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (realtimeRevision > 0) {
      void refetch();
    }
  }, [realtimeRevision, refetch]);

  const columns = useMemo<WorkColumn[]>(() => {
    const workflowColumns = new Map<string, WorkColumn & { order: number }>();

    cards.forEach((card) => {
      const boards = card.source?.workflow_boards ?? [];
      boards.forEach((board) => {
        const id = workflowKey(board);
        const existing = workflowColumns.get(id);
        if (!existing || (board.order ?? 0) < existing.order) {
          workflowColumns.set(id, {
            id,
            label: board.name,
            description: workflowDescription(board),
            color: board.color || "#6366f1",
            icon: workflowIcon(board),
            order: board.order ?? 0,
          });
        }
      });
    });

    return [...workflowColumns.values()]
      .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label))
      .map(({ order: _order, ...column }) => column);
  }, [cards]);

  const groupedCards = useMemo(() => {
    const groups = Object.fromEntries(columns.map((column) => [column.id, [] as Card[]]));

    cards.forEach((card) => {
      const board = card.source?.board;
      if (!board) return;
      const key = workflowKey(board);
      (groups[key] ??= []).push(card);
    });

    return groups;
  }, [cards, columns]);

  const moveToNativeBoard = async (card: Card, targetBoardId: string) => {
    if (!targetBoardId || targetBoardId === card.board_id) return;

    setMovingCardId(card.id);

    try {
      await moveCard(card.id, targetBoardId);
      await refetch();
    } catch (error) {
      if (alertIfMirrorConflict(error)) {
        await refetch();
        return;
      }
      throw error;
    } finally {
      setMovingCardId(null);
    }
  };

  const moveToWorkflowColumn = async (card: Card, targetColumnId: string) => {
    if (workflowKey(card.source?.board ?? { id: card.board_id, name: "", type: null }) === targetColumnId) return;

    const targetBoard = (card.source?.workflow_boards ?? []).find(
      (board) => workflowKey(board) === targetColumnId,
    );

    if (!targetBoard) {
      window.alert(
        "Campaign sumber tidak memiliki kolom workflow ini. Gunakan pilihan status pada card untuk memilih board tujuan.",
      );
      return;
    }

    await moveToNativeBoard(card, targetBoard.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeCard = event.active.data.current?.card as Card | undefined;
    if (!activeCard || !event.over) return;

    const overId = String(event.over.id);
    const targetCard = cards.find((card) => card.id === overId);
    const targetColumnId = targetCard
      ? workflowKey(targetCard.source?.board ?? { id: targetCard.board_id, name: "", type: null })
      : columns.find((column) => `my-task-${column.id}` === overId)?.id;

    if (targetColumnId) {
      void moveToWorkflowColumn(activeCard, targetColumnId).catch(() => {
        void refetch();
      });
    }
  };

  const totalOpen = cards.filter(
    (card) => !card.completed_at && !isCompletedWorkflow(card.source?.board),
  ).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="text-indigo-600 dark:text-indigo-300" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tugas Saya</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Semua card yang ditugaskan langsung kepada Anda, termasuk dari divisi lain.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200 sm:self-auto">
          {isFetching && !isLoading ? <Loader2 className="animate-spin" size={14} /> : null}
          {totalOpen} tugas aktif
        </div>
      </header>

      <div className="border-b border-indigo-100 bg-indigo-50/50 px-5 py-3 text-xs leading-5 text-indigo-800 dark:border-indigo-950/70 dark:bg-indigo-950/20 dark:text-indigo-200 sm:px-6">
        Tampilan ini adalah pintasan ke card asli, bukan salinan. Saat status dipindahkan di sini, board pemilik campaign juga langsung ikut berubah.
      </div>

      {isLoading ? (
        <div className="flex h-52 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} /> Memuat tugas Anda...
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <Inbox size={42} className="text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-100">Belum ada tugas yang ditugaskan</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Saat Anda ditambahkan sebagai member card, tugas tersebut akan langsung muncul di sini.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto px-4 py-5 custom-scrollbar sm:px-6">
            {columns.map((column) => (
              <MyTaskColumn
                key={column.id}
                column={column}
                cards={groupedCards[column.id] ?? []}
                onOpenCard={setSelectedCard}
                onMoveCard={moveToNativeBoard}
              />
            ))}
          </div>
        </DndContext>
      )}

      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdated={async () => {
          await refetch();
        }}
        onDeleted={(cardId) => {
          if (selectedCard?.id === cardId) setSelectedCard(null);
          void refetch();
        }}
      />

      {movingCardId ? (
        <span className="sr-only" aria-live="polite">
          Memindahkan card {movingCardId}
        </span>
      ) : null}
    </section>
  );
}
