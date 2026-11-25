import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import DivisionActivitySection from "../components/DivisionActivitySection";
import { useDivision } from "../hooks/useDivisions";
import { useLanguage } from "@/context/LanguageContext";

export default function DivisionActivityPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: division, isLoading, isError } = useDivision(id);

  if (isLoading) {
    return (
      <div className="w-full space-y-6" role="status" aria-busy="true">
        <span className="sr-only">
          {t("Memuat detail divisi", "Loading division details")}
        </span>
        <div className="h-32 animate-pulse rounded-panel bg-surface-muted motion-reduce:animate-none" />
        <div className="h-[30rem] animate-pulse rounded-panel bg-surface-muted motion-reduce:animate-none" />
      </div>
    );
  }

  if (isError || !division) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Building2 size={22} aria-hidden="true" />
        </span>
        <h1 className="text-base font-semibold tracking-heading text-fg">
          {t("Detail divisi tidak tersedia", "Division details unavailable")}
        </h1>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">
          {t(
            "Divisi mungkin sudah dihapus atau Anda tidak memiliki akses ke halaman ini.",
            "The division may have been deleted or you do not have access to this page.",
          )}
        </p>
        <button
          type="button"
          onClick={() => navigate("/divisions")}
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {t("Kembali ke daftar divisi", "Back to divisions")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <header className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <button
          type="button"
          onClick={() => navigate(`/divisions/${division.id}`)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t("Kembali ke workspace divisi", "Back to division workspace")}
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Building2 size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5 text-2xs font-medium text-fg-subtle">
                <span>{t("Divisi", "Division")}</span>
                <span aria-hidden="true">/</span>
                <span>{t("Audit aktivitas", "Activity audit")}</span>
              </div>
              <h1 className="truncate text-[26px] font-semibold leading-tight tracking-heading text-fg sm:text-[28px]">
                {division.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-muted">
                {division.description ||
                  t(
                    "Pantau seluruh perubahan dan aktivitas penting pada divisi ini.",
                    "Track all changes and important activity in this division.",
                  )}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-2xs font-medium text-success">
            <ShieldCheck size={13} aria-hidden="true" />
            {t("Audit log aktif", "Audit log active")}
          </span>
        </div>
      </header>

      <DivisionActivitySection divisionId={division.id} />
    </div>
  );
}
