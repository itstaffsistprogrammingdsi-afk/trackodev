import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Building2, Loader2, X } from "lucide-react";

import { Division } from "../../types";
import { useUpdateDivision } from "../../hooks/useDivisions";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  open: boolean;
  onClose: () => void;
  division: Division;
};

export default function EditDivisionModal({ open, onClose, division }: Props) {
  const { t } = useLanguage();
  const updateMutation = useUpdateDivision();

  const [name, setName] = useState(division.name);
  const [code, setCode] = useState(division.code || "");
  const [description, setDescription] = useState(division.description || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(division.name);
    setCode(division.code || "");
    setDescription(division.description || "");
    setError(null);
  }, [open, division]);

  if (!open) return null;

  const handleClose = () => {
    if (updateMutation.isPending) return;
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("Nama divisi wajib diisi.", "Division name is required."));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: division.id,
        data: { name: name.trim(), code, description: description.trim() },
      });
      onClose();
    } catch (mutationError) {
      const message = (
        mutationError as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setError(
        message ??
          t(
            "Perubahan belum dapat disimpan. Coba lagi.",
            "Changes could not be saved. Try again.",
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
        aria-labelledby="edit-division-title"
        onClick={(event) => event.stopPropagation()}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-panel border border-line bg-surface p-5 shadow-e3 sm:rounded-panel"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Building2 aria-hidden="true" className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <h2
                id="edit-division-title"
                className="truncate text-base font-semibold tracking-heading text-fg"
              >
                {t("Edit divisi", "Edit division")}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-fg-muted">
                {t(
                  "Perbarui nama dan kode divisi.",
                  "Update the division name and code.",
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={updateMutation.isPending}
            aria-label={t("Tutup", "Close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="edit-division-name"
              className="block text-xs font-medium text-fg-muted"
            >
              {t("Nama divisi", "Division name")}
            </label>
            <input
              id="edit-division-name"
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-division-code"
              className="block text-xs font-medium text-fg-muted"
            >
              {t("Kode divisi", "Division code")}
            </label>
            <input
              id="edit-division-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError(null);
              }}
              maxLength={10}
              placeholder={t("Contoh: DKV", "e.g. DKV")}
              className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm uppercase text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:normal-case placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-division-description"
              className="block text-xs font-medium text-fg-muted"
            >
              {t("Deskripsi", "Description")}
            </label>
            <textarea
              id="edit-division-description"
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

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={updateMutation.isPending}
              className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("Batal", "Cancel")}
            </button>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              aria-busy={updateMutation.isPending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  />
                  {t("Menyimpan", "Saving")}
                </>
              ) : (
                t("Simpan perubahan", "Save changes")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
