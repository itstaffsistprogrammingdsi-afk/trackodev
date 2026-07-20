import { useState } from "react";
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
import CardDetailHeader from "./CardDetailHeader";
import CardDetailSidebar from "./CardDetailSidebar";

import { AlignLeft, Clock3, Loader2, Sparkles } from "lucide-react";

interface Props {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: (cardId: string) => void;
}

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  // =========================================
  // CARD DETAIL DATA
  // =========================================
  const { detail, users, loading, fetchDetail, setDetail } = useCardDetail(
    card,
    isOpen
  );

  const [showLabels, setShowLabels] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // =========================================
  // CARD DESCRIPTION
  // =========================================
  const {
    description,
    setDescription,
    dueDate,
    setDueDate,
    saving,
  } = useCardDescription(detail, onUpdated);

  // =========================================
  // COMMENTS
  // =========================================
  const { comments, comment, setComment, sending, handleAddComment } =
    useComments(card?.id, isOpen, onUpdated);

  // =========================================
  // TASKS
  // =========================================
  const {
    tasks,
    total,
    done,
    progress,
    handleAddTask,
    toggleTask,
    deleteTask,
  } = useTasks(card?.id, isOpen, onUpdated);

  // =========================================
  // ATTACHMENTS
  // =========================================
  const {
    attachments,
    setAttachments,
    loading: attachmentLoading,
    fetchAttachments,
  } = useAttachments(card?.id, isOpen, onUpdated);

  const {
    attachments: briefAttachments,
    setAttachments: setBriefAttachments,
    loading: briefLoading,
    fetchAttachments: fetchBriefAttachments,
  } = useBriefAttachments(card?.id, isOpen);

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

  // =========================================
  // ESC CLOSE HOOK
  // =========================================
  useEscape({
    isOpen,
    onClose,
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
    onClose,
    onDeleted,
  });

  // =========================================
  // ACTIVITIES LOG
  // =========================================
  const { activities, loading: activityLoading } = useCardActivities(
    card?.id,
    isOpen
  );

  if (!isOpen || !card) return null;

  return (
    <div
      onClick={onClose}
      className="
        fixed inset-0 z-[9999] flex items-center justify-center 
        bg-slate-900/60 backdrop-blur-md overflow-y-auto 
        p-0 md:p-4 lg:p-6 transition-all duration-300 animate-in fade-in
      "
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          relative min-h-screen md:min-h-0 my-0 md:my-auto w-full max-w-7xl 
          bg-slate-50 dark:bg-slate-950 rounded-none md:rounded-3xl 
          shadow-2xl border border-slate-200/80 dark:border-slate-800 
          overflow-hidden transition-all duration-300
        "
      >
        {/* ========================================= */}
        {/* MAIN LAYOUT WRAPPER */}
        {/* ========================================= */}
        <div className="flex flex-col xl:flex-row">
          
          {/* ========================================= */}
          {/* LEFT CONTENT AREA */}
          {/* ========================================= */}
          <div className="flex-1 min-w-0">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
              <CardDetailHeader
                cardId={detail?.id ?? card.id}
                title={detail?.title ?? card.title}
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
                onUpdated={fetchDetail}
                onClose={onClose}
                onToggleMembers={() => setShowMembers((prev) => !prev)}
              />
            </div>

            {/* INNER BODY CONTENT */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
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
                      setComment={setComment}
                      handleAddComment={handleAddComment}
                    />
                  </div>

                  {/* ========================================= */}
                  {/* ACTIVITY TIMELINE */}
                  {/* ========================================= */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <Clock3 size={18} />
                      </div>

                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                          Activity
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                          Timeline & changes history
                        </p>
                      </div>
                    </div>

                    {activityLoading ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        Loading activity...
                      </div>
                    ) : activities.length > 0 ? (
                      <>
                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                          {(showAllActivities
                            ? activities
                            : activities.slice(0, 8)
                          ).map((activity) => (
                            <div
                              key={activity.id}
                              className="
                                rounded-xl border border-slate-200/70 dark:border-slate-800 
                                bg-slate-50/60 dark:bg-slate-800/40 p-3.5 text-sm 
                                hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-200
                              "
                            >
                              <div className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                                {activity.description ??
                                  activity.action ??
                                  "Activity recorded"}
                              </div>

                              <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 text-xs">
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  {activity.user?.name ?? "System"}
                                </span>

                                <span className="text-slate-400 dark:text-slate-500">
                                  {activity.created_at
                                    ? new Date(
                                        activity.created_at
                                      ).toLocaleString("id-ID", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })
                                    : "-"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                          <span className="text-xs text-slate-400">
                            Showing{" "}
                            {showAllActivities
                              ? activities.length
                              : Math.min(8, activities.length)}{" "}
                            of {activities.length}
                          </span>

                          {activities.length > 8 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllActivities((prev) => !prev)
                              }
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              {showAllActivities
                                ? "Show less ←"
                                : "View full activity →"}
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                          <Sparkles size={20} />
                        </div>

                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          No activity recorded yet
                        </h3>

                        <p className="text-xs text-slate-400 mt-0.5">
                          Changes to this card will be tracked here
                        </p>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>

          {/* ========================================= */}
          {/* RIGHT SIDEBAR PANEL */}
          {/* ========================================= */}
          <div
            className="
              w-full xl:w-[340px] xl:max-w-[340px] shrink-0 
              border-t xl:border-t-0 xl:border-l border-slate-200/80 dark:border-slate-800 
              bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl 
              xl:sticky xl:top-0 xl:h-screen overflow-y-auto
            "
          >
            <div className="p-4 sm:p-5 lg:p-6">
              <CardDetailSidebar
                card={detail || card}
                users={users}
                assignees={detail?.assignees}
                brands={detail?.brands ?? []}
                dueDate={dueDate}
                setDueDate={setDueDate}
                showMembers={showMembers}
                setShowMembers={setShowMembers}
                showDueDate={showDueDate}
                setShowDueDate={setShowDueDate}
                memberSearch={memberSearch}
                setMemberSearch={setMemberSearch}
                handleAssign={handleAssign}
                handleUnassign={handleUnassign}
                handleDelete={handleDelete}
                setDetail={setDetail}
                showBrands={showBrands}
                setShowBrands={setShowBrands}
                showLabels={showLabels}
                setShowLabels={setShowLabels}
                attachments={attachments}
                setAttachments={setAttachments}
                attachmentLoading={attachmentLoading}
                fetchAttachments={fetchAttachments}
                briefAttachments={briefAttachments}
                setBriefAttachments={setBriefAttachments}
                briefLoading={briefLoading}
                fetchBriefAttachments={fetchBriefAttachments}
                showResult={showResult}
                setShowResult={setShowResult}
                showBrief={showBrief}
                setShowBrief={setShowBrief}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}