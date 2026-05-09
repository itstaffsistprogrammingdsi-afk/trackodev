import { Workspace } from "../types";
import { useDeleteWorkspace } from "../hooks/useWorkspaces";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

type Props = {
  workspace: Workspace;
  divisionId: string;
};

export default function WorkspaceCard({ workspace, divisionId }: Props) {
  const navigate = useNavigate();
  const del = useDeleteWorkspace(divisionId);

  const handleOpen = () => {
    navigate(`/workspaces/${workspace.id}/campaigns`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (del.isPending) return;

    const ok = confirm("Yakin ingin menghapus workspace ini?");
    if (!ok) return;

    del.mutate(workspace.id);
  };

  return (
    <article
      onClick={handleOpen}
      className="group p-4 rounded-2xl border bg-white dark:bg-gray-900 hover:shadow-lg transition cursor-pointer flex flex-col gap-2"
    >
      {/* HEADER */}
      <header className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 transition">
          {workspace.name}
        </h3>

        <p className="text-sm text-gray-500 line-clamp-2">
          {workspace.description || "No description"}
        </p>
      </header>

      {/* FOOTER */}
      <footer className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">

        <span className="text-xs text-gray-400">
          Workspace
        </span>

        <button
          onClick={handleDelete}
          disabled={del.isPending}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition"
          aria-label="Delete workspace"
        >
          <Trash2 size={14} />
          Delete
        </button>

      </footer>
    </article>
  );
}