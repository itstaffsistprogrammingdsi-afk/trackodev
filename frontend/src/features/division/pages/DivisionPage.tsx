import { useState } from "react";
import { Building2, Plus } from "lucide-react";

import { useDivisions } from "../hooks/useDivisions";
import DivisionCard from "../components/cards/DivisionCard";
import CreateDivisionModal from "../components/CreateDivisionModal";
import type { Division } from "../types";
import ManageDivisionMembersModal from "../components/modals/ManageDivisionMembersModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import PageHeader from "@/components/layout/PageHeader";

export default function DivisionPage() {
  const { t } = useLanguage();
  const { can, hasRole } = useAuth();
  const ownOnly = !hasRole("super_admin") && !can("division.view");
  const canViewAllDivisions =
    hasRole("super_admin") || can("division.view_all");
  const personalView = !canViewAllDivisions;
  const { data, isLoading } = useDivisions(ownOnly);
  const [open, setOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const canCreate = can("division.create");

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true">
        <span className="sr-only">
          {t("Memuat daftar divisi", "Loading divisions")}
        </span>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
        title={personalView ? t("Divisi saya", "My divisions") : t("Divisi", "Division")}
        description={
          personalView
            ? t(
                "Divisi yang Anda akses, termasuk melalui workspace dan campaign.",
                "Divisions you can access, including through workspaces and campaigns.",
              )
            : t(
                "Kelola struktur organisasi dan anggota tiap divisi.",
                "Manage the organization structure and members of each division.",
              )
        }
        actions={
          canCreate ? (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("Divisi baru", "New division")}
            </button>
          ) : null
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={Building2}
          title={t("Belum ada divisi", "No divisions yet")}
          description={
            canCreate
              ? t(
                  "Buat divisi pertama untuk mulai mengelompokkan workspace, campaign, dan tim.",
                  "Create your first division to start grouping workspaces, campaigns, and teams.",
                )
              : personalView
                ? t(
                    "Divisi yang Anda akses akan muncul di sini.",
                    "Divisions you can access will appear here.",
                  )
                : t(
                    "Divisi akan muncul di sini setelah dibuat oleh administrator.",
                    "Divisions will appear here once an administrator creates them.",
                  )
          }
          action={
            canCreate
              ? {
                  label: t("Buat divisi", "Create division"),
                  onClick: () => setOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
