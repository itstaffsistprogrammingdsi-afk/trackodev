import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ChevronDown, Trash2, UserPlus, Users, X } from "lucide-react";

import {
  PeopleSearchInput,
  PersonRow,
} from "@/components/ui/people-picker/PeoplePicker";
import { toast } from "@/lib/feedback";
import { AxiosError } from "axios";

import {
  Workspace,
  WorkspaceAccessLevel,
  WorkspaceMember,
  MentionableUser,
} from "../types";
import { searchMentionableUsers } from "../api/workspace.api";
import {
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberAccess,
  useWorkspaceMembers,
} from "../hooks/useWorkspaceMembers";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
  workspace: Workspace;
}

const ACCESS_OPTIONS: {
  value: WorkspaceAccessLevel;
  label: string;
  labelEn: string;
  hint: string;
  hintEn: string;
}[] = [
  {
    value: "join_only",
    label: "Kolaborator (join saja)",
    labelEn: "Collaborator (join only)",
    hint: "Bisa membuka workspace; isi tetap per-campaign seperti biasa.",
    hintEn:
      "Can open the workspace; content stays per-campaign as usual.",
  },
  {
    value: "view_all",
    label: "Lihat seluruh isi",
    labelEn: "View all content",
    hint: "Bisa melihat semua campaign & task di workspace ini (hanya lihat).",
    hintEn:
      "Can see all campaigns & tasks in this workspace (view only).",
  },
  {
    value: "full",
    label: "Full akses (edit isi)",
    labelEn: "Full access (edit content)",
    hint: "Lihat semua + bisa membuat campaign & mengedit isi konten.",
    hintEn: "See everything + create campaigns & edit content.",
  },
];

const errorMessage = (err: unknown, fallback: string) => {
  if (err instanceof AxiosError) {
    const validation = err.response?.data?.errors as
      | Record<string, string[]>
      | undefined;
    const first = validation ? Object.values(validation).flat()[0] : undefined;
    return first || err.response?.data?.message || fallback;
  }
  return fallback;
};

