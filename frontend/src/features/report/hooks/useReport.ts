import { useCallback, useState } from "react";
import { fetchReportDetail } from "../api/report.api";
import type { UserReportDetail } from "../types";

type Params = {
  start_date: string;
  end_date: string;

  user_ids?: string[];
  division_ids?: string[];

  workspace_ids?: string[];
  campaign_ids?: string[];

  brand_ids?: string[];
  label_ids?: string[];

  search?: string;
};

type ApiError = {
  message?: string;
};

export const useReport = () => {
  const [data, setData] = useState<UserReportDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getReportDetail = useCallback(
    async (params: Params): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchReportDetail({
          start_date: params.start_date,
          end_date: params.end_date,

          user_ids: params.user_ids,
          division_ids: params.division_ids,

          workspace_ids: params.workspace_ids,
          campaign_ids: params.campaign_ids,

          brand_ids: params.brand_ids,
          label_ids: params.label_ids,

          search: params.search,
        });

        setData(res.data ?? []);
      } catch (err: unknown) {
        const error = err as ApiError;

        setError(
          error.message ?? "Failed to load report"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetReport = useCallback((): void => {
    setData([]);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    getReportDetail,
    resetReport,
  };
};