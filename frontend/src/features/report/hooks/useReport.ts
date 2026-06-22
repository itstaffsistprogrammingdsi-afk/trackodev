import { useCallback, useState } from "react";
import { fetchReportDetail } from "../api/report.api";
import type { UserReportDetail } from "../types";

export const useReport = () => {
  const [data, setData] = useState<UserReportDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getReportDetail = useCallback(async (params: {
    start_date: string;
    end_date: string;
    user_ids?: string[];
    division_ids?: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchReportDetail(params);

      setData(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    getReportDetail,
  };
};