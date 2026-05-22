import { useState } from "react"
import { searchUsers } from "../api/campaign.api"
import { User } from "../types"

type Props = {
  onSelect: (user: User) => void
}

export default function MemberMentionInput({
  onSelect,
}: Props) {

  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  // ============================================
  // SEARCH USER
  // ============================================

  const handleChange = async (
    val: string
  ) => {

    setQuery(val)

    // 🔥 hilangkan @ jika ada
    const keyword = val
      .replace("@", "")
      .trim()

    // 🔥 kosong -> hide
    if (!keyword.length) {

      setUsers([])
      setShow(false)

      return
    }

    try {

      setLoading(true)

      const data =
        await searchUsers(keyword)

      setUsers(data)
      setShow(true)

    } catch (err) {

      console.error(err)

      setUsers([])
      setShow(false)

    } finally {

      setLoading(false)
    }
  }

  // ============================================
  // SELECT USER
  // ============================================

  const handleSelect = (
    user: User
  ) => {

    onSelect(user)

    setQuery("")
    setUsers([])
    setShow(false)
  }

  // ============================================
  // UI
  // ============================================

  return (

    <div className="relative">

      <input
        value={query}
        onChange={(e) =>
          handleChange(e.target.value)
        }
        placeholder="Cari user..."
        className="
          w-full
          border
          p-2
          rounded-lg
          text-sm
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      />

      {show && (

        <div
          className="
            absolute
            z-50
            w-full
            mt-1
            bg-white
            border
            rounded-xl
            shadow-lg
            max-h-56
            overflow-y-auto
          "
        >

          {/* LOADING */}
          {loading && (

            <div className="p-3 text-sm text-gray-500">
              Loading...
            </div>
          )}

          {/* EMPTY */}
          {!loading && users.length === 0 && (

            <div className="p-3 text-sm text-gray-500">
              User tidak ditemukan
            </div>
          )}

          {/* USERS */}
          {!loading && users.map((u) => (

            <button
              key={u.id}
              type="button"
              onClick={() =>
                handleSelect(u)
              }
              className="
                w-full
                text-left
                px-3
                py-2
                hover:bg-gray-100
                transition
                border-b
                last:border-b-0
              "
            >

              <div className="font-medium text-sm">
                {u.name}
              </div>

              <div className="text-xs text-gray-500">
                {u.email}
              </div>

            </button>
          ))}
        </div>
      )}
    </div>
  )
}