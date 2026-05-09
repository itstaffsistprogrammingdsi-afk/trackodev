import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDivision } from '../api/division.api'
import { Division } from '../types'
import { useNavigate } from 'react-router-dom'

type Props = {
  division: Division
}

export default function DivisionCard({ division }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => deleteDivision(division.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['divisions'] })
    }
  })

  return (
    <div
      onClick={() => navigate(`/divisions/${division.id}`)}
      className="p-4 border rounded-xl cursor-pointer hover:shadow transition"
    >
      <h3 className="font-semibold">{division.name}</h3>
      <p className="text-sm text-gray-500">{division.description}</p>

      <button
        onClick={(e) => {
          e.stopPropagation() // 🔥 penting banget
          mutation.mutate()
        }}
        className="text-red-500 text-sm mt-2"
      >
        Delete
      </button>
    </div>
  )
}