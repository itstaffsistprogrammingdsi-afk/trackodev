import { useSyncExternalStore } from "react";
import { AlertTriangle } from "lucide-react";

import {
  getConfirm,
  resolveConfirm,
  subscribeFeedback,
} from "@/lib/feedback";

function ConfirmDialog() {
  const confirm = useSyncExternalStore(
    subscribeFeedback,
    getConfirm,
    getConfirm,
  );

  if (!confirm) return null;

  const isDanger = confirm.variant === "danger";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ui-confirm-title"
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDanger
                ? "bg-error-50 text-error-500 dark:bg-error-950/40"
                : "bg-brand-50 text-brand-500 dark:bg-brand-950/40"
            }`}
          >
            <AlertTriangle size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <h3
              id="ui-confirm-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              {confirm.title ?? "Konfirmasi"}
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
              {confirm.message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => resolveConfirm(false)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {confirm.cancelText ?? "Batal"}
          </button>

          <button
            type="button"
            autoFocus
            onClick={() => resolveConfirm(true)}
            className={`h-10 rounded-xl px-4 text-sm font-semibold text-white transition ${
              isDanger
                ? "bg-error-500 hover:bg-error-600"
                : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {confirm.confirmText ?? "Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackProvider() {
  return <ConfirmDialog />;
}
