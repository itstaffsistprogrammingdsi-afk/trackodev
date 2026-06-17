import axios from "@/lib/axios";
import type { DailyTodoResponse, DailyTodoFilter } from "../types";

export const getDailyTodo = async (filter: DailyTodoFilter) => {
  const res = await axios.post<DailyTodoResponse>("/daily-todo", {
    filter,
  });

  return res.data;
};