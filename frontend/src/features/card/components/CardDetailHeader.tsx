import { X, CheckSquare, Clock3, Pencil, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateCard } from "../api/card.api";
import { Brand, User, Label, Card, CardPriority } from "../types";
import PrioritySection from "./sections/PrioritySection";

interface Props {
  cardId: string;
  title: string;
  assignees?: User[];
  brands?: Brand[];
  labels?: Label[];
  priority?: CardPriority;
  dueDate: string;
  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;
  onUpdated: () => Promise<void>;
  onClose: () => void;
  onToggleMembers: () => void;
}

export default function CardDetailHeader({
  cardId,
  title,
  assignees,
  brands,
  labels,
  priority,
  dueDate,
  setDetail,
  onUpdated,
  onClose,
  onToggleMembers,
}: Props) {
  // =========================================
  // TITLE EDIT STATE
  // =========================================
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [savingTitle, setSavingTitle] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(title);
  }, [title]);

  useEffect(() => {
    if (editingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingTitle]);

  const cancelEdit = () => {
    setTitleValue(title);
    setEditingTitle(false);
  };

  const saveTitle = async () => {
    if (savingTitle) return;

    const value = titleValue.trim();

    if (!value || value === title) {
      cancelEdit();
      return;
    }

    try {
      setSavingTitle(true);
      const updated = await updateCard(cardId, { title: value });
      setDetail(updated);
      await onUpdated();
      setEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
      setTitleValue(title);
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <div className="w-full border-b border-slate-200/80 bg-white px-4 py-5 transition-colors sm:px-8 sm:py-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          {/* ========================================= */}
          {/* TITLE SECTION */}
          {/* ========================================= */}
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <CheckSquare size={16} strokeWidth={2.2} />
            </div>

            <div className="min-w-0 flex-1">
              {editingTitle ? (
                <div className="flex items-center gap-2.5">
                  <input
                    ref={inputRef}
                    value={titleValue}
                    disabled={savingTitle}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveTitle();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="
                      w-full rounded-lg border border-blue-500/40 bg-white px-3 py-1.5 text-lg font-bold 
                      text-slate-900 outline-none ring-4 ring-blue-500/10 transition-all 
                      focus:border-blue-500 dark:bg-slate-800 dark:text-white dark:ring-blue-500/20 sm:text-xl
                    "
                  />
                  {savingTitle && (
                    <Loader2
                      size={18}
                      className="shrink-0 animate-spin text-blue-600 dark:text-blue-400"
                    />
                  )}
                </div>
              ) : (
                <div className="group flex items-start gap-2 sm:items-center">
                  <h1 className="break-words text-lg font-bold tracking-tight text-slate-800 sm:text-xl dark:text-slate-100">
                    {title}
                  </h1>

                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="
                      shrink-0 rounded-md p-1.5 text-slate-400 opacity-100 transition-all duration-200 
                      hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 
                      sm:opacity-0 dark:hover:bg-slate-800 dark:hover:text-slate-300
                    "
                    aria-label="Edit Title"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}

              <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                in list{" "}
                <span className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 dark:text-slate-200 dark:decoration-slate-700">
                  Active Support Ticket
                </span>
              </p>
            </div>
          </div>

          {/* ========================================= */}
          {/* METADATA SECTION (VERTICAL LAYOUT) */}
          {/* ========================================= */}
          <div className="mt-6 flex flex-col gap-5 pl-0 sm:pl-9">
            {/* MEMBERS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Members
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {assignees?.map((user) => (
                  <div
                    key={user.id}
                    title={user.name}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white transition-transform duration-200 hover:scale-105 dark:ring-slate-900"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                <button
                  onClick={onToggleMembers}
                  className="
                    flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 
                    bg-slate-50 text-slate-500 transition-all duration-200 hover:border-slate-400 
                    hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 
                    dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200
                  "
                  title="Add / Edit Members"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* BRAND */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Brand
              </span>
              <div className="flex flex-wrap gap-1.5">
                {brands?.length ? (
                  brands.map((b) => (
                    <span
                      key={b.id}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: b.color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      {b.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    No brands
                  </span>
                )}
              </div>
            </div>

            {/* LABELS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Labels
              </span>
              <div className="flex flex-wrap gap-1.5">
                {labels?.length ? (
                  labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: label.color ?? "#3b82f6" }}
                    >
                      {label.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    No labels
                  </span>
                )}
              </div>
            </div>

<div className="space-y-0.5">
  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
    Priority
  </span>

  <div className="w-fit scale-90 origin-left">
    <PrioritySection
      priority={priority}
      onChange={async (newPriority) => {
        try {
          const updated = await updateCard(cardId, {
            priority: newPriority,
          });

          setDetail(updated);
          await onUpdated();
        } catch (error) {
          console.error(
            "Failed to update priority:",
            error
          );
        }
      }}
    />
  </div>
</div>

            {/* DUE DATE */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Due Date
              </span>
              <div className="inline-flex w-max items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Clock3
                  size={14}
                  className={
                    dueDate
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-slate-400"
                  }
                />
                <span className={!dueDate ? "opacity-70" : ""}>
                  {dueDate || "No due date"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="
            flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 
            transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 
            dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300
          "
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
