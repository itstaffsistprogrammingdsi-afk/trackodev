import api from "@/lib/axios";

import type {
  ReportFilter,
  ReportSummary,
  ReportCharts,
  TaskReport,
  ResponseReport,
  MemberPerformance,
  DivisionPerformance,
  PaginatedResponse,
} from "../types";



const buildParams = (filters?: ReportFilter) => {
  if (!filters) return {};

  return {
    startDate: filters.startDate,
    endDate: filters.endDate,

    memberIds: filters.memberIds,
    divisionIds: filters.divisionIds,
    campaignIds: filters.campaignIds,
    workspaceIds: filters.workspaceIds,
    labelIds: filters.labelIds,
    brandIds: filters.brandIds,
  };
};

export const reportApi = {
  async getSummary(filters?: ReportFilter) {
    const { data } = await api.get<ReportSummary>(
      "/reports/summary",
      {
        params: buildParams(filters),
      }
    );

    return data;
  },

  async getCharts(filters?: ReportFilter) {
    const { data } = await api.get<ReportCharts>(
      "/reports/charts",
      {
        params: buildParams(filters),
      }
    );

    return data;
  },

  async getTasks(
    filters?: ReportFilter,
    page = 1,
    limit = 20
  ) {
    const { data } = await api.get<
      PaginatedResponse<TaskReport>
    >("/reports/tasks", {
      params: {
        ...buildParams(filters),
        page,
        limit,
      },
    });

    return data;
  },

  async getResponses(
    filters?: ReportFilter,
    page = 1,
    limit = 20
  ) {
    const { data } = await api.get<
      PaginatedResponse<ResponseReport>
    >("/reports/responses", {
      params: {
        ...buildParams(filters),
        page,
        limit,
      },
    });

    return data;
  },

  async getMemberPerformance(
    filters?: ReportFilter
  ) {
    const { data } = await api.get<
      MemberPerformance[]
    >("/reports/member-performance", {
      params: buildParams(filters),
    });

    return data;
  },

  async getDivisionPerformance(
    filters?: ReportFilter
  ) {
    const { data } = await api.get<
      DivisionPerformance[]
    >("/reports/division-performance", {
      params: buildParams(filters),
    });

    return data;
  },

  async exportTasks(filters?: ReportFilter) {
  const response = await api.get(
    "/reports/tasks/export",
    {
      params: buildParams(filters),
      responseType: "blob",
    }
  );

  return response.data;
},

async exportPdf(filters?: ReportFilter) {
  const response = await api.get(
    "/reports/export-pdf",
    {
      params: buildParams(filters),
      responseType: "blob",
    }
  );

  return response.data;
}
};