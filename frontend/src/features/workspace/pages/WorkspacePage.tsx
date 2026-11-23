import { useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";

import { useWorkspaces } from "../hooks/useWorkspaces";
import WorkspaceCard from "../components/WorkspaceCard";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import { useAuth } from "../../../context/AuthContext"; // sesuaikan path jika berbeda
import { Workspace } from "../types";
import EmptyState from "@/components/ui/EmptyState";


export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const divisionId = id ?? "";

  const { user, loading: authLoading } = useAuth();
  const { data, isLoading: workspacesLoading } = useWorkspaces(divisionId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery("");
  }, [divisionId]);

  const isLoading = authLoading || workspacesLoading;

  // 🛡️ Safety Check Roles & Access Control
  const canManageWorkspace = useMemo(() => {
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some((role) => ["super_admin", "admin", "manager"].includes(role));
  }, [user]);

  // 🛡️ Safe array fallback untuk mencegah crash
  const safeWorkspaces = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  // 🔍 Filter pencarian workspace berdasarkan nama atau deskripsi
  const filteredWorkspaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return safeWorkspaces;
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
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded-md bg-surface-muted" />
            <div className="h-8 w-48 animate-pulse rounded-md bg-surface-muted" />
            <div className="h-4 w-64 animate-pulse rounded-md bg-surface-muted" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded-control bg-surface-muted" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-44 space-y-4 rounded-panel border border-line bg-surface p-5"
            >
              <div className="flex animate-pulse items-center justify-between">
                <div className="h-10 w-10 rounded-control bg-surface-muted" />
                <div className="h-6 w-16 rounded-full bg-surface-muted" />
              </div>
              <div className="h-5 w-3/4 animate-pulse rounded-md bg-surface-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* HEADER PAGE */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-fg-subtle">
            <span>Divisi</span>
            <span aria-hidden="true">/</span>
            <span className="text-fg-muted">Workspace</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Workspace
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Kelola dan pantau seluruh ruang kerja pada divisi ini.
          </p>
        </div>

        {canManageWorkspace ? (
          <button
            onClick={openCreateModal}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong sm:w-auto"
          >
            <Plus size={17} aria-hidden="true" />
            <span>Workspace baru</span>
          </button>
        ) : null}
      </div>

      {/* SEARCH & STATS BAR */}
      {safeWorkspaces.length > 0 && (
        <div className="flex flex-col items-stretch justify-between gap-3 rounded-panel border border-line bg-surface p-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari workspace"
              aria-label="Cari workspace"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-control border border-transparent bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <div className="self-end px-2 text-[11px] font-medium text-fg-muted sm:self-center">
            Total: <span className="font-semibold text-fg">{filteredWorkspaces.length}</span> workspace
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {filteredWorkspaces.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={searchQuery ? "Workspace tidak ditemukan" : "Belum ada workspace"}
          description={
            searchQuery
              ? `Tidak ada workspace yang cocok dengan “${searchQuery.trim()}”.`
              : canManageWorkspace
                ? "Buat workspace pertama untuk mulai mengelompokkan project dan campaign divisi Anda."
                : "Workspace akan muncul di sini setelah dibuat oleh administrator."
          }
          action={
            !searchQuery && canManageWorkspace
              ? { label: "Buat workspace", onClick: openCreateModal }
              : undefined
          }
          className="py-16"
        />
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
