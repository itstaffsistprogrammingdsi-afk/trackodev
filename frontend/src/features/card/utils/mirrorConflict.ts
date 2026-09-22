import { AxiosError } from "axios";
import { toast } from "@/lib/feedback";

export const MIRROR_CONFLICT_FALLBACK =
  "Terdeteksi sedang melakukan tugas bersamaan (contoh pindah card), mohon tunggu beberapa saat lagi.";

export function isConflictError(error: unknown): boolean {
  return (
    error instanceof AxiosError && error.response?.status === 409
  );
}

export function getConflictMessage(
  error: unknown,
  fallback: string = MIRROR_CONFLICT_FALLBACK,
): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

/**
 * Tampilkan popup "tugas bersamaan" untuk 409 dari mirror lintas divisi.
 * Mengembalikan true bila error adalah konflik (sudah ditangani).
 */
export function alertIfMirrorConflict(error: unknown): boolean {
  if (!isConflictError(error)) return false;

  toast.info(getConflictMessage(error));

  return true;
}
