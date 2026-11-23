import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "../types";

import useDeleteCard from "../hooks/useDeleteCard";
import useCardMembers from "../hooks/useCardMembers";
import { useCardDetail } from "../hooks/useCardDetail";
import useCardDescription from "../hooks/useCardDescription";
import useComments from "../hooks/useComments";
import useTasks from "../hooks/useTasks";
import useEscape from "../hooks/useEscape";
import useCardSidebar from "../hooks/useCardSidebar";
import useAttachments from "../hooks/useAttachments";
import useBriefAttachments from "../hooks/useBriefAttachments";
import useCardActivities from "../hooks/useCardActivities";

import TaskSection from "./sections/TaskSection";
import CommentSection from "./sections/CommentSection";
import AttachmentSection from "./sections/AttachmentSection";
import ActivitySection from "./sections/activitySection";
import CardDetailHeader from "./CardDetailHeader";
import CardDetailSidebar from "./CardDetailSidebar";
import DuplicateCardModal from "./DuplicateCardModal";
import RichTextEditor from "./RichTextEditor";

import {
  AlignLeft,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated?: Partial<Card>) => void | Promise<void>;
  onDeleted?: (cardId: string) => void;
}

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [showLabels, setShowLabels] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  // =========================================
  // UI SIDEBAR STATE
  // =========================================
  const {
    showMembers,
    setShowMembers,
    showDueDate,
    setShowDueDate,
    showResult,
    setShowResult,
    showBrief,
    setShowBrief,
    showBrands,
    setShowBrands,
    memberSearch,
    setMemberSearch,
  } = useCardSidebar();

  const { detail, users, loading, refreshing, error: detailError, fetchDetail, setDetail } =
    useCardDetail(card, isOpen, showMembers);
  // Hanya tampilkan skeleton saat initial load (belum ada data sama sekali).
  // Background realtime refresh harus silent agar textarea deskripsi tidak
  // di-unmount (penyebab focus hilang / "refresh terus" saat mengetik).
  const showInitialLoading = loading && !detail;

  const {
    description,
    setDescription,
    dueDate,
    setDueDate,
    saving,
    saveError,
    flushPendingChanges,
  } = useCardDescription(detail, onUpdated);

  const closeModal = useCallback(async () => {
    const saved = await flushPendingChanges();
    if (!saved) return;
    setMobileSidebarOpen(false);
    onClose();
  }, [flushPendingChanges, onClose]);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  const {
    comments,
    comment,
    setComment,
    sending,
    error: commentError,
    handleAddComment,
  } = useComments(card?.id, isOpen);

  const {
    tasks,
    total,
    done,
    progress,
    error: taskError,
    handleAddTask,
    toggleTask,
    deleteTask,
  } = useTasks(card?.id, isOpen, onUpdated);

  const {
    attachments,
    archivedAttachments,
    setAttachments,
    loading: attachmentLoading,
    fetchAttachments,
  } = useAttachments(card?.id, isOpen);

  const {
    attachments: briefAttachments,
    setAttachments: setBriefAttachments,
    loading: briefLoading,
    fetchAttachments: fetchBriefAttachments,
  } = useBriefAttachments(card?.id, isOpen);

  // =========================================
  // ESC CLOSE HOOK
  // =========================================
  useEscape({
    isOpen,
    onClose: mobileSidebarOpen ? closeMobileSidebar : closeModal,
  });

  // =========================================
  // MEMBERS MANAGEMENT
  // =========================================
  const { handleAssign, handleUnassign } = useCardMembers({
    cardId: card?.id,
    fetchDetail,
    onUpdated,
  });

  // =========================================
  // DELETE CARD
  // =========================================
  const { handleDelete } = useDeleteCard({
    cardId: card?.id,
    onClose: closeModal,
    onDeleted,
  });

  // =========================================
  // ACTIVITIES LOG
  // =========================================
  const {
    activities,
    loading: activityLoading,
    hasMore: hasMoreActivities,
    total: totalActivities,
    insight: activityInsight,
    loadMore: loadMoreActivities,
  } = useCardActivities(
    card?.id,
    isOpen
  );

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"], a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen || !card) return null;

  const sidebarProps = {
    card: detail || card,
    users,
    assignees: detail?.assignees,
    brands: detail?.brands ?? [],
    dueDate,
    setDueDate,
    showMembers,
    setShowMembers,
    showDueDate,
    setShowDueDate,
    memberSearch,
    setMemberSearch,
    handleAssign,
    handleUnassign,
    handleDelete,
    setDetail,
    showBrands,
    setShowBrands,
    showLabels,
    setShowLabels,
    attachments,
    archivedAttachments,
    setAttachments,
    attachmentLoading,
    fetchAttachments,
    briefAttachments,
    setBriefAttachments,
    briefLoading,
    fetchBriefAttachments,
    showResult,
    setShowResult,
    showBrief,
    setShowBrief,
    onCloseModal: closeModal,
  };

  return (
    <div
      onClick={closeModal}
      className="
        fixed inset-0 z-[9999] flex items-center justify-center bg-overlay
        p-0 transition-opacity duration-200 animate-in fade-in sm:p-4 lg:p-6
      "
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail card ${detail?.title ?? card.title}`}
        className="
          relative flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden
          bg-canvas shadow-e3 transition-colors duration-200
          sm:h-[calc(100dvh-2rem)] sm:rounded-modal sm:border sm:border-line
          lg:h-[calc(100dvh-3rem)]
        "
      >
        {/* ========================================= */}
        {/* MAIN LAYOUT WRAPPER */}
        {/* ========================================= */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          
          {/* ========================================= */}
          {/* LEFT CONTENT AREA */}
          {/* ========================================= */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-y-auto lg:overscroll-contain">
            {/* STICKY HEADER */}
            <div className="z-20 shrink-0 border-b border-line bg-surface/95 backdrop-blur-sm">
              <CardDetailHeader
                cardId={detail?.id ?? card.id}
                title={detail?.title ?? card.title}
                listName={detail?.board?.name ?? card.board?.name}
                assignees={detail?.assignees}
                brands={detail?.brands ?? card.brands ?? []}
                labels={detail?.labels ?? card.labels ?? []}
                priority={detail?.priority ?? card.priority}
                dueDate={
                  dueDate
                    ? new Date(dueDate).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : ""
                }
                setDetail={setDetail}
                onUpdated={async (updated) => {
                  if (updated) await onUpdated?.(updated);
                }}
                onClose={closeModal}
                onToggleMembers={() => {
                  setShowMembers(true);
                  setMobileSidebarOpen(true);
                }}
                onDuplicate={() => setDuplicateOpen(true)}
              />
            </div>

            {/* INNER BODY CONTENT */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 pb-6 sm:space-y-6 sm:p-6 sm:pb-6 lg:flex-none lg:space-y-8 lg:overflow-visible lg:overscroll-auto lg:p-8 lg:pb-8">
              {showInitialLoading ? (
                <div
                  className="space-y-4"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <span className="sr-only">Memuat detail task</span>
                  <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-control" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-56 max-w-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-11/12" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                  <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
                    <Skeleton className="mb-4 h-4 w-28" />
                    <div className="space-y-3">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-4/5" />
                    </div>
                  </div>
                  <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
                    <Skeleton className="mb-4 h-4 w-24" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ) : (
                <>
                  {detailError && !detail ? (
                    <div
                      role="alert"
                      className="flex flex-col gap-2 rounded-card border border-danger/20 bg-danger-soft p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        Detail card gagal dimuat. Deskripsi mungkin belum tampil.
                      </span>
                      <button
                        type="button"
                        onClick={() => void fetchDetail()}
                        className="shrink-0 rounded-control bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
                      >
                        Coba lagi
                      </button>
                    </div>
                  ) : null}

                  {/* ========================================= */}
                  {/* CONTENT PANEL */}
                  {/* ========================================= */}
                  <div className="overflow-hidden rounded-panel border border-line bg-surface">
                  {/* DESCRIPTION SECTION */}
                  <section className="border-b border-line p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-control bg-surface-muted text-fg-muted">
                        <AlignLeft size={16} />
                      </div>

                      <div className="flex-1">
                        <h2 className="text-sm font-semibold text-fg">
                          Description
                        </h2>
                        <p className="text-xs text-fg-muted">
                          Describe this task clearly
                        </p>
                      </div>

                      {saving ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                          <span>Saving...</span>
                        </div>
                      ) : refreshing ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
                          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                          <span>Syncing...</span>
                        </div>
                      ) : null}
                    </div>
                    {saveError ? (
                      <p role="alert" className="mb-3 text-xs font-medium text-danger">
                        {saveError}
                      </p>
                    ) : null}

                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Add a detailed description..."
                      ariaLabel="Deskripsi card"
                    />
                  </section>

                  {/* ========================================= */}
                  {/* TASK SECTION */}
                  {/* ========================================= */}
                  <div className="border-b border-line p-5 sm:p-6">
                    <TaskSection
                      tasks={tasks}
                      progress={progress}
                      total={total}
                      done={done}
                      error={taskError}
                      handleAddTask={handleAddTask}
                      toggleTask={toggleTask}
                      deleteTask={deleteTask}
                    />
                  </div>

                  {/* ========================================= */}
                  {/* BRIEF ATTACHMENTS */}
                  {/* ========================================= */}
                  <div className="border-b border-line p-5 sm:p-6">
                    <h4 className="mb-4 text-sm font-semibold text-fg">
                      Brief Attachments
                    </h4>
                    <AttachmentSection
                      title="Brief Attachments"
                      attachments={briefAttachments}
                      setAttachments={setBriefAttachments}
                      fetchAttachments={fetchBriefAttachments}
                      deleteEndpoint="/brief-attachments"
                      downloadEndpoint="/brief-attachments"
                    />
                  </div>

                  {/* ========================================= */}
                  {/* RESULT ATTACHMENTS */}
                  {/* ========================================= */}
                  <div className="border-b border-line p-5 sm:p-6">
                    <h4 className="mb-4 text-sm font-semibold text-fg">
                      Result Attachments
                    </h4>
                    <AttachmentSection
                      title="Result Attachments"
                      attachments={attachments}
                      archivedAttachments={archivedAttachments}
                      setAttachments={setAttachments}
                      fetchAttachments={fetchAttachments}
                      deleteEndpoint="/attachments"
                      downloadEndpoint="/attachments"
                      supportsResultDescription
                    />
                  </div>

                  {/* ========================================= */}
                  {/* COMMENTS SECTION */}
                  {/* ========================================= */}
                  <div className="border-b border-line p-5 sm:p-6">
                    <CommentSection
                      comments={comments}
                      comment={comment}
                      sending={sending}
                      error={commentError}
                      setComment={setComment}
                      handleAddComment={handleAddComment}
                    />
                  </div>

                  {/* ========================================= */}
                  {/* ACTIVITY TIMELINE */}
                  {/* ========================================= */}
                  <ActivitySection
                    activities={activities}
                    loading={activityLoading}
                    hasMore={hasMoreActivities}
                    loadMore={loadMoreActivities}
                    total={totalActivities}
                    insight={activityInsight}
                  />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ========================================= */}
          {/* RIGHT SIDEBAR PANEL */}
          {/* ========================================= */}
          <div className="hidden w-[340px] max-w-[340px] shrink-0 flex-col overflow-hidden border-l border-line bg-surface lg:flex">
            <div className="flex shrink-0 justify-end px-6 pt-5">
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                aria-label="Close card detail"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pt-2">
              <CardDetailSidebar {...sidebarProps} />
            </div>
          </div>

        </div>
        <div className="relative z-30 shrink-0 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-control bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <SlidersHorizontal size={18} />
            Card tools
          </button>
        </div>

        {mobileSidebarOpen ? (
          <div className="absolute inset-0 z-40 flex items-end lg:hidden">
            <button
              type="button"
              aria-label="Tutup card tools"
              onClick={closeMobileSidebar}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            />

            <section
              role="dialog"
              aria-modal="true"
              aria-label="Card tools"
              className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-modal border-t border-line bg-canvas shadow-e3 animate-in slide-in-from-bottom duration-200"
            >
              <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-line-strong" />
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-fg">Card tools</h2>
                  <p className="mt-0.5 text-xs text-fg-muted">Kelola member, label, deadline, dan lampiran</p>
                </div>
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  aria-label="Tutup card tools"
                  className="flex h-10 w-10 items-center justify-center rounded-control bg-surface-muted text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                <CardDetailSidebar {...sidebarProps} />
              </div>
            </section>
          </div>
        ) : null}
      </div>
      <DuplicateCardModal
        card={detail || card}
        isOpen={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onCreated={async () => {
          await onUpdated?.();
        }}
      />
    </div>
  );
}
