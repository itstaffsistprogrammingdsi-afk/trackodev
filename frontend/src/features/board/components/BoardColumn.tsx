import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Board } from "../types";
import { AssignTarget, Card, User } from "@/features/card/types";

import CardItem from "@/features/card/components/CardItem";
import MemberSection from "@/features/card/components/sections/MemberSection";
import EmptyState from "@/components/ui/EmptyState";

import { createCard, getBoardMemberCandidates } from "@/features/card/api/card.api";

type Priority = "low" | "medium" | "high" | "urgent";

type Props = {
  board: Board;
  onCardCreated?: () => void | Promise<unknown>;
  onRefresh?: () => void | Promise<unknown>;
  onOpenCard?: (card: Card) => void;
  moveTargets?: Array<{ id: string; name: string }>;
  onMoveCard?: (card: Card, boardId: string) => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
  emptyMessage?: string;
  dragHandle?: ReactNode;
  /**
   * Layout kompak (HP/tablet): kolom mengisi lebar penuh dan scroll vertikal
   * dipegang parent, bukan di dalam kolom.
   */
  fullWidth?: boolean;
  /**
   * Pemilik campaign (bila bukan pembuat card). Dipakai sebagai saran satu
   * klik agar card yang dibuat admin di board anggota tidak berakhir tanpa
   * assignee.
   */
  suggestedAssignee?: { id: string; name: string } | null;
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
  moveTargets,
  onMoveCard,
  onEdit,
  onDelete,
  emptyMessage = "Belum ada task",
  dragHandle,
  suggestedAssignee,
  fullWidth = false,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id });

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [openPriority, setOpenPriority] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>("");

  const [assignees, setAssignees] = useState<string[]>([]);
  const [assigneeTargets, setAssigneeTargets] = useState<Record<string, AssignTarget>>({});
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [showMembers, setShowMembers] = useState<boolean>(false);

  // Kandidat member diambil per-board (sumber identik dengan card tool),
  // bukan daftar user global — supaya pencarian nama selalu menemukan user
  // lintas divisi seperti di card tool.
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["board-member-candidates", board.id],
    queryFn: () => getBoardMemberCandidates(board.id),
    enabled: showMembers,
    staleTime: 30_000,
  });

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

  const handleTargetChange = (userId: string, target: AssignTarget | null): void => {
    setAssigneeTargets((prev) => {
      if (!target || (!target.campaignId && !target.createName && !target.forceInbox)) {
        const { [userId]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      }
      return { ...prev, [userId]: target };
    });
  };

  const handleUnassign = (userId: string): void => {
    setAssignees((prev) => prev.filter((id) => id !== userId));
    handleTargetChange(userId, null);
  };

  const resetForm = (): void => {
    setTitle("");
    setPriority("medium");
    setOpenPriority(false);
    setDueDate("");
    setAssignees([]);
    setAssigneeTargets({});
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
        assignee_targets: Object.fromEntries(
          Object.entries(assigneeTargets)
            .filter(([, target]) => target.campaignId)
            .map(([userId, target]) => [userId, target.campaignId as string]),
        ),
        create_campaigns: Object.fromEntries(
          Object.entries(assigneeTargets)
            .filter(([, target]) => target.createName)
            .map(([userId, target]) => [userId, target.createName as string]),
        ),
        force_inbox: Object.entries(assigneeTargets)
          .filter(([, target]) => target.forceInbox)
          .map(([userId]) => userId),
      });

      resetForm();
      setIsAdding(false);

      if (onCardCreated) {
        await onCardCreated();
      } else {
        await onRefresh?.();
      }
    } catch (err: unknown) {
      let message = "Gagal membuat task baru.";
      if (err instanceof AxiosError) {
        const serverMessage = err.response?.data?.message;
        message =
          typeof serverMessage === "string" && serverMessage.trim().length > 0
            ? serverMessage
            : message;
      } else if (err instanceof Error) {
        message = err.message;
      }
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
      className={`flex max-h-none w-full shrink-0 flex-col rounded-panel border transition-colors duration-200 ${
        fullWidth ? "max-w-none" : "md:h-full md:w-80"
      } ${
        isOver
          ? "border-accent/40 bg-accent-soft/40 ring-2 ring-accent/10"
          : "border-line/80 bg-surface-muted/50 hover:border-line-strong"
      }`}
    >
      {/* HEADER COLUMN */}
      <div className="flex shrink-0 items-center justify-between px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {dragHandle}
          {board.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: board.color }}
            />
          )}
          <h3 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-fg">
            {board.name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums text-fg-subtle">
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
                className="flex h-11 w-11 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 md:h-auto md:w-auto md:p-1.5"
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
                  className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-e2 animate-in fade-in zoom-in-95 duration-100"
                >
                  {onEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                    >
                      <svg
                        className="h-4 w-4 text-fg-subtle"
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
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
                    >
                      <svg
                        className="h-4 w-4 text-danger"
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
      <div className="shrink-0 px-3 pb-3">
        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="group flex min-h-11 w-full items-center gap-2 rounded-control px-2.5 py-2 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 md:min-h-9"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface text-fg-subtle shadow-e1 transition-colors group-hover:text-accent">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <span>Tambah task</span>
          </button>
        ) : (
          <div className="flex flex-col rounded-card border border-line bg-surface shadow-e2">
            {/* TOP FORM HEADER */}
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-[11px] font-medium text-fg-subtle">
                Task baru
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAdding(false);
                  }}
                  className="min-h-9 rounded-control px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg md:min-h-0"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading || !title.trim()}
                  className="flex min-h-9 items-center gap-1.5 rounded-control bg-accent px-3 py-1 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle md:min-h-0"
                >
                  {loading && (
                    <svg className="h-3 w-3 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {loading ? "Menyimpan..." : "Buat task"}
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
                className="w-full resize-none border-0 bg-transparent p-0 text-sm font-medium text-fg placeholder:font-normal placeholder:text-fg-subtle focus:outline-none focus:ring-0"
              />
            </div>

            {/* CONTROLS (Due Date, Priority, Assignee) */}
            <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
              {/* DATE PICKER */}
              <div
                onClick={handleOpenDatePicker}
                className="relative flex h-11 flex-1 cursor-pointer items-center rounded-control border border-line bg-surface-muted/60 px-2.5 transition-colors hover:border-line-strong hover:bg-surface-muted md:h-8 md:flex-none"
              >
                <svg
                  className="mr-1.5 h-3.5 w-3.5 shrink-0 text-fg-subtle"
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
                  className="w-full cursor-pointer bg-transparent text-xs font-medium text-fg outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>

              {/* PRIORITY SELECTOR */}
              <div ref={priorityRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPriority((v) => !v)}
                  className="flex h-11 items-center justify-between gap-2 rounded-control border border-line bg-surface-muted/60 px-2.5 text-xs font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 md:h-8"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[priority].dot}`} />
                    <span className="capitalize">{PRIORITY_CONFIG[priority].label}</span>
                  </div>
                  <svg
                    className={`h-3.5 w-3.5 text-fg-subtle transition-transform duration-200 ${
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
                  <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-card border border-line bg-surface p-1 shadow-e2 animate-in fade-in zoom-in-95 duration-150">
                    {priorities.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setPriority(item.value as Priority);
                          setOpenPriority(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-control px-2.5 py-1.5 text-left text-xs transition-colors ${
                          priority === item.value
                            ? "bg-accent-soft font-medium text-accent"
                            : "font-medium text-fg-muted hover:bg-surface-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span>{item.label}</span>
                        </div>

                        {priority === item.value && (
                          <svg
                            className="h-3.5 w-3.5 text-accent"
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
                className={`flex h-11 items-center gap-1.5 rounded-control border px-2.5 text-xs font-medium transition-colors md:h-8 ${
                  showMembers || selectedUsers.length > 0
                    ? "border-accent/25 bg-accent-soft text-accent hover:bg-accent-soft/70"
                    : "border-line bg-surface-muted/60 text-fg-muted hover:border-line-strong hover:bg-surface-muted"
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
                  <span className="ml-0.5 rounded-full bg-accent/15 px-1.5 py-0.2 text-[10px] font-semibold text-accent">
                    {selectedUsers.length}
                  </span>
                )}
              </button>
            </div>

            {/* SARAN PEMILIK CAMPAIGN */}
            {suggestedAssignee && assignees.length === 0 ? (
              <div className="border-t border-warning/15 bg-warning-soft/60 px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleAssign(suggestedAssignee.id)}
                  className="w-full rounded-control border border-warning/25 bg-warning-soft px-2.5 py-1.5 text-left text-[11px] font-medium text-warning transition-colors hover:bg-warning-soft/70"
                >
                  Tugaskan ke {suggestedAssignee.name}?
                  <span className="ml-1 font-normal text-warning/80">
                    (pemilik campaign)
                  </span>
                </button>
              </div>
            ) : null}

            {/* PREVIEW ASSIGNED AVATARS */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 border-t border-line bg-surface-muted/40 px-3 py-2">
                <div className="flex -space-x-2 overflow-hidden">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-accent-soft text-[10px] font-semibold text-accent shadow-e1"
                      title={user.name}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-medium text-fg-muted">
                  {selectedUsers.length} ditugaskan
                </span>
              </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <div
                role="alert"
                className="border-t border-danger/15 bg-danger-soft px-3 py-1.5 text-[11px] font-medium text-danger"
              >
                {error}
              </div>
            )}

            {/* EXPANDABLE MEMBER SELECTION */}
            {showMembers && (
              <div className="max-h-52 overflow-y-auto border-t border-line bg-surface-muted/40 p-3">
                <MemberSection
                  boardId={board.id}
                  users={users}
                  memberSearch={memberSearch}
                  setMemberSearch={setMemberSearch}
                  assignees={selectedUsers}
                  handleAssign={handleAssign}
                  handleUnassign={handleUnassign}
                  assigneeTargets={assigneeTargets}
                  onTargetChange={handleTargetChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARDS CONTAINER (SCROLLABLE) */}
      <div className="custom-scrollbar flex-none overflow-visible px-3 pb-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <SortableContext
          items={board.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-[80px] space-y-2">
            {board.cards.length === 0 && !isAdding && (
              <EmptyState
                compact
                icon={Inbox}
                title={emptyMessage}
                description="Tarik kartu ke sini atau buat task baru."
              />
            )}

            {board.cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onRefresh={onRefresh}
                onOpen={onOpenCard}
                moveTargets={moveTargets}
                onMove={onMoveCard}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
