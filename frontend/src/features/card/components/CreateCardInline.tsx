import { useState } from "react"
import { useCreateCard } from "../hooks/useCards"

export default function CreateCardInline({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const mutation = useCreateCard(boardId)

  const handleCreate = () => {
    if (!title.trim()) return

    mutation.mutate(
      { title },
      {
        onSuccess: () => {
          setTitle("")
          setOpen(false)
        },
      }
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 hover:text-black"
      >
        + Add Card
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 rounded text-sm"
        placeholder="Card title..."
      />

      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Add
        </button>

        <button
          onClick={() => setOpen(false)}
          className="text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}