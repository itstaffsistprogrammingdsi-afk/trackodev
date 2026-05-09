import { useParams } from 'react-router-dom'
import { useBoards } from '../hooks/useBoards'
import BoardColumn from '../components/BoardColumn'
import { useEffect, useState } from 'react'
import CreateBoardModal from '../components/CreateBoardModal'

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'

import { arrayMove } from '@dnd-kit/sortable'

import { moveCard, reorderCards } from '@/features/card/api/card.api'
import { Board } from '../types'
import { Card } from '@/features/card/types'

export default function BoardPage() {
  const { campaignId } = useParams()
  const id = campaignId as string

  const { data, isLoading, refetch } = useBoards(id)
  const [boards, setBoards] = useState<Board[]>([])
  const [open, setOpen] = useState(false)

  // 🔥 ACTIVE CARD (UNTUK OVERLAY)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  useEffect(() => {
    if (data) setBoards(data)
  }, [data])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  if (isLoading) return <div>Loading...</div>

  // 🔍 cari card
  const findCard = (cardId: string) => {
    for (const board of boards) {
      const index = board.cards.findIndex((c: Card) => c.id === cardId)
      if (index !== -1) {
        return { board, card: board.cards[index], index }
      }
    }
    return null
  }

  // ======================
  // 🔥 DRAG START (SET OVERLAY)
  // ======================
  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card
    if (card) {
      setActiveCard(card)
    }
  }

  // ======================
  // 🔥 DRAG END
  // ======================
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveCard(null) // 🔥 reset overlay

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeData = findCard(activeId)
    if (!activeData) return

    const sourceBoard = activeData.board
    const overCardData = findCard(overId)

    const targetBoardId = overCardData
      ? overCardData.board.id
      : overId

    if (!targetBoardId) return

    // ======================
    // 🔥 PINDAH ANTAR COLUMN
    // ======================
    if (sourceBoard.id !== targetBoardId) {
      setBoards((prev) =>
        prev.map((b) => {
          if (b.id === sourceBoard.id) {
            return {
              ...b,
              cards: b.cards.filter((c) => c.id !== activeId),
            }
          }

          if (b.id === targetBoardId) {
            return {
              ...b,
              cards: [...b.cards, activeData.card],
            }
          }

          return b
        })
      )

      await moveCard(activeId, targetBoardId)
      return
    }

    // ======================
    // 🔥 REORDER DALAM COLUMN
    // ======================
    const board = sourceBoard

    const oldIndex = activeData.index
    let newIndex = board.cards.length - 1

    if (overCardData) {
      newIndex = overCardData.index
    }

    if (oldIndex === newIndex) return

    const newCards = arrayMove(board.cards, oldIndex, newIndex)

    setBoards((prev) =>
      prev.map((b) =>
        b.id === board.id
          ? { ...b, cards: newCards }
          : b
      )
    )

    await reorderCards(
      newCards.map((c, index) => ({
        id: c.id,
        order: index + 1,
      }))
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart} // 🔥 penting
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 space-y-4">
        <div className="flex justify-between">
          <h1 className="text-xl font-semibold">Board</h1>

          <button
            onClick={() => setOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + Column
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto">
          {boards.map((board) => (
            <BoardColumn
              key={board.id}
              board={board}
              onCardCreated={refetch}
            />
          ))}
        </div>

        <CreateBoardModal
          open={open}
          onClose={() => setOpen(false)}
          campaignId={id}
        />
      </div>

      {/* 🔥 DRAG OVERLAY (INI YANG BIKIN KAYAK TRELLO) */}
      <DragOverlay>
        {activeCard ? (
          <div className="bg-white p-3 rounded shadow-xl scale-105 rotate-1">
            {activeCard.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}