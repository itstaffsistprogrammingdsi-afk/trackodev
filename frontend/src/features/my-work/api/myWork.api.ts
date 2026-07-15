import axios from "@/lib/axios";

import type {
  ActivityResponse,
  ActivityRange,
  DailyTodoResponse,
  ExportLogParams,
} from "../types";

export const getDailyTodo = async (): Promise<DailyTodoResponse> => {
  const res = await axios.get("/daily-todo");

  return res.data;
};

export const getMyActivities = async (
  range: ActivityRange = "today",
  page = 1,
  perPage = 20,
): Promise<ActivityResponse> => {
  const res = await axios.get("/my-activities", {
    params: {
      range,
      page,
      per_page: perPage,
    },
  });

  return res.data;
};

export const exportMyWorkLog = async (
  params: ExportLogParams,
): Promise<void> => {
  const res = await axios.get("/my-activities/export", {
    params,
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"];

  const filename =
    typeof disposition === "string"
      ? disposition.match(/filename="?([^"]+)"?/)?.[1] ??
        `log-kerja.${params.format}`
      : `log-kerja.${params.format}`;

  const contentType = res.headers["content-type"];

  const blob = new Blob([res.data], {
    type:
      typeof contentType === "string"
        ? contentType
        : "application/octet-stream",
  });

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};