import { useState } from "react";
import { Building2, Plus } from "lucide-react";

import { useDivisions } from "../hooks/useDivisions";
import DivisionCard from "../components/cards/DivisionCard";
import CreateDivisionModal from "../components/CreateDivisionModal";
import type { Division } from "../types";
import ManageDivisionMembersModal from "../components/modals/ManageDivisionMembersModal";
import { useAuth } from "@/context/AuthContext";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import PageHeader from "@/components/layout/PageHeader";

export default function DivisionPage() {
  const { can, hasRole } = useAuth();
  const ownOnly = !hasRole("super_admin") && !can("division.view");
  const { data, isLoading } = useDivisions(ownOnly);
  const [open, setOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const canCreate = can("division.create");

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">Memuat daftar divisi</span>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex h-full flex-col rounded-panel border border-line bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-control" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-control" />
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                <Skeleton className="mt-4 h-3 w-24" />
                <Skeleton className="mt-4 h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Divisi"
        description="Kelola struktur organisasi dan anggota tiap divisi."
        actions={
          canCreate ? (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Divisi baru
            </button>
          ) : null
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={Building2}
          title="Belum ada divisi"
          description={
            canCreate
              ? "Buat divisi pertama untuk mulai mengelompokkan workspace, campaign, dan tim."
              : "Divisi akan muncul di sini setelah dibuat oleh administrator."
          }
          action={
            canCreate
              ? { label: "Buat divisi", onClick: () => setOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((division, index) => (
            <div
              key={division.id}
              className="card-enter h-full"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
            >
              <DivisionCard
                division={division}
                onManageMembers={(selected) => {
                  setSelectedDivision(selected);
                  setMemberModalOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <CreateDivisionModal open={open} onClose={() => setOpen(false)} />

      <ManageDivisionMembersModal
        open={memberModalOpen}
        division={selectedDivision}
        onClose={() => {
          setSelectedDivision(null);
          setMemberModalOpen(false);
        }}
      />
    </div>
  );
}
