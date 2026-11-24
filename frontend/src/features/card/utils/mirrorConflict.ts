import { AxiosError } from "axios";
import { toast } from "@/lib/feedback";
import { translate } from "@/i18n/translate";

export const MIRROR_CONFLICT_FALLBACK =
  "Terdeteksi sedang melakukan tugas bersamaan (contoh pindah card), mohon tunggu beberapa saat lagi.";

const MIRROR_CONFLICT_FALLBACK_EN =
  "Another action is still in progress (for example moving a card). Please wait a moment and try again.";

export function isConflictError(error: unknown): boolean {
  return (
    error instanceof AxiosError && error.response?.status === 409
  );
}

export function getConflictMessage(
  error: unknown,
  fallback: string = translate(
    MIRROR_CONFLICT_FALLBACK,
    MIRROR_CONFLICT_FALLBACK_EN,
  ),
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
