// import { useState } from "react";

// import api from "@/lib/axios";

import { Activity, Card } from "../types";

import useDeleteCard from "../hooks/useDeleteCard";
import useCardMembers from "../hooks/useCardMembers";

import { useCardDetail } from "../hooks/useCardDetail";
import useCardDescription from "../hooks/useCardDescription";
import useComments from "../hooks/useComments";
import useTasks from "../hooks/useTasks";
import useEscape from "../hooks/useEscape";
import useCardSidebar from "../hooks/useCardSidebar";

import TaskSection from "./sections/TaskSection";
import CommentSection from "./sections/CommentSection";
import AttachmentSection from "./sections/AttachmentSection";

import CardDetailHeader from "./CardDetailHeader";
import CardDetailSidebar from "./CardDetailSidebar";

import { AlignLeft, Clock3 } from "lucide-react";
import { useState } from "react";

interface Props {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}


export default function CardDetailModal({ card, isOpen, onClose }: Props) {
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
  } = useCardDescription(detail);

  // =========================================
  // COMMENTS
  // =========================================
  const { comments, comment, setComment, sending, handleAddComment } =
    useComments(card?.id, isOpen);

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
  } = useTasks(card?.id, isOpen);

  // =========================================
  // UI STATE
  // =========================================
  const activities: Activity[] = [];

  const {
    showMembers,
    setShowMembers,

    showDueDate,
    setShowDueDate,

    showAttachment,
    setShowAttachment,

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
  });

  // =========================================
  // DELETE
  // =========================================
  const { handleDelete } = useDeleteCard({
    cardId: card?.id,
    onClose,
  });

  // =========================================
  // CLOSE
  // =========================================
  if (!isOpen || !card) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl min-h-[90vh] bg-[#f4f5f7] rounded-2xl shadow-2xl overflow-hidden flex"
      >
        {/* ========================================= */}
        {/* LEFT CONTENT */}
        {/* ========================================= */}
        <div className="flex-1 overflow-y-auto">
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

          {/* CONTENT */}
          <div className="p-8 space-y-8">
            {loading ? (
              <div className="text-center py-10 text-gray-500">
                Loading card detail...
              </div>
            ) : (
              <>
                {/* DESCRIPTION */}
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <AlignLeft size={20} className="text-gray-600" />

                    <h2 className="font-semibold text-lg">Description</h2>

                    {saving && (
                      <span className="text-xs text-gray-400 animate-pulse">
                        Saving...
                      </span>
                    )}
                  </div>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tambahkan deskripsi..."
                    className="w-full min-h-[140px] bg-white border border-gray-200 rounded-2xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </section>

                {/* TASK */}
                <TaskSection
                  tasks={tasks}
                  progress={progress}
                  total={total}
                  done={done}
                  handleAddTask={handleAddTask}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                />

                {/* ATTACHMENT */}
                <AttachmentSection cardId={card.id} />

                {/* COMMENT */}
                <CommentSection
                  comments={comments}
                  comment={comment}
                  sending={sending}
                  setComment={setComment}
                  handleAddComment={handleAddComment}
                />

                {/* ACTIVITY */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <Clock3 size={20} className="text-gray-600" />

                    <h2 className="font-semibold text-lg">Activity</h2>
                  </div>

                  <div className="space-y-3">
                    {activities.length > 0 ? (
                      activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="bg-white rounded-2xl border p-4 text-sm text-gray-600"
                        >
                          {activity.text}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400">
                        No activity yet.
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

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
          showAttachment={showAttachment}
          setShowAttachment={setShowAttachment}
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
        />
      </div>
    </div>
  );
}
