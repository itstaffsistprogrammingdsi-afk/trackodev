import axios from "@/lib/axios";
import type { ReportDetailResponse } from "../types";

export const fetchReportDetail = async (params: {
  start_date: string;
  end_date: string;
  user_ids?: string[];
  division_ids?: string[];
}): Promise<ReportDetailResponse> => {
  const { data } = await axios.get("/reports/detail", { params });
  return data;
};