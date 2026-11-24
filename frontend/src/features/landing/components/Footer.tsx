import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-line bg-canvas px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center text-2xs text-fg-subtle sm:flex-row sm:text-left">
        <p>
          &copy; {new Date().getFullYear()} Tracko.{" "}
          {t("Seluruh hak dilindungi.", "All rights reserved.")}
        </p>
        <p>{t("Ruang kerja tim operasional.", "Operational team workspace.")}</p>
      </div>
    </footer>
  );
}
