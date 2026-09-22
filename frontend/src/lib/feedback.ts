/**
 * Feedback global: toast + dialog konfirmasi.
 *
 * Toast TIDAK dibuat ulang di sini — aplikasi sudah punya `ToastProvider`
 * (`src/context/ToastContext.tsx`) yang dirender di root dan mendengarkan
 * event `tracko:toast`. Fungsi `toast.*` di file ini hanya jembatan supaya
 * kode bisa memanggilnya dengan API ringkas, termasuk dari util non-React.
 *
 * Dialog konfirmasi belum tersedia di sistem lama (hanya `window.confirm`
 * native), jadi store + provider-nya ditambahkan di sini.
 */

import {
  emitToast,
  type ToastVariant,
} from "@/context/ToastContext";

export type { ToastVariant };

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}

export interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

type Listener = () => void;

let confirmState: ConfirmState | null = null;

const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeFeedback(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getConfirm(): ConfirmState | null {
  return confirmState;
}

export const toast = {
  success: (message: string, durationMs?: number) =>
    emitToast({ message, variant: "success", durationMs }),
  error: (message: string, durationMs?: number) =>
    emitToast({ message, variant: "error", durationMs }),
  warning: (message: string, durationMs?: number) =>
    emitToast({ message, variant: "warning", durationMs }),
  info: (message: string, durationMs?: number) =>
    emitToast({ message, variant: "info", durationMs }),
};

/**
 * Pengganti `window.confirm()` yang konsisten dengan tema aplikasi.
 * Pemakaian: `if (!(await confirmDialog({ message: "..." }))) return;`
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { ...options, resolve };
    emit();
  });
}

export function resolveConfirm(value: boolean): void {
  const current = confirmState;

  confirmState = null;
  emit();

  current?.resolve(value);
}
