import { useDeferredValue, useMemo, useState } from "react";
import { useParams } from "react-router";
import { FileX2, Inbox, Search } from "lucide-react";

import { useFormResponses } from "../hooks/useFormResponses";

import ResponseHeader from "../components/responses/ResponseHeader";
import ResponseEmptyState from "../components/responses/ResponseEmptyState";
import ResponseMobileList from "../components/responses/ResponseMobileList";
import ResponseTable from "../components/responses/ResponseTable";

import AssignmentModal from "../components/modals/AssignmentModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function FormResponsesPage() {
  const { can } = useAuth();
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const deferredSearch = useDeferredValue(search);

  const {
    form,
    submissions,
    loading,
    error,
    reload,
    expandedRows,
    summaryFields,
    toggleExpanded,
    exportPDF,
    onAssign,
    assignmentOpen,
    setAssignmentOpen,
    selectedSubmission,
  } = useFormResponses(id);

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          submissions
            .map((submission) => submission.status)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [submissions],
  );

  const filteredSubmissions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesStatus = status === "all" || submission.status === status;
      if (!matchesStatus) return false;
      if (!query) return true;

      const dataText = Object.values(submission.data ?? {})
        .map((value) => (Array.isArray(value) ? value.join(" ") : String(value)))
        .join(" ")
        .toLowerCase();

      return (
        submission.status.toLowerCase().includes(query) ||
        (submission.user_id ?? "").toLowerCase().includes(query) ||
        dataText.includes(query)
      );
    });
  }, [submissions, status, deferredSearch]);

  if (loading) {
    return (
      <div className="w-full space-y-6" role="status" aria-busy="true">
        <span className="sr-only">{t("Memuat respons form", "Loading form responses")}</span>
        <Skeleton className="h-4 w-28" />
        <div className="space-y-4 rounded-panel border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-control" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-panel border border-line bg-surface p-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-14 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <EmptyState
          icon={FileX2}
          title={t("Gagal memuat respons", "Failed to load responses")}
          description={error}
          action={{ label: t("Coba lagi", "Try again"), onClick: () => void reload() }}
        />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="w-full">
        <EmptyState
          icon={FileX2}
          title={t("Form tidak ditemukan", "Form not found")}
          description={t(
            "Form mungkin sudah dihapus atau Anda tidak memiliki akses.",
            "The form may have been deleted or you do not have access.",
          )}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full space-y-6">
        <ResponseHeader form={form} total={submissions.length} />

        {submissions.length === 0 ? (
          <ResponseEmptyState form={form} />
        ) : (
          <>
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
                  placeholder={t(
                    "Cari jawaban, status, atau ID pengirim",
                    "Search answers, status, or submitter ID",
                  )}
                  aria-label={t("Cari respons", "Search responses")}
                  className="h-9 w-full rounded-control border border-transparent bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
                />
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label={t("Filter status respons", "Filter response status")}
                className="h-9 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
              >
                <option value="all">{t("Semua status", "All statuses")}</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <span className="shrink-0 px-1 text-[11px] font-medium tabular-nums text-fg-muted">
                {t("{filtered} dari {total} respons", "{filtered} of {total} responses", {
                  filtered: filteredSubmissions.length,
                  total: submissions.length,
                })}
              </span>
            </div>

            {filteredSubmissions.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t("Tidak ada respons yang cocok", "No matching responses")}
                description={t(
                  "Ubah kata kunci atau status filter untuk melihat respons lain.",
                  "Change the keyword or status filter to see other responses.",
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
              <>
                <ResponseMobileList
                  form={form}
                  submissions={filteredSubmissions}
                  expandedRows={expandedRows}
                  summaryFields={summaryFields}
                  toggleExpanded={toggleExpanded}
                />

                <ResponseTable
                  form={form}
                  submissions={filteredSubmissions}
                  expandedRows={expandedRows}
                  summaryFields={summaryFields}
                  toggleExpanded={toggleExpanded}
                  exportPDF={exportPDF}
                  onAssign={onAssign}
                  canAssign={can("form.submission.assign")}
                />
              </>
            )}
          </>
        )}

        {can("form.submission.assign") && (
          <AssignmentModal
            open={assignmentOpen}
            submission={selectedSubmission}
            requestForm={form}
            onClose={() => setAssignmentOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
