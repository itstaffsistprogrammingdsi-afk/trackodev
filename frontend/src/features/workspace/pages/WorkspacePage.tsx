import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";

import { useWorkspaces } from "../hooks/useWorkspaces";
import WorkspaceCard from "../components/WorkspaceCard";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import { useAuth } from "../../../context/AuthContext"; // sesuaikan path jika berbeda
import { Workspace } from "../types";

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const divisionId = id ?? "";

  const { user, loading: authLoading } = useAuth();
  const { data, isLoading: workspacesLoading } = useWorkspaces(divisionId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = authLoading || workspacesLoading;

  // 🛡️ Safety Check Roles & Access Control
  const canManageWorkspace = useMemo(() => {
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some((role) => ["super_admin", "admin"].includes(role));
  }, [user]);

  // 🛡️ Safe array fallback untuk mencegah crash
  const safeWorkspaces = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  // 🔍 Filter pencarian workspace berdasarkan nama atau deskripsi
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return safeWorkspaces;
    const query = searchQuery.toLowerCase();
    return safeWorkspaces.filter(
      (ws) =>
        ws.name?.toLowerCase().includes(query) ||
        ws.description?.toLowerCase().includes(query)
    );
  }, [safeWorkspaces, searchQuery]);

  const openCreateModal = () => {
    setEditingWorkspace(null);
    setModalOpen(true);
  };

  const openEditModal = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingWorkspace(null);
  };

  // ⏳ SKELETON LOADING STATE (SaaS Modern Style)
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-4 w-64 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-4 animate-pulse shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-5 w-3/4 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* 🟢 HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>Division</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              Workspaces
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspaces
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola dan pantau seluruh ruang kerja pada divisi ini.
          </p>
        </div>

        {/* ACTION BUTTON */}
        {canManageWorkspace && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200 dark:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Workspace Baru</span>
          </button>
        )}
      </div>

      {/* 🔍 SEARCH & STATS BAR */}
      {safeWorkspaces.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cari workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-transparent bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 self-end sm:self-center">
            Total: <span className="text-slate-900 dark:text-white font-semibold">{filteredWorkspaces.length}</span> workspace
          </div>
        </div>
      )}

      {/* 📭 EMPTY STATE */}
      {filteredWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
            <FolderKanban size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {searchQuery ? "Workspace tidak ditemukan" : "Belum Ada Workspace"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {searchQuery
              ? `Tidak ada workspace yang cocok dengan kata kunci "${searchQuery}".`
              : canManageWorkspace
              ? "Buat workspace pertama untuk mulai mengelompokkan project dan campaign divisi Anda."
              : "Workspace akan muncul di sini setelah dibuat oleh administrator."}
          </p>

          {!searchQuery && canManageWorkspace && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-200 dark:shadow-none"
            >
              <Plus size={18} />
              <span>Buat Workspace Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        /* 📦 WORKSPACE GRID LIST */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              divisionId={divisionId}
              canManage={canManageWorkspace}
              onEdit={openEditModal}
            />
          ))}
        </div>
      )}

      {/* 🔲 MODAL FORM */}
      <CreateWorkspaceModal
        open={modalOpen}
        onClose={closeModal}
        divisionId={divisionId}
        workspace={editingWorkspace}
      />
    </div>
  );
}