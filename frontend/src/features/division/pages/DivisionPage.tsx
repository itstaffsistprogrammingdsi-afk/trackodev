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
        <div className="grid grid-cols-1 gap-4 xsm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-4 rounded-panel border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-control" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Divisi
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Kelola struktur organisasi dan anggota tiap divisi.
          </p>
        </div>

        {canCreate ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Divisi baru
          </button>
        ) : null}
      </div>

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
        <div className="grid grid-cols-1 gap-4 xsm:grid-cols-2 xl:grid-cols-3">
          {data.map((division) => (
            <DivisionCard
              key={division.id}
              division={division}
              onManageMembers={(selected) => {
                setSelectedDivision(selected);
                setMemberModalOpen(true);
              }}
            />
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
