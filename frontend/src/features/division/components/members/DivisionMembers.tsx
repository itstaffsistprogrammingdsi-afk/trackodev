import {
  useCallback,
  useEffect,
  useState
} from "react"

import {
  getDivisionMembers,
  addDivisionMember,
  removeDivisionMember
} from "../../api/division.api"

import {
  DivisionMember,
  User
} from "../../types"

import DivisionMemberMentionInput
  from "./DivisionMemberMentionInput"

import { getUserRole }
  from "../../utils/getUserRole"

type Props = {
  divisionId: string
}

export default function DivisionMembers({
  divisionId
}: Props) {

  const [members, setMembers] =
    useState<DivisionMember[]>([])

  const fetchMembers =
    useCallback(async () => {

      const data =
        await getDivisionMembers(
          divisionId
        )

      setMembers(data)

    }, [divisionId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleAdd =
    async (user: User) => {

      await addDivisionMember(
        divisionId,
        {
          user_id: user.id
        }
      )

      fetchMembers()
    }

  const handleRemove =
    async (id: string) => {

      await removeDivisionMember(
        divisionId,
        id
      )

      fetchMembers()
    }

  return (
    <div className="mt-6 space-y-5">

      <div>

        <h3 className="text-lg font-semibold">
          Members
        </h3>

        <p className="text-sm text-gray-500">
          Assign user to division
        </p>

      </div>

      {/* ASSIGN */}

      <DivisionMemberMentionInput
        onSelect={handleAdd}
      />

      {/* LIST */}

      <div className="space-y-3">

        {members.map((member) => {

          const role =
            getUserRole(member)

          return (

            <div
              key={member.id}
              className="border rounded-xl p-4 flex items-center justify-between"
            >

              <div>

                <p className="font-medium">
                  {member.name}
                </p>

                <p className="text-sm text-gray-500">
                  {member.email}
                </p>

              </div>

              <div className="flex items-center gap-3">

                <span
                  className="
                    text-xs
                    px-3
                    py-1
                    rounded-full
                    bg-blue-100
                    text-blue-700
                    capitalize
                  "
                >
                  {role.replace("_", " ")}
                </span>

                <button
                  onClick={() =>
                    handleRemove(
                      member.id
                    )
                  }
                  className="
                    text-red-500
                    text-sm
                  "
                >
                  Remove
                </button>

              </div>

            </div>
          )
        })}

      </div>

    </div>
  )
}