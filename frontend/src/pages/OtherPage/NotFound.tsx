import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import PageMeta from "../../components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <>
      <PageMeta
        title={t("Halaman tidak ditemukan · Tracko", "Page not found · Tracko")}
        description={t(
          "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
          "The page you are looking for is unavailable or has been moved.",
        )}
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas p-6">
        <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 text-center shadow-e1">
          <span className="text-2xs font-medium tabular-nums text-fg-subtle">
            {t("Error 404")}
          </span>

          <h1 className="mt-2 text-2xl font-semibold tracking-heading text-fg">
            {t("Halaman tidak ditemukan", "Page not found")}
          </h1>

          <p className="mt-2 text-sm leading-6 text-fg-muted">
            {t(
              "Alamat ini tidak tersedia, sudah dipindahkan, atau Anda tidak memiliki akses ke halaman tersebut.",
              "This address is unavailable, has been moved, or you do not have access to that page.",
            )}
          </p>

          <Link
            to="/"
            className="mt-6 inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t("Kembali ke beranda", "Back to home")}
          </Link>
        </div>

        <p className="mt-6 text-2xs text-fg-subtle">
          &copy; {new Date().getFullYear()} Tracko
        </p>
      </div>
    </>
  );
}
