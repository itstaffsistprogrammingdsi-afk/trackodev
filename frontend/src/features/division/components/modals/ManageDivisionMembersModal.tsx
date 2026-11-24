import { Users, X } from "lucide-react";

import DivisionMembers from "../members/DivisionMembers";
import type { Division } from "../../types";

type Props = {
  open: boolean;
  division: Division | null;
  onClose: () => void;
};

export default function ManageDivisionMembersModal({
  open,
  division,
  onClose,
}: Props) {
  if (!open || !division) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-members-title"
        onClick={(event) => event.stopPropagation()}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-e3 sm:rounded-panel"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Users aria-hidden="true" className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <h2
                id="manage-members-title"
                className="truncate text-base font-semibold tracking-heading text-fg"
              >
                Kelola anggota divisi
              </h2>
              <p className="mt-0.5 truncate text-xs leading-5 text-fg-muted">
                {division.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <DivisionMembers divisionId={division.id} />
        </div>

        <div className="flex justify-end border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
