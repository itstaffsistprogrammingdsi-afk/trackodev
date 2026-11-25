import { useMemo, useState } from "react";
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

const PREVIEW_COUNT = 6;

type DivisionGroup = {
  key: string;
  label: string;
  forms: FormItem[];
};

function chipClass(active: boolean): string {
  return `inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors ${
    active
      ? "border-accent/40 bg-accent-soft text-accent"
      : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"
  }`;
}

export default function FormList({
  forms,
  isLoading,
  error,
  onRetry,
}: FormListProps) {
  const { t } = useLanguage();

  const [divisionFilter, setDivisionFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const divisionGroups = useMemo<DivisionGroup[]>(() => {
    const groups = new Map<string, DivisionGroup>();

    for (const form of forms) {
      const key = form.division_id ?? "";
      let group = groups.get(key);

      if (!group) {
        group = {
          key,
          label: form.division?.name ?? t("Umum", "General"),
          forms: [],
        };
        groups.set(key, group);
      }

      group.forms.push(form);
    }

    return [...groups.values()].sort((a, b) => {
      if (a.key === "") return -1;
      if (b.key === "") return 1;
      return a.label.localeCompare(b.label);
    });
  }, [forms, t]);

  const visibleGroups = useMemo(
    () =>
      divisionFilter === "all"
        ? divisionGroups
        : divisionGroups.filter((group) => group.key === divisionFilter),
    [divisionGroups, divisionFilter],
  );

  return (
    <section id="formulir" className="scroll-mt-24 bg-canvas py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
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
          <>
            {forms.length > 0 ? (
              <div
                role="group"
                aria-label={t("Filter divisi", "Filter by division")}
                className="mb-8 flex flex-wrap items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={() => setDivisionFilter("all")}
                  aria-pressed={divisionFilter === "all"}
                  className={chipClass(divisionFilter === "all")}
                >
                  {t("Semua divisi", "All divisions")}
                  <span className="tabular-nums text-[10px] opacity-80">
                    {forms.length}
                  </span>
                </button>

                {divisionGroups.map((group) => (
                  <button
                    key={group.key || "umum"}
                    type="button"
                    onClick={() => setDivisionFilter(group.key)}
                    aria-pressed={divisionFilter === group.key}
                    className={chipClass(divisionFilter === group.key)}
                  >
                    {group.label}
                    <span className="tabular-nums text-[10px] opacity-80">
                      {group.forms.length}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {forms.length > 0 ? (
              <div className="space-y-10">
                {visibleGroups.map((group) => {
                  const expanded = expandedGroups.has(group.key);
                  const shownForms = expanded
                    ? group.forms
                    : group.forms.slice(0, PREVIEW_COUNT);

                  return (
                    <div key={group.key || "umum"}>
                      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-base font-semibold tracking-heading text-fg">
                          {group.label}
                        </h3>
                        <span className="text-xs tabular-nums text-fg-subtle">
                          {t("{count} formulir", "{count} forms", {
                            count: group.forms.length,
                          })}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {shownForms.map((form) => (
                          <Link
                            key={form.id}
                            to={`/public/forms/${form.slug}`}
                            className="group flex min-h-48 flex-col rounded-panel border border-line bg-surface p-5 transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-e2 active:translate-y-0"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                              <ClipboardList size={17} aria-hidden="true" />
                            </span>

                            <h4 className="mt-4 text-sm font-semibold tracking-heading text-fg">
                              {form.name}
                            </h4>

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
                        ))}
                      </div>

                      {group.forms.length > PREVIEW_COUNT ? (
                        <div className="mt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            aria-expanded={expanded}
                            className="inline-flex h-9 items-center rounded-control border border-line bg-surface px-4 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                          >
                            {expanded
                              ? t("Tampilkan lebih sedikit", "Show less")
                              : t(
                                  "Tampilkan semua {count} formulir",
                                  "Show all {count} forms",
                                  { count: group.forms.length },
                                )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-panel border border-dashed border-line bg-surface p-10 text-center text-sm text-fg-muted">
                {t(
                  "Belum ada formulir yang aktif saat ini.",
                  "No active forms at the moment.",
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
