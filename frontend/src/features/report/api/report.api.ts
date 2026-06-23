import axios from "@/lib/axios";
import type { ReportDetailResponse } from "../types";

type Params = {
  start_date: string;
  end_date: string;
  user_ids?: string[];
  division_ids?: string[];
  search?: string;
  label_ids?: string[];
  brand_ids?: string[];
};

export const fetchReportDetail = async (
  params: Params
): Promise<ReportDetailResponse> => {
  const {
    start_date,
    end_date,
    user_ids,
    division_ids,
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