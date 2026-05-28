import {
  useState,
} from "react"

import {
  searchDesigners,
} from "../api/form.api"

import { User } from "../types"

type Props = {
  divisionId?: string

  selected?: User | null

  onSelect: (
    user: User
  ) => void
}

export default function DesignerPicker({
  divisionId,
  selected,
  onSelect,
}: Props) {

  const [query, setQuery] =
    useState("")

  const [users, setUsers] =
    useState<User[]>([])

  const [show, setShow] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  // ============================================
  // SEARCH
  // ============================================

  const handleChange = async (
    val: string
  ) => {

    setQuery(val)

    if (!divisionId) {
      return
    }

    const keyword =
      val.trim()

    if (!keyword.length) {

      setUsers([])
      setShow(false)

      return
    }

    try {

      setLoading(true)

      const data =
        await searchDesigners(
          keyword,
          divisionId
        )

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
  // SELECT
  // ============================================

  const handleSelect = (
    user: User
  ) => {

    onSelect(user)

    setQuery(user.name)

    setShow(false)
  }

  return (

    <div className="relative">

      <input
        value={query}
        disabled={!divisionId}
        onChange={(e) =>
          handleChange(
            e.target.value
          )
        }
        placeholder={
          !divisionId
            ? "Pilih division terlebih dahulu"
            : "Cari designer..."
        }
        className="
          w-full
          rounded-xl
          border
          px-3 py-2
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
            mt-2
            max-h-60
            w-full
            overflow-y-auto
            rounded-xl
            border
            bg-white
            shadow-lg
          "
        >

          {loading && (

            <div className="p-3 text-sm">
              Loading...
            </div>
          )}

          {!loading &&
            users.length === 0 && (

            <div className="p-3 text-sm text-zinc-500">
              User tidak ditemukan
            </div>
          )}

          {!loading &&
            users.map((u) => (

            <button
              key={u.id}
              type="button"
              onClick={() =>
                handleSelect(u)
              }
              className="
                w-full
                border-b
                px-3 py-2
                text-left
                hover:bg-zinc-100
              "
            >

              <div className="text-sm font-medium">
                {u.name}
              </div>

              <div className="text-xs text-zinc-500">
                {u.email}
              </div>

            </button>
          ))}
        </div>
      )}

      {selected && (

        <div
          className="
            mt-3
            rounded-2xl
            border
            border-emerald-200
            bg-emerald-50
            px-4 py-3
          "
        >

          <p
            className="
              text-xs
              text-emerald-700
            "
          >
            Designer dipilih
          </p>

          <p
            className="
              text-sm
              font-semibold
              text-emerald-900
            "
          >
            {selected.name}
          </p>
        </div>
      )}
    </div>
  )
}