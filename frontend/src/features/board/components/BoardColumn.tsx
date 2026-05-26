import { useState } from 'react'

import { useDroppable } from '@dnd-kit/core'

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { Board } from '../types'

import CardItem from '@/features/card/components/CardItem'

import { createCard } from '@/features/card/api/card.api'

import { Card } from '@/features/card/types'

type Props = {
  board: Board

  onCardCreated?: () => void

  onRefresh?: () => void

  // 🔥 TAMBAHAN
  onOpenCard?: (card: Card) => void
}

export default function BoardColumn({
  board,
  onCardCreated,
  onRefresh,

  // 🔥 TAMBAHAN
  onOpenCard,
}: Props) {
  const { setNodeRef } = useDroppable({
    id: board.id,
  })

  const [isAdding, setIsAdding] =
    useState(false)

  const [title, setTitle] = useState('')

  const [loading, setLoading] =
    useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return

    try {
      setLoading(true)

      await createCard(board.id, {
        title,
      })

      setTitle('')

      setIsAdding(false)

      onCardCreated?.()

      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className="w-72 bg-gray-100 rounded-xl p-3 min-h-[200px] flex flex-col"
    >
      <h3 className="font-semibold mb-2">
        {board.name}
      </h3>

      <SortableContext
        items={board.cards.map((c) => c.id)}
        strategy={
          verticalListSortingStrategy
        }
      >
        <div className="space-y-2 flex-1">
          {board.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onRefresh={onRefresh}

              /* 🔥 TAMBAHAN */
              onOpen={onOpenCard}
            />
          ))}
        </div>
      </SortableContext>

      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-3 text-sm text-gray-500 hover:text-black text-left"
        >
          + Add task
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Task title..."
            className="w-full border p-2 rounded"
          />

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              {loading
                ? 'Adding...'
                : 'Add'}
            </button>

            <button
              onClick={() =>
                setIsAdding(false)
              }
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}