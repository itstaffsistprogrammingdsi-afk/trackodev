import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";

import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { useBoards } from "../hooks/useBoards";

import SortableBoardColumn from "../components/SortableBoardColumn";
import BoardListView from "../components/BoardListView";
import BoardFormModal from "../components/BoardFormModal";
import DeleteBoardDialog from "../components/DeleteBoardDialog";

import CardDetailModal from "@/features/card/components/CardDetailModal";
import EmptyState from "@/components/ui/EmptyState";

import { moveCard, reorderCards } from "@/features/card/api/card.api";
import { alertIfMirrorConflict } from "@/features/card/utils/mirrorConflict";
import { getCampaign } from "@/features/campaign/api/campaign.api";
import type { Campaign } from "@/features/campaign/types";
import { reorderBoards } from "../api/board.api";
import { isMobileApp } from "@/lib/mobileConfig";
import { useIsCompactViewport } from "@/hooks/useIsCompactViewport";
import { toast } from "@/lib/feedback";

import { Board } from "../types";
import { Card } from "@/features/card/types";
import {
  getBoardIdFromSortableId,
  getBoardSortableId,
  isBoardOrderLocked,
} from "../utils/boardOrder";

import { Kanban, List, Plus, FolderKanban, Search, SearchX, X } from "lucide-react";

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

/**
 * Deteksi tumbukan untuk papan kanban.
 *
 * `pointerWithin` mengikuti posisi kursor sehingga drop terasa tepat di tempat
 * yang ditunjuk. Item yang sedang digeser WAJIB dikecualikan: tanpa itu `over`
 * bisa menunjuk balik ke kartu asal sehingga drop tidak konsisten dan reorder
 * mengenai kartu lain. Kartu di bawah kursor diprioritaskan agar urutan sisip
 * presisi; kolom dipakai saat kursor di area kosong. `closestCorners` menjadi
 * fallback terakhir.
 */
const kanbanCollisionDetection: CollisionDetection = (args) => {
  const isActive = (id: string | number) => id === args.active.id;

  const pointerCollisions = pointerWithin(args).filter(
    (collision) => !isActive(collision.id),
  );

  if (pointerCollisions.length === 0) {
    return closestCorners(args).filter((collision) => !isActive(collision.id));
  }

  const cardCollision = pointerCollisions.find((collision) =>
    args.droppableContainers.some(
      (container) =>
        container.id === collision.id && Boolean(container.data.current?.card),
    ),
  );

  // Selalu kembalikan SATU target agar dnd-kit tidak ambigu.
  return [cardCollision ?? pointerCollisions[0]];
};

