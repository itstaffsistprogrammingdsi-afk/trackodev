import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, FolderKanban, Loader2, X } from "lucide-react";

import { useCreateWorkspace, useUpdateWorkspace } from "../hooks/useWorkspaces";
import { Workspace } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  divisionId: string;
  workspace?: Workspace | null;
};

type FormData = {
  name: string;
  description?: string;
};

export default function WorkspaceModal({
  open,
  onClose,
  divisionId,
  workspace = null,
}: Props) {
  const isEditMode = Boolean(workspace);

  const createMutation = useCreateWorkspace(divisionId);
  const updateMutation = useUpdateWorkspace(divisionId);
  const mutation = isEditMode ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: workspace?.name ?? "",
        description: workspace?.description ?? "",
      });
    }
  }, [open, workspace, reset]);

  if (!open) return null;

  const handleClose = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const onSubmit = (data: FormData) => {
    if (isEditMode && workspace) {
      updateMutation.mutate(
        { id: workspace.id, payload: data },
        { onSuccess: () => onClose() },
      );
      return;
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  const errorMessage = mutation.error
    ? (mutation.error.response?.data?.message ??
      "Perubahan belum dapat disimpan. Coba lagi.")
    : null;

  const title = isEditMode ? "Edit workspace" : "Workspace baru";
  const description = isEditMode
    ? "Perbarui nama dan deskripsi workspace."
    : "Kelompokkan campaign dan board dalam satu ruang kerja.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-panel border border-line bg-surface p-5 shadow-e3 sm:rounded-panel"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <FolderKanban aria-hidden="true" className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <h2
                id="workspace-modal-title"
                className="truncate text-base font-semibold tracking-heading text-fg"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-fg-muted">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="workspace-name"
              className="block text-xs font-medium text-fg-muted"
            >
              Nama workspace
            </label>
            <input
              id="workspace-name"
              autoFocus
              {...register("name", {
                required: "Nama workspace wajib diisi.",
                maxLength: {
                  value: 255,
                  message: "Nama workspace maksimal 255 karakter.",
                },
              })}
              placeholder="Contoh: Marketing Campaign"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "workspace-name-error" : undefined}
              className={`h-10 w-full rounded-control border bg-surface px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle focus:ring-4 ${
                errors.name
                  ? "border-danger focus:border-danger focus:ring-danger/15"
                  : "border-line hover:border-line-strong focus:border-accent focus:ring-accent/15"
              }`}
            />
            {errors.name ? (
              <p
                id="workspace-name-error"
                className="text-[11px] leading-4 text-danger"
              >
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="workspace-description"
              className="block text-xs font-medium text-fg-muted"
            >
              Deskripsi
            </label>
            <textarea
              id="workspace-description"
              rows={4}
              {...register("description")}
              placeholder="Tujuan atau cakupan workspace ini (opsional)"
              className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs leading-5 text-danger"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  />
                  Menyimpan
                </>
              ) : isEditMode ? (
                "Simpan perubahan"
              ) : (
                "Buat workspace"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
