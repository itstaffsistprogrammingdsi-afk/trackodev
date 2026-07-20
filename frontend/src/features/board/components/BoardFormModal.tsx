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
  { value: "#6366f1", label: "Indigo" },
  { value: "#2563eb", label: "Blue" },
  { value: "#059669", label: "Emerald" },
  { value: "#d97706", label: "Amber" },
  { value: "#e11d48", label: "Rose" },
  { value: "#4b5563", label: "Gray" },
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
    defaultValues: { name: "", color: COLOR_OPTIONS[0].value },
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
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl">
        {/* header */}
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? "Edit Column" : "Create Column"}
          </h2>
          <p className="text-xs text-gray-400">
            {isEdit
              ? "Update nama atau warna column ini"
              : "Add a new board column to this campaign"}
          </p>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Column name
            </label>

            <input
              {...register("name", {
                required: "Nama column wajib diisi.",
                maxLength: {
                  value: 255,
                  message: "Nama column maksimal 255 karakter.",
                },
              })}
              placeholder="e.g. To Do, In Progress"
              autoFocus
              className={`w-full rounded-xl border px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${
                errors.name ? "border-red-300" : "border-gray-200"
              }`}
            />

            {errors.name && (
              <p className="text-[11px] text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Color</label>

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
                      aria-pressed={field.value === option.value}
                      className={`h-7 w-7 rounded-full transition ${
                        field.value === option.value
                          ? "ring-2 ring-gray-900 ring-offset-2"
                          : "hover:opacity-80"
                      }`}
                      style={{ backgroundColor: option.value }}
                    />
                  ))}
                </div>
              )}
            />
          </div>

          {mutation.isError && (
            <p className="text-[11px] text-red-500">
              {isEdit
                ? "Gagal mengupdate column. Coba lagi."
                : "Gagal membuat column. Coba lagi."}
            </p>
          )}

          {/* footer actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
