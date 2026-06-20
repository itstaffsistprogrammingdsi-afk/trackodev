import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getDailyTodo,
  getMyActivities,
} from "../api/myWork.api";

import type {
  ActivityRange,
  ActivityResponse,
  DailyTodoResponse,
} from "../types";

export const useMyWork = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<ActivityRange>("today");

  const [dailyTodo, setDailyTodo] = useState<DailyTodoResponse | null>(null);
  const [activities, setActivities] = useState<ActivityResponse | null>(null);

  const load = useCallback(async (selectedRange: ActivityRange) => {
    try {
      setLoading(true);
      setError(null);

      const [todoRes, activityRes] = await Promise.all([
        getDailyTodo(),
        getMyActivities(selectedRange),
      ]);

      setDailyTodo(todoRes);
      setActivities(activityRes);

    } catch {
      setError("Failed to load My Work data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  return {
    loading,
    error,
    range,
    setRange,
    dailyTodo,
    activities,
    reload: () => load(range),
  };
};