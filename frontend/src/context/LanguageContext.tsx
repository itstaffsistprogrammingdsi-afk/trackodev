import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getActiveLanguage,
  getLocale,
  persistLanguage,
  setActiveLanguage,
  translate,
  type Language,
} from "@/i18n/translate";

type TranslateVars = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  /** Locale untuk Intl (tanggal, angka). */
  locale: string;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  /**
   * Teks UI saja. Jangan pernah membungkus input pengguna dengan fungsi ini.
   * Argumen kedua opsional bila teks Indonesia dan Inggris identik.
   */
  t: (id: string, en?: string, vars?: TranslateVars) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getActiveLanguage);

  useEffect(() => {
    setActiveLanguage(language);
    persistLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setActiveLanguage(next);
    persistLanguage(next);
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const next = current === "id" ? "en" : "id";
      setActiveLanguage(next);
      persistLanguage(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (id: string, en?: string, vars?: TranslateVars) => translate(id, en, vars),
    [],
  );

  const value = useMemo(
    () => ({
      language,
      locale: getLocale(language),
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
