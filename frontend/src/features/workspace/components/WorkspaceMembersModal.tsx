import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ChevronDown, Search, Trash2, UserPlus, Users, X } from "lucide-react";

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

interface Props {
  open: boolean;
  onClose: () => void;
  workspace: Workspace;
}

const ACCESS_OPTIONS: { value: WorkspaceAccessLevel; label: string; hint: string }[] = [
  {
    value: "join_only",
    label: "Kolaborator (join saja)",
    hint: "Bisa membuka workspace; isi tetap per-campaign seperti biasa.",
  },
  {
    value: "view_all",
    label: "Lihat seluruh isi",
    hint: "Bisa melihat semua campaign & task di workspace ini (hanya lihat).",
  },
  {
    value: "full",
    label: "Full akses (edit isi)",
    hint: "Lihat semua + bisa membuat campaign & mengedit isi konten.",
  },
];

const accessLabel = (access: WorkspaceAccessLevel) =>
  ACCESS_OPTIONS.find((option) => option.value === access)?.label ?? access;

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
    <div
      key={member.id}
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          {member.name}
          {auto ? (
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              otomatis
            </span>
          ) : null}
        </p>
        <p className="truncate text-[11px] text-slate-400">
          {member.email}
          {member.division_names?.length
            ? ` · ${member.division_names.join(", ")}`
            : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={member.access}
          disabled={busyId === member.id}
          onChange={(event) =>
            void handleChangeAccess(
              member.id,
              event.target.value as WorkspaceAccessLevel,
            )
          }
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {ACCESS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busyId === member.id}
          onClick={() => void handleRemove(member.id, member.name)}
          aria-label={`Cabut akses ${member.name}`}
          title={`Cabut akses (sekarang: ${accessLabel(member.access)})`}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );

  // Reset saat modal ditutup.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected([]);
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;

    const keyword = query.trim();
    if (keyword.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const requestId = ++requestIdRef.current;

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
        failed.push(`${item.user.name}: ${errorMessage(err, "gagal")}`);
      }
    }

    setSelected([]);
    setQuery("");
    setResults([]);

    // Ringkasan jujur: sukses sebagian tidak boleh dilaporkan sebagai sukses penuh.
    if (failed.length === 0) {
      toast.success(`${successCount} orang berhasil diberi akses.`);
    } else if (successCount === 0) {
      toast.error(`Gagal memberi akses. ${failed.join("; ")}`);
    } else {
      toast.info(
        `${successCount} berhasil, ${failed.length} gagal — ${failed.join("; ")}`,
      );
    }
  };

  const handleChangeAccess = async (userId: string, access: WorkspaceAccessLevel) => {
    setBusyId(userId);
    try {
      await updateAccess.mutateAsync({ userId, access });
      toast.success("Level akses diperbarui.");
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengubah level akses."));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    setBusyId(userId);
    try {
      await removeMember.mutateAsync(userId);
      toast.success(`Akses ${name} dicabut.`);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mencabut akses."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[92dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-theme-xl dark:bg-slate-900 sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Share Workspace
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Bagikan workspace <span className="font-medium">{workspace.name}</span> ke siapa pun di sistem (termasuk lintas divisi) dan atur level aksesnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </header>

        {/* TAMBAH ANGGOTA */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tambah orang
          </p>

          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau email (semua divisi)..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            {searching ? (
              <Loader2
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
              />
            ) : null}
          </div>

          <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
            Menampilkan user dari semua divisi. Yang belum tergabung di divisi mana pun
            perlu didaftarkan super admin lebih dulu.
          </p>

          {query.trim().length >= 2 && !searching && results.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Tidak ada orang yang cocok (atau sudah punya akses ke workspace ini).
            </p>
          ) : null}

          {results.length > 0 ? (
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleSelect(user)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-100">
                      {user.name}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {user.email}
                      {user.division_names?.length
                        ? ` · ${user.division_names.join(", ")}`
                        : ""}
                    </span>
                  </span>
                  <UserPlus size={15} className="shrink-0 text-blue-500" />
                </button>
              ))}
            </div>
          ) : null}

          {selected.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Akan diberi akses ({selected.length})
              </p>
              {selected.map((item) => (
                <div
                  key={item.user.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.user)}
                      aria-label={`Batalkan ${item.user.name}`}
                      className="rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <X size={14} />
                    </button>
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {item.user.name}
                    </span>
                  </div>

                  <div className="w-full sm:w-auto">
                    <select
                      value={item.access}
                      onChange={(event) =>
                        setSelectedAccess(
                          item.user.id,
                          event.target.value as WorkspaceAccessLevel,
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:w-auto"
                    >
                      {ACCESS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-400">
                      {ACCESS_OPTIONS.find((option) => option.value === item.access)?.hint}
                    </p>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={addMember.isPending}
                className="h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {addMember.isPending ? "Menyimpan..." : "Beri akses"}
              </button>
            </div>
          ) : null}
        </div>

        {/* DAFTAR ANGGOTA */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Dibagikan langsung ({manualMembers.length})
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Memuat daftar...
            </div>
          ) : manualMembers.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Workspace ini belum dibagikan langsung ke siapa pun.
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
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>
                  {showAuto ? "Sembunyikan" : "Tampilkan"} {autoMembers.length} anggota otomatis
                  <span className="ml-1 font-normal text-slate-400">
                    (via campaign/task · akses tetap berlaku)
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 transition-transform ${showAuto ? "rotate-180" : ""}`}
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
