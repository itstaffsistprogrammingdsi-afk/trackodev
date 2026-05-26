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
import CreateBoardModal from "../components/CreateBoardModal";

import CardDetailModal from "@/features/card/components/CardDetailModal";

import { moveCard, reorderCards } from "@/features/card/api/card.api";

import { Board } from "../types";

import { Card } from "@/features/card/types";

export default function BoardPage() {
  const { campaignId } = useParams();

  const id = campaignId as string;

  const { data, isLoading, refetch } = useBoards(id);

  // =========================================
  // STATE
  // =========================================
  const [boards, setBoards] = useState<Board[]>([]);

  const [open, setOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

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

    for (const board of boards) {
      const updatedCard = board.cards.find((c) => c.id === selectedCard.id);

      if (updatedCard) {
        setSelectedCard(updatedCard);
        break;
      }
    }
  }, [boards, selectedCard]);

  // =========================================
  // DND SENSOR
  // =========================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  // =========================================
  // FIND CARD
  // =========================================
  const findCard = (cardId: string) => {
    for (const board of boards) {
      const index = board.cards.findIndex((c: Card) => c.id === cardId);

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
  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card;

    if (card) {
      setActiveCard(card);
    }
  };

  // =========================================
  // DRAG END
  // =========================================
  const handleDragEnd = async (event: DragEndEvent) => {
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

      // =====================================
      // MOVE TO OTHER COLUMN
      // =====================================
      if (sourceBoard.id !== targetBoardId) {
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id === sourceBoard.id) {
              return {
                ...b,
                cards: b.cards.filter((c) => c.id !== activeId),
              };
            }

            if (b.id === targetBoardId) {
              return {
                ...b,
                cards: [...b.cards, activeData.card],
              };
            }

            return b;
          }),
        );

        await moveCard(activeId, targetBoardId);

        await refetch();

        return;
      }

      // =====================================
      // REORDER SAME COLUMN
      // =====================================
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
            : b,
        ),
      );

      await reorderCards(
        newCards.map((c, index) => ({
          id: c.id,
          order: index + 1,
        })),
      );

      await refetch();
    } catch (error) {
      console.error("Drag error:", error);

      await refetch();
    }
  };

  // =========================================
  // LOADING
  // =========================================
  if (isLoading) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#f5f7fb]
        "
      >
        <div
          className="
            text-sm
            text-gray-500
          "
        >
          Loading board...
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
      <div
        className="
          min-h-screen
          bg-[#f5f7fb]
          text-gray-800
        "
      >
        {/* ===================================== */}
        {/* TOP NAV */}
        {/* ===================================== */}
        <div
          className="
            sticky
            top-0
            z-30
            border-b
            border-gray-200
            bg-white/90
            backdrop-blur
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              {/* ADD COLUMN */}
              <button
                onClick={() => setOpen(true)}
                className="
                  rounded-xl
                  bg-gray-900
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-white
                  transition
                  hover:bg-black
                "
              >
                + Column
              </button>

              {/* VIEW MODE */}
              <div
                className="
                  flex
                  items-center
                  rounded-xl
                  border
                  border-gray-200
                  bg-gray-100
                  p-1
                "
              >
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`
                    rounded-lg
                    px-4
                    py-2
                    text-sm
                    transition

                    ${
                      viewMode === "kanban"
                        ? `
                          bg-white
                          shadow-sm
                          text-gray-900
                        `
                        : `
                          text-gray-500
                        `
                    }
                  `}
                >
                  Kanban
                </button>

                <button
                  onClick={() => setViewMode("list")}
                  className={`
                    rounded-lg
                    px-4
                    py-2
                    text-sm
                    transition

                    ${
                      viewMode === "list"
                        ? `
                          bg-white
                          shadow-sm
                          text-gray-900
                        `
                        : `
                          text-gray-500
                        `
                    }
                  `}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================== */}
        {/* CONTENT */}
        {/* ===================================== */}
        <div
          className="
    w-full
    overflow-hidden
    px-3
    py-4
    sm:px-4
  "
        >
          {viewMode === "kanban" ? (
            <div
              className="
    flex
    w-full
    gap-4
    overflow-x-auto
    overflow-y-hidden
    pb-4
  "
              style={{
                touchAction: "pan-x",
              }}
            >
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="
  w-[320px]
  min-w-[320px]
  max-w-[320px]
  flex-shrink-0
"
                >
                  <BoardColumn
                    board={board}
                    onCardCreated={refetch}
                    onRefresh={refetch}
                    onOpenCard={setSelectedCard}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-gray-200
                bg-white
              "
            >
              <BoardListView boards={boards} onOpenCard={setSelectedCard} />
            </div>
          )}
        </div>

        {/* ===================================== */}
        {/* CREATE BOARD MODAL */}
        {/* ===================================== */}
        <CreateBoardModal
          open={open}
          onClose={() => setOpen(false)}
          campaignId={id}
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
            })),
          );

          setSelectedCard(null);
        }}
      />

      {/* ===================================== */}
      {/* DRAG OVERLAY */}
      {/* ===================================== */}
      <DragOverlay>
        {activeCard ? (
          <div
            className="
              w-[300px]
              rounded-2xl
              border
              border-gray-200
              bg-white
              p-4
              shadow-2xl
            "
          >
            <div
              className="
                text-sm
                font-semibold
                text-gray-800
              "
            >
              {activeCard.title}
            </div>

            <div
              className="
                mt-1
                text-xs
                text-gray-400
              "
            >
              Moving task...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
