import { useState } from "react"
import { searchUsers } from "../api/campaign.api"
import { User } from "../types"

type Props = {
  onSelect: (user: User) => void
}

export default function MemberMentionInput({ onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [show, setShow] = useState(false)

const handleChange = async (val: string) => {
  setQuery(val)

  const match = val.match(/@(\w+)$/) // 🔥 ambil kata setelah @ terakhir

  if (match) {
    const keyword = match[1]

    const data = await searchUsers(keyword)
    setUsers(data)
    setShow(true)
  } else {
    setShow(false)
  }
}

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="@ketik nama user"
        className="w-full border p-2 rounded"
      />

      {show && (
        <div className="absolute bg-white border w-full mt-1 rounded shadow max-h-40 overflow-y-auto z-50">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                onSelect(u)
                setQuery("")
                setShow(false)
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {u.name} ({u.email})
            </div>
          ))}
        </div>
      )}
    </div>
  )
}