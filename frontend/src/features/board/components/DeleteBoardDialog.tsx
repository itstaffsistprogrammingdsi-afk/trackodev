import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useDeleteBoard } from "../hooks/useBoards";
import { Board } from "../types";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  board: Board | null;
  campaignId: string;
  onClose: () => void;
};

export default function DeleteBoardDialog({ board, campaignId, onClose }: Props) {
  const { t } = useLanguage();
  const mutation = useDeleteBoard(campaignId);

  useEffect(() => {
    if (!board) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mutation.isPending) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [board, onClose, mutation.isPending]);

  if (!board) return null;

  const cardCount = board.cards.length;

  const handleConfirm = (): void => {
    mutation.mutate(board.id, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-board-title"
        onClick={(event) => event.stopPropagation()}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="w-full max-w-sm rounded-panel border border-line bg-surface p-5 shadow-e3"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2
              id="delete-board-title"
              className="text-base font-semibold tracking-heading text-fg"
            >
              {t("Hapus kolom “{name}”?", "Delete column “{name}”?", {
                name: board.name,
              })}
            </h2>
            <p className="mt-1 text-sm leading-5 text-fg-muted">
              {cardCount > 0
                ? t(
                    "Kolom ini punya {count} task. Semua task di dalamnya ikut terhapus dan tidak bisa dikembalikan.",
                    "This column has {count} tasks. Everything inside it will be deleted too and cannot be restored.",
                    { count: cardCount },
                  )
                : t(
                    "Tindakan ini tidak bisa dibatalkan.",
                    "This action cannot be undone.",
                  )}
            </p>
          </div>
        </div>

        {mutation.isError ? (
          <p role="alert" className="mt-3 text-xs font-medium text-danger">
            {t(
              "Kolom gagal dihapus. Coba lagi.",
              "Failed to delete the column. Try again.",
            )}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-60"
          >
            {t("Batal", "Cancel")}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-danger px-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-60 dark:text-[#2a1110]"
          >
            {mutation.isPending ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                />
                {t("Menghapus", "Deleting")}
              </>
            ) : (
              t("Hapus kolom", "Delete column")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
