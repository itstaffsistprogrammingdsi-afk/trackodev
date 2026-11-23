import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import { useCreateBoard, useUpdateBoard } from "../hooks/useBoards";
import { Board } from "../types";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  board?: Board | null;
  onClose: () => void;
  campaignId: string;
};

type FormData = {
  name: string;
  color: string;
};

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "#f59e0b", label: "Amber" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#10b981", label: "Emerald" },
  { value: "#e11d48", label: "Rose" },
  { value: "#6b7280", label: "Gray" },
];

export default function BoardFormModal({
  open,
  mode,
  board,
  onClose,
  campaignId,
}: Props) {
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { name: "", color: "#6366f1" },
  });

  const createMutation = useCreateBoard(campaignId);
  const updateMutation = useUpdateBoard(campaignId);

  const mutation = isEdit ? updateMutation : createMutation;

  // Re-seed the form every time the modal opens: edit mode prefills
  // from the board being edited, create mode always starts blank.
  // Without this, reopening in edit mode after a previous edit (or
  // switching between boards) would keep showing stale values.
  useEffect(() => {
    if (!open) return;

    if (isEdit && board) {
      reset({ name: board.name, color: board.color ?? COLOR_OPTIONS[0].value });
    } else {
      reset({ name: "", color: COLOR_OPTIONS[0].value });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, board?.id]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = (data: FormData) => {
    if (isEdit && board) {
      updateMutation.mutate(
        { id: board.id, payload: data },
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

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-overlay"
        onClick={handleClose}
      />

      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-form-title"
        className="relative w-full max-w-md rounded-modal border border-line bg-surface shadow-e3"
      >
        {/* header */}
        <div className="border-b border-line px-5 py-4">
          <h2 id="board-form-title" className="text-sm font-semibold text-fg">
            {isEdit ? "Edit kolom" : "Buat kolom"}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {isEdit
              ? "Perbarui nama atau warna kolom ini."
              : "Tambahkan kolom baru ke board campaign ini."}
          </p>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <label htmlFor="board-name" className="text-xs font-medium text-fg-muted">
              Nama kolom
            </label>

            <input
              id="board-name"
              {...register("name", {
                required: "Nama kolom wajib diisi.",
                maxLength: {
                  value: 255,
                  message: "Nama kolom maksimal 255 karakter.",
                },
              })}
              placeholder="Contoh: To do, In progress"
              autoFocus
              aria-invalid={errors.name ? "true" : "false"}
              className={`h-10 w-full rounded-control border bg-surface px-3 text-sm text-fg outline-none transition-colors focus:ring-2 ${
                errors.name
                  ? "border-danger/40 focus:border-danger/50 focus:ring-danger/15"
                  : "border-line focus:border-accent/40 focus:ring-accent/15"
              }`}
            />

            {errors.name && (
              <p role="alert" className="text-[11px] font-medium text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-fg-muted">Warna</span>

            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      title={option.label}
                      onClick={() => field.onChange(option.value)}
                      aria-label={option.label}
                      aria-pressed={field.value === option.value}
                      className={`h-7 w-7 rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 ${
                        field.value === option.value
                          ? "ring-2 ring-fg ring-offset-2"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: option.value }}
                    />
                  ))}
                </div>
              )}
            />
          </div>

          {mutation.isError && (
            <p role="alert" className="text-[11px] font-medium text-danger">
              {isEdit
                ? "Gagal memperbarui kolom. Coba lagi."
                : "Gagal membuat kolom. Coba lagi."}
            </p>
          )}

          {/* footer actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 rounded-control px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-9 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending
                ? isEdit
                  ? "Menyimpan..."
                  : "Membuat..."
                : isEdit
                  ? "Simpan perubahan"
                  : "Buat kolom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
