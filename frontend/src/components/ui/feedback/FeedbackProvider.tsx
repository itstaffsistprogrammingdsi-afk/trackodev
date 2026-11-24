import { useSyncExternalStore } from "react";
import { AlertTriangle } from "lucide-react";

import {
  getConfirm,
  resolveConfirm,
  subscribeFeedback,
} from "@/lib/feedback";
import { useLanguage } from "@/context/LanguageContext";

function ConfirmDialog() {
  const { t } = useLanguage();
  const confirm = useSyncExternalStore(
    subscribeFeedback,
    getConfirm,
    getConfirm,
  );

  if (!confirm) return null;

  const isDanger = confirm.variant === "danger";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ui-confirm-title"
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="w-full max-w-md rounded-panel border border-line bg-surface p-5 shadow-e3"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDanger
                ? "bg-danger-soft text-danger"
                : "bg-accent-soft text-accent"
            }`}
          >
            <AlertTriangle size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <h3
              id="ui-confirm-title"
              className="text-base font-semibold tracking-heading text-fg"
            >
              {confirm.title ?? t("Konfirmasi", "Confirm")}
            </h3>

            <p className="mt-1 text-sm leading-5 text-fg-muted">
              {confirm.message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => resolveConfirm(false)}
            className="h-10 rounded-control border border-line bg-surface px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {confirm.cancelText ?? t("Batal", "Cancel")}
          </button>

          <button
            type="button"
            autoFocus
            onClick={() => resolveConfirm(true)}
            className={`h-10 rounded-control px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              isDanger
                ? "bg-danger text-white hover:opacity-90 focus-visible:ring-danger/40 dark:text-[#2a1110]"
                : "bg-accent text-accent-fg hover:bg-accent-strong focus-visible:ring-accent/40"
            }`}
          >
            {confirm.confirmText ?? t("Lanjutkan", "Continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackProvider() {
  return <ConfirmDialog />;
}
