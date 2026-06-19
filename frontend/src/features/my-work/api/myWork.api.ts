import axios from "@/lib/axios";

import type {
  ActivityResponse,
  ActivityRange,
  DailyTodoResponse,
} from "../types";

export const getDailyTodo =
  async (): Promise<DailyTodoResponse> => {

    const res =
      await axios.get("/daily-todo");

    return res.data;
  };

export const getMyActivities =
  async (
    range: ActivityRange = "today",
    page = 1,
    perPage = 20,
  ): Promise<ActivityResponse> => {

    const res =
      await axios.get("/my-activities", {
        params: {
          range,
          page,
          per_page: perPage,
        },
      });

    return res.data;
  };