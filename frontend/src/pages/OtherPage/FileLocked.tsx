import { ArrowLeft, Home, Languages, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router";

import PageMeta from "@/components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function FileLocked() {
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <>
      <PageMeta
        title={t("Dokumen terkunci — Tracko", "Document locked — Tracko")}
        description={t(
          "Masa akses dokumen PDF ini sudah berakhir.",
          "The access period for this PDF document has ended.",
        )}
      />

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-accent-soft/50 to-transparent"
        />

        <div className="relative w-full max-w-lg">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center" aria-label="Tracko">
              <img
                src="/images/logo/logof.svg"
                alt="Tracko"
                className="h-7 w-auto object-contain"
              />
            </Link>

            <button
              type="button"
              onClick={toggleLanguage}
              title={t("Ganti bahasa", "Switch language")}
              aria-label={t("Ganti bahasa", "Switch language")}
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-2xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Languages size={13} aria-hidden="true" />
              <span className="uppercase">{language}</span>
            </button>
          </div>

          <div className="rounded-panel border border-line bg-surface p-6 shadow-e2 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-panel bg-danger-soft text-danger">
              <LockKeyhole size={22} aria-hidden="true" />
            </span>

            <p className="mt-5 text-xs font-medium text-fg-subtle">
              {t("Keamanan dokumen", "Document security")}
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-heading text-fg">
              {t("Dokumen sudah dikunci", "This document is locked")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-fg-muted">
              {t(
                "File PDF ini diunggah lebih dari 1 bulan lalu. Sesuai kebijakan perlindungan dokumen, tautan ini sudah tidak dapat dibuka.",
                "This PDF was uploaded more than 1 month ago. Under our document protection policy, this link can no longer be opened.",
              )}
            </p>

            <div className="mt-5 flex items-start gap-2.5 rounded-card border border-line bg-surface-muted/60 p-3.5">
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-success"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-fg-muted">
                {t(
                  "Batasan ini menjaga dokumen penting tetap aman. Untuk akses khusus, hubungi admin Tracko.",
                  "This limit keeps important documents secure. For special access, contact a Tracko admin.",
                )}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                {t("Kembali", "Back")}
              </button>

              <Link
                to="/"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Home size={14} aria-hidden="true" />
                {t("Ke beranda", "Go home")}
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-2xs text-fg-subtle">
            &copy; {new Date().getFullYear()} Tracko
          </p>
        </div>
      </div>
    </>
  );
}
