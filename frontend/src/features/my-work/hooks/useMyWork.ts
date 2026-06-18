import {
  useEffect,
  useState,
} from "react";

import {
  getDailyTodo,
  getMyActivities,
} from "../api/myWork.api";

import type {
  ActivityResponse,
  DailyTodoResponse,
} from "../types";

export const useMyWork = () => {
  const [loading, setLoading] =
    useState(true);

  const [dailyTodo, setDailyTodo] =
    useState<DailyTodoResponse | null>(null);

  const [activities, setActivities] =
    useState<ActivityResponse | null>(null);

  const load = async () => {
    try {
      setLoading(true);

      const [
        todoRes,
        activityRes,
      ] = await Promise.all([
        getDailyTodo(),
        getMyActivities("today"),
      ]);

      setDailyTodo(todoRes);
      setActivities(activityRes);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return {
    loading,
    dailyTodo,
    activities,
    reload: load,
  };
};