export default function BoardPage() {
const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = campaignId ?? "";
  const requestedCardId = searchParams.get("card");
  const { user } = useAuth();

  const { data, isLoading, refetch } = useBoards(id);
  const { data: campaign, isLoading: isCampaignLoading } = useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  // =========================================
  // STATE
  // =========================================
  const [boards, setBoards] = useState<Board[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [mobileBoardId, setMobileBoardId] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const mobileApp = isMobileApp();
  const compactViewport = useIsCompactViewport();
  // Layout kompak dipakai baik di aplikasi native maupun di browser HP/tablet.
  const compactLayout = mobileApp || compactViewport;

  // State pencarian/view tidak boleh terbawa saat pindah campaign.
  useEffect(() => {
    setCardSearch("");
    setViewMode("kanban");
    setMobileBoardId("");
    setSelectedCard(null);
  }, [id]);
  const deferredCardSearch = useDeferredValue(cardSearch);
  const normalizedCardSearch = deferredCardSearch.trim().toLocaleLowerCase();
  const isSearchActive = cardSearch.trim().length > 0;

  // =========================================
  // SYNC DATA
  // =========================================
  useEffect(() => {
    if (data) {
      setBoards(data);
    }
  }, [data]);

  useEffect(() => {
    if (!compactLayout || boards.length === 0) return;

    setMobileBoardId((current) =>
      boards.some((board) => board.id === current) ? current : boards[0].id,
    );
  }, [compactLayout, boards]);

  // Open a specific card when arriving from a dashboard insight deep-link.
  // If the card is nowhere to be found (deleted or no access), tell the
  // user instead of failing silently with a stale ?card= param.
  const missingCardNotified = useRef<string | null>(null);
  useEffect(() => {
    if (
      !requestedCardId ||
      boards.length === 0 ||
      selectedCard?.id === requestedCardId
    ) {
      return;
    }

    for (const board of boards) {
      const requestedCard = board.cards.find((card) => card.id === requestedCardId);

      if (requestedCard) {
        setSelectedCard(requestedCard);
        if (compactLayout) setMobileBoardId(board.id);
        missingCardNotified.current = null;
        return;
      }
    }

    if (missingCardNotified.current !== requestedCardId) {
      missingCardNotified.current = requestedCardId;
      toast.error("Card tidak ditemukan. Mungkin sudah dihapus atau Anda tidak memiliki akses ke card tersebut.");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("card");
      setSearchParams(nextParams, { replace: true });
    }
  }, [boards, compactLayout, requestedCardId, selectedCard?.id, searchParams, setSearchParams]);

  const closeCardDetail = () => {
    setSelectedCard(null);

    if (requestedCardId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("card");
      setSearchParams(nextParams, { replace: true });
    }
  };

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

  const filteredBoards = useMemo(() => {
    if (!normalizedCardSearch) return boards;

    return boards.map((board) => ({
      ...board,
      cards: board.cards.filter((card) =>
        card.title.toLocaleLowerCase().includes(normalizedCardSearch),
      ),
    }));
  }, [boards, normalizedCardSearch]);

  const filteredCardCount = useMemo(
    () => filteredBoards.reduce((total, board) => total + board.cards.length, 0),
    [filteredBoards],
  );

  const totalCardCount = useMemo(
    () => boards.reduce((total, board) => total + board.cards.length, 0),
    [boards],
  );

  useEffect(() => {
    if (!compactLayout || !normalizedCardSearch) return;

    const selectedBoardHasMatch = filteredBoards.some(
      (board) => board.id === mobileBoardId && board.cards.length > 0,
    );
    const firstMatchingBoard = filteredBoards.find((board) => board.cards.length > 0);

    if (!selectedBoardHasMatch && firstMatchingBoard && firstMatchingBoard.id !== mobileBoardId) {
      setMobileBoardId(firstMatchingBoard.id);
    }
  }, [filteredBoards, compactLayout, mobileBoardId, normalizedCardSearch]);

  // =========================================
  // DND SENSOR
  // =========================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    // Layar sentuh (tablet/hybrid): tahan sebentar sebelum drag supaya
    // tidak bentrok dengan scroll. Di HP, drag tetap dinonaktifkan dan
    // diganti pilihan status per card.
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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

  const handleSelectMove = async (card: Card, targetBoardId: string) => {
    if (card.board_id === targetBoardId) return;

    const source = findCard(card.id);
    const target = boards.find((board) => board.id === targetBoardId);
    if (!source || !target) return;

    setBoards((current) =>
      current.map((board) => {
        if (board.id === source.board.id) {
          return { ...board, cards: board.cards.filter((item) => item.id !== card.id) };
        }

        if (board.id === targetBoardId) {
          return {
            ...board,
            cards: [...board.cards, { ...card, board_id: targetBoardId }],
          };
        }

        return board;
      }),
    );

    try {
      await moveCard(card.id, targetBoardId);
      await refetch();
    } catch (error) {
      await refetch();
      throw error;
    }
  };

  // =========================================
  // DRAG START
  // =========================================
  const handleDragStart = (event: DragStartEvent): void => {
    if (event.active.data.current?.entityType === "board") {
      const boardId = getBoardIdFromSortableId(String(event.active.id));
      const board = boards.find((item) => item.id === boardId) ?? null;
      setActiveBoard(board);
      setActiveCard(null);
      return;
    }

    const rawCard = event.active.data.current?.card;

    if (isCard(rawCard)) {
      setActiveCard(rawCard);
      setActiveBoard(null);
    }
  };

  // =========================================
  // DRAG END
  // =========================================
  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    try {
      const { active, over } = event;

      setActiveCard(null);
      setActiveBoard(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // Drop ke atas item itu sendiri = tidak ada perubahan.
      if (activeId === overId) return;

      if (active.data.current?.entityType === "board") {
        const activeBoardId = getBoardIdFromSortableId(activeId);
        const draggedBoard = boards.find((board) => board.id === activeBoardId);
        const overBoardFromData = over.data.current?.board as Board | undefined;
        const overCard = findCard(overId);
        const targetBoardId =
          overBoardFromData?.id ??
          getBoardIdFromSortableId(overId) ??
          overCard?.board.id ??
          boards.find((board) => board.id === overId)?.id;
        const targetBoard = boards.find((board) => board.id === targetBoardId);

        if (
          !draggedBoard ||
          !targetBoard ||
          draggedBoard.id === targetBoard.id ||
          isBoardOrderLocked(draggedBoard) ||
          isBoardOrderLocked(targetBoard)
        ) {
          return;
        }

        const movableBoards = boards.filter(
          (board) => !isBoardOrderLocked(board),
        );
        const oldIndex = movableBoards.findIndex(
          (board) => board.id === draggedBoard.id,
        );
        const newIndex = movableBoards.findIndex(
          (board) => board.id === targetBoard.id,
        );

        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

        const reorderedMovableBoards = arrayMove(
          movableBoards,
          oldIndex,
          newIndex,
        );
        let movableIndex = 0;
        const reorderedBoards = boards
          .map((board) =>
            isBoardOrderLocked(board)
              ? board
              : reorderedMovableBoards[movableIndex++],
          )
          .map((board, index) => ({ ...board, order: index + 1 }));

        setBoards(reorderedBoards);

        await reorderBoards(
          reorderedBoards.map((board) => ({
            id: board.id,
            order: board.order,
          })),
        );

        await refetch();
        return;
      }

      const activeData = findCard(activeId);
      if (!activeData) return;

      const sourceBoard = activeData.board;
      const overCardData = findCard(overId);
      const targetBoardId = overCardData
        ? overCardData.board.id
        : getBoardIdFromSortableId(overId) ?? overId;

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
      if (alertIfMirrorConflict(error)) {
        await refetch();
        return;
      }
      console.error("Drag error:", error);
      await refetch();
    }
  };

  // =========================================
  // LOADING SKELETON
  // =========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas transition-colors">
        <div className="border-b border-line bg-canvas/85 px-4 py-3.5 backdrop-blur-md">
          <div className="flex gap-2">
            <div className="h-9 w-32 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none" />
            <div className="h-9 w-24 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none" />
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden px-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-[300px] shrink-0 rounded-panel border border-line bg-surface-muted/40 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
                <div className="h-6 w-6 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none" />
              </div>
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-card bg-surface motion-reduce:animate-none" />
                <div className="h-20 animate-pulse rounded-card bg-surface motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!campaignId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-fg-subtle/60" aria-hidden="true" />
          <h3 className="text-base font-semibold text-fg">
            Campaign tidak ditemukan
          </h3>
          <p className="mt-1 text-xs text-fg-muted">
            Silakan pilih campaign yang valid untuk melihat board task.
          </p>
        </div>
      </div>
    );
  }

  const visibleKanbanBoards =
    compactLayout && mobileBoardId
      ? filteredBoards.filter((board) => board.id === mobileBoardId)
      : filteredBoards;

  return (
    <DndContext
      sensors={isSearchActive ? [] : sensors}
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveCard(null);
        setActiveBoard(null);
      }}
    >
