import axios from "@/lib/axios";
import type { ReportDetailResponse } from "../types";

type Params = {
  start_date: string;
  end_date: string;
  user_ids?: string[];
  division_ids?: string[];
};

export const fetchReportDetail = async (
  params: Params
): Promise<ReportDetailResponse> => {
  const { start_date, end_date, user_ids, division_ids } = params;

  const { data } = await axios.get("/reports/detail", {
    params: {
      start_date,
      end_date,

      // IMPORTANT: serialize array dengan aman untuk Laravel
      ...(user_ids?.length ? { user_ids: user_ids.join(",") } : {}),
      ...(division_ids?.length ? { division_ids: division_ids.join(",") } : {}),
    },
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