import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  ArrowRight,
  Building2,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";

import EditDivisionModal from "../modals/EditDivisionModal";

import { useDeleteDivision } from "../../hooks/useDivisions";
import { confirmDialog, toast } from "@/lib/feedback";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getLocale } from "@/i18n/translate";
import AvatarStack from "@/components/ui/AvatarStack";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

import type { Division } from "../../types";
import type { User } from "../../../user/types";

type Props = {
  division: Division;
  onManageMembers?: (division: Division) => void;
};

const accentTiles = [
  "bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-brand-500/25 dark:to-brand-500/5 dark:text-brand-300",
  "bg-gradient-to-br from-[#cffafe] to-[#ecfeff] text-[#0e7490] dark:from-[#0ea5e9]/25 dark:to-[#0ea5e9]/5 dark:text-[#7dd3fc]",
  "bg-gradient-to-br from-[#d1fae5] to-[#ecfdf5] text-[#047857] dark:from-[#10b981]/25 dark:to-[#10b981]/5 dark:text-[#6ee7b7]",
  "bg-gradient-to-br from-[#fef3c7] to-[#fffbeb] text-[#b45309] dark:from-[#f59e0b]/25 dark:to-[#f59e0b]/5 dark:text-[#fcd34d]",
  "bg-gradient-to-br from-[#ffe4e6] to-[#fff1f2] text-[#be123c] dark:from-[#f43f5e]/25 dark:to-[#f43f5e]/5 dark:text-[#fda4af]",
  "bg-gradient-to-br from-[#ede9fe] to-[#f5f3ff] text-[#6d28d9] dark:from-[#8b5cf6]/25 dark:to-[#8b5cf6]/5 dark:text-[#c4b5fd]",
];

function accentTile(id: string): string {
  let hash = 0;
  for (const character of id) {
    hash = (hash + character.charCodeAt(0)) % accentTiles.length;
  }
  return accentTiles[hash] ?? accentTiles[0];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(getLocale(), {
    month: "short",
    year: "numeric",
  });
}

