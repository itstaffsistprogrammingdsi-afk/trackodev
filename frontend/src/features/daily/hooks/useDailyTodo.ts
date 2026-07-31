import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { getDailyTodo } from "../api/dailyTodo.api";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

import type {
  DailyTodoFilter,
  DailyTodoResponse,
} from "../types";

export const useDailyTodo = (
  initialFilter: DailyTodoFilter = {}
) => {
  const [data, setData] =
    useState<DailyTodoResponse | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [filter, setFilter] =
    useState(initialFilter);
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog", "Assignment", "Card", "Task",
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const result =
        await getDailyTodo(filter);

      setData(result);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, realtimeRevision]);

  
  return {
    data,
    loading,
    filter,
    setFilter,
    refetch: fetchData,
  };
};
