import axios from "@/lib/axios";
import type { ReportDetailResponse } from "../types";

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

export const fetchReportDetail = async (
  params: Params
): Promise<ReportDetailResponse> => {
const {
  start_date,
  end_date,

  user_ids,
  division_ids,

  workspace_ids,
  campaign_ids,

  search,

  label_ids,
  brand_ids,
} = params;

const queryParams: Record<string, string> = {
  start_date,
  end_date,
};

if (user_ids?.length) {
  queryParams.user_ids = user_ids.join(",");
}

if (division_ids?.length) {
  queryParams.division_ids = division_ids.join(",");
}

if (workspace_ids?.length) {
  queryParams.workspace_ids = workspace_ids.join(",");
}

if (campaign_ids?.length) {
  queryParams.campaign_ids = campaign_ids.join(",");
}

if (brand_ids?.length) {
  queryParams.brand_ids = brand_ids.join(",");
}

if (label_ids?.length) {
  queryParams.label_ids = label_ids.join(",");
}

if (search?.trim()) {
  queryParams.search = search.trim();
}

  const { data } = await axios.get("/reports/detail", {
    params: queryParams,
  });

  return data;
};

export const fetchBrands = async () => {
  const { data } = await axios.get("/brands");
  return data;
};

export const fetchLabels = async () => {
  const { data } = await axios.get("/labels");
  return data;
};

export const fetchWorkspacesByDivision = async (
  divisionId: string
) => {
  const { data } = await axios.get(
    `/divisions/${divisionId}/workspaces`
  );

  return data;
};

export const fetchCampaignsByWorkspace = async (
  workspaceId: string
) => {
  const { data } = await axios.get(
    `/workspaces/${workspaceId}/campaigns`
  );

  return data;
};

export const fetchDivisions = async () => {
  const { data } = await axios.get("/divisions");
  return data;
};

export const bypassUser = async (
  userId: string
) => {
  const response = await axios.post(
    `/auth/bypass/${userId}`
  );

  return response.data;
};