import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  CircleSlash,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { getForms, deleteForm } from "../api/form.api";
import type { Form } from "../types";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { toast, confirmDialog } from "@/lib/feedback";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
  labelEn: string;
}> = [
  { value: "all", label: "Semua", labelEn: "All" },
  { value: "active", label: "Aktif", labelEn: "Active" },
  { value: "inactive", label: "Nonaktif", labelEn: "Inactive" },
];

export default function FormPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { t, locale, language } = useLanguage();
  const realtimeRevision = useRealtimeRevision([
    "Form", "FormField", "FormSubmission",
  ]);

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const deferredSearch = useDeferredValue(search);

  const fetchForms = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError("");

      const data = await getForms();
      setForms(data);
    } catch (err) {
      console.error(err);
      setError(
        t(
          "Gagal memuat daftar form. Silakan coba lagi.",
          "Failed to load forms. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language, t]);

  useEffect(() => {
    void fetchForms();
  }, [fetchForms, realtimeRevision]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      message: t(
        "Hapus form ini? Tindakan ini tidak dapat dibatalkan.",
        "Delete this form? This action cannot be undone.",
      ),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteForm(id);
      toast.success(t("Form berhasil dihapus.", "Form deleted successfully."));
      await fetchForms();
    } catch (err) {
      console.error(err);
      toast.error(t("Gagal menghapus form.", "Failed to delete form."));
    }
  };

  const formatDate = (date: string) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const copyPublicLink = async (slug: string) => {
    const publicLink = `${window.location.origin}/public/forms/${slug}`;

    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success(t("Link form disalin.", "Form link copied."));
    } catch (error) {
      console.error(error);
      toast.error(t("Gagal menyalin link.", "Failed to copy link."));
    }
  };

  const activeCount = useMemo(
    () => forms.filter((form) => form.is_active).length,
    [forms],
  );
  const fieldCount = useMemo(
    () => forms.reduce((total, form) => total + (form.fields?.length ?? 0), 0),
    [forms],
  );

  const filteredForms = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return forms.filter((form) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" ? form.is_active : !form.is_active);
      const matchesSearch =
        !query ||
        form.name.toLowerCase().includes(query) ||
        (form.description ?? "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [forms, status, deferredSearch]);

  const canCreate = can("form.create");

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            {t("Form", "Forms")}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t(
              "Buat form, bagikan link publik, dan kelola jawaban tim di satu tempat.",
              "Create forms, share public links, and manage team responses in one place.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchForms(true)}
            disabled={refreshing}
            aria-label={t("Muat ulang daftar form", "Reload form list")}
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
            {refreshing ? t("Memuat...", "Loading...") : t("Muat ulang", "Reload")}
          </button>

          {canCreate ? (
            <button
              type="button"
              onClick={() => navigate("/forms/create")}
              className="inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("Buat form", "Create form")}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchForms(true)}
            className="h-8 shrink-0 rounded-control border border-danger/25 bg-surface px-3 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            {t("Coba lagi", "Try again")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" role="status" aria-busy="true">
          <span className="sr-only">{t("Memuat daftar form", "Loading form list")}</span>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-line bg-line">
            {[0, 1, 2].map((item) => (
              <div key={item} className="space-y-2 bg-surface p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="space-y-4 rounded-panel border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <div className="flex gap-2 border-t border-line pt-4">
                  <Skeleton className="h-8 w-28 rounded-control" />
                  <Skeleton className="h-8 w-20 rounded-control" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* RINGKASAN */}
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-line bg-line">
            <SummaryCell label={t("Total form", "Total forms")} value={forms.length} />
            <SummaryCell
              label={t("Form aktif", "Active forms")}
              value={activeCount}
              tone="success"
            />
            <SummaryCell label={t("Total field", "Total fields")} value={fieldCount} />
          </div>

          {forms.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-2.5 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("Cari nama atau deskripsi form", "Search form name or description")}
                  aria-label={t("Cari form", "Search forms")}
                  className="h-9 w-full rounded-control border border-transparent bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
              </div>

              <div className="flex items-center gap-1 rounded-control bg-surface-muted p-1">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    aria-pressed={status === option.value}
                    className={`h-7 rounded-[6px] px-3 text-[11px] font-medium transition-colors ${
                      status === option.value
                        ? "bg-surface text-fg shadow-e1"
                        : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {t(option.label, option.labelEn)}
                  </button>
                ))}
              </div>

              <span className="shrink-0 px-1 text-[11px] font-medium tabular-nums text-fg-muted">
                {t("{count} form", "{count} forms", { count: filteredForms.length })}
              </span>
            </div>
          ) : null}

          {forms.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("Belum ada form", "No forms yet")}
              description={t(
                "Buat form pertama untuk mengumpulkan request, brief, atau data tim.",
                "Create your first form to collect requests, briefs, or team data.",
              )}
              action={
                canCreate
                  ? {
                      label: t("Buat form", "Create form"),
                      onClick: () => navigate("/forms/create"),
                    }
                  : undefined
              }
            />
          ) : filteredForms.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t("Form tidak ditemukan", "No forms found")}
              description={t(
                "Tidak ada form yang cocok dengan pencarian atau filter status saat ini.",
                "No forms match the current search or status filter.",
              )}
              action={{
                label: t("Hapus filter", "Clear filters"),
                onClick: () => {
                  setSearch("");
                  setStatus("all");
                },
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredForms.map((form) => (
                <article
                  key={form.id}
                  className="group flex flex-col rounded-panel border border-line bg-surface p-5 transition-colors hover:border-line-strong"
                  style={{ borderTop: `3px solid ${form.theme_color || "#3f51f5"}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-fg" title={form.name}>
                        {form.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-fg-muted">
                        {form.description || t("Belum ada deskripsi.", "No description yet.")}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
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

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-subtle">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="h-3 w-3" aria-hidden="true" />
                      {t("{count} field", "{count} fields", {
                        count: form.fields?.length ?? 0,
                      })}
                    </span>
                    <span>
                      {t("Dibuat {date}", "Created {date}", {
                        date: formatDate(form.created_at),
                      })}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                    {can("form.responses.view") ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/forms/${form.id}/responses`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control bg-accent-soft px-3 text-xs font-medium text-accent transition-colors hover:bg-accent-soft/70"
                      >
                        <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("Respons", "Responses")}
                      </button>
                    ) : null}

                    {can("form.field.create") ||
                    can("form.field.update") ||
                    can("form.field.delete") ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/forms/${form.id}/builder`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                      >
                        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("Field", "Fields")}
                      </button>
                    ) : null}

                    {can("form.update") ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/forms/${form.id}/edit`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("Edit", "Edit")}
                      </button>
                    ) : null}

                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => void copyPublicLink(form.slug)}
                        className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
                        aria-label={t("Salin link publik {name}", "Copy public link for {name}", {
                          name: form.name,
                        })}
                        title={t("Salin link publik", "Copy public link")}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <a
                        href={`/public/forms/${form.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
                        aria-label={t("Buka form publik {name}", "Open public form {name}", {
                          name: form.name,
                        })}
                        title={t("Buka form publik", "Open public form")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>

                      {can("form.delete") ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(form.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                          aria-label={t("Hapus form {name}", "Delete form {name}", {
                            name: form.name,
                          })}
                          title={t("Hapus form", "Delete form")}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  const { locale } = useLanguage();

  return (
    <div className="bg-surface p-4 sm:p-5">
      <p
        className={`text-[22px] font-semibold leading-none tabular-nums ${
          tone === "success" && value > 0 ? "text-success" : "text-fg"
        }`}
      >
        {value.toLocaleString(locale)}
      </p>
      <p className="mt-2 text-[11px] font-medium text-fg-muted">{label}</p>
    </div>
  );
}
