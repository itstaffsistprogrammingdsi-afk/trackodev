import { useState } from "react"

import { searchUsers }
  from "@/features/user/api/user.api"

import { User }
  from "../../types"

type Props = {
  onSelect: (
    user: User
  ) => void
}

export default function
DivisionMemberMentionInput({
  onSelect
}: Props) {

  const [query, setQuery] =
    useState("")

  const [users, setUsers] =
    useState<User[]>([])

  const [show, setShow] =
    useState(false)

  const handleChange =
    async (val: string) => {

      setQuery(val)

      if (!val) {
        setShow(false)
        return
      }

      const data =
        await searchUsers(val)

      setUsers(data)

      setShow(true)
    }

  return (
    <div className="relative">

      <input
        value={query}
        onChange={(e) =>
          handleChange(
            e.target.value
          )
        }
        placeholder="Search user..."
        className="
          w-full
          border
          p-3
          rounded-xl
        "
      />

      {show && users.length > 0 && (

        <div
          className="
            absolute
            bg-white
            border
            w-full
            mt-1
            rounded-xl
            shadow-lg
            max-h-60
            overflow-y-auto
            z-50
          "
        >

          {users.map((user) => (

            <button
              key={user.id}
              type="button"
              onClick={() => {

                onSelect(user)

                setQuery("")
                setShow(false)

              }}
              className="
                w-full
                text-left
                p-3
                hover:bg-gray-100
                border-b
                last:border-b-0
              "
            >

              <p className="font-medium">
                {user.name}
              </p>

              <p className="text-sm text-gray-500">
                {user.email}
              </p>

            </button>

          ))}

        </div>

      )}

    </div>
  )
}