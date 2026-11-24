import { useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  FolderKanban,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  X,
} from "lucide-react";

import { useWorkspaces } from "../hooks/useWorkspaces";
import WorkspaceCard from "../components/WorkspaceCard";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import { useAuth } from "../../../context/AuthContext";
import { Workspace } from "../types";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import PageHeader from "@/components/layout/PageHeader";

type ViewMode = "grid" | "list";
type SortMode = "recent" | "name";

const VIEW_STORAGE_KEY = "tracko:workspace-view";

function readStoredView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const divisionId = id ?? "";

  const { user, loading: authLoading } = useAuth();
  const { data, isLoading: workspacesLoading } = useWorkspaces(divisionId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<ViewMode>(readStoredView);
  const [sortBy, setSortBy] = useState<SortMode>("recent");

  useEffect(() => {
    setSearchQuery("");
  }, [divisionId]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // localStorage bisa diblokir; preferensi tampilan tidak wajib.
    }
  }, [view]);

  const isLoading = authLoading || workspacesLoading;

  const canManageWorkspace = useMemo(() => {
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some((role) =>
      ["super_admin", "admin", "manager"].includes(role),
    );
  }, [user]);

  const safeWorkspaces = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const visibleWorkspaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? safeWorkspaces.filter(
          (workspace) =>
            workspace.name?.toLowerCase().includes(query) ||
            workspace.description?.toLowerCase().includes(query),
        )
      : safeWorkspaces;

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "id");
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [safeWorkspaces, searchQuery, sortBy]);

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

  if (isLoading) {
    return (
      <div className="w-full space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Memuat daftar workspace</span>

        <div className="space-y-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <Skeleton className="h-14 w-full rounded-panel" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex h-44 flex-col rounded-panel border border-line bg-surface p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-control" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-control" />
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                <Skeleton className="mt-3 h-3 w-24" />
                <Skeleton className="mt-3 h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Workspace"
        description="Kelola dan pantau seluruh ruang kerja pada divisi ini."
        actions={
          canManageWorkspace ? (
            <button
              onClick={openCreateModal}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto"
            >
              <Plus size={17} aria-hidden="true" />
              <span>Workspace baru</span>
            </button>
          ) : null
        }
      />

      {safeWorkspaces.length > 0 ? (
        <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 rounded-panel border border-line bg-surface/95 p-2 shadow-e1 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Cari workspace"
              aria-label="Cari workspace"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 w-full rounded-control border border-transparent bg-surface-muted/60 pl-9 pr-9 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:bg-surface-muted focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian workspace"
                className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortMode)}
                aria-label="Urutkan workspace"
                className="h-9 cursor-pointer appearance-none rounded-control border border-line bg-surface pl-3 pr-8 text-xs font-medium text-fg-muted outline-none transition-colors hover:bg-surface-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
              >
                <option value="recent">Terbaru</option>
                <option value="name">Nama A–Z</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
              />
            </div>

            <div
              role="group"
              aria-label="Tampilan workspace"
              className="flex items-center gap-0.5 rounded-control border border-line bg-surface p-0.5"
            >
              <button
                type="button"
                aria-label="Tampilan grid"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={`flex h-9 w-9 items-center justify-center rounded-[7px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  view === "grid"
                    ? "bg-surface-muted text-fg"
                    : "text-fg-subtle hover:text-fg"
                }`}
              >
                <LayoutGrid aria-hidden="true" className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label="Tampilan list"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={`flex h-9 w-9 items-center justify-center rounded-[7px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  view === "list"
                    ? "bg-surface-muted text-fg"
                    : "text-fg-subtle hover:text-fg"
                }`}
              >
                <ListIcon aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <span className="ml-1 hidden text-2xs text-fg-subtle sm:block">
              {visibleWorkspaces.length} workspace
            </span>
          </div>
        </div>
      ) : null}

      {visibleWorkspaces.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={
            searchQuery ? "Workspace tidak ditemukan" : "Belum ada workspace"
          }
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
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleWorkspaces.map((workspace, index) => (
            <div
              key={workspace.id}
              className="card-enter h-full"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
            >
              <WorkspaceCard
                workspace={workspace}
                divisionId={divisionId}
                canManage={canManageWorkspace}
                onEdit={openEditModal}
                view="grid"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleWorkspaces.map((workspace, index) => (
            <div
              key={workspace.id}
              className="card-enter"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
            >
              <WorkspaceCard
                workspace={workspace}
                divisionId={divisionId}
                canManage={canManageWorkspace}
                onEdit={openEditModal}
                view="list"
              />
            </div>
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        open={modalOpen}
        onClose={closeModal}
        divisionId={divisionId}
        workspace={editingWorkspace}
      />
    </div>
  );
}
