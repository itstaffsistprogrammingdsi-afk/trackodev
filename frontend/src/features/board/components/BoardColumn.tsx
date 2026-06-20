import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import DatePicker from "react-datepicker";

import { Board } from "../types";
import { Card, User } from "@/features/card/types";

import CardItem from "@/features/card/components/CardItem";
import MemberSection from "@/features/card/components/sections/MemberSection";

import { createCard } from "@/features/card/api/card.api";
import { useUsers } from "@/features/user/hooks/useUsers";

type Priority = "low" | "medium" | "high" | "urgent";

type Props = {
  board: Board;
  onCardCreated?: () => void;
  onRefresh?: () => void;
  onOpenCard?: (card: Card) => void;
};

export default function BoardColumn({
  board,
  onCardCreated,
  onRefresh,
  onOpenCard,
}: Props) {
  const { setNodeRef } = useDroppable({ id: board.id });
  const { data: users = [] } = useUsers();

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("medium");

  const [dueDate, setDueDate] = useState<Date | null>(null);

  const [assignees, setAssignees] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [showMembers, setShowMembers] = useState<boolean>(false);

  const selectedUsers = useMemo<User[]>(
    () => users.filter((u) => assignees.includes(u.id)),
    [users, assignees],
  );

  const handleAssign = (userId: string): void => {
    setAssignees((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
  };

  const handleUnassign = (userId: string): void => {
    setAssignees((prev) => prev.filter((id) => id !== userId));
  };

  const resetForm = (): void => {
    setTitle("");
    setPriority("medium");
    setDueDate(null);
    setAssignees([]);
    setMemberSearch("");
    setShowMembers(false);
  };

  const handleCreate = async (): Promise<void> => {
    if (!title.trim()) return;

    try {
      setLoading(true);

      await createCard(board.id, {
        title,
        priority,
        due_date: dueDate
          ? dueDate
              .toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })
              .replace("T", " ")
          : undefined,
        assignees: assignees.length ? assignees : undefined,
      });

      resetForm();
      setIsAdding(false);

      onCardCreated?.();
      onRefresh?.();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Create card failed:", error.message);
      } else {
        console.error("Create card failed:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const priorityBadgeClass = (p: Priority): string => {
    switch (p) {
      case "low":
        return "bg-green-50 text-green-600";
      case "medium":
        return "bg-yellow-50 text-yellow-600";
      case "high":
        return "bg-orange-50 text-orange-600";
      case "urgent":
        return "bg-red-50 text-red-600";
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="
        w-80 shrink-0
        rounded-2xl
        border border-gray-200/70
        bg-gradient-to-b from-gray-50 to-white
        shadow-sm
      "
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{board.name}</h3>

        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          {board.cards.length}
        </span>
      </div>

      {/* CARDS */}
      <div className="px-3 pb-2">
        <SortableContext
          items={board.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-[60px] space-y-2">
            {board.cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onRefresh={onRefresh}
                onOpen={onOpenCard}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* ADD BUTTON */}
      {!isAdding ? (
        <div className="px-3 pb-3">
          <button
            onClick={() => setIsAdding(true)}
            className="
              w-full rounded-xl
              border border-dashed border-gray-300
              bg-white py-2.5
              text-sm font-medium text-gray-500
              transition
              hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40
            "
          >
            + Create Task
          </button>
        </div>
      ) : (
        <div className="mx-3 mb-3 rounded-2xl border border-gray-200 bg-white shadow-md">
          {/* TITLE */}
          <div className="p-3">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
              className="
                w-full resize-none border-0
                text-sm text-gray-800
                placeholder:text-gray-400
                focus:outline-none
              "
            />

            <span
              className={`
    mt-2 inline-flex rounded-sm px-1.5 py-[2px] text-[9px] font-semibold leading-none
    ${priorityBadgeClass(priority)}
  `}
            >
              {priority.toUpperCase()}
            </span>
          </div>

          {/* META */}
          <div className="grid grid-cols-2 gap-2 px-3 pb-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="
                w-full rounded-lg border border-gray-200
                px-2 py-2 text-xs
                focus:border-blue-500 focus:outline-none
              "
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {/* DATE TIME PICKER */}
            <DatePicker
              selected={dueDate}
              onChange={(date: Date | null) => setDueDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy HH:mm"
              placeholderText="Due date & time"
              className="
                w-full rounded-lg border border-gray-200
                px-2 py-2 text-xs
                focus:border-blue-500 focus:outline-none
              "
            />
          </div>

          {/* ASSIGNEES */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 pb-3">
              <div className="flex -space-x-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="
                      flex h-7 w-7 items-center justify-center
                      rounded-full border-2 border-white
                      bg-gradient-to-br from-blue-500 to-indigo-600
                      text-[10px] font-semibold text-white
                    "
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>

              <span className="text-[11px] text-gray-500">
                {selectedUsers.length} assigned
              </span>
            </div>
          )}

          {/* MEMBER SECTION */}
          {showMembers && (
            <div className="border-t border-gray-100 p-3">
              <MemberSection
                users={users}
                memberSearch={memberSearch}
                setMemberSearch={setMemberSearch}
                assignees={selectedUsers}
                handleAssign={handleAssign}
                handleUnassign={handleUnassign}
              />
            </div>
          )}

          {/* FOOTER */}
          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => setShowMembers((v) => !v)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Members
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setIsAdding(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="
                  rounded-lg bg-blue-600 px-3 py-1.5
                  text-xs font-medium text-white
                  hover:bg-blue-700
                  disabled:opacity-50
                "
              >
                {loading ? "..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
