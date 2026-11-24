import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  /** Nama dialog untuk pembaca layar bila tidak memakai aria-labelledby. */
  ariaLabel?: string;
  /** ID heading di dalam modal, mis. "workspace-modal-title". */
  ariaLabelledBy?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  ariaLabel = "Dialog",
  ariaLabelledBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const modal = modalRef.current;
      if (!modal) return;

      const preferredFocus = modal.querySelector<HTMLElement>(
        "[autofocus], input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      const firstFocusable =
        preferredFocus ?? modal.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? modal).focus();
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "h-full w-full"
    : "relative max-h-[100dvh] w-full overflow-y-auto overscroll-contain rounded-t-modal border border-line bg-surface shadow-e3 sm:max-h-[calc(100dvh-2rem)] sm:rounded-modal";

  return (
    <div className="modal fixed inset-0 z-99999 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-overlay backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        style={{ animation: "ui-scale-in 160ms ease-out" }}
        className={`${contentClasses} ${className ?? ""} focus:outline-none`}
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Tutup dialog", "Close dialog")}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:right-4 sm:top-4"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
