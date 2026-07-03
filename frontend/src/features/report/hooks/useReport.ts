import { useQuery } from "@tanstack/react-query";

import { reportApi } from "../api/report.api";
import type { ReportFilter } from "../types";

export const reportKeys = {
  all: ["reports"] as const,

  summary: (filters?: ReportFilter) =>
    [...reportKeys.all, "summary", filters] as const,

  charts: (filters?: ReportFilter) =>
    [...reportKeys.all, "charts", filters] as const,

  tasks: (
    filters?: ReportFilter,
    page = 1,
    limit = 20
  ) =>
    [
      ...reportKeys.all,
      "tasks",
      filters,
      page,
      limit,
    ] as const,

  responses: (
    filters?: ReportFilter,
    page = 1,
    limit = 20
  ) =>
    [
      ...reportKeys.all,
      "responses",
      filters,
      page,
      limit,
    ] as const,

  memberPerformance: (filters?: ReportFilter) =>
    [
      ...reportKeys.all,
      "member-performance",
      filters,
    ] as const,

  divisionPerformance: (filters?: ReportFilter) =>
    [
      ...reportKeys.all,
      "division-performance",
      filters,
    ] as const,

  exports: ["reports", "exports"] as const,
};

export function useReportSummary(
  filters?: ReportFilter
) {
  return useQuery({
    queryKey: reportKeys.summary(filters),

    queryFn: () =>
      reportApi.getSummary(filters),

    staleTime: 1000 * 60 * 5,
  });
}

export function useReportCharts(
  filters?: ReportFilter
) {
  return useQuery({
    queryKey: reportKeys.charts(filters),

    queryFn: () =>
      reportApi.getCharts(filters),

    staleTime: 1000 * 60 * 5,
  });
}

export function useReportTasks(
  filters?: ReportFilter,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: reportKeys.tasks(
      filters,
      page,
      limit
    ),

    queryFn: () =>
      reportApi.getTasks(
        filters,
        page,
        limit
      ),

    staleTime: 1000 * 60 * 2,

    placeholderData: (
      previousData
    ) => previousData,
  });
}

export function useReportResponses(
  filters?: ReportFilter,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: reportKeys.responses(
      filters,
      page,
      limit
    ),

    queryFn: () =>
      reportApi.getResponses(
        filters,
        page,
        limit
      ),

    staleTime: 1000 * 60 * 2,

    placeholderData: (
      previousData
    ) => previousData,
  });
}

export function useMemberPerformance(
  filters?: ReportFilter
) {
  return useQuery({
    queryKey:
      reportKeys.memberPerformance(
        filters
      ),

    queryFn: () =>
      reportApi.getMemberPerformance(
        filters
      ),

    staleTime: 1000 * 60 * 5,
  });
}

export function useDivisionPerformance(
  filters?: ReportFilter
) {
  return useQuery({
    queryKey:
      reportKeys.divisionPerformance(
        filters
      ),

    queryFn: () =>
      reportApi.getDivisionPerformance(
        filters
      ),

    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Dashboard helper
 * Untuk halaman utama report.
 */
export function useReportDashboard(
  filters?: ReportFilter
) {
  const summary =
    useReportSummary(filters);

  const charts =
    useReportCharts(filters);

  return {
    summary,
    charts,

    isLoading:
      summary.isLoading ||
      charts.isLoading,

    isFetching:
      summary.isFetching ||
      charts.isFetching,
  };
}