export default function DivisionCard({ division, onManageMembers }: Props) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { hasRole, managesDivision } = useAuth();
  const canManageDivision = hasRole("super_admin") || managesDivision();

  const deleteMutation = useDeleteDivision();
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const membersLoaded = Array.isArray(division.users);
  const users: User[] = division.users ?? [];
  const adminCount = users.filter(
    (user) => user.division_role === "admin",
  ).length;
  const hasMembers = membersLoaded && users.length > 0;
  // User lintas divisi bisa melihat divisi lewat workspace/campaign tanpa
  // menerima roster anggota. Jangan tampilkan itu sebagai "0 anggota".
  const accessViaWorkspace = !membersLoaded;

  const memberLabel =
    language === "en"
      ? `${users.length} ${users.length === 1 ? "member" : "members"}`
      : `${users.length} anggota`;
  const adminLabel =
    language === "en"
      ? `${adminCount} ${adminCount === 1 ? "admin" : "admins"}`
      : `${adminCount} admin`;

  const destination = `/divisions/${division.id}`;

  const handleOpen = () => navigate(destination);

  const handleDelete = async () => {
    setMenuOpen(false);

    const confirmed = await confirmDialog({
      title: t("Hapus divisi", "Delete division"),
      message: t(
        'Divisi "{name}" akan dihapus permanen beserta data yang terkait.',
        'Division "{name}" will be permanently deleted along with its related data.',
        { name: division.name },
      ),
      confirmText: t("Hapus divisi", "Delete division"),
      cancelText: t("Batal", "Cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(division.id);
      toast.success(t("Divisi dihapus.", "Division deleted."));
    } catch {
      toast.error(
        t("Divisi gagal dihapus. Coba lagi.", "Failed to delete the division. Try again."),
      );
    }
  };

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
        aria-label={t("Buka divisi {name}", "Open division {name}", {
          name: division.name,
        })}
        className={`group relative flex h-full cursor-pointer flex-col rounded-panel border border-line bg-surface p-5 shadow-e1 transition-[transform,border-color,box-shadow] duration-200 ease-soft hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:translate-y-0 active:shadow-e1 ${
          menuOpen ? "z-20" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${accentTile(division.id)}`}
            >
              <Building2 aria-hidden="true" className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <h2 className="line-clamp-2 min-h-12 break-words text-base font-semibold leading-6 tracking-heading text-fg">
                {division.name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {division.code ? (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-fg-muted">
                    {division.code}
                  </span>
                ) : null}

                {accessViaWorkspace ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-2xs font-medium text-info"
                    title={t(
                      "Bergabung sebagai kolaborator melalui workspace/campaign. Roster anggota tidak ditampilkan.",
                      "Joined as a collaborator through a workspace/campaign. Member roster is hidden.",
                    )}
                  >
                    <ShieldCheck
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0"
                    />
                    {t("Kolaborator", "Collaborator")}
                  </span>
                ) : !hasMembers && canManageDivision ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-medium text-warning">
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-warning"
                    />
                    {t("Perlu anggota", "Needs members")}
                  </span>
                ) : !hasMembers ? (
                  <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-fg-muted">
                    {t("Belum ada anggota", "No members yet")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="relative shrink-0"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={t("Aksi divisi {name}", "Division actions for {name}", {
                name: division.name,
              })}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
              className="dropdown-toggle flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>

            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="w-52"
            >
              {canManageDivision ? (
                <DropdownItem
                  icon={<UserCog className="h-4 w-4" />}
                  onClick={() => onManageMembers?.(division)}
                  onItemClick={() => setMenuOpen(false)}
                >
                  {t("Kelola anggota", "Manage members")}
                </DropdownItem>
              ) : null}

              {canManageDivision ? (
                <DropdownItem
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => setShowEditModal(true)}
                  onItemClick={() => setMenuOpen(false)}
                >
                  {t("Edit divisi", "Edit division")}
                </DropdownItem>
              ) : null}

              <DropdownItem
                icon={<Activity className="h-4 w-4" />}
                onClick={() => navigate(`/divisions/${division.id}/detail`)}
                onItemClick={() => setMenuOpen(false)}
              >
                {t("Detail aktivitas", "Activity details")}
              </DropdownItem>

              {canManageDivision ? (
                <DropdownItem
                  icon={<Trash2 className="h-4 w-4" />}
                  danger
                  disabled={deleteMutation.isPending}
                  onClick={() => void handleDelete()}
                  onItemClick={() => setMenuOpen(false)}
                >
                  {t("Hapus divisi", "Delete division")}
                </DropdownItem>
              ) : null}
            </Dropdown>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-fg-muted">
          {division.description ||
            t("Belum ada deskripsi divisi.", "No division description yet.")}
        </p>

        {accessViaWorkspace ? (
          <div
            className="mt-4 flex min-h-7 items-center gap-2 text-2xs text-fg-subtle"
            title={t(
              "Bergabung sebagai kolaborator melalui workspace/campaign. Roster anggota tidak ditampilkan.",
              "Joined as a collaborator through a workspace/campaign. Member roster is hidden.",
            )}
          >
            <ShieldCheck
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0"
            />
            <span>{t("Roster anggota tidak ditampilkan", "Member roster is hidden")}</span>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            {hasMembers ? (
              <AvatarStack
                users={users}
                max={4}
                size="sm"
                label={
                  language === "en"
                    ? `${users.length} ${users.length === 1 ? "member" : "members"} of division ${division.name}`
                    : `${users.length} anggota divisi ${division.name}`
                }
              />
            ) : (
              <span className="text-xs text-fg-subtle">
                {t("Belum ada anggota", "No members yet")}
              </span>
            )}

            <span className="shrink-0 whitespace-nowrap text-xs text-fg-muted">
              {memberLabel}
              {canManageDivision ? ` · ${adminLabel}` : ""}
            </span>
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-fg-muted transition-colors group-hover:text-accent">
              {t("Lihat workspace", "View workspace")}
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>

            <span className="whitespace-nowrap text-2xs text-fg-subtle">
              {t("Dibuat {date}", "Created {date}", {
                date: formatDate(division.created_at),
              })}
            </span>
          </div>
        </div>
      </article>

      <EditDivisionModal
        open={showEditModal}
        division={division}
        onClose={() => setShowEditModal(false)}
      />
    </>
  );
}
