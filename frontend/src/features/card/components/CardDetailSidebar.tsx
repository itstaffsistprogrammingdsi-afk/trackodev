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
import { useAuth } from '../../../context/AuthContext';
import {
  dueDateBadgeClasses,
  getDueDateStatus,
  isCardOverdue,
} from "../utils/dueDate";

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
  const { can } = useAuth();
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
  const dueStatus = getDueDateStatus(card.due_date);
  const deleteDisabled = card.is_overdue === true || isCardOverdue(card.due_date);
  const dueDateValue = dueDate.slice(0, 10);
  const dueTimeValue = dueDate.slice(11, 16) || "17:00";

  const setDueDatePart = (date: string) => {
    setDueDate(date ? `${date}T${dueTimeValue}` : "");
  };

  const setDueTimePart = (time: string) => {
    if (!dueDateValue) return;
    setDueDate(`${dueDateValue}T${time || "17:00"}`);
  };

  const setQuickDueDate = (daysFromToday: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setDueDate(`${year}-${month}-${day}T17:00`);
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

        <div className="grid grid-cols-2 gap-2 md:block md:space-y-2">
          {/* MEMBERS */}
          <div className={showMembers ? "col-span-2 md:block" : "min-w-0 md:block"}>
            <SidebarButton
              icon={<Users size={16} />}
              label="Members"
              onClick={toggleMembers}
              active={showMembers}
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

                    {/* BRANDS */}
          {can('brand.view') && <div className={showBrands ? "col-span-2 md:block" : "min-w-0 md:block"}>
            <SidebarButton
              icon={<Layers size={16} />}
              label="Brand"
              onClick={toggleBrands}
              active={showBrands}
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
          </div>}

          {/* LABELS */}
          {can('label.view') && <div className={showLabels ? "col-span-2 md:block" : "min-w-0 md:block"}>
            <SidebarButton
              icon={<Tag size={16} />}
              label="Labels"
              onClick={toggleLabels}
              active={showLabels}
            />
            {showLabels && (
              <div className="mt-2 animate-in fade-in duration-200">
                <LabelSection detail={card} setDetail={setDetail} />
              </div>
            )}
          </div>}



          {/* DUE DATE */}
          <div className={showDueDate ? "col-span-2 md:block" : "min-w-0 md:block"}>
            <SidebarButton
              icon={<Clock3 size={16} />}
              label="Due Date"
              onClick={toggleDueDate}
              active={showDueDate}
              badge={
                dueStatus !== "none" ? (
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${dueDateBadgeClasses[dueStatus]}`}
                  >
                    {dueStatus === "overdue"
                      ? "Overdue"
                      : dueStatus === "warning"
                        ? "Due soon"
                        : "On track"}
                  </span>
                ) : undefined
              }
            />
            {showDueDate && (
              <div className="mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm transition-all md:hidden dark:border-slate-800 dark:bg-slate-800/40 animate-in fade-in duration-200">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Atur tenggat
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Pilih cepat atau tentukan tanggal dan jam.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Hari ini", days: 0 },
                    { label: "Besok", days: 1 },
                    { label: "+7 hari", days: 7 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setQuickDueDate(option.days)}
                      className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Tanggal
                    </span>
                    <input
                      type="date"
                      value={dueDateValue}
                      onChange={(event) => setDueDatePart(event.target.value)}
                      className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Jam
                    </span>
                    <input
                      type="time"
                      value={dueTimeValue}
                      disabled={!dueDateValue}
                      onChange={(event) => setDueTimePart(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>

                {dueDate ? (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="mt-3 min-h-10 w-full rounded-xl text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    Hapus tenggat
                  </button>
                ) : null}
              </div>
            )}
            {showDueDate && (
              <div className="mt-2 hidden rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 shadow-sm transition-all md:block dark:border-slate-800 dark:bg-slate-800/40 animate-in fade-in duration-200">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Select Due Date
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
                />
              </div>
            )}
          </div>

          {/* RESULT ATTACHMENTS */}
          <div className={showResult ? "col-span-2 md:block" : "min-w-0 md:block"}>
            <SidebarButton
              icon={<Paperclip size={16} />}
              label="Result Attachment"
              onClick={toggleResult}
              active={showResult}
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
                  supportsResultDescription
                />
              </div>
            )}
          </div>

          {/* BRIEF ATTACHMENTS */}
          <div className={showBrief ? "col-span-2 md:block" : "min-w-0 md:block"}>
            <SidebarButton
              icon={<Paperclip size={16} />}
              label="Brief Attachment"
              onClick={toggleBrief}
              active={showBrief}
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
            disabled={deleteDisabled}
            title={
              deleteDisabled
                ? "Card overdue tidak dapat dihapus"
                : "Hapus card"
            }
            className="
              flex h-10 w-full items-center justify-center gap-2 rounded-xl 
              border border-rose-200/80 bg-rose-50/80 px-4 text-xs font-semibold 
              text-rose-600 transition-all duration-200 hover:bg-rose-100 
              hover:text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 
              dark:text-rose-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-300
              disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100
              disabled:text-slate-400 disabled:hover:bg-slate-100
              dark:disabled:border-slate-700 dark:disabled:bg-slate-800
              dark:disabled:text-slate-500 dark:disabled:hover:bg-slate-800
            "
          >
            <Trash2 size={15} />
            <span>
              {deleteDisabled ? "Cannot Delete Overdue Card" : "Delete Card"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
