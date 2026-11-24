import { Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Copy,
  ExternalLink,
  FileText,
} from "lucide-react";

import type { Form } from "../../types";
import { toast } from "@/lib/feedback";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  form: Form;
  total: number;
};

export default function ResponseHeader({ form, total }: Props) {
  const { t, locale } = useLanguage();
  const publicLink = `${window.location.origin}/public/forms/${form.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success(t("Link form disalin.", "Form link copied."));
    } catch {
      toast.error(t("Gagal menyalin link.", "Failed to copy link."));
    }
  };

  return (
    <div className="space-y-4">
      <Link
        to="/forms"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t("Semua form", "All forms")}
      </Link>

      <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-muted">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-[-0.02em] text-fg">
                  {t("Respons", "Responses")}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    form.is_active
                      ? "bg-success-soft text-success"
                      : "bg-surface-muted text-fg-muted"
                  }`}
                >
                  {form.is_active ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <CircleSlash className="h-3 w-3" aria-hidden="true" />
                  )}
                  {form.is_active ? t("Aktif", "Active") : t("Nonaktif", "Inactive")}
                </span>
              </div>

              <p className="mt-1 truncate text-sm font-medium text-fg">
                {form.name}
              </p>
              <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs leading-5 text-fg-muted">
                {form.description ||
                  t("Form ini belum memiliki deskripsi.", "This form has no description yet.")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-xs font-medium tabular-nums text-fg-muted">
              {t("{count} respons", "{count} responses", {
                count: total.toLocaleString(locale),
              })}
            </span>

            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Salin link", "Copy link")}
            </button>

            <a
              href={publicLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Buka form", "Open form")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
