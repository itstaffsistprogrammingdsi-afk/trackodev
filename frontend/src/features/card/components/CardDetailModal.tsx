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

import {
  AlignLeft,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react";

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

  const { detail, users, loading, fetchDetail, setDetail } = useCardDetail(
    card,
    isOpen,
    showMembers,
  );

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
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
  };

  return (
    <div
      onClick={closeModal}
      className="
        fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70
        p-0 backdrop-blur-md transition-all duration-300 animate-in fade-in sm:p-4 lg:p-6
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
          border-slate-200/80 bg-slate-50 shadow-2xl transition-all duration-300
          sm:h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border
          lg:h-[calc(100dvh-3rem)] dark:border-slate-800 dark:bg-slate-950
        "
      >
        {/* ========================================= */}
        {/* MAIN LAYOUT WRAPPER */}
        {/* ========================================= */}
        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          
          {/* ========================================= */}
          {/* LEFT CONTENT AREA */}
          {/* ========================================= */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:overflow-y-auto xl:overscroll-contain">
            {/* STICKY HEADER */}
            <div className="z-20 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
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
              />
            </div>

            {/* INNER BODY CONTENT */}
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 pb-28 sm:space-y-6 sm:p-6 sm:pb-28 lg:space-y-8 lg:p-8 lg:pb-28 xl:flex-none xl:overflow-visible xl:overscroll-auto xl:pb-8">
              {loading ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium">Loading card details...</p>
                </div>
              ) : (
                <>
                  {/* ========================================= */}
                  {/* DESCRIPTION SECTION */}
                  {/* ========================================= */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <AlignLeft size={18} />
                      </div>

                      <div className="flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                          Description
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                          Describe this task clearly
                        </p>
                      </div>

                      {saving && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      )}
                    </div>
                    {saveError ? (
                      <p role="alert" className="mb-3 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {saveError}
                      </p>
                    ) : null}

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a detailed description..."
                      className="
                        w-full min-h-[160px] rounded-2xl border border-slate-200 dark:border-slate-700/80 
                        bg-slate-50/50 dark:bg-slate-800/40 p-4 text-sm text-slate-800 dark:text-slate-100 
                        placeholder-slate-400 resize-y transition-all duration-200 
                        focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400
                      "
                    />
                  </section>

                  {/* ========================================= */}
                  {/* TASK SECTION */}
                  {/* ========================================= */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
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
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
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
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                      Result Attachments
                    </h4>
                    <AttachmentSection
                      title="Result Attachments"
                      attachments={attachments}
                      setAttachments={setAttachments}
                      fetchAttachments={fetchAttachments}
                      deleteEndpoint="/attachments"
                      downloadEndpoint="/attachments"
                    />
                  </div>

                  {/* ========================================= */}
                  {/* COMMENTS SECTION */}
                  {/* ========================================= */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
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
                </>
              )}
            </div>
          </div>

          {/* ========================================= */}
          {/* RIGHT SIDEBAR PANEL */}
          {/* ========================================= */}
          <div className="hidden w-[340px] max-w-[340px] shrink-0 flex-col overflow-hidden border-l border-slate-200/80 bg-white/70 backdrop-blur-xl xl:flex dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex shrink-0 justify-end px-6 pt-5">
              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close card detail"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pt-2">
              <CardDetailSidebar {...sidebarProps} />
            </div>
          </div>

        </div>
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl xl:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <SlidersHorizontal size={18} />
            Card tools
          </button>
        </div>

        {mobileSidebarOpen ? (
          <div className="absolute inset-0 z-40 flex items-end xl:hidden">
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
              className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-200 bg-slate-50 shadow-2xl animate-in slide-in-from-bottom duration-300 dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Card tools</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Kelola member, label, deadline, dan lampiran</p>
                </div>
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  aria-label="Tutup card tools"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
    </div>
  );
}
