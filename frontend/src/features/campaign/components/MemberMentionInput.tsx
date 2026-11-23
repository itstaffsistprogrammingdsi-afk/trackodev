import { useEffect, useId, useRef, useState } from "react"
import { searchUsers } from "../api/campaign.api"
import { User } from "../types"
import { Skeleton } from "@/components/ui/Skeleton"

type Props = {
  onSelect: (user: User) => void
  collaboratorOnly?: boolean
  workspaceId?: string
  placeholder?: string
}

export default function MemberMentionInput({
  onSelect,
  collaboratorOnly = false,
  workspaceId,
  placeholder,
}: Props) {

  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)
  const debounceRef = useRef<number | null>(null)
  const listboxId = useId()

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // ============================================
  // SEARCH USER
  // ============================================

  const handleChange = (
    val: string
  ) => {

    setQuery(val)
    const requestId = ++requestIdRef.current

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    // 🔥 hilangkan @ jika ada
    const keyword = val
      .replace("@", "")
      .trim()

    // 🔥 kosong -> hide
    if (!keyword.length) {

      setUsers([])
      setShow(false)
      setLoading(false)

      return
    }

    setLoading(true)
    setShow(true)

    debounceRef.current = window.setTimeout(async () => {
      try {
        const data =
          await searchUsers(keyword, collaboratorOnly, workspaceId)

        if (requestId === requestIdRef.current) {
          setUsers(data)
          setShow(true)
        }
      } catch (err) {
        console.error(err)

        if (requestId === requestIdRef.current) {
          setUsers([])
          setShow(false)
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }, 300)
  }

  // ============================================
  // SELECT USER
  // ============================================

  const handleSelect = (
    user: User
  ) => {

    onSelect(user)

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    setQuery("")
    setUsers([])
    setShow(false)
    setLoading(false)
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
        placeholder={placeholder ?? (collaboratorOnly ? "Cari collaborator..." : "Cari user...")}
        aria-label={collaboratorOnly ? "Cari collaborator" : "Cari user"}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listboxId}
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
          id={listboxId}
          role="listbox"
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
            <div className="space-y-2 p-3" role="status" aria-busy="true">
              <span className="sr-only">Mencari user</span>
              <Skeleton className="h-8 w-full rounded-control" />
              <Skeleton className="h-8 w-4/5 rounded-control" />
            </div>
          )}

          {/* EMPTY */}
          {!loading && users.length === 0 && (
            <div className="p-3 text-sm text-fg-muted">
              User tidak ditemukan.
            </div>
          )}

          {/* USERS */}
          {!loading && users.map((u) => (

            <button
              key={u.id}
              type="button"
              role="option"
              aria-selected="false"
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

              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                <span>{u.email}</span>
                {u.collaborator_label ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                    {u.collaborator_label}
                  </span>
                ) : null}
              </div>

              {u.division_names?.length ? (
                <div className="mt-1 text-xs text-gray-400">
                  {u.division_names.join(" · ")}
                </div>
              ) : null}

            </button>
          ))}
        </div>
      )}
    </div>
  )
}
