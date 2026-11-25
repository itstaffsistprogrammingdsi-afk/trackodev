import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Users } from "lucide-react";

import Avatar from "@/components/ui/avatar/Avatar";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { toast, confirmDialog } from "@/lib/feedback";
import type { User } from "@/features/user/types";
import { useLanguage } from "@/context/LanguageContext";

import {
  addDivisionMember,
  getDivisionMembers,
  removeDivisionMember,
} from "../../api/division.api";
import type { DivisionMember } from "../../types";
import { getUserRole } from "../../utils/getUserRole";
import DivisionMemberMentionInput from "./DivisionMemberMentionInput";

type Props = {
  divisionId: string;
};

type RoleFilter = "all" | "admin" | "member";

function divisionRoleOf(member: DivisionMember): "admin" | "member" {
  if (member.division_role) return member.division_role;
  return getUserRole(member) === "admin" ? "admin" : "member";
}

export default function DivisionMembers({ divisionId }: Props) {
  const { t, language } = useLanguage();
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog",
    "Division",
    "User",
  ]);
  const [members, setMembers] = useState<DivisionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "member">(
    "member",
  );
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getDivisionMembers(divisionId);
      setMembers(data ?? []);
    } catch (caught) {
      console.error(caught);
      setError(
        t(
          "Gagal memuat anggota divisi. Coba lagi.",
          "Failed to load division members. Try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [divisionId, language, t]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers, realtimeRevision]);

  const adminCount = useMemo(
    () =>
      members.filter((member) => divisionRoleOf(member) === "admin").length,
    [members],
  );
  const memberCount = members.length - adminCount;

  const filteredMembers = useMemo(() => {
    if (roleFilter === "all") return members;
    return members.filter(
      (member) => divisionRoleOf(member) === roleFilter,
    );
  }, [members, roleFilter]);

  const handleAdd = async (user: User) => {
    try {
      const exists = members.some((member) => member.id === user.id);

      if (exists) {
        toast.info(
          t(
            "User sudah menjadi anggota divisi ini.",
            "This user is already a member of this division.",
          ),
        );
        return;
      }

      await addDivisionMember(divisionId, {
        user_id: user.id,
        role: newMemberRole,
      });

      toast.success(
        t(
          "{name} ditambahkan sebagai {role}.",
          "{name} was added as {role}.",
          {
            name: user.name,
            role:
              newMemberRole === "admin"
                ? t("Admin divisi", "Division admin")
                : t("Anggota", "Member"),
          },
        ),
      );
      await fetchMembers();
    } catch (caught) {
      console.error(caught);
      toast.error(
        t("Gagal menambahkan anggota.", "Failed to add the member."),
      );
    }
  };

  const handleRemove = async (id: string, name: string) => {
    const confirmed = await confirmDialog({
      title: t("Keluarkan anggota", "Remove member"),
      message: t(
        "Keluarkan {name} dari divisi ini? Akses mereka ke workspace dan campaign divisi akan mengikuti aturan yang berlaku.",
        "Remove {name} from this division? Their access to the division's workspaces and campaigns will follow the applicable rules.",
        { name },
      ),
      confirmText: t("Keluarkan", "Remove"),
      cancelText: t("Batal", "Cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setRemovingId(id);
      await removeDivisionMember(divisionId, id);
      toast.success(
        t(
          "{name} dikeluarkan dari divisi.",
          "{name} was removed from the division.",
          { name },
        ),
      );
      await fetchMembers();
    } catch (caught) {
      console.error(caught);
      toast.error(
        t("Gagal mengeluarkan anggota.", "Failed to remove the member."),
      );
    } finally {
      setRemovingId(null);
    }
  };

  const filterOptions: Array<{
    value: RoleFilter;
    label: string;
    labelEn: string;
    count: number;
  }> = [
    { value: "all", label: "Semua", labelEn: "All", count: members.length },
    { value: "admin", label: "Admin", labelEn: "Admin", count: adminCount },
    {
      value: "member",
      label: "Anggota",
      labelEn: "Members",
      count: memberCount,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold tracking-heading text-fg">
          {t("Anggota divisi", "Division members")}
        </h3>
        <p className="mt-0.5 text-xs leading-5 text-fg-muted">
          {t(
            "Tambahkan anggota, atur peran, lalu kelola akses mereka di divisi ini.",
            "Add members, set their roles, then manage their access in this division.",
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface-muted/40 p-3">
        <div>
          <label
            htmlFor="division-member-role"
            className="mb-1 block text-2xs font-medium text-fg-subtle"
          >
            {t("Tambahkan sebagai", "Add as")}
          </label>
          <select
            id="division-member-role"
            value={newMemberRole}
            onChange={(event) =>
              setNewMemberRole(event.target.value as "admin" | "member")
            }
            className="h-9 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          >
            <option value="member">{t("Anggota", "Member")}</option>
            <option value="admin">{t("Admin divisi", "Division admin")}</option>
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <p className="mb-1 text-2xs font-medium text-fg-subtle">
            {t("Cari user", "Search users")}
          </p>
          <DivisionMemberMentionInput
            onSelect={handleAdd}
            role={newMemberRole}
          />
        </div>
      </div>

      <p className="text-2xs leading-4 text-fg-subtle">
        <strong className="font-medium text-fg-muted">
          {t("Admin divisi", "Division admin")}
        </strong>{" "}
        {t(
          "dapat mengelola workspace/campaign divisi ini.",
          "can manage this division's workspaces and campaigns.",
        )}{" "}
        <strong className="font-medium text-fg-muted">
          {t("Anggota", "Members")}
        </strong>{" "}
        {t(
          "hanya melihat campaign/task yang dibuat atau diikutinya.",
          "can only see the campaigns and tasks they created or joined.",
        )}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <div
          role="group"
          aria-label={t(
            "Filter anggota berdasarkan peran",
            "Filter members by role",
          )}
          className="flex items-center gap-0.5 rounded-control border border-line bg-surface p-0.5"
        >
          {filterOptions.map((option) => {
            const active = roleFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setRoleFilter(option.value)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-surface-muted text-fg"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {t(option.label, option.labelEn)}
                <span className="tabular-nums text-2xs text-fg-subtle">
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-2xs tabular-nums text-fg-subtle">
          {t(
            "{shown} dari {total} anggota",
            "{shown} of {total} members",
            { shown: filteredMembers.length, total: members.length },
          )}
        </span>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-control border border-danger/20 bg-danger-soft p-3 text-xs text-danger"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2" role="status" aria-busy="true">
          <span className="sr-only">
            {t("Memuat anggota divisi", "Loading division members")}
          </span>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-card border border-dashed border-line p-8 text-center">
          <Users
            size={22}
            className="mx-auto text-fg-subtle"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm font-medium text-fg">
            {t("Belum ada anggota", "No members yet")}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {t(
              "Cari user di atas lalu tambahkan ke divisi ini.",
              "Search for a user above, then add them to this division.",
            )}
          </p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-card border border-dashed border-line p-8 text-center">
          <p className="text-sm font-medium text-fg">
            {t(
              "Tidak ada {role} di divisi ini",
              "No {role} in this division",
              {
                role:
                  roleFilter === "admin"
                    ? t("admin", "admins")
                    : t("anggota", "members"),
              },
            )}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {t(
              "Ubah filter atau tambahkan anggota dengan peran tersebut.",
              "Change the filter or add a member with that role.",
            )}
          </p>
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className="mt-3 h-8 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            {t("Tampilkan semua", "Show all")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => {
            const role = divisionRoleOf(member);

            return (
              <div
                key={member.id}
                className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-3 transition-colors hover:border-line-strong sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    src={member.avatar}
                    name={member.name}
                    alt={`Avatar ${member.name}`}
                    size="small"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-fg">
                      {member.name}
                    </p>
                    <p className="truncate text-2xs text-fg-subtle">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${
                      role === "admin"
                        ? "bg-accent-soft text-accent"
                        : "bg-surface-muted text-fg-muted"
                    }`}
                  >
                    {role === "admin"
                      ? t("Admin divisi", "Division admin")
                      : t("Anggota", "Member")}
                  </span>

                  <button
                    type="button"
                    disabled={removingId === member.id}
                    onClick={() => void handleRemove(member.id, member.name)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2 text-2xs font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
                    aria-label={t(
                      "Keluarkan {name}",
                      "Remove {name}",
                      { name: member.name },
                    )}
                  >
                    {removingId === member.id ? (
                      <Loader2
                        size={12}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={12} aria-hidden="true" />
                    )}
                    {removingId === member.id
                      ? t("Memproses…", "Processing…")
                      : t("Keluarkan", "Remove")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
