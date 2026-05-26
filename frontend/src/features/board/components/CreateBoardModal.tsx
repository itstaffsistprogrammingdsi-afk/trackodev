import { useForm } from "react-hook-form";
import { useCreateBoard } from "../hooks/useBoards";

type Props = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
};

type FormData = {
  name: string;
};

export default function CreateBoardModal({
  open,
  onClose,
  campaignId,
}: Props) {
  const { register, handleSubmit, reset } = useForm<FormData>();

  const mutation = useCreateBoard(campaignId);

  if (!open) return null;

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Create Column
          </h2>
          <p className="text-xs text-gray-400">
            Add a new board column to this campaign
          </p>
        </div>

        {/* body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 px-5 py-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Column name
            </label>

            <input
              {...register("name", { required: true })}
              placeholder="e.g. To Do, In Progress"
              className="
                w-full
                rounded-xl
                border
                border-gray-200
                px-3
                py-2
                text-sm
                outline-none
                transition
                focus:border-gray-400
              "
            />
          </div>

          {/* footer actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="
                rounded-xl
                px-4
                py-2
                text-sm
                text-gray-500
                hover:bg-gray-100
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="
                rounded-xl
                bg-gray-900
                px-4
                py-2
                text-sm
                text-white
                transition
                hover:bg-black
                disabled:opacity-50
              "
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}