import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan class kondisional dan selesaikan konflik utility Tailwind.
 * Dipakai komponen kecil di `components/ui` agar varian tidak saling timpa.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
