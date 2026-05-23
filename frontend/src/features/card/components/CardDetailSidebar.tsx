import {
  // Archive,
  // Bell,
  Clock3,
  List,
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

  showAttachment: boolean;
  setShowAttachment: React.Dispatch<React.SetStateAction<boolean>>;

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

  attachments: Attachment[];

  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;

  attachmentLoading: boolean;
  fetchAttachments: () => Promise<void>;
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

  showAttachment,
  setShowAttachment,

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

  attachments,
  setAttachments,
  attachmentLoading,
  fetchAttachments,
}: Props) {
  const toggleMembers = () => {
    setShowMembers((prev) => !prev);
  };

  const toggleDueDate = () => {
    setShowDueDate((prev) => !prev);
  };

  const toggleAttachment = () => {
    setShowAttachment((prev) => !prev);
  };

  const toggleBrands = () => {
    setShowBrands((prev) => !prev);
  };

  const toggleLabels = () => {
    setShowLabels((prev) => !prev);
  };

  const attachmentSummary = {
    images: attachments.filter(
      (a) => a.attachment_type === "file" && a.file_type?.startsWith("image/"),
    ).length,

    documents: attachments.filter(
      (a) => a.attachment_type === "file" && !a.file_type?.startsWith("image/"),
    ).length,

    links: attachments.filter((a) => a.attachment_type === "link").length,
  };

  const attachmentBadge = [
    `Images ${attachmentSummary.images}`,
    `Files ${attachmentSummary.documents}`,
    `Links ${attachmentSummary.links}`,
  ].join("   •   ");

  return (
    <div className="w-[290px] border-l bg-white p-5 overflow-y-auto">
      <div className="space-y-6">
        {/* NAVIGATION */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-gray-500">
            Add to card
          </h3>

          <div className="space-y-2">
            {/* MEMBERS */}
            <SidebarButton
              icon={<Users size={17} />}
              label="Members"
              onClick={toggleMembers}
            />

            {showMembers && (
              <MemberSection
                users={users}
                assignees={assignees}
                memberSearch={memberSearch}
                setMemberSearch={setMemberSearch}
                handleAssign={handleAssign}
                handleUnassign={handleUnassign}
              />
            )}

            {/* LABEL */}
            <SidebarButton
              icon={<Tag size={17} />}
              label="Labels"
              onClick={toggleLabels}
            />

            {showLabels && <LabelSection detail={card} setDetail={setDetail} />}

            {/* BRAND */}
            <SidebarButton
              icon={<Layers size={17} />}
              label="Brand"
              onClick={toggleBrands}
            />

            {showBrands && (
              <BrandSection
                card={card}
                isOpen={showBrands}
                setDetail={setDetail}
              />
            )}

            {/* DUE DATE */}
            <SidebarButton
              icon={<Clock3 size={17} />}
              label="Due Date"
              onClick={toggleDueDate}
            />

            {showDueDate && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* ATTACHMENT */}
            <SidebarButton
              icon={<Paperclip size={17} />}
              label="Attachment"
              onClick={toggleAttachment}
              badge={attachmentBadge}
            />

            {showAttachment && (
              <AttachmentSection
                cardId={card.id}
                attachments={attachments}
                setAttachments={setAttachments}
                loading={attachmentLoading}
                fetchAttachments={fetchAttachments}
                showUploader
              />
            )}

            {/* CUSTOM FIELD */}
            <SidebarButton icon={<List size={17} />} label="Custom Field" />
          </div>
        </div>

        {/* ACTIONS */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase text-gray-500">
            Actions
          </h3>

          <div className="space-y-2">
            <button
              onClick={handleDelete}
              className="flex h-11 w-full items-center gap-3 rounded-xl bg-red-50 px-4 text-sm font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
