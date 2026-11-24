import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Workspace } from "../types";
import { useDeleteWorkspace } from "../hooks/useWorkspaces";
import { confirmDialog, toast } from "@/lib/feedback";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import WorkspaceMembersModal from "./WorkspaceMembersModal";

type Props = {
  workspace: Workspace;
  divisionId: string;
  canManage: boolean;
  onEdit: (workspace: Workspace) => void;
  view?: "grid" | "list";
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function WorkspaceCard({
  workspace,
  divisionId,
  canManage,
  onEdit,
  view = "grid",
}: Props) {
  const navigate = useNavigate();
  const [membersOpen, setMembersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const deleteWorkspace = useDeleteWorkspace(divisionId);
  const isList = view === "list";

  const handleOpen = () => {
    navigate(`/workspaces/${workspace.id}/campaigns`);
  };

  const handleDelete = async () => {
    setMenuOpen(false);

    const confirmed = await confirmDialog({
      title: "Hapus workspace",
      message: `Workspace "${workspace.name}" akan dihapus permanen beserta campaign dan board di dalamnya.`,
      confirmText: "Hapus workspace",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteWorkspace.mutateAsync(workspace.id);
      toast.success("Workspace dihapus.");
    } catch {
      toast.error("Workspace gagal dihapus. Coba lagi.");
    }
  };

  const menu = canManage ? (
    <WorkspaceMenu
      workspace={workspace}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      onShare={() => {
        setMenuOpen(false);
        setMembersOpen(true);
      }}
      onEdit={() => {
        setMenuOpen(false);
        onEdit(workspace);
      }}
      onDelete={() => void handleDelete()}
      deleting={deleteWorkspace.isPending}
    />
  ) : null;

  return (
    <>
      <article
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (
            (event.key === "Enter" || event.key === " ") &&
            event.target === event.currentTarget
          ) {
            event.preventDefault();
            handleOpen();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Buka workspace ${workspace.name}`}
        className={`group relative flex cursor-pointer border border-line bg-surface shadow-e1 transition-[transform,border-color,box-shadow] duration-200 ease-soft hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:translate-y-0 active:shadow-e1 ${
          isList
            ? "items-center gap-4 rounded-card p-4"
            : "h-full flex-col rounded-panel p-5"
        } ${menuOpen ? "z-20" : ""}`}
      >
        <div
          className={`flex min-w-0 gap-3 ${
            isList ? "flex-1 items-center" : "items-start justify-between"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <FolderKanban aria-hidden="true" className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <h3 className={`text-base font-semibold leading-6 tracking-heading text-fg ${isList ? "truncate" : "line-clamp-2 break-words"}`}>
                {workspace.name}
              </h3>
              <p
                className={`mt-1 text-sm leading-5 text-fg-muted ${
                  isList ? "line-clamp-1" : "line-clamp-2"
                }`}
              >
                {workspace.description || "Belum ada deskripsi workspace."}
              </p>
            </div>
          </div>

          {!isList && menu ? (
            <div
              className="relative shrink-0"
              onClick={(event) => event.stopPropagation()}
            >
              {menu}
            </div>
          ) : null}
        </div>

        {isList ? (
          <div
            className="ml-auto flex shrink-0 items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="hidden text-2xs text-fg-subtle sm:block">
              Dibuat {formatDate(workspace.created_at)}
            </span>

            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
            />

            {menu ? <div className="relative">{menu}</div> : null}
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors group-hover:text-accent">
              Buka workspace
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </div>

            <div className="mt-auto pt-4">
              <div className="border-t border-line pt-3">
                <span className="text-2xs text-fg-subtle">
                  Dibuat {formatDate(workspace.created_at)}
                </span>
              </div>
            </div>
          </>
        )}
      </article>

      <WorkspaceMembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        workspace={workspace}
      />
    </>
  );
}

function WorkspaceMenu({
  workspace,
  menuOpen,
  setMenuOpen,
  onEdit,
  onShare,
  onDelete,
  deleting,
}: {
  workspace: Workspace;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <>
      <button
        type="button"
        aria-label={`Aksi workspace ${workspace.name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
        className="dropdown-toggle flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
      </button>

      <Dropdown
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        className="w-52"
      >
        <DropdownItem
          icon={<Users className="h-4 w-4" />}
          onClick={onShare}
          onItemClick={() => setMenuOpen(false)}
        >
          Bagikan akses
        </DropdownItem>

        <DropdownItem
          icon={<Pencil className="h-4 w-4" />}
          onClick={onEdit}
          onItemClick={() => setMenuOpen(false)}
        >
          Edit workspace
        </DropdownItem>

        <DropdownItem
          icon={<Trash2 className="h-4 w-4" />}
          danger
          disabled={deleting}
          onClick={onDelete}
          onItemClick={() => setMenuOpen(false)}
        >
          Hapus workspace
        </DropdownItem>
      </Dropdown>
    </>
  );
}
