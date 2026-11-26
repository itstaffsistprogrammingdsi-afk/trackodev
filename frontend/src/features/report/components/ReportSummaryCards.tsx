import { useEffect, useMemo, useRef, useState } from "react";

import SummaryCards from "@/features/my-work/components/SummaryCards";
import { useLanguage } from "@/context/LanguageContext";
import { reportApi } from "../api/report.api";
import type { FilterParams, ReportSummary } from "../types";

type Props = {
  filters: FilterParams;
};

const toSummaryParams = (filters: FilterParams): FilterParams => {
  const params: FilterParams = { ...filters };
  delete params.page;
  delete params.user_id;

  return params;
};

export default function ReportSummaryCards({ filters }: Props) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        search: filters.search ?? "",
        division_id: filters.division_id ?? "",
        start_date: filters.start_date ?? "",
        end_date: filters.end_date ?? "",
        campaign_id: filters.campaign_id ?? "",
        workspace_id: filters.workspace_id ?? "",
        label_id: filters.label_id ?? "",
        brand_id: filters.brand_id ?? "",
        search_card: filters.search_card ?? "",
      }),
    [
      filters.search,
      filters.division_id,
      filters.start_date,
      filters.end_date,
      filters.campaign_id,
      filters.workspace_id,
      filters.label_id,
      filters.brand_id,
      filters.search_card,
    ],
  );

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await reportApi.getSummary(toSummaryParams(filters));
        if (currentRequest !== requestId.current) return;

        setSummary(result);
      } catch (requestError) {
        if (currentRequest !== requestId.current) return;

        console.error("Gagal memuat ringkasan report", requestError);
        setError(
          t(
            "Ringkasan report gagal dimuat.",
            "Failed to load the report summary.",
          ),
        );
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
    // filterKey sengaja menjadi dependency utama; `filters` adalah objek baru
    // pada setiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, t]);

  return (
    <section className="space-y-2.5" aria-labelledby="report-summary-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="report-summary-title"
          className="text-xs font-medium text-fg-muted"
        >
          {t("Ringkasan periode", "Period summary")}
        </h2>
        <span className="text-2xs text-fg-subtle">
          {summary?.period_label ?? t("Semua periode", "All periods")}
        </span>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger"
        >
          {error}
        </div>
      ) : (
        <SummaryCards
          totalCards={summary?.total_tasks ?? 0}
          completedCards={summary?.completed_tasks ?? 0}
          completionRate={summary?.completion_rate ?? 0}
          loading={loading}
        />
      )}
    </section>
  );
}
