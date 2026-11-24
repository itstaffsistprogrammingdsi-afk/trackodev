import { Link } from "react-router";
import { Languages } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { language, t, toggleLanguage } = useLanguage();

  return (
    <nav
      aria-label={t("Navigasi utama", "Main navigation")}
      className="fixed inset-x-0 top-0 z-50 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label={t("Tracko - halaman utama", "Tracko - home page")}
          className="flex min-w-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <img
            width={28}
            height={28}
            src="/images/logo/icon.svg"
            alt=""
            className="h-7 w-7 shrink-0"
          />
          <span className="truncate text-base font-semibold tracking-heading text-fg">
            Tracko
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-xs font-medium text-fg-muted md:flex">
          <a
            href="#beranda"
            className="text-accent transition-colors hover:text-accent-strong"
          >
            {t("Beranda", "Home")}
          </a>
          <a href="#formulir" className="transition-colors hover:text-fg">
            {t("Form request", "Form requests")}
          </a>
          <a href="#download-apk" className="transition-colors hover:text-fg">
            {t("Download APK")}
          </a>
          <a
            href="https://wa.me/6288806798349"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-fg"
          >
            {t("Kontak", "Contact")}
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={
              language === "id"
                ? t("Ganti ke bahasa Inggris", "Switch to English")
                : t("Ganti ke bahasa Indonesia", "Switch to Indonesian")
            }
            title={t("Ganti bahasa", "Switch language")}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Languages size={14} aria-hidden="true" />
            {language === "id" ? "ID" : "EN"}
          </button>

          <Link
            to="/signin"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-control bg-accent px-4 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {t("Masuk", "Sign in")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
