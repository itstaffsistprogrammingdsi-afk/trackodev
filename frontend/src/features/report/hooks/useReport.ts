import { useCallback, useRef, useState } from "react";
import { fetchReportDetail } from "../api/report.api";
import type { UserReportDetail } from "../types";

type Params = {
  start_date: string;
  end_date: string;
  user_ids?: string[];
  division_ids?: string[];
  search?: string;
  label_ids?: string[];
  brand_ids?: string[];
};

type ApiError = {
  name?: string;
  message?: string;
};

export const useReport = () => {
  const [data, setData] = useState<UserReportDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const getReportDetail = useCallback(async (params: Params) => {
    try {
      setLoading(true);
      setError(null);

      // cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetchReportDetail(params);

      setData(res.data ?? []);
    } catch (err: unknown) {
      const error = err as ApiError;

      if (error?.name === "AbortError" || error?.name === "CanceledError") {
        return;
      }

      setError(error?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetReport = useCallback(() => {
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