import { useEffect } from "react";
import { useDailyTodo } from "../hooks/useDailyTodo";

export default function DailyTodoSidebar() {
  const { data } = useDailyTodo();

  useEffect(() => {
    if (data) {
      console.log("Daily Todo:", data);
    }
  }, [data]);

  return (
    <div>
      Daily Todo
    </div>
  );
}