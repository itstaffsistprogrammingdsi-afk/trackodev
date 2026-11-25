export type Language = "id" | "en";

type TranslateVars = Record<string, string | number>;

const STORAGE_KEY = "tracko:language";

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
}

let activeLanguage: Language = readStoredLanguage();

export function getActiveLanguage(): Language {
  return activeLanguage;
}

export function setActiveLanguage(next: Language): void {
  activeLanguage = next;

  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
}

export function getLocale(language: Language = activeLanguage): string {
  return language === "en" ? "en-GB" : "id-ID";
}

export function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;

  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key)
      ? String(vars[key])
      : match,
  );
}

/**
 * Terjemahan untuk kode non-React (toast, util, service).
 * Teks pertama adalah bahasa Indonesia, teks kedua bahasa Inggris.
 * Jangan pernah memakai fungsi ini untuk konten yang diinput pengguna.
 */
export function translate(
  id: string,
  en?: string,
  vars?: TranslateVars,
): string {
  const text = activeLanguage === "en" ? (en ?? id) : id;
  return interpolate(text, vars);
}

/** Simpan preferensi bahasa agar bertahan setelah reload. */
export function persistLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Preferensi bahasa tidak wajib tersimpan.
  }
}
