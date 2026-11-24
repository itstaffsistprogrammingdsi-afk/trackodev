import { useState } from "react";
import { AlertCircle, Building2, Loader2, X } from "lucide-react";

import { useCreateDivision } from "../hooks/useDivisions";
import {
  useDivisionAdminCandidates,
  useDivisionUsers,
} from "@/features/user/hooks/useUsers";
import UserPicker from "./UserPicker";
import type { User } from "@/features/user/types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateDivisionModal({ open, onClose }: Props) {
  const { t } = useLanguage();
  const createMutation = useCreateDivision();
  const { data: adminCandidates = [] } = useDivisionAdminCandidates(open);
  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useDivisionUsers(open);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAdmins, setSelectedAdmins] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const adminUsers = adminCandidates.filter((user) =>
    user.roles?.some((role) => role.toLowerCase() === "admin"),
  );

  const availableMembers = users.filter(
    (user) => !selectedAdmins.some((admin) => admin.id === user.id),
  );

  const addAdmin = (user: User) => {
    setSelectedAdmins((prev) =>
      prev.some((item) => item.id === user.id) ? prev : [...prev, user],
    );

    setSelectedMembers((prev) => prev.filter((item) => item.id !== user.id));
  };

  const removeAdmin = (userId: string) => {
    setSelectedAdmins((prev) => prev.filter((user) => user.id !== userId));
  };

  const addMember = (user: User) => {
    if (selectedAdmins.some((admin) => admin.id === user.id)) return;

    setSelectedMembers((prev) =>
      prev.some((item) => item.id === user.id) ? prev : [...prev, user],
    );
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((user) => user.id !== userId));
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
  };

  const submit = async () => {
    setError(null);

    if (!name.trim()) {
      setError(t("Nama divisi wajib diisi.", "Division name is required."));
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        code: code || undefined,
        description: description.trim() || undefined,
        admin_ids: selectedAdmins.map((user) => user.id),
        member_ids: selectedMembers.map((user) => user.id),
      });

      setName("");
      setCode("");
      setDescription("");
      setSelectedAdmins([]);
      setSelectedMembers([]);
      onClose();
    } catch (mutationError) {
      const message = (
        mutationError as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setError(
        message ??
          t(
            "Divisi belum dapat dibuat. Coba lagi.",
            "The division could not be created. Try again.",
          ),
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-division-title"
        onClick={(event) => event.stopPropagation()}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-e3 sm:rounded-panel"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Building2 aria-hidden="true" className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <h2
                id="create-division-title"
                className="truncate text-base font-semibold tracking-heading text-fg"
              >
                {t("Divisi baru", "New division")}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-fg-muted">
                {t(
                  "Buat divisi dan tetapkan admin serta anggotanya.",
                  "Create a division and assign its admins and members.",
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            aria-label={t("Tutup", "Close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="create-division-name"
                className="block text-xs font-medium text-fg-muted"
              >
                {t("Nama divisi", "Division name")}
              </label>
              <input
                id="create-division-name"
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder={t(
                  "Contoh: Digital Marketing",
                  "e.g. Digital Marketing",
                )}
                className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-division-code"
                className="block text-xs font-medium text-fg-muted"
              >
                {t("Kode divisi", "Division code")}
              </label>
              <input
                id="create-division-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setError(null);
                }}
                maxLength={10}
                placeholder={t("Contoh: DM", "e.g. DM")}
                className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm uppercase text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:normal-case placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="create-division-description"
              className="block text-xs font-medium text-fg-muted"
            >
              {t("Deskripsi", "Description")}
            </label>
            <textarea
              id="create-division-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t(
                "Tujuan atau cakupan divisi ini (opsional)",
                "Purpose or scope of this division (optional)",
              )}
              className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>

          {isUsersLoading ? (
            <div className="rounded-panel border border-line bg-surface-muted/40 px-4 py-8 text-center text-sm text-fg-muted">
              {t("Memuat kandidat anggota…", "Loading member candidates…")}
            </div>
          ) : isUsersError ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-panel border border-danger/20 bg-danger-soft px-4 py-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex items-center gap-2">
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                {t(
                  "Kandidat anggota gagal dimuat.",
                  "Failed to load member candidates.",
                )}
              </span>
              <button
                type="button"
                onClick={() => void refetchUsers()}
                className="h-8 shrink-0 rounded-control border border-danger/25 bg-surface px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                {t("Coba lagi", "Try again")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <UserPicker
                title={t("Admin divisi", "Division admins")}
                users={adminUsers}
                selectedUsers={selectedAdmins}
                onAdd={addAdmin}
                onRemove={removeAdmin}
                placeholder={t("Cari admin", "Search admins")}
              />

              <UserPicker
                title={t("Anggota divisi", "Division members")}
                users={availableMembers}
                selectedUsers={selectedMembers}
                onAdd={addMember}
                onRemove={removeMember}
                placeholder={t("Cari anggota", "Search members")}
              />
            </div>
          )}

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs leading-5 text-danger"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("Batal", "Cancel")}
          </button>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={createMutation.isPending}
            aria-busy={createMutation.isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                />
                {t("Membuat divisi", "Creating division")}
              </>
            ) : (
              t("Buat divisi", "Create division")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
