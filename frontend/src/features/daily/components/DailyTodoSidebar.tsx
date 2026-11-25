import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useDailyTodo } from "../hooks/useDailyTodo";

export default function DailyTodoSidebar() {
  const { t } = useLanguage();
  const { data } = useDailyTodo();

  useEffect(() => {
    if (data) {
      console.log("Daily Todo:", data);
    }
  }, [data]);

  return (
    <div>
      {t("Daily Todo")}
    </div>
  );
}