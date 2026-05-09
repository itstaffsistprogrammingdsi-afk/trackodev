import { useState } from 'react'
import { useDivisions } from '../hooks/useDivisions'
import DivisionCard from '../components/DivisionCard'
import CreateDivisionModal from '../components/CreateDivisionModal'

export default function DivisionPage() {
  const { data, isLoading } = useDivisions()
  const [open, setOpen] = useState(false)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Divisions</h1>

        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          + Create Division
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {data?.map((division) => (
          <DivisionCard key={division.id} division={division} />
        ))}
      </div>

      <CreateDivisionModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}