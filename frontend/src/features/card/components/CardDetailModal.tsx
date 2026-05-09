import { useEffect, useState } from "react";

import { Activity, Card } from "../types";

import api from "@/lib/axios";

import {
  assignMember,
  unassignMember,
} from "../api/card.api";

import { useCardDetail } from "../hooks/useCardDetail";
import useComments from "../hooks/useComments";
import useTasks from "../hooks/useTasks";

import TaskSection from "./sections/TaskSection";
import CommentSection from "./sections/CommentSection";
import MemberSection from "./sections/MemberSection";
import AttachmentSection from "./sections/AttachmentSection";

import {
  X,
  AlignLeft,
  CheckSquare,
  Clock3,
  Tag,
  Users,
  Bell,
  Archive,
  Trash2,
  List,
  Paperclip,
} from "lucide-react";

interface Props {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
}: Props) {
  // =========================================
  // HOOKS
  // =========================================
  const {
    detail,
    users,
    loading,
    saving,

    description,
    setDescription,

    dueDate,
    setDueDate,

    fetchDetail,
  } = useCardDetail(card, isOpen);

  const {
    comments,
    comment,
    setComment,
    sending,
    handleAddComment,
  } = useComments(card?.id, isOpen);

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
  // LOCAL UI STATE
  // =========================================
  const [activities, 
    // setActivities
  ] = useState<Activity[]>([]);

  const [showMembers, setShowMembers] = useState(false);

  const [showDueDate, setShowDueDate] = useState(false);

  const [showAttachment, setShowAttachment] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");

  // =========================================
  // ESC CLOSE
  // =========================================
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", esc);
    }

    return () => {
      window.removeEventListener("keydown", esc);
    };
  }, [isOpen, onClose]);

  // =========================================
  // MEMBER
  // =========================================
  const handleAssign = async (userId: string) => {
    if (!card) return;

    try {
      await assignMember(card.id, userId);

      await fetchDetail();
    } catch (err) {
      console.error("FAILED ASSIGN MEMBER", err);
    }
  };

  const handleUnassign = async (userId: string) => {
    if (!card) return;

    try {
      await unassignMember(card.id, userId);

      await fetchDetail();
    } catch (err) {
      console.error("FAILED UNASSIGN MEMBER", err);
    }
  };

  // =========================================
  // DELETE
  // =========================================
  const handleDelete = async () => {
    if (!card) return;

    const ok = confirm("Hapus card?");

    if (!ok) return;

    try {
      await api.delete(`/cards/${card.id}`);

      onClose();
    } catch (err) {
      console.error("FAILED DELETE CARD", err);
    }
  };

  if (!isOpen || !card) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl bg-[#f4f5f7] rounded-2xl shadow-2xl overflow-hidden flex"
      >
        {/* LEFT */}
        <div className="flex-1 min-h-[85vh] overflow-y-auto">
          {/* HEADER */}
          <div className="px-8 pt-7 pb-4 border-b bg-white">
            <div className="flex items-start justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CheckSquare
                    size={22}
                    className="text-gray-500"
                  />

                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                      {detail?.title || card.title}
                    </h1>

                    <p className="text-sm text-gray-500 mt-1">
                      in list{" "}
                      <span className="font-medium">
                        Active Support Ticket
                      </span>
                    </p>
                  </div>
                </div>

                {/* MEMBERS */}
                <div className="flex items-center gap-2 mt-5">
                  {detail?.assignees?.map((u) => (
                    <div
                      key={u.id}
                      title={u.name}
                      className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold"
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  ))}

                  <button
                    onClick={() =>
                      setShowMembers((prev) => !prev)
                    }
                    className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {/* LABEL */}
                <div className="flex flex-wrap gap-2 mt-5">
                  <span className="px-3 py-1 rounded bg-red-500 text-white text-sm font-medium">
                    p1-critical
                  </span>

                  <span className="px-3 py-1 rounded bg-cyan-500 text-white text-sm font-medium">
                    email-server
                  </span>
                </div>

                {/* DUE DATE */}
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Due Date
                  </p>

                  <div className="inline-flex items-center gap-2 bg-gray-200 rounded px-3 py-2 text-sm">
                    <Clock3
                      size={14}
                      className="text-red-500"
                    />

                    <span>
                      {dueDate
                        ? new Date(dueDate).toLocaleString(
                            "id-ID",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )
                        : "No due date"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-gray-200 flex items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-8 space-y-8">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
                {/* DESCRIPTION */}
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <AlignLeft
                      size={20}
                      className="text-gray-600"
                    />

                    <h2 className="font-semibold text-lg">
                      Description
                    </h2>

                    {saving && (
                      <span className="text-xs text-gray-400 animate-pulse">
                        Saving...
                      </span>
                    )}
                  </div>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    placeholder="Tambahkan deskripsi..."
                    className="w-full min-h-[120px] bg-white border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <Clock3
                      size={20}
                      className="text-gray-600"
                    />

                    <h2 className="font-semibold text-lg">
                      Activity
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {activities.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white rounded-xl p-3 border text-sm text-gray-600"
                      >
                        {a.text}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="w-[290px] border-l bg-white p-5 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">
              Sidebar Navigation
            </h3>

            <div className="space-y-2">
              {/* MEMBERS */}
              <SidebarButton
                icon={<Users size={17} />}
                label="Members"
                onClick={() =>
                  setShowMembers((prev) => !prev)
                }
              />

              {showMembers && (
                <MemberSection
                  users={users}
                  memberSearch={memberSearch}
                  assignees={detail?.assignees}
                  setMemberSearch={setMemberSearch}
                  handleAssign={handleAssign}
                  handleUnassign={handleUnassign}
                />
              )}

              <SidebarButton
                icon={<CheckSquare size={17} />}
                label="Brand"
              />

              <SidebarButton
                icon={<Tag size={17} />}
                label="Labels"
              />

              {/* DUE DATE */}
              <SidebarButton
                icon={<Clock3 size={17} />}
                label="Due Date"
                onClick={() =>
                  setShowDueDate((prev) => !prev)
                }
              />

              {showDueDate && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Set Due Date
                  </p>

                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(e.target.value)
                    }
                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {saving && (
                    <p className="text-xs text-gray-400 mt-2 animate-pulse">
                      Saving...
                    </p>
                  )}
                </div>
              )}

              {/* ATTACHMENT */}
              <SidebarButton
                icon={<Paperclip size={17} />}
                label="Attachment"
                onClick={() =>
                  setShowAttachment((prev) => !prev)
                }
              />

              {showAttachment && (
                <AttachmentSection
                  cardId={card.id}
                  showUploader
                />
              )}

              <SidebarButton
                icon={<List size={17} />}
                label="Custom Field"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">
              Actions
            </h3>

            <div className="space-y-2">
              <SidebarButton
                icon={<Users size={17} />}
                label="Join"
              />

              <SidebarButton
                icon={<Bell size={17} />}
                label="Subscribe"
              />

              <SidebarButton
                icon={<Archive size={17} />}
                label="Archive"
              />

              <button
                onClick={handleDelete}
                className="w-full h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-3 px-4 text-sm font-medium transition"
              >
                <Trash2 size={17} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-11 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex items-center gap-3 px-4 text-sm font-medium text-gray-700"
    >
      {icon}
      {label}
    </button>
  );
}