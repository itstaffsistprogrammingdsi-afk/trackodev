import { useEffect, useState, useCallback } from "react"
import { getMembers, addMember, removeMember } from "../api/campaign.api"
import { User } from "../types"

type Props = {
  campaignId: string
}

export default function CampaignMember({ campaignId }: Props) {
  const [members, setMembers] = useState<User[]>([])
  const [userId, setUserId] = useState("")

  const fetchMembers = useCallback(async () => {
    const data = await getMembers(campaignId)
    setMembers(data)
  }, [campaignId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleAdd = async () => {
    if (!userId) return
    await addMember(campaignId, userId)
    setUserId("")
    fetchMembers()
  }

  const handleRemove = async (id: string) => {
    await removeMember(campaignId, id)
    fetchMembers()
  }

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Members</h3>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex justify-between text-sm">
            <span>
              {m.name} ({m.email})
            </span>

            <button
              onClick={() => handleRemove(m.id)}
              className="text-red-500 text-xs"
            >
              remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID"
          className="border p-2 rounded w-full"
        />

        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-3 rounded"
        >
          Add
        </button>
      </div>
    </div>
  )
}