export default function WorkspaceMembersModal({ open, onClose, workspace }: Props) {
  const { t } = useLanguage();
  const { data: members = [], isLoading } = useWorkspaceMembers(workspace.id, open);

  const addMember = useAddWorkspaceMember(workspace.id);
  const updateAccess = useUpdateWorkspaceMemberAccess(workspace.id);
  const removeMember = useRemoveWorkspaceMember(workspace.id);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MentionableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<
    { user: MentionableUser; access: WorkspaceAccessLevel }[]
  >([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAuto, setShowAuto] = useState(false);

  const requestIdRef = useRef(0);

  const existingIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const accessLabel = (access: WorkspaceAccessLevel) => {
    const option = ACCESS_OPTIONS.find((item) => item.value === access);
    return option ? t(option.label, option.labelEn) : access;
  };

  const accessHint = (access: WorkspaceAccessLevel) => {
    const option = ACCESS_OPTIONS.find((item) => item.value === access);
    return option ? t(option.hint, option.hintEn) : undefined;
  };

  // Keanggotaan otomatis (lewat campaign/task) disembunyikan dari daftar
  // utama, tetapi aksesnya tetap berlaku dan tetap bisa dikelola.
  const manualMembers = useMemo(
    () => members.filter((member) => member.source !== "auto"),
    [members],
  );
  const autoMembers = useMemo(
    () => members.filter((member) => member.source === "auto"),
    [members],
  );

  const renderMemberRow = (member: WorkspaceMember, auto: boolean) => (
    <PersonRow
      key={member.id}
      person={member}
      meta={
        [
          auto ? t("Otomatis", "Automatic") : null,
          member.division_names?.join(" · "),
        ]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      action={
        <div className="flex items-center gap-1.5">
          <select
            value={member.access}
            disabled={busyId === member.id}
            onChange={(event) =>
              void handleChangeAccess(
                member.id,
                event.target.value as WorkspaceAccessLevel,
              )
            }
            aria-label={t("Level akses {name}", "Access level {name}", {
              name: member.name,
            })}
            className="h-8 max-w-[9rem] rounded-[7px] border border-line bg-surface px-2 text-2xs font-medium text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50"
          >
            {ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label, option.labelEn)}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={busyId === member.id}
            onClick={() => void handleRemove(member.id, member.name)}
            aria-label={t("Cabut akses {name}", "Revoke access {name}", {
              name: member.name,
            })}
            title={t(
              "Cabut akses (sekarang: {access})",
              "Revoke access (currently: {access})",
              { access: accessLabel(member.access) },
            )}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      }
    />
  );

  // Reset saat modal ditutup + kunci scroll & dukung Escape.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected([]);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;

    const keyword = query.trim();
    const requestId = ++requestIdRef.current;

    if (keyword.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const users = await searchMentionableUsers(keyword, workspace.id);
        if (requestId !== requestIdRef.current) return;
        setResults(
          users.filter(
            (user) =>
              !existingIds.has(user.id) &&
              !selected.some((item) => item.user.id === user.id),
          ),
        );
      } catch {
        if (requestId === requestIdRef.current) setResults([]);
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, existingIds, selected]);

  if (!open) return null;

  const toggleSelect = (user: MentionableUser) => {
    setSelected((prev) =>
      prev.some((item) => item.user.id === user.id)
        ? prev.filter((item) => item.user.id !== user.id)
        : [...prev, { user, access: "join_only" }],
    );
  };

  const setSelectedAccess = (userId: string, access: WorkspaceAccessLevel) => {
    setSelected((prev) =>
      prev.map((item) => (item.user.id === userId ? { ...item, access } : item)),
    );
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;

    const failed: string[] = [];
    let successCount = 0;

    for (const item of selected) {
      try {
        await addMember.mutateAsync({ userId: item.user.id, access: item.access });
        successCount += 1;
      } catch (err) {
        failed.push(
          `${item.user.name}: ${errorMessage(err, t("gagal", "failed"))}`,
        );
      }
    }

    setSelected([]);
    setQuery("");
    setResults([]);

    // Ringkasan jujur: sukses sebagian tidak boleh dilaporkan sebagai sukses penuh.
    if (failed.length === 0) {
      toast.success(
        t("{count} orang berhasil diberi akses.", "{count} people were given access.", {
          count: successCount,
        }),
      );
    } else if (successCount === 0) {
      toast.error(
        t("Gagal memberi akses. {errors}", "Failed to grant access. {errors}", {
          errors: failed.join("; "),
        }),
      );
    } else {
      toast.warning(
        t(
          "{success} berhasil, {failed} gagal — {errors}",
          "{success} succeeded, {failed} failed — {errors}",
          { success: successCount, failed: failed.length, errors: failed.join("; ") },
        ),
      );
    }
  };

  const handleChangeAccess = async (userId: string, access: WorkspaceAccessLevel) => {
    setBusyId(userId);
    try {
      await updateAccess.mutateAsync({ userId, access });
      toast.success(t("Level akses diperbarui.", "Access level updated."));
    } catch (err) {
      toast.error(
        errorMessage(
          err,
          t("Gagal mengubah level akses.", "Failed to change access level."),
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    setBusyId(userId);
    try {
      await removeMember.mutateAsync(userId);
      toast.success(
        t("Akses {name} dicabut.", "Access for {name} revoked.", { name }),
      );
    } catch (err) {
      toast.error(
        errorMessage(err, t("Gagal mencabut akses.", "Failed to revoke access.")),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-overlay p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-members-title"
        className="max-h-[92dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-modal border border-line bg-surface p-5 shadow-e3 sm:rounded-modal"
        style={{ animation: "ui-scale-in 160ms ease-out" }}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-control bg-accent-soft text-accent">
                <Users size={16} aria-hidden="true" />
              </span>
              <h2
                id="workspace-members-title"
                className="text-sm font-semibold tracking-heading text-fg"
              >
                {t("Bagikan workspace", "Share workspace")}
              </h2>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-fg-muted">
              {t("Bagikan", "Share")}{" "}
              <span className="font-medium text-fg">{workspace.name}</span>{" "}
              {t(
                "ke siapa pun di sistem, termasuk lintas divisi, lalu atur level aksesnya.",
                "with anyone in the system, including cross-division, then set their access level.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Tutup", "Close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {/* TAMBAH ANGGOTA */}
        <div className="rounded-card border border-line bg-surface-muted/40 p-3">
          <p className="mb-2 text-2xs font-medium text-fg-subtle">
            {t("Tambah orang", "Add people")}
          </p>

          <PeopleSearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("Cari nama atau email", "Search name or email")}
            ariaLabel={t("Cari nama atau email", "Search name or email")}
            loading={searching}
            autoFocus
          />

          <p className="mt-1.5 text-2xs leading-4 text-fg-subtle">
            {t(
              "Menampilkan user dari semua divisi. User yang belum terdaftar di divisi mana pun perlu didaftarkan super admin lebih dulu.",
              "Shows users from all divisions. Users not registered in any division must be registered by a super admin first.",
            )}
          </p>

          {query.trim().length >= 2 && !searching && results.length === 0 ? (
            <p className="mt-2 text-2xs text-fg-subtle">
              {t(
                "Tidak ada orang yang cocok, atau semuanya sudah punya akses.",
                "No matching people, or everyone already has access.",
              )}
            </p>
          ) : null}

          {results.length > 0 ? (
            <div className="custom-scrollbar mt-2 max-h-44 space-y-1 overflow-y-auto">
              {results.map((user) => (
                <PersonRow
                  key={user.id}
                  person={user}
                  onClick={() => toggleSelect(user)}
                  action={
                    <UserPlus
                      size={14}
                      className="text-accent"
                      aria-hidden="true"
                    />
                  }
                />
              ))}
            </div>
          ) : null}

          {selected.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              <p className="text-2xs font-medium text-fg-subtle">
                {t("Akan diberi akses ({count})", "To be given access ({count})", {
                  count: selected.length,
                })}
              </p>
              {selected.map((item) => (
                <PersonRow
                  key={item.user.id}
                  person={item.user}
                  meta={accessHint(item.access)}
                  action={
                    <div className="flex items-center gap-1.5">
                      <select
                        value={item.access}
                        onChange={(event) =>
                          setSelectedAccess(
                            item.user.id,
                            event.target.value as WorkspaceAccessLevel,
                          )
                        }
                        aria-label={t("Level akses {name}", "Access level {name}", {
                          name: item.user.name,
                        })}
                        className="h-8 max-w-[9rem] rounded-[7px] border border-line bg-surface px-2 text-2xs font-medium text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                      >
                        {ACCESS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.label, option.labelEn)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleSelect(item.user)}
                        aria-label={t("Batalkan {name}", "Remove {name}", {
                          name: item.user.name,
                        })}
                        className="flex h-8 w-8 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                  }
                />
              ))}

              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={addMember.isPending}
                className="h-9 w-full rounded-control bg-accent text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {addMember.isPending ? t("Menyimpan…", "Saving…") : t("Beri akses", "Grant access")}
              </button>
            </div>
          ) : null}
        </div>

        {/* DAFTAR ANGGOTA */}
        <div>
          <p className="mb-2 text-2xs font-medium text-fg-subtle">
            {t("Dibagikan langsung ({count})", "Shared directly ({count})", {
              count: manualMembers.length,
            })}
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-xs text-fg-muted">
              <Loader2
                size={14}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {t("Memuat daftar…", "Loading list…")}
            </div>
          ) : manualMembers.length === 0 ? (
            <p className="rounded-card border border-dashed border-line py-5 text-center text-xs text-fg-subtle">
              {t(
                "Workspace ini belum dibagikan langsung ke siapa pun.",
                "This workspace hasn't been shared directly with anyone yet.",
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {manualMembers.map((member) => renderMemberRow(member, false))}
            </div>
          )}

          {autoMembers.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAuto((value) => !value)}
                aria-expanded={showAuto}
                className="flex w-full items-center justify-between gap-2 rounded-control border border-line bg-surface-muted/50 px-2.5 py-2 text-left text-2xs font-medium text-fg-muted transition-colors hover:bg-surface-muted"
              >
                <span>
                  {showAuto ? t("Sembunyikan", "Hide") : t("Tampilkan", "Show")}{" "}
                  {t(
                    "{count} anggota otomatis",
                    "{count} automatic members",
                    { count: autoMembers.length },
                  )}
                  <span className="ml-1 font-normal text-fg-subtle">
                    {t(
                      "(via campaign/task · akses tetap berlaku)",
                      "(via campaign/task · access still applies)",
                    )}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${showAuto ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {showAuto ? (
                <div className="mt-2 space-y-2">
                  {autoMembers.map((member) => renderMemberRow(member, true))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
