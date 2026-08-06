import { useState } from 'react'
import { useDivisions } from '../hooks/useDivisions'
import DivisionCard from '../components/cards/DivisionCard'
import CreateDivisionModal from '../components/CreateDivisionModal'
import type { Division }
  from "../types";

import ManageDivisionMembersModal
  from "../components/modals/ManageDivisionMembersModal";
  import { useAuth } from '@/context/AuthContext';

export default function DivisionPage() {
  const { can, hasRole } = useAuth();
  const ownOnly = !hasRole("super_admin") && !can("division.view");
  const { data, isLoading } = useDivisions(ownOnly)
  const [open, setOpen] = useState(false)
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [
  memberModalOpen,
  setMemberModalOpen
] = useState(false);

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Divisions</h1>

{can("division.create") && (
  <button
    onClick={() => setOpen(true)}
    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
  >
    + Create Division
  </button>
)}
      </div>

      <div className="grid grid-cols-1 gap-4 xsm:grid-cols-2 xl:grid-cols-3">
        {data?.map((division) => (
<DivisionCard
  key={division.id}
  division={division}
  onManageMembers={(
    division
  ) => {
    setSelectedDivision(
      division
    );

    setMemberModalOpen(true);
  }}
/>
        ))}
      </div>

      <CreateDivisionModal open={open} onClose={() => setOpen(false)} />

      <ManageDivisionMembersModal
        open={memberModalOpen}
        division={selectedDivision}
        onClose={() => {
          setSelectedDivision(null);
          setMemberModalOpen(false);
        }}
      />
    </div>
  )
}
