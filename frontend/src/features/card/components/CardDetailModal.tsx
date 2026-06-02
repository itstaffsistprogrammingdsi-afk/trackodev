import { useState } from "react";

import { Activity, Card } from "../types";

import useDeleteCard from "../hooks/useDeleteCard";
import useCardMembers from "../hooks/useCardMembers";

import { useCardDetail } from "../hooks/useCardDetail";
import useCardDescription from "../hooks/useCardDescription";
import useComments from "../hooks/useComments";
import useTasks from "../hooks/useTasks";
import useEscape from "../hooks/useEscape";
import useCardSidebar from "../hooks/useCardSidebar";
import useAttachments from "../hooks/useAttachments";

import TaskSection from "./sections/TaskSection";
import CommentSection from "./sections/CommentSection";
import AttachmentSection from "./sections/AttachmentSection";
import useBriefAttachments from "../hooks/useBriefAttachments";

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
  // DETAIL
  // =========================================
  const { detail, users, loading, fetchDetail, setDetail } = useCardDetail(
    card,
    isOpen,
  );

  const [showLabels, setShowLabels] = useState(false);

  // =========================================
  // DESCRIPTION
  // =========================================
  const {
    description,
    setDescription,

    dueDate,
    setDueDate,

    saving,
  } = useCardDescription(
    detail,
    onUpdated, // ✅ TAMBAHAN
  );

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
  } = useBriefAttachments(
    card?.id,
    isOpen,
    // onUpdated
  );

  // =========================================
  // UI STATE
  // =========================================
  const activities: Activity[] = [];

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
  // ESC CLOSE
  // =========================================
  useEscape({
    isOpen,
    onClose,
  });

  // =========================================
  // MEMBER
  // =========================================
  const { handleAssign, handleUnassign } = useCardMembers({
    cardId: card?.id,
    fetchDetail,

    onUpdated,
  });

  // =========================================
  // DELETE
  // =========================================
  const { handleDelete } = useDeleteCard({
    cardId: card?.id,
    onClose,
    onDeleted,
  });

  // =========================================
  // CLOSE
  // =========================================
  if (!isOpen || !card) return null;

  return (
    <div
      onClick={onClose}
      className="
        fixed inset-0 z-[9999]
        bg-black/60 backdrop-blur-md
        overflow-y-auto
        p-0 md:p-6
      "
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          min-h-screen md:min-h-0
          w-full max-w-7xl
          mx-auto
          bg-[#f8fafc]
          md:rounded-3xl
          shadow-[0_20px_80px_rgba(0,0,0,0.25)]
          overflow-hidden
          border border-white/20
        "
      >
        {/* ========================================= */}
        {/* MAIN LAYOUT */}
        {/* ========================================= */}
        <div className="flex flex-col xl:flex-row">
          {/* ========================================= */}
          {/* LEFT CONTENT */}
          {/* ========================================= */}
          <div className="flex-1 min-w-0">
            {/* HEADER */}
            <div
              className="
                sticky top-0 z-20
                bg-white/80 backdrop-blur-xl
                border-b border-slate-200
              "
            >
              <CardDetailHeader
                title={detail?.title || card.title}
                assignees={detail?.assignees}
                brands={(detail?.brands ?? card?.brands) || []}
                labels={(detail?.labels ?? card?.labels) || []}
                dueDate={
                  dueDate
                    ? new Date(dueDate).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : ""
                }
                onClose={onClose}
                onToggleMembers={() => setShowMembers((prev) => !prev)}
              />
            </div>

            {/* CONTENT */}
            <div
              className="
                px-4 py-5
                sm:px-6 sm:py-6
                lg:px-8 lg:py-8
                space-y-6 lg:space-y-8
              "
            >
              {loading ? (
                <div
                  className="
                    h-[60vh]
                    flex flex-col items-center justify-center
                    text-slate-500
                  "
                >
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />

                  <p className="text-sm font-medium">Loading card detail...</p>
                </div>
              ) : (
                <>
                  {/* ========================================= */}
                  {/* DESCRIPTION */}
                  {/* ========================================= */}
                  <section
                    className="
                      bg-white
                      border border-slate-200
                      rounded-3xl
                      p-5 sm:p-6
                      shadow-sm
                    "
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="
                          w-10 h-10
                          rounded-2xl
                          bg-slate-100
                          flex items-center justify-center
                        "
                      >
                        <AlignLeft size={18} className="text-slate-600" />
                      </div>

                      <div className="flex-1">
                        <h2
                          className="
                            text-base sm:text-lg
                            font-semibold
                            text-slate-800
                          "
                        >
                          Description
                        </h2>

                        <p className="text-sm text-slate-400">
                          Describe this task clearly
                        </p>
                      </div>

                      {saving && (
                        <div
                          className="
                            flex items-center gap-2
                            text-xs
                            text-blue-500
                            font-medium
                          "
                        >
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </div>
                      )}
                    </div>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tambahkan deskripsi..."
                      className="
                        w-full
                        min-h-[180px]
                        rounded-2xl
                        border border-slate-200
                        bg-slate-50
                        p-4
                        text-sm
                        text-slate-700
                        resize-none
                        transition-all
                        duration-200
                        focus:outline-none
                        focus:ring-4
                        focus:ring-blue-100
                        focus:border-blue-400
                      "
                    />
                  </section>

                  {/* ========================================= */}
                  {/* TASK SECTION */}
                  {/* ========================================= */}
                  <div
                    className="
                      bg-white
                      border border-slate-200
                      rounded-3xl
                      p-5 sm:p-6
                      shadow-sm
                    "
                  >
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
                  <div
                    className="
                      bg-white
                      border border-slate-200
                      rounded-3xl
                      p-5 sm:p-6
                      shadow-sm
                    "
                    
                  >
                    <h4 className="text-lg font-semibold text-slate-800">Brief Attachments</h4>
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
                  {/* ATTACHMENTS */}
                  {/* ========================================= */}
                  <div
                    className="
                      bg-white
                      border border-slate-200
                      rounded-3xl
                      p-5 sm:p-6
                      shadow-sm
                    "
                  >
                    <h4 className="text-lg font-semibold text-slate-800">Result Attachments</h4>
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
                  {/* COMMENTS */}
                  {/* ========================================= */}
                  <div
                    className="
                      bg-white
                      border border-slate-200
                      rounded-3xl
                      p-5 sm:p-6
                      shadow-sm
                    "
                  >
                    <CommentSection
                      comments={comments}
                      comment={comment}
                      sending={sending}
                      setComment={setComment}
                      handleAddComment={handleAddComment}
                    />
                  </div>

                  {/* ========================================= */}
                  {/* ACTIVITY */}
                  {/* ========================================= */}
                  <section
                    className="
                      bg-white
                      border border-slate-200
                      rounded-3xl
                      p-5 sm:p-6
                      shadow-sm
                    "
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="
                          w-10 h-10
                          rounded-2xl
                          bg-slate-100
                          flex items-center justify-center
                        "
                      >
                        <Clock3 size={18} className="text-slate-600" />
                      </div>

                      <div>
                        <h2
                          className="
                            text-base sm:text-lg
                            font-semibold
                            text-slate-800
                          "
                        >
                          Activity
                        </h2>

                        <p className="text-sm text-slate-400">
                          Timeline & changes
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {activities.length > 0 ? (
                        activities.map((activity) => (
                          <div
                            key={activity.id}
                            className="
                              rounded-2xl
                              border border-slate-200
                              bg-slate-50
                              p-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {activity.text}
                          </div>
                        ))
                      ) : (
                        <div
                          className="
                            flex flex-col items-center justify-center
                            py-12
                            text-center
                          "
                        >
                          <div
                            className="
                              w-14 h-14
                              rounded-2xl
                              bg-slate-100
                              flex items-center justify-center
                              mb-4
                            "
                          >
                            <Sparkles size={22} className="text-slate-400" />
                          </div>

                          <h3 className="font-medium text-slate-700">
                            No activity yet
                          </h3>

                          <p className="text-sm text-slate-400 mt-1">
                            Activity history will appear here
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>

          {/* ========================================= */}
          {/* SIDEBAR */}
          {/* ========================================= */}
          <div
            className="
              w-full xl:w-[340px]
              shrink-0
              border-t xl:border-t-0 xl:border-l
              border-slate-200
              bg-white/70
              backdrop-blur-xl
              xl:sticky xl:top-0
              xl:h-screen
              overflow-y-auto
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
