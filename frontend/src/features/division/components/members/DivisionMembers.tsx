import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Loader2,
  Trash2,
  Users,
} from "lucide-react";

import {
  getDivisionMembers,
  addDivisionMember,
  removeDivisionMember,
} from "../../api/division.api";

import type {
  DivisionMember,
} from "../../types";

import type {
  User,
} from "@/features/user/types";

import DivisionMemberMentionInput
  from "./DivisionMemberMentionInput";

import {
  getUserRole,
} from "../../utils/getUserRole";

type Props = {
  divisionId: string;
};

export default function DivisionMembers({
  divisionId,
}: Props) {
  const [members, setMembers] =
    useState<DivisionMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const fetchMembers =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const data =
          await getDivisionMembers(
            divisionId
          );

        setMembers(data ?? []);
      } catch (err) {
        console.error(err);

        setError(
          "Failed to load members."
        );
      } finally {
        setLoading(false);
      }
    }, [divisionId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd =
    async (user: User) => {
      try {
        const exists =
          members.some(
            (member) =>
              member.id === user.id
          );

        if (exists) {
          alert(
            "User is already assigned to this division."
          );
          return;
        }

        await addDivisionMember(
          divisionId,
          {
            user_id: user.id,
            role: "member",
          }
        );

        await fetchMembers();
      } catch (err) {
        console.error(err);

        alert(
          "Failed to add member."
        );
      }
    };

  const handleRemove =
    async (id: string) => {
      const confirmed =
        window.confirm(
          "Remove this member from division?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setRemovingId(id);

        await removeDivisionMember(
          divisionId,
          id
        );

        await fetchMembers();
      } catch (err) {
        console.error(err);

        alert(
          "Failed to remove member."
        );
      } finally {
        setRemovingId(null);
      }
    };

  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <h3
          className="
            text-lg
            font-semibold
            text-gray-900
          "
        >
          Members
        </h3>

        <p
          className="
            text-sm
            text-gray-500
          "
        >
          Search and assign users
          to this division.
        </p>
      </div>

      {/* Add Member */}

      <DivisionMemberMentionInput
        onSelect={handleAdd}
      />

      {/* Error */}

      {error && (
        <div
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-4
            text-sm
            text-red-600
          "
        >
          {error}
        </div>
      )}

      {/* Loading */}

      {loading && (
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            p-10
          "
        >
          <Loader2
            size={18}
            className="animate-spin"
          />

          Loading members...
        </div>
      )}

      {/* Empty State */}

      {!loading &&
        members.length === 0 && (
          <div
            className="
              rounded-xl
              border
              p-10
              text-center
            "
          >
            <Users
              size={32}
              className="
                mx-auto
                mb-3
                text-gray-400
              "
            />

            <h4
              className="
                font-medium
                text-gray-900
              "
            >
              No members yet
            </h4>

            <p
              className="
                mt-1
                text-sm
                text-gray-500
              "
            >
              Search users above
              and add them to this
              division.
            </p>
          </div>
        )}

      {/* Member List */}

      {!loading &&
        members.length > 0 && (
          <div className="space-y-3">
            {members.map(
              (member) => {
                const role =
                  getUserRole(
                    member
                  );

                return (
                  <div
                    key={member.id}
                    className="
                      flex
                      flex-col
                      gap-4
                      rounded-xl
                      border
                      p-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div>
                      <p
                        className="
                          font-medium
                          text-gray-900
                        "
                      >
                        {member.name}
                      </p>

                      <p
                        className="
                          text-sm
                          text-gray-500
                        "
                      >
                        {member.email}
                      </p>
                    </div>

                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <span
                        className="
                          rounded-full
                          bg-blue-100
                          px-3
                          py-1
                          text-xs
                          font-medium
                          text-blue-700
                          capitalize
                        "
                      >
                        {role.replace(
                          "_",
                          " "
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={
                          removingId ===
                          member.id
                        }
                        onClick={() =>
                          handleRemove(
                            member.id
                          )
                        }
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-lg
                          border
                          border-red-200
                          px-3
                          py-2
                          text-sm
                          text-red-600
                          hover:bg-red-50
                          disabled:opacity-50
                        "
                      >
                        {removingId ===
                        member.id ? (
                          <>
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2
                              size={14}
                            />
                            Remove
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
    </div>
  );
}