import { useState } from "react";

import { useCreateDivision } from "../hooks/useDivisions";

import { useUsers } from "@/features/user/hooks/useUsers";

import UserPicker from "./UserPicker";

import type { User } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateDivisionModal({
  open,
  onClose,
}: Props) {
  const createMutation = useCreateDivision();

  const { data: users = [] } = useUsers();

  const [name, setName] = useState("");

  const [code, setCode] = useState("");

  const [description, setDescription] =
    useState("");

  const [selectedAdmins, setSelectedAdmins] =
    useState<User[]>([]);

  const [selectedMembers, setSelectedMembers] =
    useState<User[]>([]);

  if (!open) return null;

  // ============================================
  // ADMIN USERS
  // ============================================

  const adminUsers = users.filter((user) =>
    user.roles?.includes("admin")
  );

  // ============================================
  // MEMBER USERS
  // admin tidak ditampilkan lagi
  // ============================================

  const availableMembers = users.filter(
    (user) =>
      !selectedAdmins.some(
        (admin) => admin.id === user.id
      )
  );

  // ============================================
  // ADMIN HANDLER
  // ============================================

  const addAdmin = (user: User) => {
    setSelectedAdmins((prev) => {
      if (prev.some((x) => x.id === user.id))
        return prev;

      return [...prev, user];
    });

    setSelectedMembers((prev) =>
      prev.filter((x) => x.id !== user.id)
    );
  };

  const removeAdmin = (userId: string) => {
    setSelectedAdmins((prev) =>
      prev.filter((x) => x.id !== userId)
    );
  };

  // ============================================
  // MEMBER HANDLER
  // ============================================

  const addMember = (user: User) => {
    if (
      selectedAdmins.some(
        (admin) => admin.id === user.id
      )
    ) {
      return;
    }

    setSelectedMembers((prev) => {
      if (prev.some((x) => x.id === user.id))
        return prev;

      return [...prev, user];
    });
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.filter((x) => x.id !== userId)
    );
  };

  // ============================================
  // SUBMIT
  // ============================================

  const submit = async () => {
    if (!name.trim()) return;

    await createMutation.mutateAsync({
      name,

      code: code || undefined,

      description,

      admin_ids: selectedAdmins.map(
        (user) => user.id
      ),

      member_ids: selectedMembers.map(
        (user) => user.id
      ),
    });

    setName("");
    setCode("");
    setDescription("");

    setSelectedAdmins([]);
    setSelectedMembers([]);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold">
            Create Division
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Create division and assign
            administrators & members.
          </p>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* BASIC INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Division Name
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Division name"
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Division Code
              </label>

              <input
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Code"
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={4}
              placeholder="Description..."
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>

          {/* PICKERS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ADMIN */}
            <UserPicker
              title="Division Admin"
              users={adminUsers}
              selectedUsers={selectedAdmins}
              onAdd={addAdmin}
              onRemove={removeAdmin}
              placeholder="Search admin..."
            />

            {/* MEMBER */}
            <UserPicker
              title="Division Members"
              users={availableMembers}
              selectedUsers={selectedMembers}
              onAdd={addMember}
              onRemove={removeMember}
              placeholder="Search member..."
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={createMutation.isPending}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
          >
            {createMutation.isPending
              ? "Creating..."
              : "Create Division"}
          </button>
        </div>
      </div>
    </div>
  );
}