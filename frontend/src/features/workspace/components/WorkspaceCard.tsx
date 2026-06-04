import { useNavigate } from "react-router-dom";
import { Trash2, FolderKanban } from "lucide-react";

import { Workspace } from "../types";
import { useDeleteWorkspace } from "../hooks/useWorkspaces";

type Props = {
  workspace: Workspace;
  divisionId: string;
};

export default function WorkspaceCard({
  workspace,
  divisionId,
}: Props) {
  const navigate = useNavigate();

  const deleteWorkspace =
    useDeleteWorkspace(divisionId);

  const handleOpen = () => {
    navigate(
      `/workspaces/${workspace.id}/campaigns`
    );
  };

  const handleDelete = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (deleteWorkspace.isPending) return;

    const confirmed = window.confirm(
      `Hapus workspace "${workspace.name}" ?`
    );

    if (!confirmed) return;

    deleteWorkspace.mutate(workspace.id);
  };

  return (
    <article
      onClick={handleOpen}
      className="
        group
        bg-white
        dark:bg-slate-900
        border
        border-slate-200
        dark:border-slate-800
        rounded-2xl
        p-5
        cursor-pointer
        transition-all
        hover:shadow-lg
        hover:-translate-y-1
      "
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="
            flex
            items-center
            justify-center
            h-11
            w-11
            rounded-xl
            bg-blue-50
            dark:bg-blue-950/40
            shrink-0
          "
        >
          <FolderKanban
            size={22}
            className="text-blue-600"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="
              text-base
              font-semibold
              text-slate-900
              dark:text-white
              truncate
            "
          >
            {workspace.name}
          </h3>

          <p
            className="
              mt-1
              text-sm
              text-slate-500
              dark:text-slate-400
              line-clamp-2
            "
          >
            {workspace.description ||
              "Tidak ada deskripsi workspace"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="
          mt-4
          pt-3
          border-t
          border-slate-200
          dark:border-slate-800
          flex
          items-center
          justify-between
        "
      >
        <span
          className="
            text-xs
            font-medium
            text-slate-400
          "
        >
          Workspace
        </span>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteWorkspace.isPending}
          className="
            flex
            items-center
            gap-1.5
            text-xs
            font-medium
            text-red-500
            hover:text-red-600
            disabled:opacity-50
            transition
          "
        >
          <Trash2 size={14} />

          {deleteWorkspace.isPending
            ? "Deleting..."
            : "Delete"}
        </button>
      </div>
    </article>
  );
}