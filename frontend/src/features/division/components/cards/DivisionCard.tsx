import { useNavigate }
  from 'react-router-dom'

import {
  useDeleteDivision
} from '../../hooks/useDivisions'

import { Division }
  from '../../types'

type Props = {
  division: Division
}

export default function DivisionCard({
  division
}: Props) {

  const navigate =
    useNavigate()

  const deleteMutation =
    useDeleteDivision()

  const handleDelete = async (
    e: React.MouseEvent
  ) => {

    e.stopPropagation()

    await deleteMutation.mutateAsync(
      division.id
    )
  }

  return (
    <div
      onClick={() =>

        navigate(
          `/divisions/${division.id}`
        )

      }
      className="border rounded-xl p-5 hover:shadow transition cursor-pointer"
    >

      <div className="space-y-2">

        <div className="flex items-center justify-between">

          <h2 className="font-semibold text-lg">
            {division.name}
          </h2>

          {division.code && (

            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">

              {division.code}

            </span>

          )}

        </div>

        <p className="text-sm text-gray-500 line-clamp-2">

          {division.description ||
            'No description'}

        </p>

      </div>

      <div className="flex justify-end mt-4">

        <button
          onClick={handleDelete}
          className="text-red-500 text-sm"
        >
          Delete
        </button>

      </div>

    </div>
  )
}