import { useState } from "react";

import { useDroppable } from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Board } from "../types";

import CardItem from "@/features/card/components/CardItem";

import { createCard } from "@/features/card/api/card.api";

import {
  Card,
  User,
} from "@/features/card/types";

import MemberSection from "@/features/card/components/sections/MemberSection";

import { useUsers } from "@/features/user/hooks/useUsers";

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
  const { setNodeRef } = useDroppable({
    id: board.id,
  });

  const { data: users = [] } =
    useUsers();

  const [isAdding, setIsAdding] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [assignees, setAssignees] =
    useState<string[]>([]);

  const [memberSearch, setMemberSearch] =
    useState("");

  const [showMembers, setShowMembers] =
    useState(false);

  const selectedUsers: User[] =
    users.filter((u) =>
      assignees.includes(u.id)
    );

  const handleAssign = (
    userId: string
  ) => {
    setAssignees((prev) =>
      prev.includes(userId)
        ? prev
        : [...prev, userId]
    );
  };

  const handleUnassign = (
    userId: string
  ) => {
    setAssignees((prev) =>
      prev.filter(
        (id) => id !== userId
      )
    );
  };

  const resetForm = () => {
    setTitle("");
    setAssignees([]);
    setMemberSearch("");
    setShowMembers(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    try {
      setLoading(true);

      await createCard(board.id, {
        title,
        assignees:
          assignees.length > 0
            ? assignees
            : undefined,
      });

      resetForm();

      setIsAdding(false);

      onCardCreated?.();

      onRefresh?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="w-72 bg-gray-100 rounded-xl p-3 min-h-[200px] flex flex-col"
    >
      <h3 className="font-semibold mb-2">
        {board.name}
      </h3>

      <SortableContext
        items={board.cards.map(
          (c) => c.id
        )}
        strategy={
          verticalListSortingStrategy
        }
      >
        <div className="space-y-2 flex-1">
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

      {!isAdding ? (
        <button
          onClick={() =>
            setIsAdding(true)
          }
          className="mt-3 text-sm text-gray-500 hover:text-black text-left"
        >
          + Add task
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-lg border bg-white p-3">
          {/* TITLE */}
          <textarea
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            placeholder="Task title..."
            className="w-full border p-2 rounded"
          />

          {/* SELECTED MEMBERS */}
          {selectedUsers.length >
            0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(
                (user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
                  >
                    <span>
                      {user.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleUnassign(
                          user.id
                        )
                      }
                      className="font-bold hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* ASSIGN BUTTON */}
          <button
            type="button"
            onClick={() =>
              setShowMembers(
                (prev) => !prev
              )
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            {showMembers
              ? "Hide Members"
              : "Assign Members"}
          </button>

          {/* MEMBER SECTION */}
          {showMembers && (
            <MemberSection
              users={users}
              memberSearch={
                memberSearch
              }
              setMemberSearch={
                setMemberSearch
              }
              assignees={
                selectedUsers
              }
              handleAssign={
                handleAssign
              }
              handleUnassign={
                handleUnassign
              }
            />
          )}

          {/* ACTIONS */}
          <div className="flex gap-2">
            <button
              onClick={
                handleCreate
              }
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              {loading
                ? "Adding..."
                : "Add"}
            </button>

            <button
              onClick={() => {
                resetForm();
                setIsAdding(
                  false
                );
              }}
              className="px-3 py-1 rounded border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}