import { useState } from "react";
import { useCreateCard } from "../hooks/useCards";
import MemberSection from "../components/sections/MemberSection";
import { User } from "../types";

export default function CreateCardInline({
  boardId,
  users,
}: {
  boardId: string;
  users: User[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  const mutation = useCreateCard(boardId);

  const handleAssign = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    );
  };

  const handleUnassign = (userId: string) => {
    setAssignees((prev) => prev.filter((id) => id !== userId));
  };

  const resetForm = () => {
    setTitle("");
    setAssignees([]);
    setMemberSearch("");
    setShowMembers(false);
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    mutation.mutate(
      {
        title,
        assignees: assignees.length ? assignees : undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          setOpen(false);
        },
      }
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 hover:text-black"
      >
        + Add Card
      </button>
    );
  }

  const selectedUsers = users.filter((u) =>
    assignees.includes(u.id)
  );

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      {/* TITLE */}
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Card title..."
        autoFocus
      />

      {/* ASSIGNED MEMBERS */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
            >
              <span>{user.name}</span>

              <button
                type="button"
                onClick={() => handleUnassign(user.id)}
                className="font-bold text-blue-500 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ASSIGN MEMBER BUTTON */}
      <button
        type="button"
        onClick={() => setShowMembers((prev) => !prev)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
      >
        {showMembers ? "Hide Members" : "Assign Member"}
      </button>

      {/* MEMBER SECTION */}
      {showMembers && (
        <MemberSection
          users={users}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          assignees={selectedUsers}
          handleAssign={handleAssign}
          handleUnassign={handleUnassign}
        />
      )}

      {/* ACTIONS */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCreate}
          disabled={mutation.isPending}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Add"}
        </button>

        <button
          onClick={() => {
            resetForm();
            setOpen(false);
          }}
          className="text-sm text-gray-600 hover:text-black"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}