import { useEffect } from "react";

import { useDeleteBoard } from "../hooks/useBoards";
import { Board } from "../types";

type Props = {
  board: Board | null;
  campaignId: string;
  onClose: () => void;
};

export default function DeleteBoardDialog({
  board,
  campaignId,
  onClose,
}: Props) {
  const mutation = useDeleteBoard(campaignId);

  useEffect(() => {
    if (!board) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [board, onClose]);

  if (!board) return null;

  const cardCount = board.cards.length;

  const handleConfirm = (): void => {
    mutation.mutate(board.id, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86l-8.2 14.2A1.5 1.5 0 003.32 20h17.36a1.5 1.5 0 001.23-2.36l-8.2-14.2a1.5 1.5 0 00-2.42 0z"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Delete &ldquo;{board.name}&rdquo;?
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {cardCount > 0
                  ? `Column ini punya ${cardCount} task. Semua task di dalamnya akan ikut terhapus dan tidak bisa dikembalikan.`
                  : "Aksi ini tidak bisa dibatalkan."}
              </p>
            </div>
          </div>

          {mutation.isError && (
            <p className="mt-3 text-[11px] text-red-500">
              Gagal menghapus column. Coba lagi.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Deleting..." : "Delete Column"}
          </button>
        </div>
      </div>
    </div>
  );
}
