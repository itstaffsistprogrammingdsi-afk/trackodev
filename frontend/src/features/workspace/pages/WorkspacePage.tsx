import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useWorkspaces } from '../hooks/useWorkspaces'
import WorkspaceCard from '../components/WorkspaceCard'
import CreateWorkspaceModal from '../components/CreateWorkspaceModal'

export default function WorkspacePage() {
  const { id } = useParams() // divisionId
  const divisionId = id as string

  const { data, isLoading } = useWorkspaces(divisionId)
  const [open, setOpen] = useState(false)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Workspaces</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Workspace
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {data?.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            divisionId={divisionId}
          />
        ))}
      </div>

      <CreateWorkspaceModal
        open={open}
        onClose={() => setOpen(false)}
        divisionId={divisionId}
      />
    </div>
  )
}