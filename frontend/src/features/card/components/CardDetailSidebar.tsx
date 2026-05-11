import {
  Archive,
  Bell,
  Clock3,
  List,
  Paperclip,
  Tag,
  Layers,
  Trash2,
  Users,
} from "lucide-react";

import { Card, User, Brand } from "../types";

import SidebarButton from "./SidebarButton";

import MemberSection from "./sections/MemberSection";
import AttachmentSection from "./sections/AttachmentSection";
import BrandSection from "./sections/BrandSection";
import LabelSection from "./sections/LabelSection";

// import { S } from "node_modules/@fullcalendar/core/internal-common";

interface Props {
  card: Card;

  users: User[];

  assignees?: User[];

  brands: Brand[];
  // setBrands: (brands: Brand[]) => void;

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
  setDetail: React.Dispatch<React.SetStateAction<Card | null>>;
  showLabels: boolean;
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>;
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
  setDetail,
  showLabels,
  setShowLabels,
}: Props) {
  // =========================================
  // TOGGLE
  // =========================================
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

  return (
    <div className="w-[290px] border-l bg-white p-5 overflow-y-auto">
      <div className="space-y-6">
        {/* ========================================= */}
        {/* NAVIGATION */}
        {/* ========================================= */}
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">
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

            {/* BRANDS */}
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
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* ATTACHMENT */}
            <SidebarButton
              icon={<Paperclip size={17} />}
              label="Attachment"
              onClick={toggleAttachment}
            />

            {showAttachment && (
              <AttachmentSection cardId={card.id} showUploader />
            )}

            {/* CUSTOM FIELD */}
            <SidebarButton icon={<List size={17} />} label="Custom Field" />
          </div>
        </div>

        {/* ========================================= */}
        {/* ACTION */}
        {/* ========================================= */}
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">
            Actions
          </h3>

          <div className="space-y-2">
            <SidebarButton icon={<Users size={17} />} label="Join" />

            <SidebarButton icon={<Bell size={17} />} label="Subscribe" />

            <SidebarButton icon={<Archive size={17} />} label="Archive" />

            {/* DELETE */}
            <button
              onClick={handleDelete}
              className="w-full h-11 rounded-xl bg-red-50 hover:bg-red-100 transition flex items-center gap-3 px-4 text-sm font-medium text-red-600"
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
