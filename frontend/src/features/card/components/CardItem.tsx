import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '../types'
import { useState, useRef } from 'react'
import CardDetailModal from './CardDetailModal'

export default function CardItem({ card }: { card: Card }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { card }, // 🔥 penting untuk DragOverlay
  })

  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  // 🔥 klik vs drag detection
  const isDraggingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1, // 🔥 tidak hilang
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
    }
    isDraggingRef.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x)
    const dy = Math.abs(e.clientY - startPosRef.current.y)

    if (dx > 5 || dy > 5) {
      isDraggingRef.current = true
    }
  }

  const handleMouseUp = () => {
    if (!isDraggingRef.current) {
      setSelectedCard(card)
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`
          bg-white p-3 rounded shadow cursor-pointer
          hover:bg-gray-50
          active:scale-[0.98]
          transition
        `}
      >
        {card.title}
      </div>

      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </>
  )
}