<div className="w-full text-slate-800 transition-colors dark:text-slate-100">
  {/* ===================================== */}
  {/* TOP NAV BAR (SAAS MODERN & CLEAN) */}
  {/* ===================================== */}
  {/* DIUBAH: Mengganti "sticky top-0" menjadi "relative" agar ikut naik saat di-scroll */}
  <div className="relative z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* LEFT SIDE: CONTROLS & SWITCHER */}
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
        <div className="flex min-w-0 items-center gap-2">
          <FolderKanban
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-fg-subtle"
          />
          <div className="min-w-0">
            <span className="block text-[10px] font-medium text-fg-subtle">
              Campaign
            </span>
            <h1
              className="truncate text-sm font-semibold text-fg sm:max-w-[28rem]"
              title={campaign?.name}
              aria-busy={isCampaignLoading}
            >
              {campaign?.name ?? (isCampaignLoading ? "Memuat campaign..." : "Board")}
            </h1>
          </div>
        </div>

        <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
          {/* VIEW MODE SWITCHER */}
          <div className="flex shrink-0 items-center rounded-control border border-line bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            aria-pressed={viewMode === "kanban"}
            className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              viewMode === "kanban"
                ? "bg-surface text-fg shadow-e1"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Kanban size={14} />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              viewMode === "list"
                ? "bg-surface text-fg shadow-e1"
                : "text-fg-muted hover:text-fg"
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
            className="flex shrink-0 items-center gap-1.5 rounded-control bg-accent px-3.5 py-2 text-xs font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-strong"
          >
            <Plus size={15} />
            <span>Kolom</span>
          </button>
        </div>
      </div>

      {/* CARD SEARCH */}
      <label className="block w-full min-w-0 sm:max-w-md sm:flex-1">
        <span className="sr-only">Cari card berdasarkan nama</span>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="search"
            value={cardSearch}
            onChange={(event) => setCardSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setCardSearch("");
            }}
            placeholder="Cari nama card"
            autoComplete="off"
            className="h-10 w-full appearance-none rounded-control border border-line bg-surface pl-9 pr-9 text-sm font-normal text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          />
          {cardSearch ? (
            <button
              type="button"
              onClick={() => setCardSearch("")}
              aria-label="Hapus pencarian card"
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <X aria-hidden="true" size={15} />
            </button>
          ) : null}
        </div>
        {isSearchActive ? (
          <span
            className="mt-1 block text-[11px] text-fg-muted"
            aria-live="polite"
          >
            {filteredCardCount} dari {totalCardCount} card ditemukan
          </span>
        ) : null}
      </label>

      {compactLayout && viewMode === "kanban" && boards.length > 0 ? (
        <label className="block w-full sm:w-auto">
          <span className="mb-1.5 block text-[11px] font-medium text-fg-subtle">
            Status yang ditampilkan
          </span>
          <select
            value={mobileBoardId}
            onChange={(event) => setMobileBoardId(event.target.value)}
            className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm font-medium text-fg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          >
            {filteredBoards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name} ({board.cards.length})
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-[11px] text-fg-muted">
            Pindahkan task melalui pilihan status di setiap card.
          </span>
        </label>
      ) : null}

      {/* RIGHT SIDE: TASK STATS BADGE */}
      <div className="hidden items-center gap-2 text-xs font-medium text-fg-muted sm:flex">
        <div className="flex items-center gap-1.5 rounded-control border border-line bg-surface-muted/60 px-2.5 py-1.5">
          <FolderKanban size={14} className="text-fg-subtle" />
          <span className="tabular-nums">
            {isSearchActive
              ? `${filteredCardCount} dari ${totalCardCount} task`
              : `${totalCardCount} task · ${boards.length} kolom`}
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
      <EmptyState
        icon={FolderKanban}
        title="Belum ada kolom"
        description="Buat kolom pertama seperti To do, In progress, atau Done untuk mulai mengatur alur kerja."
        action={{
          label: "Tambah kolom",
          onClick: () => setIsCreateOpen(true),
        }}
        className="py-16"
      />
    ) : isSearchActive && filteredCardCount === 0 ? (
      <EmptyState
        icon={SearchX}
        title="Tidak ada task yang cocok"
        description={`Tidak ada hasil untuk “${cardSearch.trim()}”. Coba kata kunci lain atau hapus pencarian.`}
        action={{ label: "Hapus pencarian", onClick: () => setCardSearch("") }}
      />
    ) : viewMode === "kanban" ? (
      /* KANBAN BOARD VIEW */
      <SortableContext
        items={visibleKanbanBoards.map((board) => getBoardSortableId(board.id))}
        strategy={horizontalListSortingStrategy}
      >
        <div
          className={
            compactLayout
              ? "block max-h-[calc(100dvh-14rem)] w-full overflow-y-auto overscroll-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)] [-webkit-overflow-scrolling:touch]"
              : "flex h-[calc(100dvh-16rem)] min-h-[320px] w-full gap-4 overflow-x-auto overflow-y-hidden pb-6 custom-scrollbar"
          }
          style={{ touchAction: compactLayout ? "pan-y" : "pan-x" }}
        >
          {visibleKanbanBoards.map((board) => (
            <SortableBoardColumn
              key={board.id}
              board={board}
              onCardCreated={refetch}
              onRefresh={refetch}
              onOpenCard={setSelectedCard}
              onEdit={() => setEditingBoard(board)}
              onDelete={() => setDeletingBoard(board)}
              moveTargets={boards
                .filter((target) => target.id !== board.id)
                .map((target) => ({ id: target.id, name: target.name }))}
              onMoveCard={handleSelectMove}
              disableDrag={compactLayout}
              fullWidth={compactLayout}
              emptyMessage={isSearchActive ? "Tidak ada task yang cocok" : undefined}
              suggestedAssignee={
                campaign?.created_by && campaign.created_by.id !== user?.id
                  ? { id: campaign.created_by.id, name: campaign.created_by.name }
                  : null
              }
            />
          ))}
        </div>
      </SortableContext>
    ) : (
      /* LIST VIEW */
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <BoardListView
          boards={filteredBoards}
          onOpenCard={setSelectedCard}
          emptyMessage={isSearchActive ? "Tidak ada card yang cocok" : undefined}
        />
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
        onClose={closeCardDetail}
        onUpdated={async (updated) => {
          if (updated?.id) {
            setBoards((current) =>
              current.map((board) => ({
                ...board,
                cards: board.cards.map((item) =>
                  item.id === updated.id ? { ...item, ...updated } : item,
                ),
              })),
            );
            setSelectedCard((current) =>
              current?.id === updated.id
                ? ({ ...current, ...updated } as Card)
                : current,
            );
            return;
          }
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
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {activeBoard ? (
          <div className="w-[300px] rounded-card border border-accent/30 bg-surface p-4 shadow-e3 ring-2 ring-accent/15">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <FolderKanban className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>{activeBoard.name}</span>
            </div>
            <div className="mt-1 text-xs font-medium text-accent">
              Memindahkan kolom
            </div>
          </div>
        ) : activeCard ? (
          <div className="w-[300px] cursor-grabbing rounded-card border border-accent/30 bg-surface p-4 shadow-e3 ring-2 ring-accent/15">
            <div className="text-sm font-medium text-fg">
              {activeCard.title}
            </div>
            <div className="mt-1 text-xs font-medium text-accent">
              Memindahkan task
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
