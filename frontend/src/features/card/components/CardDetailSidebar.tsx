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
import { useLanguage } from "@/context/LanguageContext";
import {
  dueDateBadgeClasses,
  getDueDateStatus,
  isCardCompleted,
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

  handleAssign: (
    userId: string,
    targetCampaignId?: string,
    createOpts?: { createCampaign?: boolean; campaignName?: string; forceInbox?: boolean },
  ) => unknown;
  handleUnassign: (userId: string) => void;

  onCloseModal?: () => void;

  handleDelete: () => void;

  showBrands: boolean;
  setShowBrands: React.Dispatch<React.SetStateAction<boolean>>;

  showLabels: boolean;
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>;

  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;

  // RESULT ATTACHMENTS
  attachments: Attachment[];
  archivedAttachments: Attachment[];
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
  onCloseModal,
  showBrands,
  setShowBrands,
  showLabels,
  setShowLabels,
  setDetail,

  // RESULT
  attachments,
  archivedAttachments,
  setAttachments,
  attachmentLoading,
  fetchAttachments,

  // BRIEF
  briefAttachments,
  setBriefAttachments,
  briefLoading,
  fetchBriefAttachments,
}: Props) {
  const { can, hasRole, managesDivision, user } = useAuth();
  const { t } = useLanguage();
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
  const cardCompleted = isCardCompleted(card);
  const dueStatus = getDueDateStatus(card.due_date, {
    completed: cardCompleted,
    completedAt: card.completed_at,
  });
  const deleteDisabled =
    card.is_overdue === true ||
    isCardOverdue(card.due_date, {
      completed: cardCompleted,
      completedAt: card.completed_at,
    });
  const canEditDueDate =
    card.created_by?.id === user?.id ||
    managesDivision() ||
    hasRole("super_admin");
  const dueDatePermissionMessage = t(
    "Hanya pembuat card, Admin, atau Super Admin yang dapat mengubah due date.",
    "Only the card creator, Admin, or Super Admin can change the due date.",
  );

  return (
    <div className="w-full space-y-5 pb-2">
      {/* ========================================= */}
      {/* NAVIGATION / ADD TO CARD */}
      {/* ========================================= */}
      <div>
        <h3 className="mb-2 px-2.5 text-[11px] font-medium text-fg-subtle">
          {t("Alat card", "Card tools")}
        </h3>

        <div className="space-y-1">
          {/* MEMBERS */}
          <div>
            <SidebarButton
              icon={<Users size={15} />}
              label={t("Anggota", "Members")}
              onClick={toggleMembers}
              expanded={showMembers}
            />
            {showMembers && (
              <div className="mt-2 animate-in fade-in duration-200">
                <MemberSection
                  cardId={card.id}
                  users={users}
                  onCloseModal={onCloseModal}
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
          {can('brand.view') && <div>
            <SidebarButton
              icon={<Layers size={15} />}
              label={t("Brand")}
              onClick={toggleBrands}
              expanded={showBrands}
              badge={
                (card.brands?.length ?? 0) > 0
                  ? t("{count} terpasang", "{count} attached", {
                      count: card.brands?.length ?? 0,
                    })
                  : undefined
              }
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
          {can('label.view') && <div>
            <SidebarButton
              icon={<Tag size={15} />}
              label={t("Label")}
              onClick={toggleLabels}
              expanded={showLabels}
              badge={
                (card.labels?.length ?? 0) > 0
                  ? t("{count} terpasang", "{count} attached", {
                      count: card.labels?.length ?? 0,
                    })
                  : undefined
              }
            />
            {showLabels && (
              <div className="mt-2 animate-in fade-in duration-200">
                <LabelSection detail={card} setDetail={setDetail} />
              </div>
            )}
          </div>}



          {/* DUE DATE */}
          <div>
            <SidebarButton
              icon={<Clock3 size={15} />}
              label={t("Deadline")}
              onClick={toggleDueDate}
              expanded={showDueDate}
              badge={
                dueStatus !== "none" ? (
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 font-medium ${dueDateBadgeClasses[dueStatus]}`}
                  >
                    {dueStatus === "overdue"
                      ? t("Terlambat", "Overdue")
                      : dueStatus === "warning"
                        ? t("Segera", "Due soon")
                        : t("Aman", "On track")}
                  </span>
                ) : undefined
              }
            />
            {showDueDate && (
              <div className="mt-2 rounded-card border border-line bg-surface-muted/50 p-3.5 animate-in fade-in duration-150">
                <label className="mb-1.5 block text-[11px] font-medium text-fg-subtle">
                  {t("Pilih deadline", "Select deadline")}
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  disabled={!canEditDueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 w-full rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
                />
                {!canEditDueDate ? (
                  <p className="mt-2 text-[11px] leading-4 text-fg-muted">
                    {dueDatePermissionMessage}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* BRIEF ATTACHMENTS */}
          <div>
            <SidebarButton
              icon={<Paperclip size={15} />}
              label={t("Lampiran brief", "Brief attachments")}
              onClick={toggleBrief}
              badge={t(
                "{files} file · {links} tautan",
                "{files} files · {links} links",
                { files: briefSummary.files, links: briefSummary.links },
              )}
              expanded={showBrief}
            />
            {showBrief && (
              <div className="mt-2 animate-in fade-in duration-200">
                <AttachmentSection
                  attachments={briefAttachments}
                  setAttachments={setBriefAttachments}
                  loading={briefLoading}
                  fetchAttachments={fetchBriefAttachments}
                  showUploader
                  showList={false}
                  title={t("Lampiran brief", "Brief attachment")}
                  uploadEndpoint={`/cards/${card.id}/brief-attachments`}
                  deleteEndpoint="/brief-attachments"
                  downloadEndpoint="/brief-attachments"
                />
              </div>
            )}
          </div>

          {/* RESULT ATTACHMENTS */}
          <div>
            <SidebarButton
              icon={<Paperclip size={15} />}
              label={t("Lampiran hasil", "Result attachments")}
              onClick={toggleResult}
              badge={t(
                "{files} file · {links} tautan",
                "{files} files · {links} links",
                { files: resultSummary.files, links: resultSummary.links },
              )}
              expanded={showResult}
            />
            {showResult && (
              <div className="mt-2 animate-in fade-in duration-200">
                <AttachmentSection
                  attachments={attachments}
                  archivedAttachments={archivedAttachments}
                  setAttachments={setAttachments}
                  loading={attachmentLoading}
                  fetchAttachments={fetchAttachments}
                  showUploader
                  showList={false}
                  title={t("Lampiran hasil", "Result attachment")}
                  uploadEndpoint={`/cards/${card.id}/attachments`}
                  deleteEndpoint="/attachments"
                  downloadEndpoint="/attachments"
                  supportsResultDescription
                  requiresQuantity
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* ACTIONS */}
      {/* ========================================= */}
      <div className="border-t border-line pt-4">
        <h3 className="mb-2 px-2.5 text-[11px] font-medium text-fg-subtle">
          {t("Tindakan", "Actions")}
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteDisabled}
            title={
              deleteDisabled
                ? t(
                    "Card yang sudah melewati deadline tidak dapat dihapus",
                    "Cards past their deadline cannot be deleted",
                  )
                : t("Hapus card", "Delete card")
            }
            className="flex h-9 w-full items-center justify-center gap-2 rounded-control border border-danger/20 bg-danger-soft px-4 text-xs font-medium text-danger transition-colors hover:bg-danger-soft/70 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-fg-subtle"
          >
            <Trash2 size={15} />
            <span>
              {deleteDisabled
                ? t("Tidak dapat dihapus", "Cannot be deleted")
                : t("Hapus card", "Delete card")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
