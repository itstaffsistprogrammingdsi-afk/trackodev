import { useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  onEdit?: () => void;
  onDelete?: () => void;
};

const priorities = [
  { value: "low", label: "Low", color: "bg-emerald-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-rose-500" },
];

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dot: string; bg: string }
> = {
  low: { label: "Low", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium", dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { label: "High", dot: "bg-orange-500", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  urgent: { label: "Urgent", dot: "bg-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function BoardColumn({
  board,
  onCardCreated,
  onRefresh,
  onOpenCard,
  onEdit,
  onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id });
  const { data: users = [] } = useUsers();

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [openPriority, setOpenPriority] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>("");

  const [assignees, setAssignees] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [showMembers, setShowMembers] = useState<boolean>(false);

  // REFS
  const menuRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // MENU OPTIONS DROPDOWN
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Close Column Menu on Click Outside / Esc
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Close Priority Dropdown on Click Outside / Esc
  useEffect(() => {
    if (!openPriority) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setOpenPriority(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPriority(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPriority]);

  const selectedUsers = useMemo<User[]>(
    () => users.filter((u) => assignees.includes(u.id)),
    [users, assignees]
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
    setOpenPriority(false);
    setDueDate("");
    setAssignees([]);
    setMemberSearch("");
    setShowMembers(false);
    setError(null);
  };

  const handleCreate = async (): Promise<void> => {
    if (!title.trim()) {
      setError("Judul task tidak boleh kosong.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createCard(board.id, {
        title: title.trim(),
        priority,
        due_date: dueDate ? `${dueDate.replace("T", " ")}:00` : undefined,
        assignees: assignees.length ? assignees : undefined,
      });

      resetForm();
      setIsAdding(false);

      onCardCreated?.();
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal membuat task baru.";
      console.error("Create card failed:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      resetForm();
      setIsAdding(false);
    }
  };

  const handleOpenDatePicker = () => {
    if (dateInputRef.current && "showPicker" in dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex max-h-full w-full sm:w-80 shrink-0 flex-col rounded-2xl border bg-slate-50/70 shadow-sm backdrop-blur-xs transition-all duration-200 ${
        isOver
          ? "border-blue-400 bg-blue-50/30 ring-4 ring-blue-100"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      {/* HEADER COLUMN */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex min-w-0 items-center gap-2.5">
          {board.color && (
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-xs"
              style={{ backgroundColor: board.color }}
            />
          )}
          <h3 className="truncate text-sm font-bold tracking-tight text-slate-800">
            {board.name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
            {board.cards.length}
          </span>

          {(onEdit || onDelete) && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Column options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus:outline-none"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {onEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      <svg
                        className="h-4 w-4 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Column
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <svg
                        className="h-4 w-4 text-rose-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Column
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE TASK AREA */}
      <div className="px-3 pb-3 shrink-0">
        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="group flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300/80 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-500 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-white hover:text-blue-600 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
              <svg
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span>Tambah Task Baru</span>
          </button>
        ) : (
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5 transition-all">
            {/* TOP FORM HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Task Baru
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAdding(false);
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading || !title.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {loading && (
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {loading ? "Menyimpan..." : "Buat Task"}
                </button>
              </div>
            </div>

            {/* TITLE TEXTAREA */}
            <div className="p-3 pb-2">
              <textarea
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Apa yang ingin dikerjakan?"
                rows={2}
                autoFocus
                className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>

            {/* CONTROLS (Due Date, Priority, Assignee) */}
            <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
              {/* DATE PICKER */}
              <div
                onClick={handleOpenDatePicker}
                className="relative flex h-8 cursor-pointer items-center rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                <svg
                  className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <input
                  ref={dateInputRef}
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>

              {/* PRIORITY SELECTOR */}
              <div ref={priorityRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPriority((v) => !v)}
                  className="flex h-8 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[priority].dot}`} />
                    <span className="capitalize">{PRIORITY_CONFIG[priority].label}</span>
                  </div>
                  <svg
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                      openPriority ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openPriority && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150">
                    {priorities.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setPriority(item.value as Priority);
                          setOpenPriority(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                          priority === item.value
                            ? "bg-blue-50 font-semibold text-blue-600"
                            : "font-medium text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span>{item.label}</span>
                        </div>

                        {priority === item.value && (
                          <svg
                            className="h-3.5 w-3.5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ASSIGNEE BUTTON */}
              <button
                type="button"
                onClick={() => setShowMembers((v) => !v)}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                  showMembers || selectedUsers.length > 0
                    ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>Anggota</span>
                {selectedUsers.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-blue-200/80 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
                    {selectedUsers.length}
                  </span>
                )}
              </button>
            </div>

            {/* PREVIEW ASSIGNED AVATARS */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-3 py-2">
                <div className="flex -space-x-2 overflow-hidden">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-blue-600 to-indigo-500 text-[10px] font-bold text-white shadow-xs"
                      title={user.name}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {selectedUsers.length} ditugaskan
                </span>
              </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <div className="border-t border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-600">
                {error}
              </div>
            )}

            {/* EXPANDABLE MEMBER SELECTION */}
            {showMembers && (
              <div className="max-h-52 overflow-y-auto border-t border-slate-100 bg-slate-50/50 p-3">
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
          </div>
        )}
      </div>

      {/* CARDS CONTAINER (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
        <SortableContext
          items={board.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-[80px] space-y-2.5">
            {board.cards.length === 0 && !isAdding && (
              <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 bg-white/40 text-center text-xs text-slate-400">
                <span>Belum ada task</span>
              </div>
            )}

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
    </div>
  );
}