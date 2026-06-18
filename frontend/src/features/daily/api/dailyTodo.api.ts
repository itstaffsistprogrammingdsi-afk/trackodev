import axios from "@/lib/axios";
import type {
  DailyTodoResponse,
  DailyTodoFilter,
} from "../types";

export const getDailyTodo = async (
  filter?: DailyTodoFilter
) => {
    console.log("CALL DAILY TODO", filter);
    
  const response = await axios.get<DailyTodoResponse>(
    "/daily-todo",
    {
      params: filter,
    }
  );

  return response.data;
};