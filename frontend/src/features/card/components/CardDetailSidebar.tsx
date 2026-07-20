import {
  Clock3,
  Paperclip,
  Tag,
  Layers,
  Trash2,
  Users,
} from "lucide-react";

import { Card, User, Brand, Attachment } from "../types";

import SidebarButton from "./SidebarButton";

import MemberSection from "./sections/MemberSection";
import AttachmentSection from "./sections/AttachmentSection";
import BrandSection from "./sections/BrandSection";
import LabelSection from "./sections/LabelSection";

interface Props {
  card: Card;
  users: User[];
  assignees?: User[];
  brands: Brand[];
  dueDate: string;
  setDueDate: (value: string) => void;

  showMembers: boolean;
  setShowMembers: React.Dispatch<React.SetStateAction<boolean>>;

  showDueDate: boolean;
  setShowDueDate: React.Dispatch<React.SetStateAction<boolean>>;

  showBrief: boolean;
  setShowBrief: React.Dispatch<React.SetStateAction<boolean>>;

  showResult: boolean;
  setShowResult: React.Dispatch<React.SetStateAction<boolean>>;

  memberSearch: string;
  setMemberSearch: React.Dispatch<React.SetStateAction<string>>;

  handleAssign: (userId: string) => void;
  handleUnassign: (userId: string) => void;

  handleDelete: () => void;

  showBrands: boolean;
  setShowBrands: React.Dispatch<React.SetStateAction<boolean>>;

  showLabels: boolean;
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>;

  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;

  // RESULT ATTACHMENTS
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  attachmentLoading: boolean;
  fetchAttachments: () => Promise<void>;

  // BRIEF ATTACHMENTS
  briefAttachments: Attachment[];
  setBriefAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  briefLoading: boolean;
  fetchBriefAttachments: () => Promise<void>;
}

export default function CardDetailSidebar({
  card,
  users,
  assignees,
  dueDate,
  setDueDate,
  showMembers,
  setShowMembers,
  showDueDate,
  setShowDueDate,
  showBrief,
  setShowBrief,
  showResult,
  setShowResult,
  memberSearch,
  setMemberSearch,
  handleAssign,
  handleUnassign,
  handleDelete,
  showBrands,
  setShowBrands,
  showLabels,
  setShowLabels,
  setDetail,

  // RESULT
  attachments,
  setAttachments,
  attachmentLoading,
  fetchAttachments,

  // BRIEF
  briefAttachments,
  setBriefAttachments,
  briefLoading,
  fetchBriefAttachments,
}: Props) {
  const toggleMembers = () => setShowMembers((prev) => !prev);
  const toggleDueDate = () => setShowDueDate((prev) => !prev);
  const toggleBrief = () => setShowBrief((prev) => !prev);
  const toggleResult = () => setShowResult((prev) => !prev);
  const toggleBrands = () => setShowBrands((prev) => !prev);
  const toggleLabels = () => setShowLabels((prev) => !prev);

  const resultSummary = {
    files: attachments.filter((a) => a.attachment_type === "file").length,
    links: attachments.filter((a) => a.attachment_type === "link").length,
  };

  const briefSummary = {
    files: briefAttachments.filter((a) => a.attachment_type === "file").length,
    links: briefAttachments.filter((a) => a.attachment_type === "link").length,
  };

  return (
    <div className="w-full space-y-6">
      {/* ========================================= */}
      {/* NAVIGATION / ADD TO CARD */}
      {/* ========================================= */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Add to card
        </h3>

        <div className="space-y-2">
          {/* MEMBERS */}
          <div>
            <SidebarButton
              icon={<Users size={16} />}
              label="Members"
              onClick={toggleMembers}
            />
            {showMembers && (
              <div className="mt-2 animate-in fade-in duration-200">
                <MemberSection
                  users={users}
                  assignees={assignees}
                  memberSearch={memberSearch}
                  setMemberSearch={setMemberSearch}
                  handleAssign={handleAssign}
                  handleUnassign={handleUnassign}
                />
              </div>
            )}
          </div>

          {/* LABELS */}
          <div>
            <SidebarButton
              icon={<Tag size={16} />}
              label="Labels"
              onClick={toggleLabels}
            />
            {showLabels && (
              <div className="mt-2 animate-in fade-in duration-200">
                <LabelSection detail={card} setDetail={setDetail} />
              </div>
            )}
          </div>

          {/* BRANDS */}
          <div>
            <SidebarButton
              icon={<Layers size={16} />}
              label="Brand"
              onClick={toggleBrands}
            />
            {showBrands && (
              <div className="mt-2 animate-in fade-in duration-200">
                <BrandSection
                  card={card}
                  isOpen={showBrands}
                  setDetail={setDetail}
                />
              </div>
            )}
          </div>

          {/* DUE DATE */}
          <div>
            <SidebarButton
              icon={<Clock3 size={16} />}
              label="Due Date"
              onClick={toggleDueDate}
            />
            {showDueDate && (
              <div className="mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-800/40 animate-in fade-in duration-200">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Select Due Date
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="
                    h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium 
                    text-slate-800 outline-none transition-all duration-200 
                    focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 
                    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400
                  "
                />
              </div>
            )}
          </div>

          {/* RESULT ATTACHMENTS */}
          <div>
            <SidebarButton
              icon={<Paperclip size={16} />}
              label="Result Attachment"
              onClick={toggleResult}
              badge={`${resultSummary.files} Files • ${resultSummary.links} Links`}
            />
            {showResult && (
              <div className="mt-2 animate-in fade-in duration-200">
                <AttachmentSection
                  attachments={attachments}
                  setAttachments={setAttachments}
                  loading={attachmentLoading}
                  fetchAttachments={fetchAttachments}
                  showUploader
                  title="Result Attachment"
                  uploadEndpoint={`/cards/${card.id}/attachments`}
                  deleteEndpoint="/attachments"
                  downloadEndpoint="/attachments"
                />
              </div>
            )}
          </div>

          {/* BRIEF ATTACHMENTS */}
          <div>
            <SidebarButton
              icon={<Paperclip size={16} />}
              label="Brief Attachment"
              onClick={toggleBrief}
              badge={`${briefSummary.files} Files • ${briefSummary.links} Links`}
            />
            {showBrief && (
              <div className="mt-2 animate-in fade-in duration-200">
                <AttachmentSection
                  attachments={briefAttachments}
                  setAttachments={setBriefAttachments}
                  loading={briefLoading}
                  fetchAttachments={fetchBriefAttachments}
                  showUploader
                  title="Brief Attachment"
                  uploadEndpoint={`/cards/${card.id}/brief-attachments`}
                  deleteEndpoint="/brief-attachments"
                  downloadEndpoint="/brief-attachments"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* ACTIONS */}
      {/* ========================================= */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Actions
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDelete}
            className="
              flex h-10 w-full items-center justify-center gap-2 rounded-xl 
              border border-rose-200/80 bg-rose-50/80 px-4 text-xs font-semibold 
              text-rose-600 transition-all duration-200 hover:bg-rose-100 
              hover:text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 
              dark:text-rose-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-300
            "
          >
            <Trash2 size={15} />
            <span>Delete Card</span>
          </button>
        </div>
      </div>
    </div>
  );
}