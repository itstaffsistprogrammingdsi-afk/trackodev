import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, FolderKanban, Loader2 } from "lucide-react";

import { useCreateWorkspace, useUpdateWorkspace } from "../hooks/useWorkspaces";
import { Workspace } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  divisionId: string;
  /** Pass a workspace to open the modal in edit mode, or null/undefined for create mode */
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

  // Reset the form every time the modal opens, prefilling data in edit mode
  useEffect(() => {
    if (open) {
      reset({
        name: workspace?.name ?? "",
        description: workspace?.description ?? "",
      });
    }
  }, [open, workspace, reset]);

  if (!open) return null;

  const onSubmit = (data: FormData) => {
    if (isEditMode && workspace) {
      updateMutation.mutate(
        { id: workspace.id, payload: data },
        { onSuccess: () => onClose() }
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
    ? mutation.error.response?.data?.message ??
      "Terjadi kesalahan. Silakan coba lagi."
    : null;

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 backdrop-blur-sm p-4
      "
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-md max-h-[90vh] overflow-y-auto
          rounded-2xl bg-white dark:bg-slate-900 shadow-2xl
          border border-slate-200 dark:border-slate-800
        "
      >
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
              <FolderKanban size={20} className="text-blue-600" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {isEditMode ? "Edit Workspace" : "Create Workspace"}
              </h2>
              <p className="text-sm text-slate-500 truncate">
                {isEditMode
                  ? "Perbarui informasi workspace"
                  : "Buat workspace baru"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Workspace Name
            </label>

            <input
              {...register("name", {
                required: "Workspace name is required",
                maxLength: { value: 255, message: "Maximum 255 characters" },
              })}
              placeholder="Marketing Workspace"
              className="
                w-full rounded-xl border border-slate-300 dark:border-slate-700
                bg-white dark:bg-slate-950 px-4 py-3 outline-none
                focus:ring-2 focus:ring-blue-500
              "
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Description
            </label>

            <textarea
              rows={4}
              {...register("description")}
              placeholder="Workspace description..."
              className="
                w-full rounded-xl border border-slate-300 dark:border-slate-700
                bg-white dark:bg-slate-950 px-4 py-3 outline-none resize-none
                focus:ring-2 focus:ring-blue-500
              "
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* FOOTER */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="
                px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700
                hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="
                inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl
                bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50
              "
            >
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {mutation.isPending
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                ? "Save Changes"
                : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
