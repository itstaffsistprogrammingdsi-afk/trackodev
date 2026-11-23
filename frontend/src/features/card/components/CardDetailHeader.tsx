import { X, CheckSquare, Clock3, Pencil, Loader2, Plus, Copy, Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateCard } from "../api/card.api";
import { Brand, User, Label, Card, CardPriority } from "../types";
import PrioritySection from "./sections/PrioritySection";
import { useAuth } from "@/context/AuthContext";
import { openAssistant } from "@/features/ai/assistant";

interface Props {
  cardId: string;
  title: string;
  listName?: string;
  assignees?: User[];
  brands?: Brand[];
  labels?: Label[];
  priority?: CardPriority;
  dueDate: string;
  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;
  onUpdated: (updated?: Partial<Card>) => Promise<void> | void;
  onClose: () => void;
  onToggleMembers: () => void;
  onDuplicate: () => void;
}

export default function CardDetailHeader({
  cardId,
  title,
  listName,
  assignees,
  brands,
  labels,
  priority,
  dueDate,
  setDetail,
  onUpdated,
  onClose,
  onToggleMembers,
  onDuplicate,
}: Props) {
  const { can } = useAuth();
  const canDuplicate = can("card.create") || can("task.create");
  // =========================================
  // TITLE EDIT STATE
  // =========================================
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [actionError, setActionError] = useState("");
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
      setActionError("");
      const updated = await updateCard(cardId, { title: value });
      setDetail(updated);
      await onUpdated(updated);
      setEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
      setTitleValue(title);
      setActionError("Perubahan card gagal disimpan.");
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <div className="w-full bg-white px-4 py-3.5 transition-colors md:border-b md:border-slate-200/80 md:px-8 md:py-6 dark:bg-slate-900 dark:md:border-slate-800">
      <div className="flex items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          {/* ========================================= */}
          {/* TITLE SECTION */}
          {/* ========================================= */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-subtle">
              <CheckSquare size={15} strokeWidth={1.8} />
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
                    className="w-full rounded-control border border-accent/40 bg-surface px-3 py-1.5 text-lg font-medium text-fg outline-none ring-2 ring-accent/15 transition-colors sm:text-xl"
                    aria-label="Judul card"
                  />
                  {savingTitle && (
                    <Loader2
                      size={17}
                      className="shrink-0 animate-spin text-accent motion-reduce:animate-none"
                    />
                  )}
                </div>
              ) : (
                <div className="group flex items-start gap-2 sm:items-center">
                  <h1 className="break-words text-lg font-semibold tracking-[-0.01em] text-fg sm:text-xl">
                    {title}
                  </h1>

                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="shrink-0 rounded-control p-1.5 text-fg-subtle opacity-100 transition-colors hover:bg-surface-muted hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    aria-label="Edit judul"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}

              <p className="mt-1 text-xs text-fg-muted md:text-[13px]">
                <span className="md:hidden">Detail card dan progres pekerjaan</span>
                <span className="hidden md:inline">
                  di daftar{" "}
                  <span className="font-medium text-fg">
                    {listName || "Tanpa daftar"}
                  </span>
                </span>
              </p>
            </div>
          </div>

          {/* ========================================= */}
          {/* METADATA SECTION (VERTICAL LAYOUT) */}
          {/* ========================================= */}
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:flex-col md:gap-5 md:overflow-visible md:pb-0 md:pl-10">
            {/* MEMBERS */}
            <div className="min-w-32 rounded-control border border-line bg-surface-muted/60 p-3 md:min-w-0 md:flex md:flex-col md:gap-1.5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <span className="text-[11px] font-medium text-fg-subtle">
                Anggota
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {assignees?.map((user) => (
                  <div
                    key={user.id}
                    title={user.name}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent ring-2 ring-surface"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                <button
                  onClick={onToggleMembers}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-line-strong bg-surface text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                  title="Tambah atau ubah anggota"
                  aria-label="Tambah atau ubah anggota"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* BRAND */}
            <div className="min-w-52 rounded-control border border-line bg-surface-muted/60 p-3 md:min-w-0 md:flex md:flex-col md:gap-1.5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <span className="text-[11px] font-medium text-fg-subtle">
                Brand
              </span>
              <div className="flex flex-wrap gap-1.5">
                {brands?.length ? (
                  brands.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-muted ring-1 ring-line"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-fg-subtle">
                    Belum ada brand
                  </span>
                )}
              </div>
            </div>

            {/* LABELS */}
            <div className="min-w-52 rounded-control border border-line bg-surface-muted/60 p-3 md:min-w-0 md:flex md:flex-col md:gap-1.5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <span className="text-[11px] font-medium text-fg-subtle">
                Label
              </span>
              <div className="flex flex-wrap gap-1.5">
                {labels?.length ? (
                  labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-muted ring-1 ring-line"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: label.color ?? "var(--tracko-fg-subtle)" }}
                      />
                      {label.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-fg-subtle">
                    Belum ada label
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-32 rounded-control border border-line bg-surface-muted/60 p-3 md:min-w-0 md:space-y-0.5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <span className="text-[11px] font-medium text-fg-subtle">
                Prioritas
              </span>

              <div className="mt-1 w-fit">
                <PrioritySection
                  priority={priority}
                  onChange={async (newPriority) => {
                    try {
                      setActionError("");
                      const updated = await updateCard(cardId, {
                        priority: newPriority,
                      });

                      setDetail(updated);
                      await onUpdated(updated);
                    } catch (error) {
                      console.error("Failed to update priority:", error);
                      setActionError("Priority gagal diperbarui.");
                    }
                  }}
                />
              </div>
            </div>

            {/* DUE DATE */}
            <div className="min-w-44 rounded-control border border-line bg-surface-muted/60 p-3 md:min-w-0 md:flex md:flex-col md:gap-1.5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <span className="text-[11px] font-medium text-fg-subtle">
                Tenggat waktu
              </span>
              <div className="mt-1.5 flex min-h-8 items-center gap-2 text-xs font-medium text-fg-muted md:mt-0 md:min-h-0 md:w-max md:rounded-control md:bg-surface-muted md:px-2.5 md:py-1.5">
                <Clock3 size={14} className="text-fg-subtle" />
                <span className={!dueDate ? "text-fg-subtle" : ""}>
                  {dueDate || "Belum diatur"}
                </span>
              </div>
            </div>
          </div>
          {actionError ? (
            <p role="alert" className="mt-3 text-xs font-medium text-danger md:pl-10">
              {actionError}
            </p>
          ) : null}
        </div>

        {/* CARD ACTIONS */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => openAssistant({ id: cardId, title })} aria-label="Tanya AI tentang card ini" title="Tanya AI" className="flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg">
            <Bot size={15} aria-hidden="true" /><span className="hidden sm:inline">Tanya AI</span>
          </button>
          {canDuplicate ? (
            <button
              type="button"
              onClick={onDuplicate}
              className="flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              aria-label="Duplikasi card"
              title="Duplikasi card"
            >
              <Copy size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Duplikasi</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg lg:hidden"
            aria-label="Tutup detail card"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
