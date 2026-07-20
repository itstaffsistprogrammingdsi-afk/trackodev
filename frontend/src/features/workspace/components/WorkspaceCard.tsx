import { useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, FolderKanban, Pencil } from "lucide-react";

import { Workspace } from "../types";
import { useDeleteWorkspace } from "../hooks/useWorkspaces";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  workspace: Workspace;
  divisionId: string;
  /** Whether the current user is allowed to edit/delete this workspace */
  canManage: boolean;
  onEdit: (workspace: Workspace) => void;
};

export default function WorkspaceCard({
  workspace,
  divisionId,
  canManage,
  onEdit,
}: Props) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteWorkspace = useDeleteWorkspace(divisionId);

  const handleOpen = () => {
    navigate(`/workspaces/${workspace.id}/campaigns`);
  };

  const handleEditClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onEdit(workspace);
  };

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteWorkspace.mutate(workspace.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  return (
    <>
      <article
        onClick={handleOpen}
        className="
          group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
          rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 shrink-0">
            <FolderKanban size={22} className="text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {workspace.name}
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {workspace.description || "Tidak ada deskripsi workspace"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">Workspace</span>

          {canManage && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleEditClick}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition"
              >
                <Pencil size={14} />
                Edit
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleteWorkspace.isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50 transition"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title={`Hapus workspace "${workspace.name}"?`}
        description="Tindakan ini tidak dapat dibatalkan. Semua data terkait workspace ini akan ikut terhapus."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isLoading={deleteWorkspace.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
