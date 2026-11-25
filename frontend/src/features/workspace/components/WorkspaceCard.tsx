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
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  workspace: Workspace;
  divisionId: string;
  canManage: boolean;
  onEdit: (workspace: Workspace) => void;
  view?: "grid" | "list";
};

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
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
  const { t, locale } = useLanguage();
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
      title: t("Hapus workspace", "Delete workspace"),
      message: t(
        'Workspace "{name}" akan dihapus permanen beserta campaign dan board di dalamnya.',
        'Workspace "{name}" will be permanently deleted along with its campaigns and boards.',
        { name: workspace.name },
      ),
      confirmText: t("Hapus workspace", "Delete workspace"),
      cancelText: t("Batal", "Cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteWorkspace.mutateAsync(workspace.id);
      toast.success(t("Workspace dihapus.", "Workspace deleted."));
    } catch {
      toast.error(
        t(
          "Workspace gagal dihapus. Coba lagi.",
          "Failed to delete workspace. Try again.",
        ),
      );
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
        aria-label={t("Buka workspace {name}", "Open workspace {name}", {
          name: workspace.name,
        })}
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
                {workspace.description ||
                  t("Belum ada deskripsi workspace.", "No workspace description yet.")}
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
              {t("Dibuat {date}", "Created {date}", {
                date: formatDate(workspace.created_at, locale),
              })}
            </span>

            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
            />

            {menu ? <div className="relative">{menu}</div> : null}
          </div>
        ) : (
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-fg-muted transition-colors group-hover:text-accent">
                {t("Buka workspace", "Open workspace")}
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>

              <span className="truncate text-2xs text-fg-subtle">
                {formatDate(workspace.created_at, locale)}
              </span>
            </div>
          </div>
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
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        aria-label={t("Aksi workspace {name}", "Workspace actions {name}", {
          name: workspace.name,
        })}
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
          {t("Bagikan akses", "Share access")}
        </DropdownItem>

        <DropdownItem
          icon={<Pencil className="h-4 w-4" />}
          onClick={onEdit}
          onItemClick={() => setMenuOpen(false)}
        >
          {t("Edit workspace", "Edit workspace")}
        </DropdownItem>

        <DropdownItem
          icon={<Trash2 className="h-4 w-4" />}
          danger
          disabled={deleting}
          onClick={onDelete}
          onItemClick={() => setMenuOpen(false)}
        >
          {t("Hapus workspace", "Delete workspace")}
        </DropdownItem>
      </Dropdown>
    </>
  );
}
