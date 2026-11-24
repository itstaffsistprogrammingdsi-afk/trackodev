import { ClipboardList, ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { useLanguage } from "@/context/LanguageContext";
import type { FormItem } from "../types";

interface FormListProps {
  forms: FormItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function FormList({
  forms,
  isLoading,
  error,
  onRetry,
}: FormListProps) {
  const { t } = useLanguage();

  return (
    <section id="formulir" className="scroll-mt-24 bg-canvas py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-heading text-fg sm:text-3xl">
            {t("Pusat permintaan layanan", "Service request center")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-fg-muted sm:text-base">
            {t(
              "Butuh bantuan atau ingin mengajukan permintaan baru? Pilih kategori formulir di bawah ini agar kebutuhan Anda dapat diproses lebih cepat.",
              "Need help or want to submit a new request? Choose a form category below so your request can be processed faster.",
            )}
          </p>
        </div>

        {isLoading ? (
          <div
            aria-label={t("Memuat formulir", "Loading forms")}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3].map((number) => (
              <div
                key={number}
                className="h-48 animate-pulse rounded-panel border border-line bg-surface motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-panel border border-danger/20 bg-danger-soft p-5 text-center sm:p-6"
          >
            <p className="text-sm font-medium text-danger">
              {t("Formulir belum dapat dimuat.", "Forms could not be loaded.")}
            </p>
            <p className="mt-1 text-xs text-danger/90">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 h-9 rounded-control bg-danger px-4 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("Coba lagi", "Try again")}
            </button>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.length > 0 ? (
              forms.map((form) => (
                <Link
                  key={form.id}
                  to={`/public/forms/${form.slug}`}
                  className="group flex min-h-48 flex-col rounded-panel border border-line bg-surface p-5 transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-e2 active:translate-y-0"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                    <ClipboardList size={17} aria-hidden="true" />
                  </span>

                  <h3 className="mt-4 text-sm font-semibold tracking-heading text-fg">
                    {form.name}
                  </h3>

                  <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-fg-muted">
                    {form.description ||
                      t(
                        "Klik untuk memulai pengisian formulir permintaan layanan ini.",
                        "Click to start filling in this service request form.",
                      )}
                  </p>

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-medium text-accent">
                    {t("Isi formulir", "Fill in form")}
                    <ArrowRight
                      size={13}
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-panel border border-dashed border-line bg-surface p-10 text-center text-sm text-fg-muted sm:col-span-2 lg:col-span-3">
                {t(
                  "Belum ada formulir yang aktif saat ini.",
                  "No active forms at the moment.",
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
